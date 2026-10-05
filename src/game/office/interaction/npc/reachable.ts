import type { WalkGrid } from './WalkGrid';

export type GridLike = Pick<WalkGrid, 'cols' | 'rows' | 'isWalkable'>;

// The cells of the largest 4-connected area of walkable cells, as indices `cy * cols + cx`. A walkable pocket sealed off
// from the main floor is smaller (or equal and later), so nobody is ever placed in a place they cannot leave.
export function mainRegion(grid: GridLike): Set<number> {
    const seen = new Uint8Array(grid.cols * grid.rows);
    let best: number[] = [];
    for (let start = 0; start < seen.length; start++) {
        if (seen[start] || !grid.isWalkable(start % grid.cols, Math.floor(start / grid.cols))) continue;
        const region: number[] = [];
        const stack = [start];
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop()!;
            region.push(i);
            const cx = i % grid.cols;
            const cy = Math.floor(i / grid.cols);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy;
                if (!grid.isWalkable(nx, ny)) continue;
                const n = ny * grid.cols + nx;
                if (!seen[n]) { seen[n] = 1; stack.push(n); }
            }
        }
        if (region.length > best.length) best = region;
    }
    return new Set(best);
}
