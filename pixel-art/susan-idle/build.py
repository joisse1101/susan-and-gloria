import sys, os
sys.path.insert(0, "C:/Users/DEEPBRAIN_JOIS/.claude/skills/pixel-art-studio/scripts")
from pixelstudio import Sprite

C = {
 'A':'#0c0a07',                                   # outline
 'h':'#6b2218','H':'#9a3320','L':'#c24a2a','W':'#e57b4b',  # hair
 's':'#c98f82','S':'#e4b5a5','b':'#c4686a','e':'#291a18',  # skin / blush / eye
 'j':'#5a1a26','J':'#8e2434','K':'#bd3a45',       # jacket
 't':'#dbcbbc','T':'#b9a592',                     # tee
 'p':'#3f4a5c','P':'#5a687c',                     # jeans
 'o':'#362623','O':'#5b463e',                     # shoes
 'R':'#f0c84a',                                   # hair tie
 'x':'#0c0a0787','y':'#0c0a0750',                 # shadow
}
def mirror(half): return half + half[::-1]

# head rows: y -> 8-char left half (x8..15), mirrored to x8..23
HEAD = {
 5:"....AAA", 6:"..AAHHL", 7:".AHHLLL", 8:".AHLLWW", 9:"AHHLLLL",
 10:"AHHLLLL", 11:"AHHLLLL", 12:"AHHLLSS", 13:"AHHLSSS", 14:"AHHseSS",
 15:"AHHbeSS", 16:"..AsSSS", 17:"...AAsS",
}
# body rows (static)
BODY = {
 17:"...AAJJJ", 18:"...AJJJJ", 19:"...AJKJJ", 20:"..AJJKJJ", 21:"..AJJKJJ",
 22:".AJKAJJJ", 23:".AsSAJJJ", 24:"..AAAjpp", 25:"....ApPA", 26:"....ApPA",
 27:"....AppA", 28:"....AooA", 29:"...AOooA",
}
# ponytail on viewer's right: y -> (x0, string)
PONY = {
 8:(22,"A"), 9:(23,"ARHA"), 10:(23,"ARHLA"),
 11:(23,"AHLLHA"), 12:(24,"AHLLHA"), 13:(24,"AHLLHA"), 14:(24,"AHLHA"),
 15:(25,"AHHA"), 16:(25,"AHA"), 17:(25,"AA"),
}
CENTER_FIX = {10:'h', 11:'h'}   # hair parting at x15/x16 on bangs rows

def draw_body(s, dy):
    """Torso (rows <=24) bobs with the head; legs stay planted, so the top leg row stretches to fill the gap."""
    for y, h in BODY.items():
        for i, ch in enumerate(mirror(h)):
            if ch != '.': s.px(8+i, y+dy if y <= 24 else y, C[ch])
    if dy < 0:
        for i, ch in enumerate(mirror(BODY[25])):
            if ch != '.': s.px(8+i, 24, C[ch])

def draw(s, dy_head):
    def put(y, x0, row):
        for i, ch in enumerate(row):
            if ch != '.': s.px(x0+i, y, C[ch])
    # shadow
    put(30, 9, "x"*14); put(31, 10, "y"*13)
    draw_body(s, dy_head)
    # head/hair/ponytail move together
    for y, h in HEAD.items():
        put(y+dy_head, 9, mirror(h))
    for y,(x0,r) in PONY.items():
        put(y+dy_head, x0, r)
        put(y+dy_head, 31-(x0+len(r)-1), r[::-1])
    for y in (19, 21, 23):                      # yellow buttons down the placket
        s.px(15, y+dy_head, C['R']); s.px(16, y+dy_head, C['R'])
    s.px(17, 8+dy_head, C['L']); s.px(18, 8+dy_head, C['L'])  # highlight on left only
    for y, ch in CENTER_FIX.items():
        s.px(15, y+dy_head, C[ch]); s.px(16, y+dy_head, C['H'])
    # eyes highlight-free; blush right side cheek is mirrored already

