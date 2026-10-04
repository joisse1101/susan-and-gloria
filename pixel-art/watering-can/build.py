"""Draws the watering can as a held-item overlay on the player's seated typing sheet (WorkSitting.png).

Layout matches WorkSitting.png: 32px cells, one row per direction (down, up, right, left), 2 frames per row, so
the sheet can be drawn at the character's origin and bobs with the hand. Positions are measured from the
player's WorkSitting.png hands: side views hold it at the extended hand (x 22-23, y 20 on frame 0, 22 on frame 1),
the front view at the belly hands (x 15-17, y 23-24). The left view is the right one mirrored (31 - x).
The back view only shows the can's edges peeking past the body: draw that row BEHIND the character, the
other rows in front (the preview does the same).

The can is shared by the player, Susan and Gloria: the side views' hands are identical on all three, and the
front view's belly hands span x 14-17, y 22-24 across them (Gloria's sit one row higher than the others', so
offset her front view by -1 y in code). No hand pixels are baked in; a "hand box" is cleared from the can in
each view so it never paints over a character's hands.

Writes public/assets/sprites/items/WateringCan.png and preview.png (can on the player, zoomed)."""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.abspath(os.path.join(HERE, "../../public/assets/sprites"))
OUT_DIR = os.path.join(SPRITES, "items")
OUT = os.path.join(OUT_DIR, "WateringCan.png")

CELL = 32
OUTLINE = (0x0c, 0x0a, 0x07, 255)
TIN_LIGHT = (0xb4, 0xd2, 0xd6, 255)
TIN = (0x78, 0xa4, 0xb2, 255)
TIN_SHADE = (0x4c, 0x74, 0x8a, 255)
TIN_DARK = (0x34, 0x50, 0x68, 255)
SIDE_HAND_X = 22              # left column of the extended hand in the right view
SIDE_HAND_Y = 20              # its top row on frame 0
SIDE_SWING = 2                # px the hand drops on frame 1 (TYPE_SWING in player-type/build.py)

sheet = Image.new("RGBA", (CELL * 2, CELL * 4), (0, 0, 0, 0))


class Cell:
    """One 32x32 cell: paint() puts pixels, outline() rings everything painted so far."""

    def __init__(self):
        self.img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))

    def paint(self, x0, x1, y0, y1, color):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.img.putpixel((x, y), color)

    def dots(self, points, color):
        for x, y in points:
            self.img.putpixel((x, y), color)

    def clear(self, x0, x1, y0, y1):
        self.paint(x0, x1, y0, y1, (0, 0, 0, 0))

    def outline(self):
        src = self.img.copy()
        for y in range(CELL):
            for x in range(CELL):
                if src.getpixel((x, y))[3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < CELL and 0 <= ny < CELL and src.getpixel((nx, ny))[3]:
                        self.img.putpixel((x, y), OUTLINE)
                        break


def side_cell(frame):
    """Facing right: the hand grips a handle at the back of the can, spout out to the right."""
    c = Cell()
    hy = SIDE_HAND_Y + SIDE_SWING * frame
    hx = SIDE_HAND_X + 2                      # handle bar column, touching the hand's right edge
    bx = hx + 1                               # first body column
    c.paint(bx, bx + 2, hy + 1, hy + 5, TIN)            # body
    c.paint(bx, bx, hy + 1, hy + 5, TIN_LIGHT)          # lit back edge
    c.paint(bx + 2, bx + 2, hy + 1, hy + 5, TIN_SHADE)  # shaded front edge
    c.paint(bx, bx + 2, hy + 5, hy + 5, TIN_DARK)       # base
    c.paint(bx, bx + 2, hy + 1, hy + 1, TIN_LIGHT)      # rim
    c.dots([(bx + 3, hy + 4), (bx + 3, hy + 3), (bx + 4, hy + 3), (bx + 4, hy + 2), (bx + 5, hy + 2)], TIN)   # spout climbing to the right
    c.dots([(bx + 3, hy + 4)], TIN_SHADE)
    c.paint(bx + 6, bx + 6, hy, hy + 3, TIN_LIGHT)      # sprinkler rose, flaring at the tip
    c.dots([(bx + 6, hy + 3)], TIN_SHADE)
    c.paint(hx, hx, hy - 1, hy + 4, TIN_DARK)           # handle: back bar...
    c.paint(hx, bx + 1, hy - 1, hy - 1, TIN_DARK)       # ...and arch over the top
    c.outline()
    c.clear(SIDE_HAND_X, SIDE_HAND_X + 1, hy, hy + 1)   # hand box: the outline must not cover the hand
    return c.img


def front_cell():
    """Facing the camera: held at the belly, handle arching over the hands, spout toward the viewer."""
    c = Cell()
    c.paint(13, 19, 25, 28, TIN)
    c.paint(13, 19, 25, 25, TIN_LIGHT)
    c.paint(13, 14, 25, 28, TIN_LIGHT)
    c.paint(18, 19, 26, 28, TIN_SHADE)
    c.paint(13, 19, 28, 28, TIN_DARK)
    c.paint(16, 18, 26, 27, TIN_LIGHT)        # sprinkler rose, foreshortened
    c.dots([(17, 27)], TIN_SHADE)
    c.paint(14, 17, 21, 21, TIN_DARK)                    # handle arch above the hands...
    c.paint(13, 13, 22, 24, TIN_DARK)                    # ...with a bar down each side of them
    c.paint(18, 18, 22, 24, TIN_DARK)
    c.outline()
    c.clear(14, 17, 22, 24)                              # hand box: the belly hands of all three characters
    return c.img


def back_cell():
    """From behind the can is hidden by the body; only its edges show past the hips."""
    c = Cell()
    c.paint(12, 13, 25, 28, TIN)
    c.paint(19, 20, 25, 28, TIN_SHADE)
    c.paint(12, 13, 28, 28, TIN_DARK)
    c.paint(19, 20, 28, 28, TIN_DARK)
    c.outline()
    return c.img


for frame in range(2):
    cells = [front_cell(), back_cell(), side_cell(frame)]
    cells.append(cells[2].transpose(Image.FLIP_LEFT_RIGHT))
    for row, img in enumerate(cells):
        sheet.paste(img, (frame * CELL, row * CELL))

os.makedirs(OUT_DIR, exist_ok=True)
sheet.save(OUT)

# Preview: can on each character's seated sheet, back row behind the character, the rest in front.
chars = [Image.open(os.path.join(SPRITES, n, "WorkSitting.png")).convert("RGBA") for n in ("player", "susan", "gloria")]
bg = Image.new("RGBA", (sheet.width * 3 + 16, sheet.height), (200, 200, 200, 255))
for i, body_sheet in enumerate(chars):
    # Gloria's belly hands sit one row higher in the front view
    dy = -1 if i == 2 else 0
    for row in range(4):
        box = (0, row * CELL, CELL * 2, (row + 1) * CELL)
        can, body = sheet.crop(box), body_sheet.crop(box)
        layers = (can, body) if row == 1 else (body, can)
        for layer in layers:
            bg.alpha_composite(layer, (i * (sheet.width + 8), row * CELL + (dy if row == 0 and layer is can else 0)))
bg.resize((bg.width * 8, bg.height * 8), Image.NEAREST).save(os.path.join(HERE, "preview.png"))
alone = Image.new("RGBA", sheet.size, (200, 200, 200, 255))
alone.alpha_composite(sheet)
alone.resize((alone.width * 10, alone.height * 10), Image.NEAREST).save(os.path.join(HERE, "preview-can-only.png"))
print("wrote", OUT)
