"""Shared layer library: every character is a stack of aligned layer sheets (body, bottom, top, hair, accessories,
face) built from one drawing function per layer. A character's own script (see gloria.py) supplies only its
bottom, top, hair, accessories and face drawing; this file owns the layout, the shared body (head skin, hands,
feet), the walk cycle numbers, mirroring, export, the guide sheet and the presets.

Layer types and their folders under public/assets/characters/:
    body -> bodies, bottom, top, hair, accessories, face
Every variant file shares one cell layout (layout.json): 32px cells, one row per animation + facing, one column
per frame, so the same frame index selects the matching cell in every layer.

Layers 'body', 'bottom', 'top' and 'hair' are exclusive: a pixel painted into one clears it from the others, so a
character's layers never double-cover a pixel. 'face' and 'accessories' are overlays and clear nothing (the skin
stays under Gloria's glasses)."""
import json
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "../../public/assets/characters"))
DATA = os.path.join(HERE, "data")

CELL = 32
LAYERS = ("body", "bottom", "top", "hair", "face", "accessories")      # drawing order, bottom to top
FOLDERS = {"body": "bodies", "bottom": "bottom", "top": "top", "hair": "hair", "face": "face",
           "accessories": "accessories"}
OVERLAYS = ("face", "accessories")

FACINGS = ("down", "up", "right", "left")
MIRRORS = {"left": "right"}          # drawn once, flipped per layer for the west side
ANIMS = (("idle", 2), ("walk", 4))   # name, frames; rows follow in this order, FACINGS each

IDLE_BOB = (0, -1)
WALK_BOB = (0, -1, 0, -1)
WALK_SWAY = (-1, 0, 1, 0)            # the hem sways with the leading foot


def layout():
    rows, row = [], 0
    for name, frames in ANIMS:
        rows.append({"name": name, "frames": frames, "facings": {f: row + i for i, f in enumerate(FACINGS)}})
        row += len(FACINGS)
    width = max(f for _, f in ANIMS) * CELL
    return {"cell": CELL, "width": width, "height": row * CELL, "animations": rows,
            "mirrors": MIRRORS, "layers": {k: FOLDERS[k] for k in LAYERS}}


def rgba(color):
    if isinstance(color, tuple):
        return color
    h = color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in range(0, len(h), 2)) + ((255,) if len(h) == 6 else ())


class Cell:
    """One 32x32 frame, one image per layer type."""

    def __init__(self):
        self.img = {k: Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0)) for k in LAYERS}

    def px(self, layer, x, y, color):
        if not (0 <= x < CELL and 0 <= y < CELL):
            return
        if layer not in OVERLAYS:
            for other in LAYERS:
                if other not in OVERLAYS and other != layer:
                    self.img[other].putpixel((x, y), (0, 0, 0, 0))
        self.img[layer].putpixel((x, y), rgba(color))

    def put(self, layer, y, x0, row, palette):
        """Paint a text row ('.' = nothing) starting at x0."""
        for i, ch in enumerate(row):
            if ch != ".":
                self.px(layer, x0 + i, y, palette[ch])

    def mirrored(self):
        out = Cell()
        out.img = {k: v.transpose(Image.FLIP_LEFT_RIGHT) for k, v in self.img.items()}
        return out


class Ctx:
    """What a drawing function is told about the cell: `facing` is the drawn view (down, up or right; the left
    view is the right one mirrored), `dy` the walk or idle bob and `sway` the hem sway."""

    def __init__(self, anim, facing, frame):
        self.anim, self.facing, self.frame = anim, facing, frame
        self.dy = (IDLE_BOB if anim == "idle" else WALK_BOB)[frame]
        self.sway = WALK_SWAY[frame] if anim == "walk" else 0


def mirror(half):
    return half + half[::-1]


# ---- shared body: head skin, hands and feet -------------------------------------------------------------------

# half rows from x=9, mirrored about the centre line
HEAD_FRONT = {12: "....SSS", 13: "....SSS", 14: "...SSSS", 15: "...SSSS", 16: "..AsSSS", 17: "...AAsS"}
# full rows, (x0, text): the three-quarter view facing down-right
HEAD_RIGHT = {12: (9, ".....SSSSSSS.."), 13: (9, "....SSSSSSSSsA"), 14: (10, "...SSSSSSSSsA"),
              15: (11, "AASSSSSSSSAA"), 16: (12, "AAsSSSSsAA"), 17: (13, "AAsSSA")}
