import Phaser from 'phaser';
import { CHAIR_DIRECTIONS, FURNITURE_ATLAS_KEY, type FurnitureFrameName } from '../atlases/furnitureAtlas';
import { SPRITE_SCALE } from '../constants';
import { CHAIR_SHADOW_OFFSET_Y, OBJECT_SHADOW_KEY, type Shadows } from '../interaction/Shadows';
import { PUSH_HELD, PUSH_SHOVED, PUSH_STOPPED, resolvePush, type PushBody, type Rect } from '../interaction/pushChain';
import { CHAIR_DRAG, CHAIR_MASS, CHAIR_MAX_SPEED, ROLL_MS } from '../pushTuning';

type DynamicSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const MIN_TURN_SPEED = 20;
// Pull mode: how close (px between bodies) a chair must be to grab it, and how far it can lag before it lets go
const GRAB_GAP = 8;
const RELEASE_GAP = 16;
// Feet-only body around the wheels (unscaled px, offset from the frame's top-left)
const BODY = { w: 14, h: 8, offsetX: 9, offsetY: 20 };

export interface GateMover {
    id: string;
    kind: 'player' | 'coworker';
    sprite: DynamicSprite;
    // In an interaction: blocks a push like a wall
    immovable?: boolean;
}

const rectOf = (body: Phaser.Physics.Arcade.Body): Rect => ({ left: body.left, top: body.top, right: body.right, bottom: body.bottom });

// Loose chairs: slid around by whoever walks into them, stopped by walls, furniture and each other.
export class Chairs {
    private scene: Phaser.Scene;
    private shadows: Shadows;
    private group: Phaser.Physics.Arcade.Group;
    private solidRects: Rect[] = [];
    // What the player is pulling: a chair, or a coworker (then heldId is its name)
    private held?: DynamicSprite;
    private heldId?: string;
    private shoved = new Set<string>();
    private playerPushed = new Set<string>();
    // Coworkers let go of after a pull: flagged as shoved at the next gate
    private pendingShove = new Set<string>();
    private claimed = new Set<DynamicSprite>();
    // Chairs being pushed away by whoever got up: they roll backwards without turning to face the way they move
    private rolling = new Set<DynamicSprite>();

    constructor(scene: Phaser.Scene, shadows: Shadows) {
        this.scene = scene;
        this.shadows = shadows;
        this.group = scene.physics.add.group();
    }

    add(x: number, y: number, frame: FurnitureFrameName) {
        const chair = this.group.create(x, y, FURNITURE_ATLAS_KEY, frame) as DynamicSprite;
        chair.setScale(SPRITE_SCALE);
        chair.setCollideWorldBounds(true);
        chair.setDrag(CHAIR_DRAG);
        chair.setMaxVelocity(CHAIR_MAX_SPEED);
        chair.setMass(CHAIR_MASS);
        chair.body.setSize(BODY.w, BODY.h);
        chair.body.setOffset(BODY.offsetX, BODY.offsetY);
        this.sortByBottom(chair);
        this.shadows.add(chair, { key: OBJECT_SHADOW_KEY, offsetY: CHAIR_SHADOW_OFFSET_Y });
        return chair;
    }

    // `movers` push chairs (they must start with body.pushable = false); `solids` are walls and furniture.
    // The Arcade colliders only separate bodies; whether a push is allowed at all is decided each frame in `gate`,
    // which stops any chain that would end up in a wall or furniture before the physics step moves it.
    collide(movers: DynamicSprite[], solids: Phaser.Physics.Arcade.StaticGroup) {
        const physics = this.scene.physics;
        this.solidRects = solids.getChildren().flatMap((child) => {
            const body = (child as Phaser.GameObjects.GameObject).body as Phaser.Physics.Arcade.StaticBody | null;
            if (!body) return [];
            return [{ left: body.position.x, top: body.position.y, right: body.position.x + body.width, bottom: body.position.y + body.height }];
        });
        for (const mover of movers) {
            physics.add.collider(mover, this.group);
        }
        physics.add.collider(this.group, this.group);
        // Safety net only: the gate has already kept pushed chairs out of the solids
        physics.add.collider(this.group, solids);
    }

    update() {
        this.group.getChildren().forEach((chair) => {
            this.faceVelocity(chair as DynamicSprite);
            this.sortByBottom(chair as DynamicSprite);
        });
    }

    // Call last in the frame, after every velocity is set. Asks the push resolver which bodies may move this physics
    // step and zeroes the velocity of any whose push would be blocked: the root of a blocked chain stops, and a pulled
    // body that is blocked is let go of instead. Coworkers get a data flag the frame they are stopped (PUSH_STOPPED),
    // first displaced (PUSH_SHOVED) or let go of after a pull (PUSH_SHOVED), so their route follower replans once.
    // Ids of what the player's push displaced in the last gate (chairs are 'chair<n>'), so they walk at that push speed
    playerPushedIds() {
        return this.playerPushed;
    }

