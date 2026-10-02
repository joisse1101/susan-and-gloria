"""Derives Susan's and Gloria's seated typing sheets (Type.png) from their Idle.png.

Same layout as the player's Type.png (pixel-art/player-type/build.py): 32px cells, one row per direction
(down, up, right, left), 2 frames per row. Both characters are drawn nearly front-on in every direction, so
one recipe serves all of them: the body from Idle frame 0 sinks SIT_DROP px, the legs/skirt hem from the
first LEG_ROW down stay planted, and the hands move off the sides onto the torso, alternating up and down.
The back row has no visible hands, so the outer sleeve columns lift alternately instead."""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(HERE, "../../public/assets/sprites")

CELL = 32
SIT_DROP = 2                  # px the body sinks onto the chair
HAND = (0xe4, 0xb5, 0xa5, 255)
HAND_SHADE = (0xc9, 0x8f, 0x82, 255)
OUTLINE = (0x0c, 0x0a, 0x07, 255)
# Side views copy the player's Type.png: both arms reach out to the right, the near hand (sleeve, then skin)
# and the shaded far hand moving on opposite beats
ARM_X = 19                    # columns from here on are the redrawn arm
NEAR_SLEEVE_X = 15            # the near sleeve starts at the shoulder, crossing the buttons (x=16-17 in this view)
TYPE_SWING = 2                # px each hand travels between the two frames
FAR_X = 19                    # left column of the shaded hand
NEAR_HAND = (0xe4, 0xb5, 0xa5, 255)
NEAR_HAND_LIGHT = (0xe4, 0xb5, 0xa5, 255)
FAR_HAND = (0xb0, 0x84, 0x78, 255)

CHARACTERS = {
    # sleeve: jacket colour that replaces the hands at the sides; leg_row: first row kept planted from Idle
    "susan": {"sleeve": (0x8e, 0x24, 0x34, 255), "leg_row": 26},
    # "gloria": {"sleeve": (0x24, 0x47, 0x3a, 255), "leg_row": 27},  # not wired up yet
}


def cell(img, row):
    return img.crop((0, row * CELL, CELL, (row + 1) * CELL))


def lift_columns(img, columns, rows):
    """Move the given columns' pixels in `rows` up one px, filling the vacated bottom pixel with the one below it."""
    px = img.load()
    rows = list(rows)
    for x in columns:
        col = [px[x, y] for y in rows + [rows[-1] + 1]]
        for i, y in enumerate(rows):
            px[x, y] = col[i + 1]


def tuck_arms(body, sleeve):
    """Front and back: as in the player's sheet the arms are pulled in against the torso, so the hanging arms
    (and their hands) are replaced by straight sides: outline at x=10 and 21, sleeve colour between."""
    px = body.load()
    for y in (22, 23):
        for x in range(0, CELL):
            if px[x, y][3] and (x <= 12 or x >= 19):
                px[x, y] = (0, 0, 0, 0)
        for x in range(11, 21):
            if not px[x, y][3]:
                px[x, y] = sleeve
        px[10, y] = px[21, y] = OUTLINE


def front_hands(body, frame):
    """Hands meet low on the belly like the player's: a wide row, then a narrow one that swaps sides each frame."""
    px = body.load()
    for x, c in zip(range(14, 18), (HAND, HAND_SHADE, HAND_SHADE, HAND)):
        px[x, 21] = c
    for x, c in zip((16, 17) if frame == 0 else (14, 15), (HAND_SHADE, HAND) if frame == 0 else (HAND, HAND_SHADE)):
        px[x, 22] = c


def side_hands(body, sleeve, frame):
    """Facing right (arms already tucked): draws the near arm and the shaded far hand as in the player's sheet."""
    px = body.load()

    def rect(x0, x1, y0, y1, color):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px[x, y] = color

    hy = 19 - TYPE_SWING // 2 + TYPE_SWING * frame
    rect(NEAR_SLEEVE_X, 21, hy, hy + 1, sleeve)
    rect(22, 23, hy, hy + 1, NEAR_HAND)
    fy = 20 - TYPE_SWING // 2 + TYPE_SWING * (1 - frame)
    rect(FAR_X, FAR_X + 1, fy, fy + 1, FAR_HAND)


def build(name, cfg):
    idle = Image.open(os.path.join(SPRITES, name, "Idle.png")).convert("RGBA")
    sheet = Image.new("RGBA", (CELL * 2, CELL * 4), (0, 0, 0, 0))
    leg_row = cfg["leg_row"]
    for frame in range(2):
        for row in range(4):
            # Rows: 0 down, 1 up, 2 right, 3 left
            flip = row == 3   # the left view is the right view mirrored, so draw it facing right and flip back
            src = cell(idle, row)
            if flip:
                src = src.transpose(Image.FLIP_LEFT_RIGHT)
            body = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            body.paste(src.crop((0, 0, CELL, leg_row)), (0, 0))
            if row == 1:
                tuck_arms(body, cfg["sleeve"])
                lift_columns(body, (11, 12) if frame == 0 else (19, 20), rows=range(20, 24))
            elif row == 0:
                tuck_arms(body, cfg["sleeve"])
                front_hands(body, frame)
            else:
                tuck_arms(body, cfg["sleeve"])
                side_hands(body, cfg["sleeve"], frame)
            out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            out.alpha_composite(body, (0, SIT_DROP))
            out.alpha_composite(src.crop((0, leg_row, CELL, CELL)), (0, leg_row))
            sheet.paste(out.transpose(Image.FLIP_LEFT_RIGHT) if flip else out, (frame * CELL, row * CELL))

    path = os.path.abspath(os.path.join(SPRITES, name, "Type.png"))
    sheet.save(path)
    bg = Image.new("RGBA", sheet.size, (200, 200, 200, 255))
    bg.alpha_composite(sheet)
    bg.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(HERE, f"{name}-preview.png"))
    print("wrote", path)


for name, cfg in CHARACTERS.items():
    build(name, cfg)
