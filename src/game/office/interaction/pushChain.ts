// Decides which bodies may move this step when something pushes something else. Pure: no Phaser, so it is tested
// with plain rectangles. The scene feeds it the bodies' rects and intended steps and zeroes the velocities it refuses.

// Data key set on a coworker the resolver stopped this frame, so its route follower treats it as blocked and replans
export const PUSH_STOPPED = 'pushStopped';
// Data key set on a coworker for the one frame it is first displaced by a push, or let go of after a pull (one shove, however long)
export const PUSH_SHOVED = 'pushShoved';
// Data key set on a coworker the player is holding with the pull key: its own route steering is suspended meanwhile
export const PUSH_HELD = 'pushHeld';

export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export type PushKind = 'player' | 'coworker' | 'chair';
// driver: moving under its own power (player walking, a walking coworker). trailing: pulled behind the player.
// coasting: carried on by its own momentum (a rolled or let-go chair), or chased by a coworker towing it.
export type PushRole = 'driver' | 'trailing' | 'coasting';

export interface PushBody {
    id: string;
    kind: PushKind;
    rect: Rect;
    // How far the body wants to move this step (velocity * dt)
    dx: number;
    dy: number;
    role: PushRole;
    // The player is behind this body's movement (a pulled chair or coworker): it may push coworkers like the player does
    playerDriven?: boolean;
    immovable?: boolean;
}

export interface PushResult {
    // Bodies that must not move along that axis this step: the root of a blocked chain
    blockedX: Set<string>;
    blockedY: Set<string>;
    // Trailing bodies that were blocked and so should be let go of (their driver is not stopped)
    released: Set<string>;
    // Bodies displaced by someone else's push, with how far (not the roots' own steps)
    pushed: Map<string, { dx: number; dy: number }>;
    // Who started the chain that displaced each pushed body
    pushedBy: Map<string, string>;
}

// Rects that merely touch do not overlap; this absorbs float noise from the physics separation
const EPS = 0.01;

const overlaps = (a: Rect, b: Rect) => a.left < b.right - EPS && a.right > b.left + EPS && a.top < b.bottom - EPS && a.bottom > b.top + EPS;

const shift = (r: Rect, axis: 'x' | 'y', amount: number): Rect =>
    axis === 'x'
        ? { left: r.left + amount, right: r.right + amount, top: r.top, bottom: r.bottom }
        : { left: r.left, right: r.right, top: r.top + amount, bottom: r.bottom + amount };

const centre = (r: Rect, axis: 'x' | 'y') => (axis === 'x' ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2);

// Can `mover` shove `target`, in a chain started by a driver that is (or is not) the player's doing?
function canPush(mover: PushBody, target: PushBody, playerChain: boolean) {
    if (target.kind === 'player') return false;
    if (target.immovable) return false;
    if (target.kind === 'chair') return true;
    // Chairs only shove a coworker while the player is driving them
    if (mover.kind === 'chair') return playerChain;
    return true;
}

export function resolvePush(bodies: PushBody[], solids: Rect[]): PushResult {
    const result: PushResult = { blockedX: new Set(), blockedY: new Set(), released: new Set(), pushed: new Map(), pushedBy: new Map() };
    const rects = new Map(bodies.map((b) => [b.id, { ...b.rect }]));
    const handled = new Set<string>();
    const order = [...bodies.filter((b) => b.role === 'driver'), ...bodies.filter((b) => b.role === 'trailing'), ...bodies.filter((b) => b.role === 'coasting')];

    // The displacement of every body in the chain if `root` moves `amount` along `axis`, or null if anything is in the way
    const tryMove = (root: PushBody, axis: 'x' | 'y', amount: number) => {
        const moves = new Map<string, number>();
        const playerChain = root.kind === 'player' || root.playerDriven === true;
        const place = (body: PushBody, by: number): boolean => {
            if (moves.has(body.id)) return Math.sign(moves.get(body.id)!) === Math.sign(by);
            const from = rects.get(body.id)!;
            const to = shift(from, axis, by);
            if (solids.some((s) => overlaps(to, s))) return false;
            moves.set(body.id, by);
            for (const other of bodies) {
                if (other.id === body.id || moves.has(other.id)) continue;
                const there = rects.get(other.id)!;
                if (!overlaps(to, there)) continue;
                // Only what is ahead of the mover gets pushed; something behind it is left alone
                if ((centre(there, axis) - centre(from, axis)) * by <= 0) continue;
                if (!canPush(body, other, playerChain)) return false;
                const need = axis === 'x' ? (by > 0 ? to.right - there.left : to.left - there.right) : by > 0 ? to.bottom - there.top : to.top - there.bottom;
                if (!place(other, need)) return false;
            }
            return true;
        };
        return place(root, amount) ? moves : null;
    };

    for (const root of order) {
        if (handled.has(root.id)) continue;
        for (const axis of ['x', 'y'] as const) {
            const amount = axis === 'x' ? root.dx : root.dy;
            if (amount === 0) continue;
            const moves = tryMove(root, axis, amount);
            if (!moves) {
                if (root.role === 'trailing') {
                    result.released.add(root.id);
                    break;
                }
                (axis === 'x' ? result.blockedX : result.blockedY).add(root.id);
                continue;
            }
            for (const [id, by] of moves) {
                rects.set(id, shift(rects.get(id)!, axis, by));
                if (id === root.id) continue;
                handled.add(id);
                result.pushedBy.set(id, root.id);
                const prev = result.pushed.get(id) ?? { dx: 0, dy: 0 };
                result.pushed.set(id, axis === 'x' ? { dx: prev.dx + by, dy: prev.dy } : { dx: prev.dx, dy: prev.dy + by });
            }
        }
    }
    return result;
}
