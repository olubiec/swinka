"""B9: 40 dekoracji sklepu przerysowane w stylu domku z siana. Te same ramki co decor.json (kontrakt bez zmian)."""
import json
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image
from garden import blob

DEC = H.ROOT / "assets/decor"
R = random.Random(9)
FIN = lambda im: H.contact_shadow(H.outline(im), rows=1, spread=0) if False else H.outline(im)


def fin(im):
    H.break_checkers(im)
    return H.outline(im)


def strokes(im, x0, y0, x1, y1, cols, n, ln=(2, 4), seed=1):
    r = random.Random(seed)
    for _ in range(n):
        x, y = r.randint(x0, x1), r.randint(y0, y1)
        H.vline(im, x, y, min(y1, y + r.randint(*ln)), r.choice(cols))


# ---------- tapety 240x96 ----------
def w_hay():
    im = H.canvas(240, 96); H.rect(im, 0, 0, 239, 95, "hay.0")
    strokes(im, 0, 0, 239, 92, ["hay.1", "hay.1", "hay.2"], 700, (3, 6), 2)
    for x in (30, 90, 150, 210):
        y = 40 + (x % 7) * 4; H.vline(im, x, y + 2, y + 14, "moss.2")
        H.rect(im, x - 2, y - 2, x + 2, y + 2, "flame.2"); H.rect(im, x - 1, y - 1, x + 1, y + 1, "wood.1")
    return im


def w_brick():
    im = H.canvas(240, 96); H.rect(im, 0, 0, 239, 95, "plum.1")
    for row, y in enumerate(range(0, 96, 6)):
        for x in range(-8 * (row % 2), 240, 16):
            c = R.choice(["brick.1", "brick.1", "brick.2"])
            H.rect(im, x + 1, y + 1, x + 14, y + 4, c); H.hline(im, x + 1, x + 14, y + 1, "brick.2" if c == "brick.1" else "brick.3")
            H.hline(im, x + 1, x + 14, y + 4, "brick.0")
    return im


def w_wood():
    im = H.canvas(240, 96)
    for i, x in enumerate(range(0, 240, 16)):
        H.rect(im, x, 0, x + 15, 95, "wood.2" if i % 2 else "wood.3")
        H.vline(im, x, 0, 95, "wood.0"); H.vline(im, x + 1, 0, 95, "wood.3")
        strokes(im, x + 3, 0, x + 13, 90, ["wood.1"], 8, (4, 9), i)
    return im


def w_forest():
    im = H.canvas(240, 96)
    for y in range(96): H.hline(im, 0, 239, y, "dusk.4" if y < 30 else "moss.3" if y < 55 else "moss.2")
    r = random.Random(4)
    for x in range(10, 240, 34):
        H.rect(im, x, 38, x + 2, 88, "wood.1")
        blob(im, x + 1, 30, 11, ("moss.1", "moss.2", "moss.2", "moss.3"), r)
    for x in range(0, 240, 9): H.put(im, x + r.randint(0, 6), 90 + r.randint(0, 4), "moss.3")
    return im


def w_stripes():
    im = H.canvas(240, 96); H.rect(im, 0, 0, 239, 95, "hay.0")
    for x in range(0, 240, 16): H.rect(im, x, 0, x + 7, 95, "wood.3"); H.vline(im, x + 8, 0, 95, "hay.1")
    for y in range(4, 96, 12):
        for x in range(12, 240, 16): H.put(im, x, y, "rose.1"); H.put(im, x, y + 1, "moss.3")
    return im


def w_winter():
    im = H.canvas(240, 96)
    for y in range(96): H.hline(im, 0, 239, y, "dusk.4" if y < 50 else "linen.2")
    r = random.Random(6)
    for _ in range(40): H.put(im, r.randint(0, 239), r.randint(0, 50), "linen.3")
    for x in (24, 70, 120, 170, 214):
        h = 30 + (x % 3) * 6
        for k in range(5):
            w = 3 + k * 3; y = 90 - h + k * h // 5
            H.hline(im, x - w, x + w, y + 3, "moss.1"); H.hline(im, x - w, x + w, y + 2, "moss.0" if k % 2 else "moss.2")
            H.hline(im, x - w + 1, x + w - 1, y, "linen.3")
        H.rect(im, x - 1, 90, x + 1, 93, "wood.1")
    return im


