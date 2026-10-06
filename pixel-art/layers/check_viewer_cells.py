"""Checks the character viewer's cell lists against the build: stacks the cells that src/dev/characters/cells.ts picks
(written by golden.test.ts) and compares each with charlib.composite() for Gloria, pixel for pixel.

    VIEWER_CELLS_DIR=<dir> npx vitest run src/dev/characters/golden.test.ts
    python pixel-art/layers/check_viewer_cells.py <dir>"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image

import charlib
import gloria

cells = json.load(open(os.path.join(sys.argv[1], "cells.json")))
char = gloria.character()
bad = 0
for entry in cells:
    out = Image.new("RGBA", (charlib.CELL, charlib.CELL), (0, 0, 0, 0))
    for c in entry["cells"]:
        sheet = Image.open(os.path.join(charlib.OUT, c["path"])).convert("RGBA")
        piece = sheet.crop((c["sx"], c["sy"], c["sx"] + charlib.CELL, c["sy"] + charlib.CELL))
        out.alpha_composite(piece)
    want = charlib.composite(char, entry["anim"], entry["facing"], entry["frame"])
    if out.tobytes() != want.tobytes():
        bad += 1
        print("MISMATCH", entry["anim"], entry["facing"], entry["frame"])
print(f"{len(cells)} cells checked, {bad} differ")
sys.exit(1 if bad else 0)
