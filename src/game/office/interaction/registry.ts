// What every tile interaction (work, watering) offers the scene, for any actor. The registry lets an actor be in at
// most one at a time and gives the scene one place to ask about them, instead of knowing each interaction.
export interface Pose {
    kind: string; // 'work', 'water'
    working: boolean; // doing it now, not only heading for it
}

export interface Interaction<Id> {
    // Called every frame. True while heading for the spot (it has set the velocity, so the actor should not wander).
    update(id: Id): boolean;
    // Ends it whatever stage it is at, freeing what it holds. Leaves the bubble alone.
    cancel(id: Id): void;
    // Heading for it or doing it: what keeps the actor out of every other interaction
    isActive(id: Id): boolean;
    // At its spot (or past it): the coworker cannot be pushed. Walking there is not engaged.
    isEngaged(id: Id): boolean;
    pose(id: Id): Pose | undefined;
}

// Interactions are registered in priority order: when an actor could start two in the same frame, the first wins.
export class InteractionRegistry<Id> {
    private all: Interaction<Id>[] = [];

    register(interaction: Interaction<Id>) {
        this.all.push(interaction);
    }

    // Runs the actor's interactions for this frame. An actor already in one runs only that one; otherwise each is
    // offered a turn in priority order, until one takes the actor. True while the actor is heading for a spot.
    updateInteractions(id: Id): boolean {
        const active = this.all.find((i) => i.isActive(id));
        if (active) return active.update(id);
        for (const i of this.all) {
            const heading = i.update(id);
            if (heading || i.isActive(id)) return heading;
        }
        return false;
    }

    // An interrupt (a bubble on a coworker, a key for the player) ends whichever interaction the actor is in
    cancelAll(id: Id) {
        for (const i of this.all) i.cancel(id);
    }

    isEngaged(id: Id) {
        return this.all.some((i) => i.isEngaged(id));
    }

    pose(id: Id): Pose | undefined {
        for (const i of this.all) {
            const pose = i.pose(id);
            if (pose) return pose;
        }
        return undefined;
    }
}
