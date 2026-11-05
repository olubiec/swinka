"""C1: 15 brakujacych kafli (6 scian + 9 podlog). Uzycie: python3 tools/art/world/tiles_c1.py
Kafle sa zawiniete (torus). Zapis: assets/world/tiles/*.png + tiles.json + arkusz docs/album/przebudowa/c1_kafle.png"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent)); sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import tiles as T
import handart as H
import build_tiles as B

wp, fill = T.wp, T.fill


def stripes(a, b):
    im = T.tile(); fill(im, a)
    for x in range(16):
        if (x // 4) % 2: 
            for y in range(16): wp(im, x, y, b)
    return im


def diamonds(base, motif, light):
    im = T.tile(); fill(im, base)
    for cx, cy in ((4, 4), (12, 12)):
        for d in range(-3, 4):
            w = 3 - abs(d)
            for k in range(-w, w + 1): wp(im, cx + k, cy + d, motif)
        wp(im, cx, cy, light)
    return im


def clouds(base, cloud, seed):
    im = T.paper(base, cloud, seed, "cloud")
    return im


def stars_night(base, star, glow):
    im = T.tile(); fill(im, base)
    for (x, y) in ((3, 3), (11, 8), (6, 13)):
        wp(im, x, y, star); wp(im, x - 1, y, glow); wp(im, x + 1, y, glow); wp(im, x, y - 1, glow); wp(im, x, y + 1, glow)
    for (x, y) in ((13, 2), (1, 9), (9, 1), (14, 14)): wp(im, x, y, glow)
    return im


def cream(base, motif):
    im = T.tile(); fill(im, base)
    for gy in range(4):
        for gx in range(4):
            wp(im, gx * 4 + (2 if gy % 2 else 0), gy * 4 + 1, motif)
    return im


def checker(a, b, grout):
    im = T.tile(); fill(im, a)
    for gy in range(2):
        for gx in range(2):
            if (gx + gy) % 2: H.rect(im, gx * 8, gy * 8, gx * 8 + 7, gy * 8 + 7, b)
    for i in range(16): wp(im, i, 0, grout); wp(im, i, 8, grout); wp(im, 0, i, grout); wp(im, 8, i, grout)
    return im


def stone(base, dark, light, seed):
    import random
    r = random.Random(seed); im = T.tile(); fill(im, base)
    rows = [(0, 0), (5, 4), (10, 0), (15, 6)]
    for y in range(16):
        off = 0 if (y // 5) % 2 == 0 else 5
        for x in range(16):
            if y % 5 == 0 or (x - off) % 10 == 0: wp(im, x, y, dark)
    for _ in range(14): wp(im, r.randint(0, 15), r.randint(0, 15), light)
    return im


def soil(seed):
    return T.straw("wood.1", "wood.0", "wood.2", seed)


def build():
    W = [("wallpaper_mint", stripes("moss.4", "moss.3")), ("wallpaper_peach", T.paper("hay.2", "hay.1", 41, "dots")),
         ("wallpaper_sky", clouds("dusk.4", "linen.3", 42)), ("wallpaper_lilac", diamonds("plum.3", "plum.2", "linen.3")),
         ("wallpaper_night", stars_night("dusk.0", "hay.3", "dusk.2")), ("wallpaper_cream", cream("linen.3", "linen.2"))]
    F = [("floor_wood_light", T.planks("wood.4", "wood.2", "linen.3", 51)), ("floor_wood", T.planks("wood.3", "wood.1", "wood.4", 52)),
         ("floor_tiles_checker", checker("linen.3", "linen.1", "linen.0")), ("floor_carpet_red", T.knit("brick.2", "brick.1", "brick.3")),
         ("floor_grass", T.grass("moss.3", "moss.2", "moss.4", 53, flowers=False, regular=True)), ("floor_soil", soil(54)),
         ("floor_stone", stone("linen.1", "linen.0", "linen.2", 55)), ("floor_straw", T.straw("hay.1", "hay.0", "hay.2", 56)),
         ("floor_fleece", T.knit("linen.3", "linen.2", "rose.0"))]
    return W + F


if __name__ == "__main__":
    L = build()
    B.reg(L)
    B.sheet(L, B.OUT / "c1_kafle.png", cols=8)
    print(len(L))
