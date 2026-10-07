// Pure core of the character viewer: which cells of which layer sheets to stack, in what order and at what alpha.
// Stacks layers the way the old charlib `composite()` did: one aligned sheet per layer variant, the cell at
// (frame, row of the animation + facing) in every layer.

export interface Layout {
    cell: number;
    width: number;
    height: number;
    animations: { name: string; frames: number; facings: Record<string, number> }[];
    mirrors: Record<string, string>;
    layers: Record<string, string>;      // layer type -> folder
}

export type LayerOrder = Record<string, string[]>;      // facing -> layer types, bottom to top

export interface Variants {
    layers: Record<string, string[]>;
}

export interface Presets {
    characters: Record<string, Record<string, string>>;
}

export interface LayerChoice {
    variant: string;
    hidden: boolean;
}

export interface Selection {
    layers: Record<string, LayerChoice>;
}

export interface CellDraw {
    layer: string;
    path: string;       // relative to the characters folder, e.g. `hair/gloria-bun.png`
    sx: number;
    sy: number;
    alpha: number;
}

/** Opacity of the other visible layers while one layer is highlighted. */
export const DIM_ALPHA = 0.25;

export function sheetPath(layout: Layout, sel: Selection, layer: string): string | null {
    const choice = sel.layers[layer];
    const folder = layout.layers[layer];
    if (!choice || !choice.variant || !folder) return null;
    return `${folder}/${choice.variant}.png`;
}

/** A selection that shows only `layer`, used for the layer-by-layer tiles (the layer is forced visible). */
export function soloSelection(sel: Selection, layer: string): Selection {
    const layers: Record<string, LayerChoice> = {};
    for (const [k, c] of Object.entries(sel.layers)) layers[k] = { ...c, hidden: k !== layer };
    return { ...sel, layers };
}

export function animationOf(layout: Layout, anim: string) {
    const a = layout.animations.find((x) => x.name === anim);
    if (!a) throw new Error(`layout.json has no animation "${anim}"`);
    return a;
}

/**
 * The cells to draw, bottom to top. A layer is left out when it is hidden, has no variant, or the facing's layer order
 * omits it. With `highlight` naming a layer that is drawn, every other cell gets `DIM_ALPHA`; a highlight on a layer
 * that is not drawn changes nothing.
 */
export function cellsToDraw(
    sel: Selection, layout: Layout, order: LayerOrder, anim: string, facing: string, frame: number, highlight: string | null = null,
): CellDraw[] {
    const a = animationOf(layout, anim);
    const row = a.facings[facing];
    if (row === undefined) throw new Error(`layout.json has no facing "${facing}" for ${anim}`);
    const layers = order[facing];
    if (!layers) throw new Error(`layer-order.json has no facing "${facing}"`);
    const col = ((frame % a.frames) + a.frames) % a.frames;
    const cells: CellDraw[] = [];
    for (const layer of layers) {
        const choice = sel.layers[layer];
        const path = sheetPath(layout, sel, layer);
        if (!choice || choice.hidden || !path) continue;
        cells.push({ layer, path, sx: col * layout.cell, sy: row * layout.cell, alpha: 1 });
    }
    if (highlight && cells.some((c) => c.layer === highlight)) {
        for (const c of cells) if (c.layer !== highlight) c.alpha = DIM_ALPHA;
    }
    return cells;
}
