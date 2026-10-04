import type { Facing } from '../player/playerSprite';

// Pure facing rules for coworkers (and the player), so they can be unit tested.

// Moving turns a coworker to face its direction of travel (the stronger axis wins); standing keeps the facing it had
export function facingFromVelocity(vx: number, vy: number, current: Facing): Facing {
    if (vx === 0 && vy === 0) return current;
    if (Math.abs(vx) >= Math.abs(vy)) return vx < 0 ? 'left' : 'right';
    return vy < 0 ? 'up' : 'down';
}

// The player's facing: the last direction they moved (horizontal wins over vertical, unlike coworkers), but while
// they work standing still they face the desk (`deskFacing`: set by the chair trip when they sat or reached the spot)
export function playerFacing(vx: number, vy: number, current: Facing, workingStill: boolean, deskFacing?: Facing): Facing {
    let facing = current;
    if (vx !== 0) facing = vx < 0 ? 'left' : 'right';
    else if (vy !== 0) facing = vy < 0 ? 'up' : 'down';
    return workingStill && deskFacing ? deskFacing : facing;
}

// The facing to work at: the way the desk is, once they are on the spot. Walking back to the spot turns them
// (see facingFromVelocity), so it has to be set again on arrival. Undefined when they are not on the spot: they do
// not work there, so there is nothing to turn.
export function facingForStandingWork(deskFacing: Facing, onSpot: boolean): Facing | undefined {
    return onSpot ? deskFacing : undefined;
}
