import type Phaser from 'phaser';
import { CELL, WalkGrid } from './WalkGrid';

// Test helper: a grid of `cols` x `rows` cells whose solids are given as px rects {x, y, w, h}
export function makeGrid(cols: number, rows: number, solids: { x: number; y: number; w: number; h: number }[] = []) {
    const world = { x: 0, y: 0, right: cols * CELL, bottom: rows * CELL } as Phaser.Geom.Rectangle;
    const children = solids.map((s) => ({ body: { left: s.x, top: s.y, right: s.x + s.w, bottom: s.y + s.h } }));
    return new WalkGrid(world, { getChildren: () => children } as unknown as Phaser.Physics.Arcade.StaticGroup);
}
