import Phaser from 'phaser';
import type { NpcName } from '../../OfficeScene';
import { SEAT_BACK } from '../../furniture/SeatLayers';
import { FACING } from './facing';
import { CELL, type WalkGrid } from './WalkGrid';
import { PathFollower } from './PathFollower';
import { WorkSlots } from './WorkSlots';
import { facingFor, spotFor } from './deskSpot';
import { stepOntoSpot } from './approach';
import { routeCells } from './route';
import type { GiveUpSignal } from './giveUp';
import { Cooldowns, shouldStart } from '../trigger';
import { containsPx, rectToPx, scanInteractionTiles, type Dir, type GroupCell, type Rect } from '../zones';
import { PLANT_COLOR, REACH_COLOR } from '../plantOverlay';
import { buildDesks, type Desk } from './desks';
import type { Interaction, Pose } from '../registry';
import { SayThenHide } from '../sayThenHide';
import { DESK_TAKEN_PHRASES, FORGETFUL_PHRASES, JAM_PHRASES, STOLEN_PHRASES_NICE, WORK_DURATION_MS, WORK_PHRASE_MS, WORK_PHRASES } from '../workPhrases';

// Tiles with the Tiled tile property interaction = "work": a coworker standing next to a desk of them stops and
// works, facing it. They work from the side they walked in on; a side whose spot is blocked (a wall, another desk) is
// not used, so they come in on an open side instead.
// They deliberately walk to a work zone about once a minute, giving up if they can't get there
const WORK_VISIT_MS = { min: 50000, max: 70000 };
const WORK_VISIT_GIVE_UP_MS = 20000;
// Pause after working so they walk away instead of restarting while still next to the desk
const WORK_COOLDOWN_MS = 8000;
// The zone's centre can sit on a cell the grid keeps clear around the desk; settle for a reachable cell this close (in cells)
const GOAL_FALLBACK_CELLS = 4;
// Bumps into the player or the other coworker on the way before giving up the trip
const MAX_BUMPS = 3;

interface Visit {
    desk: Desk;
    follower: PathFollower;
    giveUpAt: number;
    bumps: number;
}

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
    // Called every frame at the work spot: fetches and pulls up a nearby chair. True once they can start working
    // (seated, or there was no chair), false while they're still on it (it has set their velocity).
    fetchChair(name: NpcName): boolean;
    // They're done or interrupted: the chair, if any, is left where it is
    releaseChair(name: NpcName): void;
    // Once per give-up of the chair trip: 'jam' = they let a jammed chair go and are walking back to work standing;
    // 'stolen' = the same, after the player took the chair;
    // 'lost' = they cannot get back to work and have stopped
    gaveUp(name: NpcName): GiveUpSignal | undefined;
    // The grid the work trips are routed over (it is built after the interaction, so it is looked up on use)
    walkGrid(): WalkGrid;
    // True when the player is standing still with their feet (body centre) inside the rectangle, in px
    isPlayerStillIn(zone: Rect): boolean;
    // True once if the coworker bumped into something and so had to reroute since it was last asked
    chairBumped(name: NpcName): boolean;
}

export class WorkInteraction implements Interaction<NpcName> {
    // The desks, each with the areas (in tile units) a coworker stands in to use it
    private tiles: Desk[] = [];
    private cells: GroupCell[] = [];
    // Who is using which desk; claimed when a coworker picks one, released on every way out
    private slots = new WorkSlots();
    // Stepping from the zone onto the exact spot against the desk
    private approach = new Map<NpcName, number>();
    // The side of the desk each coworker stepped onto, kept while they fetch a chair and work
    private chosen = new Map<NpcName, Dir>();
    // Coworkers fetching a chair, and the desk they are fetching it for
    private fetching = new Set<NpcName>();
    private fetchDesk = new Map<NpcName, Desk>();
    private tileSize = 32;
    private working = new Map<NpcName, { timers: Phaser.Time.TimerEvent[] }>();
    // Each coworker's line-then-hide, for the turned-away and make-do lines
    private lines = new Map<NpcName, SayThenHide>();
    private cooldowns = new Cooldowns<NpcName>();
    private nextVisitAt = new Map<NpcName, number>();
    private visit = new Map<NpcName, Visit>();
    // Coworkers showing the make-do line after a jam: they keep walking back with the bubble up, and wait for it to
    // finish before they start working
    private makingDo = new Set<NpcName>();

