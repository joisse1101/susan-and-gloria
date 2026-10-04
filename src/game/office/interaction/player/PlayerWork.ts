import Phaser from 'phaser';
import type { GiveUpSignal } from '../npc/giveUp';
import { FORGETFUL_PHRASES, JAM_PHRASES, WORK_DURATION_MS, WORK_PHRASE_MS, WORK_PHRASES } from '../workPhrases';
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
    // Once per give-up: 'jam' = the chair jammed and was let go (they walk back to work standing); 'lost' = they
    // cannot get back to work and have stopped
    gaveUp(): GiveUpSignal | undefined;
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
            fetched: false,
            lost: false,
            jammed: false
        };
        const prev = this.state;
        let next = nextSession(prev, input);
        if (prev === 'idle' && next === 'fetching') host.claimDesk();
        let gaveUp: GiveUpSignal | undefined;
        if (next === 'fetching' || next === 'walkingBack') {
            const arrived = host.fetchChair();
            gaveUp = host.gaveUp();
            if (gaveUp === 'stolen') gaveUp = 'jam'; // nobody takes the player's chair, but if it happens they just make do
            next = nextSession(next, { ...input, fetched: arrived, lost: gaveUp === 'lost', jammed: gaveUp === 'jam' });
        }
        this.state = next;
        if (gaveUp === 'lost') this.done = true; // no work: standing still here must not start another trip at once
        if (prev !== 'idle' && next === 'idle') this.stop();
        else if (prev !== 'working' && next === 'working') this.startWork(gaveUp === 'jam');
        if (gaveUp === 'lost') this.say(FORGETFUL_PHRASES, true);
        else if (gaveUp === 'jam') this.say(JAM_PHRASES, next !== 'working');
    }

    // A line in the player's bubble. `hideAfter`: take it down again after a moment (when no work will replace it).
    private say(lines: string[], hideAfter: boolean) {
        const { bubble } = this.host;
        const line = Phaser.Utils.Array.GetRandom(lines);
        bubble.setStyle({ fontStyle: 'italic', color: '#555555' });
        bubble.setText(line);
        bubble.setVisible(true);
        // Walking back and working keep the bubble for their own lines
        if (!hideAfter || this.state === 'walkingBack') return;
        this.scene.time.delayedCall(WORK_PHRASE_MS * 2, () => {
            if (bubble.text === line && this.state === 'idle' && !this.host.isTyping()) {
                bubble.setStyle({ fontStyle: 'normal', color: '#000000' });
                bubble.setVisible(false);
            }
        });
    }

    // `spoke`: the make-do line is up, so the first work phrase waits for it
    private startWork(spoke: boolean) {
        const { bubble } = this.host;
        const forgot = spoke;
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
        return this.state === 'fetching' || this.state === 'walkingBack';
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
