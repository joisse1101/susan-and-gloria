import Phaser from 'phaser';
import { OfficeScene, type NpcName } from './OfficeScene';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';

export class OfficeGame {
    private game: Phaser.Game;
    private scene!: OfficeScene;

    constructor(container: HTMLElement) {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: container,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
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
        this.scene?.setTyping(isTyping);
    }

    public showPlayerSpeech(text: string): void {
        if (this.scene) this.scene.displaySpeechBubble(text);
    }

    public showNpcNotice(name: NpcName): void {
        this.scene?.showNpcNotice(name);
    }

    public hideNpcBubble(name: NpcName): void {
        this.scene?.hideNpcBubble(name);
    }

    public showNpcThinking(name: NpcName): void {
        this.scene?.showNpcThinking(name);
    }

    public setNpcSpeech(name: NpcName, text: string): void {
        this.scene?.setNpcSpeech(name, text);
    }

    public finishNpcSpeech(name: NpcName): void {
        this.scene?.finishNpcSpeech(name);
    }

    public destroy(): void {
        this.game.destroy(true);
    }
}
