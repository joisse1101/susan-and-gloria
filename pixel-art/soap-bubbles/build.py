"""Draws animated soap lather and floating bubbles for the hand-washing interaction, as an overlay on the
characters' standing sheet (WorkStanding.png), like the watering can.

Layout: 32px cells, one row per direction (down, up, right, left), FRAMES columns of animation, so the sheet
is drawn at the character's origin. Unlike the can it has its own 4-frame loop (play it at ~6 fps), not the
actor's 2-frame bob.

Anchors are the standing hands of WorkStanding.png (the can's hands raised by STAND_LIFT): side views hold the
extended hand at x 22-23, y 17-18 (right view; the left view is mirrored, 31 - x), the front view has the belly
hands at x 14-17, y 19-21 (Gloria's sit one row higher: offset her front row by -1 y in code). The back view
only shows bubbles peeking past the hips: draw that row BEHIND the character, the others in front.

Each bubble lives one loop, offset by a phase so they are never in step: dot -> small -> ring (risen) -> pop.
A lather ball hides both hands completely (the bubbles cover them) and wobbles between frames. If the washing pose moves the hands, change the
anchors at the top (HANDS_*), not the drawing code.

Writes public/assets/sprites/items/SoapBubbles.png plus preview.png (on each character, all frames) and
preview-only.png."""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.abspath(os.path.join(HERE, "../../public/assets/sprites"))
OUT_DIR = os.path.join(SPRITES, "items")
OUT = os.path.join(OUT_DIR, "SoapBubbles.png")

CELL = 32
FRAMES = 4
FOAM = (0xf6, 0xfb, 0xfd, 255)
FOAM_SHADE = (0xcd, 0xe6, 0xf1, 255)
RIM = (0x7e, 0xb8, 0xd6, 255)
RIM_DARK = (0x5c, 0xa4, 0xcc, 255)
GLINT = (0xff, 0xff, 0xff, 255)
POP = (0xe0, 0xf4, 0xfa, 255)

# (x, y) top-left of each bubble's 4x4 box at its birth point, and its phase (frame offset in the loop)
FRONT_BUBBLES = (((12, 21), 0), ((19, 21), 2), ((15, 18), 1))
SIDE_BUBBLES = (((25, 18), 0), ((21, 16), 2), ((24, 20), 1))   # right view
BACK_BUBBLES = (((10, 22), 0), ((21, 21), 2))
# Foam covers both hands completely (union of the two bob frames, near + far hand in the side views):
# rows of (y, x0, x1). Front hands x 14-17, y 19-21; side: near hand x 22-23, far hand x 19-20, y 17-21.
FRONT_FOAM = ((18, 15, 17), (19, 14, 18), (20, 14, 18), (21, 14, 18), (22, 15, 17))
SIDE_FOAM = ((16, 21, 24), (17, 20, 25), (18, 19, 25), (19, 19, 25), (20, 19, 25), (21, 19, 24), (22, 20, 23))


def put(img, x, y, color):
    if 0 <= x < CELL and 0 <= y < CELL:
        img.putpixel((x, y), color)


def bubble(img, x, y, stage):
    """Stage 0 dot at birth, 1 small 2x2, 2 round 4x4 ring risen 2px, 3 pop risen 4px."""
    if stage == 0:
        put(img, x + 1, y + 2, RIM)
    elif stage == 1:
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            put(img, x + 1 + dx, y + 1 + dy, RIM)
        put(img, x + 1, y + 1, GLINT)
    elif stage == 2:
        for dx, dy in ((2, 0), (3, 1), (3, 2), (2, 3), (1, 3), (0, 2)):
            put(img, x + dx, y - 2 + dy, RIM_DARK)
        put(img, x + 1, y - 2, GLINT)
        put(img, x, y - 1, GLINT)
    else:
        for dx, dy in ((1, -1), (4, 0), (-1, 1), (5, 2), (0, 4), (4, 4)):
            put(img, x + dx, y - 3 + dy, RIM)


def foam(img, rows, frame):
    """Solid lather ball: lit inside, shaded rim and underside, a few tiny bubbles and a bump that change per frame."""
    pix = {(x, y) for y, x0, x1 in rows for x in range(x0, x1 + 1)}
    top, low = min(y for y, _, _ in rows), max(y for y, _, _ in rows)
    for x, y in pix:
        edge = any((x + dx, y + dy) not in pix for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        put(img, x, y, FOAM_SHADE if edge and (y >= low - 1 or (x + y + frame) % 3 == 0) else FOAM)
    xs = sorted(x for x, _ in pix)
    cx = xs[0] + (xs[-1] - xs[0]) // 2
    put(img, cx - 1 + frame % 3, top - 1, FOAM)                 # bump on top, wanders
    spots = ((-1, 1), (1, 3), (0, 2), (-2, 3), (2, 1), (1, 4))   # (dx from centre, dy from top)
    for k in range(2):
        dx, dy = spots[(frame * 2 + k) % len(spots)]
        put(img, cx + dx, top + dy, RIM)


def cell(foam_px, bubbles, frame):
    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    if foam_px:
        foam(img, foam_px, frame)
    for (x, y), phase in bubbles:
        bubble(img, x, y, (frame + phase) % FRAMES)
    return img


def mirror(bubbles):
    return tuple(((28 - x, y), p) for (x, y), p in bubbles)   # 4px box: 31 - (x + 3)


sheet = Image.new("RGBA", (CELL * FRAMES, CELL * 4), (0, 0, 0, 0))
for frame in range(FRAMES):
    right = cell(SIDE_FOAM, SIDE_BUBBLES, frame)
    rows = [cell(FRONT_FOAM, FRONT_BUBBLES, frame), cell((), BACK_BUBBLES, frame), right,
            right.transpose(Image.FLIP_LEFT_RIGHT)]
    for row, img in enumerate(rows):
        sheet.paste(img, (frame * CELL, row * CELL))
os.makedirs(OUT_DIR, exist_ok=True)
sheet.save(OUT)

GRAY = (200, 200, 200, 255)
SCALE = 8


def preview():
    names = ("player", "susan", "gloria")
    bg = Image.new("RGBA", (CELL * FRAMES * 3 + 16, CELL * 4), GRAY)
    for i, name in enumerate(names):
        body_sheet = Image.open(os.path.join(SPRITES, name, "WorkStanding.png")).convert("RGBA")
        for row in range(4):
            for frame in range(FRAMES):
                box = (frame % 2 * CELL, row * CELL, frame % 2 * CELL + CELL, row * CELL + CELL)
                body = body_sheet.crop(box)
                fx = sheet.crop((frame * CELL, row * CELL, frame * CELL + CELL, row * CELL + CELL))
                at = (i * (CELL * FRAMES + 8) + frame * CELL, row * CELL)
                dy = -1 if (name == "gloria" and row == 0) else 0
                layers = (fx, body) if row == 1 else (body, fx)
                for layer in layers:
                    bg.alpha_composite(layer, (at[0], at[1] + (dy if layer is fx else 0)))
    bg.resize((bg.width * SCALE, bg.height * SCALE), Image.NEAREST).save(os.path.join(HERE, "preview.png"))
    alone = Image.new("RGBA", sheet.size, GRAY)
    alone.alpha_composite(sheet)
    alone.resize((alone.width * 10, alone.height * 10), Image.NEAREST).save(os.path.join(HERE, "preview-only.png"))


preview()
print("wrote", OUT)
