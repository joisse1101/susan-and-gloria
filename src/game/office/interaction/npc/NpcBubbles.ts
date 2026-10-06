import Phaser from 'phaser';
import { SPEECH_DEPTH } from '../../constants';

export type NpcName = 'susan' | 'gloria';

// Replies scroll inside a window of this many wrapped lines, following the newest text
const BUBBLE_LINES = 8;
export const NPC_BUBBLE_WIDTH = 250;
export const NPC_BUBBLE_FONT = '10px';
const LINGER_MS = 12000;
const MUTTER_CHAR_MS = 200;

export interface NpcBubblesHost {
    npc(name: NpcName): Phaser.GameObjects.Sprite;
    mapWidth(): number;
    // Another activity takes over the bubble: stop the NPC's work walk / thinking dots
    cancelAll(name: NpcName): void;
    stopThinking(name: NpcName): void;
}

interface Speech {
    text: string;
    offset: number;
    follow: boolean;
    done: boolean;
}

// Owns the speech bubble above each coworker: "!" notice, muttering, and the scrollable streamed reply.
export class NpcBubbles {
    private bubbles = new Map<NpcName, Phaser.GameObjects.Text>();
    private mutterTimers = new Map<NpcName, Phaser.Time.TimerEvent>();
    private hideTimers = new Map<NpcName, Phaser.Time.TimerEvent>();
    private speech = new Map<NpcName, Speech>();

    private scene: Phaser.Scene;
    private host: NpcBubblesHost;

    constructor(scene: Phaser.Scene, host: NpcBubblesHost) {
        this.scene = scene;
        this.host = host;
        for (const name of ['gloria', 'susan'] as const) this.bubbles.set(name, this.create());
        // Mouse wheel over a bubble scrolls it back through the reply.
        // Hit-tested by bounds: setInteractive() fixes its hit area at the (empty) size the text has when created.
        scene.input.on('wheel', (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
            for (const [name, bubble] of this.bubbles) {
                if (bubble.visible && bubble.getBounds().contains(pointer.worldX, pointer.worldY)) {
                    this.scroll(dy > 0 ? 1 : -1, name);
                }
            }
        });
    }

    get(name: NpcName) {
        return this.bubbles.get(name);
    }

    isVisible(name: NpcName) {
        return this.bubbles.get(name)?.visible ?? false;
    }

    // Keeps the bubble above the coworker and inside the map horizontally
    position(name: NpcName) {
        const bubble = this.bubbles.get(name);
        if (!bubble) return;
        const npc = this.host.npc(name);
        const half = bubble.width / 2;
        const x = Phaser.Math.Clamp(npc.x, half, this.host.mapWidth() - half);
        bubble.setPosition(x, npc.y - npc.displayHeight / 2 - 4);
    }

    // "!" over a coworker: they noticed the player speaking, before anyone is chosen to answer
    notice(name: NpcName) {
        const bubble = this.bubbles.get(name);
        if (!bubble) return;
        this.host.cancelAll(name);
        this.host.stopThinking(name);
        this.clearHideTimer(name);

        bubble.setStyle({ fontSize: '16px', fontStyle: 'bold', color: '#d00000', align: 'center' });
        bubble.setText('!');
        this.position(name);
        bubble.setVisible(true);
    }

    hide(name: NpcName) {
        this.host.stopThinking(name);
        this.clearHideTimer(name);
        this.bubbles.get(name)?.setVisible(false);
        this.speech.delete(name);
    }

    // Idle muttering (e.g. while working): a grey italic line typed out one character at a time.
    // `onDone` fires once the whole line is shown (never if the bubble is hidden or replaced first).
    mutter(name: NpcName, text: string, onDone?: () => void) {
        const bubble = this.bubbles.get(name);
        if (!bubble) return;
        this.mutterTimers.get(name)?.remove();
        this.styleThought(bubble);
        let shown = 1;
        bubble.setText(text.slice(0, shown));
        bubble.setVisible(true);
        this.position(name);
        if (text.length <= 1) {
            onDone?.();
            return;
        }
        this.mutterTimers.set(name, this.scene.time.addEvent({
            delay: MUTTER_CHAR_MS,
            repeat: text.length - 2,
            callback: () => {
                bubble.setText(text.slice(0, ++shown));
                this.position(name);
                if (shown >= text.length) {
                    this.mutterTimers.delete(name);
                    onDone?.();
                }
            }
        }));
    }

