# Manual checklist: the office must be unchanged by the loader refactor

Run `npm run dev`, open `/#/office` (bathroom unloaded), compare against how it played before. Tick every line.

- [ ] Layout and floor look identical (walls, rugs, furniture, no gaps or shifted tiles)
- [ ] Walls and desks block the player
- [ ] Walking into the top strip of a desk/shelf/cabinet fades it and draws it in front; stepping back below its base line draws you in front
- [ ] The top wall and side walls are fully blocking (no walking into them)
- [ ] The bottom room edge (Room Boundary Bottom) stays over everyone and fades when someone is under it
- [ ] Coworkers walk to desks (`/gloria-work`, `/susan-work`), fetch a loose chair, sit and type
- [ ] The plant is watered (`/gloria-water`, `/susan-water`)
- [ ] Pushing and pulling chairs (Shift) and Susan/Gloria works; a chain stops at walls
- [ ] Spawn is random and valid: reload several times, nobody starts in a wall or a sealed pocket
- [ ] **G** tints the walk grid, **H** the clearance grid, **C** chair reach, **P** plant and work zones; all hidden by default
- [ ] While the chat box is focused, G/H/C/P/B do nothing
