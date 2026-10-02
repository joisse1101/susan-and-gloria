import Phaser from 'phaser';
import type { NpcName } from '../OfficeScene';

// Tiles with the Tiled tile property interaction = "work": a coworker standing on the square next to one
// (in the tile's "direction" property: left, right, up or down) stops and works
// How far (in tiles) the work area extends from the work tile's edge in that direction, e.g. 0.5 = half a tile, 1 = the whole next square
const WORK_RANGE_TILES = 0.75;
const DIRECTIONS: Record<string, { dx: number; dy: number }> = {
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 }
};
const WORK_DURATION_MS = 10000;
const WORK_PHRASE_MS = 1200;
// They deliberately walk to a work zone about once a minute, giving up if they can't get there
const WORK_VISIT_MS = { min: 50000, max: 70000 };
const WORK_VISIT_GIVE_UP_MS = 20000;
const WALK_SPEED = 40;
// Pause after working so they walk away instead of restarting while still next to the desk
const WORK_COOLDOWN_MS = 8000;
const WORK_PHRASES = [
    // Thinking & Processing
    'hmm...',
    'let me think...',
    'let\'s see here...',
    'taking a step back...',
    'connecting the dots...',
    'crunching the numbers...',
    'testing an idea...',
    'pondering this one...',
    'if I look at it this way...',
    'tracing the logic...',

    // Course Correction & Pivoting
    'wait, no...',
    'back to the drawing board...',
    'hold on, that doesn\'t fit...',
    'let me try another angle...',
    'scratch that...',
    'not quite what I meant...',
    'wait, let\'s rethink this...',
    'rewinding a bit...',
    'changing gears...',

    // Breakthroughs & Fits
    'how about this...',
    'ooh, that works',
    'now we\'re onto something...',
    'there\'s the spark...',
    'that\'s more like it!',
    'bingo, found it...',
    'it\'s coming together...',
    'a subtle detail, but huge...',
    'spot on!',

    // Fine-Tuning & Polishing
    'almost there...',
    'one more tweak...',
    'just a slight adjustment...',
    'smoothing out the edges...',
    'tidying up the details...',
    'dotting the i\'s...',
    'getting the balance right...',
    'giving it a final polish...',
    'nesting the last piece...',

    // Focus & Recovery
    'where was I...',
    'picking up where I left off...',
    'getting back on track...',
    'where did that thread go...',
    're-centering...',
    'focusing in...'
];

interface Zone { x0: number; y0: number; x1: number; y1: number }

type Npc = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// What the interaction needs from the scene that owns the coworkers
export interface WorkHost {
    npc(name: NpcName): Npc;
    // Types a thought above the coworker one character at a time; onDone fires when it's fully shown
    say(name: NpcName, text: string, onDone?: () => void): void;
    // Hides whatever bubble is above the coworker
    hideBubble(name: NpcName): void;
    // True while the coworker has a bubble up (noticed, thinking or talking), so they shouldn't start working
    isBusy(name: NpcName): boolean;
}

export class WorkInteraction {
    // tx/ty is the work tile, zone the area (in tile units) a coworker stands in to use it
    private tiles: { tx: number; ty: number; zone: Zone }[] = [];
    private tileSize = 32;
    private working = new Map<NpcName, { tween: Phaser.Tweens.Tween; timers: Phaser.Time.TimerEvent[] }>();
    private cooldownUntil = new Map<NpcName, number>();
    private nextVisitAt = new Map<NpcName, number>();
    private visit = new Map<NpcName, { x: number; y: number; giveUpAt: number }>();

    private scene: Phaser.Scene;
    private host: WorkHost;

    constructor(scene: Phaser.Scene, host: WorkHost) {
        this.scene = scene;
        this.host = host;
    }

    // Records the layer's work tiles; call once per map layer
    collectTiles(layer: Phaser.Tilemaps.TilemapLayer, tileset: Phaser.Tilemaps.Tileset) {
        layer.forEachTile((tile) => {
            if (tile.index < 0 || this.tileProperty(tileset, tile.index, 'interaction') !== 'work') return;
            this.tileSize = tile.width;
            const dir = DIRECTIONS[String(this.tileProperty(tileset, tile.index, 'direction'))];
            if (!dir) console.warn(`[office] work tile at ${tile.x},${tile.y} has no valid direction; using the tile itself`);
            this.tiles.push({ tx: tile.x, ty: tile.y, zone: this.zoneFor(tile.x, tile.y, dir) });
        });
    }

    // A one-tile-wide strip against the work tile's edge on the given side, WORK_RANGE_TILES deep
    private zoneFor(tx: number, ty: number, dir?: { dx: number; dy: number }): Zone {
        if (!dir) return { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 };
        const r = WORK_RANGE_TILES;
        if (dir.dx < 0) return { x0: tx - r, y0: ty, x1: tx, y1: ty + 1 };
        if (dir.dx > 0) return { x0: tx + 1, y0: ty, x1: tx + 1 + r, y1: ty + 1 };
        if (dir.dy < 0) return { x0: tx, y0: ty - r, x1: tx + 1, y1: ty };
        return { x0: tx, y0: ty + 1, x1: tx + 1, y1: ty + 1 + r };
    }