    private scene: Phaser.Scene;
    private host: WorkHost;

    constructor(scene: Phaser.Scene, host: WorkHost) {
        this.scene = scene;
        this.host = host;
    }

    // Records the layer's work tiles; call once per map layer. Touching tiles make one desk.
    collectTiles(layer: Phaser.Tilemaps.TilemapLayer, tileset: Phaser.Tilemaps.Tileset) {
        for (const tile of scanInteractionTiles(layer, tileset, 'work')) {
            this.tileSize = tile.tileSize;
            this.cells.push({ tx: tile.tx, ty: tile.ty });
        }
        this.tiles = buildDesks(this.cells, this.tileSize);
    }

    // The sides of the desk with room to stand against it: the flush spot there is on a walkable cell. Worked out on
    // first use, as the grid is built after the interaction, and it never changes.
    private openSides(desk: Desk) {
        if (!desk.open) {
            const grid = this.host.walkGrid();
            const { halfWidth, halfHeight } = this.host.npc('susan').body;
            desk.open = desk.sides.filter(({ dir }) => {
                const spot = spotFor(desk.rect, dir, this.tileSize, halfWidth, halfHeight, this.centreX(desk));
                return grid.isWalkable(Math.floor(spot.x / CELL), Math.floor(spot.y / CELL));
            });
        }
        return desk.open;
    }

    // The side of the desk whose strip holds the point (px): the side they came in on. Undefined when none does.
    private sideAt(desk: Desk, x: number, y: number) {
        return this.openSides(desk).find((s) => containsPx(s.zone, this.tileSize, x, y))?.dir;
    }

    // The side this coworker works from: the one they stepped onto at the start, else the one they stand in
    private sideFor(name: NpcName, desk: Desk): Dir | undefined {
        const npc = this.host.npc(name);
        return this.chosen.get(name) ?? this.sideAt(desk, npc.body.center.x, npc.body.center.y);
    }

    // Horizontal centre of the desk, px
    private centreX(desk: Desk) {
        return ((desk.rect.x0 + desk.rect.x1) / 2) * this.tileSize;
    }

    // Debug overlay, drawn like the plants': blue outline = the desk, white = the strips where a coworker will start
    // working (open sides only, filled faintly)
    drawZones(g: Phaser.GameObjects.Graphics) {
        const size = this.tileSize;
        for (const desk of this.tiles) {
            for (const { zone: z } of this.openSides(desk)) {
                g.fillStyle(REACH_COLOR, 0.25).fillRect(z.x0 * size, z.y0 * size, (z.x1 - z.x0) * size, (z.y1 - z.y0) * size);
                g.lineStyle(1, REACH_COLOR, 1).strokeRect(z.x0 * size, z.y0 * size, (z.x1 - z.x0) * size, (z.y1 - z.y0) * size);
            }
            const r = desk.rect;
            g.lineStyle(1, PLANT_COLOR, 1).strokeRect(r.x0 * size, r.y0 * size, (r.x1 - r.x0) * size, (r.y1 - r.y0) * size);
        }
    }

    // Call every frame for each coworker. Returns true while the coworker is walking to a work zone,
    // in which case this has set their velocity and they shouldn't wander.
    update(name: NpcName): boolean {
        if (this.host.isBusy(name) && !this.makingDo.has(name)) {
            if (this.fetching.has(name)) this.cancel(name); // interrupted on the way to a chair: let go of it
            return false;
        }
        if (this.working.has(name)) return false;
        if (this.fetching.has(name)) {
            // Back near the desk, or bumped into something and rerouting, and the desk was taken meanwhile: give up
            // the chair and say so. Bumping with the desk still free is just a reroute, done by the seat code.
            const desk = this.fetchDesk.get(name)!;
            const bumped = this.host.chairBumped(name);
            if (this.occupied(name, desk) && (bumped || this.nearSpot(name, desk))) {
                this.endFetch(name);
                this.host.releaseChair(name);
                this.turnAway(name);
                return false;
            }
            return this.fetch(name);
        }

        const desk = this.deskAt(name);
        if (desk) {
            // At a desk they can use: step onto the spot, then get a chair if one is near, then work
            const step = this.approachWorkTile(name, desk);
            if (step === 'failed') {
                this.turnAway(name);
                return false;
            }
            if (step === 'moving') return true;
            this.fetching.add(name);
            this.fetchDesk.set(name, desk);
            return this.fetch(name);
        }
        if (this.approach.delete(name) && !this.visit.has(name)) this.slots.release(name); // pushed out of the zone
        return this.updateVisit(name);
    }

