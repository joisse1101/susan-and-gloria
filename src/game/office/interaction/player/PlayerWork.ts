import Phaser from 'phaser';
import { FORGETFUL_PHRASES, WORK_DURATION_MS, WORK_PHRASE_MS, WORK_PHRASES } from '../workPhrases';
import { nextSession, type SessionState } from './playerSession';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

// What the interaction needs from the scene that owns the player
export interface PlayerWorkHost {
    player: Sprite;
    bubble: Phaser.GameObjects.Text;
    isInWorkZone(sprite: Sprite): boolean;
    // Mark the desk the player stands at as in use (if nobody holds it) / free it again, so coworkers don't pick it
    claimDesk(): void;
    releaseDesk(): void;
    isTyping(): boolean;
    // Called every frame of the chair trip: walks, drags and seats the player. True once they can work (seated, or no
    // chair in reach); until then it has set the player's velocity.
    fetchChair(): boolean;
    // Stopped: the chair, if any, is left where it is
    releaseChair(): void;
    // True once if the trip was given up (blocked, or too slow) since this was last asked
    gaveUp(): boolean;
}

// The player works like the coworkers: standing still in a work zone starts it (a chair trip first, when one is in
// reach); a movement key or typing stops it. The trip may leave the zone without ending the session.
export class PlayerWork {
    private state: SessionState = 'idle';
    private timer?: Phaser.Time.TimerEvent;
    // Set after a full work period, so standing still in the zone doesn't restart it
    private done = false;

    private scene: Phaser.Scene;
    private host: PlayerWorkHost;

    constructor(scene: Phaser.Scene, host: PlayerWorkHost) {
        this.scene = scene;
        this.host = host;
    }

    // Call every frame. `keyMoving`: a movement key is down (the trip's own walking is not the player moving).
    update(keyMoving: boolean) {
        const { host } = this;
        const inZone = host.isInWorkZone(host.player);
        if (!inZone && this.state === 'idle') this.done = false;
        const input = {
            inZone,
            moving: keyMoving,
            typing: host.isTyping(),
            bubble: host.bubble.visible,
            done: this.done,
            fetched: false
        };
        const prev = this.state;
        let next = nextSession(prev, input);
        if (prev === 'idle' && next === 'fetching') host.claimDesk();
        if (next === 'fetching' && host.fetchChair()) next = nextSession('fetching', { ...input, fetched: true });
        this.state = next;
        if (prev !== 'idle' && next === 'idle') this.stop();
        else if (prev !== 'working' && next === 'working') this.startWork();
    }

    private startWork() {
        const { bubble } = this.host;
        const forgot = this.host.gaveUp();
        if (forgot) {
            // Gave up on the chair: a forgetful line first, so the sudden stop reads as natural
            bubble.setStyle({ fontStyle: 'italic', color: '#555555' });
            bubble.setText(Phaser.Utils.Array.GetRandom(FORGETFUL_PHRASES));
            bubble.setVisible(true);
        }
        const endAt = this.scene.time.now + WORK_DURATION_MS;
        this.timer = this.scene.time.addEvent({
            delay: WORK_PHRASE_MS * 2,
            loop: true,
            startAt: forgot ? 0 : WORK_PHRASE_MS * 2, // fire the first phrase right away, unless the forgetful line is up
            callback: () => {
                if (this.scene.time.now >= endAt) {
                    this.done = true;
                    this.stop();
                    return;
                }
                bubble.setStyle({ fontStyle: 'italic', color: '#555555' });
                bubble.setText(Phaser.Utils.Array.GetRandom(WORK_PHRASES));
                bubble.setVisible(true);
            }
        });
    }

    // Working, not just fetching a chair
    isWorking() {
        return this.state === 'working';
    }

    isFetching() {
        return this.state === 'fetching';
    }

    private stop() {
        const { bubble } = this.host;
        this.timer?.remove();
        this.timer = undefined;
        this.state = 'idle';
        this.host.releaseDesk();
        this.host.releaseChair();
        bubble.setStyle({ fontStyle: 'normal', color: '#000000' });
        if (!this.host.isTyping()) bubble.setVisible(false);
    }
}
