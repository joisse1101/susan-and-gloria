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
import { Chairs, PULL_SPEED } from './furniture/Chairs';
import type { AtlasFrame } from './atlases/types';
import { WorkInteraction } from './interaction/npc/WorkInteraction';
import { ThinkingInteraction } from './interaction/npc/ThinkingInteraction';
import { NpcBubbles, type NpcName } from './interaction/npc/NpcBubbles';
import { Wander } from './interaction/npc/Wander';
import { Chat } from './interaction/player/Chat';
import { PlayerWork } from './interaction/player/PlayerWork';
import { loadOfficeMap, preloadOfficeMap } from './map/loadOfficeMap';
import { CAMERA_ZOOM, FEET_HEIGHT, RUG_DEPTH, SMALL_MAP_SHIFT_Y, SPRITE_SCALE } from './constants';

interface PlaceOptions {
    // Height (unscaled px) of the collision body measured up from the object's base; omit for no collision
    solid?: number;
    // Lies on the floor (rugs): drawn under characters instead of depth-sorted
    flat?: boolean;
}

export type { NpcName };

// Which spritesheet a frame name comes from. Some names (plant, windowA) exist in both, so it is explicit.
type AtlasChoice = 'interior' | 'office' | 'furniture';

export class OfficeScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private gloria!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private susan!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private work!: WorkInteraction;
    private thinking!: ThinkingInteraction;
    private bubbles!: NpcBubbles;
    private mapSize = { width: 0, height: 0 };
    private obstacles!: Phaser.Physics.Arcade.StaticGroup;
    private chairs!: Chairs;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wobble?: Phaser.Tweens.Tween;
    private chat!: Chat;
    private sayHandler?: (text: string) => boolean;
    private wander!: Wander;
    private playerWork!: PlayerWork;

    // Set by OfficeGame before create() runs, so it lives here rather than on Chat
    public setSayHandler(handler: (text: string) => boolean) {
        this.sayHandler = handler;
    }

    constructor() {
        super('OfficeScene');
    }

    preload() {
        this.load.image(OFFICE_ATLAS_KEY, OFFICE_ATLAS_URL);
        this.load.image(INTERIOR_ATLAS_KEY, INTERIOR_ATLAS_URL);
        this.load.image(FURNITURE_ATLAS_KEY, FURNITURE_ATLAS_URL);
        preloadOfficeMap(this);
    }

    create() {
        this.registerAtlasFrames(OFFICE_ATLAS_KEY, OFFICE_FRAMES);
        this.registerAtlasFrames(INTERIOR_ATLAS_KEY, INTERIOR_FRAMES);
        this.registerAtlasFrames(FURNITURE_ATLAS_KEY, FURNITURE_FRAMES);

        this.chat = new Chat(this, {
            scrollNpcSpeech: (lines) => this.bubbles.scroll(lines),
            say: (text) => this.sayHandler?.(text) ?? true
        });

        // 1. OBSTACLES: Group for static walls/desks
        this.obstacles = this.physics.add.staticGroup();
        this.work = new WorkInteraction(this, {
            npc: (name) => (name === 'susan' ? this.susan : this.gloria),
            say: (name, text, onDone) => this.bubbles.mutter(name, text, onDone),
            hideBubble: (name) => this.bubbles.hideMutter(name),
            isBusy: (name) => this.bubbles.isVisible(name)
        });
        this.thinking = new ThinkingInteraction(this, {
            bubble: (name) => this.bubbles.get(name),
            positionBubble: (name) => this.bubbles.position(name),
            styleThought: (bubble) => this.bubbles.styleThought(bubble)
        });
        this.mapSize = loadOfficeMap(this, this.obstacles, (layer, tileset) => this.work.collectTiles(layer, tileset));
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
            bubble: this.chat.bubble,
            isInWorkZone: (sprite) => this.work.isInZone(sprite),
            isTyping: () => this.chat.isTyping
        });

        this.player.body.pushable = false; // chairs move out of its way, not the other way round
        this.chairs = new Chairs(this);
        this.chairs.add(450, 300, 'chairS');
        this.chairs.add(260, 380, 'chairSE');
        this.chairs.add(330, 380, 'chairW');

        this.gloria = this.createCoworker(170, 150, 'gloria');
        this.susan = this.createCoworker(475, 160, 'susan');
        this.bubbles = new NpcBubbles(this, {
            npc: (name) => (name === 'susan' ? this.susan : this.gloria),
            mapWidth: () => this.mapSize.width,
            cancelWork: (name) => this.work.cancel(name),
            stopThinking: (name) => this.thinking.stop(name)
        });

        this.wander = new Wander(this, {
            updateWork: (name) => this.work.update(name),
            isBusy: (name) => this.bubbles.isVisible(name),
            isPushingChair: (npc) => this.chairs.isPushing(npc)
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
        }
    }

    override update() {
        const pulling = !this.chat.isTyping && this.cursors.shift.isDown && !!this.chairs.grab(this.player, true);
        if (!pulling) this.chairs.grab(this.player, false);
        const speed = pulling ? PULL_SPEED : 160;
        this.player.setVelocity(0);

        if (!this.chat.isTyping) {
            if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
            else if (this.cursors.right.isDown) this.player.setVelocityX(speed);

            if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
            else if (this.cursors.down.isDown) this.player.setVelocityY(speed);
        }

        this.player.body.velocity.normalize().scale(speed);
        if (pulling) this.chairs.drag(this.player);

        const vx = this.player.body.velocity.x;
        if (vx !== 0) this.player.setFlipX(vx < 0);

        const moving = this.player.body.velocity.lengthSq() > 0;
        this.updateWalkCue(moving);
        this.playerWork.update(moving);

        this.sortByBottom(this.player);
        this.updateNpc('gloria', this.gloria);
        this.updateNpc('susan', this.susan);
        this.chairs.update(); // after the wander: it clears the "pushing a chair" flags they read
        this.chat.bubble.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 4);
    }

    private updateNpc(name: NpcName, npc: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        this.wander.update(name, npc);
        this.sortByBottom(npc);
        this.bubbles.position(name);
    }

    // "!" over a coworker: they noticed the player speaking, before anyone is chosen to answer
    public showNpcNotice(name: NpcName) {
        this.bubbles.notice(name);
    }

    public hideNpcBubble(name: NpcName) {
        this.bubbles.hide(name);
    }

    // Thought bubble: animated dots above the coworker until the first token arrives
    public showNpcThinking(name: NpcName) {
        this.work.cancel(name);
        this.thinking.start(name);
    }

    public setNpcSpeech(name: NpcName, text: string) {
        this.bubbles.setSpeech(name, text);
    }

    public finishNpcSpeech(name: NpcName) {
        this.bubbles.finishSpeech(name);
    }

    public scrollNpcSpeech(lines: number, name?: NpcName) {
        this.bubbles.scroll(lines, name);
    }

    private registerAtlasFrames(key: string, frames: Record<string, AtlasFrame>) {
        const texture = this.textures.get(key);
        for (const [name, f] of Object.entries(frames)) {
            if (!texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
        }
    }

    // Bounds are the map, padded out to the viewport when it is larger so the map sits centred
    private updateCameraBounds() {
        const cam = this.cameras.main;
        // Keep the camera exactly as big as the canvas so following/centring uses the real window size
        cam.setSize(this.scale.width, this.scale.height);
        const w = Math.max(this.mapSize.width, cam.width / cam.zoom);
        const h = Math.max(this.mapSize.height, cam.height / cam.zoom);
        // Only when the map is smaller than the viewport on that axis, nudge it up from dead centre
        const shiftY = h > this.mapSize.height ? SMALL_MAP_SHIFT_Y : 0;
        cam.setBounds((this.mapSize.width - w) / 2, (this.mapSize.height - h) / 2 + shiftY, w, h);
    }

    protected place(name: InteriorFrameName, x: number, y: number, options?: PlaceOptions & { atlas?: 'interior' }): Phaser.GameObjects.Image;
    protected place(name: OfficeFrameName, x: number, y: number, options: PlaceOptions & { atlas: 'office' }): Phaser.GameObjects.Image;
    protected place(name: FurnitureFrameName, x: number, y: number, options: PlaceOptions & { atlas: 'furniture' }): Phaser.GameObjects.Image;
    protected place(name: string, x: number, y: number, { solid, flat, atlas = 'interior' }: PlaceOptions & { atlas?: AtlasChoice } = {}) {
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
