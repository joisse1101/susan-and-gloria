// The player's work session: idle, fetching a chair (walking to it, dragging it, sitting), walking back to the
// spot after a jammed chair, or working
export type SessionState = 'idle' | 'fetching' | 'walkingBack' | 'working';

export interface SessionInput {
    inZone: boolean; // standing in a work zone (only matters for starting)
    moving: boolean; // a movement key is down (the auto-walk never counts)
    typing: boolean;
    bubble: boolean; // a bubble is up (chat), which blocks starting and cancels a trip
    done: boolean; // a full work period just ended here, so standing still doesn't restart it
    fetched: boolean; // the chair step finished: seated, back at the spot, or there was no chair
    lost: boolean; // the trip was lost (chair taken, blocked, too slow, no way back): no work
    jammed: boolean; // the chair jammed and was let go: work standing at the spot
}

export function nextSession(state: SessionState, i: SessionInput): SessionState {
    switch (state) {
        case 'idle':
            return i.inZone && !i.moving && !i.typing && !i.done && !i.bubble ? 'fetching' : 'idle';
        case 'fetching':
            // Leaving the zone is not a stop: the trip itself leaves it
            if (i.moving || i.typing || i.bubble) return 'idle';
            if (i.lost) return 'idle';
            if (i.jammed) return i.fetched ? 'working' : 'walkingBack';
            return i.fetched ? 'working' : 'fetching';
        case 'walkingBack':
            // The bubble is the make-do line itself, so it is no reason to stop; chat opening counts as typing
            if (i.moving || i.typing || i.lost) return 'idle';
            return i.fetched ? 'working' : 'walkingBack';
        case 'working':
            // The bubble is the player's own work line here, so it is no reason to stop
            return i.moving || i.typing ? 'idle' : 'working';
    }
}
