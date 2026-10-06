export const WALKABLE_COLOR = 0x00ff00;
export const WALKER_ONLY_COLOR = 0xffff00;
export const BLOCKED_COLOR = 0xff0000;
// Free cells outside the office: only the player can use them
export const PLAYER_ONLY_COLOR = 0x00ccff;

export type OverlayRegion = 'office' | 'bathroom';

// The tint of one cell. `clearWalkable` is undefined when no clearance grid is shown (G), else whether a dragged chair fits (H).
// Free cells outside the office are never coworker-walkable, so they get the player-only colour instead of green/yellow.
export function overlayCellColour(walkable: boolean, clearWalkable: boolean | undefined, region: OverlayRegion): number {
    if (!walkable) return BLOCKED_COLOR;
    if (region === 'bathroom') return PLAYER_ONLY_COLOR;
    return clearWalkable === false ? WALKER_ONLY_COLOR : WALKABLE_COLOR;
}
