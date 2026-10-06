import Phaser from 'phaser';
import { loadTiledMap, preloadMapFiles, type MapSpec } from './loadTiledMap';

export type { WalkBehindPiece } from './loadTiledMap';

export const OFFICE_MAP_KEY = 'officeMap';

// The office sits at the origin; its Floor layer limits where characters can walk, and its bottom edge is drawn over them
const OFFICE_SPEC: MapSpec = {
    mapKey: OFFICE_MAP_KEY,
    tilesetKey: 'officeTiles',
    baseUrl: `${import.meta.env.BASE_URL}assets/map/office/`,
    offset: { x: 0, y: 0 },
    topLayers: ['Room Boundary Bottom'],
    limitsWorldToLayer: 'Floor'
};

export function preloadOfficeMap(scene: Phaser.Scene) {
    preloadMapFiles(scene, OFFICE_SPEC);
}

// Builds the office: see loadTiledMap. `onLayer` is called for every layer so callers can collect tiles (e.g. work zones).
export function loadOfficeMap(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    onLayer: (layer: Phaser.Tilemaps.TilemapLayer, tileset: Phaser.Tilemaps.Tileset) => void
) {
    const { size, walkBehind } = loadTiledMap(scene, obstacles, OFFICE_SPEC, onLayer);
    return { mapSize: size, walkBehind };
}
