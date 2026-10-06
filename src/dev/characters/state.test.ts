import { describe, expect, it } from 'vitest';
import { actionForKey, highlightOf, initialState, keysIgnored, layerNames, reduce, type Action, type ViewerData } from './state';

const data: ViewerData = {
    layout: {
        cell: 32, width: 128, height: 256,
        animations: [
            { name: 'idle', frames: 2, facings: { down: 0, up: 1, right: 2, left: 3 } },
            { name: 'walk', frames: 4, facings: { down: 4, up: 5, right: 6, left: 7 } },
        ],
        mirrors: { left: 'right' },
        layers: { body: 'bodies', top: 'top', hair: 'hair', face: 'face' },
    },
    order: {},
    presets: {
        characters: { gloria: { body: 'light', top: 'cardigan', hair: 'bun', face: 'gloria' } },
        expressions: { gloria: ['neutral'] },
    },
    variants: {
        layers: { body: ['light'], top: ['cardigan', 'hoodie', 'shirt'], hair: ['bun'], face: ['gloria', 'sam'] },
        expressions: { gloria: ['neutral', 'blink'], sam: ['blink', 'neutral'] },
    },
};
const run = (s = initialState(data), ...actions: Action[]) => actions.reduce((acc, a) => reduce(data, acc, a), s);

describe('layers', () => {
    it('starts on the first preset with every layer set', () => {
        const s = initialState(data);
        expect(s.preset).toBe('gloria');
        expect(s.sel.layers.top.variant).toBe('cardigan');
        expect(s.sel.expression).toBe('neutral');
    });

    it('cycling a layer changes only that layer', () => {
        const before = initialState(data);
        const s = run(before, { type: 'cycle', layer: 'top', dir: 1 });
        expect(s.sel.layers.top.variant).toBe('hoodie');
        expect(s.sel.layers.hair).toEqual(before.sel.layers.hair);
        expect(s.sel.layers.body).toEqual(before.sel.layers.body);
        expect(s.preset).toBeNull();
    });

    it('wraps past the last and first variant', () => {
        let s = run(initialState(data), { type: 'cycle', layer: 'top', dir: 1 }, { type: 'cycle', layer: 'top', dir: 1 });
        expect(s.sel.layers.top.variant).toBe('shirt');
        s = run(s, { type: 'cycle', layer: 'top', dir: 1 });
        expect(s.sel.layers.top.variant).toBe('cardigan');
        s = run(s, { type: 'cycle', layer: 'top', dir: -1 });
        expect(s.sel.layers.top.variant).toBe('shirt');
    });

    it('hides and shows a layer without touching the rest', () => {
        const s = run(initialState(data), { type: 'hide', layer: 'hair' });
        expect(s.sel.layers.hair.hidden).toBe(true);
        expect(s.sel.layers.top.hidden).toBe(false);
        expect(run(s, { type: 'hide', layer: 'hair' }).sel.layers.hair.hidden).toBe(false);
    });

    it('keeps a valid expression when the face variant changes', () => {
        const s = run(initialState(data), { type: 'expression', dir: 1 }, { type: 'cycle', layer: 'face', dir: 1 });
        expect(s.sel.layers.face.variant).toBe('sam');
        expect(s.sel.expression).toBe('blink');
    });

    it('loading a preset resets hidden flags and variants', () => {
        const s = run(initialState(data), { type: 'hide', layer: 'top' }, { type: 'cycle', layer: 'top', dir: 1 }, { type: 'preset', name: 'gloria' });
        expect(s.sel.layers.top).toEqual({ variant: 'cardigan', hidden: false });
        expect(s.preset).toBe('gloria');
    });
});

