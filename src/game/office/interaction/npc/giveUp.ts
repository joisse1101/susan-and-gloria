// Pure decisions for a chair trip that ends early (no Phaser), so they can be unit tested.

// Why the trip ended: the chair jammed, the walker kept being blocked, the trip took too long, or the player took the chair
export type GiveUpReason = 'jam' | 'blocked' | 'slow' | 'taken';

// What the host is told: 'jam' = they let the chair go and work standing; 'lost' = they cannot get back to work
export type GiveUpSignal = 'jam' | 'lost';

// desk-taken: the desk is occupied, so the usual turned-away behaviour applies (it comes first)
// walk-back: a jam, the walker goes back to the spot (a routed walk) and works standing
// make-do: a jam on or beside the spot, so only the last step onto it is needed
// forget: they cannot get back to work: stop where they are
export type GiveUpOutcome = 'desk-taken' | 'walk-back' | 'make-do' | 'forget';

export function giveUpOutcome(reason: GiveUpReason, atSpot: boolean, routeBack: boolean, deskOccupied: boolean): GiveUpOutcome {
    if (deskOccupied) return 'desk-taken';
    if (reason !== 'jam') return 'forget';
    if (atSpot) return 'make-do';
    return routeBack ? 'walk-back' : 'forget';
}

export const signalOf = (outcome: GiveUpOutcome): GiveUpSignal => (outcome === 'forget' ? 'lost' : 'jam');

// A value that can be read once after it was set, like "did they give up?"
export class ReadOnce<K, V> {
    private values = new Map<K, V>();

    set(key: K, value: V) {
        this.values.set(key, value);
    }

    take(key: K): V | undefined {
        const value = this.values.get(key);
        this.values.delete(key);
        return value;
    }

    clear(key: K) {
        this.values.delete(key);
    }
}
