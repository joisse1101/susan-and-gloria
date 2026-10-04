"""Draws the water pouring from the watering can's sprinkler rose: one sheet, three 16x16 cells in a row:
0 side, 1 front, 2 back.

Side: top-left pixel (0, 0) is where the water leaves the rose. In the right view place it just right of the
rose (rose at x=31, y=hy..hy+3 in WateringCan.png, so about x=32, y=hy+1); mirror it for the left view.
Front: the rose faces the viewer, so the streams fall toward the camera. The cell's centre column (x=8) sits
under the rose (x=17 in the can sheet), top row just below it (about y=28). Draw in front of the character.
Back: the front fan one shade darker with its outer droplets dropped. Draw it BEHIND the character: the body
hides the top of it and only the lower fan shows below the legs.

The side stream is parametric (three streams thrown right, falling under gravity, with two droplet gaps near
the end); the front and back fans are hand-placed. Light to dark as the water falls.

Writes public/assets/sprites/items/WaterStream.png plus preview-sprites.png and preview-on-character.png
(side | front | back, on the player holding the can)."""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.abspath(os.path.join(HERE, "../../public/assets/sprites"))
OUT = os.path.join(SPRITES, "items", "WaterStream.png")

CELL = 16
CX = 8                        # centre column of the front/back fan
L = (0xe0, 0xf4, 0xfa, 255)   # light: just left the rose
M = (0x9a, 0xd2, 0xec, 255)
D = (0x5c, 0xa4, 0xcc, 255)   # dark: falling
DARKER = {L: M, M: D, D: D}

# Side stream: (start row, sideways speed in px per step) for the top, middle and bottom stream
SIDE_STREAMS = ((0, 1.1), (1, 0.85), (2, 0.6))
GRAVITY = 0.14                # px of fall per step squared
STEPS = 9
GAPS = (6, 8)                 # steps left empty so the end of each stream breaks into droplets
HEIGHT = 12                   # fall depth that maps onto the light -> dark colour ramp

# Front fan, hand-placed (x, y, colour): a straight centre stream and two outer ones fanning out around CX
FRONT_STREAMS = (
    ((CX, 0, L), (CX, 1, L), (CX, 2, M), (CX, 4, D), (CX, 6, D)),
    ((CX - 1, 1, L), (CX - 2, 2, M), (CX - 2, 3, M), (CX - 3, 5, D), (CX - 4, 7, D)),
    ((CX + 1, 1, L), (CX + 2, 2, M), (CX + 2, 3, M), (CX + 3, 5, D), (CX + 4, 7, D)),
)


def side_cell():
    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    for start, speed in SIDE_STREAMS:
        for step in range(STEPS):
            if step in GAPS:
                continue
            x, y = round(step * speed), round(start + GRAVITY * step * step)
            if 0 <= x < CELL and 0 <= y < CELL:
                fall = y / HEIGHT
                img.putpixel((x, y), L if fall < 0.25 else M if fall < 0.6 else D)
    return img


def fan_cell(streams, shade=False):
    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    for stream in streams:
        for x, y, color in stream:
            img.putpixel((x, y), DARKER[color] if shade else color)
    return img


# The back fan is the front one shade darker, without the last droplet of each outer stream
back_streams = tuple(stream[:-1] if i else stream for i, stream in enumerate(FRONT_STREAMS))
sheet = Image.new("RGBA", (CELL * 3, CELL), (0, 0, 0, 0))
for i, cell in enumerate((side_cell(), fan_cell(FRONT_STREAMS), fan_cell(back_streams, shade=True))):
    sheet.paste(cell, (i * CELL, 0))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sheet.save(OUT)

GRAY = (200, 200, 200, 255)

# Preview 1: the sprites alone
alone = Image.new("RGBA", (CELL * 3 + 4, CELL + 4), GRAY)
alone.alpha_composite(sheet, (2, 2))
alone.resize((alone.width * 12, alone.height * 12), Image.Resampling.NEAREST).save(os.path.join(HERE, "preview-sprites.png"))

# Preview 2: on the player holding the can, frame 0 of the right / down / up views
can = Image.open(os.path.join(SPRITES, "items", "WateringCan.png")).convert("RGBA")
body = Image.open(os.path.join(SPRITES, "player", "WorkSitting.png")).convert("RGBA")
PW, PH = 48, 48               # panel: the 32px cell plus room for the water leaving it
# (sheet row of the character, water cell, where the water's top-left lands, behind the character?)
panels = ((2, 0, (32, 21), False),
          (0, 1, (17 - CX, 28), False),
          (1, 2, (17 - CX, 28), True))
scene = Image.new("RGBA", (PW * 3, PH), GRAY)
for p, (row, cell, pos, behind) in enumerate(panels):
    box = (0, row * 32, 32, row * 32 + 32)
    water = sheet.crop((cell * CELL, 0, cell * CELL + CELL, CELL))
    origin, water_at = (p * PW, 0), (p * PW + pos[0], pos[1])
    if behind:    # back view: water and can are on the far side of the character
        scene.alpha_composite(water, water_at)
        scene.alpha_composite(can.crop(box), origin)
        scene.alpha_composite(body.crop(box), origin)
    else:
        scene.alpha_composite(body.crop(box), origin)
        scene.alpha_composite(can.crop(box), origin)
        scene.alpha_composite(water, water_at)
scene.resize((scene.width * 8, scene.height * 8), Image.Resampling.NEAREST).save(os.path.join(HERE, "preview-on-character.png"))
print("wrote", OUT)
