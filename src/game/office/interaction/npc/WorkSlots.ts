// Who is using which work desk. Pure bookkeeping (no Phaser) so it can be unit tested.
// A desk is held by at most one owner and an owner holds at most one desk.
export class WorkSlots {
    private holders = new Map<string, string>();

    // True when the owner holds the desk afterwards. Refused if someone else holds it, or the owner already holds another desk.
    claim(id: string, owner: string): boolean {
        const holder = this.holders.get(id);
        if (holder !== undefined) return holder === owner;
        if (this.heldBy(owner) !== undefined) return false;
        this.holders.set(id, owner);
        return true;
    }

    // Frees whatever the owner holds; safe to call when it holds nothing, so every exit path can call it
    release(owner: string) {
        for (const [id, holder] of this.holders) {
            if (holder === owner) this.holders.delete(id);
        }
    }

    // Free, or already held by `owner`
    isFree(id: string, owner?: string) {
        const holder = this.holders.get(id);
        return holder === undefined || holder === owner;
    }

    holderOf(id: string) {
        return this.holders.get(id);
    }

    heldBy(owner: string) {
        for (const [id, holder] of this.holders) if (holder === owner) return id;
        return undefined;
    }

    // Picks a random free desk among `candidates` and claims it in the same call, so two owners
    // choosing in the same frame can never end up with the same desk. Nothing when none is free or the owner holds one already.
    claimRandom(candidates: string[], owner: string, rng: () => number = Math.random): string | undefined {
        if (this.heldBy(owner) !== undefined) return undefined;
        const free = candidates.filter((id) => this.isFree(id));
        if (free.length === 0) return undefined;
        const id = free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
        this.claim(id, owner);
        return id;
    }
}