    private fetch(name: NpcName) {
        const ready = this.host.fetchChair(name);
        const gaveUp = this.host.gaveUp(name);
        if (gaveUp) {
            const desk = this.fetchDesk.get(name)!;
            // An occupied desk comes first: the usual turned-away line
            if (gaveUp === 'lost' || this.occupied(name, desk)) {
                this.makingDo.delete(name);
                this.endFetch(name);
                this.host.releaseChair(name);
                this.turnAway(name, this.occupied(name, desk) ? DESK_TAKEN_PHRASES : FORGETFUL_PHRASES);
                return false;
            }
            this.makeDo(name, gaveUp === 'stolen');
            return true;
        }
        if (!ready || this.makingDo.has(name)) return true;
        this.endFetch(name);
        this.startWork(name);
        return false;
    }

    // The chair jammed or was stolen: say so in one bubble (a stolen chair gets a complaint first, then the make-do
    // line), and carry on back to the spot to work standing
    private makeDo(name: NpcName, stolen: boolean) {
        this.makingDo.add(name);
        const make = Phaser.Utils.Array.GetRandom(JAM_PHRASES);
        const text = stolen ? `${Phaser.Utils.Array.GetRandom(STOLEN_PHRASES_NICE)} ${make}` : make;
        // Work may have started meanwhile and replaced the line
        this.sayer(name).say(text, { hideIf: () => this.makingDo.delete(name) && !this.working.has(name) });
    }

    private endFetch(name: NpcName) {
        this.fetching.delete(name);
        this.fetchDesk.delete(name);
    }

    // The desk isn't this coworker's to use: someone else holds it (or took its claim), or the player is standing
    // at it, working yet or not
    private occupied(name: NpcName, desk: Desk) {
        return this.slots.holderOf(desk.id) !== name || this.playerIn(name, desk);
    }

    // Within a tile of the work spot
    private nearSpot(name: NpcName, desk: Desk) {
        const npc = this.host.npc(name);
        const spot = this.spotFor(desk, this.sideFor(name, desk), npc.body.halfWidth, npc.body.halfHeight, npc.body.center.x);
        return Phaser.Math.Distance.Between(npc.body.center.x, npc.body.center.y, spot.x, spot.y) <= this.tileSize;
    }

    // Stops working without touching the bubble (chat takes the bubble over when it interrupts).
    // Lets go of the desk and drops any trip to it, so it is free for anyone else.
    cancel(name: NpcName) {
        const fetching = this.fetching.has(name);
        this.makingDo.delete(name);
        this.endFetch(name);
        if (fetching || this.working.has(name)) this.host.releaseChair(name);
        this.sayer(name).cancel();
        this.approach.delete(name);
        this.chosen.delete(name);
        if (this.visit.has(name) || this.slots.heldBy(name) !== undefined) this.scheduleVisit(name);
        this.slots.release(name);
        const work = this.working.get(name);
        if (!work) return;
        work.timers.forEach((t) => t.remove());
        this.working.delete(name);
    }

    // Chat command shortcut: drops whatever the coworker is doing and starts a work visit on the next frame
    forceVisit(name: NpcName) {
        this.cancel(name);
        this.host.hideBubble(name);
        this.cooldowns.clear(name);
        this.nextVisitAt.set(name, 0);
    }

    // From arriving at the work zone until work ends or it gives up: fetching a chair, sitting and working
    isEngaged(name: NpcName) {
        return this.approach.has(name) || this.fetching.has(name) || this.working.has(name);
    }

    // Heading for a desk too, not only at it
    isActive(name: NpcName) {
        return this.visit.has(name) || this.isEngaged(name);
    }

