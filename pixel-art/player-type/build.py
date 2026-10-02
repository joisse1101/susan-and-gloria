"""Derives the player's seated typing sheet (Type.png) from the asset-pack Idle.png and Shoot.png.

Layout matches the other player sheets: 32px cells, one row per direction (down, up, right, left),
2 frames per row. Head and torso come from Shoot.png frame 0 (arms already in front of the body, gun
removed) and sink SIT_DROP px; the lower legs come from Idle.png so the player reads as seated. The
hands alternate up/down between the two frames: side views redraw the extended hand, front/back
views lift one side's arm column."""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PLAYER = os.path.join(HERE, "../../public/assets/sprites/player")
OUT = os.path.abspath(os.path.join(PLAYER, "Type.png"))

CELL = 32
SIT_DROP = 2                  # px the upper body sinks onto the chair
UPPER_END = 23                # last row of head + torso in both source sheets
LEG_ROWS = range(26, CELL)    # lower legs, feet and shadow, taken from Idle and left planted
OUTLINE = (0x0c, 0x0a, 0x07, 255)
SKIN = (0xd2, 0xa3, 0x94, 255)
SKIN_FAR = (0xb0, 0x84, 0x78, 255)   # the far hand is shaded, as if behind the near one
SKIN_LIGHT = (0xe4, 0xb5, 0xa5, 255)
SLEEVE = (0x3a, 0x2b, 0x28, 255)
ARM_X = 19                    # side views: columns from here on are the redrawn arm
TYPE_SWING = 2                # side views: px each hand travels between the two frames (1 = subtle, 2+ = exaggerated)
FAR_X = 19                    # left column of the shaded hand; larger = further forward, towards the extended hand
HEAD_END = 17                 # last head row; heads come from Idle (Shoot's has a muzzle-flash spark)
GUN = {(0x92, 0x92, 0x91, 255), (0x81, 0x81, 0x7d, 255)}
PANTS = (0x42, 0x50, 0x59, 255)

idle = Image.open(os.path.join(PLAYER, "Idle.png")).convert("RGBA")
shoot = Image.open(os.path.join(PLAYER, "Shoot.png")).convert("RGBA")
sheet = Image.new("RGBA", (CELL * 2, CELL * 4), (0, 0, 0, 0))


def cell(img, row, flip=False):
    c = img.crop((0, row * CELL, CELL, (row + 1) * CELL))
    return c.transpose(Image.FLIP_LEFT_RIGHT) if flip else c


def side_upper(row, flip, frame):
    """Side view facing right (a left view is built flipped): both arms out in front, near hand up on frame 0
    and down on frame 1. Everything from ARM_X rightwards is cleared (Shoot's gun and arm) and redrawn, so
    both views share one arm instead of whatever each source sheet happens to have."""
    px = cell(shoot, row, flip).load()
    up = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    o = up.load()
    for y in range(5, UPPER_END + 1):
        for x in range(CELL):
            if px[x, y][3] and px[x, y] not in GUN and not (x >= ARM_X and 16 <= y <= 23):
                o[x, y] = px[x, y]

    def rect(x0, x1, y0, y1, color):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                o[x, y] = color

    # Near arm: sleeve to the cuff at x=21; the hand is 2x2, same as the far one, then skin straight on (no line at the wrist), no outline, so the hand stays small
    hy = 19 - TYPE_SWING // 2 + TYPE_SWING * frame
    rect(ARM_X, 21, hy, hy + 1, SLEEVE)
    rect(22, 23, hy, hy + 1, SKIN)
    rect(22, 22, hy, hy + 1, SKIN_LIGHT)
    # Shaded hand, drawn over the sleeve: skin straight on the dark jacket (no outline), on the opposite beat
    fy = 20 - TYPE_SWING // 2 + TYPE_SWING * (1 - frame)
    rect(FAR_X, FAR_X + 1, fy, fy + 1, SKIN_FAR)
    return up


def front_upper(row, frame):
    """Front view: the hands meet in front of the torso (gun swapped for skin); one side lifts per frame."""
    up = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    px = cell(shoot, row).load()
    o = up.load()
    for y in range(5, UPPER_END + 1):
        for x in range(CELL):
            c = px[x, y]
            if not c[3]:
                continue
            o[x, y] = (PANTS if y >= 23 else SKIN) if c in GUN else c
    lift_columns(up, (15,) if frame == 0 else (17,), rows=(21, 22))
    return up


def back_upper(row, frame):
    """Back view: arms are hidden, so the elbows bob instead (outer sleeve columns lift alternately)."""
    up = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    px = cell(shoot, row).load()
    o = up.load()
    for y in range(5, UPPER_END + 1):
        for x in range(CELL):
            if px[x, y][3]:
                o[x, y] = px[x, y]
    lift_columns(up, (11, 12) if frame == 0 else (19, 20), rows=range(19, 23))
    return up


def lift_columns(img, columns, rows):
    """Move the given columns' pixels in `rows` up one px, filling the vacated bottom pixel with the one below it."""
    px = img.load()
    rows = list(rows)
    for x in columns:
        col = [px[x, y] for y in rows + [rows[-1] + 1]]
        for i, y in enumerate(rows):
            px[x, y] = col[i + 1]


for frame in range(2):
    for row in range(4):
        # Rows: 0 down, 1 up, 2 right, 3 left
        if row == 0:
            upper = front_upper(row, frame)
        elif row == 1:
            upper = back_upper(row, frame)
        else:
            upper = side_upper(row, flip=(row == 3), frame=frame)
            if row == 3:
                upper = upper.transpose(Image.FLIP_LEFT_RIGHT)
        head = cell(idle, row).crop((0, 0, CELL, HEAD_END + 1))
        for y in range(5, HEAD_END + 1):
            for x in range(CELL):
                upper.putpixel((x, y), head.getpixel((x, y)))
        out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        out.alpha_composite(upper, (0, SIT_DROP))
        legs = cell(idle, row).crop((0, LEG_ROWS.start, CELL, CELL))
        out.alpha_composite(legs, (0, LEG_ROWS.start))
        sheet.paste(out, (frame * CELL, row * CELL))

sheet.save(OUT)
bg = Image.new("RGBA", sheet.size, (200, 200, 200, 255))
bg.alpha_composite(sheet)
bg.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(HERE, "preview.png"))
print("wrote", OUT)
