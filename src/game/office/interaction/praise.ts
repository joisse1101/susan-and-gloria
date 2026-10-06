// "Once per encounter": someone who comes near a plant that another actor is watering says a praise line once, and not
// again until they have left the plant's reach and come back. Pure, so it is unit tested; the interaction supplies
// the inputs each frame.
export interface PraiseInput {
    inReach: boolean; // the newcomer is within the plant's reach
    someoneWaters: boolean; // another actor is heading for the plant or watering it
    canSay: boolean; // free to speak now (no bubble up; the player must also stand still, not be walking through)
}

export class PraiseEncounters {
    // The plants each actor has already praised on this visit
    private said = new Map<string, Set<string>>();

    // True when `actor` should say a praise line now about `plantId`
    update(actor: string, plantId: string, i: PraiseInput): boolean {
        let plants = this.said.get(actor);
        if (!plants) this.said.set(actor, (plants = new Set()));
        if (!i.inReach) {
            plants.delete(plantId); // left: the next visit is a new encounter
            return false;
        }
        // Not said, so not used up: a newcomer who walks in and stops later still says it
        if (!i.someoneWaters || !i.canSay || plants.has(plantId)) return false;
        plants.add(plantId);
        return true;
    }
}
