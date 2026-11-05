"""Farma (B7-1..B7-5): plansza farm.png (uprawy 4 stadia, drzewka 3 stadia, grzadki, woda, wielki zbior)
w ukladzie ramek z farm.json, plus przedmioty farmy i stodola. Handart, paleta domek z siana."""
import json
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from garden import blob
from PIL import Image

FARM_DIR = H.WORLD_DIR / "farm"
WD = ("wood.0", "wood.1", "wood.2", "wood.3")
G_DARK = ("moss.0", "moss.1", "moss.1", "moss.2")
G_MID = ("moss.1", "moss.2", "moss.2", "moss.3")
G_LT = ("moss.2", "moss.3", "moss.3", "moss.4")


def mound(im, seed=None):
    H.hline(im, 6, 9, 12, "wood.2"); H.hline(im, 4, 11, 13, "wood.1"); H.hline(im, 3, 12, 14, "wood.0")
    if seed: H.put(im, 7, 13, seed)


def sprout(im):
    H.vline(im, 8, 9, 12, "moss.2")
    H.put(im, 7, 9, "moss.3"); H.put(im, 6, 8, "moss.3"); H.put(im, 9, 8, "moss.3"); H.put(im, 10, 9, "moss.3")
    H.put(im, 7, 10, "moss.2"); H.put(im, 9, 10, "moss.2")


def stalk(im, x, top, c="moss.2"):
    H.vline(im, x, top, 12, c)


def stake(im, x=11, top=3):
    H.vline(im, x, top, 12, "wood.2"); H.put(im, x, top, "wood.3")


def leafy(im, tones, r, cy, rnd, dots=None):
    blob(im, 8, cy, r, tones, rnd)
    if dots:
        for x, y, c in dots: H.put(im, x, y, c)


def _line(im, x0, y0, x1, y1, c, w=1):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
        for k in range(w): H.put(im, x + k, y, c)


def rosette(im, leaves, base, tip, w=2):
    for dx, h in leaves:
        _line(im, 8, 12, 8 + dx, 12 - h, base, w)
        H.put(im, 8 + dx, 12 - h, tip)


