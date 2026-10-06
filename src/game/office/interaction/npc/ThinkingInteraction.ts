import Phaser from 'phaser';
import type { NpcName } from '../../OfficeScene';

const FRAMES = ['.', '..', '...'];
const FRAME_MS = 400;

// What the interaction needs from the scene that owns the coworkers
export interface ThinkingHost {
    bubble(name: NpcName): Phaser.GameObjects.Text | undefined;
    // Puts the bubble above the coworker's head
    positionBubble(name: NpcName): void;
    // Styles the bubble as an italic grey thought
    styleThought(bubble: Phaser.GameObjects.Text): void;
}

// Thought bubble: animated dots above the coworker until the first token arrives
export class ThinkingInteraction {
    private timers = new Map<NpcName, Phaser.Time.TimerEvent>();

    private scene: Phaser.Scene;
    private host: ThinkingHost;

    constructor(scene: Phaser.Scene, host: ThinkingHost) {
        this.scene = scene;
        this.host = host;
    }

    start(name: NpcName) {
        const bubble = this.host.bubble(name);
        if (!bubble) return;
        this.stop(name);

        let i = 0;
        this.host.styleThought(bubble);
        bubble.setText(FRAMES[i]);
        this.host.positionBubble(name);
        bubble.setVisible(true);
        this.timers.set(name, this.scene.time.addEvent({
            delay: FRAME_MS,
            loop: true,
            callback: () => bubble.setText(`(${FRAMES[++i % FRAMES.length]})`)
        }));
    }

    // Stops the animation without touching the bubble (whatever replaces the dots takes it over)
    stop(name: NpcName) {
        this.timers.get(name)?.remove();
        this.timers.delete(name);
    }
}
