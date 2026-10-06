import { createContext } from 'react';

/** One requestAnimationFrame loop for every preview, so they all stay in step and pausing one clock is one place. */
export class Clock {
    private subs = new Set<(ms: number) => void>();
    private raf = 0;
    private t0 = 0;

    start() {
        this.t0 = performance.now();
        const tick = (now: number) => {
            const ms = now - this.t0;
            this.subs.forEach((fn) => fn(ms));
            this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
    }

    stop() {
        cancelAnimationFrame(this.raf);
    }

    subscribe(fn: (ms: number) => void) {
        this.subs.add(fn);
        return () => { this.subs.delete(fn); };
    }
}

export const ClockContext = createContext<Clock | null>(null);
