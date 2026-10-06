"""Derives Susan's and Gloria's seated typing sheets (WorkSitting.png) from their Idle.png, and the standing
ones (WorkStanding.png, see STANDING) from Idle's tall frame 1.

Same layout as the player's WorkSitting.png (pixel-art/player-type/build.py): 32px cells, one row per direction
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
# Side views copy the player's WorkSitting.png: both arms reach out to the right, the near hand (sleeve, then skin)
# and the shaded far hand moving on opposite beats
ARM_X = 19                    # columns from here on are the redrawn arm
NEAR_SLEEVE_X = 15            # the near sleeve starts at the shoulder, crossing the buttons (x=16-17 in this view)
TYPE_SWING = 2                # px each hand travels between the two frames
FAR_X = 19                    # left column of the shaded hand
NEAR_HAND = (0xe4, 0xb5, 0xa5, 255)
NEAR_HAND_LIGHT = (0xe4, 0xb5, 0xa5, 255)
FAR_HAND = (0xb0, 0x84, 0x78, 255)

# Idle's tall frame 1 is frame 0 with everything above the feet (rows 4-24) one px higher and the legs identical
# from STAND_LEG_ROW down, so a standing sheet is the same recipe on that frame with every y raised STAND_RISE.
# Done one character at a time: only these get a WorkStanding.png so far. stand_leg_row is the first row identical
# in both Idle frames (Gloria's hem row is stretched in the tall frame, so hers is lower); trim_hem clears the
# hanging-hand outline Idle leaves under the tucked arms (Susan's only: Gloria's skirt narrows there).
STANDING = ("susan", "gloria")
STAND_RISE = 1

CHARACTERS = {
    # sleeve: jacket colour filling the tucked arms; leg_row: first row kept planted from Idle;
    # arm_rows: the two rows where the hanging arm sticks out beside the torso; hand_y: top row of the belly hands
    "susan": {"sleeve": (0x8e, 0x24, 0x34, 255), "leg_row": 26, "arm_rows": (22, 23), "hand_y": 21, "stand_leg_row": 25, "trim_hem": True},
    "gloria": {"sleeve": (0x24, 0x47, 0x3a, 255), "leg_row": 27, "arm_rows": (21, 22), "hand_y": 20, "stand_leg_row": 28},
}


def cell(img, row, col=0):
    return img.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))


def lift_columns(img, columns, rows):
    """Move the given columns' pixels in `rows` up one px, filling the vacated bottom pixel with the one below it."""
    px = img.load()
    rows = list(rows)
    for x in columns:
        col = [px[x, y] for y in rows + [rows[-1] + 1]]
        for i, y in enumerate(rows):
            px[x, y] = col[i + 1]


def tuck_arms(body, sleeve, rows):
    """Front and back: as in the player's sheet the arms are pulled in against the torso, so the hanging arms
    (and their hands) are replaced by straight sides: outline at x=10 and 21, sleeve colour between."""
    px = body.load()
    for y in rows:
        for x in range(0, CELL):
            if px[x, y][3] and (x <= 12 or x >= 19):
                px[x, y] = (0, 0, 0, 0)
        for x in range(11, 21):
            if not px[x, y][3]:
                px[x, y] = sleeve
        px[10, y] = px[21, y] = OUTLINE


def trim_hem(body, y):
    """Standing front/back: the row under the tucked arms still has the outline of Idle's hanging hands out
    past the hem (x 10-11 and 20-21); clear it so the outline stops at x=12 and x=19 like the rows below."""
    px = body.load()
    for x in (10, 11, 20, 21):
        px[x, y] = (0, 0, 0, 0)


def front_hands(body, frame, y0):
    """Hands meet low on the belly like the player's: a wide row, then a narrow one that swaps sides each frame."""
    px = body.load()
    for x, c in zip(range(14, 18), (HAND, HAND_SHADE, HAND_SHADE, HAND)):
        px[x, y0] = c
    for x, c in zip((16, 17) if frame == 0 else (14, 15), (HAND_SHADE, HAND) if frame == 0 else (HAND, HAND_SHADE)):
        px[x, y0 + 1] = c


def side_hands(body, sleeve, frame, dy=0):
    """Facing right (arms already tucked): draws the near arm and the shaded far hand as in the player's sheet."""
    px = body.load()

    def rect(x0, x1, y0, y1, color):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px[x, y] = color

    hy = 19 + dy - TYPE_SWING // 2 + TYPE_SWING * frame
    rect(NEAR_SLEEVE_X, 21, hy, hy + 1, sleeve)
    rect(22, 23, hy, hy + 1, NEAR_HAND)
    fy = 20 + dy - TYPE_SWING // 2 + TYPE_SWING * (1 - frame)
    rect(FAR_X, FAR_X + 1, fy, fy + 1, FAR_HAND)


def build(name, cfg, standing=False):
    idle = Image.open(os.path.join(SPRITES, name, "Idle.png")).convert("RGBA")
    sheet = Image.new("RGBA", (CELL * 2, CELL * 4), (0, 0, 0, 0))
    dy = -STAND_RISE if standing else 0
    leg_row = cfg["stand_leg_row"] if standing else cfg["leg_row"]
    drop = 0 if standing else SIT_DROP
    arm_rows = tuple(y + dy for y in cfg["arm_rows"])
    hand_y = cfg["hand_y"] + dy
    for frame in range(2):
        for row in range(4):
            # Rows: 0 down, 1 up, 2 right, 3 left
            flip = row == 3   # the left view is the right view mirrored, so draw it facing right and flip back
            src = cell(idle, row, col=1 if standing else 0)
            if flip:
                src = src.transpose(Image.FLIP_LEFT_RIGHT)
            body = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            body.paste(src.crop((0, 0, CELL, leg_row)), (0, 0))
            if row == 1:
                tuck_arms(body, cfg["sleeve"], arm_rows)
                lift_columns(body, (11, 12) if frame == 0 else (19, 20), rows=range(arm_rows[0] - 2, arm_rows[1] + 1))
                if standing and cfg.get("trim_hem"):
                    trim_hem(body, arm_rows[1] + 1)
            elif row == 0:
                tuck_arms(body, cfg["sleeve"], arm_rows)
                front_hands(body, frame, hand_y)
                if standing and cfg.get("trim_hem"):
                    trim_hem(body, arm_rows[1] + 1)
            else:
                tuck_arms(body, cfg["sleeve"], arm_rows)
                side_hands(body, cfg["sleeve"], frame, dy)
            out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            out.alpha_composite(body, (0, drop))
            out.alpha_composite(src.crop((0, leg_row, CELL, CELL)), (0, leg_row))
            sheet.paste(out.transpose(Image.FLIP_LEFT_RIGHT) if flip else out, (frame * CELL, row * CELL))

    kind = "WorkStanding" if standing else "WorkSitting"
    path = os.path.abspath(os.path.join(SPRITES, name, kind + ".png"))
    sheet.save(path)
    bg = Image.new("RGBA", sheet.size, (200, 200, 200, 255))
    bg.alpha_composite(sheet)
    bg.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(HERE, f"{name}-preview{'-standing' if standing else ''}.png"))
    print("wrote", path)


for name, cfg in CHARACTERS.items():
    build(name, cfg)
    if name in STANDING:
        build(name, cfg, standing=True)
