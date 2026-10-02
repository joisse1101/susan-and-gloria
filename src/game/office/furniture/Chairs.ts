import Phaser from 'phaser';
import { FURNITURE_ATLAS_KEY, type FurnitureFrameName } from '../atlases/furnitureAtlas';
import { SPRITE_SCALE } from '../constants';

type DynamicSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const DRAG = 600;
const MAX_SPEED = 120;
// Feet-only body around the wheels (unscaled px, offset from the frame's top-left)
const BODY = { w: 14, h: 8, offsetX: 9, offsetY: 20 };

// Loose chairs: slid around by whoever walks into them, stopped by walls, furniture and each other.
export class Chairs {
    private scene: Phaser.Scene;
    private group: Phaser.Physics.Arcade.Group;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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
        return chair;
    }

    // `movers` push chairs (they must start with body.pushable = false); `solids` are walls and furniture.
    // A chair jammed against something solid can't be pushed any further: the mover is stopped instead,
    // otherwise walking into it would shove it through the wall.
    collide(movers: DynamicSprite[], solids: Phaser.Physics.Arcade.StaticGroup) {
        const physics = this.scene.physics;
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
        this.group.getChildren().forEach((chair) => this.sortByBottom(chair as DynamicSprite));
    }

    private isJammed(chair: DynamicSprite) {
        return !chair.body.blocked.none;
    }

    private yieldIfJammed(mover: DynamicSprite, chair: DynamicSprite) {
        const jammed = this.isJammed(chair);
        chair.body.immovable = jammed;
        mover.body.pushable = jammed;
        return true;
    }

    private sortByBottom(sprite: DynamicSprite) {
        sprite.setDepth(sprite.y + sprite.displayHeight / 2);
    }
}
