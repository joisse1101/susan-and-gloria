import Phaser from 'phaser';
import { SPEECH_DEPTH } from '../../constants';
import { NPC_BUBBLE_WIDTH } from '../npc/NpcBubbles';

const SPEECH_LINGER_MS = 3000;

export interface ChatHost {
    // Arrow keys while chatting scroll the coworkers' replies
    scrollNpcSpeech(lines: number): void;
    // Sends the finished chat line; returns false if it can't be sent right now (the text is kept)
    say(text: string): boolean;
}

// In-game chat: "/" or Enter opens it, typing shows in the player's bubble, Enter sends, Esc cancels
export class Chat {
    // The player's speech bubble; the scene keeps it above the player
    readonly bubble: Phaser.GameObjects.Text;
    isTyping = false;

    private scene: Phaser.Scene;
    private host: ChatHost;
    private text = '';
    private timer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, host: ChatHost) {
        this.scene = scene;
        this.host = host;
        this.bubble = scene.add.text(0, 0, '', {
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 6, y: 4 },
            wordWrap: { width: NPC_BUBBLE_WIDTH }
        });
        // Origin at the bottom centre & hidden initially; depth sits above any y-based sprite depth
        this.bubble.setOrigin(0.5, 1).setVisible(false).setDepth(SPEECH_DEPTH);
        scene.input.keyboard?.on('keydown', this.onKeyDown, this);
    }

    // Phaser captures space/arrows with preventDefault, which would block them in the React <input>
    setTyping(isTyping: boolean) {
        this.isTyping = isTyping;
        const keyboard = this.scene.input.keyboard;
        if (!keyboard) return;
        if (isTyping) keyboard.disableGlobalCapture();
        else keyboard.enableGlobalCapture();
    }

    display(message: string) {
        this.timer?.remove();
        this.bubble.setText(message);
        this.bubble.setVisible(true);
        this.timer = this.scene.time.delayedCall(SPEECH_LINGER_MS, () => this.bubble.setVisible(false));
    }

    private onKeyDown(event: KeyboardEvent) {
        if (!this.isTyping) {
            if (event.key === '/' || event.key === 'Enter') {
                event.preventDefault(); // keeps the "/" out of the text
                this.text = '';
                this.setTyping(true);
                this.render();
            }
            return;
        }
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === 'Enter') {
            const text = this.text.trim();
            if (!text) return;
            if (!this.host.say(text)) return; // busy: keep what was typed
            this.close();
            this.display(text);
        } else if (event.key === 'Escape') {
            this.close();
            this.bubble.setVisible(false);
        } else if (event.key === 'Backspace') {
            this.text = this.text.slice(0, -1);
            this.render();
        } else if (event.key === 'ArrowUp') {
            this.host.scrollNpcSpeech(-1);
        } else if (event.key === 'ArrowDown') {
            this.host.scrollNpcSpeech(1);
        } else if (event.key.length === 1) {
            this.text += event.key;
            this.render();
        }
    }

    private close() {
        this.text = '';
        this.setTyping(false);
    }

    private render() {
        this.timer?.remove();
        this.timer = undefined;
        this.bubble.setText(`${this.text}|`);
        this.bubble.setVisible(true);
    }
}
