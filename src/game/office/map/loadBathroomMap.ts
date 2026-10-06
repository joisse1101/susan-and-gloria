import Phaser from 'phaser';
import { joinCells, leftmostJoin, placeBeside, rightmostJoin, type TiledMapData } from './joins';
import { loadTiledMap, preloadMapFiles, type MapFiles, type MapSpec, type WalkBehindPiece } from './loadTiledMap';
import { OFFICE_MAP_KEY } from './loadOfficeMap';
import type { Rect } from './walkBehind';

const BATHROOM_FILES: MapFiles = { mapKey: 'bathroomMap', tilesetKey: 'bathroomTiles', baseUrl: `${import.meta.env.BASE_URL}assets/map/bathroom/` };

export function preloadBathroomMap(scene: Phaser.Scene) {
    preloadMapFiles(scene, BATHROOM_FILES);
}

// Builds the bathroom to the left of the office, side by side: its join tile is the cell just left of the office's join
// tile, on the same row, so the doorways line up and no cell is drawn by both maps. It does not touch the physics world:
// that stays the office floor, so only the player (whose bounds the scene widens) can walk in.
// Returns the bathroom's rectangle in world px.
export function loadBathroom(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup): { bounds: Rect; walkBehind: WalkBehindPiece[] } {
    const office = scene.cache.tilemap.get(OFFICE_MAP_KEY).data as TiledMapData;
    const bathroom = scene.cache.tilemap.get(BATHROOM_FILES.mapKey).data as TiledMapData;
    const officeJoin = leftmostJoin(joinCells(office), 'Office');
    const bathroomJoin = rightmostJoin(joinCells(bathroom), 'Bathroom');
    const offset = placeBeside(officeJoin, bathroomJoin, { w: office.tilewidth, h: office.tileheight });

    const spec: MapSpec = { ...BATHROOM_FILES, offset, topLayers: ['Room Boundary Bottom'] };
    const loaded = loadTiledMap(scene, obstacles, spec);
    return { bounds: loaded.bounds, walkBehind: loaded.walkBehind };
}
