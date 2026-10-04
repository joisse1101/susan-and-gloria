import sys, os
sys.path.insert(0, os.environ.get("PIXELSTUDIO", "C:/Users/DEEPBRAIN_JOIS/.claude/skills/pixel-art-studio/scripts"))
from pixelstudio import Sprite
from PIL import Image

C = {
 'A':'#0c0a07',                                   # outline
 'h':'#3b2417','H':'#5a3a24','L':'#7a5233','W':'#9a6e45',  # hair (brown)
 's':'#c98f82','S':'#e4b5a5','b':'#c4686a',       # skin / blush
 'g':'#1a2f25','G':'#24473a','K':'#33634f',       # dark green cardigan
 't':'#dbcbbc','T':'#b9a592',                     # blouse
 'd':'#4a2f20','D':'#6b4530','E':'#8a5d3f',       # brown skirt
 'F':'#5b4a52','e':'#291a18','l':'#dcecef',       # glasses frame / eye / lens
 'r':'#8e2434',                                   # hair tie
 'o':'#362623','O':'#5b463e',                     # shoes
 'x':'#0c0a0787','y':'#0c0a0750',                 # shadow
}
def mirror(half): return half + half[::-1]

HEAD = {
 5:"....AAA", 6:"..AAHHL", 7:".AHHLLL", 8:".AHLLWW", 9:"AHHLLLL",
 10:"AHHLLLL", 11:"AHHLLLL", 12:"AHHLLSS", 13:"AHHLSSS", 14:"AHHSSSS",
 15:"AHHSSSS", 16:"..AsSSS", 17:"...AAsS",
}
# cardigan (rows 17-24), skirt (25-27); mirrored around x15/16
BODY = {
 17:"...AAGGG", 18:"...AGGGG", 19:"...AGKtt", 20:"..AGGKtt", 21:".AGKAGtt", 22:".AsSAgGG",
 23:"...ADDEE", 24:"..ADDEEE", 25:".ADDEEEE", 26:".ADDEEEE", 27:".ADDEEEE", 28:".Adddddd",
}
BUN = {1:(14,"AAAA"), 2:(13,"AHLLHA"), 3:(13,"AHLWHA"), 4:(14,"AHHA")}
LEG_MAP = {(12,10,7): 'A', (87,99,107): 's', (66,80,89): 's', (85,76,60): 'O', (54,38,35): 'o', (110,101,84): 'O', (129,120,103): 'O'}

here = os.path.dirname(os.path.abspath(__file__))
PLAYER_WALK = Image.open(os.path.join(here, "../../public/assets/sprites/player/Walk.png")).convert("RGBA")
PLAYER_IDLE = Image.open(os.path.join(here, "../../public/assets/sprites/player/Idle.png")).convert("RGBA")


def put(s, y, x0, row):
    for i, ch in enumerate(row):
        if ch != '.': s.px(x0+i, y, C[ch])

LEGS = (PLAYER_IDLE, 0, 0)   # (sheet, column, row) the planted shoes are copied from
SWAY = 0                     # horizontal shift of the skirt rows from SWAY_FROM down, for the walk
SWAY_FROM = 25

def base(s, dy, body, leg_row):
    """Shadow, cardigan + skirt (bobbing), planted shoes copied from the player's sheet."""
    sheet, col, _ = LEGS
    for y, h in body.items(): put(s, y+dy, 8 + (SWAY if y >= SWAY_FROM else 0), mirror(h))
    if dy < 0: put(s, 28, 8 + SWAY, mirror(body[28]))   # hem row repeats to fill the gap
    for x in range(32):
        c = sheet.getpixel((col*32+x, leg_row*32+29))
        if c[3] == 255: s.px(x, 29, C[LEG_MAP[c[:3]]])

def glasses(s, dy, centres, bridge):
    """Thick round frames: 3x3 ring, eye in the lens, glint top-left."""
    for cx in centres:
        for yy in (13, 14, 15):
            for xx in (cx-1, cx, cx+1):
                s.px(xx, yy+dy, C['e'] if (xx == cx and yy == 14) else C['F'])
        s.px(cx-1, 13+dy, C['l'])
    for x in bridge: s.px(x, 14+dy, C['F'])

def bun(s, dy, shift=0):
    for y, (x0, r) in BUN.items(): put(s, y+dy, x0+shift, r)
    s.px(15+shift, 4+dy, C['r']); s.px(16+shift, 4+dy, C['r'])      # hair tie

