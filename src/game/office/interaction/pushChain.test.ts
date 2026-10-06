import { describe, expect, it } from 'vitest';
import { resolvePush, type PushBody, type Rect } from './pushChain';

const box = (x: number, y: number, w = 10, h = 10): Rect => ({ left: x, top: y, right: x + w, bottom: y + h });
const body = (id: string, kind: PushBody['kind'], rect: Rect, extra: Partial<PushBody> = {}): PushBody => ({
    id,
    kind,
    rect,
    dx: 0,
    dy: 0,
    role: 'coasting',
    ...extra
});
const player = (rect: Rect, dx: number, dy = 0) => body('player', 'player', rect, { role: 'driver', dx, dy });
const wall = box(100, 0, 10, 100);

describe('resolvePush chains', () => {
    it('lets the player push a single chair', () => {
        const r = resolvePush([player(box(0, 0), 2), body('c1', 'chair', box(10, 0))], []);
        expect(r.blockedX.size).toBe(0);
        expect(r.pushed.get('c1')).toEqual({ dx: 2, dy: 0 });
    });

    it('pushes chair into chair', () => {
        const r = resolvePush([player(box(0, 0), 2), body('c1', 'chair', box(10, 0)), body('c2', 'chair', box(20, 0))], []);
        expect(r.blockedX.size).toBe(0);
        expect(r.pushed.get('c1')?.dx).toBe(2);
        expect(r.pushed.get('c2')?.dx).toBe(2);
    });

    it('stops the driver when a chair is against a wall', () => {
        const r = resolvePush([player(box(80, 0), 2), body('c1', 'chair', box(90, 0))], [wall]);
        expect(r.blockedX.has('player')).toBe(true);
        expect(r.pushed.size).toBe(0);
    });

    it('stops the whole chain and the driver when the far chair is against a wall', () => {
        const r = resolvePush([player(box(70, 0), 2), body('c1', 'chair', box(80, 0)), body('c2', 'chair', box(90, 0))], [wall]);
        expect(r.blockedX.has('player')).toBe(true);
        expect(r.pushed.size).toBe(0);
    });

    it('slides along a wall: a diagonal push into a corner only loses the blocked axis', () => {
        const corner = box(100, 0, 10, 100);
        const r = resolvePush([player(box(80, 40), 2, 2), body('c1', 'chair', box(90, 40))], [corner]);
        expect(r.blockedX.has('player')).toBe(true);
        expect(r.blockedY.has('player')).toBe(false);
    });

    it('does not let a pushed chair end up overlapping a corner', () => {
        const floor = box(0, 20, 100, 10);
        const r = resolvePush([player(box(0, 0), 2, 2), body('c1', 'chair', box(5, 10))], [floor]);
        expect(r.blockedY.has('player')).toBe(true);
    });

    it('stops a coworker pushed against a desk', () => {
        const r = resolvePush([player(box(80, 0), 2), body('susan', 'coworker', box(90, 0))], [wall]);
        expect(r.blockedX.has('player')).toBe(true);
    });

    it('leaves something behind the mover alone', () => {
        const r = resolvePush([player(box(10, 0), 2), body('c1', 'chair', box(0, 0))], []);
        expect(r.pushed.size).toBe(0);
        expect(r.blockedX.size).toBe(0);
    });
});

describe('resolvePush drivers', () => {
    it('a coasting chair does not push a coworker', () => {
        const chair = body('c1', 'chair', box(0, 0), { dx: 2 });
        const r = resolvePush([chair, body('susan', 'coworker', box(10, 0))], []);
        expect(r.blockedX.has('c1')).toBe(true);
        expect(r.pushed.size).toBe(0);
    });

    it('a chair pushed by the player pushes a coworker', () => {
        const r = resolvePush([player(box(-10, 0), 2), body('c1', 'chair', box(0, 0)), body('susan', 'coworker', box(10, 0))], []);
        expect(r.blockedX.size).toBe(0);
        expect(r.pushed.get('susan')?.dx).toBe(2);
    });

    it('a pulled chair pushes a coworker like a pushed one', () => {
        const held = body('c1', 'chair', box(0, 0), { role: 'trailing', playerDriven: true, dx: 2 });
        const r = resolvePush([held, body('susan', 'coworker', box(10, 0))], []);
        expect(r.released.size).toBe(0);
        expect(r.pushed.get('susan')?.dx).toBe(2);
    });

    it('a coworker pushes chairs and one coworker directly', () => {
        const gloria = body('gloria', 'coworker', box(0, 0), { role: 'driver', dx: 1 });
        const r = resolvePush([gloria, body('c1', 'chair', box(10, 0)), body('c2', 'chair', box(20, 0))], []);
        expect(r.pushed.get('c1')?.dx).toBe(1);
        const other = resolvePush([gloria, body('susan', 'coworker', box(10, 0))], []);
        expect(other.pushed.get('susan')?.dx).toBe(1);
    });

    it('a coworker does not push another coworker through a chair', () => {
        const gloria = body('gloria', 'coworker', box(0, 0), { role: 'driver', dx: 1 });
        const r = resolvePush([gloria, body('c1', 'chair', box(10, 0)), body('susan', 'coworker', box(20, 0))], []);
        expect(r.blockedX.has('gloria')).toBe(true);
        expect(r.pushed.size).toBe(0);
    });

    it('an immovable coworker blocks like a wall', () => {
        const r = resolvePush([player(box(0, 0), 2), body('susan', 'coworker', box(10, 0), { immovable: true })], []);
        expect(r.blockedX.has('player')).toBe(true);
    });

    it('never pushes the player', () => {
        const gloria = body('gloria', 'coworker', box(0, 0), { role: 'driver', dx: 1 });
        const r = resolvePush([gloria, body('player', 'player', box(10, 0))], []);
        expect(r.blockedX.has('gloria')).toBe(true);
    });

    it('releases a blocked trailing chair without blocking its driver', () => {
        const held = body('c1', 'chair', box(90, 20), { role: 'trailing', playerDriven: true, dx: 2 });
        const r = resolvePush([player(box(60, 0), -2), held], [wall]);
        expect(r.released.has('c1')).toBe(true);
        expect(r.blockedX.size).toBe(0);
    });

    it('keeps coworkers and chairs out of a keep-out area the player may enter', () => {
        const area = box(-50, 0, 50, 100);
        const player_ = resolvePush([player(box(0, 0), -2)], [], [area]);
        expect(player_.blockedX.size).toBe(0);
        const gloria = resolvePush([body('gloria', 'coworker', box(0, 0), { role: 'driver', dx: -2 })], [], [area]);
        expect(gloria.blockedX.has('gloria')).toBe(true);
        const chair = resolvePush([player(box(10, 0), -2), body('c1', 'chair', box(0, 0))], [], [area]);
        expect(chair.blockedX.has('player')).toBe(true);
    });
});
