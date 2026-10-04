import { describe, expect, it } from 'vitest';
import { InteractionRegistry, type Interaction, type Pose } from './registry';

// A scripted interaction: `starts` says whether an update takes the actor (and then it is active)
function fake(kind: string, opts: { starts?: boolean } = {}) {
    const active = new Set<string>();
    const log: string[] = [];
    const i: Interaction<string> = {
        update: (id) => {
            log.push(`update:${kind}`);
            if (!active.has(id) && opts.starts) active.add(id);
            return active.has(id);
        },
        cancel: (id) => { log.push(`cancel:${kind}`); active.delete(id); },
        isActive: (id) => active.has(id),
        isEngaged: (id) => active.has(id),
        pose: (id): Pose | undefined => (active.has(id) ? { kind, working: true } : undefined)
    };
    return { i, log, active };
}

describe('InteractionRegistry', () => {
    it('lets an actor in one interaction run only that one', () => {
        const work = fake('work', { starts: true });
        const water = fake('water', { starts: true });
        const reg = new InteractionRegistry<string>();
        reg.register(work.i);
        reg.register(water.i);
        reg.updateInteractions('susan');
        work.log.length = water.log.length = 0;
        reg.updateInteractions('susan');
        expect(work.log).toEqual(['update:work']);
        expect(water.log).toEqual([]);
        expect(water.active.has('susan')).toBe(false);
    });

    it('lets work win a same-frame tie', () => {
        const work = fake('work', { starts: true });
        const water = fake('water', { starts: true });
        const reg = new InteractionRegistry<string>();
        reg.register(work.i);
        reg.register(water.i);
        reg.updateInteractions('susan');
        expect(work.active.has('susan')).toBe(true);
        expect(water.log).toEqual([]);
        expect(reg.pose('susan')).toEqual({ kind: 'work', working: true });
    });

    it('offers water a turn when work does not start', () => {
        const work = fake('work');
        const water = fake('water', { starts: true });
        const reg = new InteractionRegistry<string>();
        reg.register(work.i);
        reg.register(water.i);
        expect(reg.updateInteractions('susan')).toBe(true);
        expect(reg.pose('susan')?.kind).toBe('water');
    });

    it('fans a cancel out to every interaction', () => {
        const work = fake('work', { starts: true });
        const water = fake('water');
        const reg = new InteractionRegistry<string>();
        reg.register(work.i);
        reg.register(water.i);
        reg.updateInteractions('susan');
        reg.cancelAll('susan');
        expect(work.log).toContain('cancel:work');
        expect(water.log).toContain('cancel:water');
        expect(reg.isEngaged('susan')).toBe(false);
        expect(reg.pose('susan')).toBeUndefined();
    });

    it('answers engaged and pose per actor', () => {
        const work = fake('work', { starts: true });
        const reg = new InteractionRegistry<string>();
        reg.register(work.i);
        reg.updateInteractions('susan');
        expect(reg.isEngaged('susan')).toBe(true);
        expect(reg.isEngaged('gloria')).toBe(false);
    });
});
