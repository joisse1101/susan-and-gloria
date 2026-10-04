import type Phaser from 'phaser';

// A rectangle, in tile units (or px, where a name says so): x0,y0 is the top-left, x1,y1 the bottom-right
export interface Rect { x0: number; y0: number; x1: number; y1: number }

export function rectToPx(r: Rect, tileSize: number): Rect {
    return { x0: r.x0 * tileSize, y0: r.y0 * tileSize, x1: r.x1 * tileSize, y1: r.y1 * tileSize };
}

// The rectangle a tile covers, in tile units
export function tileRect(tx: number, ty: number): Rect {
    return { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 };
}

// True when the point (px) is inside the rectangle (tile units) given the tile size, edges included
export function containsPx(r: Rect, tileSize: number, x: number, y: number) {
    const tx = x / tileSize;
    const ty = y / tileSize;
    return tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
}

// Phaser exposes tile properties as {name: value}, but accept Tiled's [{name, value}] list too
export function tileProperty(tileset: Pick<Phaser.Tilemaps.Tileset, 'firstgid' | 'tileProperties'>, index: number, key: string): unknown {
    const props = (tileset.tileProperties as Record<number, unknown> | undefined)?.[index - tileset.firstgid];
    if (Array.isArray(props)) return (props as { name: string; value: unknown }[]).find((p) => p.name === key)?.value;
    return (props as Record<string, unknown> | undefined)?.[key];
}

export interface InteractionTile {
    tx: number;
    ty: number;
    tileSize: number;
    // Another property of the same tile, e.g. its "direction"
    property(key: string): unknown;
}

type Layer = Pick<Phaser.Tilemaps.TilemapLayer, 'forEachTile'>;
type Tileset = Pick<Phaser.Tilemaps.Tileset, 'firstgid' | 'tileProperties'>;

// The layer's tiles whose Tiled tile property `interaction` equals `kind` ("work", "water")
export function scanInteractionTiles(layer: Layer, tileset: Tileset, kind: string): InteractionTile[] {
    const found: InteractionTile[] = [];
    layer.forEachTile((tile) => {
        if (tile.index < 0 || tileProperty(tileset, tile.index, 'interaction') !== kind) return;
        found.push({ tx: tile.x, ty: tile.y, tileSize: tile.width, property: (key) => tileProperty(tileset, tile.index, key) });
    });
    return found;
}
