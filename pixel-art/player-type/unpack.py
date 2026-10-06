"""One-off: removes the green backpack from Walk.png and Shoot.png (Idle.png was done by hand).

Every green pixel becomes jacket brown; on the back row (row 1) the pack area then gets the same
shoulder highlights, spine seam and darker hem used in Idle.png so the back doesn't read flat."""
import os
from PIL import Image

PLAYER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/assets/sprites/player")
CELL = 32
JACKET = (0x3a, 0x2b, 0x28, 255)
HI = (0x4c, 0x40, 0x3d, 255)
SH = (0x2a, 0x1f, 0x1c, 255)


def is_pack(p):
    return p[3] and p[1] > p[0] + 8 and p[1] > p[2] + 8


for name in ("Walk", "Shoot"):
    path = os.path.join(PLAYER, name + ".png")
    im = Image.open(path).convert("RGBA")
    for row in range(4):
        for col in range(4):  # the fifth column is the direction label, whose green text must stay
            x0, y0 = col * CELL, row * CELL
            pts = [(x, y) for y in range(y0, y0 + CELL) for x in range(x0, x0 + CELL) if is_pack(im.getpixel((x, y)))]
            if not pts:
                continue
            for p in pts:
                im.putpixel(p, JACKET)
            if row != 1:
                continue
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            top, bot, cx = min(ys), max(ys), (min(xs) + max(xs)) // 2
            for x, y in pts:
                if y == top and (x <= min(xs) + 2 or x >= max(xs) - 2):
                    im.putpixel((x, y), HI)
                elif y == bot:
                    im.putpixel((x, y), SH)
                elif x == cx:
                    im.putpixel((x, y), SH)
    im.save(path)
