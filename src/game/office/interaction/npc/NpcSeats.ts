import Phaser from 'phaser';
import type { Chairs } from '../../furniture/Chairs';
import { SeatLayers, SEAT_BACK, seatFrame, seatPosition } from '../../furniture/SeatLayers';
import type { Facing } from '../player/playerSprite';
import { FACING } from './facing';
import { facingForStandingWork } from './workFacing';
import type { NpcName } from './NpcBubbles';
import type { WalkGrid } from './WalkGrid';
import { nearestReachableCell, type Cell } from './pathfinding';
import { PathFollower, walkSpeedOf } from './PathFollower';
import { cellOf, fetchCandidates, PARK_PX, planLeg } from './chairReach';
import { chairLag, checkJam, ropeLength, type JamState } from './chairJam';
import { giveUpOutcome, ReadOnce, signalOf, type GiveUpReason, type GiveUpSignal } from './giveUp';
import { JAM_MARGIN_PX, JAM_TIME_MS } from '../../chairTuning';

type Npc = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
type Chair = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
// The player fetches a chair the same way the coworkers do
export type SeatUser = NpcName | 'player';

const SLIDE_SPEED = 50;
// Touching distance (px between bodies) at which they take hold of the chair
const GRAB_GAP = 4;
// The whole fetch, walking to the chair and dragging it back, over routes of up to MAX_CHAIR_ROUTE_TILES each way
// at walking speed, so it needs well over the straight-line time
const GIVE_UP_MS = 30000;
// How far (px) the chair rolls when they get up: half a tile
const PUSH_BACK = 16;
// The last straight step onto the exact spot (and back, when giving up) is abandoned after this long
const FINAL_STEP_MS = 2000;
// Fastest the dragged chair is moved towards its place behind the coworker
const DRAG_CHASE_MAX = 120;
// Bumps into something unplanned (the player, the other coworker) before a leg is given up
const MAX_BUMPS = 2;
const RETURN_FALLBACK_CELLS = 4;
// A jam this close to the spot (px) means they are on it: no walk back. Any further away they are routed back to it.
const NEAR_SPOT_PX = 4;
// Walking back ends this close to the spot (px) or the trip counts as lost: they never work off the spot
const OFF_SPOT_PX = 8;
// The B key debug command makes the trip fail this long after it began, so the walk can be seen first
const FORCED_BLOCK_AFTER_MS = 1000;

// go: walk the routed path to the chair; pull: drag it along the routed path to half a tile behind the spot, then step
// onto the spot (the chair is towed behind them); slide: it rolls under them; seated: working in it;
// return: gave up, walking back to the spot; none: no chair, work standing as usual
type Phase = 'go' | 'pull' | 'slide' | 'seated' | 'return' | 'none';

interface Seating {
    phase: Phase;
    chair?: Chair;
    spot: Phaser.Math.Vector2; // body centre where they work
    facing: Facing;
    since: number;
    seat?: { x: number; y: number };
    // The routed leg being walked, and what it is heading for; null once only the straight last step remains
    follower: PathFollower | null;
    stagingCell?: Cell;
    bumps: number;
    // Set on every bump into something unplanned (and so a reroute); read and cleared by hasBumped
    bumped?: boolean;
    finalSince?: number;
    name: SeatUser;
    player: boolean;
    // Reset on every new leg and phase
    jam: JamState;
    // Debug: the next check for being blocked says yes, beyond the bump limit
    forcedBlock?: boolean;
}

// Coworkers fetch the nearest loose chair by walking route, drag it into place and work sitting in it. No chair in reach: they work standing.
export class NpcSeats {
    private scene: Phaser.Scene;
    private chairs: Chairs;
    private npc: (name: SeatUser) => Npc;
    private grid: () => WalkGrid;
    // Room for the chair as well as the walker: used for the whole pull
    private clearGrid: () => WalkGrid;
    private states = new Map<SeatUser, Seating>();
    // Set when a trip is given up; read once by the host through hasGivenUp
    private giveUps = new ReadOnce<SeatUser, GiveUpSignal>();
    private layers = new Map<SeatUser, SeatLayers>();
    // Debug (B key): trips that are to fail as if blocked
    private forcedBlocks = new Set<SeatUser>();

