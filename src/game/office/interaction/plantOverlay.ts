import Phaser from 'phaser';
import { rectToPx, type Rect } from './zones';

export const PLANT_COLOR = 0x33ccff;
export const REACH_COLOR = 0xffffff;

// Development aid, toggled with a key: outlines each plant (blue) and its reach zone (white, filled faintly), plus whatever `drawExtra` adds (the work zones)
export class PlantOverlay {
    private readonly graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, plants: { rect: Rect; reach: Rect; tileSize: number }[], depth: number, toggleKey: string, isTyping: () => boolean, drawExtra?: (g: Phaser.GameObjects.Graphics) => void) {
        this.graphics = scene.add.graphics().setDepth(depth).setVisible(false);
        this.drawPlants(plants);
        scene.input.keyboard?.on(`keydown-${toggleKey}`, () => {
            if (isTyping()) return;
            this.graphics.setVisible(!this.graphics.visible);
            // Redrawn on each show: the extra may need things built after this overlay (the work zones need the walk grid)
            if (this.graphics.visible && drawExtra) {
                this.graphics.clear();
                this.drawPlants(plants);
                drawExtra(this.graphics);
            }
        });
    }

    private drawPlants(plants: { rect: Rect; reach: Rect; tileSize: number }[]) {
        for (const p of plants) {
            const r = rectToPx(p.reach, p.tileSize);
            this.graphics.fillStyle(REACH_COLOR, 0.25).fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
            this.graphics.lineStyle(1, REACH_COLOR, 1).strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
            const b = rectToPx(p.rect, p.tileSize);
            this.graphics.lineStyle(1, PLANT_COLOR, 1).strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        }
    }
}
