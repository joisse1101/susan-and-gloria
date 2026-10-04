import Phaser from 'phaser';
import { CELL, type WalkGrid } from './WalkGrid';

const WALKABLE_COLOR = 0x00ff00;
const WALKER_ONLY_COLOR = 0xffff00;
const BLOCKED_COLOR = 0xff0000;
const ALPHA = 0.35;

// Development aid, toggled with a key: tints every cell green (a coworker can stand there) or red (blocked).
// With a `clearGrid` too, green means a dragged chair fits as well, and yellow that only the coworker does.
export class WalkGridOverlay {
    private readonly graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, grid: WalkGrid, depth: number, toggleKey: string, isTyping: () => boolean, clearGrid?: WalkGrid) {
        this.graphics = scene.add.graphics().setDepth(depth).setVisible(false);
        for (let cy = 0; cy < grid.rows; cy++) {
            for (let cx = 0; cx < grid.cols; cx++) {
                const color = !grid.isWalkable(cx, cy) ? BLOCKED_COLOR : clearGrid && !clearGrid.isWalkable(cx, cy) ? WALKER_ONLY_COLOR : WALKABLE_COLOR;
                this.graphics.fillStyle(color, ALPHA);
                this.graphics.fillRect(cx * CELL, cy * CELL, CELL, CELL);
            }
        }
        scene.input.keyboard?.on(`keydown-${toggleKey}`, () => {
            if (!isTyping()) this.graphics.setVisible(!this.graphics.visible);
        });
    }
}
