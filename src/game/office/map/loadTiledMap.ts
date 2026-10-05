import Phaser from 'phaser';
import { FEET_LIFT, MAP_DEPTH, MAP_TOP_DEPTH, SPRITE_SCALE } from '../constants';
import { CELL } from '../interaction/npc/WalkGrid';
import { clipAboveCut, findWalkBehindObjects, splitAtColumns, type Rect } from './walkBehind';

// Name of the tileset inside map.json (as exported from Sprite Fusion)
const MAP_TILESET_NAME = 'spritefusion';

// Where a Sprite Fusion export lives: its Tiled map.json, and the spritesheet.png next to it
export interface MapFiles { mapKey: string; tilesetKey: string; baseUrl: string }

// Everything that differs between maps. The loader itself knows nothing about any particular map.
export interface MapSpec extends MapFiles {
    // Where the map's top-left corner goes in the world (px)
    offset: { x: number; y: number };
    // Tile layers drawn over the characters (everything else is under them)
    topLayers: string[];
    // When set, the physics world is limited to the extent of this layer's tiles (characters can't walk off the floor into
    // doorways or empty map edges). Leave it out for a map that must not change the world's bounds.
    limitsWorldToLayer?: string;
}

// One drawn tile of a solid object (or of a layer over the characters), faded on its own when a character is under it.
// `baseY` is the object's base line; Infinity for a layer that is always drawn over the characters.
export type WalkBehindPiece = { bounds: Rect; baseY: number; image: Phaser.GameObjects.Image; alpha: number };

type LoadedMap = {
    // The map's own size, and the rectangle it covers in the world
    size: { width: number; height: number };
    bounds: Rect;
    walkBehind: WalkBehindPiece[];
};

type Offset = { x: number; y: number };
const translate = (rect: Rect, offset: Offset): Rect => ({ ...rect, x: rect.x + offset.x, y: rect.y + offset.y });

export function preloadMapFiles(scene: Phaser.Scene, files: MapFiles) {
    scene.load.tilemapTiledJSON(files.mapKey, `${files.baseUrl}map.json`);
    scene.load.image(files.tilesetKey, `${files.baseUrl}spritesheet.png`);
}

