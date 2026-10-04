import Phaser from 'phaser';
import { CHAIR_DIRECTIONS, FURNITURE_ATLAS_KEY, type FurnitureFrameName } from '../atlases/furnitureAtlas';
import { SPRITE_SCALE } from '../constants';
import { CHAIR_SHADOW_OFFSET_Y, OBJECT_SHADOW_KEY, type Shadows } from '../interaction/Shadows';
import { PUSH_STOPPED, resolvePush, type PushBody, type Rect } from '../interaction/pushChain';
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
}

const rectOf = (body: Phaser.Physics.Arcade.Body): Rect => ({ left: body.left, top: body.top, right: body.right, bottom: body.bottom });

// Loose chairs: slid around by whoever walks into them, stopped by walls, furniture and each other.
export class Chairs {
    private scene: Phaser.Scene;
    private shadows: Shadows;
    private group: Phaser.Physics.Arcade.Group;
    private pushing = new Set<DynamicSprite>();
    private solidRects: Rect[] = [];
    private held?: DynamicSprite;
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
            physics.add.collider(mover, this.group, undefined, (m) => {
                this.pushing.add(m as DynamicSprite);
                return true;
            });
        }
        physics.add.collider(this.group, this.group);
        // Safety net only: the gate has already kept pushed chairs out of the solids
        physics.add.collider(this.group, solids);
    }

    update() {
        this.pushing.clear();
        this.group.getChildren().forEach((chair) => {
            this.faceVelocity(chair as DynamicSprite);
            this.sortByBottom(chair as DynamicSprite);
        });
    }

    // Call last in the frame, after every velocity is set. Asks the push resolver which bodies may move this physics
    // step and zeroes the velocity of any whose push would be blocked: the root of a blocked chain stops, and a pulled
    // chair that is blocked is let go of instead. Blocked coworkers are flagged so their route follower replans.
    gate(movers: GateMover[]) {
        const dt = 1 / this.scene.physics.world.fps;
        const bodies: PushBody[] = [];
        const sprites = new Map<string, DynamicSprite>();
        for (const m of movers) {
            m.sprite.setData(PUSH_STOPPED, false);
            if (!m.sprite.body.enable) continue;
            const { velocity } = m.sprite.body;
            bodies.push({ id: m.id, kind: m.kind, rect: rectOf(m.sprite.body), dx: velocity.x * dt, dy: velocity.y * dt, role: 'driver', immovable: m.kind === 'coworker' });
            sprites.set(m.id, m.sprite);
        }
        const chairIds = new Map<DynamicSprite, string>();
        this.all().forEach((chair, index) => {
            if (!chair.body.enable) return;
            const id = `chair${index}`;
            const isHeld = chair === this.held;
            chairIds.set(chair, id);
            sprites.set(id, chair);
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
        if (this.held) {
            const id = chairIds.get(this.held);
            if (id && result.released.has(id)) {
                this.held.body.setVelocity(0, 0);
                this.held = undefined;
            }
        }
        // A held chair that is still held keeps pace with the player, including when the player was stopped
        const player = movers.find((m) => m.kind === 'player');
        if (this.held && player) this.held.body.setVelocity(player.sprite.body.velocity.x, player.sprite.body.velocity.y);
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

    // Pull mode (hold shift): grab the nearest chair within reach and drag it along with the mover, so a chair
    // wedged in a corner can always be dragged back out. Returns the chair held this step, if any.
    // Call before setting the mover's velocity for the frame; the held chair is handled again in `drag`.
    grab(mover: DynamicSprite, wantsPull: boolean) {
        if (!wantsPull) {
            this.held = undefined;
            return undefined;
        }
        if (this.held && this.gap(mover, this.held) > RELEASE_GAP) this.held = undefined;
        if (!this.held) {
            let best = GRAB_GAP;
            for (const child of this.group.getChildren()) {
                const chair = child as DynamicSprite;
                const gap = this.gap(mover, chair);
                if (gap <= best) {
                    best = gap;
                    this.held = chair;
                }
            }
        }
        return this.held;
    }

    // Make the held chair follow the mover's (already set) velocity
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

    // True if the mover is sliding a free chair this step (so contact with it isn't a dead end)
    isPushing(mover: DynamicSprite) {
        return this.pushing.has(mover);
    }

    private sortByBottom(sprite: DynamicSprite) {
        sprite.setDepth(sprite.y + sprite.displayHeight / 2);
    }
}
