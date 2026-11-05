"""C4: 10 sprite'ow dekoru sklepu (dywany 32x16, rosliny i obrazki 16x16, lampa-gwiazdka 16x32 z wersja wlaczona).
Uzycie: python3 tools/art/world/decor_c4.py -> assets/world/house/*.png + atlas.json + album docs/album/przebudowa/c4_dekor.png"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image
P = "house"


def oval(im, x0, y0, x1, y1, c):
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + .5, (y1 - y0) / 2 + .5
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1: H.put(im, x, y, c)


def fin(im, shadow=False):
    H.break_checkers(im); im = H.outline(im)
    return H.contact_shadow(im, rows=1, spread=1) if shadow else im


def rug_round_pink():
    im = H.canvas(32, 16); oval(im, 1, 2, 30, 13, "rose.1"); oval(im, 4, 4, 27, 11, "rose.2"); oval(im, 9, 6, 22, 9, "rose.0")
    for x in (7, 13, 19, 25): H.put(im, x, 7, "linen.3")
    return fin(im)


def rug_stripes():
    im = H.canvas(32, 16); H.rect(im, 1, 3, 30, 12, "dusk.3")
    for i, c in enumerate(("hay.2", "dusk.3", "rose.1", "dusk.3", "moss.2", "dusk.3", "hay.2")): H.rect(im, 2 + i * 4, 3, 5 + i * 4, 12, c)
    for x in range(1, 31, 2): H.put(im, x, 2, "linen.2"); H.put(im, x, 13, "linen.2")
    H.hline(im, 1, 30, 3, "dusk.4")
    return fin(im)


def rug_heart():
    im = H.canvas(32, 16); H.rect(im, 1, 2, 30, 13, "linen.2"); H.rect(im, 2, 3, 29, 12, "brick.2")
    rows = ["..XX..XX..", ".XXXXXXXX.", ".XXXXXXXX.", "..XXXXXX..", "...XXXX...", "....XX...."]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == "X": H.put(im, 11 + x, 5 + y, "rose.0")
    return fin(im)


def pot(im, c0, c1):
    H.rect(im, 5, 10, 10, 14, c1); H.hline(im, 4, 11, 9, c0); H.vline(im, 5, 10, 14, c0)


def plant_fern():
    im = H.canvas(16, 16); pot(im, "brick.3", "brick.2")
    for dx, h in ((-5, 4), (-3, 6), (-1, 7), (1, 7), (3, 6), (5, 4)):
        for k in range(h): H.put(im, 8 + dx // 2 + (k * dx) // 7, 8 - k, "moss.3" if k % 2 else "moss.2")
    H.vline(im, 8, 2, 8, "moss.1")
    return fin(im)


def plant_cactus():
    im = H.canvas(16, 16); pot(im, "hay.3", "hay.2")
    H.rect(im, 6, 3, 9, 9, "moss.2"); H.vline(im, 6, 3, 9, "moss.3"); H.vline(im, 9, 3, 9, "moss.1")
    H.rect(im, 3, 5, 5, 6, "moss.2"); H.rect(im, 3, 3, 4, 5, "moss.2"); H.rect(im, 10, 6, 12, 7, "moss.2"); H.rect(im, 11, 4, 12, 6, "moss.2")
    for x, y in ((7, 4), (8, 6), (7, 8)): H.put(im, x, y, "linen.3")
    H.put(im, 7, 2, "rose.1")
    return fin(im)


def plant_flowers():
    im = H.canvas(16, 16); pot(im, "plum.3", "plum.2")
    for x, c, y in ((5, "rose.1", 3), (8, "hay.3", 2), (11, "berry.1", 4)):
        H.vline(im, x, y + 1, 8, "moss.2"); H.put(im, x, y, c); H.put(im, x - 1, y, c); H.put(im, x + 1, y, c); H.put(im, x, y - 1, c); H.put(im, x, y + 1, "hay.1")
    return fin(im)


def frame(inner, wide=True):
    im = H.canvas(16, 16); H.rect(im, 1, 2, 14, 13, "wood.2"); H.hline(im, 1, 14, 2, "wood.3"); H.vline(im, 1, 2, 13, "wood.3")
    H.rect(im, 3, 4, 12, 11, "linen.3"); inner(im)
    return fin(im)


def picture_pig():
    def f(im):
        oval(im, 4, 6, 11, 11, "hay.3"); H.rect(im, 4, 5, 5, 6, "rose.1"); H.rect(im, 10, 5, 11, 6, "rose.1"); H.put(im, 6, 8, "wood.0"); H.put(im, 9, 8, "wood.0"); H.hline(im, 7, 8, 10, "rose.1")
    return frame(f)


def picture_sunset():
    def f(im):
        H.rect(im, 3, 4, 12, 7, "flame.2"); H.rect(im, 3, 8, 12, 11, "dusk.2"); oval(im, 6, 6, 9, 9, "flame.3"); H.hline(im, 3, 12, 8, "dusk.3")
    return frame(f)


def picture_carrot():
    def f(im):
        H.rect(im, 3, 4, 12, 11, "moss.4")
        for k in range(6): H.put(im, 5 + k, 5 + k // 1 if k < 5 else 10, "flame.2"); H.put(im, 6 + k, 5 + k if k < 5 else 10, "flame.1")
        H.put(im, 4, 5, "moss.2"); H.put(im, 5, 4, "moss.2")
    return frame(f)


def lamp_star(on):
    im = H.canvas(16, 32)
    H.rect(im, 7, 14, 8, 27, "wood.2"); H.vline(im, 7, 14, 27, "wood.3"); H.hline(im, 4, 11, 28, "wood.2"); H.hline(im, 4, 11, 29, "wood.1")
    c = ("flame.2", "flame.3") if on else ("hay.1", "hay.2")
    H.rect(im, 6, 5, 9, 12, c[0]); H.rect(im, 3, 7, 12, 10, c[0]); H.rect(im, 5, 4, 10, 4, c[0]); H.rect(im, 7, 2, 8, 3, c[0]); H.rect(im, 4, 12, 5, 13, c[0]); H.rect(im, 10, 12, 11, 13, c[0])
    H.rect(im, 7, 7, 8, 9, c[1])
    return fin(im, True)


if __name__ == "__main__":
    L = [("rug_round_pink", rug_round_pink()), ("rug_stripes", rug_stripes()), ("rug_heart", rug_heart()),
         ("plant_fern", plant_fern()), ("plant_cactus", plant_cactus()), ("plant_flowers", plant_flowers()),
         ("picture_pig", picture_pig()), ("picture_sunset", picture_sunset()), ("picture_carrot", picture_carrot())]
    for n, im in L:
        extra = {"layer": "wall"} if n.startswith("picture") else {}
        H.register_item(n, P, im)
    H.register_states("lamp_star", P, lamp_star(False), [lamp_star(True)], "lamp_mushroom", fps=1)
    L.append(("lamp_star", lamp_star(True)))
    out = H.ROOT / "docs/album/przebudowa/c4_dekor.png"
    sh = Image.new("RGBA", (36 * len(L), 36), (120, 110, 100, 255))
    for k, (n, im) in enumerate(L): sh.alpha_composite(im, (36 * k + 2, 34 - im.height))
    sh.resize((sh.width * 4, sh.height * 4), Image.NEAREST).save(out); print(len(L))