    // What the player is pulling, if anything
    // (a coworker's name, or 'chair')
    heldName(): string | undefined {
        return this.held ? (this.heldId ?? 'chair') : undefined;
    }

    // True if the resolver displaced this coworker in the last gate
    wasShoved(id: string) {
        return this.shoved.has(id);
    }

    gate(movers: GateMover[]) {
        const dt = 1 / this.scene.physics.world.fps;
        const player = movers.find((m) => m.kind === 'player');
        const bodies: PushBody[] = [];
        const sprites = new Map<string, DynamicSprite>();
        for (const m of movers) {
            m.sprite.setData(PUSH_STOPPED, false);
            m.sprite.setData(PUSH_SHOVED, false);
            if (!m.sprite.body.enable) continue;
            const isHeld = m.id === this.heldId;
            // A held body keeps pace with the player, whatever its own steering wanted
            if (isHeld && player) m.sprite.body.setVelocity(player.sprite.body.velocity.x, player.sprite.body.velocity.y);
            const { velocity } = m.sprite.body;
            bodies.push({
                id: m.id,
                kind: m.kind,
                rect: rectOf(m.sprite.body),
                dx: velocity.x * dt,
                dy: velocity.y * dt,
                role: isHeld ? 'trailing' : 'driver',
                playerDriven: isHeld,
                immovable: m.kind === 'coworker' && m.immovable
            });
            sprites.set(m.id, m.sprite);
        }
        const chairIds = new Map<DynamicSprite, string>();
        this.all().forEach((chair, index) => {
            if (!chair.body.enable) return;
            const id = `chair${index}`;
            const isHeld = chair === this.held && this.heldId === undefined;
            chairIds.set(chair, id);
            sprites.set(id, chair);
            if (isHeld && player) chair.body.setVelocity(player.sprite.body.velocity.x, player.sprite.body.velocity.y);
            const { velocity } = chair.body;
            bodies.push({ id, kind: 'chair', rect: rectOf(chair.body), dx: velocity.x * dt, dy: velocity.y * dt, role: isHeld ? 'trailing' : 'coasting', playerDriven: isHeld });
        });

        const result = resolvePush(bodies, [...this.solidRects, ...this.worldEdges()]);
        for (const id of result.blockedX) sprites.get(id)?.body.setVelocityX(0);
        for (const id of result.blockedY) sprites.get(id)?.body.setVelocityY(0);
        for (const id of [...result.blockedX, ...result.blockedY]) {
            const sprite = sprites.get(id);
            if (sprite && !chairIds.has(sprite)) sprite.setData(PUSH_STOPPED, true);
        }
        // A coworker counts as shoved the frame it is first displaced, not every frame a push goes on
        const nowShoved = new Set([...result.pushed.keys()].filter((id) => movers.some((m) => m.id === id)));
        for (const id of nowShoved) if (!this.shoved.has(id)) sprites.get(id)?.setData(PUSH_SHOVED, true);
        // A coworker that shoves the other one stops and replans too
        for (const id of nowShoved) {
            const root = result.pushedBy.get(id);
            if (root && root !== 'player' && !this.shoved.has(id) && movers.some((m) => m.id === root)) sprites.get(root)?.setData(PUSH_SHOVED, true);
        }
        for (const id of this.pendingShove) sprites.get(id)?.setData(PUSH_SHOVED, true);
        this.pendingShove.clear();
        this.shoved = nowShoved;
        this.playerPushed = new Set([...result.pushedBy].filter(([, root]) => root === 'player').map(([id]) => id));

        if (this.held) {
            const id = this.heldId ?? chairIds.get(this.held);
            if (id && result.released.has(id)) this.release();
        }
        movers.forEach((m) => m.sprite.setData(PUSH_HELD, m.id === this.heldId));
    }

    // Let go of whatever is held. A coworker is then shoved once, so it stops and replans from where it ended up.
    private release() {
        const held = this.held;
        if (!held) return;
        held.body.setVelocity(0, 0);
        if (this.heldId !== undefined) {
            held.setData(PUSH_HELD, false);
            this.pendingShove.add(this.heldId);
        }
        this.held = undefined;
        this.heldId = undefined;
    }

