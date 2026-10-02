import Phaser from 'phaser';
import {
    OFFICE_ATLAS_KEY,
    OFFICE_ATLAS_URL,
    OFFICE_FRAMES,
    type OfficeFrameName
} from './atlases/officeAtlas';
import {
    INTERIOR_ATLAS_KEY,
    INTERIOR_ATLAS_URL,
    INTERIOR_FRAMES,
    type InteriorFrameName
} from './atlases/interiorAtlas';
import {
    FURNITURE_ATLAS_KEY,
    FURNITURE_ATLAS_URL,
    FURNITURE_FRAMES,
    type FurnitureFrameName
} from './atlases/furnitureAtlas';
import { Chairs } from './furniture/Chairs';
import type { AtlasFrame } from './atlases/types';
import { WorkInteraction } from './interaction/npc/WorkInteraction';
import { ThinkingInteraction } from './interaction/npc/ThinkingInteraction';
import { PlayerWork } from './interaction/player/PlayerWork';
import { CAMERA_ZOOM, FEET_HEIGHT, MAP_DEPTH, MAP_TOP_DEPTH, RUG_DEPTH, SPEECH_DEPTH, SPRITE_SCALE } from './constants';

const MAP_KEY = 'officeMap';
const MAP_TILESET_KEY = 'officeTiles';
const MAP_BASE_URL = `${import.meta.env.BASE_URL}assets/map/office/`;
// Name of the tileset inside map.json (as exported from Sprite Fusion)
const MAP_TILESET_NAME = 'spritefusion';
// Tile layers drawn over the characters (everything else is under them)
// Layer whose extent limits where characters can walk
const FLOOR_LAYER = 'Floor';
const TOP_LAYERS: string[] = ["Room Boundary"];

interface PlaceOptions {
    // Height (unscaled px) of the collision body measured up from the object's base; omit for no collision
    solid?: number;
    // Lies on the floor (rugs): drawn under characters instead of depth-sorted
    flat?: boolean;
}

export type NpcName = 'susan' | 'gloria';

// Replies scroll inside a window of this many wrapped lines, following the newest text
const NPC_BUBBLE_LINES = 8;
const NPC_BUBBLE_WIDTH = 250;
const NPC_BUBBLE_FONT = '10px';
const NPC_BUBBLE_LINGER_MS = 12000;
const NPC_MUTTER_CHAR_MS = 200;
const NPC_WALK_SPEED = 40;
// Each wander step is a walk or a pause lasting a random time in this range
const NPC_STEP_MS = { min: 800, max: 2500 };

// Which spritesheet a frame name comes from. Some names (plant, windowA) exist in both, so it is explicit.
type AtlasChoice = 'interior' | 'office' | 'furniture';

