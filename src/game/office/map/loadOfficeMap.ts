import Phaser from 'phaser';
import { MAP_DEPTH, MAP_TOP_DEPTH } from '../constants';

const MAP_KEY = 'officeMap';
const MAP_TILESET_KEY = 'officeTiles';
const MAP_BASE_URL = `${import.meta.env.BASE_URL}assets/map/office/`;
// Name of the tileset inside map.json (as exported from Sprite Fusion)
const MAP_TILESET_NAME = 'spritefusion';
// Layer whose extent limits where characters can walk
const FLOOR_LAYER = 'Floor';
// Tile layers drawn over the characters (everything else is under them)
const TOP_LAYERS: string[] = ['Room Boundary Bottom'];

type Rect = { x: number; y: number; w: number; h: number };

export function preloadOfficeMap(scene: Phaser.Scene) {
    scene.load.tilemapTiledJSON(MAP_KEY, `${MAP_BASE_URL}map.json`);
    scene.load.image(MAP_TILESET_KEY, `${MAP_BASE_URL}spritesheet.png`);
}

// Builds every tile layer from map.json. Layers whose Tiled "collider" property is true block movement,
// but only where their tiles are opaque: each tile gets a body fitted to its non-transparent pixels.
// `onLayer` is called for every layer so callers can collect tiles (e.g. work zones).
export function loadOfficeMap(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    onLayer: (layer: Phaser.Tilemaps.TilemapLayer, tileset: Phaser.Tilemaps.Tileset) => void
) {
    const map = scene.make.tilemap({ key: MAP_KEY });
    const tileset = map.addTilesetImage(MAP_TILESET_NAME, MAP_TILESET_KEY);
    if (!tileset) throw new Error(`Tileset "${MAP_TILESET_NAME}" not found in map.json`);
    const mapSize = { width: map.widthInPixels, height: map.heightInPixels };
    scene.physics.world.setBounds(0, 0, mapSize.width, mapSize.height);

    const pixels = readTilesetPixels(scene);
    const cache = new Map<number, Rect[]>();
    for (const data of map.layers) {
        const layer = map.createLayer(data.name, tileset, 0, 0);
        if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) continue;
        // Characters can't leave the floor (doorways and empty map edges would otherwise let them walk into the void)
        if (data.name === FLOOR_LAYER) {
            const floor = layer.getTilesWithin(0, 0, map.width, map.height, { isNotEmpty: true });
            if (floor.length > 0) {
                const x1 = Math.min(...floor.map((t) => t.pixelX));
                const y1 = Math.min(...floor.map((t) => t.pixelY));
                const x2 = Math.max(...floor.map((t) => t.pixelX + t.width));
                const y2 = Math.max(...floor.map((t) => t.pixelY + t.height));
                scene.physics.world.setBounds(x1, y1, x2 - x1, y2 - y1);
            }
        }
        layer.setDepth(TOP_LAYERS.includes(data.name) ? MAP_TOP_DEPTH : MAP_DEPTH);

        onLayer(layer, tileset);

        const props = data.properties as { name: string; value: unknown }[] | undefined;
        if (!props?.some((p) => p.name === 'collider' && p.value === true)) continue;
        layer.forEachTile((tile) => {
            if (tile.index < 0) return;
            for (const box of tileOpaqueRects(tile, tileset, pixels, cache)) {
                const zone = scene.add.zone(tile.pixelX + box.x + box.w / 2, tile.pixelY + box.y + box.h / 2, box.w, box.h);
                obstacles.add(zone);
            }
        });
    }
    return mapSize;
}

function readTilesetPixels(scene: Phaser.Scene): ImageData {
    const image = scene.textures.get(MAP_TILESET_KEY).getSourceImage() as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
}

// Rectangles (tile-local px) covering a tile's non-transparent pixels. Several rects rather than one bounding box,
// so L-shaped pieces (wall corners) don't block the empty area inside the bend.
function tileOpaqueRects(tile: Phaser.Tilemaps.Tile, tileset: Phaser.Tilemaps.Tileset, pixels: ImageData, cache: Map<number, Rect[]>) {
    let rects = cache.get(tile.index);
    if (rects === undefined) {
        rects = [];
        const origin = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
        if (origin) {
            const opaque = (x: number, y: number) => pixels.data[((origin.y + y) * pixels.width + origin.x + x) * 4 + 3] > 16;
            // Horizontal runs per row, merged downwards while the run is identical
            let open: Rect[] = [];
            for (let y = 0; y <= tile.height; y++) {
                const runs: { x: number; w: number }[] = [];
                for (let x = 0; y < tile.height && x < tile.width; x++) {
                    if (!opaque(x, y)) continue;
                    const start = x;
                    while (x + 1 < tile.width && opaque(x + 1, y)) x++;
                    runs.push({ x: start, w: x - start + 1 });
                }
                const next: Rect[] = [];
                for (const r of open) {
                    const i = runs.findIndex((run) => run.x === r.x && run.w === r.w);
                    if (i >= 0) { r.h++; next.push(r); runs.splice(i, 1); }
                    else rects.push(r);
                }
                for (const run of runs) next.push({ x: run.x, y, w: run.w, h: 1 });
                open = next;
            }
        }
        cache.set(tile.index, rects);
    }
    // Mirror for flipped tiles
    return rects.map((box) => ({
        x: tile.flipX ? tile.width - box.x - box.w : box.x,
        y: tile.flipY ? tile.height - box.y - box.h : box.y,
        w: box.w,
        h: box.h
    }));
}
