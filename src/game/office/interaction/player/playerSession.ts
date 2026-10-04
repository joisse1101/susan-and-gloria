// The player's work session: idle, fetching a chair (walking to it, dragging it, sitting), or working
export type SessionState = 'idle' | 'fetching' | 'working';

export interface SessionInput {
    inZone: boolean; // standing in a work zone (only matters for starting)
    moving: boolean; // a movement key is down (the auto-walk never counts)
    typing: boolean;
    bubble: boolean; // a bubble is up (chat), which blocks starting and cancels a trip
    done: boolean; // a full work period just ended here, so standing still doesn't restart it
    fetched: boolean; // the chair step finished: seated, or there was no chair
}

export function nextSession(state: SessionState, i: SessionInput): SessionState {
    switch (state) {
        case 'idle':
            return i.inZone && !i.moving && !i.typing && !i.done && !i.bubble ? 'fetching' : 'idle';
        case 'fetching':
            // Leaving the zone is not a stop: the trip itself leaves it
            if (i.moving || i.typing || i.bubble) return 'idle';
            return i.fetched ? 'working' : 'fetching';
        case 'working':
            // The bubble is the player's own work line here, so it is no reason to stop
            return i.moving || i.typing ? 'idle' : 'working';
    }
}
