// A chair that jammed someone is left alone for a while. Keyed by the chair itself, not where it is, so moving the
// chair does not end the cooldown. The clock is passed in so it can be unit tested.
export class JamCooldowns<K> {
    private until = new Map<K, number>();

    mark(key: K, now: number, cooldownMs: number) {
        if (cooldownMs > 0) this.until.set(key, now + cooldownMs);
        else this.until.delete(key);
    }

    isCoolingDown(key: K, now: number) {
        return (this.until.get(key) ?? 0) > now;
    }
}