    constructor(scene: Phaser.Scene, chairs: Chairs, npc: (name: SeatUser) => Npc, grid: () => WalkGrid, clearGrid: () => WalkGrid) {
        this.scene = scene;
        this.chairs = chairs;
        this.npc = npc;
        this.grid = grid;
        this.clearGrid = clearGrid;
    }

    // Call every frame once the coworker is at their work spot, until it returns true (ready to work).
    // While it returns false it has set their velocity.
    // `facing` and `spot` (body centre, px) override which way they sit and where they work; by default the facing
    // stored on the sprite and where they stand now (right for coworkers, who are already at the spot; the player is not).
    ready(name: SeatUser, facing?: Facing, spot?: { x: number; y: number }): boolean {
        const npc = this.npc(name);
        let s = this.states.get(name);
        if (!s) {
            s = {
                phase: 'none',
                spot: new Phaser.Math.Vector2(spot?.x ?? npc.body.center.x, spot?.y ?? npc.body.center.y),
                facing: facing ?? (npc.getData(FACING) as Facing | undefined) ?? 'down',
                since: this.scene.time.now,
                follower: null,
                bumps: 0,
                jam: {},
                name,
                player: name === 'player'
            };
            this.pickChairByRoute(npc, s);
            this.states.set(name, s);
        }
        if (this.forcedBlocks.delete(name)) s.forcedBlock = true;

        const chair = s.chair;
        if (chair && (s.phase === 'go' || s.phase === 'pull') && this.scene.time.now - s.since > GIVE_UP_MS) {
            this.abandon(npc, s, 'slow');
        }
        // The player took hold of the chair this trip claimed
        if (chair && (s.phase === 'go' || s.phase === 'pull') && this.chairs.isHeld(chair)) this.abandon(npc, s, 'taken');

        switch (s.phase) {
            case 'go':
                this.go(npc, s);
                return false;
            case 'pull':
                this.pull(npc, s);
                return false;
            case 'slide': {
                const step = (SLIDE_SPEED * this.scene.game.loop.delta) / 1000;
                const seat = s.seat!;
                const dist = Phaser.Math.Distance.Between(chair!.x, chair!.y, seat.x, seat.y);
                if (dist <= step) {
                    chair!.disableBody(true, true); // the seat layers draw it from now on
                    s.phase = 'seated';
                    return true;
                }
                chair!.setPosition(chair!.x + ((seat.x - chair!.x) / dist) * step, chair!.y + ((seat.y - chair!.y) / dist) * step);
                return false;
            }
            case 'return':
                if (!this.returnToSpot(npc, s)) return false;
                npc.setVelocity(0);
                s.phase = 'none';
                // The route and the last step did not get them onto the spot: no work from wherever they ended up
                {
                    const onSpot = Phaser.Math.Distance.Between(npc.body.center.x, npc.body.center.y, s.spot.x, s.spot.y) <= OFF_SPOT_PX;
                    if (!onSpot) this.giveUps.set(s.name, 'lost');
                    // Walking back turned them; they work facing the desk
                    const facing = facingForStandingWork(s.facing, onSpot);
                    if (facing) npc.setData(FACING, facing);
                }
                return true;
            default:
                // Working standing (no chair): face the desk
                npc.setData(FACING, facingForStandingWork(s.facing, true));
                return true;
        }
    }

