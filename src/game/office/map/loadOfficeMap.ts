import Phaser from 'phaser';
import { FEET_LIFT, MAP_DEPTH, MAP_TOP_DEPTH, SPRITE_SCALE } from '../constants';
import { CELL } from '../interaction/npc/WalkGrid';
import { clipAboveCut, findWalkBehindObjects, splitAtColumns, type Rect } from './walkBehind';

const MAP_KEY = 'officeMap';
const MAP_TILESET_KEY = 'officeTiles';
const MAP_BASE_URL = `${import.meta.env.BASE_URL}assets/map/office/`;
// Name of the tileset inside map.json (as exported from Sprite Fusion)
const MAP_TILESET_NAME = 'spritefusion';
// Layer whose extent limits where characters can walk
const FLOOR_LAYER = 'Floor';
// Tile layers drawn over the characters (everything else is under them)
const TOP_LAYERS: string[] = ['Room Boundary Bottom'];

// One drawn tile of a solid object (or of a layer over the characters), faded on its own when a character is under it.
// `baseY` is the object's base line; Infinity for a layer that is always drawn over the characters.
export type WalkBehindPiece = { bounds: Rect; baseY: number; image: Phaser.GameObjects.Image; alpha: number };

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
): { mapSize: { width: number; height: number }; walkBehind: WalkBehindPiece[] } {
    const map = scene.make.tilemap({ key: MAP_KEY });
    const tileset = map.addTilesetImage(MAP_TILESET_NAME, MAP_TILESET_KEY);
    if (!tileset) throw new Error(`Tileset "${MAP_TILESET_NAME}" not found in map.json`);
    const mapSize = { width: map.widthInPixels, height: map.heightInPixels };
    scene.physics.world.setBounds(0, 0, mapSize.width, mapSize.height);

    const pixels = readTilesetPixels(scene);
    const cache = new Map<number, Rect[]>();
    const colliders: Phaser.Tilemaps.TilemapLayer[] = [];
    // Every created layer in map order, for drawing solids over the characters that walk behind them
    const created: { layer: Phaser.Tilemaps.TilemapLayer; name: string; collider: boolean }[] = [];
    // Colliders that take part in solid objects (layers drawn over the characters do not)
    const objectLayers = new Set<Phaser.Tilemaps.TilemapLayer>();
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
        const collider = !!props?.some((p) => p.name === 'collider' && p.value === true);
        created.push({ layer, name: data.name, collider });
        if (!collider) continue;
        colliders.push(layer);
        if (!TOP_LAYERS.includes(data.name)) objectLayers.add(layer);
    }

    // Solid objects are vertical runs of touching 8 px cells (the walk grid's size) across all collider layers combined,
    // a cell being solid wherever a collider draws a pixel. The top strip of each (see openStripPx) is left open so
    // characters can walk into it; the rest blocks.
    const cellCols = Math.ceil(map.widthInPixels / CELL);
    const cellRows = Math.ceil(map.heightInPixels / CELL);
    const solid = Array.from({ length: cellRows }, () => new Array<boolean>(cellCols).fill(false));
    const boxesOf = (tile: Phaser.Tilemaps.Tile) =>
        tileOpaqueRects(tile, tileset, pixels, cache).map((b) => ({ ...b, x: tile.pixelX + b.x, y: tile.pixelY + b.y }));
    for (const layer of colliders) {
        if (!objectLayers.has(layer)) continue;
        layer.forEachTile((tile) => {
            if (tile.index < 0) return;
            for (const b of boxesOf(tile)) {
                for (let cy = Math.floor(b.y / CELL); cy <= Math.ceil((b.y + b.h) / CELL) - 1; cy++) {
                    for (let cx = Math.floor(b.x / CELL); cx <= Math.ceil((b.x + b.w) / CELL) - 1; cx++) solid[cy][cx] = true;
                }
            }
        });
    }
    // Where each cell's run is cut open (map y), by cell
    const cutOf = solid.map((row) => new Array<number>(row.length).fill(-1));
    const objects = findWalkBehindObjects(solid, CELL, CELL);
    // Which object each solid cell belongs to
    const objectAt = solid.map((row) => new Array<number>(row.length).fill(-1));
    objects.forEach((object, i) => {
        // An object that reaches the top of the map (the top wall and everything built onto it, and the side walls)
        // is not walked behind: it stays solid and drawn under the characters
        if (object.bounds.y === 0) return;
        for (let y = object.bounds.y; y < object.baseY; y += CELL) {
            cutOf[y / CELL][object.bounds.x / CELL] = object.bounds.y + object.openDepth;
            objectAt[y / CELL][object.bounds.x / CELL] = i;
        }
    });
    for (const layer of colliders) {
        layer.forEachTile((tile) => {
            if (tile.index < 0) return;
            for (const box of boxesOf(tile)) {
                // Each 8 px column of the box can belong to a different run, with its own cut
                for (const piece of objectLayers.has(layer) ? splitAtColumns(box, CELL) : [box]) {
                    const cutY = objectLayers.has(layer) ? cutOf[Math.floor(piece.y / CELL)][Math.floor(piece.x / CELL)] : -1;
                    const kept = cutY >= 0 ? clipAboveCut([piece], 0, cutY) : [piece];
                    for (const k of kept) obstacles.add(scene.add.zone(k.x + k.w / 2, k.y + k.h / 2, k.w, k.h));
                }
            }
        });
    }

    return { mapSize, walkBehind: drawObjects() };

    // The box around a tile's drawn pixels (map px): what a character must overlap to fade it, not the whole tile
    function drawnBounds(tile: Phaser.Tilemaps.Tile): Rect {
        const boxes = boxesOf(tile);
        if (boxes.length === 0) return { x: tile.pixelX, y: tile.pixelY, w: tile.width, h: tile.height };
        const x1 = Math.min(...boxes.map((b) => b.x));
        const y1 = Math.min(...boxes.map((b) => b.y));
        const x2 = Math.max(...boxes.map((b) => b.x + b.w));
        const y2 = Math.max(...boxes.map((b) => b.y + b.h));
        return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    // The solid tiles of each object, and the decor drawn over them (non-collider layers above the first solid layer,
    // e.g. wall posters), are hidden in their TilemapLayer and drawn as images at the object's depth. A tile that
    // covers cells of several objects joins the lowest one. Layer order is kept by a tiny depth step per layer.
    function drawObjects(): WalkBehindPiece[] {
        const pieces: WalkBehindPiece[] = [];
        const texture = scene.textures.get(MAP_TILESET_KEY);
        const frameOf = (index: number) => {
            const name = `tile-${index}`;
            if (!texture.has(name)) {
                const origin = tileset!.getTileTextureCoordinates(index) as { x: number; y: number };
                texture.add(name, 0, origin.x, origin.y, map.tileWidth, map.tileHeight);
            }
            return name;
        };
        const firstSolid = created.findIndex((c) => objectLayers.has(c.layer));
        created.forEach(({ layer, name, collider }, order) => {
            const eligible = objectLayers.has(layer) || (!collider && order > firstSolid && firstSolid >= 0 && !TOP_LAYERS.includes(name));
            if (!eligible) return;
            layer.forEachTile((tile) => {
                if (tile.index < 0) return;
                let best = -1;
                for (let cy = Math.floor(tile.pixelY / CELL); cy <= Math.ceil((tile.pixelY + tile.height) / CELL) - 1; cy++) {
                    for (let cx = Math.floor(tile.pixelX / CELL); cx <= Math.ceil((tile.pixelX + tile.width) / CELL) - 1; cx++) {
                        const i = objectAt[cy]?.[cx] ?? -1;
                        if (i >= 0 && (best < 0 || objects[i].baseY > objects[best].baseY)) best = i;
                    }
                }
                if (best < 0) return;
                const image = scene.add
                    .image(tile.pixelX + tile.width / 2, tile.pixelY + tile.height / 2, MAP_TILESET_KEY, frameOf(tile.index))
                    .setFlip(tile.flipX, tile.flipY)
                    .setRotation(tile.rotation)
                    .setDepth(objects[best].baseY + FEET_LIFT * SPRITE_SCALE + order * 0.001);
                tile.visible = false;
                pieces.push({ bounds: drawnBounds(tile), baseY: objects[best].baseY, image, alpha: 1 });
            });
        });
        // Layers drawn over the characters (the room's bottom edge) stay on top, but fade where someone is under them
        created.forEach(({ layer, name }, order) => {
            if (!TOP_LAYERS.includes(name)) return;
            layer.forEachTile((tile) => {
                if (tile.index < 0) return;
                const image = scene.add
                    .image(tile.pixelX + tile.width / 2, tile.pixelY + tile.height / 2, MAP_TILESET_KEY, frameOf(tile.index))
                    .setFlip(tile.flipX, tile.flipY)
                    .setRotation(tile.rotation)
                    .setDepth(MAP_TOP_DEPTH + order * 0.001);
                tile.visible = false;
                pieces.push({ bounds: drawnBounds(tile), baseY: Infinity, image, alpha: 1 });
            });
        });
        return pieces;
    }
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
