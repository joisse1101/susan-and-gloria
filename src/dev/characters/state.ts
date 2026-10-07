import { animationOf, type LayerOrder, type Layout, type Presets, type Selection, type Variants } from './cells';

export interface ViewerData {
    layout: Layout;
    order: LayerOrder;
    presets: Presets;
    variants: Variants;
}

export type Background = 'checker' | 'green';
export type Toggle = 'shadow' | 'cellOverlay' | 'orderList';

export interface ViewerState {
    preset: string | null;          // null once any layer was changed by hand
    sel: Selection;
    anim: string;
    facing: string;
    playing: boolean;
    frame: number;                  // the main preview's frame while paused
    fps: number;
    row: number;                    // the layer row the keyboard acts on
    kbRow: boolean;                 // the row was chosen by keyboard, so it is highlighted like a hover
    hover: string | null;           // layer whose title or tile the pointer is over
    background: Background;
    shadow: boolean;
    cellOverlay: boolean;
    orderList: boolean;
}

export type Action =
    | { type: 'preset'; name: string }
    | { type: 'cycle'; layer: string; dir: 1 | -1 }
    | { type: 'hide'; layer: string }
    | { type: 'anim'; name: string }
    | { type: 'facing'; name: string }
    | { type: 'facingStep'; dir: 1 | -1 }
    | { type: 'play'; frame: number }
    | { type: 'step'; dir: 1 | -1; frame: number }
    | { type: 'speed'; fps: number }
    | { type: 'speedStep'; dir: 1 | -1 }
    | { type: 'rowStep'; dir: 1 | -1 }
    | { type: 'rowSelect'; index: number }
    | { type: 'clearKeyboardRow' }
    | { type: 'hover'; layer: string | null }
    | { type: 'background'; value: Background }
    | { type: 'toggle'; what: Toggle };

export const FPS_CHOICES = [2, 4, 6, 8, 12];

export const layerNames = (layout: Layout) => Object.keys(layout.layers);

const wrap = (i: number, n: number) => ((i % n) + n) % n;

function selectionFor(data: ViewerData, name: string): Selection {
    const preset = data.presets.characters[name] ?? {};
    const layers: Selection['layers'] = {};
    for (const layer of layerNames(data.layout)) layers[layer] = { variant: preset[layer] ?? '', hidden: false };
    return { layers };
}

export function initialState(data: ViewerData): ViewerState {
    const preset = Object.keys(data.presets.characters)[0] ?? null;
    const anim = data.layout.animations[0].name;
    return {
        preset,
        sel: preset ? selectionFor(data, preset) : selectionFor(data, ''),
        anim,
        facing: Object.keys(data.layout.animations[0].facings)[0],
        playing: true, frame: 0, fps: 6, row: 0, kbRow: false, hover: null,
        background: 'checker', shadow: false, cellOverlay: false, orderList: false,
    };
}

/** The layer the previews highlight: the hovered one, else the keyboard row's. */
export function highlightOf(s: ViewerState, layers: string[]): string | null {
    return s.hover ?? (s.kbRow ? (layers[s.row] ?? null) : null);
}

function withLayer(s: ViewerState, layer: string, change: Partial<Selection['layers'][string]>): ViewerState {
    return {
        ...s, preset: null,
        sel: { ...s.sel, layers: { ...s.sel.layers, [layer]: { ...s.sel.layers[layer], ...change } } },
    };
}

