import Phaser from 'phaser';
import type { WalkBehindPiece } from './loadTiledMap';

const r = (n: number) => Math.round(n * 1000) / 1000;

// Dev only: what the map loader produced for the office (collision bodies, walk-behind pieces, bounds), as plain data,
// so a refactor can be compared against the output of the code before it. Open the game with `?dumpMap=baseline`
// (saved as office-baseline.json) or `?dumpMap` (office-current.json); the Vite dev server writes the file to .map-dumps/.
export function dumpMapIfRequested(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    loaded: { mapSize: { width: number; height: number }; walkBehind: WalkBehindPiece[] }
) {
    if (!import.meta.env.DEV) return;
    // HashRouter keeps the query after the '#' (#/office?dumpMap), so look there as well as in the real search string
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?')) : window.location.search);
    if (!params.has('dumpMap')) return;
    const name = params.get('dumpMap') === 'baseline' ? 'office-baseline' : 'office-current';

    const bodies = obstacles
        .getChildren()
        .map((c) => (c as Phaser.GameObjects.GameObject).body as Phaser.Physics.Arcade.StaticBody)
        .filter(Boolean)
        .map((b) => ({ x: r(b.x), y: r(b.y), w: r(b.width), h: r(b.height) }))
        .sort((a, b) => a.y - b.y || a.x - b.x || a.w - b.w || a.h - b.h);
    const pieces = loaded.walkBehind
        .map((p) => ({
            bounds: { x: r(p.bounds.x), y: r(p.bounds.y), w: r(p.bounds.w), h: r(p.bounds.h) },
            baseY: Number.isFinite(p.baseY) ? r(p.baseY) : 'Infinity',
            depth: r(p.image.depth),
            x: r(p.image.x),
            y: r(p.image.y),
            frame: String(p.image.frame.name)
        }))
        .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x || a.depth - b.depth);
    const b = scene.physics.world.bounds;
    const dump = {
        mapSize: loaded.mapSize,
        worldBounds: { x: r(b.x), y: r(b.y), w: r(b.width), h: r(b.height) },
        bodies,
        pieces
    };
    console.log(`[dumpMap] ${name}: ${bodies.length} bodies, ${pieces.length} pieces`);
    void fetch(`${import.meta.env.BASE_URL}__dump/${name}`, { method: 'POST', body: JSON.stringify(dump, null, 2) });
}
