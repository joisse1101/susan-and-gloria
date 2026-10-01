import Phaser from 'phaser';
import {
    OFFICE_ATLAS_KEY,
    OFFICE_ATLAS_URL,
    OFFICE_FRAMES,
    type OfficeFrameName
} from './officeAtlas';

// Integer scale keeps art pixels square on the 600x400 canvas
const SPRITE_SCALE = 2;
// Height (unscaled px) of the collision body at a character's feet
const FEET_HEIGHT = 8;
// Above any y-based sprite depth (max canvas height is 400)
const SPEECH_DEPTH = 10000;

export class OfficeGame {
    private game: Phaser.Game;
    private scene!: OfficeScene;

    constructor(container: HTMLElement) {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: container,
            width: 600,
            height: 400,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false // Set to true if you want to see red bounding boxes around obstacles
                }
            },
            pixelArt: true,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: OfficeScene
        };

        this.game = new Phaser.Game(config);

        this.game.events.on('ready', () => {
            this.scene = this.game.scene.getScene('OfficeScene') as OfficeScene;
        });
    }

    public setTyping(isTyping: boolean): void {
        if (this.scene) this.scene.isTyping = isTyping;
    }

    public showPlayerSpeech(text: string): void {
        if (this.scene) this.scene.displaySpeechBubble(text);
    }

    public destroy(): void {
        this.game.destroy(true);
    }
}

class OfficeScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private gloria!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    private susan!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private speechText!: Phaser.GameObjects.Text;
    private wobble?: Phaser.Tweens.Tween;
    public isTyping: boolean = false;

    constructor() {
        super('OfficeScene');
    }

    preload() {
        this.load.image(OFFICE_ATLAS_KEY, OFFICE_ATLAS_URL);
    }

    create() {
        this.registerAtlasFrames();

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
        const staticGroup = this.physics.add.staticGroup();
        for (const x of [200, 400]) {
            const desk = staticGroup.create(x, 80, OFFICE_ATLAS_KEY, 'desk') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
            desk.setScale(SPRITE_SCALE).refreshBody();
            this.sortByBottom(desk);
        }

        // 2. AVATARS: Player & Coworkers
        this.player = this.physics.add.sprite(300, 300, OFFICE_ATLAS_KEY, 'player');
        this.player.setScale(SPRITE_SCALE);
        // Feet-only body so the head can overlap objects behind
        const playerFrame = OFFICE_FRAMES.player;
        this.player.body.setSize(playerFrame.w - 4, FEET_HEIGHT);
        this.player.body.setOffset(2, playerFrame.h - FEET_HEIGHT);

        this.gloria = this.createCoworker(150, 120, 'gloria');
        this.susan = this.createCoworker(450, 120, 'susan');

        // 3. WORLD COLLISION: Enable solid boundaries
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, staticGroup); // Stop on desks
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

    private registerAtlasFrames() {
        const texture = this.textures.get(OFFICE_ATLAS_KEY);
        for (const [name, f] of Object.entries(OFFICE_FRAMES)) {
            if (!texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
        }
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

    private sortByBottom(sprite: Phaser.GameObjects.Sprite) {
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