export function reduce(data: ViewerData, s: ViewerState, a: Action): ViewerState {
    const layers = layerNames(data.layout);
    const frames = (anim: string) => animationOf(data.layout, anim).frames;
    switch (a.type) {
        case 'preset':
            return { ...s, preset: a.name, sel: selectionFor(data, a.name) };
        case 'cycle': {
            const list = data.variants.layers[a.layer] ?? [];
            if (!list.length) return s;
            const at = list.indexOf(s.sel.layers[a.layer].variant);
            const variant = list[at < 0 ? (a.dir > 0 ? 0 : list.length - 1) : wrap(at + a.dir, list.length)];
            return withLayer(s, a.layer, { variant });
        }
        case 'hide':
            return withLayer(s, a.layer, { hidden: !s.sel.layers[a.layer].hidden });
        case 'anim': {
            const facings = Object.keys(animationOf(data.layout, a.name).facings);
            return { ...s, anim: a.name, facing: facings.includes(s.facing) ? s.facing : facings[0], frame: s.frame % frames(a.name) };
        }
        case 'facing':
            return { ...s, facing: a.name };
        case 'facingStep': {
            const facings = Object.keys(animationOf(data.layout, s.anim).facings);
            return { ...s, facing: facings[wrap(facings.indexOf(s.facing) + a.dir, facings.length)] };
        }
        case 'play': {
            const n = frames(s.anim);
            return s.playing ? { ...s, playing: false, frame: wrap(a.frame, n) } : { ...s, playing: true };
        }
        case 'step': {
            const n = frames(s.anim);
            return { ...s, playing: false, frame: wrap((s.playing ? a.frame : s.frame) + a.dir, n) };
        }
        case 'speed':
            return { ...s, fps: a.fps };
        case 'speedStep': {
            const at = FPS_CHOICES.indexOf(s.fps);
            const next = FPS_CHOICES[Math.min(FPS_CHOICES.length - 1, Math.max(0, (at < 0 ? 0 : at) + a.dir))];
            return { ...s, fps: next };
        }
        case 'rowStep':
            return { ...s, row: wrap(s.row + a.dir, layers.length), kbRow: true };
        case 'rowSelect':
            return { ...s, row: a.index, kbRow: false };
        case 'clearKeyboardRow':
            return s.kbRow ? { ...s, kbRow: false } : s;
        case 'hover':
            return s.hover === a.layer ? s : { ...s, hover: a.layer };
        case 'background':
            return { ...s, background: a.value };
        case 'toggle':
            return { ...s, [a.what]: !s[a.what] };
    }
}

export interface KeyInfo { key: string; target: { tagName?: string; isContentEditable?: boolean } | null }

/** Keys are for the page, not for a field being typed in (or a select / slider that uses them itself). */
export function keysIgnored(target: KeyInfo['target']): boolean {
    const tag = target?.tagName?.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable;
}

/** The action a key stands for, or null. `layers` and `anims` come from the layout; `frame` is the main preview's. */
export function actionForKey(key: string, layers: string[], anims: string[], state: ViewerState, frame: number): Action | null {
    switch (key) {
        case 'ArrowUp': return { type: 'rowStep', dir: -1 };
        case 'ArrowDown': return { type: 'rowStep', dir: 1 };
        case 'ArrowLeft': return { type: 'cycle', layer: layers[state.row], dir: -1 };
        case 'ArrowRight': return { type: 'cycle', layer: layers[state.row], dir: 1 };
        case 'h': return { type: 'hide', layer: layers[state.row] };
        case '[': return { type: 'facingStep', dir: -1 };
        case ']': return { type: 'facingStep', dir: 1 };
        case ' ': return { type: 'play', frame };
        case ',': return { type: 'step', dir: -1, frame };
        case '.': return { type: 'step', dir: 1, frame };
        case '-': return { type: 'speedStep', dir: -1 };
        case '+':
        case '=': return { type: 'speedStep', dir: 1 };
        case 'g': return { type: 'toggle', what: 'cellOverlay' };
        case 'o': return { type: 'toggle', what: 'orderList' };
        case 's': return { type: 'toggle', what: 'shadow' };
        case 'b': return { type: 'background', value: state.background === 'checker' ? 'green' : 'checker' };
        case 'Escape': return { type: 'clearKeyboardRow' };
    }
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1 && anims[n - 1]) return { type: 'anim', name: anims[n - 1] };
    return null;
}
