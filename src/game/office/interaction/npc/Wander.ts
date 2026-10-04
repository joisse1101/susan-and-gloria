import Phaser from 'phaser';
import type { NpcName } from './NpcBubbles';
import { faceHorizontal } from './facing';
import { CELL, type WalkGrid } from './WalkGrid';
import { findPath, reachableCells, toWaypoints, type Cell } from './pathfinding';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const WALK_SPEED = 40;
// After arriving, a coworker stands still for a random time in this range before picking the next spot
const PAUSE_MS = { min: 800, max: 2500 };
// Within this many px of a waypoint the coworker snaps onto it and heads for the next
const ARRIVE_PX = 2;
// Prefer destinations at least this many cells away so trips look purposeful
const MIN_TRIP_CELLS = 6;
// Bumps in a row (player or other coworker in the way) before giving up and standing still for a while
const MAX_BUMPS = 3;
const BUMP_PAUSE_MS = 2000;

export interface WanderHost {
    // Runs the work interaction; true while the coworker is walking to a work zone (it set the velocity)
    updateWork(name: NpcName): boolean;
    // A bubble is up (noticed, thinking or talking)
    isBusy(name: NpcName): boolean;
    isPushingChair(npc: Sprite): boolean;
}

interface Trip {
    waypoints: Cell[];
    bumps: number;
}

// Walks to a random reachable spot along an A* path, then pauses and repeats.
// Coworkers stand still while their bubble is up, and replan when something in the way stops them.
export class Wander {
    private scene: Phaser.Scene;
    private host: WanderHost;
    private grid: WalkGrid;
    private trips = new Map<NpcName, Trip>();
    private until = new Map<NpcName, number>();

    constructor(scene: Phaser.Scene, host: WanderHost, grid: WalkGrid) {
        this.scene = scene;
        this.host = host;
        this.grid = grid;
    }

    update(name: NpcName, npc: Sprite) {
        const heading = this.host.updateWork(name);
        const busy = this.host.isBusy(name); // after the work update: starting work puts a bubble up
        if (busy) {
            this.trips.delete(name);
            npc.setVelocity(0);
            return;
        }
        if (heading) {
            // walking to a work zone: the work interaction set the velocity
            this.trips.delete(name);
            return;
        }

        const trip = this.trips.get(name);
        if (trip) {
            const blocked = npc.body.blocked.none === false || (npc.body.touching.none === false && !this.host.isPushingChair(npc));
            if (blocked) this.replan(name, npc);
            else this.follow(name, npc, trip);
        } else if (this.scene.time.now >= (this.until.get(name) ?? 0)) {
            this.startTrip(name, npc, 0);
        }
    }

    // Stopped by the player or the other coworker: choose a fresh destination from where it stands
    private replan(name: NpcName, npc: Sprite) {
        const bumps = (this.trips.get(name)?.bumps ?? 0) + 1;
        this.trips.delete(name);
        npc.setVelocity(0);
        if (bumps >= MAX_BUMPS) {
            this.until.set(name, this.scene.time.now + BUMP_PAUSE_MS);
        } else {
            this.startTrip(name, npc, bumps);
        }
    }

    private startTrip(name: NpcName, npc: Sprite, bumps: number) {
        const start = this.cellAt(npc);
        const reachable = start ? reachableCells(this.grid, start) : [];
        const far = reachable.filter((c) => Math.max(Math.abs(c.cx - start!.cx), Math.abs(c.cy - start!.cy)) >= MIN_TRIP_CELLS);
        const choices = far.length > 0 ? far : reachable;
        const goal = choices.length > 0 ? Phaser.Utils.Array.GetRandom(choices) : null;
        const path = start && goal ? findPath(this.grid, start, goal) : null;
        if (!start || !path || path.length === 0) {
            this.until.set(name, this.scene.time.now + Phaser.Math.Between(PAUSE_MS.min, PAUSE_MS.max));
            return;
        }
        this.trips.set(name, { waypoints: toWaypoints(start, path), bumps });
    }

    private follow(name: NpcName, npc: Sprite, trip: Trip) {
        const target = trip.waypoints[0];
        const tx = target.cx * CELL + CELL / 2;
        const ty = target.cy * CELL + CELL / 2;
        const dx = tx - npc.body.center.x;
        const dy = ty - npc.body.center.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= ARRIVE_PX) {
            // Snap onto the waypoint so small errors do not build up along the route
            npc.x += dx;
            npc.y += dy;
            trip.waypoints.shift();
            if (trip.waypoints.length === 0) {
                this.trips.delete(name);
                npc.setVelocity(0);
                this.until.set(name, this.scene.time.now + Phaser.Math.Between(PAUSE_MS.min, PAUSE_MS.max));
            }
            return;
        }
        npc.setVelocity((dx / dist) * WALK_SPEED, (dy / dist) * WALK_SPEED);
        if (Math.abs(dx) > 0.01) faceHorizontal(npc, dx < 0);
    }

    // The walkable cell under the coworker's feet, or the nearest one if it was pushed onto a blocked cell
    private cellAt(npc: Sprite): Cell | null {
        const cx = Math.floor(npc.body.center.x / CELL);
        const cy = Math.floor(npc.body.center.y / CELL);
        for (let r = 0; r < 12; r++) {
            let best: Cell | null = null;
            let bestDist = Infinity;
            for (let y = cy - r; y <= cy + r; y++) {
                for (let x = cx - r; x <= cx + r; x++) {
                    if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || !this.grid.isWalkable(x, y)) continue;
                    const d = (x - cx) ** 2 + (y - cy) ** 2;
                    if (d < bestDist) { best = { cx: x, cy: y }; bestDist = d; }
                }
            }
            if (best) return best;
        }
        return null;
    }
}
