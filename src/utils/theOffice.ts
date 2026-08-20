import Phaser from 'phaser';

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
    public isTyping: boolean = false;

    constructor() {
        super('OfficeScene');
    }

    preload() {
        const graphics = this.add.graphics();

        // Player texture (Blue square)
        graphics.fillStyle(0x3b82f6, 1);
        graphics.fillRect(0, 0, 32, 32);
        graphics.generateTexture('playerTexture', 32, 32);

        // Top-left obstacle texture (Red cabinet)
        graphics.clear();
        graphics.fillStyle(0xef4444, 1);
        graphics.fillRect(0, 0, 64, 64);
        graphics.generateTexture('topLeftObstacle', 64, 64);

        graphics.fillStyle(0x3b82f6, 1); graphics.fillRect(0, 0, 32, 32); graphics.generateTexture('playerTex', 32, 32); // Blue (Player)
        graphics.clear(); graphics.fillStyle(0xec4899, 1); graphics.fillRect(0, 0, 32, 32); graphics.generateTexture('gloriaTex', 32, 32); // Pink (Gloria)
        graphics.clear(); graphics.fillStyle(0x10b981, 1); graphics.fillRect(0, 0, 32, 32); graphics.generateTexture('susanTex', 32, 32); // Green (Susan)
        graphics.clear(); graphics.fillStyle(0x78350f, 1); graphics.fillRect(0, 0, 80, 40); graphics.generateTexture('deskTex', 80, 40); // Brown (Desk)
    }

    create() {
        this.speechText = this.add.text(0, 0, '', {
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 6, y: 4 }
        });

        // 2. Adjust origin & hide it initially
        this.speechText.setOrigin(0.5, 1);
        this.speechText.setVisible(false);
        this.speechText.setDepth(100);
        
        // 1. OBSTACLES: Group for static walls/desks
        const staticGroup = this.physics.add.staticGroup();
        staticGroup.create(200, 80, 'deskTex'); // Top Desk
        staticGroup.create(400, 80, 'deskTex'); // Second Desk

        // 2. AVATARS: Player & Coworkers
        this.player = this.physics.add.sprite(300, 300, 'playerTex');
        this.gloria = this.physics.add.staticSprite(150, 120, 'gloriaTex');
        this.susan = this.physics.add.staticSprite(450, 120, 'susanTex');

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
        this.speechText.setPosition(this.player.x, this.player.y - 20);

        const speed = 160;
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
        else if (this.cursors.right.isDown) this.player.setVelocityX(speed);

        if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
        else if (this.cursors.down.isDown) this.player.setVelocityY(speed);

        this.player.body.velocity.normalize().scale(speed);
    }

    public displaySpeechBubble(message: string) {
        this.speechText.setText(message);
        this.speechText.setVisible(true);

        this.time.delayedCall(3000, () => {
            this.speechText.setVisible(false);
        });
    }

}