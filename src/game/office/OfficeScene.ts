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
    HANDLE_ATLAS_KEY,
    HANDLE_ATLAS_URL,
    FURNITURE_FRAMES,
    type FurnitureFrameName
} from './atlases/furnitureAtlas';
import { Chairs } from './furniture/Chairs';
import { COWORKER_DRAG, COWORKER_MASS, COWORKER_MAX_SPEED, COWORKER_WALK_FRACTION, PLAYER_WALK_SPEED, PULL_CHAIR_SPEED, PULL_COWORKER_SPEED, PUSH_CHAIR_SPEED, PUSH_COWORKER_SPEED } from './pushTuning';
import { NpcSeats } from './interaction/npc/NpcSeats';
import type { AtlasFrame } from './atlases/types';
import { WorkInteraction } from './interaction/npc/WorkInteraction';
import { ThinkingInteraction } from './interaction/npc/ThinkingInteraction';
import { NpcBubbles, type NpcName } from './interaction/npc/NpcBubbles';
import { WALK_SPEED_KEY } from './interaction/npc/PathFollower';
import { Wander } from './interaction/npc/Wander';
import { WalkGrid } from './interaction/npc/WalkGrid';
import { CHAIR_CLEARANCE_CELLS } from './chairTuning';
import { WalkGridOverlay } from './interaction/npc/WalkGridOverlay';
import { ChairReachOverlay } from './interaction/npc/ChairReachOverlay';
import { Chat } from './interaction/player/Chat';
import { PlayerWork } from './interaction/player/PlayerWork';
import {
    PLAYER_BODY,
    PLAYER_IDLE_KEY,
    GLORIA_SPRITE,
    SUSAN_SPRITE,
    animKey,
    createCharacterAnims,
    createPlayerAnims,
    preloadCharacterSprite,
    preloadPlayerSprite,
    typeAnimKey,
    type CharacterSprite,
    type Facing
} from './interaction/player/playerSprite';
import { FACING } from './interaction/npc/facing';
import { Shadows } from './interaction/Shadows';
import { loadOfficeMap, preloadOfficeMap } from './map/loadOfficeMap';
import { CAMERA_ZOOM, FEET_HEIGHT, FEET_LIFT, RUG_DEPTH, SMALL_MAP_SHIFT_Y, SPEECH_DEPTH, SPRITE_SCALE } from './constants';

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
    private shadows!: Shadows;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private facing: Facing = 'down';
    private chat!: Chat;
    private sayHandler?: (text: string) => boolean;
    private wander!: Wander;
    private playerWork!: PlayerWork;
    private npcSeats!: NpcSeats;
    private chairReach!: ChairReachOverlay;
    private walkGrid!: WalkGrid;
    // Same obstacles, but a cell only counts when a chair fits around it: the pull is planned on this one
    private clearGrid!: WalkGrid;

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
        this.load.image(HANDLE_ATLAS_KEY, HANDLE_ATLAS_URL);
        preloadPlayerSprite(this);
        Shadows.preload(this);
        preloadCharacterSprite(this, SUSAN_SPRITE);
        preloadCharacterSprite(this, GLORIA_SPRITE);
        preloadOfficeMap(this);
    }

    create() {
        this.registerAtlasFrames(OFFICE_ATLAS_KEY, OFFICE_FRAMES);
        this.registerAtlasFrames(INTERIOR_ATLAS_KEY, INTERIOR_FRAMES);
        this.registerAtlasFrames(FURNITURE_ATLAS_KEY, FURNITURE_FRAMES);
        this.registerAtlasFrames(HANDLE_ATLAS_KEY, FURNITURE_FRAMES);

        this.chat = new Chat(this, {
            scrollNpcSpeech: (lines) => this.bubbles.scroll(lines),
            say: (text) => this.debugCommand(text) || (this.sayHandler?.(text) ?? true)
        });

        // 1. OBSTACLES: Group for static walls/desks
        this.obstacles = this.physics.add.staticGroup();
        this.work = new WorkInteraction(this, {
            npc: (name) => (name === 'susan' ? this.susan : this.gloria),
            say: (name, text, onDone) => this.bubbles.mutter(name, text, onDone),
            hideBubble: (name) => this.bubbles.hideMutter(name),
            isBusy: (name) => this.bubbles.isVisible(name),
            fetchChair: (name) => this.npcSeats.ready(name),
            releaseChair: (name) => this.npcSeats.release(name),
            walkGrid: () => this.walkGrid,
            isPlayerStillIn: (z) => {
                const { x, y } = this.player.body.center;
                const idle = this.player.body.velocity.lengthSq() === 0; // walking through doesn't occupy a desk
                return idle && x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
            },
            chairBumped: (name) => this.npcSeats.hasBumped(name)
        });
        this.thinking = new ThinkingInteraction(this, {
            bubble: (name) => this.bubbles.get(name),
            positionBubble: (name) => this.bubbles.position(name),
            styleThought: (bubble) => this.bubbles.styleThought(bubble)
        });
        this.mapSize = loadOfficeMap(this, this.obstacles, (layer, tileset) => this.work.collectTiles(layer, tileset));
        // this.work.drawZones(SPEECH_DEPTH - 1); // TODO: some button or env to toggle show
        // Static solids are all in place now, so the walkable grid is built once here. Press G to show it (green = walkable, red = blocked)
        this.walkGrid = new WalkGrid(this.physics.world.bounds, this.obstacles);
        this.clearGrid = new WalkGrid(this.physics.world.bounds, this.obstacles, CHAIR_CLEARANCE_CELLS);
        new WalkGridOverlay(this, this.walkGrid, SPEECH_DEPTH - 1, 'G', () => this.chat.isTyping);
        // Press H to show where a dragged chair fits (green), where only a coworker does (yellow) and what is blocked (red)
        new WalkGridOverlay(this, this.walkGrid, SPEECH_DEPTH - 1, 'H', () => this.chat.isTyping, this.clearGrid);

        // Pieces: place(name, centreX, centreY, { solid, flat, atlas }). Names live in interiorAtlas.ts; for officeAtlas.ts names pass atlas: 'office'
        // To add an object: pick a frame name, a position in canvas px (640x416), and solid (collision height in px) if it should block the player.
        // this.place('bookshelfA', 400, 140, { solid: 10 }); // leave this here for reference

        // 2. AVATARS: Player & Coworkers
        createPlayerAnims(this);
        createCharacterAnims(this, SUSAN_SPRITE);
        createCharacterAnims(this, GLORIA_SPRITE);
        this.player = this.physics.add.sprite(300, 300, PLAYER_IDLE_KEY);
        this.player.setScale(SPRITE_SCALE);
        this.shadows = new Shadows(this);
        this.shadows.add(this.player, { hideWhen: () => this.npcSeats.isSeated('player') });
        // Feet-only body so the head can overlap objects behind
        this.player.body.setSize(PLAYER_BODY.width, FEET_HEIGHT);
        this.player.body.setOffset(PLAYER_BODY.offsetX, this.player.height - FEET_HEIGHT - FEET_LIFT);

        this.playerWork = new PlayerWork(this, {
            player: this.player,
            bubble: this.chat.bubble,
            isInWorkZone: (sprite) => this.work.isInZone(sprite),
            claimDesk: () => this.work.claimFor('player', this.player),
            releaseDesk: () => this.work.releaseFor('player'),
            isTyping: () => this.chat.isTyping,
            fetchChair: () => {
                // The spot and facing are only read when the trip starts, while the player is still in the zone
                const target = this.work.spotAndFacing(this.player);
                return this.npcSeats.ready('player', target?.facing ?? this.facing, target?.spot);
            },
            releaseChair: () => this.npcSeats.release('player'),
            gaveUp: () => this.npcSeats.hasGivenUp('player')
        });

        this.player.body.pushable = false; // chairs move out of its way, not the other way round
        this.chairs = new Chairs(this, this.shadows);
        this.chairs.add(450, 300, 'chairS');
        this.chairs.add(260, 380, 'chairSE');
        this.chairs.add(330, 380, 'chairW');
        this.npcSeats = new NpcSeats(this, this.chairs, (name) => (name === 'player' ? this.player : name === 'susan' ? this.susan : this.gloria), () => this.walkGrid, () => this.clearGrid);
        // Press C to show which chairs a coworker working at each desk can reach, and why the others are filtered out
        this.chairReach = new ChairReachOverlay(this, {
            spots: () => this.work.workSpots(),
            targets: () => this.work.targets(),
            chairs: () => this.chairs.all().filter((c) => c.active).map((c) => ({ x: c.body.center.x, y: c.body.center.y, claimed: this.chairs.isClaimed(c) })),
            grid: () => this.walkGrid,
            clearGrid: () => this.clearGrid
        }, SPEECH_DEPTH - 1, 'C', () => this.chat.isTyping);

        this.gloria = this.createSheetCoworker(GLORIA_SPRITE, 170, 150);
        this.susan = this.createSheetCoworker(SUSAN_SPRITE, 475, 151);
        this.bubbles = new NpcBubbles(this, {
            npc: (name) => (name === 'susan' ? this.susan : this.gloria),
            mapWidth: () => this.mapSize.width,
            cancelWork: (name) => this.work.cancel(name),
            stopThinking: (name) => this.thinking.stop(name)
        });

        this.wander = new Wander(this, {
            updateWork: (name) => this.work.update(name),
            isBusy: (name) => this.bubbles.isVisible(name)
        }, this.walkGrid);

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
            // Debug: press B to make the player's current or next chair trip fail as if blocked (the chat box can't be
            // open then, since a trip stops while typing)
            this.input.keyboard.on('keydown-B', () => {
                if (!this.chat.isTyping) this.npcSeats.forceBlock('player');
            });
        }
    }

    override update() {
        // Coworkers not in an interaction can be pushed and pulled; one that is blocks like a wall
        const free = (['gloria', 'susan'] as const).filter((name) => !this.isImmovable(name));
        const coworkers = free.map((name) => ({ id: name, sprite: this.npcSprite(name) }));
        // A shoved coworker coasts on under COWORKER_DRAG; otherwise it only moves when something sets its velocity
        const coasting = new Map<NpcName, Phaser.Math.Vector2>();
        for (const name of ['gloria', 'susan'] as const) {
            const npc = this.npcSprite(name);
            npc.body.pushable = !this.isImmovable(name);
            if (this.chairs.wasShoved(name) && !this.isImmovable(name)) coasting.set(name, npc.body.velocity.clone());
            npc.setVelocity(0);
        }
        const pulling = !this.chat.isTyping && !this.playerWork.isFetching() && this.cursors.shift.isDown && !!this.chairs.grab(this.player, true, coworkers);
        if (!pulling) this.chairs.grab(this.player, false);
        // Each thing being pushed or pulled sets a speed (its kind's, held to the coworker's own max); the slowest wins
        const coworkerCap = (id: string) => (id in COWORKER_MAX_SPEED ? COWORKER_MAX_SPEED[id as NpcName] : Infinity);
        const held = this.chairs.heldName();
        const speeds = [
            ...(pulling ? [held === 'chair' ? PULL_CHAIR_SPEED : Math.min(PULL_COWORKER_SPEED, coworkerCap(held ?? ''))] : []),
            ...[...this.chairs.playerPushedIds()].map((id) => (id.startsWith('chair') ? PUSH_CHAIR_SPEED : Math.min(PUSH_COWORKER_SPEED, coworkerCap(id))))
        ];
        const speed = speeds.length > 0 ? Math.min(...speeds) : PLAYER_WALK_SPEED;
        this.player.setVelocity(0);

        // A movement key is the player taking control: it cancels the chair trip, whose own walking is not "moving"
        const keyMoving = !this.chat.isTyping && (this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown);
        if (!this.chat.isTyping) {
            if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
            else if (this.cursors.right.isDown) this.player.setVelocityX(speed);

            if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
            else if (this.cursors.down.isDown) this.player.setVelocityY(speed);
        }

        this.player.body.velocity.normalize().scale(speed);
        if (pulling) this.chairs.drag(this.player);

        this.playerWork.update(keyMoving); // during a chair trip this sets the velocity
        const moving = this.player.body.velocity.lengthSq() > 0;
        this.updatePlayerAnim(moving);

        this.sortByBottom(this.player);
        this.npcSeats.update('player');
        this.updateNpc('gloria', this.gloria);
        this.updateNpc('susan', this.susan);
        const dt = 1 / this.physics.world.fps;
        for (const [name, residual] of coasting) {
            const npc = this.npcSprite(name);
            if (npc.body.velocity.lengthSq() > 0) continue;
            const speed = Math.max(0, residual.length() - COWORKER_DRAG * dt);
            if (speed > 0) npc.setVelocity((residual.x / residual.length()) * speed, (residual.y / residual.length()) * speed);
        }
        this.shadows.update();
        this.chairReach.update();
        // Last, once every velocity is set: stop any push that would end up in a wall or furniture
        this.chairs.gate([{ id: 'player', kind: 'player', sprite: this.player }, { id: 'gloria', kind: 'coworker', sprite: this.gloria, immovable: this.isImmovable('gloria') }, { id: 'susan', kind: 'coworker', sprite: this.susan, immovable: this.isImmovable('susan') }]);
        this.chairs.update(); // after the wander: it clears the "pushing a chair" flags they read
        this.chat.bubble.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 4);
    }

    private npcSprite(name: NpcName) {
        return name === 'susan' ? this.susan : this.gloria;
    }

    // In an interaction: a bubble is up (noticed, thinking, talking), or it has reached its desk (fetching a chair,
    // seated, working). Derived each frame, so it cannot go stale. Walking to a desk is still pushable.
    private isImmovable(name: NpcName) {
        return this.bubbles.isVisible(name) || this.work.isAtDesk(name) || this.npcSeats.isSeated(name);
    }

    // Chat commands, handled here instead of being sent to the coworkers: "/gloria-work" and "/susan-work"
    // make that coworker head for a work desk now. True when the line was a command.
    private debugCommand(text: string) {
        const match = /^\/*(gloria|susan)-work$/i.exec(text.trim());
        if (!match) return false;
        this.work.forceVisit(match[1].toLowerCase() as NpcName);
        return true;
    }

    private updateNpc(name: NpcName, npc: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        this.wander.update(name, npc);
        this.updateSheetAnim(npc, name === 'susan' ? SUSAN_SPRITE : GLORIA_SPRITE);
        this.sortByBottom(npc);
        this.npcSeats.update(name);
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

    // Same feet-only body as the player: the coworkers' sheets share the player's cell layout
    private createSheetCoworker(character: CharacterSprite, x: number, y: number) {
        const sprite = this.physics.add.sprite(x, y, `${character.name}-idle`);
        sprite.setScale(SPRITE_SCALE);
        this.shadows.add(sprite, { hideWhen: () => this.npcSeats.isSeated(character.name as NpcName) });
        sprite.setMass(COWORKER_MASS);
        const max = COWORKER_MAX_SPEED[character.name as NpcName];
        sprite.body.setMaxVelocity(max);
        sprite.setData(WALK_SPEED_KEY, max * COWORKER_WALK_FRACTION);
        sprite.body.setSize(PLAYER_BODY.width, FEET_HEIGHT);
        sprite.body.setOffset(PLAYER_BODY.offsetX, sprite.height - FEET_HEIGHT - FEET_LIFT);
        this.sortByBottom(sprite);
        return sprite;
    }

    private updateSheetAnim(npc: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, character: CharacterSprite) {
        const { x, y } = npc.body.velocity;
        const moving = x !== 0 || y !== 0;
        let facing: Facing = npc.getData(FACING) ?? 'down';
        if (moving) {
            if (Math.abs(x) >= Math.abs(y)) facing = x < 0 ? 'left' : 'right';
            else facing = y < 0 ? 'up' : 'down';
            npc.setData(FACING, facing);
        }
        if (!moving && this.work.isWorking(character.name as NpcName)) {
            if (character.type) {
                npc.anims.play(typeAnimKey(facing, character.name), true);
                return;
            }
            // Working: hold the idle animation's first frame instead of looping it
            if (npc.anims.isPlaying || !npc.anims.currentAnim?.key.includes('-idle-')) {
                npc.anims.play(animKey('idle', facing, character.name));
                npc.anims.stop();
            }
            return;
        }
        npc.anims.play(animKey(moving ? 'walk' : 'idle', facing, character.name), true);
    }

    private sortByBottom(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
        sprite.setDepth(sprite.y + sprite.displayHeight / 2);
    }

    private updatePlayerAnim(moving: boolean) {
        const { x, y } = this.player.body.velocity;
        if (x !== 0) this.facing = x < 0 ? 'left' : 'right';
        else if (y !== 0) this.facing = y < 0 ? 'up' : 'down';
        if (!moving && this.playerWork.isWorking()) {
            if (this.npcSeats.isSeated('player')) {
                this.facing = this.player.getData(FACING) ?? this.facing; // the way they sat down, facing the desk
                this.player.anims.play(typeAnimKey(this.facing), true);
                return;
            }
            // Standing work (no chair, or gave up on it): hold the idle animation's first frame
            const key = animKey('idle', this.facing);
            if (this.player.anims.currentAnim?.key !== key || this.player.anims.isPlaying) {
                this.player.anims.play(key);
                this.player.anims.stop();
            }
            return;
        }
        this.player.anims.play(animKey(moving ? 'walk' : 'idle', this.facing), true);
    }

}
