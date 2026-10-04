import { CELL, type WalkGrid } from './WalkGrid';
import { findPath, nearestReachableCell, nearestWalkableCell, type Cell } from './pathfinding';

// Pure chair-fetch logic (no Phaser) so it can be unit tested. NpcSeats executes what these return.

// A coworker about to work looks for a loose chair this close (px, spot to chair centre, straight line): 5 tiles
export const FETCH_RANGE = 5 * 32;
// ...and only takes one it can walk to in at most this many tiles
export const MAX_CHAIR_ROUTE_TILES = 15;
// How far (px) behind the work spot the chair is parked before they step onto the spot: half a tile
export const PARK_PX = 16;
// The staging cell can be blocked next to the desk; settle for a reachable one this close (in cells)
const STAGING_FALLBACK_CELLS = 4;
// A chair sitting in the fringe next to a wall has no clear cell of its own; it is dragged from one this close (cells)
const DRAG_START_RADIUS_CELLS = 3;
const CELLS_PER_TILE = 32 / CELL;

export interface Point { x: number; y: number }

// A chair as seen by the planner: where its body centre is (px), whether someone else has claimed it and whether it
// recently jammed someone and is being left alone
export interface ChairProbe extends Point { claimed: boolean; coolingDown?: boolean }

export type RejectReason = 'claimed' | 'recently-jammed' | 'too-far' | 'no-route' | 'route-too-long' | 'no-drag-route';

// What happened to the chair at `index` of the input: its walking route in tiles, or why it was filtered out
export interface ChairReach {
    index: number;
    routeTiles?: number;
    reason?: RejectReason;
}

export interface Leg { start: Cell; path: Cell[] }

export interface ChairPlan {
    // Spot to chair
    toChair: Leg;
    // Where the chair is parked: a walkable cell half a tile behind the work spot (and its centre, px)
    stagingCell: Cell;
    staging: Point;
    // Chair to the staging cell
    drag: Leg;
}

export function cellOf(p: Point): Cell {
    return { cx: Math.floor(p.x / CELL), cy: Math.floor(p.y / CELL) };
}

// Length of a path in cells (a diagonal step counts as the square root of two)
export function pathCells(start: Cell, path: Cell[]) {
    let prev = start;
    let total = 0;
    for (const c of path) {
        total += c.cx !== prev.cx && c.cy !== prev.cy ? Math.SQRT2 : 1;
        prev = c;
    }
    return total;
}

// The route from where a body stands to the walkable cell nearest `goal`, or null when there is none
export function planLeg(grid: WalkGrid, from: Point, goal: Cell): Leg | null {
    const c = cellOf(from);
    const start = nearestWalkableCell(grid, c.cx, c.cy);
    if (!start) return null;
    const path = findPath(grid, start, goal);
    return path ? { start, path } : null;
}

// Every chair with either its walking route from the work spot (tiles) or the reason it is out of reach.
// First a cheap straight-line check, then the routed length against the cap.
export function chairsInReach(grid: WalkGrid, spot: Point, chairs: ChairProbe[]): ChairReach[] {
    const spotCell = cellOf(spot);
    const start = nearestWalkableCell(grid, spotCell.cx, spotCell.cy);
    return chairs.map((chair, index): ChairReach => {
        if (chair.claimed) return { index, reason: 'claimed' };
        if (chair.coolingDown) return { index, reason: 'recently-jammed' };
        if (Math.hypot(chair.x - spot.x, chair.y - spot.y) > FETCH_RANGE) return { index, reason: 'too-far' };
        const c = cellOf(chair);
        const goal = nearestWalkableCell(grid, c.cx, c.cy);
        const path = start && goal ? findPath(grid, start, goal) : null;
        if (!start || !path) return { index, reason: 'no-route' };
        const routeTiles = pathCells(start, path) / CELLS_PER_TILE;
        if (routeTiles > MAX_CHAIR_ROUTE_TILES) return { index, reason: 'route-too-long' };
        return { index, routeTiles };
    });
}

// The chair to fetch among the results: shortest walking route first (not nearest in a straight line)
export function inReachByRoute(results: ChairReach[]) {
    return results
        .filter((r): r is ChairReach & { routeTiles: number } => r.routeTiles !== undefined)
        .sort((a, b) => a.routeTiles - b.routeTiles);
}

// The two routed legs of a fetch: coworker to the chair, then the chair dragged to the staging point half a tile
// behind the spot (`back` is the unit vector from the desk side towards the chair side). The walk to the chair only
// needs room for the coworker (`walkGrid`); the drag needs room for the chair too (`clearGrid`), including the
// staging cell. The last step, from the staging point onto the exact spot, is short and straight, so it isn't planned.
// Null when either leg has no route, or the chair has no clear cell to be dragged from.
export function planChairFetch(walkGrid: WalkGrid, clearGrid: WalkGrid, npc: Point, chair: Point, spot: Point, back: Point): ChairPlan | null {
    const chairCell = nearestWalkableCell(walkGrid, cellOf(chair).cx, cellOf(chair).cy);
    if (!chairCell) return null;
    const toChair = planLeg(walkGrid, npc, chairCell);
    if (!toChair) return null;
    const dragStart = nearestWalkableCell(clearGrid, cellOf(chair).cx, cellOf(chair).cy, DRAG_START_RADIUS_CELLS);
    if (!dragStart) return null;
    const staging = { x: spot.x + back.x * PARK_PX, y: spot.y + back.y * PARK_PX };
    const stagingCell = nearestReachableCell(clearGrid, dragStart, cellOf(staging), STAGING_FALLBACK_CELLS);
    if (!stagingCell) return null;
    const dragPath = findPath(clearGrid, dragStart, stagingCell);
    if (!dragPath) return null;
    return { toChair, stagingCell, staging, drag: { start: dragStart, path: dragPath } };
}

export interface FetchCandidate { index: number; routeTiles: number; plan: ChairPlan }

// Which chairs a walker at `spot` can fetch, best first (shortest walking route), and why each other one cannot.
// Used by the fetch and the chair-reach debug view, so they cannot disagree.
export function fetchCandidates(walkGrid: WalkGrid, clearGrid: WalkGrid, npc: Point, spot: Point, back: Point, chairs: ChairProbe[]) {
    const results = chairsInReach(walkGrid, spot, chairs);
    const usable: FetchCandidate[] = [];
    const rejected: { index: number; reason: RejectReason }[] = [];
    for (const r of results) {
        if (r.reason) {
            rejected.push({ index: r.index, reason: r.reason });
            continue;
        }
        const plan = planChairFetch(walkGrid, clearGrid, npc, chairs[r.index], spot, back);
        if (plan) usable.push({ index: r.index, routeTiles: r.routeTiles!, plan });
        else rejected.push({ index: r.index, reason: 'no-drag-route' });
    }
    usable.sort((a, b) => a.routeTiles - b.routeTiles);
    return { usable, rejected };
}