    pose(name: NpcName): Pose | undefined {
        return this.working.has(name) ? { kind: 'work', working: true } : undefined;
    }

    private sayer(name: NpcName) {
        let sayer = this.lines.get(name);
        if (!sayer) {
            sayer = new SayThenHide({
                say: (text, onDone) => this.host.say(name, text, onDone),
                hide: () => this.host.hideBubble(name),
                later: (ms, fn) => this.scene.time.delayedCall(ms, fn),
                pick: (lines) => Phaser.Utils.Array.GetRandom(lines)
            }, WORK_PHRASE_MS);
            this.lines.set(name, sayer);
        }
        return sayer;
    }

    // The player marks the desk whose zone they stand in as occupied: a free one if there is one, else one a coworker
    // has claimed but isn't working at yet, which that coworker then finds occupied (and is turned away from when it
    // gets near). A coworker already working keeps its desk, and the player works regardless.
    claimFor(owner: string, sprite: Npc) {
        const here = this.tiles.filter((d) => this.contains(d, sprite));
        const free = here.find((d) => this.slots.isFree(d.id, owner));
        if (free) {
            this.slots.claim(free.id, owner);
            return;
        }
        const taken = here.find((d) => {
            const holder = this.slots.holderOf(d.id);
            return holder !== undefined && !this.working.has(holder as NpcName);
        });
        if (taken) this.slots.take(taken.id, owner);
    }

    releaseFor(owner: string) {
        this.slots.release(owner);
    }

    // The desk this coworker may use where it stands: the one it holds if its zone contains them, else the first free
    // desk whose zone does. A desk someone else holds is passed over silently. Not while resting, or already working.
    private deskAt(name: NpcName): Desk | undefined {
        if (this.working.has(name)) return undefined;
        const npc = this.host.npc(name);
        const held = this.slots.heldBy(name);
        const candidates = held !== undefined ? this.tiles.filter((d) => d.id === held) : this.tiles;
        const onCooldown = this.cooldowns.isCoolingDown(name, this.scene.time.now);
        const interrupted = this.host.isBusy(name);
        return candidates.find((d) => shouldStart({
            inReach: this.contains(d, npc),
            interrupted,
            onCooldown,
            free: this.slots.isFree(d.id, name),
            stillRequired: false,
            standingStill: true
        }));
    }

    // True when the sprite's feet (its physics body centre) are inside any work zone
    isInZone(sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        return this.tiles.some((d) => this.contains(d, sprite));
    }

    private contains(desk: Desk, sprite: Npc) {
        return this.sideAt(desk, sprite.body.center.x, sprite.body.center.y) !== undefined;
    }

    // The player is standing still in the strip this coworker works from, or in any open strip of the desk before they have one
    private playerIn(name: NpcName, desk: Desk) {
        const side = this.chosen.get(name);
        const zones = side ? desk.sides.filter((s) => s.dir === side) : this.openSides(desk);
        return zones.some((s) => this.host.isPlayerStillIn(rectToPx(s.zone, this.tileSize)));
    }

    private scheduleVisit(name: NpcName) {
        this.visit.delete(name);
        this.nextVisitAt.set(name, this.scene.time.now + Phaser.Math.Between(WORK_VISIT_MS.min, WORK_VISIT_MS.max));
    }

