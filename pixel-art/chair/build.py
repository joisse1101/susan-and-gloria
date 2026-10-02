import sys, math
sys.path.insert(0, "C:/Users/DEEPBRAIN_JOIS/.claude/skills/pixel-art-studio/scripts")
from pixelstudio import Sprite

W = H = 32
OX, OY = 16, 27          # screen position of the chair's ground centre
PITCH = math.radians(35) # camera looks down at 35 degrees
STEP = 0.3               # surface sampling step (< 1px so no holes)

FABRIC = ["#1f2a5a", "#2f4c9a", "#4a7bd0", "#9cc4f4"]   # dark -> light, hue-shifted
METAL  = ["#1b1d2b", "#3a3f55", "#5d6580", "#9aa4c0"]
OUTLINE = "#10121c"
MAT = {"fabric": FABRIC, "metal": METAL}

LIGHT = (-0.55, 0.75, 0.35)
n = math.sqrt(sum(c * c for c in LIGHT)); LIGHT = tuple(c / n for c in LIGHT)

def level(normal):
    d = sum(a * b for a, b in zip(normal, LIGHT))
    return 3 if d > 0.65 else 2 if d > 0.45 else 1 if d > 0.1 else 0

# (centre-in-local, size, material, tilt_deg, translate, part_yaw_deg)
def box(c, s, mat, tilt=0, at=(0, 0, 0), pyaw=0):
    return dict(c=c, s=s, mat=mat, tilt=tilt, at=at, pyaw=pyaw)

PARTS = [
    box((0, 8.2, 0.3), (10, 1.8, 9), "fabric"),                # seat
    box((0, 6.9, 0), (5, 0.9, 4.5), "metal"),                  # seat plate
    box((0, 4.2, 0), (1.6, 4.5, 1.6), "metal"),                # gas column
    box((0, 9.8, -5.3), (1.6, 3.4, 1), "metal"),               # back neck
    box((0, 4.2, 0), (9, 8.4, 1.5), "fabric", tilt=10, at=(0, 10.2, -5)),  # backrest
    box((-5.9, 10.3, -1), (0.9, 2.4, 0.9), "metal"),           # arm posts
    box((5.9, 10.3, -1), (0.9, 2.4, 0.9), "metal"),
    box((-5.9, 11.8, 0.3), (1.4, 0.9, 4.6), "metal"),          # arm pads
    box((5.9, 11.8, 0.3), (1.4, 0.9, 4.6), "metal"),
]
for i in range(5):                                             # star base
    a = i * 72 + 36
    PARTS.append(box((0, 1.5, 2.9), (1.2, 1, 5.8), "metal", pyaw=a))
    PARTS.append(box((0, 0.5, 5.4), (1.4, 1, 1.4), "metal", pyaw=a))

def faces(c, s):
    """yield (point, normal) samples over the 6 faces of a box"""
    hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
    def rng(h):
        k = max(1, int(round(2 * h / STEP)))
        return [-h + 2 * h * i / k for i in range(k + 1)]
    for sg in (-1, 1):
        for u in rng(hy):
            for v in rng(hz): yield (c[0] + sg * hx, c[1] + u, c[2] + v), (sg, 0, 0)
        for u in rng(hx):
            for v in rng(hz): yield (c[0] + u, c[1] + sg * hy, c[2] + v), (0, sg, 0)
        for u in rng(hx):
            for v in rng(hy): yield (c[0] + u, c[1] + v, c[2] + sg * hz), (0, 0, sg)

def rot_x(p, a):   # tilt: top leans toward -z
    ca, sa = math.cos(a), math.sin(a)
    return (p[0], p[1] * ca + p[2] * sa, -p[1] * sa + p[2] * ca)

def rot_y(p, a):
    ca, sa = math.cos(a), math.sin(a)
    return (p[0] * ca + p[2] * sa, p[1], -p[0] * sa + p[2] * ca)

def render(yaw_deg):
    zbuf, out = {}, {}
    yaw = math.radians(yaw_deg)
    for part in PARTS:
        # center the box at origin for tilt, then place it
        local_c = part["c"] if part["tilt"] == 0 else part["c"]
        for p, nrm in faces(local_c, part["s"]):
            if part["tilt"]:
                p, nrm = rot_x(p, math.radians(part["tilt"])), rot_x(nrm, math.radians(part["tilt"]))
                p = tuple(a + b for a, b in zip(p, part["at"]))
            if part["pyaw"]:
                p, nrm = rot_y(p, math.radians(part["pyaw"])), rot_y(nrm, math.radians(part["pyaw"]))
            p, nrm = rot_y(p, yaw), rot_y(nrm, yaw)
            sx = p[0]
            sy = -p[1] * math.cos(PITCH) + p[2] * math.sin(PITCH)
            depth = p[2] * math.cos(PITCH) + p[1] * math.sin(PITCH)
            # normal in view space: tilt-free, light is fixed to the camera
            # (view normal ~ world normal for light purposes)
            px, py = int(math.floor(OX + sx + 0.5)), int(math.floor(OY + sy))
            if not (0 <= px < W and 0 <= py < H): continue
            if depth >= zbuf.get((px, py), -1e9):
                zbuf[(px, py)] = depth
                out[(px, py)] = MAT[part["mat"]][level(nrm)]
    return out

DIRS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
s = Sprite(W, H)
for i, name in enumerate(DIRS):
    if i: s.add_frame(copy=False)
    s.use(frame=i + 1)
    for (x, y), col in render(i * 45).items():
        s.px(x, y, col)
    s.outline(OUTLINE, where="outside")
    s.tag(name, i + 1, i + 1)

if __name__ == "__main__":
    s.preview("preview.png", scale=8)
    s.save_spritesheet("chair_sheet.png", layout="horizontal", scale=1)
    s.save_spritesheet("chair_sheet_x6.png", layout="horizontal", scale=6)
    for i, name in enumerate(DIRS):
        s.save_png(f"chair_{name}.png", frame=i + 1)
    s.stats()
