import type Phaser from 'phaser';
import { PUSH_SHOVED, PUSH_STOPPED } from '../pushChain';
import { faceHorizontal } from './facing';
import { CELL } from './WalkGrid';
import { toWaypoints, type Cell } from './pathfinding';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// Fallback walking speed (the player on a chair trip). Coworkers carry their own, set from pushTuning.ts.
export const WALK_SPEED = 40;
export const WALK_SPEED_KEY = 'walkSpeed';

export function walkSpeedOf(npc: Sprite) {
    return (npc.getData(WALK_SPEED_KEY) as number | undefined) ?? WALK_SPEED;
}
// Within this many px of a waypoint the coworker snaps onto it and heads for the next
const ARRIVE_PX = 2;

// Walks a coworker along the waypoints of an A* path, one frame at a time. Shared by wandering and the work trips.
export class PathFollower {
    private waypoints: Cell[];

    // `path` is what findPath returned for a route starting at `start`
    constructor(start: Cell, path: Cell[]) {
        this.waypoints = toWaypoints(start, path);
    }

    // Stopped by something the path did not account for (a push the resolver refused: the player, an immovable
    // coworker, a wall) or shoved off its path. Sliding a loose chair is neither.
    static isBlocked(npc: Sprite) {
        return npc.body.blocked.none === false || npc.getData(PUSH_STOPPED) === true || npc.getData(PUSH_SHOVED) === true;
    }

    // Sets the velocity towards the next waypoint. 'arrived' once the last one is reached, with the coworker stopped.
    step(npc: Sprite): 'moving' | 'arrived' {
        const target = this.waypoints[0];
        if (!target) {
            npc.setVelocity(0);
            return 'arrived';
        }
        const tx = target.cx * CELL + CELL / 2;
        const ty = target.cy * CELL + CELL / 2;
        const dx = tx - npc.body.center.x;
        const dy = ty - npc.body.center.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= ARRIVE_PX) {
            // Snap onto the waypoint so small errors do not build up along the route
            npc.x += dx;
            npc.y += dy;
            this.waypoints.shift();
            if (this.waypoints.length === 0) {
                npc.setVelocity(0);
                return 'arrived';
            }
            return 'moving';
        }
        const speed = walkSpeedOf(npc);
        npc.setVelocity((dx / dist) * speed, (dy / dist) * speed);
        if (Math.abs(dx) > 0.01) faceHorizontal(npc, dx < 0);
        return 'moving';
    }
}