# ---------- podlogi 240x34 ----------
def planks(tones, seam, h=8, w=40, seed=1):
    im = H.canvas(240, 34); r = random.Random(seed)
    for row, y in enumerate(range(0, 34, h)):
        for x in range(-r.randint(0, w), 240, w):
            H.rect(im, x, y, x + w - 2, y + h - 2, r.choice(tones)); H.vline(im, x + w - 1, y, y + h - 1, seam)
        H.hline(im, 0, 239, min(33, y + h - 1), seam)
    return im


def f_laminate(): return planks(["dusk.3", "dusk.3", "dusk.2"], "dusk.1", seed=2)
def f_hardwood(): return planks(["wood.1", "wood.1", "wood.0"], "plum.0", 8, 48, 3)


def f_stone():
    im = H.canvas(240, 34); H.rect(im, 0, 0, 239, 33, "dusk.1")
    for row, y in enumerate(range(0, 34, 11)):
        for x in range(-12 * (row % 2), 240, 24):
            H.rect(im, x + 1, y + 1, x + 22, y + 9, R.choice(["dusk.3", "dusk.3", "dusk.2"])); H.hline(im, x + 1, x + 22, y + 1, "dusk.4")
    return im


def f_straw():
    im = H.canvas(240, 34); H.rect(im, 0, 0, 239, 33, "hay.1")
    r = random.Random(5)
    for _ in range(420):
        x, y = r.randint(0, 235), r.randint(0, 33); H.hline(im, x, x + r.randint(3, 6), y, r.choice(["hay.0", "hay.2", "hay.2"]))
    return im


def f_cardboard():
    im = H.canvas(240, 34)
    for y in range(34): H.hline(im, 0, 239, y, "wood.3" if y % 4 < 2 else "hay.2")
    for x in range(0, 240, 60): H.vline(im, x, 0, 33, "wood.2")
    return im