    // They stop working (or were interrupted): the chair stays where they sat
    release(name: SeatUser) {
        this.giveUps.clear(name);
        const s = this.states.get(name);
        if (!s) return;
        this.states.delete(name);
        this.layers.get(name)?.hide();
        const chair = s.chair;
        if (!chair) return;
        this.chairs.unclaim(chair);
        if (s.phase === 'seated' || s.phase === 'slide') {
            const seat = s.seat!;
            chair.enableBody(true, seat.x, seat.y, true, true);
            chair.setFrame(seatFrame(s.facing));
            // Standing up pushes the chair back, away from the desk they faced
            const back = SEAT_BACK[s.facing];
            this.chairs.roll(chair, back.x, back.y, PUSH_BACK);
            return;
        }
        chair.body.setVelocity(0, 0);
    }

    // Call every frame after the coworker is depth-sorted
    update(name: SeatUser) {
        const s = this.states.get(name);
        const layers = this.layers.get(name) ?? this.layers.set(name, new SeatLayers(this.scene)).get(name)!;
        if (s?.phase === 'seated') layers.show(this.npc(name), s.facing);
        // Sliding in: the same chair/armrest sandwich from the start, at the chair's current spot
        else if (s?.phase === 'slide' && s.chair) layers.show(this.npc(name), s.facing, { x: s.chair.x, y: s.chair.y });
        else layers.hide();
    }

    // True once if the coworker bumped into something (and so had to reroute) since this was last asked
    hasBumped(name: SeatUser) {
        const s = this.states.get(name);
        const bumped = s?.bumped === true;
        if (s) s.bumped = false;
        return bumped;
    }

    // Once per give-up: 'jam' = the chair jammed and they let it go (they walk back to the spot and work standing);
    // 'stolen' = the player took the chair: the same, but they complain first;
    // 'lost' = they cannot get back to work (chair taken, blocked, too slow, no way back) and have stopped
    hasGivenUp(name: SeatUser) {
        return this.giveUps.take(name);
    }

    // Debug: the user's current or next chair trip fails as if it were blocked beyond the bump limit
    forceBlock(name: SeatUser) {
        this.forcedBlocks.add(name);
    }

    isSeated(name: SeatUser) {
        return this.states.get(name)?.phase === 'seated';
    }

    // Among the loose chairs in reach (straight-line range, then walking route cap) take the one with the shortest
    // route that also has a route clear enough to drag it to the desk
    private pickChairByRoute(npc: Npc, s: Seating) {
        const chairs = this.chairs.all();
        const probes = chairs.map((c) => ({ x: c.body.center.x, y: c.body.center.y, claimed: this.chairs.isClaimed(c), coolingDown: this.chairs.isCoolingDown(c) }));
        const npcPos = { x: npc.body.center.x, y: npc.body.center.y };
        const { usable } = fetchCandidates(this.grid(), this.clearGrid(), npcPos, s.spot, SEAT_BACK[s.facing], probes);
        const best = usable[0];
        if (!best) return;
        this.chairs.claim(chairs[best.index]);
        s.chair = chairs[best.index];
        s.phase = 'go';
        s.follower = new PathFollower(best.plan.toChair.start, best.plan.toChair.path);
        s.stagingCell = best.plan.stagingCell;
    }

    private go(npc: Npc, s: Seating) {
        const chair = s.chair!;
        if (this.chairs.gap(npc, chair) <= GRAB_GAP) {
            this.startPull(npc, s);
            return;
        }
        if (this.blocked(npc, s)) {
            // Re-route to the chair from where they stand, once; otherwise give up
            const leg = s.bumps > MAX_BUMPS ? null : planLeg(this.grid(), this.centre(npc), cellOf(this.centre(chair)));
            if (!leg) {
                this.abandon(npc, s, 'blocked');
                return;
            }
            s.follower = new PathFollower(leg.start, leg.path);
        }
        if (s.follower?.step(npc) === 'arrived') this.startPull(npc, s);
    }

