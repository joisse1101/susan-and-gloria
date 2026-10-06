/// <reference types="node" />
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cellsToDraw, type Layout, type LayerOrder, type Presets, type Selection, type Variants } from './cells';

// Writes the cell lists of some of Gloria's cells for pixel-art/layers/check_viewer_cells.py, which stacks exactly those
// cells from the sheet files and compares them with the build's own `composite()`.
const root = join(import.meta.dirname, '../../../public/assets/characters');
const json = <T>(name: string) => JSON.parse(readFileSync(join(root, name), 'utf8')) as T;

describe('viewer cells vs the build', () => {
    it('lists existing sheet files for every cell of Gloria', () => {
        const layout = json<Layout>('layout.json');
        const order = json<LayerOrder>('layer-order.json');
        const presets = json<Presets>('presets.json');
        json<Variants>('variants.json');
        const g = presets.characters.gloria;
        const sel: Selection = {
            expression: 'neutral',
            layers: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { variant: v, hidden: false }])),
        };
        const out: unknown[] = [];
        for (const a of layout.animations) {
            for (const facing of Object.keys(a.facings)) {
                for (let frame = 0; frame < a.frames; frame++) {
                    const cells = cellsToDraw(sel, layout, order, a.name, facing, frame);
                    for (const c of cells) expect(existsSync(join(root, c.path))).toBe(true);
                    out.push({ anim: a.name, facing, frame, cells });
                }
            }
        }
        const dir = process.env.VIEWER_CELLS_DIR;
        if (dir) {
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, 'cells.json'), JSON.stringify(out));
        }
        expect(out.length).toBe(layout.animations.reduce((n, a) => n + 4 * a.frames, 0));
    });
});