export class OfficeScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private gloria!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private susan!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private wanderUntil = new Map<NpcName, number>();
    private work!: WorkInteraction;
    private thinking!: ThinkingInteraction;
    private mapSize = { width: 0, height: 0 };
    private opaqueBounds = new Map<number, { x: number; y: number; w: number; h: number } | null>();
    private obstacles!: Phaser.Physics.Arcade.StaticGroup;
    private chairs!: Chairs;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private speechText!: Phaser.GameObjects.Text;
    private wobble?: Phaser.Tweens.Tween;
    private playerWork!: PlayerWork;
    private npcBubbles = new Map<NpcName, Phaser.GameObjects.Text>();
    private mutterTimers = new Map<NpcName, Phaser.Time.TimerEvent>();
    private npcTimers = new Map<NpcName, Phaser.Time.TimerEvent>();
    private npcSpeech = new Map<NpcName, { text: string; offset: number; follow: boolean; done: boolean }>();
    public isTyping: boolean = false;
    private chatText = '';
    private speechTimer?: Phaser.Time.TimerEvent;
    // Called with the finished chat line; returns false if it can't be sent right now (the text is kept)
    private sayHandler?: (text: string) => boolean;

    public setSayHandler(handler: (text: string) => boolean) {
        this.sayHandler = handler;
    }

    // Phaser captures space/arrows with preventDefault, which would block them in the React <input>
    public setTyping(isTyping: boolean) {
        this.isTyping = isTyping;
        const keyboard = this.input.keyboard;
        if (!keyboard) return;
        if (isTyping) keyboard.disableGlobalCapture();
        else keyboard.enableGlobalCapture();
    }

    constructor() {
        super('OfficeScene');
    }

    preload() {
        this.load.image(OFFICE_ATLAS_KEY, OFFICE_ATLAS_URL);
        this.load.image(INTERIOR_ATLAS_KEY, INTERIOR_ATLAS_URL);
        this.load.image(FURNITURE_ATLAS_KEY, FURNITURE_ATLAS_URL);
        this.load.tilemapTiledJSON(MAP_KEY, `${MAP_BASE_URL}map.json`);
        this.load.image(MAP_TILESET_KEY, `${MAP_BASE_URL}spritesheet.png`);
    }

    create() {
        this.registerAtlasFrames(OFFICE_ATLAS_KEY, OFFICE_FRAMES);
        this.registerAtlasFrames(INTERIOR_ATLAS_KEY, INTERIOR_FRAMES);
        this.registerAtlasFrames(FURNITURE_ATLAS_KEY, FURNITURE_FRAMES);

        this.speechText = this.add.text(0, 0, '', {
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 6, y: 4 },
            wordWrap: { width: NPC_BUBBLE_WIDTH }
        });

        // Adjust origin & hide it initially; depth sits above any y-based sprite depth
        this.speechText.setOrigin(0.5, 1);
        this.speechText.setVisible(false);
        this.speechText.setDepth(SPEECH_DEPTH);

        // 1. OBSTACLES: Group for static walls/desks
        this.obstacles = this.physics.add.staticGroup();
        this.work = new WorkInteraction(this, {
            npc: (name) => (name === 'susan' ? this.susan : this.gloria),
            say: (name, text, onDone) => this.showNpcMutter(name, text, onDone),
            hideBubble: (name) => this.hideNpcMutterBubble(name),
            isBusy: (name) => this.npcBubbles.get(name)?.visible ?? false
        });
        this.thinking = new ThinkingInteraction(this, {
            bubble: (name) => this.npcBubbles.get(name),
            positionBubble: (name) => this.positionNpcBubble(name),
            styleThought: (bubble) => bubble.setStyle({ fontSize: NPC_BUBBLE_FONT, fontStyle: 'italic', color: '#555555', align: 'center' })
        });
        this.loadMap();
        // this.work.drawZones(SPEECH_DEPTH - 1); // TODO: some button or env to toggle show

        // Pieces: place(name, centreX, centreY, { solid, flat, atlas }). Names live in interiorAtlas.ts; for officeAtlas.ts names pass atlas: 'office'
        // To add an object: pick a frame name, a position in canvas px (640x416), and solid (collision height in px) if it should block the player.
        // this.place('bookshelfA', 400, 140, { solid: 10 }); // leave this here for reference

        // 2. AVATARS: Player & Coworkers
        this.player = this.physics.add.sprite(300, 300, OFFICE_ATLAS_KEY, 'player');
        this.player.setScale(SPRITE_SCALE);
        // Feet-only body so the head can overlap objects behind
        const playerFrame = OFFICE_FRAMES.player;
        this.player.body.setSize(playerFrame.w - 4, FEET_HEIGHT);
        this.player.body.setOffset(2, playerFrame.h - FEET_HEIGHT);

        this.playerWork = new PlayerWork(this, {
            player: this.player,
            bubble: this.speechText,
            isInWorkZone: (sprite) => this.work.isInZone(sprite),
            isTyping: () => this.isTyping
        });

        this.player.body.pushable = false; // chairs move out of its way, not the other way round
        this.chairs = new Chairs(this);
        this.chairs.add(375, 300, 'chairS');
        this.chairs.add(260, 330, 'chairSE');
        this.chairs.add(330, 350, 'chairW');

        this.gloria = this.createCoworker(240, 150, 'gloria');
        this.susan = this.createCoworker(475, 160, 'susan');
        this.npcBubbles.set('gloria', this.createNpcBubble());
        this.npcBubbles.set('susan', this.createNpcBubble());
        // Mouse wheel over a bubble scrolls it back through the reply
        // Hit-tested by bounds: setInteractive() fixes its hit area at the (empty) size the text has when created
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
            for (const [name, bubble] of this.npcBubbles) {
                if (bubble.visible && bubble.getBounds().contains(pointer.worldX, pointer.worldY)) {
                    this.scrollNpcSpeech(dy > 0 ? 1 : -1, name);
                }
            }
        });

        // 3. WORLD COLLISION: Enable solid boundaries
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.obstacles); // Stop on placed furniture and map walls/tables
        this.physics.add.collider(this.player, this.gloria);   // Stop on Gloria
        this.physics.add.collider(this.player, this.susan);    // Stop on Susan
        // Coworkers wander but respect the same furniture and walls
        for (const npc of [this.gloria, this.susan]) {
            npc.setCollideWorldBounds(true);
            this.physics.add.collider(npc, this.obstacles);
        }
        this.physics.add.collider(this.gloria, this.susan);
        this.chairs.collide([this.player, this.gloria, this.susan], this.obstacles);

        // Camera: fills the window, follows the player, stays inside the map (centred when the map is smaller)
        const cam = this.cameras.main;
        cam.setZoom(CAMERA_ZOOM);
        this.updateCameraBounds();
        this.scale.on('resize', this.updateCameraBounds, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.updateCameraBounds, this));
        cam.startFollow(this.player, true);
        cam.roundPixels = true;

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown', this.onKeyDown, this);
        }
    }

    override update() {
        const speed = 160;
        this.player.setVelocity(0);

        if (!this.isTyping) {
            if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
            else if (this.cursors.right.isDown) this.player.setVelocityX(speed);

            if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
            else if (this.cursors.down.isDown) this.player.setVelocityY(speed);
        }

        this.player.body.velocity.normalize().scale(speed);

        const vx = this.player.body.velocity.x;
        if (vx !== 0) this.player.setFlipX(vx < 0);

        const moving = this.player.body.velocity.lengthSq() > 0;
        this.updateWalkCue(moving);
        this.playerWork.update(moving);

        this.sortByBottom(this.player);
        this.chairs.update();
        this.updateWander('gloria', this.gloria);
        this.updateWander('susan', this.susan);
        this.speechText.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 4);
    }

    // Random walk: alternate between heading in a random direction and standing still.
    // They stand still while their bubble is up (noticed, thinking or talking).
    private updateWander(name: NpcName, npc: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        const heading = this.work.update(name);
        const busy = this.npcBubbles.get(name)?.visible ?? false; // after update: starting work puts a bubble up
        const blocked = npc.body.blocked.none === false || npc.body.touching.none === false;
        if (busy) {
            npc.setVelocity(0);
        } else if (heading) {
            // walking to a work zone: the work interaction set the velocity
        } else if (blocked || this.time.now >= (this.wanderUntil.get(name) ?? 0)) {
            const idle = npc.body.velocity.lengthSq() > 0 || Math.random() < 0.3;
            if (idle) {
                npc.setVelocity(0);
            } else {
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                npc.setVelocity(Math.cos(angle) * NPC_WALK_SPEED, Math.sin(angle) * NPC_WALK_SPEED);
                if (npc.body.velocity.x !== 0) npc.setFlipX(npc.body.velocity.x < 0);
            }
            this.wanderUntil.set(name, this.time.now + Phaser.Math.Between(NPC_STEP_MS.min, NPC_STEP_MS.max));
        }
        this.sortByBottom(npc);
        if (this.npcBubbles.get(name)?.visible) this.positionNpcBubble(name);
    }

    // In-game chat: "/" or Enter opens it, typing shows in the player's bubble, Enter sends, Esc cancels
    private onKeyDown(event: KeyboardEvent) {
        if (!this.isTyping) {
            if (event.key === '/' || event.key === 'Enter') {
                event.preventDefault(); // keeps the "/" out of the text
                this.chatText = '';
                this.setTyping(true);
                this.renderChat();
            }
            return;
        }
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === 'Enter') {
            const text = this.chatText.trim();
            if (!text) return;
            if (this.sayHandler && !this.sayHandler(text)) return; // busy: keep what was typed
            this.closeChat();
            this.displaySpeechBubble(text);
        } else if (event.key === 'Escape') {
            this.closeChat();
            this.speechText.setVisible(false);
        } else if (event.key === 'Backspace') {
            this.chatText = this.chatText.slice(0, -1);
            this.renderChat();
        } else if (event.key === 'ArrowUp') {
            this.scrollNpcSpeech(-1);
        } else if (event.key === 'ArrowDown') {
            this.scrollNpcSpeech(1);
        } else if (event.key.length === 1) {
            this.chatText += event.key;
            this.renderChat();
        }
    }

    private closeChat() {
        this.chatText = '';
        this.setTyping(false);
    }

    private renderChat() {
        this.speechTimer?.remove();
        this.speechTimer = undefined;
        this.speechText.setText(`${this.chatText}|`);
        this.speechText.setVisible(true);
    }

    public displaySpeechBubble(message: string) {
        this.speechTimer?.remove();
        this.speechText.setText(message);
        this.speechText.setVisible(true);

        this.speechTimer = this.time.delayedCall(3000, () => {
            this.speechText.setVisible(false);
        });
    }

    // "!" over a coworker: they noticed the player speaking, before anyone is chosen to answer
    public showNpcNotice(name: NpcName) {
        const bubble = this.npcBubbles.get(name);
        if (!bubble) return;
        this.work.cancel(name);
        this.thinking.stop(name);
        this.npcTimers.get(name)?.remove();
        this.npcTimers.delete(name);

        bubble.setStyle({ fontSize: '16px', fontStyle: 'bold', color: '#d00000', align: 'center' });
        bubble.setText('!');
        this.positionNpcBubble(name);
        bubble.setVisible(true);
    }

    public hideNpcBubble(name: NpcName) {
        this.thinking.stop(name);
        this.npcTimers.get(name)?.remove();
        this.npcTimers.delete(name);
        this.npcBubbles.get(name)?.setVisible(false);
        this.npcSpeech.delete(name);
    }

    // Thought bubble: animated dots above the coworker until the first token arrives
    public showNpcThinking(name: NpcName) {
        this.work.cancel(name);
        this.thinking.start(name);
    }

    // Idle muttering (e.g. while working): a grey italic line typed out one character at a time
    // `onDone` fires once the whole line is shown (never if the bubble is hidden or replaced first)
    private showNpcMutter(name: NpcName, text: string, onDone?: () => void) {
        const bubble = this.npcBubbles.get(name);
        if (!bubble) return;
        this.mutterTimers.get(name)?.remove();
        bubble.setStyle({ fontSize: NPC_BUBBLE_FONT, fontStyle: 'italic', color: '#555555', align: 'center' });
        let shown = 1;
        bubble.setText(text.slice(0, shown));
        bubble.setVisible(true);
        this.positionNpcBubble(name);
        if (text.length <= 1) {
            onDone?.();
            return;
        }
        this.mutterTimers.set(name, this.time.addEvent({
            delay: NPC_MUTTER_CHAR_MS,
            repeat: text.length - 2,
            callback: () => {
                bubble.setText(text.slice(0, ++shown));
                this.positionNpcBubble(name);
                if (shown >= text.length) {
                    this.mutterTimers.delete(name);
                    onDone?.();
                }
            }
        }));
    }

    private hideNpcMutterBubble(name: NpcName) {
        this.mutterTimers.get(name)?.remove();
        this.mutterTimers.delete(name);
        this.npcBubbles.get(name)?.setVisible(false);
    }

    // Replaces the bubble with the (partial) reply; call repeatedly while streaming
    public setNpcSpeech(name: NpcName, text: string) {
        const bubble = this.npcBubbles.get(name);
        if (!bubble) return;
        this.work.cancel(name);
        this.thinking.stop(name);
        this.npcTimers.get(name)?.remove();
        this.npcTimers.delete(name);

        // Blank lines only waste space
        const clean = text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
        const prev = this.npcSpeech.get(name);
        // A new reply starts pinned to the bottom; further tokens keep the player's scroll position
        const speech = prev && !prev.done ? prev : { text: '', offset: 0, follow: true, done: false };
        speech.text = clean;
        this.npcSpeech.set(name, speech);
        bubble.setStyle({ fontSize: NPC_BUBBLE_FONT, fontStyle: 'normal', color: '#000000', align: 'left' });
        bubble.setVisible(true);
        this.renderNpcSpeech(name);
    }

    // Reply finished (or failed): leave it up for a while so it can be read and scrolled, then hide
    public finishNpcSpeech(name: NpcName) {
        const speech = this.npcSpeech.get(name);
        if (!speech) return;
        speech.done = true;
        this.scheduleNpcHide(name);
    }

    // Scrolls the visible bubble by `lines` (negative = back up); reaching the bottom resumes auto-follow
    public scrollNpcSpeech(lines: number, name?: NpcName) {
        for (const [key, speech] of this.npcSpeech) {
            if ((name && key !== name) || !this.npcBubbles.get(key)?.visible) continue;
            const max = Math.max(0, this.npcLines(key).length - NPC_BUBBLE_LINES);
            speech.offset = Phaser.Math.Clamp(speech.offset + lines, 0, max);
            speech.follow = speech.offset >= max;
            this.renderNpcSpeech(key);
            this.scheduleNpcHide(key);
        }
    }

    private npcLines(name: NpcName): string[] {
        const bubble = this.npcBubbles.get(name);
        const speech = this.npcSpeech.get(name);
        return bubble && speech ? bubble.getWrappedText(speech.text) : [];
    }

    private renderNpcSpeech(name: NpcName) {
        const bubble = this.npcBubbles.get(name);
        const speech = this.npcSpeech.get(name);
        if (!bubble || !speech) return;
        const lines = this.npcLines(name);
        const max = Math.max(0, lines.length - NPC_BUBBLE_LINES);
        if (speech.follow) speech.offset = max;
        speech.offset = Math.min(speech.offset, max);

        let body = lines.slice(speech.offset, speech.offset + NPC_BUBBLE_LINES).join('\n');
        if (max > 0) {
            // Arrows show which directions can still scroll; the line stays put so the bubble doesn't jump
            const up = speech.offset > 0 ? '▲' : ' ';
            const down = speech.offset < max ? '▼' : ' ';
            body += `\n${up} ${down}`;
        }
        bubble.setText(body);
        this.positionNpcBubble(name);
    }

    private scheduleNpcHide(name: NpcName) {
        this.thinking.stop(name);
        this.npcTimers.get(name)?.remove();
        this.npcTimers.delete(name);
        if (!this.npcSpeech.get(name)?.done) return;
        this.npcTimers.set(name, this.time.delayedCall(NPC_BUBBLE_LINGER_MS, () => {
            this.hideNpcBubble(name);
        }));
    }

    private createNpcBubble() {
        return this.add.text(0, 0, '', {
            fontSize: NPC_BUBBLE_FONT,
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 6, y: 4 },
            wordWrap: { width: NPC_BUBBLE_WIDTH },
            align: 'left'
        }).setOrigin(0.5, 1).setDepth(SPEECH_DEPTH).setVisible(false);
    }

    private positionNpcBubble(name: NpcName) {
        const bubble = this.npcBubbles.get(name);
        const npc = name === 'susan' ? this.susan : this.gloria;
        if (!bubble) return;
        // Keep the bubble inside the canvas horizontally
        const half = bubble.width / 2;
        const x = Phaser.Math.Clamp(npc.x, half, this.mapSize.width - half);
        bubble.setPosition(x, npc.y - npc.displayHeight / 2 - 4);
    }

    private registerAtlasFrames(key: string, frames: Record<string, AtlasFrame>) {
        const texture = this.textures.get(key);
        for (const [name, f] of Object.entries(frames)) {
            if (!texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
        }
    }

    // Builds every tile layer from map.json. Layers whose Tiled "collider" property is true block movement,
    // but only where their tiles are opaque: each tile gets a body fitted to its non-transparent pixels.
    private loadMap() {
        const map = this.make.tilemap({ key: MAP_KEY });
        const tileset = map.addTilesetImage(MAP_TILESET_NAME, MAP_TILESET_KEY);
        if (!tileset) throw new Error(`Tileset "${MAP_TILESET_NAME}" not found in map.json`);
        this.mapSize = { width: map.widthInPixels, height: map.heightInPixels };
        this.physics.world.setBounds(0, 0, this.mapSize.width, this.mapSize.height);

        const pixels = this.readTilesetPixels();
        for (const data of map.layers) {
            const layer = map.createLayer(data.name, tileset, 0, 0);
            if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) continue;
            // Characters can't leave the floor (doorways and empty map edges would otherwise let them walk into the void)
            if (data.name === FLOOR_LAYER) {
                const floor = layer.getTilesWithin(0, 0, map.width, map.height, { isNotEmpty: true });
                if (floor.length > 0) {
                    const x1 = Math.min(...floor.map((t) => t.pixelX));
                    const y1 = Math.min(...floor.map((t) => t.pixelY));
                    const x2 = Math.max(...floor.map((t) => t.pixelX + t.width));
                    const y2 = Math.max(...floor.map((t) => t.pixelY + t.height));
                    this.physics.world.setBounds(x1, y1, x2 - x1, y2 - y1);
                }
            }
            layer.setDepth(TOP_LAYERS.includes(data.name) ? MAP_TOP_DEPTH : MAP_DEPTH);

            this.work.collectTiles(layer, tileset);

            const props = data.properties as { name: string; value: unknown }[] | undefined;
            if (!props?.some((p) => p.name === 'collider' && p.value === true)) continue;
            layer.forEachTile((tile) => {
                if (tile.index < 0) return;
                const box = this.tileOpaqueBounds(tile, tileset, pixels);
                if (!box) return;
                const zone = this.add.zone(tile.pixelX + box.x + box.w / 2, tile.pixelY + box.y + box.h / 2, box.w, box.h);
                this.obstacles.add(zone);
            });
        }
    }

    // Bounds are the map, padded out to the viewport when it is larger so the map sits centred
    private updateCameraBounds() {
        const cam = this.cameras.main;
        // Keep the camera exactly as big as the canvas so following/centring uses the real window size
        cam.setSize(this.scale.width, this.scale.height);
        const w = Math.max(this.mapSize.width, cam.width / cam.zoom);
        const h = Math.max(this.mapSize.height, cam.height / cam.zoom);
        cam.setBounds((this.mapSize.width - w) / 2, (this.mapSize.height - h) / 2, w, h);
    }

    private readTilesetPixels(): ImageData {
        const image = this.textures.get(MAP_TILESET_KEY).getSourceImage() as HTMLImageElement;
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('2D canvas unavailable');
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, image.width, image.height);
    }

    // Bounding box (tile-local px) of a tile's non-transparent pixels, or null if fully transparent
    private tileOpaqueBounds(tile: Phaser.Tilemaps.Tile, tileset: Phaser.Tilemaps.Tileset, pixels: ImageData) {
        let box = this.opaqueBounds.get(tile.index);
        if (box === undefined) {
            const origin = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
            box = null;
            if (origin) {
                let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
                for (let y = 0; y < tile.height; y++) {
                    for (let x = 0; x < tile.width; x++) {
                        const alpha = pixels.data[((origin.y + y) * pixels.width + origin.x + x) * 4 + 3];
                        if (alpha <= 16) continue;
                        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    }
                }
                if (maxX >= 0) box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
            }
            this.opaqueBounds.set(tile.index, box);
        }
        if (!box) return null;
        // Mirror for flipped tiles
        return {
            x: tile.flipX ? tile.width - box.x - box.w : box.x,
            y: tile.flipY ? tile.height - box.y - box.h : box.y,
            w: box.w,
            h: box.h
        };
    }

    private place(name: InteriorFrameName, x: number, y: number, options?: PlaceOptions & { atlas?: 'interior' }): Phaser.GameObjects.Image;
    private place(name: OfficeFrameName, x: number, y: number, options: PlaceOptions & { atlas: 'office' }): Phaser.GameObjects.Image;
    private place(name: FurnitureFrameName, x: number, y: number, options: PlaceOptions & { atlas: 'furniture' }): Phaser.GameObjects.Image;
    private place(name: string, x: number, y: number, { solid, flat, atlas = 'interior' }: PlaceOptions & { atlas?: AtlasChoice } = {}) {
        const key = { interior: INTERIOR_ATLAS_KEY, office: OFFICE_ATLAS_KEY, furniture: FURNITURE_ATLAS_KEY }[atlas];
        if (solid === undefined) {
            const img = this.add.image(x, y, key, name).setScale(SPRITE_SCALE);
            if (flat) img.setDepth(RUG_DEPTH);
            else this.sortByBottom(img);
            return img;
        }

        const sprite = this.obstacles.create(x, y, key, name) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
        sprite.setScale(SPRITE_SCALE).refreshBody();
        // Base-only body, in display pixels, so the top of tall pieces can overlap the player
        const height = solid * SPRITE_SCALE;
        sprite.body.setSize(sprite.displayWidth, height, false);
        sprite.body.setOffset(0, sprite.displayHeight - height);
        this.sortByBottom(sprite);
        return sprite;
    }

    private createCoworker(x: number, y: number, frame: OfficeFrameName) {
        const sprite = this.physics.add.sprite(x, y, OFFICE_ATLAS_KEY, frame);
        sprite.setScale(SPRITE_SCALE);
        // The player can't push them. Not setImmovable(): Arcade skips separation between two immovable
        // bodies, and the static obstacles are immovable, so the coworkers would walk straight through them.
        sprite.body.pushable = false;
        // Feet-only body, in unscaled px like the player's (Arcade scales body size with the sprite)
        const f = OFFICE_FRAMES[frame];
        sprite.body.setSize(f.w - 4, FEET_HEIGHT);
        sprite.body.setOffset(2, f.h - FEET_HEIGHT);
        this.sortByBottom(sprite);
        return sprite;
    }

    private sortByBottom(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
        sprite.setDepth(sprite.y + sprite.displayHeight / 2);
    }

    private updateWalkCue(moving: boolean) {
        if (moving && !this.wobble) {
            this.wobble = this.tweens.add({
                targets: this.player,
                angle: { from: -4, to: 4 },
                duration: 140,
                yoyo: true,
                repeat: -1
            });
        } else if (!moving && this.wobble) {
            this.wobble.remove();
            this.wobble = undefined;
            this.player.setAngle(0);
        }
    }

}
