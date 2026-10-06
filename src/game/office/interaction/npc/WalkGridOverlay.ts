import Phaser from 'phaser';
import { CELL, WalkGrid, type Footprint } from './WalkGrid';
import { overlayCellColour, type OverlayRegion } from './overlayCell';
import type { Rect } from '../../map/walkBehind';

const ALPHA = 0.35;

// One map's grid(s) and where it sits in the world. `WalkGrid` is origin-based, so a map placed away from the origin gets
// its own grid built in the map's local coordinates and drawn moved back by `offset`.
export interface OverlayGrid {
    grid: WalkGrid;
    // Whether a dragged chair fits (the H overlay); a region without one is tinted without it
    clearGrid?: WalkGrid;
    offset: { x: number; y: number };
    region: OverlayRegion;
}

// A WalkGrid over a map placed at `bounds` (world px), built from the obstacle bodies moved by -bounds.x/y so the grid
// can start at 0. Only for the overlay: coworkers never use it.
export function gridOverRegion(bounds: Rect, obstacles: Phaser.Physics.Arcade.StaticGroup, footprint?: Footprint): WalkGrid {
    const world = { x: 0, y: 0, right: bounds.w, bottom: bounds.h } as Phaser.Geom.Rectangle;
    const children = obstacles
        .getChildren()
        .map((c) => (c as Phaser.GameObjects.GameObject).body as Phaser.Physics.Arcade.StaticBody | null)
        .filter((b): b is Phaser.Physics.Arcade.StaticBody => !!b)
        .map((b) => ({ body: { left: b.left - bounds.x, top: b.top - bounds.y, right: b.right - bounds.x, bottom: b.bottom - bounds.y } }));
    return new WalkGrid(world, { getChildren: () => children } as unknown as Phaser.Physics.Arcade.StaticGroup, footprint);
}

// Development aid, toggled with a key: tints every cell of every map green (a coworker can stand there) or red (blocked).
// With `clearGrid`s too, green means a dragged chair fits as well, and yellow that only the coworker does.
// Cells outside the office are tinted as player-only (see overlayCellColour).
export class WalkGridOverlay {
    private readonly graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, regions: OverlayGrid[], depth: number, toggleKey: string, isTyping: () => boolean, showClearance = false) {
        this.graphics = scene.add.graphics().setDepth(depth).setVisible(false);
        for (const { grid, clearGrid, offset, region } of regions) {
            for (let cy = 0; cy < grid.rows; cy++) {
                for (let cx = 0; cx < grid.cols; cx++) {
                    const clear = showClearance && clearGrid ? clearGrid.isWalkable(cx, cy) : undefined;
                    this.graphics.fillStyle(overlayCellColour(grid.isWalkable(cx, cy), clear, region), ALPHA);
                    this.graphics.fillRect(offset.x + cx * CELL, offset.y + cy * CELL, CELL, CELL);
                }
            }
        }
        scene.input.keyboard?.on(`keydown-${toggleKey}`, () => {
            if (!isTyping()) this.graphics.setVisible(!this.graphics.visible);
        });
    }
}