HANDS = {22: ".AsSA..."}         # half row from x=8
FEET_ROW = 29
FEET_MAP = {(12, 10, 7): "A", (87, 99, 107): "s", (66, 80, 89): "s", (85, 76, 60): "O", (54, 38, 35): "o",
            (110, 101, 84): "O", (129, 120, 103): "O"}
LEG_SOURCE_ROW = {"down": 0, "up": 1, "right": 2}

BODY_VARIANTS = {
    # skin light/shade, shoe light/dark, outline
    "light": {"A": "#0c0a07", "S": "#e4b5a5", "s": "#c98f82", "O": "#5b463e", "o": "#362623"},
}

_feet = {}


def _feet_sheet(anim):
    if anim not in _feet:
        _feet[anim] = Image.open(os.path.join(DATA, f"player-{anim}.png")).convert("RGBA")
    return _feet[anim]


def draw_body(cell, ctx, palette):
    dy = ctx.dy
    if ctx.facing == "down":
        for y, h in HEAD_FRONT.items():
            cell.put("body", y + dy, 9, mirror(h), palette)
    elif ctx.facing == "right":
        for y, (x0, r) in HEAD_RIGHT.items():
            cell.put("body", y + dy, x0, r, palette)
    for y, h in HANDS.items():
        cell.put("body", y + dy, 8, mirror(h), palette)
    sheet = _feet_sheet(ctx.anim)
    col = ctx.frame if ctx.anim == "walk" else 0
    for x in range(CELL):
        c = sheet.getpixel((col * CELL + x, LEG_SOURCE_ROW[ctx.facing] * CELL + FEET_ROW))
        if c[3] == 255:
            cell.px("body", x, FEET_ROW, palette[FEET_MAP[c[:3]]])


# The rest of the body, hidden under a character's own clothes and hair: head, neck, torso, arms, hips and legs, so
# that a different top, bottom or hairstyle shows skin instead of a gap. Painted last, only into empty body
# pixels, and kept inside the silhouette of the clothed characters (build.py checks that it never peeks out).
UNDER_HEAD = {7: (11, 20), 8: (11, 20), 9: (11, 20), 10: (11, 20), 11: (11, 20), 12: (10, 21), 13: (10, 21),
              14: (10, 21), 15: (11, 20), 16: (14, 17), 17: (14, 17)}
UNDER_TORSO = range(18, 25)          # rows, x 13..18
UNDER_ARM = ((11, 19), (11, 20), (10, 20), (10, 21), (11, 21))      # left arm; the right one mirrors it
UNDER_LEG_ROWS = range(25, 29)


def draw_underlay(cell, ctx, palette):
    body = cell.img["body"]
    dy = ctx.dy

    def fill(x, y, ch):
        if 0 <= x < CELL and 0 <= y < CELL and body.getpixel((x, y))[3] == 0:
            body.putpixel((x, y), rgba(palette[ch]))

    for y, (x0, x1) in UNDER_HEAD.items():
        for x in range(x0, x1 + 1):
            fill(x, y + dy, "s" if x in (x0, x1) else "S")
    for y in UNDER_TORSO:
        for x in range(13, 19):
            fill(x, y + dy, "s" if x in (13, 18) else "S")
    for x, y in UNDER_ARM:
        fill(x, y + dy, "s" if x == 10 else "S")
        fill(31 - x, y + dy, "s" if x == 10 else "S")
    sheet = _feet_sheet(ctx.anim)
    col = ctx.frame if ctx.anim == "walk" else 0
    for x in range(CELL):
        c = sheet.getpixel((col * CELL + x, LEG_SOURCE_ROW[ctx.facing] * CELL + FEET_ROW))
        if c[3] == 255 and FEET_MAP[c[:3]] != "A":
            for y in UNDER_LEG_ROWS:
                fill(x, y, "s")


# ---- characters -----------------------------------------------------------------------------------------------

class Character:
    """name, one variant per layer type, and the drawing function per layer: fn(cell, ctx) (face also takes the
    expression name)."""

    def __init__(self, name, body, bottom, top, hair, accessories, face, expressions=("neutral",)):
        self.name = name
        self.variants = {"body": body, "bottom": bottom, "top": top, "hair": hair, "accessories": accessories,
                         "face": face}
        self.expressions = expressions
        self.draw = {}


