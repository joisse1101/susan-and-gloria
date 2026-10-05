import { CELL } from './WalkGrid';
import { mainRegion, type GridLike } from './reachable';
import type { Rect } from '../zones';

// A body to place: `walker` bodies stand on the walk grid, `chair` bodies on the clearance grid. w and h (px) are the
// collision body, used to keep it out of interaction zones.
export interface SpawnRequest { id: string; kind: 'walker' | 'chair'; w: number; h: number }
export interface Spawn { id: string; x: number; y: number }
export interface SpawnResult {
    spawns: Spawn[];
    // One line per rule that had to be relaxed, for the console
    notes: string[];
}

// Spacing wanted between any two spawns (px between body centres)
export const SPAWN_GAP_PX = 48;

// Shuffles a copy with the given random source (Fisher-Yates)
function shuffled<T>(items: T[], rng: () => number): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const overlaps = (cx: number, cy: number, w: number, h: number, z: Rect) =>
    cx - w / 2 < z.x1 && cx + w / 2 > z.x0 && cy - h / 2 < z.y1 && cy + h / 2 > z.y0;

// Picks a cell centre (px) for every request. Cells come from the largest connected walkable area; a chair also needs
// its cell clear on `clearGrid`. Zones are rects in px that nobody should start in.
// A body that finds no room is relaxed in order: first the gap (halved down to nothing), then the zones.
export function pickSpawns(grid: GridLike, clearGrid: GridLike, requests: SpawnRequest[], zones: Rect[], rng: () => number, gap = SPAWN_GAP_PX): SpawnResult {
    const region = mainRegion(grid);
    if (region.size === 0) throw new Error('Spawn: the office map has no walkable floor to place anyone on');
    const walkCells = [...region];
    const chairCells = walkCells.filter((i) => clearGrid.isWalkable(i % grid.cols, Math.floor(i / grid.cols)));
    const taken: { x: number; y: number }[] = [];
    const used = new Set<number>();
    const spawns: Spawn[] = [];
    const notes: string[] = [];

    for (const req of requests) {
        const cells = shuffled(req.kind === 'chair' ? chairCells : walkCells, rng);
        const pick = (minGap: number, useZones: boolean) => cells.find((i) => {
            if (used.has(i)) return false;
            const x = (i % grid.cols) * CELL + CELL / 2;
            const y = Math.floor(i / grid.cols) * CELL + CELL / 2;
            if (useZones && zones.some((z) => overlaps(x, y, req.w, req.h, z))) return false;
            return taken.every((t) => Math.hypot(t.x - x, t.y - y) >= minGap);
        });
        const gaps: number[] = [];
        for (let g = gap; g >= 1; g = Math.floor(g / 2)) gaps.push(g);
        gaps.push(0);

        let found: number | undefined;
        let relaxedGap: number | undefined;
        let relaxedZones = false;
        for (const useZones of [true, false]) {
            for (const g of gaps) {
                found = pick(g, useZones);
                if (found !== undefined) { relaxedGap = g < gap ? g : undefined; relaxedZones = !useZones; break; }
            }
            if (found !== undefined) break;
        }
        if (found === undefined) throw new Error(`Spawn: no free cell left for ${req.id}`);
        if (relaxedGap !== undefined) notes.push(`Spawn: gap relaxed to ${relaxedGap}px for ${req.id}`);
        if (relaxedZones) notes.push(`Spawn: ${req.id} placed inside an interaction zone (zone rule relaxed)`);

        used.add(found);
        const x = (found % grid.cols) * CELL + CELL / 2;
        const y = Math.floor(found / grid.cols) * CELL + CELL / 2;
        taken.push({ x, y });
        spawns.push({ id: req.id, x, y });
    }
    return { spawns, notes };
}

// The sprite position that puts the body's centre on (cx, cy), given where the body centre sits relative to the sprite
export function spritePosForBodyCentre(cx: number, cy: number, offset: { x: number; y: number }) {
    return { x: cx - offset.x, y: cy - offset.y };
}
