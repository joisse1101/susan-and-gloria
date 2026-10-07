"""One-off: split Susan's flat sheets into draft layer files on the shared grid (deleted after sign-off).
Every pixel goes to exactly one layer, so the layers composite back to the flat art by construction."""
import json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
FLAT = os.path.join(ROOT, 'public/assets/sprites/susan')
OUT = os.path.join(ROOT, 'public/assets/characters')
OUTLINE = (12, 10, 7)
NAMES = {'shoes': ('shoes', 'susan-shoes'), 'bottom': ('bottom', 'susan-jeans'),
         'top': ('top', 'susan-jacket'), 'hair': ('hair', 'susan-ponytails')}
SHARED = ('body', 'face')    # Susan wears the shared light body and the shared face, so her skin, eyes and blush are not split out
COLOURS = {
    (154, 51, 32): 'hair', (194, 74, 42): 'hair', (107, 34, 24): 'hair', (229, 123, 75): 'hair',
    (228, 181, 165): 'body', (201, 143, 130): 'body', (176, 132, 120): 'body',
    (41, 26, 24): 'face', (196, 104, 106): 'face',
    (142, 36, 52): 'top', (189, 58, 69): 'top', (90, 26, 38): 'top',
    (63, 74, 92): 'bottom', (90, 104, 124): 'bottom',
    (54, 38, 35): 'shoes', (91, 70, 62): 'shoes',
}
YELLOW = (240, 200, 74)       # hair ties above the chin (hair), jacket buttons below
PRIORITY = ['top', 'hair', 'bottom', 'shoes', 'body']
SHEETS = [('Idle', 0, 2), ('Walk', 4, 4), ('WorkStanding', 8, 2), ('WorkSitting', 12, 2)]


def classify(cell):
    px = cell.load()
    w, h = cell.size
    cls = {}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a: continue
            if (r, g, b) == YELLOW: cls[x, y] = 'hair' if y <= 16 else 'top'
            elif (r, g, b) in COLOURS: cls[x, y] = COLOURS[r, g, b]
            elif (r, g, b) != OUTLINE: raise SystemExit(f'unknown colour {(r, g, b)}')
    # outline joins the layer it mostly touches
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and (x, y) not in cls:
                votes = {}
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        c = cls.get((x + dx, y + dy))
                        if c: votes[c] = votes.get(c, 0) + 2
                if not votes: cls[x, y] = 'body'
                else:
                    best = max(votes.values())
                    top = [c for c in votes if votes[c] == best]
                    cls[x, y] = min(top, key=lambda c: PRIORITY.index(c) if c in PRIORITY else 99)
    return cls


def main():
    layout = json.load(open(os.path.join(OUT, 'layout.json')))
    cell = layout['cell']
    sheets = {l: Image.new('RGBA', (layout['width'], layout['height'])) for l in NAMES}
    shared = {l: Image.open(os.path.join(OUT, layout['layers'][l], v + '.png')).convert('RGBA') for l, v in (('body', 'light'), ('face', 'gloria'))}
    flats = {}
    for name, row0, frames in SHEETS:
        flat = flats[name] = Image.open(os.path.join(FLAT, name + '.png')).convert('RGBA')
        for r in range(4):
            for f in range(frames):
                box = (f * cell, r * cell, (f + 1) * cell, (r + 1) * cell)
                src = flat.crop(box)
                cls = classify(src)
                px = src.load()
                for (x, y), layer in cls.items():
                    if layer in SHARED: continue
                    sheets[layer].putpixel((f * cell + x, (row0 + r) * cell + y), px[x, y])
    for layer, (folder, variant) in NAMES.items():
        os.makedirs(os.path.join(OUT, folder), exist_ok=True)
        sheets[layer].save(os.path.join(OUT, folder, variant + '.png'))
    # composite with the shared body and face, next to the flat art (they differ by design: the body is Gloria's)
    order = json.load(open(os.path.join(OUT, 'layer-order.json')))
    sheets.update(shared)
    scratch = os.environ.get('PREVIEW_DIR')
    if scratch:
        for name, row0, frames in SHEETS:
            out = Image.new('RGBA', (frames * cell * 2, cell * 4), (200, 200, 200, 255))
            for r, facing in enumerate(['down', 'up', 'right', 'left']):
                for f in range(frames):
                    box = (f * cell, (row0 + r) * cell, (f + 1) * cell, (row0 + r + 1) * cell)
                    for layer in order[facing]:
                        if layer not in sheets: continue
                        out.alpha_composite(sheets[layer].crop(box), (f * cell, r * cell))
                    out.alpha_composite(flats[name].crop((f * cell, r * cell, (f + 1) * cell, (r + 1) * cell)), ((frames + f) * cell, r * cell))
            out.resize((out.width * 8, out.height * 8), Image.NEAREST).save(os.path.join(scratch, f'susan-{name}.png'))


main()