def draw_cell(char, expression, anim, facing, frame):
    view = MIRRORS.get(facing, facing)
    ctx = Ctx(anim, view, frame)
    cell = Cell()
    char.draw["bottom"](cell, ctx)
    char.draw["top"](cell, ctx)
    draw_body(cell, ctx, BODY_VARIANTS[char.variants["body"]])
    char.draw["hair"](cell, ctx)
    char.draw["accessories"](cell, ctx)
    char.draw["face"](cell, ctx, expression)
    draw_underlay(cell, ctx, BODY_VARIANTS[char.variants["body"]])
    return cell.mirrored() if view != facing else cell


def render(char):
    """{(layer, expression-or-None): sheet image} for one character."""
    lay = layout()
    sheets = {}
    for expression in char.expressions:
        for layer in LAYERS:
            key = (layer, expression if layer == "face" else None)
            if key not in sheets:
                sheets[key] = Image.new("RGBA", (lay["width"], lay["height"]), (0, 0, 0, 0))
        for a in lay["animations"]:
            for facing, row in a["facings"].items():
                for frame in range(a["frames"]):
                    cell = draw_cell(char, expression, a["name"], facing, frame)
                    for layer in LAYERS:
                        key = (layer, expression if layer == "face" else None)
                        if layer == "face" or expression == char.expressions[0]:
                            sheets[key].paste(cell.img[layer], (frame * CELL, row * CELL))
    return sheets


def variant_file(char, layer, expression=None):
    name = char.variants[layer]
    if layer == "face":
        name = f"{name}-{expression}"
    return os.path.join(OUT, FOLDERS[layer], name + ".png")


def export(chars):
    lay = layout()
    for char in chars:
        for (layer, expression), sheet in render(char).items():
            path = variant_file(char, layer, expression)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            sheet.save(path)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "layout.json"), "w") as f:
        json.dump(lay, f, indent=2)
        f.write("\n")
    with open(os.path.join(OUT, "presets.json"), "w") as f:
        json.dump({"characters": {c.name: c.variants for c in chars},
                   "expressions": {c.variants["face"]: list(c.expressions) for c in chars}}, f, indent=2)
        f.write("\n")
    with open(os.path.join(OUT, "layer-order.json"), "w") as f:
        json.dump({facing: [k for k in LAYERS if not (k == "face" and facing == "up")] for facing in FACINGS},
                  f, indent=2)
        f.write("\n")
    guide(lay).save(os.path.join(HERE, "guide.png"))   # for authors, not shipped


def guide(lay, scale=3):
    """Labelled grid of the shared cell layout: every animation row, facing and frame."""
    margin_x, margin_y = 70, 14
    w, h = lay["width"], lay["height"]
    img = Image.new("RGBA", (margin_x + w, margin_y + h), (36, 38, 46, 255))
    d = ImageDraw.Draw(img)
    for a in lay["animations"]:
        for facing, row in a["facings"].items():
            y = margin_y + row * CELL
            d.text((3, y + 10), f"{a['name']} {facing}", fill=(230, 230, 230, 255))
            for col in range(w // CELL):
                x = margin_x + col * CELL
                used = col < a["frames"]
                d.rectangle([x, y, x + CELL - 1, y + CELL - 1], fill=(70, 78, 96, 255) if used else (28, 29, 36, 255),
                            outline=(120, 130, 150, 255))
                if row == a["facings"]["down"]:
                    d.text((x + 2, 2), f"f{col}" if used else "", fill=(230, 230, 230, 255))
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


# ---- verification ---------------------------------------------------------------------------------------------

def composite(char, anim, facing, frame, expression="neutral", root=OUT, order=None):
    """Stack the exported layer files of a character's preset into one cell."""
    lay = layout()
    a = next(x for x in lay["animations"] if x["name"] == anim)
    row = a["facings"][facing]
    order = order or [k for k in LAYERS if not (k == "face" and facing == "up")]
    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    for layer in order:
        path = variant_file(char, layer, expression)
        path = os.path.join(root, os.path.relpath(path, OUT))
        sheet = Image.open(path).convert("RGBA")
        out.alpha_composite(sheet.crop((frame * CELL, row * CELL, (frame + 1) * CELL, (row + 1) * CELL)))
    return out