describe('animation', () => {
    it('keeps the facing across animations and the frame in range', () => {
        const s = run(initialState(data), { type: 'facing', name: 'right' }, { type: 'anim', name: 'walk' });
        expect(s.facing).toBe('right');
    });

    it('steps one frame, pauses, and wraps after the last frame', () => {
        let s = run(initialState(data), { type: 'anim', name: 'walk' }, { type: 'step', dir: 1, frame: 3 });
        expect(s.playing).toBe(false);
        expect(s.frame).toBe(0);
        s = run(s, { type: 'step', dir: -1, frame: 0 });
        expect(s.frame).toBe(3);
    });

    it('pauses on the frame that was showing', () => {
        const s = run(initialState(data), { type: 'anim', name: 'walk' }, { type: 'play', frame: 2 });
        expect(s.playing).toBe(false);
        expect(s.frame).toBe(2);
        expect(run(s, { type: 'play', frame: 2 }).playing).toBe(true);
    });

    it('steps through facings with wrap', () => {
        const s = run(initialState(data), { type: 'facingStep', dir: -1 });
        expect(s.facing).toBe('left');
    });
});

describe('highlight', () => {
    const layers = layerNames(data.layout);

    it('prefers the hovered layer, then the keyboard row, and nothing otherwise', () => {
        let s = initialState(data);
        expect(highlightOf(s, layers)).toBeNull();
        s = run(s, { type: 'rowStep', dir: 1 });
        expect(highlightOf(s, layers)).toBe('top');
        s = run(s, { type: 'hover', layer: 'hair' });
        expect(highlightOf(s, layers)).toBe('hair');
        s = run(s, { type: 'hover', layer: null }, { type: 'clearKeyboardRow' });
        expect(highlightOf(s, layers)).toBeNull();
    });

    it('never changes the selection, animation or facing', () => {
        const before = initialState(data);
        const after = run(before, { type: 'hover', layer: 'top' }, { type: 'hover', layer: null });
        expect(after.sel).toBe(before.sel);
        expect([after.anim, after.facing, after.preset]).toEqual([before.anim, before.facing, before.preset]);
    });
});

describe('keys', () => {
    const layers = layerNames(data.layout);
    const anims = ['idle', 'walk'];
    const s = initialState(data);

    it('maps the documented keys', () => {
        expect(actionForKey('ArrowRight', layers, anims, s, 0)).toEqual({ type: 'cycle', layer: 'body', dir: 1 });
        expect(actionForKey('2', layers, anims, s, 0)).toEqual({ type: 'anim', name: 'walk' });
        expect(actionForKey('4', layers, anims, s, 0)).toBeNull();
        expect(actionForKey(' ', layers, anims, s, 1)).toEqual({ type: 'play', frame: 1 });
        expect(actionForKey('g', layers, anims, s, 0)).toEqual({ type: 'toggle', what: 'cellOverlay' });
        expect(actionForKey('q', layers, anims, s, 0)).toBeNull();
    });

    it('changes speed with - and +, stopping at the ends', () => {
        expect(actionForKey('+', layers, anims, s, 0)).toEqual({ type: 'speedStep', dir: 1 });
        expect(actionForKey('-', layers, anims, s, 0)).toEqual({ type: 'speedStep', dir: -1 });
        expect(run(s, { type: 'speedStep', dir: 1 }).fps).toBe(8);
        expect(run(s, { type: 'speedStep', dir: -1 }).fps).toBe(4);
        const slow = run(s, ...Array<Action>(10).fill({ type: 'speedStep', dir: -1 }));
        expect(slow.fps).toBe(2);
        expect(run(slow, ...Array<Action>(10).fill({ type: 'speedStep', dir: 1 })).fps).toBe(12);
    });

    it('ignores keys while typing in a field', () => {
        expect(keysIgnored({ tagName: 'INPUT' })).toBe(true);
        expect(keysIgnored({ tagName: 'textarea' })).toBe(true);
        expect(keysIgnored({ tagName: 'SELECT' })).toBe(true);
        expect(keysIgnored({ tagName: 'DIV', isContentEditable: true })).toBe(true);
        expect(keysIgnored({ tagName: 'BUTTON' })).toBe(false);
        expect(keysIgnored(null)).toBe(false);
    });
});
