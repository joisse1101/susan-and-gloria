// The one rule that decides when an actor (a coworker or the player) starts a tile interaction (work, watering).
// Pure, so it is unit tested; each interaction supplies its own inputs.
export interface StartInput {
    inReach: boolean; // the actor's feet are within the interaction's reach
    interrupted: boolean; // a bubble is up on a coworker, or a key / typing / chat bubble on the player
    onCooldown: boolean; // the thing to be used (a coworker's rest, or a plant's) is still resting
    free: boolean; // nobody else holds the desk or plant
    stillRequired: boolean; // the player must stand still to trigger it; a coworker can walk in
    standingStill: boolean;
}

export function shouldStart(i: StartInput): boolean {
    return i.inReach && !i.interrupted && !i.onCooldown && i.free && (!i.stillRequired || i.standingStill);
}

// When things rest after an interaction, keyed by whatever rests: a coworker (work) or a plant (watering, shared by
// every actor). The clock is passed in so it can be unit tested.
export class Cooldowns<K> {
    private until = new Map<K, number>();

    start(key: K, now: number, cooldownMs: number) {
        if (cooldownMs > 0) this.until.set(key, now + cooldownMs);
        else this.until.delete(key);
    }

    clear(key: K) {
        this.until.delete(key);
    }

    isCoolingDown(key: K, now: number) {
        return (this.until.get(key) ?? 0) > now;
    }
}

// The player's "it just ended here" flag: it stays set while they remain in reach, so standing still does not restart
// the interaction, and clears once they have left reach (and are not in the middle of one).
export function stillBlocked(blocked: boolean, inReach: boolean, idle: boolean): boolean {
    return !inReach && idle ? false : blocked;
}
