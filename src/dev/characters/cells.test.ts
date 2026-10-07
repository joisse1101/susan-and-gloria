import { describe, expect, it } from 'vitest';
import { cellsToDraw, DIM_ALPHA, soloSelection, type Layout, type LayerOrder, type Selection } from './cells';

const LAYERS = ['body', 'bottom', 'top', 'hair', 'face', 'accessories'];
const FACINGS = ['down', 'up', 'right', 'left'];
const layout: Layout = {
    cell: 32, width: 128, height: 256,
    animations: [
        { name: 'idle', frames: 2, facings: { down: 0, up: 1, right: 2, left: 3 } },
        { name: 'walk', frames: 4, facings: { down: 4, up: 5, right: 6, left: 7 } },
    ],
    mirrors: { left: 'right' },
    layers: { body: 'bodies', bottom: 'bottom', top: 'top', hair: 'hair', face: 'face', accessories: 'accessories' },
};
const order: LayerOrder = Object.fromEntries(FACINGS.map((f) => [f, LAYERS.filter((l) => !(l === 'face' && f === 'up'))]));
const sel = (): Selection => ({
    layers: Object.fromEntries(LAYERS.map((l) => [l, { variant: `${l}-v`, hidden: false }])),
});

describe('cellsToDraw', () => {
    it('stacks every layer in order at the row and column of the cell', () => {
        const cells = cellsToDraw(sel(), layout, order, 'walk', 'right', 3);
        expect(cells.map((c) => c.layer)).toEqual(LAYERS);
        expect(cells.every((c) => c.sx === 96 && c.sy === 6 * 32 && c.alpha === 1)).toBe(true);
    });

    it('names each sheet by its folder and variant', () => {
        const cells = cellsToDraw(sel(), layout, order, 'idle', 'down', 0);
        expect(cells.find((c) => c.layer === 'face')!.path).toBe('face/face-v.png');
        expect(cells.find((c) => c.layer === 'hair')!.path).toBe('hair/hair-v.png');
        expect(cells.find((c) => c.layer === 'body')!.path).toBe('bodies/body-v.png');
    });

    it('leaves out a hidden layer and keeps the others', () => {
        const s = sel();
        s.layers.top.hidden = true;
        expect(cellsToDraw(s, layout, order, 'idle', 'down', 0).map((c) => c.layer)).toEqual(LAYERS.filter((l) => l !== 'top'));
    });

    it('leaves out a layer with no variant', () => {
        const s = sel();
        s.layers.accessories.variant = '';
        expect(cellsToDraw(s, layout, order, 'idle', 'down', 0).map((c) => c.layer)).not.toContain('accessories');
    });

    it('has no face in the up view', () => {
        expect(cellsToDraw(sel(), layout, order, 'idle', 'up', 0).map((c) => c.layer)).not.toContain('face');
    });

    it('takes a mirrored facing from its own row', () => {
        const [cell] = cellsToDraw(sel(), layout, order, 'walk', 'left', 1);
        expect(cell.sy).toBe(7 * 32);
        expect(cell.sx).toBe(32);
    });

    it('wraps the frame', () => {
        expect(cellsToDraw(sel(), layout, order, 'idle', 'down', 2)[0].sx).toBe(0);
        expect(cellsToDraw(sel(), layout, order, 'idle', 'down', -1)[0].sx).toBe(32);
    });

    it('reports an unknown animation or facing', () => {
        expect(() => cellsToDraw(sel(), layout, order, 'dance', 'down', 0)).toThrow(/dance/);
        expect(() => cellsToDraw(sel(), layout, order, 'idle', 'sideways', 0)).toThrow(/sideways/);
    });
});

describe('highlight', () => {
    it('keeps the highlighted layer at full alpha and dims the other visible layers', () => {
        const cells = cellsToDraw(sel(), layout, order, 'idle', 'down', 0, 'hair');
        for (const c of cells) expect(c.alpha).toBe(c.layer === 'hair' ? 1 : DIM_ALPHA);
    });

    it('draws everything at full alpha with no highlight', () => {
        expect(cellsToDraw(sel(), layout, order, 'idle', 'down', 0, null).every((c) => c.alpha === 1)).toBe(true);
    });

    it('does nothing for a hidden layer, and the hidden layer stays absent', () => {
        const s = sel();
        s.layers.hair.hidden = true;
        const cells = cellsToDraw(s, layout, order, 'idle', 'down', 0, 'hair');
        expect(cells.map((c) => c.layer)).not.toContain('hair');
        expect(cells.every((c) => c.alpha === 1)).toBe(true);
    });

    it('does nothing for a layer the facing does not draw', () => {
        expect(cellsToDraw(sel(), layout, order, 'idle', 'up', 0, 'face').every((c) => c.alpha === 1)).toBe(true);
    });
});

describe('soloSelection', () => {
    it('shows only the chosen layer, even when it was hidden, and changes nothing else', () => {
        const s = sel();
        s.layers.hair.hidden = true;
        const solo = soloSelection(s, 'hair');
        expect(cellsToDraw(solo, layout, order, 'idle', 'down', 0).map((c) => c.layer)).toEqual(['hair']);
        expect(s.layers.hair.hidden).toBe(true);
        expect(s.layers.top.hidden).toBe(false);
    });
});