    // Phaser exposes tile properties as {name: value}, but accept Tiled's [{name, value}] list too
    private tileProperty(tileset: Phaser.Tilemaps.Tileset, index: number, key: string): unknown {
        const props = (tileset.tileProperties as Record<number, unknown> | undefined)?.[index - tileset.firstgid];
        if (Array.isArray(props)) return (props as { name: string; value: unknown }[]).find((p) => p.name === key)?.value;
        return (props as Record<string, unknown> | undefined)?.[key];
    }

    // Debug overlay: red = work tile, yellow = the zone where a coworker will start working
    drawZones(depth: number) {
        const size = this.tileSize;
        const g = this.scene.add.graphics().setDepth(depth);
        g.fillStyle(0xffdd00, 0.3);
        for (const { zone: z } of this.tiles) g.fillRect(z.x0 * size, z.y0 * size, (z.x1 - z.x0) * size, (z.y1 - z.y0) * size);
        g.fillStyle(0xff0000, 0.4);
        for (const { tx, ty } of this.tiles) g.fillRect(tx * size, ty * size, size, size);
        console.log(`[office] ${this.tiles.length} work tiles`, this.tiles);
    }

    // Call every frame for each coworker. Returns true while the coworker is walking to a work zone,
    // in which case this has set their velocity and they shouldn't wander.
    update(name: NpcName): boolean {
        const busy = this.host.isBusy(name);
        if (!busy && this.shouldWork(name)) this.startWork(name);
        return !busy && !this.working.has(name) && this.updateVisit(name);
    }

    // Stops working without touching the bubble (chat takes the bubble over when it interrupts)
    cancel(name: NpcName) {
        const work = this.working.get(name);
        if (!work) return;
        work.tween.remove();
        work.timers.forEach((t) => t.remove());
        this.working.delete(name);
        this.host.npc(name).setAngle(0);
    }

    // True when the coworker's feet are inside a work zone (the one drawn by drawZones) and they aren't resting
    private shouldWork(name: NpcName) {
        if (this.working.has(name) || this.scene.time.now < (this.cooldownUntil.get(name) ?? 0)) return false;
        const body = this.host.npc(name).body;
        const x = body.center.x / this.tileSize;
        const y = body.center.y / this.tileSize;
        return this.tiles.some(({ zone: z }) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
    }

    private scheduleVisit(name: NpcName) {
        this.visit.delete(name);
        this.nextVisitAt.set(name, this.scene.time.now + Phaser.Math.Between(WORK_VISIT_MS.min, WORK_VISIT_MS.max));
    }

    // Every so often, head for the work zone of a random work tile. Returns true while walking there.
    // There's no pathfinding, so a blocked route is abandoned after WORK_VISIT_GIVE_UP_MS.
    private updateVisit(name: NpcName) {
        if (this.tiles.length === 0) return false;
        const now = this.scene.time.now;
        let visit = this.visit.get(name);
        if (!visit) {
            if (!this.nextVisitAt.has(name)) this.scheduleVisit(name);
            if (now < (this.nextVisitAt.get(name) ?? 0)) return false;
            const t = Phaser.Utils.Array.GetRandom(this.tiles);
            visit = { x: ((t.zone.x0 + t.zone.x1) / 2) * this.tileSize, y: ((t.zone.y0 + t.zone.y1) / 2) * this.tileSize, giveUpAt: now + WORK_VISIT_GIVE_UP_MS };
            this.visit.set(name, visit);
            this.cooldownUntil.delete(name); // a visit is deliberate, so skip the rest period
        }
        if (now > visit.giveUpAt) {
            this.scheduleVisit(name);
            return false;
        }
        const npc = this.host.npc(name);
        const dir = new Phaser.Math.Vector2(visit.x - npc.body.center.x, visit.y - npc.body.center.y).normalize();
        npc.setVelocity(dir.x * WALK_SPEED, dir.y * WALK_SPEED);
        if (npc.body.velocity.x !== 0) npc.setFlipX(npc.body.velocity.x < 0);
        return true;
    }

    // Stand still, wobble, and mutter generic thinking phrases for WORK_DURATION_MS
    private startWork(name: NpcName) {
        const npc = this.host.npc(name);
        npc.setVelocity(0);
        this.scheduleVisit(name);

        const tween = this.scene.tweens.add({
            targets: npc,
            angle: { from: -3, to: 3 },
            duration: 180,
            yoyo: true,
            repeat: -1
        });
        // Each phrase finishes typing and rests for WORK_PHRASE_MS. Then the next one starts, or, once
        // WORK_DURATION_MS has passed, work ends, so they never walk off mid-phrase
        const timers: Phaser.Time.TimerEvent[] = [];
        const endAt = this.scene.time.now + WORK_DURATION_MS;
        const finish = () => {
            this.cancel(name);
            this.host.hideBubble(name);
            this.cooldownUntil.set(name, this.scene.time.now + WORK_COOLDOWN_MS);
        };
        const say = () => {
            this.host.say(name, Phaser.Utils.Array.GetRandom(WORK_PHRASES), () => {
                const last = this.scene.time.now + WORK_PHRASE_MS >= endAt;
                timers.push(this.scene.time.delayedCall(WORK_PHRASE_MS, last ? finish : say));
            });
        };
        say();
        this.working.set(name, { tween, timers });
    }
}
