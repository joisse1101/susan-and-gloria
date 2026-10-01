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
import type { AtlasFrame } from './atlases/types';
import { FEET_HEIGHT, MAP_DEPTH, MAP_TOP_DEPTH, RUG_DEPTH, SPEECH_DEPTH, SPRITE_SCALE } from './constants';

const MAP_KEY = 'officeMap';
const MAP_TILESET_KEY = 'officeTiles';
const MAP_BASE_URL = `${import.meta.env.BASE_URL}assets/map/office/`;
// Name of the tileset inside map.json (as exported from Sprite Fusion)
const MAP_TILESET_NAME = 'spritefusion';
// Tile layers drawn over the characters (everything else is under them)
const TOP_LAYERS: string[] = ["Divider top 2", "Divider 2"];

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

// Which spritesheet a frame name comes from. Some names (plant, windowA) exist in both, so it is explicit.
type AtlasChoice = 'interior' | 'office';

export class OfficeScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private gloria!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    private susan!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    private mapLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    private obstacles!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private speechText!: Phaser.GameObjects.Text;
    private wobble?: Phaser.Tweens.Tween;
    private npcBubbles = new Map<NpcName, Phaser.GameObjects.Text>();
    private npcTimers = new Map<NpcName, Phaser.Time.TimerEvent>();
    private npcSpeech = new Map<NpcName, { text: string; offset: number; follow: boolean; done: boolean }>();
    public isTyping: boolean = false;

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
        this.load.tilemapTiledJSON(MAP_KEY, `${MAP_BASE_URL}map.json`);
        this.load.image(MAP_TILESET_KEY, `${MAP_BASE_URL}spritesheet.png`);
    }

    create() {
        this.registerAtlasFrames(OFFICE_ATLAS_KEY, OFFICE_FRAMES);
        this.registerAtlasFrames(INTERIOR_ATLAS_KEY, INTERIOR_FRAMES);

        this.speechText = this.add.text(0, 0, '', {
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 6, y: 4 }
        });

        // Adjust origin & hide it initially; depth sits above any y-based sprite depth
        this.speechText.setOrigin(0.5, 1);
        this.speechText.setVisible(false);
        this.speechText.setDepth(SPEECH_DEPTH);

        // 1. OBSTACLES: Group for static walls/desks
        this.obstacles = this.physics.add.staticGroup();
        this.loadMap();

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

        this.gloria = this.createCoworker(208, 150, 'gloria');
        this.susan = this.createCoworker(450, 160, 'susan');
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
        this.physics.add.collider(this.player, this.obstacles); // Stop on placed furniture
        for (const layer of this.mapLayers) this.physics.add.collider(this.player, layer); // Stop on map walls/tables
        this.physics.add.collider(this.player, this.gloria);   // Stop on Gloria
        this.physics.add.collider(this.player, this.susan);    // Stop on Susan

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
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

        this.sortByBottom(this.player);
        this.speechText.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 4);
    }

    public displaySpeechBubble(message: string) {
        this.speechText.setText(message);
        this.speechText.setVisible(true);

        this.time.delayedCall(3000, () => {
            this.speechText.setVisible(false);
        });
    }

    // "!" over a coworker: they noticed the player speaking, before anyone is chosen to answer
    public showNpcNotice(name: NpcName) {
        const bubble = this.npcBubbles.get(name);
        if (!bubble) return;
        this.npcTimers.get(name)?.remove();
        this.npcTimers.delete(name);

        bubble.setStyle({ fontSize: '16px', fontStyle: 'bold', color: '#d00000', align: 'center' });
        bubble.setText('!');
        this.positionNpcBubble(name);
        bubble.setVisible(true);
    }

    public hideNpcBubble(name: NpcName) {
        this.npcTimers.get(name)?.remove();
        this.npcTimers.delete(name);
        this.npcBubbles.get(name)?.setVisible(false);
        this.npcSpeech.delete(name);
    }

    // Thought bubble: animated dots above the coworker until the first token arrives
    public showNpcThinking(name: NpcName) {
        const bubble = this.npcBubbles.get(name);
        if (!bubble) return;
        this.npcTimers.get(name)?.remove();

        const frames = ['.', '..', '...'];
        let i = 0;
        bubble.setStyle({ fontSize: NPC_BUBBLE_FONT, fontStyle: 'italic', color: '#555555', align: 'center' });
        bubble.setText(`(${frames[i]})`);
        this.positionNpcBubble(name);
        bubble.setVisible(true);
        this.npcTimers.set(name, this.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => bubble.setText(`(${frames[++i % frames.length]})`)
        }));
    }

    // Replaces the bubble with the (partial) reply; call repeatedly while streaming
    public setNpcSpeech(name: NpcName, text: string) {
        const bubble = this.npcBubbles.get(name);
        if (!bubble) return;
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
        const x = Phaser.Math.Clamp(npc.x, half, this.scale.width - half);
        bubble.setPosition(x, npc.y - npc.displayHeight / 2 - 4);
    }

    private registerAtlasFrames(key: string, frames: Record<string, AtlasFrame>) {
        const texture = this.textures.get(key);
        for (const [name, f] of Object.entries(frames)) {
            if (!texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
        }
    }

    // Builds every tile layer from map.json. Layers whose Tiled "collider" property is true block the player.
    private loadMap() {
        const map = this.make.tilemap({ key: MAP_KEY });
        const tileset = map.addTilesetImage(MAP_TILESET_NAME, MAP_TILESET_KEY);
        if (!tileset) throw new Error(`Tileset "${MAP_TILESET_NAME}" not found in map.json`);

        for (const data of map.layers) {
            const layer = map.createLayer(data.name, tileset, 0, 0);
            if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) continue;
            layer.setDepth(TOP_LAYERS.includes(data.name) ? MAP_TOP_DEPTH : MAP_DEPTH);

            const props = data.properties as { name: string; value: unknown }[] | undefined;
            if (props?.some((p) => p.name === 'collider' && p.value === true)) {
                layer.setCollisionByExclusion([-1]);
                this.mapLayers.push(layer);
            }
        }
    }

    private place(name: InteriorFrameName, x: number, y: number, options?: PlaceOptions & { atlas?: 'interior' }): Phaser.GameObjects.Image;
    private place(name: OfficeFrameName, x: number, y: number, options: PlaceOptions & { atlas: 'office' }): Phaser.GameObjects.Image;
    private place(name: string, x: number, y: number, { solid, flat, atlas = 'interior' }: PlaceOptions & { atlas?: AtlasChoice } = {}) {
        const key = atlas === 'office' ? OFFICE_ATLAS_KEY : INTERIOR_ATLAS_KEY;
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
        const sprite = this.physics.add.staticSprite(x, y, OFFICE_ATLAS_KEY, frame);
        sprite.setScale(SPRITE_SCALE).refreshBody();
        // Feet-only body, in display pixels (refreshBody resets it to the full sprite, so set it after)
        const feet = FEET_HEIGHT * SPRITE_SCALE;
        sprite.body.setSize(sprite.displayWidth - 4 * SPRITE_SCALE, feet, false);
        sprite.body.setOffset(2 * SPRITE_SCALE, sprite.displayHeight - feet);
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