    // Take hold: route from here to the staging point half a tile behind the spot
    private startPull(npc: Npc, s: Seating) {
        npc.setVelocity(0);
        const leg = s.stagingCell ? planLeg(this.clearGrid(), this.centre(npc), s.stagingCell) : null;
        if (!leg) {
            this.abandon(npc, s, 'blocked');
            return;
        }
        s.follower = new PathFollower(leg.start, leg.path);
        s.bumps = 0;
        s.jam = {};
        s.phase = 'pull';
    }

    private pull(npc: Npc, s: Seating) {
        const chair = s.chair!;
        if (s.follower) {
            if (this.blocked(npc, s)) {
                const leg = s.bumps > MAX_BUMPS || !s.stagingCell ? null : planLeg(this.clearGrid(), this.centre(npc), s.stagingCell);
                if (!leg) {
                    this.abandon(npc, s, 'blocked');
                    return;
                }
                s.follower = new PathFollower(leg.start, leg.path);
                s.jam = {};
            }
            if (s.follower.step(npc) === 'arrived') {
                s.follower = null;
                s.finalSince = this.scene.time.now;
            }
        } else if (this.stepOntoSpot(npc, s)) {
            // On the spot with the chair half a tile behind: it rolls under them from here
            npc.setVelocity(0);
            this.beginSlide(npc, s);
            return;
        }
        this.dragChair(npc, chair, s);
        const lag = chairLag(this.box(npc), this.box(chair), GRAB_GAP, PARK_PX);
        const jam = checkJam(s.jam, lag, this.scene.time.now, JAM_MARGIN_PX, JAM_TIME_MS);
        s.jam = jam.state;
        if (jam.jammed) this.abandon(npc, s, 'jam');
    }

    // The chair is towed like on a short rope: it only moves once it is further than the rope from the coworker, and
    // is then pulled straight towards them, so it follows their path instead of swinging around them at corners.
    // On the last step onto the spot it is eased to directly behind the desk instead. It is chased with a velocity,
    // not teleported, so walls and furniture still stop it.
    private dragChair(npc: Npc, chair: Chair, s: Seating) {
        const nx = npc.body.center.x;
        const ny = npc.body.center.y;
        let ux: number;
        let uy: number;
        if (s.follower) {
            const dx = chair.body.center.x - nx;
            const dy = chair.body.center.y - ny;
            const dist = Math.hypot(dx, dy) || 1;
            ux = dx / dist;
            uy = dy / dist;
            if (dist <= this.rope(npc, chair, ux, uy)) {
                chair.body.setVelocity(0, 0);
                return;
            }
        } else {
            ({ x: ux, y: uy } = SEAT_BACK[s.facing]);
        }
        const rope = this.rope(npc, chair, ux, uy);
        const dt = Math.max(this.scene.game.loop.delta, 1) / 1000;
        const chase = new Phaser.Math.Vector2(
            (nx + ux * rope - chair.body.center.x) / dt,
            (ny + uy * rope - chair.body.center.y) / dt
        );
        if (chase.length() > DRAG_CHASE_MAX) chase.normalize().scale(DRAG_CHASE_MAX);
        chair.body.setVelocity(chase.x, chase.y);
    }

    // Centre-to-centre distance the chair is held at along (ux, uy): touching, but at least half a tile
    private rope(npc: Npc, chair: Chair, ux: number, uy: number) {
        return ropeLength(ux, uy, this.box(npc), this.box(chair), GRAB_GAP, PARK_PX);
    }

    private box(sprite: { body: Phaser.Physics.Arcade.Body }) {
        const { center, halfWidth, halfHeight } = sprite.body;
        return { x: center.x, y: center.y, halfWidth, halfHeight };
    }

    // The short straight step from the staging point onto the exact spot. True once there (or it is taking too long).
    private stepOntoSpot(npc: Npc, s: Seating) {
        const done = this.arrived(npc, s.spot) || this.scene.time.now - (s.finalSince ?? 0) > FINAL_STEP_MS;
        if (!done) this.walk(npc, s.spot.x, s.spot.y);
        return done;
    }