frames = []
sheet = Sprite(64, 32)
for i, dy in enumerate((0, -1)):
    f = Sprite(32, 32); draw(f, dy)
    for y in range(32):
        for x in range(32):
            c = f.get(x, y)
            if c and (len(c) < 4 or c[3] > 0): sheet.px(i*32+x, y, c)
    frames.append(f)

here = os.path.dirname(os.path.abspath(__file__))
sheet.preview(os.path.join(here, "preview.png"), scale=10)
out = os.path.abspath(os.path.join(here, "../../public/assets/sprites/susan"))
os.makedirs(out, exist_ok=True)
sheet.save_png(os.path.join(out, "Idle.png"))
sheet.save_png(os.path.join(here, "idle_front_x8.png"), scale=8)
sheet.stats()


# ---------------------------------------------------------------- other directions
def put_to(s, y, x0, row):
    for i, ch in enumerate(row):
        if ch != '.': s.px(x0+i, y, C[ch])

def draw_back(s, dy):
    put_to(s, 30, 9, "x"*14); put_to(s, 31, 10, "y"*13)
    body = dict(BODY)
    for y in (19, 20, 21, 22): pass
    draw_body(s, dy)
    for y in (19, 20, 21, 22, 23):               # centre back seam
        s.px(15, y+dy, C['j']); s.px(16, y+dy, C['j'])
    hair = {5:"....AAA", 6:"..AAHHL", 7:".AHHLLL", 8:".AHLLLL", 9:"AHHLLLL",
            10:"AHHLLLL", 11:"AHHLLLL", 12:"AHHLLLL", 13:"AHHHLLL",
            14:"AHHHLLL", 15:".AHHHLL", 16:".AAHHHL", 17:"...AAHh"}
    for y, h in hair.items(): put_to(s, y+dy, 9, mirror(h))
    s.px(15, 12+dy, C['h']); s.px(16, 12+dy, C['h'])    # hair parting seam
    s.px(15, 13+dy, C['h']); s.px(16, 13+dy, C['h'])
    s.px(17, 8+dy, C['W']); s.px(18, 8+dy, C['W'])
    for y,(x0,r) in PONY.items():
        put_to(s, y+dy, x0, r); put_to(s, y+dy, 31-(x0+len(r)-1), r[::-1])

HEAD34 = {
 5:(13,"AAAAAA"), 6:(11,"AAHHLLLLAA"), 7:(10,"AHHLLLLLLHHA"), 8:(9,"AHHLLWLLLLLLHA"),
 9:(9,"AHHLLLLLLLLLHA"), 10:(9,"AHHLLLLLLLLLHA"), 11:(9,"AHHLLLLLLLLLHA"),
 12:(9,"AHHhLLLSSSSSHA"), 13:(9,"AHHhLLLSSSSSsA"), 14:(9,"AHHhHSeSSSeSsA"),
 15:(9,"AHHhHbeSSSeSbA"), 16:(13,"AsSSSSsA"), 17:(13,"AAsSSA"),
}
def draw_right(s, dy):                      # 3/4 view, facing down-right
    put_to(s, 30, 9, "x"*14); put_to(s, 31, 10, "y"*13)
    draw_body(s, dy)
    for y in (19, 21, 23):
        y += dy
        s.px(15, y, C['J']); s.px(16, y, C['J']); s.px(16, y, C['R']); s.px(17, y, C['R'])
    for y,(x0,r) in PONY.items():           # far pigtail, tucked behind the head
        put_to(s, y+dy, 33-(x0+len(r)-1), r[::-1])
    for y,(x0,r) in HEAD34.items(): put_to(s, y+dy, x0, r)
    for y,(x0,r) in PONY.items(): put_to(s, y+dy, x0, r)

def draw_left(s, dy):
    tmp = Sprite(32, 32); draw_right(tmp, dy)
    for y in range(32):
        for x in range(32):
            c = tmp.get(x, y)
            if c and (len(c) < 4 or c[3] > 0): s.px(31-x, y, c)

