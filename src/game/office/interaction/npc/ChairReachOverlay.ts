import Phaser from 'phaser';
import type { WalkGrid } from './WalkGrid';
import { chairsInReach, FETCH_RANGE, type ChairProbe, type Point, type RejectReason } from './chairReach';

const IN_REACH = 0x00cc44;
const REJECTED = 0xee2222;
const REFRESH_MS = 100;
const TARGET = 0xffcc00;
const LABELS: Record<RejectReason, string> = {
    claimed: 'claimed',
    'too-far': 'too far',
    'no-route': 'no route',
    'route-too-long': 'route too long'
};

// What the overlay reads: where coworkers work, the loose chairs, and the grid routes are planned on
export interface ChairReachSource {
    spots(): Point[];
    chairs(): ChairProbe[];
    grid(): WalkGrid;
    // The desk each coworker is heading for or working at: where it stands now, the work spot, and the work tile (px)
    targets(): { name: string; from: Point; spot: Point; tile: { x0: number; y0: number; x1: number; y1: number } }[];
}

// Development aid, toggled with a key: a circle of the straight-line range around every work spot, and from it a line
// to each chair that is close enough to be routed. Green = in reach (labelled with the walking route in tiles),
// red = filtered out (labelled with why). A chair no spot can reach in a straight line, or that is claimed, gets a
// red ring at the chair instead. Yellow marks the desk each coworker is heading for (tile outlined, a line from the
// coworker to the spot, labelled with their name). It only reads state, and it uses the same chairsInReach the coworkers fetch with.
export class ChairReachOverlay {
    private readonly graphics: Phaser.GameObjects.Graphics;
    private readonly labels: Phaser.GameObjects.Text[] = [];
    private scene: Phaser.Scene;
    private source: ChairReachSource;
    private depth: number;
    private visible = false;
    private nextRefresh = 0;

    constructor(scene: Phaser.Scene, source: ChairReachSource, depth: number, toggleKey: string, isTyping: () => boolean) {
        this.scene = scene;
        this.source = source;
        this.depth = depth;
        this.graphics = scene.add.graphics().setDepth(depth).setVisible(false);
        scene.input.keyboard?.on(`keydown-${toggleKey}`, () => {
            if (isTyping()) return;
            this.visible = !this.visible;
            this.graphics.setVisible(this.visible);
            this.nextRefresh = 0;
            if (!this.visible) this.labels.forEach((l) => l.setVisible(false));
        });
    }

    // Call every frame; redraws a few times a second while visible
    update() {
        if (!this.visible || this.scene.time.now < this.nextRefresh) return;
        this.nextRefresh = this.scene.time.now + REFRESH_MS;
        const { graphics: g } = this;
        g.clear();
        let used = 0;
        const label = (x: number, y: number, text: string, color: number) => {
            let t = this.labels[used];
            if (!t) {
                t = this.scene.add.text(0, 0, '', { fontSize: '8px', color: '#fff', backgroundColor: '#000a' }).setDepth(this.depth + 1).setOrigin(0.5, 1);
                this.labels.push(t);
            }
            t.setText(text).setColor(`#${color.toString(16).padStart(6, '0')}`).setPosition(x, y).setVisible(true);
            used++;
        };

        const chairs = this.source.chairs();
        const grid = this.source.grid();
        const reachedByNone = new Set(chairs.keys());
        for (const spot of this.source.spots()) {
            g.lineStyle(1, 0xffffff, 0.4).strokeCircle(spot.x, spot.y, FETCH_RANGE);
            g.fillStyle(0xffffff, 0.8).fillCircle(spot.x, spot.y, 2);
            for (const r of chairsInReach(grid, spot, chairs)) {
                if (r.reason === 'claimed' || r.reason === 'too-far') continue;
                reachedByNone.delete(r.index);
                const chair = chairs[r.index];
                const color = r.reason ? REJECTED : IN_REACH;
                g.lineStyle(1, color, 0.9).lineBetween(spot.x, spot.y, chair.x, chair.y);
                label((spot.x + chair.x) / 2, (spot.y + chair.y) / 2, r.reason ? LABELS[r.reason] : `${r.routeTiles!.toFixed(1)} tiles`, color);
            }
        }
        // Chairs no desk reaches: say why at the chair itself
        for (const i of reachedByNone) {
            const chair = chairs[i];
            g.lineStyle(1, REJECTED, 0.9).strokeCircle(chair.x, chair.y, 8);
            label(chair.x, chair.y - 10, chair.claimed ? LABELS.claimed : LABELS['too-far'], REJECTED);
        }
        for (const t of this.source.targets()) {
            g.lineStyle(2, TARGET, 1).strokeRect(t.tile.x0, t.tile.y0, t.tile.x1 - t.tile.x0, t.tile.y1 - t.tile.y0);
            g.lineStyle(1, TARGET, 0.9).lineBetween(t.from.x, t.from.y, t.spot.x, t.spot.y).strokeCircle(t.spot.x, t.spot.y, 5);
            label(t.spot.x, t.tile.y0 - 2, `${t.name}'s desk`, TARGET);
        }
        for (let i = used; i < this.labels.length; i++) this.labels[i].setVisible(false);
    }
}
