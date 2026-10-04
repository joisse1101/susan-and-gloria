// Pure jam detection for a towed chair (no Phaser), so it can be unit tested. NpcSeats gathers the inputs and acts on the result.

// Whatever has a centre and half sizes: a physics body
export interface BodyBox { x: number; y: number; halfWidth: number; halfHeight: number }

// Centre-to-centre distance a chair is held at along the unit vector (ux, uy) from the walker: touching plus `grabGap`,
// but never closer than `minRope`
export function ropeLength(ux: number, uy: number, walker: BodyBox, chair: BodyBox, grabGap: number, minRope: number) {
    const reach = (b: BodyBox) => Math.abs(ux) * b.halfWidth + Math.abs(uy) * b.halfHeight;
    return Math.max(minRope, reach(walker) + reach(chair) + grabGap);
}

// How far (px) the chair trails the walker beyond the rope: 0 or less while it is being towed normally
export function chairLag(walker: BodyBox, chair: BodyBox, grabGap: number, minRope: number) {
    const dx = chair.x - walker.x;
    const dy = chair.y - walker.y;
    const dist = Math.hypot(dx, dy);
    const [ux, uy] = dist === 0 ? [1, 0] : [dx / dist, dy / dist];
    return dist - ropeLength(ux, uy, walker, chair, grabGap, minRope);
}

// When the lag first went over the margin; undefined while it is under it. Start a leg or phase with `{}`.
export interface JamState { overSince?: number }

// The chair is jammed once its lag has stayed over `margin` for `time` ms. Dropping back under the margin resets the timer.
export function checkJam(state: JamState, lag: number, now: number, margin: number, time: number): { jammed: boolean; state: JamState } {
    if (lag <= margin) return { jammed: false, state: {} };
    const overSince = state.overSince ?? now;
    return { jammed: now - overSince >= time, state: { overSince } };
}
