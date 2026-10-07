import type { Facing } from './playerSprite';

// Layer names are data (layout.json `layers`, layer-order.json), not a fixed list, so a new layer type needs no code
export type LayerName = string;
export type LayerOrder = Record<Facing, LayerName[]>;

// Depth gap between neighbouring layers. Far below the 0.5 to the shadow and the 1 to the chair back and armrests
// (Shadows, SeatLayers), so the whole stack sorts as one character.
export const LAYER_DEPTH_STEP = 0.01;

// The layers drawn for a facing, bottom to top. The first one is the base (it owns the physics body), so every
// facing must start with the same layer.
export function layersFor(order: LayerOrder, facing: Facing): LayerName[] {
    return order[facing] ?? [];
}

// Depth of a layer within the stack: the base keeps `baseDepth`, each layer above it is one step higher.
// A layer not drawn for this facing (the face in the up view) has no depth.
export function layerDepth(order: LayerOrder, facing: Facing, layer: LayerName, baseDepth: number): number | undefined {
    const index = layersFor(order, facing).indexOf(layer);
    return index < 0 ? undefined : baseDepth + index * LAYER_DEPTH_STEP;
}

// Every layer that appears for any facing, in first-seen order (the sprites a rig has to create)
export function allLayers(order: LayerOrder): LayerName[] {
    const seen = new Set<LayerName>();
    for (const layers of Object.values(order)) for (const layer of layers) seen.add(layer);
    return [...seen];
}

// Read layer-order.json; throws when a facing is missing or the facings disagree on the base layer
export function parseLayerOrder(raw: unknown): LayerOrder {
    const facings: Facing[] = ['down', 'up', 'right', 'left'];
    const data = (raw ?? {}) as Record<string, unknown>;
    const order = {} as LayerOrder;
    for (const facing of facings) {
        const layers = data[facing];
        if (!Array.isArray(layers) || layers.length === 0 || !layers.every((l) => typeof l === 'string')) {
            throw new Error(`layer-order.json: facing "${facing}" must be a non-empty list of layer names`);
        }
        order[facing] = layers as LayerName[];
    }
    const base = order.down[0];
    for (const facing of facings) {
        if (order[facing][0] !== base) throw new Error(`layer-order.json: "${facing}" starts with "${order[facing][0]}", expected the base "${base}"`);
    }
    return order;
}
