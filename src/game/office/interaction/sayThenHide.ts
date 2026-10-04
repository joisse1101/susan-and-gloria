// Says a line (a random one from a list, or a given text), then takes the bubble down after a delay. A newer line
// replaces the older one's hide, so a line is never hidden by an earlier line's timer. The scene supplies the means to
// say, hide and wait, so this is unit tested without Phaser.
export interface SayDeps {
    // Shows `text`; `onDone` fires once it is fully shown
    say(text: string, onDone?: () => void): void;
    hide(): void;
    // Runs `fn` after `ms`; the handle can be removed
    later(ms: number, fn: () => void): { remove(): void };
    pick(lines: string[]): string;
}

export class SayThenHide {
    private latest = 0;
    private timer?: { remove(): void };
    private deps: SayDeps;
    private hideAfterMs: number;

    constructor(deps: SayDeps, hideAfterMs: number) {
        this.deps = deps;
        this.hideAfterMs = hideAfterMs;
    }

    // `onShown` fires when the line is fully shown, whatever happens to the hide; `hideIf` can veto the hide
    say(line: string | string[], opts: { onShown?: () => void; hideIf?: () => boolean } = {}) {
        const id = ++this.latest;
        this.timer?.remove();
        this.timer = undefined;
        this.deps.say(Array.isArray(line) ? this.deps.pick(line) : line, () => {
            opts.onShown?.();
            if (id !== this.latest) return;
            this.timer = this.deps.later(this.hideAfterMs, () => {
                this.timer = undefined;
                if (id === this.latest && (opts.hideIf?.() ?? true)) this.deps.hide();
            });
        });
    }

    // Drops the pending hide (a newer bubble owns the space now)
    cancel() {
        this.latest++;
        this.timer?.remove();
        this.timer = undefined;
    }
}