    // The edges of the world as thick slabs, so pushing a chair into the edge blocks the chain like a wall
    private worldEdges(): Rect[] {
        const b = this.scene.physics.world.bounds;
        const T = 1000;
        return [
            { left: b.x - T, right: b.x, top: b.y - T, bottom: b.bottom + T },
            { left: b.right, right: b.right + T, top: b.y - T, bottom: b.bottom + T },
            { left: b.x, right: b.right, top: b.y - T, bottom: b.y },
            { left: b.x, right: b.right, top: b.bottom, bottom: b.bottom + T }
        ];
    }

    // Turn toward the push direction; while it coasts to a stop it keeps its last facing
    private faceVelocity(chair: DynamicSprite) {
        if (this.rolling.has(chair)) return;
        const { x, y } = chair.body.velocity;
        if (Math.hypot(x, y) < MIN_TURN_SPEED) return;
        // Screen angle: 0° = east, 90° = south (y points down); frames run S, SE, E, ... counter-clockwise
        const degrees = Phaser.Math.RadToDeg(Math.atan2(y, x));
        const index = (((Math.round((90 - degrees) / 45) % 8) + 8) % 8);
        chair.setFrame(`chair${CHAIR_DIRECTIONS[index]}`);
    }

    // Pull mode (hold shift): grab the nearest chair or free coworker within reach and drag it along with the mover,
    // one at a time, so a chair wedged in a corner can always be dragged back out. `coworkers` are the ones that can
    // be grabbed now (not in an interaction). Returns the body held this step, if any.
    // Call before setting the mover's velocity for the frame; the held body is handled again in `drag` and `gate`.
    grab(mover: DynamicSprite, wantsPull: boolean, coworkers: { id: string; sprite: DynamicSprite }[] = []) {
        if (!wantsPull) {
            this.release();
            return undefined;
        }
        const heldCoworkerFree = this.heldId === undefined || coworkers.some((c) => c.id === this.heldId);
        if (this.held && (!heldCoworkerFree || this.gap(mover, this.held) > RELEASE_GAP)) this.release();
        if (!this.held) {
            let best = GRAB_GAP;
            const candidates: { id?: string; sprite: DynamicSprite }[] = [
                ...this.all().filter((c) => c.body.enable).map((sprite) => ({ sprite })),
                ...coworkers
            ];
            for (const { id, sprite } of candidates) {
                const gap = this.gap(mover, sprite);
                if (gap <= best) {
                    best = gap;
                    this.held = sprite;
                    this.heldId = id;
                }
            }
        }
        return this.held;
    }

    // Make the held body follow the mover's (already set) velocity
    drag(mover: DynamicSprite) {
        if (!this.held) return;
        this.held.body.setVelocity(mover.body.velocity.x, mover.body.velocity.y);
    }

    // Closest chair nobody has claimed whose body centre is within `range` px of (x, y)
    nearest(x: number, y: number, range: number) {
        let best: DynamicSprite | undefined;
        let bestDist = range;
        for (const child of this.group.getChildren()) {
            const chair = child as DynamicSprite;
            if (this.claimed.has(chair)) continue;
            const dist = Phaser.Math.Distance.Between(x, y, chair.body.center.x, chair.body.center.y);
            if (dist <= bestDist) {
                bestDist = dist;
                best = chair;
            }
        }
        return best;
    }

    all() {
        return this.group.getChildren() as DynamicSprite[];
    }

    isClaimed(chair: DynamicSprite) {
        return this.claimed.has(chair);
    }

    // A claimed chair is being taken to a seat, so nobody else goes for it
    claim(chair: DynamicSprite) {
        this.claimed.add(chair);
    }

    unclaim(chair: DynamicSprite) {
        this.claimed.delete(chair);
    }

    // Shove the chair `distance` px along (dirX, dirY), keeping its facing. It coasts to a stop under a temporary
    // drag sized for that distance (v² / 2d), and walls and furniture still stop it short.
    roll(chair: DynamicSprite, dirX: number, dirY: number, distance: number) {
        this.rolling.add(chair);
        chair.body.setDrag((CHAIR_MAX_SPEED * CHAIR_MAX_SPEED) / (2 * distance));
        chair.body.setVelocity(dirX * CHAIR_MAX_SPEED, dirY * CHAIR_MAX_SPEED);
        this.scene.time.delayedCall(ROLL_MS, () => {
            chair.body.setDrag(CHAIR_DRAG);
            this.rolling.delete(chair);
        });
    }

    gap(a: DynamicSprite, b: DynamicSprite) {
        const dx = Math.max(0, a.body.left - b.body.right, b.body.left - a.body.right);
        const dy = Math.max(0, a.body.top - b.body.bottom, b.body.top - a.body.bottom);
        return Math.hypot(dx, dy);
    }

    private sortByBottom(sprite: DynamicSprite) {
        sprite.setDepth(sprite.y + sprite.displayHeight / 2);
    }
}
