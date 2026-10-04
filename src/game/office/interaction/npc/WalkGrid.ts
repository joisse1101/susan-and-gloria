import Phaser from 'phaser';

// Cell edge in px. The coworker's feet body is FEET_HEIGHT * SPRITE_SCALE (8) px tall, so one row of cells matches it
export const CELL = 8;
// Cells either side of a cell that must also be free so the whole body fits (22px body -> 3 cells = 24px)
const SIDE_CELLS = 1;

// Which 8x8 px cells a coworker's feet can stand on. Built once from the static solids; chairs and characters are not in it.
// A cell is walkable when the cell and its SIDE_CELLS neighbours left and right are free, so a path can be followed by centre point.
export class WalkGrid {
    readonly cols: number;
    readonly rows: number;
    private readonly blocked: Uint8Array;
    private readonly walkable: Uint8Array;

    constructor(world: Phaser.Geom.Rectangle, obstacles: Phaser.Physics.Arcade.StaticGroup) {
        this.cols = Math.ceil(world.right / CELL);
        this.rows = Math.ceil(world.bottom / CELL);
        this.blocked = new Uint8Array(this.cols * this.rows);
        this.walkable = new Uint8Array(this.cols * this.rows);

        for (let cy = 0; cy < this.rows; cy++) {
            for (let cx = 0; cx < this.cols; cx++) {
                // Anything not wholly inside the world bounds is off the floor
                const inside = cx * CELL >= world.x && cy * CELL >= world.y && (cx + 1) * CELL <= world.right && (cy + 1) * CELL <= world.bottom;
                if (!inside) this.blocked[cy * this.cols + cx] = 1;
            }
        }
        for (const child of obstacles.getChildren()) {
            const body = (child as Phaser.GameObjects.GameObject).body as Phaser.Physics.Arcade.StaticBody | null;
            if (body) this.blockRect(body.left, body.top, body.right, body.bottom);
        }

        for (let cy = 0; cy < this.rows; cy++) {
            for (let cx = 0; cx < this.cols; cx++) {
                let free = true;
                for (let dx = -SIDE_CELLS; dx <= SIDE_CELLS && free; dx++) free = !this.isBlocked(cx + dx, cy);
                this.walkable[cy * this.cols + cx] = free ? 1 : 0;
            }
        }
    }

    // Cells outside the grid count as blocked
    isBlocked(cx: number, cy: number) {
        return cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows || this.blocked[cy * this.cols + cx] === 1;
    }

    isWalkable(cx: number, cy: number) {
        return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows && this.walkable[cy * this.cols + cx] === 1;
    }

    // Cells overlapped by the rect (px) become blocked
    private blockRect(left: number, top: number, right: number, bottom: number) {
        const x1 = Math.max(0, Math.floor(left / CELL));
        const y1 = Math.max(0, Math.floor(top / CELL));
        const x2 = Math.min(this.cols - 1, Math.ceil(right / CELL) - 1);
        const y2 = Math.min(this.rows - 1, Math.ceil(bottom / CELL) - 1);
        for (let cy = y1; cy <= y2; cy++) {
            for (let cx = x1; cx <= x2; cx++) this.blocked[cy * this.cols + cx] = 1;
        }
    }
}
