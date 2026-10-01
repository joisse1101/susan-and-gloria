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
const TOP_LAYERS: string[] = [];

interface PlaceOptions {
    // Height (unscaled px) of the collision body measured up from the object's base; omit for no collision
    solid?: number;
    // Lies on the floor (rugs): drawn under characters instead of depth-sorted
    flat?: boolean;
}

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
    public isTyping: boolean = false;

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
        this.place('bookshelfA', 400, 140, { solid: 10 });

        // 2. AVATARS: Player & Coworkers
        this.player = this.physics.add.sprite(300, 300, OFFICE_ATLAS_KEY, 'player');
        this.player.setScale(SPRITE_SCALE);
        // Feet-only body so the head can overlap objects behind
        const playerFrame = OFFICE_FRAMES.player;
        this.player.body.setSize(playerFrame.w - 4, FEET_HEIGHT);
        this.player.body.setOffset(2, playerFrame.h - FEET_HEIGHT);

        this.gloria = this.createCoworker(208, 150, 'gloria');
        this.susan = this.createCoworker(450, 160, 'susan');

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
