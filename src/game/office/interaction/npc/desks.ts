import { groupTiles, sideStrip, SIDES, splitToMax, type Dir, type GroupCell, type Rect } from '../zones';
import { MAX_DESK_PX, WORK_RANGE_PX } from './workTuning';

export interface DeskSide { dir: Dir; zone: Rect }

// One person's place to work: a run of touching work tiles at most MAX_DESK_PX across, with a strip on each side
export interface Desk {
    id: string; // "x0,y0" of its top-left tile, the key the desk is claimed under
    rect: Rect; // tile units
    // One work strip per side of the desk; only the open ones (see WorkInteraction.openSides) are used
    sides: DeskSide[];
    open?: DeskSide[];
}

// The desks the work tiles make up (the same cell on two layers counts once)
export function buildDesks(cells: GroupCell[], tileSize: number): Desk[] {
    return groupTiles(cells).flatMap((run) => splitToMax(run, MAX_DESK_PX, tileSize)).map(({ id, rect }) => ({
        id,
        rect,
        sides: SIDES.map((dir) => ({ dir, zone: sideStrip(rect, dir, WORK_RANGE_PX, tileSize) }))
    }));
}
