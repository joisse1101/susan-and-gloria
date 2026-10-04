import Phaser from 'phaser';
import { FACING } from './npc/facing';
import type { WalkGrid } from './npc/WalkGrid';
import { PathFollower } from './npc/PathFollower';
import { facingFor, spotAgainst } from './npc/deskSpot';
import { stepOntoSpot } from './npc/approach';
import { routeToRect } from './npc/route';
import { shouldStart } from './trigger';
import { containsPx } from './zones';
import { reachZone, standSide, type Plant } from './plants';
import type { PlantShared } from './plantShared';
import type { WaterActor } from './waterActor';
import type { Interaction, Pose } from './registry';
import { WATER_COOLDOWN_MS, WATER_DURATION_MS, WATER_GIVE_UP_MS, WATER_REACH_TILES } from './waterTuning';

// The goal beside a plant can sit on a cell the grid keeps clear; settle for a reachable cell this close (in cells)
const GOAL_FALLBACK_CELLS = 4;
// Bumps on the way before giving up the trip
const MAX_BUMPS = 3;

type Stage = 'walking' | 'approach' | 'watering';

interface Trip {
    plant: Plant;
    stage: Stage;
    follower?: PathFollower;
    startedAt: number; // the trip, then the step onto the spot, then the watering
    giveUpAt: number;
    bumps: number;
}

export interface WaterHost<Id extends string> {
    actor(id: Id): WaterActor;
    walkGrid(): WalkGrid;
}

// Walks an actor to the plant, has it face the plant and water for WATER_DURATION_MS. Used for coworkers and for the
// player (one instance each, sharing the plants' claims and cooldowns), and reads only the actor adapter.
export class WaterInteraction<Id extends string> implements Interaction<Id> {
    private trips = new Map<Id, Trip>();
    private scene: Phaser.Scene;
    private host: WaterHost<Id>;
    private shared: PlantShared;

    constructor(scene: Phaser.Scene, host: WaterHost<Id>, shared: PlantShared) {
        this.scene = scene;
        this.host = host;
        this.shared = shared;
    }

    // True while the actor is busy with the plant (it has set the velocity, so it should not wander)
    update(id: Id): boolean {
        const actor = this.host.actor(id);
        const trip = this.trips.get(id);
        if (!trip) return this.maybeStart(id, actor);
        if (actor.interrupted()) {
            this.cancel(id);
            return false;
        }
        const now = this.scene.time.now;
        const npc = actor.sprite;
        if (trip.stage === 'watering') {
            npc.setVelocity(0);
            if (now >= trip.startedAt + WATER_DURATION_MS) this.end(id);
            return this.trips.has(id);
        }
        // Someone took the plant on the way, or the trip takes too long: it is lost
        if (this.shared.slots.holderOf(trip.plant.id) !== id || now > trip.giveUpAt) return this.giveUp(id, npc);
        if (trip.stage === 'walking') return this.walk(id, trip, actor);
        return this.approach(id, trip, actor);
    }

    // A free plant in reach, under the shared start rule
    private maybeStart(id: Id, actor: WaterActor): boolean {
        const now = this.scene.time.now;
        const { x, y } = actor.sprite.body.center;
        for (const plant of this.shared.plants) {
            const go = shouldStart({
                inReach: containsPx(reachZone(plant, WATER_REACH_TILES), plant.tileSize, x, y),
                interrupted: actor.interrupted(),
                onCooldown: this.shared.cooldowns.isCoolingDown(plant.id, now),
                free: this.shared.slots.isFree(plant.id, id),
                stillRequired: actor.stillRequired,
                standingStill: actor.standingStill()
            });
            if (go) return this.begin(id, actor, plant);
        }
        return false;
    }

    private begin(id: Id, actor: WaterActor, plant: Plant): boolean {
        const now = this.scene.time.now;
        if (!this.shared.slots.claim(plant.id, id)) return false;
        const follower = routeToRect(this.host.walkGrid(), actor.sprite.body.center, plant.rect, plant.tileSize, GOAL_FALLBACK_CELLS);
        if (!follower) {
            this.shared.finish(plant.id, id, now, WATER_COOLDOWN_MS);
            return false;
        }
        this.trips.set(id, { plant, stage: 'walking', follower, startedAt: now, giveUpAt: now + WATER_GIVE_UP_MS, bumps: 0 });
        return true;
    }

    // Chat command: drop whatever it was doing and go to the plant now, ignoring reach, cooldown and the start
    // conditions. The plant must still be free. True when the trip started.
    force(id: Id): boolean {
        this.cancel(id);
        const actor = this.host.actor(id);
        const plant = this.shared.plants.find((p) => this.shared.slots.isFree(p.id, id));
        return !!plant && this.begin(id, actor, plant);
    }

    private walk(id: Id, trip: Trip, actor: WaterActor): boolean {
        const npc = actor.sprite;
        if (PathFollower.isBlocked(npc)) {
            // Something got in the way: route again from where it stands
            npc.setVelocity(0);
            const follower = ++trip.bumps >= MAX_BUMPS ? null
                : routeToRect(this.host.walkGrid(), npc.body.center, trip.plant.rect, trip.plant.tileSize, GOAL_FALLBACK_CELLS);
            if (!follower) return this.giveUp(id, npc);
            trip.follower = follower;
        }
        if (trip.follower!.step(npc) === 'arrived') {
            trip.stage = 'approach';
            trip.startedAt = this.scene.time.now;
        }
        return true;
    }

    // The straight step flush against the plant, then face it and start
    private approach(id: Id, trip: Trip, actor: WaterActor): boolean {
        const npc = actor.sprite;
        const { plant } = trip;
        const dir = standSide(plant, npc.body.center.x, npc.body.center.y);
        const spot = spotAgainst(plant.rect, dir, plant.tileSize, npc.body.halfWidth, npc.body.halfHeight, npc.body.center.x);
        const step = stepOntoSpot(npc, spot, trip.startedAt, this.scene.time.now);
        if (step === 'failed') return this.giveUp(id, npc);
        if (step === 'moving') return true;
        npc.setVelocity(0);
        npc.setData(FACING, facingFor(dir));
        trip.stage = 'watering';
        trip.startedAt = this.scene.time.now;
        return true;
    }

    private giveUp(id: Id, npc: WaterActor['sprite']) {
        npc.setVelocity(0);
        this.end(id);
        return false;
    }

    // Done, interrupted or lost: free the plant and rest it
    private end(id: Id) {
        const trip = this.trips.get(id);
        if (!trip) return;
        this.trips.delete(id);
        this.shared.finish(trip.plant.id, id, this.scene.time.now, WATER_COOLDOWN_MS);
    }

    cancel(id: Id) {
        this.end(id);
    }

    isActive(id: Id) {
        return this.trips.has(id);
    }

    // At the plant: stepping onto the spot or watering
    isEngaged(id: Id) {
        const stage = this.trips.get(id)?.stage;
        return stage === 'approach' || stage === 'watering';
    }

    pose(id: Id): Pose | undefined {
        return this.trips.get(id)?.stage === 'watering' ? { kind: 'water', working: true } : undefined;
    }
}
