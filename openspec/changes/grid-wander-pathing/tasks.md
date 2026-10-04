## 1. Walkable grid

- [ ] 1.1 Add a grid module that builds 8x8 px cells over the map from the map collision rects and solid `obstacles`, and add a toggleable debug overlay drawn over the map (green = walkable cell, red = blocked cell, in the style of the commented-out `drawZones` call), then verify red cells match the furniture and walls
- [ ] 1.2 Mark a cell walkable only if it and its left and right neighbours are free (3 wide, 1 tall), and verify with the overlay that gaps under 24 px show red
- [ ] 1.3 Build the grid once in `OfficeScene` after `loadOfficeMap` and verify it exists before the first wander update

## 2. Pathfinding

- [ ] 2.1 Flood-fill the reachable cells from a start cell, and verify a walled-off cell is not returned
- [ ] 2.2 Implement A* with 8-direction movement, no corner cutting, cost 1 / ~1.41 and an octile heuristic, and verify a path around a furniture block is found and stays on walkable cells
- [ ] 2.3 Merge same-direction runs into waypoints, and verify a straight corridor yields one waypoint

## 3. Wander behaviour

- [ ] 3.1 Rewrite `Wander.ts` to pick a random reachable cell from the coworker's `body.center` cell, plan a path and walk the waypoints with normalised velocity, snapping within ~1-2 px of each waypoint; verify in the game that Susan and Gloria walk around furniture without clipping corners
- [ ] 3.2 Update facing for diagonal movement, and verify the sprite faces the way it moves in all eight directions
- [ ] 3.3 Replan from the current cell when blocked by the player or the other coworker (reuse the `blocked`/`touching` check), with a retry cap or short pause to avoid thrashing, and verify standing in a doorway does not make the coworker jitter
- [ ] 3.4 Ignore loose chairs when planning, and verify a coworker can still push a chair along its route
- [ ] 3.5 Verify work-zone walking, chair fetching and standing still under a speech bubble behave as before, and run `npm run build` and `npm run lint` clean

## 4. Optional (revisit only if paths look jagged)

- [ ] 4.1 (Optional) Add line-of-sight path smoothing: drop waypoints when the straight line between two waypoints stays walkable for the full 22 x 8 px footprint; verify diagonal routes have fewer turns and still never clip furniture
