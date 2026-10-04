import type Phaser from 'phaser';
import { walkSpeedOf } from './PathFollower';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// The step from the zone onto the exact spot against the desk or plant: after APPROACH_MS, or if they end up further
// than SPOT_TOLERANCE_PX from it, the spot is unusable (someone is standing in the way)
export const APPROACH_MS = 2000;
export const SPOT_TOLERANCE_PX = 12;
// Closer than this the walker counts as on the spot
const ON_SPOT_PX = 2;

// Pure: how the step is going, given how far the body centre is from the spot and how long the step has run
export function approachState(distPx: number, elapsedMs: number): 'moving' | 'ready' | 'failed' {
    if (distPx > ON_SPOT_PX && elapsedMs < APPROACH_MS) return 'moving';
    return distPx > SPOT_TOLERANCE_PX ? 'failed' : 'ready';
}

// One frame of the straight-line step onto the spot (body centre, px): sets the velocity while it is 'moving'
export function stepOntoSpot(npc: Sprite, spot: { x: number; y: number }, startedAt: number, now: number) {
    const { x, y } = npc.body.center;
    const dist = Math.hypot(spot.x - x, spot.y - y);
    const state = approachState(dist, now - startedAt);
    if (state === 'moving') {
        const speed = walkSpeedOf(npc);
        npc.setVelocity(((spot.x - x) / dist) * speed, ((spot.y - y) / dist) * speed);
    }
    return state;
}
