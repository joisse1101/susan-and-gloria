"""Builds every character's layer sheets into public/assets/characters/ plus layout.json, presets.json,
layer-order.json and guide.png, then checks the result.

    python pixel-art/layers/build.py            build and verify
Verification: each character's layers composite back to its current flat Idle.png / Walk.png (pixel for
pixel on visible pixels), and the layer-order file lists every layer for every facing."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image

import charlib
import gloria

CHARACTERS = [gloria.character()]
FLAT = os.path.abspath(os.path.join(charlib.HERE, "../../public/assets/sprites"))


def verify_flat(char):
    bad = 0
    lay = charlib.layout()
    for a in lay["animations"]:
        flat = Image.open(os.path.join(FLAT, char.name, a["name"][0].upper() + a["name"][1:] + ".png")).convert("RGBA")
        for facing, row in a["facings"].items():
            for frame in range(a["frames"]):
                got = charlib.composite(char, a["name"], facing, frame)
                frow = charlib.FACINGS.index(facing)          # the flat sheet has one row per facing
                want = flat.crop((frame * 32, frow * 32, (frame + 1) * 32, (frow + 1) * 32))
                diff = [(x, y) for y in range(32) for x in range(32)
                        if (got.getpixel((x, y)) != want.getpixel((x, y))) and (got.getpixel((x, y))[3] or want.getpixel((x, y))[3])]
                if diff:
                    bad += 1
                    print(f"  MISMATCH {char.name} {a['name']} {facing} f{frame}: {len(diff)} px, e.g. {diff[:4]}")
    return bad


def verify_order():
    with open(os.path.join(charlib.OUT, "layer-order.json")) as f:
        order = json.load(f)
    missing = [(fc, k) for fc in charlib.FACINGS for k in charlib.LAYERS
               if k not in order[fc] and not (k == "face" and fc == "up")]
    return missing


def verify_variants():
    """variants.json and the sheet files must agree both ways: every entry has its file, every file an entry."""
    with open(os.path.join(charlib.OUT, "variants.json")) as f:
        manifest = json.load(f)
    listed = set()
    problems = []
    for layer in charlib.LAYERS:
        for variant in manifest["layers"].get(layer, []):
            names = [f"{variant}-{e}" for e in manifest["expressions"].get(variant, [])] if layer == "face" else [variant]
            if not names:
                problems.append(f"{layer}/{variant} has no expressions")
            for name in names:
                path = os.path.join(charlib.FOLDERS[layer], name + ".png")
                listed.add(path)
                if not os.path.isfile(os.path.join(charlib.OUT, path)):
                    problems.append(f"manifest lists {path} but the file is missing")
    for layer in charlib.LAYERS:
        folder = os.path.join(charlib.OUT, charlib.FOLDERS[layer])
        for n in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
            path = os.path.join(charlib.FOLDERS[layer], n)
            if n.endswith(".png") and path not in listed:
                problems.append(f"{path} is not in the manifest")
    return problems


def preview(char, path, scale=4):
    """One strip per facing: the composite, then each layer alone, for the first frame of idle and walk frame 1."""
    lay = charlib.layout()
    cols = ("composite",) + charlib.LAYERS
    shots = [("idle", 0), ("walk", 1), ("workStanding", 1), ("workSitting", 1)]
    w = 32 * len(cols)
    sheet = Image.new("RGBA", (w, 32 * len(charlib.FACINGS) * len(shots)), (96, 120, 100, 255))
    for si, (anim, frame) in enumerate(shots):
        a = next(x for x in lay["animations"] if x["name"] == anim)
        for fi, facing in enumerate(charlib.FACINGS):
            y = (si * len(charlib.FACINGS) + fi) * 32
            sheet.alpha_composite(charlib.composite(char, anim, facing, frame), (0, y))
            row = a["facings"][facing]
            for ci, layer in enumerate(charlib.LAYERS):
                src = Image.open(charlib.variant_file(char, layer, "neutral")).convert("RGBA")
                sheet.alpha_composite(src.crop((frame * 32, row * 32, frame * 32 + 32, row * 32 + 32)), ((ci + 1) * 32, y))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(path)


if __name__ == "__main__":
    charlib.export(CHARACTERS)
    for c in CHARACTERS:
        preview(c, os.path.join(charlib.HERE, f"preview-{c.name}.png"))
    problems = sum(verify_flat(c) for c in CHARACTERS)
    missing = verify_order()
    if missing:
        print("layer-order is missing", missing)
    stray = verify_variants()
    for s in stray:
        print("variants.json:", s)
    print("OK: layers composite to the flat sheets, layer order and variants complete"
          if not problems and not missing and not stray else f"FAILED: {problems} cells differ")
    sys.exit(1 if problems or missing or stray else 0)
