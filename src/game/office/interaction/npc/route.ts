import { CELL, type WalkGrid } from './WalkGrid';
import { findPath, nearestReachableCell, nearestWalkableCell, type Cell } from './pathfinding';
import { PathFollower } from './PathFollower';
import type { Rect } from '../zones';

// The A* route from a point (px) to the nearest reachable cell to the rectangle's centre (the rectangle is in tile
// units). The centre may sit on a cell kept clear around a desk or plant, so the goal is the nearest reachable cell to
// it, within `fallbackCells`. `aim` (px) replaces the centre as the point to get near, to come in on a chosen side.
// Null when there is no start, no goal or no route.
export function routeCells(grid: WalkGrid, from: { x: number; y: number }, rect: Rect, tileSize: number, fallbackCells: number, aim?: { x: number; y: number }): { start: Cell; path: Cell[] } | null {
    const start = nearestWalkableCell(grid, Math.floor(from.x / CELL), Math.floor(from.y / CELL));
    if (!start) return null;
    const target = {
        cx: Math.floor((aim?.x ?? ((rect.x0 + rect.x1) / 2) * tileSize) / CELL),
        cy: Math.floor((aim?.y ?? ((rect.y0 + rect.y1) / 2) * tileSize) / CELL)
    };
    const goal = nearestReachableCell(grid, start, target, fallbackCells);
    const path = goal ? findPath(grid, start, goal) : null;
    return path ? { start, path } : null;
}

export function routeToRect(grid: WalkGrid, from: { x: number; y: number }, rect: Rect, tileSize: number, fallbackCells: number, aim?: { x: number; y: number }): PathFollower | null {
    const route = routeCells(grid, from, rect, tileSize, fallbackCells, aim);
    return route ? new PathFollower(route.start, route.path) : null;
}