    hideMutter(name: NpcName) {
        this.mutterTimers.get(name)?.remove();
        this.mutterTimers.delete(name);
        this.bubbles.get(name)?.setVisible(false);
    }

    styleThought(bubble: Phaser.GameObjects.Text) {
        bubble.setStyle({ fontSize: NPC_BUBBLE_FONT, fontStyle: 'italic', color: '#555555', align: 'center' });
    }

    // Replaces the bubble with the (partial) reply; call repeatedly while streaming
    setSpeech(name: NpcName, text: string) {
        const bubble = this.bubbles.get(name);
        if (!bubble) return;
        this.host.cancelAll(name);
        this.host.stopThinking(name);
        this.clearHideTimer(name);

        // Blank lines only waste space
        const clean = text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
        const prev = this.speech.get(name);
        // A new reply starts pinned to the bottom; further tokens keep the player's scroll position
        const speech = prev && !prev.done ? prev : { text: '', offset: 0, follow: true, done: false };
        speech.text = clean;
        this.speech.set(name, speech);
        bubble.setStyle({ fontSize: NPC_BUBBLE_FONT, fontStyle: 'normal', color: '#000000', align: 'left' });
        bubble.setVisible(true);
        this.render(name);
    }

    // Reply finished (or failed): leave it up for a while so it can be read and scrolled, then hide
    finishSpeech(name: NpcName) {
        const speech = this.speech.get(name);
        if (!speech) return;
        speech.done = true;
        this.scheduleHide(name);
    }

    // Scrolls the visible bubble by `lines` (negative = back up); reaching the bottom resumes auto-follow
    scroll(lines: number, name?: NpcName) {
        for (const [key, speech] of this.speech) {
            if ((name && key !== name) || !this.bubbles.get(key)?.visible) continue;
            const max = Math.max(0, this.lines(key).length - BUBBLE_LINES);
            speech.offset = Phaser.Math.Clamp(speech.offset + lines, 0, max);
            speech.follow = speech.offset >= max;
            this.render(key);
            this.scheduleHide(key);
        }
    }

    private lines(name: NpcName): string[] {
        const bubble = this.bubbles.get(name);
        const speech = this.speech.get(name);
        return bubble && speech ? bubble.getWrappedText(speech.text) : [];
    }

    private render(name: NpcName) {
        const bubble = this.bubbles.get(name);
        const speech = this.speech.get(name);
        if (!bubble || !speech) return;
        const lines = this.lines(name);
        const max = Math.max(0, lines.length - BUBBLE_LINES);
        if (speech.follow) speech.offset = max;
        speech.offset = Math.min(speech.offset, max);

        let body = lines.slice(speech.offset, speech.offset + BUBBLE_LINES).join('\n');
        if (max > 0) {
            // Arrows show which directions can still scroll; the line stays put so the bubble doesn't jump
            const up = speech.offset > 0 ? '▲' : ' ';
            const down = speech.offset < max ? '▼' : ' ';
            body += `\n${up} ${down}`;
        }
        bubble.setText(body);
        this.position(name);
    }

    private scheduleHide(name: NpcName) {
        this.host.stopThinking(name);
        this.clearHideTimer(name);
        if (!this.speech.get(name)?.done) return;
        this.hideTimers.set(name, this.scene.time.delayedCall(LINGER_MS, () => this.hide(name)));
    }

    private clearHideTimer(name: NpcName) {
        this.hideTimers.get(name)?.remove();
        this.hideTimers.delete(name);
    }

    private create() {
        return this.scene.add.text(0, 0, '', {
            fontSize: NPC_BUBBLE_FONT,
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 6, y: 4 },
            wordWrap: { width: NPC_BUBBLE_WIDTH },
            align: 'left'
        }).setOrigin(0.5, 1).setDepth(SPEECH_DEPTH).setVisible(false);
    }
}
