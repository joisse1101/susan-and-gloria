import { describe, expect, it } from 'vitest';
import { SayThenHide, type SayDeps } from './sayThenHide';

// A fake clock: `later` queues, `advance` runs what is due
function setup(delay = 1000) {
    let now = 0;
    const queue: { at: number; fn: () => void; removed: boolean }[] = [];
    const said: string[] = [];
    let hidden = 0;
    let finishLine: (() => void) | undefined;
    const deps: SayDeps = {
        say: (text, onDone) => { said.push(text); finishLine = onDone; },
        hide: () => { hidden++; },
        later: (ms, fn) => {
            const item = { at: now + ms, fn, removed: false };
            queue.push(item);
            return { remove: () => { item.removed = true; } };
        },
        pick: (lines) => lines[0]
    };
    const advance = (ms: number) => {
        now += ms;
        for (const q of queue) if (!q.removed && q.at <= now) { q.removed = true; q.fn(); }
    };
    return { sayer: new SayThenHide(deps, delay), said, hidden: () => hidden, advance, finish: () => finishLine?.() };
}

describe('SayThenHide', () => {
    it('says one line from the list and hides it after the delay', () => {
        const t = setup();
        t.sayer.say(['a', 'b']);
        expect(t.said).toEqual(['a']);
        t.finish();
        t.advance(999);
        expect(t.hidden()).toBe(0);
        t.advance(1);
        expect(t.hidden()).toBe(1);
    });

    it('does not hide a newer line', () => {
        const t = setup();
        t.sayer.say('first');
        t.finish();
        t.sayer.say('second'); // before the first line's hide is due
        t.advance(1500);
        expect(t.hidden()).toBe(0); // second is still being typed
        t.finish();
        t.advance(1000);
        expect(t.hidden()).toBe(1);
    });

    it('lets hideIf veto the hide', () => {
        const t = setup();
        t.sayer.say('x', { hideIf: () => false });
        t.finish();
        t.advance(1000);
        expect(t.hidden()).toBe(0);
    });

    it('drops the hide when cancelled', () => {
        const t = setup();
        t.sayer.say('x');
        t.finish();
        t.sayer.cancel();
        t.advance(2000);
        expect(t.hidden()).toBe(0);
    });
});
