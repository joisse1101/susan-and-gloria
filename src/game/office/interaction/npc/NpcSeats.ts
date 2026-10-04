import Phaser from 'phaser';
import type { Chairs } from '../../furniture/Chairs';
import { SeatLayers, SEAT_BACK, seatFrame, seatPosition } from '../../furniture/SeatLayers';
import type { Facing } from '../player/playerSprite';
import { FACING } from './facing';
import type { NpcName } from './NpcBubbles';
import type { WalkGrid } from './WalkGrid';
import { nearestReachableCell, type Cell } from './pathfinding';
import { PathFollower, WALK_SPEED } from './PathFollower';
import { cellOf, chairsInReach, inReachByRoute, PARK_PX, planChairFetch, planLeg } from './chairReach';

type Npc = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
type Chair = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
// The player fetches a chair the same way the coworkers do
export type SeatUser = NpcName | 'player';

const SLIDE_SPEED = 50;
// Touching distance (px between bodies) at which they take hold of the chair
const GRAB_GAP = 4;
// The whole fetch, walking to the chair and dragging it back, over routes of up to MAX_CHAIR_ROUTE_TILES each way
// at WALK_SPEED, so it needs well over the straight-line time
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
    player: boolean;
    // Set when the player gave up on the chair; read and cleared by hasGivenUp
    gaveUp?: boolean;
    // Debug: the next check for being blocked says yes, beyond the bump limit
    forcedBlock?: boolean;
}

// Coworkers fetch the nearest loose chair by walking route, drag it into place and work sitting in it. No chair in reach: they work standing.
export class NpcSeats {
    private scene: Phaser.Scene;
    private chairs: Chairs;
    private npc: (name: SeatUser) => Npc;
    private grid: () => WalkGrid;
    private states = new Map<SeatUser, Seating>();
    private layers = new Map<SeatUser, SeatLayers>();
    // Debug (B key): trips that are to fail as if blocked
    private forcedBlocks = new Set<SeatUser>();

    constructor(scene: Phaser.Scene, chairs: Chairs, npc: (name: SeatUser) => Npc, grid: () => WalkGrid) {
        this.scene = scene;
        this.chairs = chairs;
        this.npc = npc;
        this.grid = grid;
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
                player: name === 'player'
            };
            this.pickChairByRoute(npc, s);
            this.states.set(name, s);
        }
        if (this.forcedBlocks.delete(name)) s.forcedBlock = true;

        const chair = s.chair;
        if (chair && (s.phase === 'go' || s.phase === 'pull') && this.scene.time.now - s.since > GIVE_UP_MS) {
            this.abandon(npc, s);
        }

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
                return true;
            default:
                return true;
        }
    }

    // They stop working (or were interrupted): the chair stays where they sat
    release(name: SeatUser) {
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
        else layers.hide();
    }

    // True once if the coworker bumped into something (and so had to reroute) since this was last asked
    hasBumped(name: SeatUser) {
        const s = this.states.get(name);
        const bumped = s?.bumped === true;
        if (s) s.bumped = false;
        return bumped;
    }

    // True once if the player gave up on the chair (blocked, or too slow) since this was last asked
    hasGivenUp(name: SeatUser) {
        const s = this.states.get(name);
        const gaveUp = s?.gaveUp === true;
        if (s) s.gaveUp = false;
        return gaveUp;
    }

    // Debug: the user's current or next chair trip fails as if it were blocked beyond the bump limit
    forceBlock(name: SeatUser) {
        this.forcedBlocks.add(name);
    }

    isSeated(name: SeatUser) {
        return this.states.get(name)?.phase === 'seated';
    }

    // Among the loose chairs in reach (straight-line range, then walking route cap) take the one with the shortest
    // route that also has a route for dragging it to the desk
    private pickChairByRoute(npc: Npc, s: Seating) {
        const grid = this.grid();
        const chairs = this.chairs.all();
        const probes = chairs.map((c) => ({ x: c.body.center.x, y: c.body.center.y, claimed: this.chairs.isClaimed(c) }));
        const npcPos = { x: npc.body.center.x, y: npc.body.center.y };
        for (const { index } of inReachByRoute(chairsInReach(grid, s.spot, probes))) {
            const plan = planChairFetch(grid, npcPos, probes[index], s.spot, SEAT_BACK[s.facing]);
            if (!plan) continue;
            this.chairs.claim(chairs[index]);
            s.chair = chairs[index];
            s.phase = 'go';
            s.follower = new PathFollower(plan.toChair.start, plan.toChair.path);
            s.stagingCell = plan.stagingCell;
            return;
        }
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
                this.abandon(npc, s);
                return;
            }
            s.follower = new PathFollower(leg.start, leg.path);
        }
        if (s.follower?.step(npc) === 'arrived') this.startPull(npc, s);
    }

    // Take hold: route from here to the staging point half a tile behind the spot
    private startPull(npc: Npc, s: Seating) {
        npc.setVelocity(0);
        const leg = s.stagingCell ? planLeg(this.grid(), this.centre(npc), s.stagingCell) : null;
        if (!leg) {
            this.abandon(npc, s);
            return;
        }
        s.follower = new PathFollower(leg.start, leg.path);
        s.bumps = 0;
        s.phase = 'pull';
    }

    private pull(npc: Npc, s: Seating) {
        const chair = s.chair!;
        if (s.follower) {
            if (this.blocked(npc, s)) {
                const leg = s.bumps > MAX_BUMPS || !s.stagingCell ? null : planLeg(this.grid(), this.centre(npc), s.stagingCell);
                if (!leg) {
                    this.abandon(npc, s);
                    return;
                }
                s.follower = new PathFollower(leg.start, leg.path);
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
        const reach = (b: Phaser.Physics.Arcade.Body) => Math.abs(ux) * b.halfWidth + Math.abs(uy) * b.halfHeight;
        return Math.max(PARK_PX, reach(npc.body) + reach(chair.body) + GRAB_GAP);
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
        s.phase = 'slide';
    }

    // Gave up on the chair (too slow, or blocked): let go of it and walk back to the spot to work standing.
    // The player doesn't walk back: they decide where to go, so they just stand and work where they are.
    private abandon(npc: Npc, s: Seating) {
        if (s.chair) {
            this.chairs.unclaim(s.chair);
            s.chair.body.setVelocity(0, 0);
        }
        s.chair = undefined;
        if (s.player) {
            npc.setVelocity(0);
            s.follower = null;
            s.phase = 'none';
            s.gaveUp = true;
            return;
        }
        s.phase = 'return';
        s.finalSince = undefined;
        const goal = nearestReachableCell(this.grid(), this.cellFor(npc), cellOf(s.spot), RETURN_FALLBACK_CELLS);
        const leg = goal ? planLeg(this.grid(), this.centre(npc), goal) : null;
        s.follower = leg ? new PathFollower(leg.start, leg.path) : null;
        if (!s.follower) s.finalSince = this.scene.time.now;
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
        npc.setVelocity(v.x * WALK_SPEED, v.y * WALK_SPEED);
    }
}