def f_wool():
    im = H.canvas(240, 34); H.rect(im, 0, 0, 239, 33, "linen.1")
    for y in range(0, 34, 2):
        for x in range((y // 2 % 2) * 2, 240, 4): H.put(im, x, y, "linen.2"); H.put(im, x + 1, y + 1, "plum.3")
    return im


# ---------- posciel 96x14 ----------
def mound(w, h, tones, dots, seed):
    im = H.canvas(w, h); r = random.Random(seed)
    for y in range(h):
        t = (y + .5) / h; half = int((w / 2 - 2) * (1 - (1 - min(1, t * 1.6)) ** 2) ** .5) if t < .6 else int(w / 2 - 2 - (t - .6) * 6)
        H.hline(im, w // 2 - half, w // 2 + half, y, tones[0] if y < h * .35 else tones[1] if y < h * .75 else tones[2])
    for _ in range(dots[0]):
        x, y = r.randint(8, w - 9), r.randint(3, h - 2)
        if im.getpixel((x, y))[3]: H.put(im, x, y, dots[1])
    return im


def b_brown(): return fin(mound(96, 14, ("wood.3", "wood.2", "wood.1"), (30, "wood.1"), 1))
def b_grey(): return fin(mound(96, 14, ("linen.1", "dusk.4", "dusk.3"), (30, "linen.2"), 2))


def b_aspen():
    im = mound(96, 14, ("hay.1", "hay.1", "hay.0"), (0, "hay.1"), 3); r = random.Random(3)
    for _ in range(60):
        x, y = r.randint(8, 87), r.randint(2, 12)
        if im.getpixel((x, y))[3]: H.hline(im, x, x + 2, y, r.choice(["hay.2", "wood.3"]))
    return fin(im)


def b_hay():
    im = mound(96, 14, ("hay.2", "hay.1", "hay.0"), (0, "hay.1"), 4); r = random.Random(4)
    for _ in range(120):
        x, y = r.randint(8, 86), r.randint(1, 12)
        if im.getpixel((x, y))[3]: H.hline(im, x, x + 3, y, r.choice(["hay.3", "hay.0", "hay.2"]))
    return fin(im)


# ---------- kryjowki ----------
def hole(im, cx, by, w, h, c="plum.0"):
    for y in range(h):
        k = int(w / 2 * (1 - (1 - y / h) ** 2) ** .5) if y else 0
        H.hline(im, cx - k, cx + k, by - h + y + 1, c)


def h_logs():
    im = H.canvas(72, 44)
    for row, (y, n) in enumerate(((30, 4), (20, 3), (10, 3))):
        for i in range(n):
            x = 4 + i * 20 + (row % 2) * 8
            H.rect(im, x, y, x + 19, y + 9, "wood.2"); H.hline(im, x, x + 19, y, "wood.3"); H.hline(im, x, x + 19, y + 9, "wood.0")
            H.rect(im, x + 16, y + 1, x + 19, y + 8, "hay.2"); H.put(im, x + 17, y + 4, "wood.3")
    H.rect(im, 28, 32, 44, 43, "plum.0"); hole(im, 36, 43, 18, 10)
    return fin(im)


def h_willow():
    im = H.canvas(72, 32)
    for y in range(32):
        k = int(34 * (1 - ((y - 31) / 31) ** 2) ** .5) if y < 31 else 34
        for x in range(36 - k, 36 + k + 1):
            if x % 5 < 3 and y > 2 or y % 4 < 2: H.put(im, x, y, "wood.2" if (x + y) % 3 else "wood.3")
            else: H.put(im, x, y, "moss.1")
    H.rect(im, 36 - 14, 14, 36 + 14, 31, "plum.0"); hole(im, 36, 31, 28, 18)
    for x in range(4, 68, 6): H.put(im, x, 10 + abs(36 - x) // 4, "moss.3")
    return fin(im)


def h_box():
    im = H.canvas(56, 40)
    H.rect(im, 2, 8, 53, 39, "hay.0"); H.rect(im, 2, 8, 53, 12, "wood.3"); H.hline(im, 2, 53, 12, "wood.2")
    H.vline(im, 27, 8, 12, "hay.2"); H.hline(im, 2, 53, 39, "wood.1")
    hole(im, 28, 39, 20, 18)
    H.rect(im, 6, 16, 14, 18, "wood.2"); H.rect(im, 42, 20, 50, 22, "wood.2")
    return fin(im)


def h_sack():
    im = H.canvas(56, 34)
    for y in range(34):
        k = 26 - max(0, 5 - y) * 3 if y < 28 else 26 - (y - 27) // 2
        H.hline(im, 28 - k, 28 + k, y, "rose.2" if y < 8 else "rose.1" if y < 26 else "rose.0")
    for x in range(6, 50, 7): H.vline(im, x, 6, 28, "rose.0")
    hole(im, 28, 33, 18, 16)
    H.hline(im, 12, 44, 5, "plum.3")
    return fin(im)


def h_igloo():
    im = H.canvas(56, 40)
    for y in range(40):
        k = int(27 * (1 - ((y - 39) / 39) ** 2) ** .5) if y < 39 else 27
        H.hline(im, 28 - k, 28 + k, y, "linen.2" if y < 20 else "linen.1")
    for y in range(4, 40, 7):
        for x in range(56):
            if im.getpixel((x, y))[3]: H.put(im, x, y, "dusk.4")
        for x in range((y // 7 % 2) * 6, 56, 12):
            for yy in range(y, min(40, y + 7)):
                if im.getpixel((x, yy))[3]: H.put(im, x, yy, "dusk.4")
    im2 = H.canvas(56, 40)
    im2.alpha_composite(im)
    H.recolor if False else None
    hole(im2, 28, 39, 20, 18, "dusk.0")
    return fin(im2)


def h_house():
    im = H.canvas(72, 44)
    H.rect(im, 6, 18, 65, 43, "wood.2")
    for x in range(6, 66, 6): H.vline(im, x, 18, 43, "wood.1")
    for y in range(0, 17):
        k = 36 - y * 2; H.hline(im, 36 - k + 18, 36 + k - 18, y, "brick.1" if y % 4 else "brick.2")
    for y in range(0, 17): H.hline(im, 6 + max(0, (16 - y) * 2 - 0) // 1 if False else 2 + (16 - y), 69 - (16 - y), y + 1, "brick.1" if y % 4 else "brick.2")
    H.hline(im, 2, 69, 17, "brick.0")
    H.rect(im, 12, 24, 22, 32, "dusk.3"); H.rect(im, 13, 25, 21, 31, "dusk.4"); H.vline(im, 17, 24, 32, "wood.0"); H.hline(im, 12, 22, 28, "wood.0")
    hole(im, 46, 43, 20, 20)
    return fin(im)


# ---------- plotki 24x40 ----------
def fence_wire(frame, bar, seed):
    im = H.canvas(24, 40)
    for x in (1, 22): H.vline(im, x, 0, 39, frame); H.vline(im, x + 1 if x == 1 else x - 1, 0, 39, bar)
    for x in range(7, 22, 7): H.vline(im, x, 1, 38, bar)
    for y in (3, 19, 35): H.hline(im, 1, 22, y, frame)
    return fin(im)


def fence_pick():
    im = H.canvas(24, 40)
    for y in (12, 28): H.rect(im, 0, y, 23, y + 3, "wood.2"); H.hline(im, 0, 23, y, "wood.3")
    for x in (2, 10, 18):
        H.rect(im, x, 6, x + 4, 39, "linen.2"); H.vline(im, x, 6, 39, "linen.3"); H.vline(im, x + 4, 6, 39, "linen.1")
        H.put(im, x + 2, 4, "linen.2"); H.hline(im, x + 1, x + 3, 5, "linen.2")
    return fin(im)


# ---------- karmniki ----------
def fd_bowl():
    im = H.canvas(20, 12)
    for y, k in enumerate((8, 9, 9, 9, 8, 7, 6)):
        H.hline(im, 10 - k, 10 + k - 1, 5 + y, "dusk.3" if y < 4 else "dusk.2")
    H.hline(im, 2, 17, 4, "dusk.4")
    for x in range(4, 16, 2): H.put(im, x, 3, "hay.2"); H.put(im, x + 1, 2 + x % 2, "moss.3")
    return fin(im)


def fd_rack():
    im = H.canvas(32, 30)
    H.rect(im, 2, 4, 29, 6, "wood.2")
    for x in range(4, 28, 3): H.vline(im, x, 7, 20, "wood.1")
    strokes(im, 3, 2, 28, 18, ["hay.1", "hay.2", "hay.3"], 60, (3, 5), 8)
    H.rect(im, 2, 22, 29, 26, "wood.2"); H.hline(im, 2, 29, 22, "wood.3"); H.hline(im, 2, 29, 26, "wood.0")
    H.rect(im, 4, 27, 6, 29, "wood.1"); H.rect(im, 25, 27, 27, 29, "wood.1")
    return fin(im)


def fd_basket():
    im = H.canvas(28, 20)
    for y in range(7, 19):
        H.hline(im, 3 + (y - 7) // 4, 24 - (y - 7) // 4, y, "hay.2" if (y % 2) else "wood.3")
    for x in range(5, 24, 3): H.vline(im, x, 8, 17, "wood.2")
    H.hline(im, 2, 25, 6, "wood.1")
    for x, c in ((6, "flame.1"), (11, "moss.2"), (16, "flame.1"), (20, "moss.3")): H.rect(im, x, 3, x + 3, 6, c)
    return fin(im)


def fd_bottle():
    im = H.canvas(14, 30)
    H.rect(im, 3, 6, 10, 26, "dusk.4"); H.vline(im, 4, 8, 24, "linen.3"); H.hline(im, 3, 10, 22, "dusk.3")
    H.rect(im, 4, 22, 9, 25, "dusk.3")
    H.rect(im, 5, 2, 8, 5, "wood.2"); H.rect(im, 6, 26, 7, 29, "plum.2")
    for y in (10, 14, 18): H.hline(im, 3, 5, y, "dusk.3")
    return fin(im)


def fd_veg():
    im = H.canvas(24, 12)
    for y, k in enumerate((10, 11, 11, 10)): H.hline(im, 12 - k, 12 + k - 1, 6 + y, "linen.2" if y < 3 else "linen.1")
    for x, c in ((6, "flame.1"), (10, "moss.2"), (14, "rose.1"), (17, "hay.2")): H.rect(im, x, 3, x + 3, 6, c)
    H.hline(im, 2, 21, 5, "linen.3")
    return fin(im)


# ---------- dywany 56x12 ----------
def oval(im, cx, cy, rx, ry, c):
    for y in range(cy - ry, cy + ry + 1):
        k = int(rx * (1 - ((y - cy) / (ry + .5)) ** 2) ** .5)
        H.hline(im, cx - k, cx + k, y, c)


def rg_knit():
    im = H.canvas(56, 12)
    for i, c in enumerate(["rose.1", "linen.1", "rose.2", "linen.2", "rose.1"]): oval(im, 28, 6, 26 - i * 5, 5 - i, c)
    return fin(im)


def rg_plaid():
    im = H.canvas(56, 12); oval(im, 28, 6, 26, 5, "brick.1")
    for x in range(6, 52, 8):
        for y in range(1, 11): 
            if im.getpixel((x, y))[3]: H.put(im, x, y, "moss.2")
    for y in (3, 8):
        for x in range(3, 53):
            if im.getpixel((x, y))[3]: H.put(im, x, y, "moss.2" if x % 8 else "hay.2")
    return fin(im)


def rg_paws():
    im = H.canvas(56, 12); oval(im, 28, 6, 26, 5, "linen.2")
    for x in (14, 28, 42):
        H.rect(im, x - 1, 5, x + 1, 7, "plum.2")
        for dx in (-2, 0, 2): H.put(im, x + dx, 3, "plum.2")
    return fin(im)


# ---------- rosliny 20x28 ----------
def pot(im):
    H.rect(im, 5, 18, 14, 26, "brick.2"); H.hline(im, 4, 15, 18, "brick.3"); H.hline(im, 5, 14, 26, "brick.0"); H.hline(im, 5, 14, 21, "brick.1")


def p_dandelion():
    im = H.canvas(20, 28); pot(im); H.vline(im, 10, 9, 17, "moss.2")
    oval(im, 10, 7, 4, 4, "hay.2"); oval(im, 10, 7, 2, 2, "hay.3"); H.hline(im, 6, 9, 16, "moss.3"); H.hline(im, 11, 14, 15, "moss.3")
    return fin(im)


def p_parsley():
    im = H.canvas(20, 28); pot(im)
    for cx, cy in ((6, 12), (10, 8), (14, 12), (10, 13)): oval(im, cx, cy, 3, 3, "moss.2"); H.put(im, cx, cy - 1, "moss.3")
    return fin(im)


def p_wheat():
    im = H.canvas(20, 28); pot(im)
    for x in range(5, 15, 2): H.vline(im, x, 4 + (x % 3) * 2, 17, "moss.3" if x % 4 else "moss.2")
    return fin(im)


# ---------- lampy i obrazy ----------
def l_fairy(on):
    im = H.canvas(60, 14)
    for x in range(1, 59):
        H.put(im, x, 3 + int(3 * abs(((x % 20) - 10) / 10.0) * -1 + 3), "plum.2")
    for i, x in enumerate(range(4, 58, 6)):
        y = 3 + int(3 * abs(((x % 20) - 10) / 10.0) * -1 + 3)
        c = "hay.3" if (i + on) % 2 == 0 else "flame.2"
        H.rect(im, x, y + 1, x + 1, y + 3, c)
        if (i + on) % 2 == 0: H.put(im, x, y + 4, "flame.1")
    return fin(im)


def l_desk():
    im = H.canvas(20, 30)
    H.rect(im, 4, 26, 15, 29, "wood.1"); H.hline(im, 4, 15, 26, "wood.2")
    H.vline(im, 9, 12, 25, "plum.2"); H.vline(im, 10, 12, 25, "plum.1")
    for y, k in enumerate((3, 5, 7, 8)): H.hline(im, 10 - k, 9 + k, 4 + y, "flame.2" if y < 3 else "flame.1")
    H.hline(im, 4, 15, 8, "flame.0"); H.rect(im, 9, 9, 10, 10, "hay.3")
    return fin(im)


def pic_field():
    im = H.canvas(22, 18); H.rect(im, 1, 1, 20, 16, "wood.2")
    H.rect(im, 3, 3, 18, 14, "dusk.4"); H.rect(im, 3, 9, 18, 14, "hay.1")
    strokes(im, 3, 9, 18, 13, ["hay.2", "hay.3"], 14, (1, 3), 3); H.rect(im, 14, 4, 16, 6, "hay.3")
    return fin(im)


def pic_pigs():
    im = H.canvas(22, 18); H.rect(im, 1, 1, 20, 16, "wood.2"); H.rect(im, 3, 3, 18, 14, "hay.1")
    H.hline(im, 3, 18, 13, "moss.2"); H.hline(im, 3, 18, 14, "moss.1")
    oval(im, 8, 10, 4, 3, "wood.1"); oval(im, 15, 11, 2, 2, "linen.2")             # duza i mala swinka
    for x, y in ((5, 8), (13, 9)): H.put(im, x, y, "wood.0" if x < 10 else "linen.1")      # uszy
    for x, y in ((5, 10), (13, 11)): H.put(im, x, y, "plum.0")                                # oczy
    H.put(im, 4, 11, "rose.1"); H.put(im, 12, 12, "rose.1")                                 # noski
    return fin(im)


def tile(im): return im


ORDER = {"wallpaper_hay_meadow": w_hay, "wallpaper_brick": w_brick, "wallpaper_wood_panels": w_wood, "wallpaper_forest": w_forest,
         "wallpaper_cosy_stripes": w_stripes, "wallpaper_winter": w_winter,
         "floor_grey_laminate": f_laminate, "floor_dark_hardwood": f_hardwood, "floor_stone_tiles": f_stone, "floor_straw": f_straw,
         "floor_cardboard": f_cardboard, "floor_wool_mat": f_wool,
         "bed_fleece_brown": b_brown, "bed_fleece_grey": b_grey, "bed_aspen": b_aspen, "bed_hay_pile": b_hay,
         "hide_log_stack": h_logs, "hide_willow_tunnel": h_willow, "hide_cardboard_box": h_box, "hide_fleece_sack": h_sack,
         "hide_igloo": h_igloo, "hide_wooden_house": h_house,
         "fence_wire_black": lambda: fence_wire("plum.0", "plum.1", 1), "fence_wire_white": lambda: fence_wire("linen.2", "linen.1", 2), "fence_picket": fence_pick,
         "feeder_bowl_blue": fd_bowl, "feeder_hay_rack": fd_rack, "feeder_wicker_basket": fd_basket, "feeder_water_bottle": fd_bottle, "feeder_veggie_dish": fd_veg,
         "rug_knit_round": rg_knit, "rug_plaid": rg_plaid, "rug_paws": rg_paws,
         "plant_dandelion": p_dandelion, "plant_parsley": p_parsley, "plant_wheatgrass": p_wheat,
         "lamp_fairy_lights": [lambda: l_fairy(0), lambda: l_fairy(1)], "lamp_desk": l_desk,
         "picture_hay_field": pic_field, "picture_pig_family": pic_pigs}


def build(out_dir=None):
    meta = json.loads((DEC / "decor.json").read_text(encoding="utf-8"))
    sheet = Image.new("RGBA", (1024, 278), (0, 0, 0, 0)); frames = {}
    for name, e in meta["items"].items():
        fns = ORDER[name] if isinstance(ORDER[name], list) else [ORDER[name]]
        for fn, (x, y, w, h) in zip(fns, e["frames"]):
            im = fn()
            if im.size != (w, h): raise ValueError(f"{name}: {im.size} != {(w, h)}")
            sheet.alpha_composite(im, (x, y)); frames.setdefault(name, []).append(im)
    H.save_png(sheet, DEC / "decor.png")
    return sheet, frames


if __name__ == "__main__":
    import style_check as SC
    sheet, frames = build()
    tmp = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad/dec"); tmp.mkdir(exist_ok=True)
    rows = []
    for n, ims in frames.items():
        for i, im in enumerate(ims):
            p = tmp / f"{n}_{i}.png"; H.save_png(im, p)
            kind = "tile" if n.startswith(("wallpaper", "floor")) else "prop"
            rows.append((n, SC.check_image(p, kind, list(im.size), None, n)))
    txt, bad = SC.report(rows); print("\n".join(l for l in txt.splitlines() if l.split("\t")[0] in [r[0] for r in rows] and any(v != "0" for v in l.split("\t")[1:]) or l.startswith(("Pliki", "Suma"))))
    bg = Image.new("RGBA", sheet.size, (120, 110, 100, 255)); bg.alpha_composite(sheet)
    bg.convert("RGB").resize((2048, 556), Image.NEAREST).save(tmp.parent / "b9.png")
