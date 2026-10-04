import Phaser from 'phaser';
import { CHAIR_DIRECTIONS, FURNITURE_ATLAS_KEY, type FurnitureFrameName } from '../atlases/furnitureAtlas';
import { SPRITE_SCALE } from '../constants';
import { CHAIR_SHADOW_OFFSET_Y, OBJECT_SHADOW_KEY, type Shadows } from '../interaction/Shadows';

type DynamicSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const DRAG = 600;
const MAX_SPEED = 120;
const MIN_TURN_SPEED = 20;
// Time for a rolled chair to stop (it needs MAX_SPEED / drag, about 0.27s for the usual distances), then normal drag returns
const ROLL_MS = 500;
// Pull mode: how close (px between bodies) a chair must be to grab it, and how far it can lag before it lets go
const GRAB_GAP = 8;
const RELEASE_GAP = 16;
// The mover slows to this while pulling so the chair (capped at MAX_SPEED) keeps up
export const PULL_SPEED = MAX_SPEED;
// Feet-only body around the wheels (unscaled px, offset from the frame's top-left)
const BODY = { w: 14, h: 8, offsetX: 9, offsetY: 20 };

// Loose chairs: slid around by whoever walks into them, stopped by walls, furniture and each other.
export class Chairs {
    private scene: Phaser.Scene;
    private shadows: Shadows;
    private group: Phaser.Physics.Arcade.Group;
    private movers: DynamicSprite[] = [];
    private pushing = new Set<DynamicSprite>();
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
        chair.setDrag(DRAG);
        chair.setMaxVelocity(MAX_SPEED);
        chair.body.setSize(BODY.w, BODY.h);
        chair.body.setOffset(BODY.offsetX, BODY.offsetY);
        this.sortByBottom(chair);
        this.shadows.add(chair, { key: OBJECT_SHADOW_KEY, offsetY: CHAIR_SHADOW_OFFSET_Y });
        return chair;
    }

    // `movers` push chairs (they must start with body.pushable = false); `solids` are walls and furniture.
    // A chair jammed against something solid can't be pushed any further: the mover is stopped instead,
    // otherwise walking into it would shove it through the wall.
    collide(movers: DynamicSprite[], solids: Phaser.Physics.Arcade.StaticGroup) {
        const physics = this.scene.physics;
        this.movers = movers;
        // Solids first so a jammed chair is flagged (body.blocked) before the movers are resolved
        physics.add.collider(this.group, solids);
        for (const mover of movers) {
            physics.add.collider(mover, this.group, undefined, (m, c) => this.yieldIfJammed(m as DynamicSprite, c as DynamicSprite));
        }
        physics.add.collider(this.group, this.group, undefined, (a, b) => {
            // A chair pinned against something can't be pushed by another chair either
            const [first, second] = [a as DynamicSprite, b as DynamicSprite];
            first.body.immovable = this.isJammed(second);
            second.body.immovable = this.isJammed(first);
            return true;
        });
        // Again, last: chair-vs-chair pushing may have moved a chair into a wall
        physics.add.collider(this.group, solids);
    }

    update() {
        // yieldIfJammed only makes a mover pushable for one physics step; otherwise it would stay shoveable
        // (into a table) by the player or by other chairs
        for (const mover of this.movers) mover.body.pushable = false;
        this.pushing.clear();
        this.group.getChildren().forEach((chair) => {
            this.faceVelocity(chair as DynamicSprite);
            this.sortByBottom(chair as DynamicSprite);
        });
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

    private isJammed(chair: DynamicSprite) {
        return !chair.body.blocked.none;
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
        chair.body.setDrag((MAX_SPEED * MAX_SPEED) / (2 * distance));
        chair.body.setVelocity(dirX * MAX_SPEED, dirY * MAX_SPEED);
        this.scene.time.delayedCall(ROLL_MS, () => {
            chair.body.setDrag(DRAG);
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

    private yieldIfJammed(mover: DynamicSprite, chair: DynamicSprite) {
        const jammed = this.isJammed(chair);
        if (!jammed) this.pushing.add(mover);
        chair.body.immovable = jammed;
        mover.body.pushable = jammed;
        return true;
    }

    private sortByBottom(sprite: DynamicSprite) {
        sprite.setDepth(sprite.y + sprite.displayHeight / 2);
    }
}