// Builds every tile layer from map.json at `spec.offset`. Layers whose Tiled "collider" property is true block movement,
// but only where their tiles are opaque: each tile gets a body fitted to its non-transparent pixels.
// Everything is worked out in the map's own coordinates and moved by the offset where it is handed to the scene.
// `onLayer` is called for every layer so callers can collect tiles (e.g. work zones).
export function loadTiledMap(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    spec: MapSpec,
    onLayer: (layer: Phaser.Tilemaps.TilemapLayer, tileset: Phaser.Tilemaps.Tileset) => void = () => {}
): LoadedMap {
    const { offset, topLayers, tilesetKey } = spec;
    const map = scene.make.tilemap({ key: spec.mapKey });
    const tileset = map.addTilesetImage(MAP_TILESET_NAME, tilesetKey);
    if (!tileset) throw new Error(`Tileset "${MAP_TILESET_NAME}" not found in ${spec.mapKey}`);
    const size = { width: map.widthInPixels, height: map.heightInPixels };
    const bounds = translate({ x: 0, y: 0, w: size.width, h: size.height }, offset);
    if (spec.limitsWorldToLayer) scene.physics.world.setBounds(bounds.x, bounds.y, bounds.w, bounds.h);

    const pixels = readTilesetPixels(scene, tilesetKey);
    const cache = new Map<number, Rect[]>();
    const colliders: Phaser.Tilemaps.TilemapLayer[] = [];
    // Every created layer in map order, for drawing solids over the characters that walk behind them
    const created: { layer: Phaser.Tilemaps.TilemapLayer; name: string; collider: boolean }[] = [];
    // Colliders that take part in solid objects (layers drawn over the characters do not)
    const objectLayers = new Set<Phaser.Tilemaps.TilemapLayer>();
    for (const data of map.layers) {
        const layer = map.createLayer(data.name, tileset, offset.x, offset.y);
        if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) continue;
        if (data.name === spec.limitsWorldToLayer) {
            const floor = layer.getTilesWithin(0, 0, map.width, map.height, { isNotEmpty: true });
            if (floor.length > 0) {
                const x1 = Math.min(...floor.map((t) => t.pixelX));
                const y1 = Math.min(...floor.map((t) => t.pixelY));
                const x2 = Math.max(...floor.map((t) => t.pixelX + t.width));
                const y2 = Math.max(...floor.map((t) => t.pixelY + t.height));
                const world = translate({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, offset);
                scene.physics.world.setBounds(world.x, world.y, world.w, world.h);
            }
        }
        layer.setDepth(topLayers.includes(data.name) ? MAP_TOP_DEPTH : MAP_DEPTH);

        onLayer(layer, tileset);

        const props = data.properties as { name: string; value: unknown }[] | undefined;
        const collider = !!props?.some((p) => p.name === 'collider' && p.value === true);
        created.push({ layer, name: data.name, collider });
        if (!collider) continue;
        colliders.push(layer);
        if (!topLayers.includes(data.name)) objectLayers.add(layer);
    }

    for (const name of topLayers) {
        if (!map.layers.some((l) => l.name === name)) console.warn(`topLayers names "${name}", which is not a layer in ${spec.mapKey}`);
    }

    // Solid objects are vertical runs of touching 8 px cells (the walk grid's size) across all collider layers combined,
    // a cell being solid wherever a collider draws a pixel. The top strip of each (see openStripPx) is left open so
    // characters can walk into it; the rest blocks. All of this is in the map's own coordinates.
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
    // The map's topmost solid row: a map may leave empty rows above its top wall (the bathroom does)
    const topSolidY = Math.max(0, solid.findIndex((row) => row.some(Boolean))) * CELL;
    objects.forEach((object, i) => {
        // An object that reaches the top wall (the wall and everything built onto it, and the side walls)
        // is not walked behind: it stays solid and drawn under the characters
        if (object.bounds.y <= topSolidY) return;
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
                    for (const k of kept) {
                        const w = translate(k, offset);
                        obstacles.add(scene.add.zone(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h));
                    }
                }
            }
        });
    }

    return { size, bounds, walkBehind: drawObjects() };

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
        const texture = scene.textures.get(tilesetKey);
        const frameOf = (index: number) => {
            const name = `tile-${index}`;
            if (!texture.has(name)) {
                const origin = tileset!.getTileTextureCoordinates(index) as { x: number; y: number };
                texture.add(name, 0, origin.x, origin.y, map.tileWidth, map.tileHeight);
            }
            return name;
        };
        const imageOf = (tile: Phaser.Tilemaps.Tile, depth: number) =>
            scene.add
                .image(offset.x + tile.pixelX + tile.width / 2, offset.y + tile.pixelY + tile.height / 2, tilesetKey, frameOf(tile.index))
                .setFlip(tile.flipX, tile.flipY)
                .setRotation(tile.rotation)
                .setDepth(depth);
        const firstSolid = created.findIndex((c) => objectLayers.has(c.layer));
        created.forEach(({ layer, name, collider }, order) => {
            const eligible = objectLayers.has(layer) || (!collider && order > firstSolid && firstSolid >= 0 && !topLayers.includes(name));
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
                const baseY = offset.y + objects[best].baseY;
                const image = imageOf(tile, baseY + FEET_LIFT * SPRITE_SCALE + order * 0.001);
                tile.visible = false;
                pieces.push({ bounds: translate(drawnBounds(tile), offset), baseY, image, alpha: 1 });
            });
        });
        // Layers drawn over the characters (the room's bottom edge) stay on top, but fade where someone is under them
        created.forEach(({ layer, name }, order) => {
            if (!topLayers.includes(name)) return;
            layer.forEachTile((tile) => {
                if (tile.index < 0) return;
                const image = imageOf(tile, MAP_TOP_DEPTH + order * 0.001);
                tile.visible = false;
                pieces.push({ bounds: translate(drawnBounds(tile), offset), baseY: Infinity, image, alpha: 1 });
            });
        });
        return pieces;
    }
}

function readTilesetPixels(scene: Phaser.Scene, tilesetKey: string): ImageData {
    const image = scene.textures.get(tilesetKey).getSourceImage() as HTMLImageElement;
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
