import Phaser from 'phaser';
import type { Chairs } from '../../furniture/Chairs';
import { SeatLayers, SEAT_BACK, seatFrame, seatPosition } from '../../furniture/SeatLayers';
import type { Facing } from '../player/playerSprite';
import { FACING } from './facing';
import type { NpcName } from './NpcBubbles';

type Npc = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
type Chair = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
// The player gets a chair too, but they don't walk for it: it slides to them where they stand
export type SeatUser = NpcName | 'player';

// A coworker about to work looks for a loose chair this close (px, body centre to body centre): 5 tiles
const FETCH_RANGE = 5 * 32;
const WALK_SPEED = 40;
const SLIDE_SPEED = 50;
// Touching distance (px between bodies) at which they take hold of the chair
const GRAB_GAP = 4;
const GIVE_UP_MS = 10000;
// How far (px) the chair rolls when they get up: half a tile
const PUSH_BACK = 16;

// go: walk to the chair; pull: walk back to the work spot dragging it; slide: it rolls under them;
// seated: working in it; return: gave up, walking back; none: no chair, work standing as usual
type Phase = 'go' | 'pull' | 'slide' | 'seated' | 'return' | 'none';

interface Seating {
    phase: Phase;
    chair?: Chair;
    spot: Phaser.Math.Vector2; // body centre where they work
    facing: Facing;
    since: number;
    seat?: { x: number; y: number };
}

// Coworkers fetch the nearest loose chair, pull it into place and work sitting in it. No chair in reach: they work standing.
export class NpcSeats {
    private scene: Phaser.Scene;
    private chairs: Chairs;
    private npc: (name: SeatUser) => Npc;
    private states = new Map<SeatUser, Seating>();
    private layers = new Map<SeatUser, SeatLayers>();

    constructor(scene: Phaser.Scene, chairs: Chairs, npc: (name: SeatUser) => Npc) {
        this.scene = scene;
        this.chairs = chairs;
        this.npc = npc;
    }

    // Call every frame once the coworker is at their work spot, until it returns true (ready to work).
    // While it returns false it has set their velocity.
    // `facing` overrides which way they sit (the player's facing isn't stored on the sprite).
    ready(name: SeatUser, facing?: Facing): boolean {
        const npc = this.npc(name);
        let s = this.states.get(name);
        if (!s) {
            s = {
                phase: 'none',
                spot: new Phaser.Math.Vector2(npc.body.center.x, npc.body.center.y),
                facing: facing ?? (npc.getData(FACING) as Facing | undefined) ?? 'down',
                since: this.scene.time.now
            };
            const chair = this.chairs.nearest(s.spot.x, s.spot.y, FETCH_RANGE);
            if (chair) {
                this.chairs.claim(chair);
                s.chair = chair;
                s.phase = 'go';
                if (name === 'player') this.beginSlide(npc, s);
            }
            this.states.set(name, s);
        }

        const chair = s.chair;
        if (chair && (s.phase === 'go' || s.phase === 'pull') && this.scene.time.now - s.since > GIVE_UP_MS) {
            this.abandon(s);
        }

        switch (s.phase) {
            case 'go':
                if (this.chairs.gap(npc, chair!) <= GRAB_GAP) s.phase = 'pull';
                else this.walk(npc, chair!.body.center.x, chair!.body.center.y);
                return false;
            case 'pull':
                if (this.arrived(npc, s.spot)) {
                    npc.setVelocity(0);
                    this.beginSlide(npc, s);
                } else {
                    this.walk(npc, s.spot.x, s.spot.y);
                    chair!.body.setVelocity(npc.body.velocity.x, npc.body.velocity.y);
                }
                return false;
            case 'slide': {
                const step = (SLIDE_SPEED * this.scene.game.loop.delta) / 1000;
                const seat = s.seat!;
                const dist = Phaser.Math.Distance.Between(chair!.x, chair!.y, seat.x, seat.y);
                if (dist <= step) {
                    chair!.disableBody(true, true); // the seat layers draw it from now on
                    s.phase = 'seated';
                    return true;
                }
                chair!.setPosition(chair!.x + ((seat.x - chair!.x) / dist) * step, chair!.y + ((seat.y - chair!.y) / dist) * step);
                return false;
            }
            case 'return':
                if (!this.arrived(npc, s.spot)) {
                    this.walk(npc, s.spot.x, s.spot.y);
                    return false;
                }
                npc.setVelocity(0);
                s.phase = 'none';
                return true;
            default:
                return true;
        }
    }

    // They stop working (or were interrupted): the chair stays where they sat
    release(name: SeatUser) {
        const s = this.states.get(name);
        if (!s) return;
        this.states.delete(name);
        this.layers.get(name)?.hide();
        const chair = s.chair;
        if (!chair) return;
        this.chairs.unclaim(chair);
        if (s.phase === 'seated' || s.phase === 'slide') {
            const seat = s.seat!;
            chair.enableBody(true, seat.x, seat.y, true, true);
            chair.setFrame(seatFrame(s.facing));
            // Standing up pushes the chair back, away from the desk they faced
            const back = SEAT_BACK[s.facing];
            this.chairs.roll(chair, back.x, back.y, PUSH_BACK);
            return;
        }
        chair.body.setVelocity(0, 0);
    }

    // Call every frame after the coworker is depth-sorted
    update(name: SeatUser) {
        const s = this.states.get(name);
        const layers = this.layers.get(name) ?? this.layers.set(name, new SeatLayers(this.scene)).get(name)!;
        if (s?.phase === 'seated') layers.show(this.npc(name), s.facing);
        else layers.hide();
    }

    isSeated(name: SeatUser) {
        return this.states.get(name)?.phase === 'seated';
    }

    // Chair at the sitter's feet: from here it is slid by hand, so it can pass through them
    private beginSlide(npc: Npc, s: Seating) {
        const chair = s.chair!;
        chair.body.setVelocity(0, 0);
        npc.setData(FACING, s.facing);
        s.seat = seatPosition(npc.x, npc.y, s.facing);
        chair.setFrame(seatFrame(s.facing));
        chair.body.enable = false;
        s.phase = 'slide';
    }

    private abandon(s: Seating) {
        if (s.chair) {
            this.chairs.unclaim(s.chair);
            s.chair.body.setVelocity(0, 0);
        }
        s.chair = undefined;
        s.phase = 'return';
    }

    private arrived(npc: Npc, spot: Phaser.Math.Vector2) {
        return Phaser.Math.Distance.Between(npc.body.center.x, npc.body.center.y, spot.x, spot.y) <= 2;
    }

    private walk(npc: Npc, x: number, y: number) {
        const v = new Phaser.Math.Vector2(x - npc.body.center.x, y - npc.body.center.y).normalize();
        npc.setVelocity(v.x * WALK_SPEED, v.y * WALK_SPEED);
    }
}
