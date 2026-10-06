import Phaser from 'phaser';
import { OfficeScene, type NpcName } from './OfficeScene';

export class OfficeGame {
    private game: Phaser.Game;
    private scene!: OfficeScene;

    // onSay receives each chat line typed in the game; return false if it can't be handled yet
    constructor(container: HTMLElement, onSay: (text: string) => boolean) {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: container,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false // Set to true if you want to see red bounding boxes around obstacles
                }
            },
            pixelArt: true,
            scale: {
                // Canvas follows the container (the window); the scene's camera scrolls the map
                mode: Phaser.Scale.RESIZE,
                width: '100%',
                height: '100%'
            },
            scene: OfficeScene
        };

        this.game = new Phaser.Game(config);

        this.game.events.on('ready', () => {
            this.scene = this.game.scene.getScene('OfficeScene') as OfficeScene;
            this.scene.setSayHandler(onSay);
        });
    }

    public scrollNpcSpeech(lines: number): void {
        this.scene?.scrollNpcSpeech(lines);
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
