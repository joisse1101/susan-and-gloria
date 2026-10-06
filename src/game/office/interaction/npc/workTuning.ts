// Tuning for the work desks. Everything here is meant to be adjusted by hand; distances are px, so they do not
// depend on the map's tile size.

// How far (px) the work zone extends from the desk's edge on a side
export const WORK_RANGE_PX = 24;

// A run of touching work tiles is cut into desks at most this many px across on each axis. Keep desks a multiple of
// this, or leave an untagged tile between neighbouring desks, or a run is cut in an unexpected place.
export const MAX_DESK_PX = 32;
