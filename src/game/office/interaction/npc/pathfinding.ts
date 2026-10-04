import type { WalkGrid } from './WalkGrid';

export interface Cell {
    cx: number;
    cy: number;
}

const DIAGONAL = Math.SQRT2;
const STEPS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
];

// Walkable neighbours of a cell. A diagonal step needs both orthogonal cells walkable too, so a path never cuts a corner.
function neighbours(grid: WalkGrid, cx: number, cy: number) {
    const out: { cx: number; cy: number; cost: number }[] = [];
    for (const [dx, dy] of STEPS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.isWalkable(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && !(grid.isWalkable(cx + dx, cy) && grid.isWalkable(cx, cy + dy))) continue;
        out.push({ cx: nx, cy: ny, cost: dx !== 0 && dy !== 0 ? DIAGONAL : 1 });
    }
    return out;
}

// Every walkable cell that can be walked to from `start`, not including `start`
export function reachableCells(grid: WalkGrid, start: Cell): Cell[] {
    const seen = new Set<number>([start.cy * grid.cols + start.cx]);
    const queue: Cell[] = [start];
    const found: Cell[] = [];
    for (let i = 0; i < queue.length; i++) {
        for (const n of neighbours(grid, queue[i].cx, queue[i].cy)) {
            const key = n.cy * grid.cols + n.cx;
            if (seen.has(key)) continue;
            seen.add(key);
            queue.push(n);
            found.push(n);
        }
    }
    return found;
}

// Octile distance: the true cost on an 8-direction grid, so the estimate never overshoots
function octile(a: Cell, b: Cell) {
    const dx = Math.abs(a.cx - b.cx);
    const dy = Math.abs(a.cy - b.cy);
    return Math.max(dx, dy) + (DIAGONAL - 1) * Math.min(dx, dy);
}

// Shortest path from `start` to `goal` as the list of cells to step through (excluding `start`), or null when unreachable
export function findPath(grid: WalkGrid, start: Cell, goal: Cell): Cell[] | null {
    const key = (c: Cell) => c.cy * grid.cols + c.cx;
    const cost = new Map<number, number>([[key(start), 0]]);
    const from = new Map<number, Cell>();
    const closed = new Set<number>();
    // Small grid, so a plain list scanned for the lowest score is fast enough
    const open: { cell: Cell; score: number }[] = [{ cell: start, score: octile(start, goal) }];

    while (open.length > 0) {
        let best = 0;
        for (let i = 1; i < open.length; i++) if (open[i].score < open[best].score) best = i;
        const { cell } = open.splice(best, 1)[0];
        const k = key(cell);
        if (closed.has(k)) continue;
        closed.add(k);

        if (cell.cx === goal.cx && cell.cy === goal.cy) {
            const path: Cell[] = [];
            for (let at: Cell | undefined = cell; at && key(at) !== key(start); at = from.get(key(at))) path.push(at);
            return path.reverse();
        }

        for (const n of neighbours(grid, cell.cx, cell.cy)) {
            const nk = key(n);
            if (closed.has(nk)) continue;
            const next = (cost.get(k) ?? 0) + n.cost;
            if (next >= (cost.get(nk) ?? Infinity)) continue;
            cost.set(nk, next);
            from.set(nk, cell);
            open.push({ cell: { cx: n.cx, cy: n.cy }, score: next + octile(n, goal) });
        }
    }
    return null;
}

// Collapses runs of steps in the same direction into one waypoint at the end of the run
export function toWaypoints(start: Cell, path: Cell[]): Cell[] {
    const waypoints: Cell[] = [];
    let prev = start;
    let dir = '';
    for (const cell of path) {
        const d = `${Math.sign(cell.cx - prev.cx)},${Math.sign(cell.cy - prev.cy)}`;
        if (d === dir) waypoints[waypoints.length - 1] = cell;
        else waypoints.push(cell);
        dir = d;
        prev = cell;
    }
    return waypoints;
}
