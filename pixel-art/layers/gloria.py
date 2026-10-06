"""Gloria: her bottom (skirt), top (cardigan and blouse), hair (bun), accessories (glasses) and face. The body
(head skin, hands, feet), the walk cycle and the export come from charlib.py."""
from charlib import Character, mirror

C = {
    "A": "#0c0a07",                                                  # outline
    "h": "#3b2417", "H": "#5a3a24", "L": "#7a5233", "W": "#9a6e45",  # hair (brown)
    "b": "#c4686a",                                                  # blush
    "g": "#1a2f25", "G": "#24473a", "K": "#33634f",                  # dark green cardigan
    "t": "#dbcbbc", "T": "#b9a592",                                  # blouse
    "d": "#4a2f20", "D": "#6b4530", "E": "#8a5d3f",                  # brown skirt
    "F": "#5b4a52", "e": "#291a18", "l": "#dcecef",                  # glasses frame / eye / lens
    "r": "#8e2434",                                                  # hair tie
}

# ---- bottom: skirt (half rows from x=8, mirrored) ----------------------------------------------------------------
SKIRT = {23: "...ADDEE", 24: "..ADDEEE", 25: ".ADDEEEE", 26: ".ADDEEEE", 27: ".ADDEEEE", 28: ".Adddddd"}
SWAY_FROM = 25


def bottom(cell, ctx):
    for y, h in SKIRT.items():
        cell.put("bottom", y + ctx.dy, 8 + (ctx.sway if y >= SWAY_FROM else 0), mirror(h), C)
    if ctx.dy < 0:                                                   # the hem row repeats to fill the gap
        cell.put("bottom", 28, 8 + ctx.sway, mirror(SKIRT[28]), C)


# ---- top: cardigan and blouse ----------------------------------------------------------------------------------
CARDIGAN = {17: "...AAGGG", 18: "...AGGGG", 19: "...AGKtt", 20: "..AGGKtt", 21: ".AGKAGtt", 22: ".....gGG"}
CARDIGAN_BACK = {y: r.replace("t", "G").replace("K", "G") for y, r in CARDIGAN.items()}


def top(cell, ctx):
    dy = ctx.dy
    rows = CARDIGAN_BACK if ctx.facing == "up" else CARDIGAN
    for y, h in rows.items():
        cell.put("top", y + dy, 8, mirror(h), C)
    if ctx.facing == "down":
        for y in (19, 21):
            cell.px("top", 15, y + dy, C["T"])
            cell.px("top", 16, y + dy, C["T"])
    elif ctx.facing == "up":
        for y in range(19, 23):                                      # centre back seam
            cell.px("top", 15, y + dy, C["g"])
            cell.px("top", 16, y + dy, C["g"])
    else:
        for y in range(19, 22):
            cell.px("top", 14, y + dy, C["G"])
            cell.px("top", 18, y + dy, C["t"])
        for y in (19, 21):
            cell.px("top", 16, y + dy, C["T"])
            cell.px("top", 17, y + dy, C["T"])


# ---- hair: bun ---------------------------------------------------------------------------------------------------
HAIR_FRONT = {5: "....AAA", 6: "..AAHHL", 7: ".AHHLLL", 8: ".AHLLWW", 9: "AHHLLLL", 10: "AHHLLLL", 11: "AHHLLLL",
              12: "AHHL...", 13: "AHHL...", 14: "AHH....", 15: "AAH...."}
HAIR_BACK = {5: "....AAA", 6: "..AAHHL", 7: ".AHHLLL", 8: ".AHLLLL", 9: "AHHLLLL", 10: "AHHLLLL", 11: "AHHLLLL",
             12: "AHHLLLL", 13: "AHHHLLL", 14: "AHHHLLL", 15: ".AHHHLL", 16: ".AAHHHL", 17: "...AAHh"}
HAIR_RIGHT = {5: (13, "AAAAAA"), 6: (11, "AAHHLLLLAA"), 7: (10, "AHHLLLLLLHHA"), 8: (9, "AHHLLWLLLLLLHA"),
              9: (9, "AHHLLLLLLLLLHA"), 10: (9, "AHHLLLLLLLLLHA"), 11: (9, "AHHLLLLLLLLLHA"),
              12: (9, "AHhLL.......HA"), 13: (9, "AAhL"), 14: (10, "AAH")}
BUN = {1: (14, "AAAA"), 2: (13, "AHLLHA"), 3: (13, "AHLWHA"), 4: (14, "AHHA")}


def bun(cell, dy, shift=0):
    for y, (x0, r) in BUN.items():
        cell.put("hair", y + dy, x0 + shift, r, C)
    cell.px("hair", 15 + shift, 4 + dy, C["r"])                      # hair tie
    cell.px("hair", 16 + shift, 4 + dy, C["r"])


def hair(cell, ctx):
    dy = ctx.dy
    if ctx.facing == "right":
        for y, (x0, r) in HAIR_RIGHT.items():
            cell.put("hair", y + dy, x0, r, C)
        bun(cell, dy, -1)
        cell.px("hair", 16, 8 + dy, C["W"])
        cell.px("hair", 17, 8 + dy, C["W"])
    else:
        for y, h in (HAIR_BACK if ctx.facing == "up" else HAIR_FRONT).items():
            cell.put("hair", y + dy, 9, mirror(h), C)
        bun(cell, dy)
        cell.px("hair", 17, 8 + dy, C["W"])
        cell.px("hair", 18, 8 + dy, C["W"])


# ---- accessories: round glasses (ring and bridge; the eye in each lens is the face's) ---------------------------
def glasses(cell, ctx):
    if ctx.facing == "up":
        return
    dy = ctx.dy
    centres, bridge = ((13, 18), (15, 16)) if ctx.facing == "down" else ((15, 19), (17,))
    for cx in centres:
        for yy in (13, 14, 15):
            for xx in (cx - 1, cx, cx + 1):
                if not (xx == cx and yy == 14):
                    cell.px("accessories", xx, yy + dy, C["F"])
        cell.px("accessories", cx - 1, 13 + dy, C["l"])
    for x in bridge:
        cell.px("accessories", x, 14 + dy, C["F"])


# ---- face: eyes and blush ------------------------------------------------------------------------------------------
def face(cell, ctx, expression):
    if ctx.facing == "up":
        return
    dy = ctx.dy
    eyes, cheeks = ((13, 18), (12, 19)) if ctx.facing == "down" else ((15, 19), (14, 19))
    for x in eyes:
        cell.px("face", x, 14 + dy, C["e"])
    for x in cheeks:
        cell.px("face", x, 16 + dy, C["b"])


def character():
    g = Character("gloria", body="light", bottom="gloria-skirt", top="gloria-cardigan", hair="gloria-bun",
                  accessories="gloria-glasses", face="gloria")
    g.work = {"sleeve": C["G"], "outline": C["A"], "leg_row": 27, "stand_leg_row": 28, "arm_rows": (21, 22),
              "hand_y": 20}
    g.draw = {"bottom": bottom, "top": top, "hair": hair, "accessories": glasses, "face": face}
    return g
