import Phaser from 'phaser';
import { WORK_DURATION_MS, WORK_PHRASE_MS, WORK_PHRASES } from '../workPhrases';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// What the interaction needs from the scene that owns the player
export interface PlayerWorkHost {
    player: Sprite;
    bubble: Phaser.GameObjects.Text;
    isInWorkZone(sprite: Sprite): boolean;
    isTyping(): boolean;
}

// The player works like the coworkers: standing still in a work zone starts it; moving, typing or leaving stops it
export class PlayerWork {
    private work?: { timer: Phaser.Time.TimerEvent };
    // Set after a full work period, so standing still in the zone doesn't restart it
    private done = false;

    private scene: Phaser.Scene;
    private host: PlayerWorkHost;

    constructor(scene: Phaser.Scene, host: PlayerWorkHost) {
        this.scene = scene;
        this.host = host;
    }

    // Call every frame
    update(moving: boolean) {
        const { host } = this;
        const inZone = host.isInWorkZone(host.player);
        if (!inZone) this.done = false;
        if (this.work) {
            if (moving || host.isTyping() || !inZone) this.stop();
        } else if (inZone && !moving && !host.isTyping() && !this.done && !host.bubble.visible) {
            this.start();
        }
    }

    private start() {
        const { bubble } = this.host;
        const endAt = this.scene.time.now + WORK_DURATION_MS;
        const timer = this.scene.time.addEvent({
            delay: WORK_PHRASE_MS * 2,
            loop: true,
            startAt: WORK_PHRASE_MS * 2, // fire the first phrase right away
            callback: () => {
                if (this.scene.time.now >= endAt) {
                    this.done = true;
                    this.stop();
                    return;
                }
                bubble.setStyle({ fontStyle: 'italic', color: '#555555' });
                bubble.setText(Phaser.Utils.Array.GetRandom(WORK_PHRASES));
                bubble.setVisible(true);
            }
        });
        this.work = { timer };
    }

    isWorking() {
        return this.work !== undefined;
    }

    private stop() {
        if (!this.work) return;
        const { bubble } = this.host;
        this.work.timer.remove();
        this.work = undefined;
        bubble.setStyle({ fontStyle: 'normal', color: '#000000' });
        if (!this.host.isTyping()) bubble.setVisible(false);
    }
}