    // Every so often, claim a free desk and walk the A* route to its work zone. Returns true while walking there.
    // Nothing free, no route, a trip that takes longer than WORK_VISIT_GIVE_UP_MS or keeps getting bumped: the desk
    // is let go and the visit tried again later.
    private updateVisit(name: NpcName) {
        if (this.tiles.length === 0) return false;
        const now = this.scene.time.now;
        let visit = this.visit.get(name);
        if (!visit) {
            if (!this.nextVisitAt.has(name)) this.scheduleVisit(name);
            if (now < (this.nextVisitAt.get(name) ?? 0)) return false;
            const id = this.slots.claimRandom(this.tiles.filter((d) => this.openSides(d).length > 0).map((d) => d.id), name, Math.random);
            if (id === undefined) {
                this.scheduleVisit(name); // every desk is held
                return false;
            }
            const desk = this.tiles.find((d) => d.id === id)!;
            const follower = this.routeTo(name, desk);
            if (!follower) {
                this.slots.release(name);
                this.scheduleVisit(name);
                return false;
            }
            console.log(`[office] ${name} claims desk ${id} (top-left tile x,y; open sides ${this.openSides(desk).length})`);
            visit = { desk, follower, giveUpAt: now + WORK_VISIT_GIVE_UP_MS, bumps: 0 };
            this.visit.set(name, visit);
            this.cooldowns.clear(name); // a visit is deliberate, so skip the rest period
        }
        const npc = this.host.npc(name);
        if (now > visit.giveUpAt) return this.giveUp(name, npc);
        // The desk was taken on the way: near it, or after a bump, give it up and say so
        const blocked = PathFollower.isBlocked(npc);
        if (this.occupied(name, visit.desk) && (blocked || this.nearSpot(name, visit.desk))) {
            this.turnAway(name);
            return false;
        }
        if (blocked) {
            // Something got in the way: route again from where they stand
            npc.setVelocity(0);
            const follower = ++visit.bumps >= MAX_BUMPS ? undefined : this.routeTo(name, visit.desk);
            if (!follower) return this.giveUp(name, npc);
            visit.follower = follower;
        }
        if (visit.follower.step(npc) === 'arrived') {
            // Close enough to the zone, it is entered by now: the next frame steps onto the spot. Otherwise the route fell short.
            if (!this.contains(visit.desk, npc)) return this.giveUp(name, npc);
        }
        return true;
    }

    private giveUp(name: NpcName, npc: Npc) {
        npc.setVelocity(0);
        this.slots.release(name);
        this.scheduleVisit(name);
        return false;
    }

    // The shortest A* route from where the coworker stands to the work strip of an open side of the desk, or null when
    // there is none. A strip's centre may sit on a cell kept clear around the desk, so the goal is the nearest reachable cell to it.
    private routeTo(name: NpcName, desk: Desk): PathFollower | null {
        const grid = this.host.walkGrid();
        const from = this.host.npc(name).body.center;
        let best: ReturnType<typeof routeCells> = null;
        for (const { zone } of this.openSides(desk)) {
            const route = routeCells(grid, from, zone, this.tileSize, GOAL_FALLBACK_CELLS);
            if (route && (!best || route.path.length < best.path.length)) best = route;
        }
        return best ? new PathFollower(best.start, best.path) : null;
    }

    // Walks a coworker standing in a work zone to the spot flush against the work tile: 'ready' once they're there,
    // after turning them to face the tile, 'failed' when they can't get onto it (the player is in the way).
    private approachWorkTile(name: NpcName, desk: Desk): 'moving' | 'ready' | 'failed' {
        const npc = this.host.npc(name);
        const now = this.scene.time.now;
        if (!this.approach.has(name)) {
            if (!this.slots.claim(desk.id, name) || this.playerIn(name, desk)) return 'failed';
            const side = this.sideFor(name, desk);
            if (!side) return 'failed';
            this.chosen.set(name, side);
            this.approach.set(name, now);
            this.visit.delete(name); // arrived: the route is done
        }
        const dir = this.chosen.get(name)!;
        const spot = this.spotFor(desk, dir, npc.body.halfWidth, npc.body.halfHeight, npc.body.center.x);
        const step = stepOntoSpot(npc, spot, this.approach.get(name) ?? now, now);
        if (step !== 'ready') return step;
        // They face the desk; the facing also decides which side of them the chair is parked on
        npc.setData(FACING, facingFor(dir));
        return this.arrive(name);
    }

    // Body centre (px) of the spot flush against the work tile on the given side, level with it along the edge
    // (`alongX` picks where on an up/down tile's edge)
    private spotFor(desk: Desk, dir: Dir | undefined, halfWidth: number, halfHeight: number, alongX: number) {
        return spotFor(desk.rect, dir, this.tileSize, halfWidth, halfHeight, alongX);
    }