from PIL import Image as _Img
_PLAYER_WALK = _Img.open(os.path.join(here, "../../public/assets/sprites/player/Walk.png")).convert("RGBA")
_PLAYER_IDLE = _Img.open(os.path.join(here, "../../public/assets/sprites/player/Idle.png")).convert("RGBA")
_LEG_MAP = {(12,10,7): 'A', (87,99,107): 'P', (66,80,89): 'p', (85,76,60): 'O', (54,38,35): 'o', (110,101,84): 'O', (129,120,103): 'O'}

def legs_from_player(s, frame, top, row=2, sheet=None):
    sheet = sheet or _PLAYER_WALK
    """Copy the player's leg pixels (row 0 front, 1 back, 2 right) (rows top..29) for this walk frame, recoloured to Susan's jeans/shoes."""
    for y in range(top, 30):
        for x in range(32):
            c = sheet.getpixel((frame*32+x, row*32+y))
            if c[3] == 255: s.px(x, y, C[_LEG_MAP[c[:3]]])

def clear_legs(s, x0=8, x1=25):
    for y in range(25, 30):
        for x in range(x0, x1): s.px(x, y, None)

def idle_legs(f, frame, dy, row):
    clear_legs(f)
    if dy < 0:
        for x in range(8, 26): f.px(x, 24, None)
    legs_from_player(f, frame, 24 if dy < 0 else 25, row, _PLAYER_IDLE)

def walk_cell(kind, frame):
    pose = ('L', 'n', 'R', 'n')[frame]
    dy = (0, -1, 0, -1)[frame]
    f = Sprite(32, 32)
    if kind in ('front', 'back'):
        (draw if kind == 'front' else draw_back)(f, dy)
        clear_legs(f)
        for x in range(8, 26): f.px(x, 24, None) if dy < 0 else None
        legs_from_player(f, frame, 24 if dy < 0 else 25, 0 if kind == 'front' else 1)
    else:
        draw_right(f, dy); clear_legs(f)
        for x in range(8, 26): f.px(x, 24, None) if dy < 0 else None
        legs_from_player(f, frame, 24 if dy < 0 else 25)
        if kind == 'left':
            g = Sprite(32, 32)
            for y in range(32):
                for x in range(32):
                    c = f.get(x, y)
                    if c and (len(c) < 4 or c[3] > 0): g.px(31-x, y, c)
            f = g
    return f

walk = Sprite(128, 128)
for row, kind in enumerate(('front', 'back', 'right', 'left')):
    for i in range(4):
        f = walk_cell(kind, i)
        for y in range(32):
            for x in range(32):
                c = f.get(x, y)
                if c and (len(c) < 4 or c[3] > 0): walk.px(i*32+x, row*32+y, c)
walk.preview(os.path.join(here, "walk_preview.png"), scale=5)
walk.save_png(os.path.join(out, "Walk.png"))


# ---------------------------------------------------------------- idle sheet, all four directions
def idle_cell(kind, frame):
    dy = (0, -1)[frame]
    f = Sprite(32, 32)
    if kind == 'front':
        draw(f, dy)
        return f
    (draw_back if kind == 'back' else draw_right)(f, dy)
    idle_legs(f, frame, dy, 1 if kind == 'back' else 2)
    if kind == 'left':
        g = Sprite(32, 32)
        for y in range(32):
            for x in range(32):
                c = f.get(x, y)
                if c and (len(c) < 4 or c[3] > 0): g.px(31-x, y, c)
        f = g
    return f

idle = Sprite(64, 128)
for row, kind in enumerate(('front', 'back', 'right', 'left')):
    for i in range(2):
        f = idle_cell(kind, i)
        for y in range(32):
            for x in range(32):
                c = f.get(x, y)
                if c and (len(c) < 4 or c[3] > 0): idle.px(i*32+x, row*32+y, c)
idle.preview(os.path.join(here, "idle_preview.png"), scale=6)
idle.save_png(os.path.join(out, "Idle.png"))