def _stage(crop, s):
    r = random.Random(hash(crop) % 1000 + s)
    im = H.canvas(16, 16)
    seedc = {"dandelion": "hay.2", "carrot": "flame.1"}.get(crop)
    mound(im, seedc)
    if s == 0:
        return H.outline(im)
    if s == 1:
        sprout(im)
        return H.outline(im)
    big = s == 3
    if crop == "dandelion":
        rosette(im, [(-6, 3), (-4, 4), (-2, 5), (2, 5), (4, 4), (6, 3)] if big else [(-4, 3), (-2, 4), (2, 4), (4, 3)], "moss.2", "moss.3")
        if big:
            H.vline(im, 8, 3, 11, "moss.2"); H.rect(im, 6, 0, 10, 3, "hay.2"); H.rect(im, 7, 1, 9, 2, "hay.3"); H.put(im, 6, 0, "hay.1"); H.put(im, 10, 3, "hay.1")
        return H.outline(im)
    if crop == "cilantro":
        lv = [(-5, 7), (-3, 9), (-1, 10), (1, 10), (3, 9), (5, 7)] if big else [(-3, 5), (-1, 6), (1, 6), (3, 5)]
        rosette(im, lv, "moss.2", "moss.4", 1)
        for dx, h in lv: H.put(im, 8 + dx + 1, 12 - h, "moss.3"); H.put(im, 8 + dx, 12 - h - 1, "moss.3") if big else None
        if big:
            for x, y in ((4, 3), (8, 1), (12, 3)): H.put(im, x, y, "linen.3")
        return H.outline(im)
    if crop == "parsley":
        leafy(im, G_DARK, 5 if big else 3, 8 if big else 10, r)
        if big:
            for x, y in ((6, 6), (9, 5), (11, 8), (5, 9), (8, 8)): H.put(im, x, y, "moss.3"); H.put(im, x + 1, y + 1, "moss.2")
        return H.outline(im)
    if crop == "basil":
        stalk(im, 8, 4 if big else 8)
        for y in ((10, 7, 4) if big else (10,)):
            for dx in (-2, 1):
                H.rect(im, 8 + dx, y, 8 + dx + 1, y + 1, "moss.3"); H.put(im, 8 + dx, y, "moss.4")
        if big: H.rect(im, 7, 1, 8, 3, "linen.2"); H.put(im, 8, 0, "linen.3")
        return H.outline(im)
    if crop == "kale":
        lv = [(-5, 6), (-3, 8), (0, 10), (3, 8), (5, 6)] if big else [(-3, 4), (0, 6), (3, 4)]
        rosette(im, lv, "moss.1", "moss.2", 3)
        for dx, h in lv: H.put(im, 8 + dx, 12 - h, "dusk.2"); H.put(im, 9 + dx, 12 - h, "dusk.3") if big else None
        return H.outline(im)
    if crop == "romaine_lettuce":
        for k, dx in enumerate((-2, 0, 2)):
            H.rrect(im, 7 + dx - 1, (6 if big else 8) - abs(dx) // 2, 8 + dx + 1, 12, 1, G_LT if k != 1 else G_MID)
        if big: H.vline(im, 8, 4, 11, "linen.3"); H.put(im, 7, 5, "moss.4")
        return H.outline(im)
    if crop == "carrot":
        leafy(im, G_LT, 4 if big else 3, 8 if big else 9, r)
        if big: H.rect(im, 7, 11, 9, 13, "flame.1"); H.put(im, 8, 13, "flame.0"); H.put(im, 7, 11, "flame.2")
        return H.outline(im)
    if crop == "cucumber":
        stake(im, 11, 2); stalk(im, 8, 6 if big else 8)
        for x, y in ((6, 8), (10, 6), (6, 5), (9, 9)): H.put(im, x, y, "moss.3"); H.put(im, x - 1, y, "moss.2")
        if big:
            H.rect(im, 5, 10, 6, 13, "moss.1"); H.put(im, 5, 10, "moss.3"); H.rect(im, 10, 9, 11, 12, "moss.1")
        return H.outline(im)
    if crop == "zucchini":
        leafy(im, G_MID, 5 if big else 3, 7 if big else 10, r)
        if big:
            H.rrect(im, 3, 11, 12, 13, 1, ("moss.0", "moss.1", "moss.2", "moss.2")); H.hline(im, 4, 10, 11, "moss.3")
            H.put(im, 8, 4, "hay.2"); H.put(im, 8, 3, "hay.3")
        return H.outline(im)
    if crop == "bell_pepper":
        stalk(im, 8, 5 if big else 8); blob(im, 8, 6 if big else 9, 4 if big else 3, G_MID, r)
        if big:
            H.rect(im, 5, 9, 6, 12, "brick.1"); H.put(im, 5, 9, "brick.2"); H.rect(im, 10, 9, 11, 11, "hay.2"); H.put(im, 10, 9, "hay.3")
        return H.outline(im)
    if crop == "cherry_tomato":
        stake(im, 11, 2); stalk(im, 8, 5 if big else 8); blob(im, 8, 6 if big else 9, 3, G_DARK, r)
        if big:
            for x, y in ((5, 8), (6, 10), (10, 9), (9, 6), (7, 5)): H.put(im, x, y, "brick.1"); H.put(im, x, y - 1, "brick.2")
        return H.outline(im)
    return H.outline(im)


def crop_frames(crop):
    return [_stage(crop, s) for s in range(4)]


def tree_frames(kind):
    out = []
    for s in range(3):
        r = random.Random(7 + s)
        im = H.canvas(16, 32)
        H.hline(im, 6, 9, 28, "wood.2"); H.hline(im, 4, 11, 29, "wood.1"); H.hline(im, 3, 12, 30, "wood.0")
        if s == 0:
            H.vline(im, 8, 21, 28, "wood.2"); blob(im, 6, 21, 3, G_MID, r); blob(im, 10, 20, 3, G_LT, r)
        else:
            low = kind in ("strawberry", "blueberry")
            if not low:
                H.rect(im, 7, 15, 9, 28, "wood.1"); H.vline(im, 7, 15, 28, "wood.2")
            base = 20 if low else 10
            blob(im, 8, base + (2 if low else 2), 6 if low else 7, G_DARK, r)
            blob(im, 8, base, 6 if low else 7, G_MID if s == 1 else G_LT, r)
            if s == 2:
                dots = {"strawberry": ("brick.1", "rose.2"), "apple": ("brick.1", "flame.1"),
                        "blueberry": ("dusk.2", "plum.3"), "pear": ("hay.2", "moss.4")}[kind]
                for x, y in ((5, base - 1), (9, base - 3), (11, base + 1), (7, base + 2), (4, base + 3), (10, base + 4)):
                    H.put(im, x, y, dots[0]); H.put(im, x + 1, y, dots[1])
        out.append(H.outline(im))
    return out


def bed(wet=False, plain=False):
    r = random.Random(21 + wet)
    im = H.canvas(16, 16)
    base, alt = ("wood.0", "plum.1") if wet else ("wood.1", "wood.0")
    for y in range(16):
        for x in range(16):
            H.put(im, x, y, base if r.random() > .12 else alt)
    if not plain:
        for y in (3, 7, 11):
            H.hline(im, 0, 15, y, "wood.0" if not wet else "plum.0"); H.hline(im, 0, 15, y + 1, "wood.2" if not wet else "wood.1")
    if wet:
        for x, y in ((3, 2), (9, 5), (13, 9), (5, 12), (11, 14)): H.put(im, x, y, "dusk.3"); H.put(im, x + 1, y, "dusk.4")
    return im


def water_frames():
    fr = []
    for f in range(4):
        im = H.canvas(16, 16)
        for k, x in enumerate((2, 5, 8, 11, 14)):
            y = (k * 3 + f * 4) % 14
            H.put(im, x, y, "dusk.4"); H.put(im, x, y + 1, "dusk.3"); H.put(im, x, y + 2, "dusk.2")
        fr.append(im)
    return fr


def harvest_frames():
    fr = []
    for f in range(4):
        im = H.canvas(16, 16)
        rad = (1, 3, 5, 6)[f]
        for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            x, y = 8 + dx * rad, 8 + dy * rad
            H.put(im, x, y, "flame.3" if f < 3 else "hay.2")
            if f in (1, 2): H.put(im, x + dx, y + dy, "hay.3")
        H.put(im, 8, 8, "linen.3") if f < 3 else None
        fr.append(im)
    return fr


CROPS = ("dandelion", "cilantro", "parsley", "basil", "romaine_lettuce", "cucumber", "kale", "zucchini",
         "bell_pepper", "carrot", "cherry_tomato")
TREES = ("strawberry", "apple", "blueberry", "pear")


def build_sheet():
    meta = json.loads((FARM_DIR / "farm.json").read_text(encoding="utf-8"))
    sheet = H.canvas(*meta["size"])
    frames = {}
    for c in CROPS: frames["crop_" + c] = crop_frames(c)
    for t in TREES: frames["tree_" + t] = tree_frames(t)
    frames["bed_empty"] = [bed()]
    frames["bed_wet"] = [bed(True)]
    frames["soil"] = [bed(plain=True)]
    frames["water_anim"] = water_frames()
    frames["great_harvest"] = harvest_frames()
    for name, rects in meta["frames"].items():
        assert len(rects) == len(frames[name]), name
        for (x, y, w, h), im in zip(rects, frames[name]):
            assert im.size == (w, h), (name, im.size, (w, h))
            sheet.alpha_composite(im, (x, y))
    H.save_png(sheet, FARM_DIR / "farm.png")
    return sheet, frames


# ---------------- B7-5: przedmioty farmy, stodola ----------------
def scarecrow():
    im = H.canvas(16, 32)
    H.vline(im, 8, 12, 29, "wood.2"); H.vline(im, 7, 12, 29, "wood.1")
    H.hline(im, 1, 14, 15, "wood.2"); H.hline(im, 1, 14, 16, "wood.1")
    H.rrect(im, 5, 14, 10, 24, 1, ("brick.0", "brick.1", "brick.2", "brick.2"))             # koszula
    H.rect(im, 2, 14, 4, 18, "brick.1"); H.rect(im, 11, 14, 13, 18, "brick.1")               # rekawy
    H.rrect(im, 5, 5, 10, 12, 2, ("hay.1", "hay.2", "hay.3", "hay.3"))                       # glowa ze slomy
    H.put(im, 7, 8, "plum.0"); H.put(im, 9, 8, "plum.0"); H.hline(im, 7, 9, 10, "plum.1")
    H.hline(im, 3, 12, 5, "wood.1"); H.rect(im, 5, 1, 10, 4, "wood.1"); H.hline(im, 5, 10, 1, "wood.2")   # kapelusz
    H.hline(im, 1, 3, 19, "hay.2"); H.hline(im, 12, 14, 19, "hay.2"); H.put(im, 4, 24, "hay.2"); H.put(im, 11, 24, "hay.2")
    H.hline(im, 5, 10, 17, "moss.2")
    return H.ground(H.outline(im))


def fence_farm():
    im = H.canvas(16, 16)
    for x in (1, 6, 11):
        H.rrect(im, x, 5, x + 2, 14, 1, WD); H.put(im, x + 1, 4, "wood.2")
    H.rect(im, 0, 8, 15, 9, "wood.2"); H.hline(im, 0, 15, 8, "wood.3"); H.hline(im, 0, 15, 9, "wood.1")
    H.rect(im, 0, 12, 15, 12, "wood.1")
    return H.ground(H.outline(im))


def wheelbarrow():
    im = H.canvas(32, 16)
    H.rrect(im, 6, 4, 24, 11, 3, ("wood.0", "wood.1", "wood.2", "wood.3"))                  # skrzynia
    H.hline(im, 7, 23, 5, "wood.3")
    for x in range(9, 23, 3): H.put(im, x, 3, "hay.2"); H.put(im, x + 1, 2, "hay.3")        # siano w srodku
    H.hline(im, 22, 30, 7, "wood.2"); H.hline(im, 22, 30, 8, "wood.1")                       # raczki
    H.rrect(im, 1, 8, 7, 14, 2, ("plum.1", "plum.2", "plum.3", "plum.3")); H.put(im, 4, 11, "dusk.2")  # kolo
    H.vline(im, 22, 11, 14, "wood.1")
    return H.ground(H.outline(im))


def signpost():
    im = H.canvas(16, 16)
    H.rect(im, 7, 3, 8, 14, "wood.1"); H.vline(im, 7, 3, 14, "wood.2")
    H.rrect(im, 2, 3, 13, 7, 1, ("wood.1", "wood.2", "wood.3", "wood.3")); H.hline(im, 4, 10, 5, "wood.1")
    H.put(im, 12, 4, "wood.0"); H.put(im, 3, 4, "wood.0")
    H.rrect(im, 5, 9, 14, 11, 1, ("wood.1", "wood.2", "wood.2", "wood.3")); H.put(im, 13, 10, "wood.0")
    return H.ground(H.outline(im))


def barn_hay():
    im = H.canvas(64, 48)
    H.rect(im, 6, 20, 57, 44, "wood.1")                                                      # sciany z desek
    for x in range(7, 57, 4): H.vline(im, x, 21, 43, "wood.0")
    H.hline(im, 6, 57, 21, "wood.3")
    for y in range(2, 22):                                                                    # dach slomiany, stromy
        half = 8 + int((y - 2) * 1.5)
        for x in range(32 - half, 32 + half + 1):
            H.put(im, x, y, "hay.2" if (x + (y // 2) * 3) % 5 else "hay.1")
        H.put(im, 32 - half, y, "hay.0"); H.put(im, 32 + half, y, "hay.0")
        if y % 3 == 0: H.hline(im, 32 - half + 1, 32 + half - 1, y, "hay.3")
    H.hline(im, 0, 63, 22, "hay.0")
    H.rrect(im, 21, 28, 42, 44, 1, ("wood.0", "wood.1", "wood.2", "wood.2"))                  # wrota
    H.vline(im, 31, 29, 43, "wood.0"); H.vline(im, 32, 29, 43, "wood.0")
    H.rect(im, 22, 29, 30, 30, "wood.3"); H.rect(im, 33, 29, 41, 30, "wood.3")
    H.rrect(im, 27, 10, 36, 17, 1, ("plum.0", "plum.0", "plum.1", "plum.1"))                   # luk strychu
    H.put(im, 29, 15, "hay.2"); H.put(im, 33, 14, "hay.2"); H.put(im, 31, 16, "hay.3")        # siano w strychu
    for x in (24, 30, 34, 40): H.put(im, x, 44, "hay.2")                                      # slomki u wrot
    H.break_checkers(im)
    return H.ground(H.outline(im), spread=2)


ITEMS = {"scarecrow": scarecrow, "fence_farm": fence_farm, "wheelbarrow": wheelbarrow,
         "signpost": signpost, "barn_hay": barn_hay}


def build_items():
    out = []
    for i, fn in ITEMS.items():
        im = fn()
        H.register_item(i, "farm", im)
        out.append((i, im))
    return out


if __name__ == "__main__":
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sheet, frames = build_sheet()
    bg = Image.new("RGBA", sheet.size, (43, 60, 78, 255)); bg.alpha_composite(sheet)
    bg.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(S / "b7-farm_sheet.png")
    items = build_items()
    H.sheet([im for _, im in items], 4).save(S / "b7-5.png")
