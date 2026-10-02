import Phaser from 'phaser';
import type { NpcName } from './NpcBubbles';
import { faceHorizontal } from './facing';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const WALK_SPEED = 40;
// Each wander step is a walk or a pause lasting a random time in this range
const STEP_MS = { min: 800, max: 2500 };

export interface WanderHost {
    // Runs the work interaction; true while the coworker is walking to a work zone (it set the velocity)
    updateWork(name: NpcName): boolean;
    // A bubble is up (noticed, thinking or talking)
    isBusy(name: NpcName): boolean;
    isPushingChair(npc: Sprite): boolean;
}

// Random walk: alternate between heading in a random direction and standing still.
// Coworkers stand still while their bubble is up.
export class Wander {
    private scene: Phaser.Scene;
    private host: WanderHost;
    private until = new Map<NpcName, number>();

    constructor(scene: Phaser.Scene, host: WanderHost) {
        this.scene = scene;
        this.host = host;
    }

    update(name: NpcName, npc: Sprite) {
        const heading = this.host.updateWork(name);
        const busy = this.host.isBusy(name); // after the work update: starting work puts a bubble up
        const blocked = npc.body.blocked.none === false || (npc.body.touching.none === false && !this.host.isPushingChair(npc));
        if (busy) {
            npc.setVelocity(0);
        } else if (heading) {
            // walking to a work zone: the work interaction set the velocity
        } else if (blocked || this.scene.time.now >= (this.until.get(name) ?? 0)) {
            const idle = npc.body.velocity.lengthSq() > 0 || Math.random() < 0.3;
            if (idle) {
                npc.setVelocity(0);
            } else {
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                npc.setVelocity(Math.cos(angle) * WALK_SPEED, Math.sin(angle) * WALK_SPEED);
                if (npc.body.velocity.x !== 0) faceHorizontal(npc, npc.body.velocity.x < 0);
            }
            this.until.set(name, this.scene.time.now + Phaser.Math.Between(STEP_MS.min, STEP_MS.max));
        }
    }
}
