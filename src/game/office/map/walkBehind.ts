import { WALK_BEHIND_STRIP_FRACTION, WALK_BEHIND_STRIP_PX } from '../constants';

export type Rect = { x: number; y: number; w: number; h: number };

// A solid object (wall, furniture) that characters can walk behind. Sorting, fading and collision read only this.
export type WalkBehindObject = {
    bounds: Rect;
    // Bottom edge of the object (map px): the line characters' feet cross to go in front
    baseY: number;
    // Height in px of the open top strip, measured down from bounds.y
    openDepth: number;
};

// Depth of the walkable top strip for an object `height` px tall: the strip size, capped at a fraction of the height.
export function openStripPx(height: number): number {
    return Math.max(0, Math.min(WALK_BEHIND_STRIP_PX, Math.floor(WALK_BEHIND_STRIP_FRACTION * height)));
}

// One object per vertical run of touching solid cells in a column. `solid[row][col]`, cells are tileW x tileH px;
// the open strip is rounded down to whole cells.
export function findWalkBehindObjects(solid: boolean[][], tileW: number, tileH: number): WalkBehindObject[] {
    const objects: WalkBehindObject[] = [];
    const cols = solid.reduce((max, row) => Math.max(max, row.length), 0);
    for (let col = 0; col < cols; col++) {
        let top = -1;
        for (let row = 0; row <= solid.length; row++) {
            if (solid[row]?.[col]) {
                if (top < 0) top = row;
                continue;
            }
            if (top < 0) continue;
            const height = (row - top) * tileH;
            objects.push({
                bounds: { x: col * tileW, y: top * tileH, w: tileW, h: height },
                baseY: row * tileH,
                openDepth: Math.floor(openStripPx(height) / tileH) * tileH
            });
            top = -1;
        }
    }
    return objects;
}

// Removes everything above map y `cutY` from tile-local `rects`. `tileY` is the tile's top in map px.
export function clipAboveCut(rects: Rect[], tileY: number, cutY: number): Rect[] {
    const cut = cutY - tileY;
    const clipped: Rect[] = [];
    for (const r of rects) {
        const y = Math.max(r.y, cut);
        const h = r.y + r.h - y;
        if (h > 0) clipped.push({ x: r.x, y, w: r.w, h });
    }
    return clipped;
}

// Splits a rect at multiples of `size` along x, so each piece lies in one column of cells.
export function splitAtColumns(rect: Rect, size: number): Rect[] {
    const pieces: Rect[] = [];
    const end = rect.x + rect.w;
    for (let x = rect.x; x < end; ) {
        const next = Math.min(end, (Math.floor(x / size) + 1) * size);
        pieces.push({ x, y: rect.y, w: next - x, h: rect.h });
        x = next;
    }
    return pieces;
}
