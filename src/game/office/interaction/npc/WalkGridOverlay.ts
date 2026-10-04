import Phaser from 'phaser';
import { CELL, type WalkGrid } from './WalkGrid';

const WALKABLE_COLOR = 0x00ff00;
const BLOCKED_COLOR = 0xff0000;
const ALPHA = 0.35;

// Development aid: tints every cell green (a coworker can stand there) or red (blocked), toggled with a key
export class WalkGridOverlay {
    private readonly graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, grid: WalkGrid, depth: number, toggleKey: string, isTyping: () => boolean) {
        this.graphics = scene.add.graphics().setDepth(depth).setVisible(false);
        for (let cy = 0; cy < grid.rows; cy++) {
            for (let cx = 0; cx < grid.cols; cx++) {
                this.graphics.fillStyle(grid.isWalkable(cx, cy) ? WALKABLE_COLOR : BLOCKED_COLOR, ALPHA);
                this.graphics.fillRect(cx * CELL, cy * CELL, CELL, CELL);
            }
        }
        scene.input.keyboard?.on(`keydown-${toggleKey}`, () => {
            if (!isTyping()) this.graphics.setVisible(!this.graphics.visible);
        });
    }
}
