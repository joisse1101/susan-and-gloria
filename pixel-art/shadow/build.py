"""Shadows under things, each a 32x32 cell lined up with the frame it goes under.
Run: python pixel-art/shadow/build.py  ->  public/assets/sprites/Shadow.png, ObjectShadow.png"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / 'public/assets/sprites'
DARK, LIGHT = (12, 10, 7, 135), (12, 10, 7, 80)


def make(name, rows):
    """rows: {y: (x0, x1, colour)}"""
    img = Image.new('RGBA', (32, 32))
    for y, (x0, x1, colour) in rows.items():
        for x in range(x0, x1 + 1): img.putpixel((x, y), colour)
    img.save(OUT / name)


# Character: oval on the bottom two rows, under the feet
make('Shadow.png', {30: (9, 22, DARK), 31: (10, 22, LIGHT)})
# Object (chair): small flat oval, 5px tall, centred just below the wheels (they end on row 28 of the chair frame)
make('ObjectShadow.png', {29: (10, 21, DARK), 28: (11, 20, DARK), 30: (11, 20, DARK), 27: (13, 18, LIGHT), 31: (13, 18, LIGHT)})