def draw_front(s, dy):
    base(s, dy, BODY, 0)
    for y in (19, 21): s.px(15, y+dy, C['T']); s.px(16, y+dy, C['T'])
    for y, h in HEAD.items(): put(s, y+dy, 9, mirror(h))
    bun(s, dy)
    s.px(17, 8+dy, C['W']); s.px(18, 8+dy, C['W'])
    glasses(s, dy, (13, 18), (15, 16))
    s.px(12, 16+dy, C['b']); s.px(19, 16+dy, C['b'])

BACK_BODY = {y: r.replace('t', 'G').replace('K', 'G') for y, r in BODY.items()}
BACK_HAIR = {
 5:"....AAA", 6:"..AAHHL", 7:".AHHLLL", 8:".AHLLLL", 9:"AHHLLLL", 10:"AHHLLLL", 11:"AHHLLLL",
 12:"AHHLLLL", 13:"AHHHLLL", 14:"AHHHLLL", 15:".AHHHLL", 16:".AAHHHL", 17:"...AAHh",
}
def draw_back(s, dy):
    base(s, dy, BACK_BODY, 1)
    for y in range(19, 23): s.px(15, y+dy, C['g']); s.px(16, y+dy, C['g'])   # centre back seam
    for y, h in BACK_HAIR.items(): put(s, y+dy, 9, mirror(h))
    bun(s, dy)
    s.px(17, 8+dy, C['W']); s.px(18, 8+dy, C['W'])

HEAD34 = {
 5:(13,"AAAAAA"), 6:(11,"AAHHLLLLAA"), 7:(10,"AHHLLLLLLHHA"), 8:(9,"AHHLLWLLLLLLHA"),
 9:(9,"AHHLLLLLLLLLHA"), 10:(9,"AHHLLLLLLLLLHA"), 11:(9,"AHHLLLLLLLLLHA"),
 12:(9,"AHHhLLSSSSSSHA"), 13:(9,"AHHhLSSSSSSSsA"), 14:(9,"AHHhHSSSSSSSsA"),
 15:(9,"AHHhHSSSSSSSsA"), 16:(13,"AsSSSSsA"), 17:(13,"AAsSSA"),
}
def draw_right(s, dy):                       # 3/4 view facing down-right
    base(s, dy, BODY, 2)
    for y in range(19, 22): s.px(14, y+dy, C['G']); s.px(18, y+dy, C['t'])
    for y in (19, 21): s.px(16, y+dy, C['T']); s.px(17, y+dy, C['T'])
    for y, (x0, r) in HEAD34.items(): put(s, y+dy, x0, r)
    bun(s, dy, -1)
    s.px(16, 8+dy, C['W']); s.px(17, 8+dy, C['W'])
    glasses(s, dy, (15, 19), (17,))
    s.px(14, 16+dy, C['b']); s.px(19, 16+dy, C['b'])

def draw_left(s, dy):
    tmp = Sprite(32, 32); draw_right(tmp, dy)
    for y in range(32):
        for x in range(32):
            c = tmp.get(x, y)
            if c and (len(c) < 4 or c[3] > 0): s.px(31-x, y, c)

def render(w, cols, make_cell):
    out_sheet = Sprite(w, 128)
    for row, fn in enumerate((draw_front, draw_back, draw_right, draw_left)):
        for i in range(cols):
            f = Sprite(32, 32); make_cell(f, fn, row, i)
            for y in range(32):
                for x in range(32):
                    c = f.get(x, y)
                    if c and (len(c) < 4 or c[3] > 0): out_sheet.px(i*32+x, row*32+y, c)
    return out_sheet

def idle_cell(f, fn, row, i):
    global LEGS, SWAY
    LEGS, SWAY = (PLAYER_IDLE, 0, 0), 0
    fn(f, (0, -1)[i])

# walk: pose L,n,R,n with bob 0,-1,0,-1; the hem sways with the leading foot
def walk_cell(f, fn, row, i):
    global LEGS, SWAY
    LEGS, SWAY = (PLAYER_WALK, i, 0), (-1, 0, 1, 0)[i]
    fn(f, (0, -1, 0, -1)[i])

out = os.path.abspath(os.path.join(here, "../../public/assets/sprites/gloria"))
os.makedirs(out, exist_ok=True)
idle = render(64, 2, idle_cell)
idle.preview(os.path.join(here, "preview.png"), scale=6)
idle.save_png(os.path.join(out, "Idle.png"))
walk = render(128, 4, walk_cell)
walk.preview(os.path.join(here, "walk_preview.png"), scale=5)
walk.save_png(os.path.join(out, "Walk.png"))
walk.stats()