    // Where the player works at the desk whose strip they stand in (the one they hold if it contains them): the flush
    // spot on the side they are on, and the way they face the desk. Undefined outside every strip.
    spotAndFacing(sprite: Npc) {
        const { x, y } = sprite.body.center;
        const held = this.slots.heldBy('player');
        const desk = this.tiles.find((d) => d.id === held && this.contains(d, sprite)) ?? this.tiles.find((d) => this.contains(d, sprite));
        const dir = desk && this.sideAt(desk, x, y);
        if (!desk || !dir) return undefined;
        return { spot: this.spotFor(desk, dir, sprite.body.halfWidth, sprite.body.halfHeight, x), facing: facingFor(dir) };
    }

    // Every desk's work zones (the strips `P` draws in yellow), in px: the places nobody should spawn
    zoneRects(): Rect[] {
        return this.tiles.flatMap((d) => this.openSides(d).map(({ zone }) => rectToPx(zone, this.tileSize)));
    }

    // Where a coworker stands to work at each open side of each desk (body centre, px) and the way its chair is parked
    // behind it, for the chair reach debug view
    workSpots() {
        const { halfWidth, halfHeight } = this.host.npc('susan').body;
        return this.tiles.flatMap((d) => this.openSides(d).map(({ dir }) => ({
            ...this.spotFor(d, dir, halfWidth, halfHeight, this.centreX(d)),
            back: SEAT_BACK[facingFor(dir) ?? 'down']
        })));
    }

    // The desk each coworker is heading for, fetching a chair for, or working at (spot and tile in px, and where the
    // coworker is now), for the chair reach debug view
    targets() {
        const found: { name: NpcName; from: { x: number; y: number }; spot: { x: number; y: number }; tile: Rect }[] = [];
        for (const name of ['susan', 'gloria'] as const) {
            const held = this.slots.heldBy(name);
            const desk = this.visit.get(name)?.desk ?? this.fetchDesk.get(name) ?? this.tiles.find((d) => d.id === held);
            if (!desk) continue;
            const npc = this.host.npc(name);
            const size = this.tileSize;
            found.push({
                name,
                from: { x: npc.body.center.x, y: npc.body.center.y },
                spot: this.spotFor(desk, this.sideFor(name, desk), npc.body.halfWidth, npc.body.halfHeight, npc.body.center.x),
                tile: rectToPx(desk.rect, size)
            });
        }
        return found;
    }

    private arrive(name: NpcName) {
        this.approach.delete(name);
        this.host.npc(name).setVelocity(0);
        return 'ready' as const;
    }

    // The desk is unusable, or the chair trip was lost: say a random line from `phrases`, then give it up and try
    // again later. The coworker stays put while the bubble is up. The desk is released once the line is shown.
    private turnAway(name: NpcName, phrases: string[] = DESK_TAKEN_PHRASES) {
        this.approach.delete(name);
        this.host.npc(name).setVelocity(0);
        console.log(`[office] ${name} turned away from its desk`);
        this.sayer(name).say(phrases, {
            onShown: () => {
                this.slots.release(name);
                this.scheduleVisit(name);
                this.cooldowns.start(name, this.scene.time.now, WORK_COOLDOWN_MS);
            }
        });
    }

    // Stand still (the scene holds the idle sprite on its first frame) and mutter generic thinking phrases for WORK_DURATION_MS
    private startWork(name: NpcName) {
        const npc = this.host.npc(name);
        npc.setVelocity(0);
        this.scheduleVisit(name);

        // Each phrase finishes typing and rests for WORK_PHRASE_MS. Then the next one starts, or, once
        // WORK_DURATION_MS has passed, work ends, so they never walk off mid-phrase
        const timers: Phaser.Time.TimerEvent[] = [];
        const endAt = this.scene.time.now + WORK_DURATION_MS;
        const finish = () => {
            this.cancel(name);
            this.host.hideBubble(name);
            this.cooldowns.start(name, this.scene.time.now, WORK_COOLDOWN_MS);
        };
        const say = () => {
            this.host.say(name, Phaser.Utils.Array.GetRandom(WORK_PHRASES), () => {
                const last = this.scene.time.now + WORK_PHRASE_MS >= endAt;
                timers.push(this.scene.time.delayedCall(WORK_PHRASE_MS, last ? finish : say));
            });
        };
        say();
        this.working.set(name, { timers });
    }
}
