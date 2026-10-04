import { Cooldowns } from './trigger';
import { WorkSlots } from './npc/WorkSlots';
import { PraiseEncounters } from './praise';
import type { Plant } from './plants';

// What every actor shares about the plants: who holds each (one at a time) and when each rests. Pure bookkeeping.
export class PlantShared {
    readonly slots = new WorkSlots();
    // Keyed by plant: once anyone stops watering it, nobody waters it until the cooldown has passed
    readonly cooldowns = new Cooldowns<string>();
    // Who has already praised whom's watering on this visit, for every actor
    readonly praise = new PraiseEncounters();
    readonly plants: Plant[];

    constructor(plants: Plant[]) {
        this.plants = plants;
    }

    // Every way out of a watering trip (done, interrupted, gave up): free the plant and rest it
    finish(plantId: string, owner: string, now: number, cooldownMs: number) {
        this.slots.release(owner);
        this.cooldowns.start(plantId, now, cooldownMs);
    }
}