    // Chair at the sitter's feet: from here it is slid by hand, so it can pass through them
    private beginSlide(npc: Npc, s: Seating) {
        const chair = s.chair!;
        chair.body.setVelocity(0, 0);
        npc.setData(FACING, s.facing);
        s.seat = seatPosition(npc.x, npc.y, s.facing);
        chair.setFrame(seatFrame(s.facing));
        chair.body.enable = false;
        // The seat layers draw the chair from here; the sprite just carries its position (and hides its own shadow)
        chair.setVisible(false);
        s.phase = 'slide';
    }

    // The trip ends early. A jam or a stolen chair lets go of the chair and walks back to the spot to work standing; every other reason
    // (and a jam with no way back) leaves them where they are, for the host to deal with (see hasGivenUp).
    // Whether the desk is still free is the host's to say: it checks before acting on the signal.
    private abandon(npc: Npc, s: Seating, reason: GiveUpReason) {
        if (s.chair) {
            this.chairs.unclaim(s.chair);
            s.chair.body.setVelocity(0, 0);
            if (reason === 'jam') this.chairs.markJammed(s.chair);
        }
        s.chair = undefined;
        npc.setVelocity(0);
        const atSpot = Phaser.Math.Distance.Between(npc.body.center.x, npc.body.center.y, s.spot.x, s.spot.y) <= NEAR_SPOT_PX;
        let leg = null;
        if ((reason === 'jam' || reason === 'taken') && !atSpot) {
            const goal = nearestReachableCell(this.grid(), this.cellFor(npc), cellOf(s.spot), RETURN_FALLBACK_CELLS);
            leg = goal ? planLeg(this.grid(), this.centre(npc), goal) : null;
        }
        const outcome = giveUpOutcome(reason, atSpot, leg !== null, false);
        this.giveUps.set(s.name, signalOf(outcome, reason));
        s.jam = {};
        if (outcome === 'forget') {
            s.follower = null;
            s.phase = 'none';
            return;
        }
        // Walk back (routed), then the short straight step onto the spot; on the spot that step is all there is
        s.phase = 'return';
        s.follower = leg ? new PathFollower(leg.start, leg.path) : null;
        s.finalSince = s.follower ? undefined : this.scene.time.now;
    }

    // Routed walk back to the spot, then the short straight step onto it. True once there.
    private returnToSpot(npc: Npc, s: Seating) {
        if (s.follower) {
            if (s.follower.step(npc) === 'arrived') {
                s.follower = null;
                s.finalSince = this.scene.time.now;
            }
            return false;
        }
        return this.stepOntoSpot(npc, s);
    }

    // Stopped by something the route did not account for. Counts the bump; sliding a loose chair does not count.
    private blocked(npc: Npc, s: Seating) {
        if (s.forcedBlock && this.scene.time.now - s.since > FORCED_BLOCK_AFTER_MS) {
            s.forcedBlock = false;
            s.bumps = MAX_BUMPS + 1;
            npc.setVelocity(0);
            return true;
        }
        if (!PathFollower.isBlocked(npc)) return false;
        s.bumps++;
        s.bumped = true;
        npc.setVelocity(0);
        return true;
    }

    private centre(sprite: { body: Phaser.Physics.Arcade.Body }) {
        return { x: sprite.body.center.x, y: sprite.body.center.y };
    }

    private cellFor(npc: Npc) {
        return cellOf(this.centre(npc));
    }

    private arrived(npc: Npc, spot: Phaser.Math.Vector2) {
        return Phaser.Math.Distance.Between(npc.body.center.x, npc.body.center.y, spot.x, spot.y) <= 2;
    }

    private walk(npc: Npc, x: number, y: number) {
        const v = new Phaser.Math.Vector2(x - npc.body.center.x, y - npc.body.center.y).normalize();
        const speed = walkSpeedOf(npc);
        npc.setVelocity(v.x * speed, v.y * speed);
    }
}
