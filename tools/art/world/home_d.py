"""Dom D (B4-8, B4-9): rekwizyty z pulpitu, ramka pamieci ze swieca, legowisko sypialni."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from home_a import BR, BR_D, seal

WD = ("wood.0", "wood.1", "wood.2", "wood.3")


def prop_ball():
    im = H.canvas(16, 16)
    H.rrect(im, 3, 4, 12, 13, 4, ("brick.0", "brick.1", "brick.2", "brick.3"))
    H.put(im, 5, 6, "linen.1"); H.put(im, 6, 5, "linen.2"); H.put(im, 5, 5, "brick.3")
    H.hline(im, 4, 11, 9, "hay.2"); H.hline(im, 5, 10, 10, "hay.1")      # pas
    return seal(im)


def prop_hay_ball():
    r = random.Random(8)
    im = H.canvas(16, 16)
    H.rrect(im, 2, 3, 13, 13, 5, ("hay.0", "hay.1", "hay.2", "hay.2"))
    for _ in range(24):
        x, y = r.randint(3, 12), r.randint(4, 12)
        if im.getpixel((x, y))[3]: H.put(im, x, y, r.choice(["hay.0", "hay.3", "hay.3"]))
    H.hline(im, 5, 9, 4, "hay.3"); H.put(im, 4, 5, "hay.3")
    return seal(im)


def prop_tunnel():
    im = H.canvas(32, 16)
    H.rrect(im, 1, 3, 30, 13, 5, ("hay.0", "hay.1", "hay.2", "hay.2"))
    for x in range(4, 28, 4): H.vline(im, x, 4, 11, "hay.0")             # splot
    for x in range(3, 29, 4): H.vline(im, x, 4, 10, "hay.3")
    H.rrect(im, 1, 4, 8, 12, 3, ("plum.0", "plum.0", "plum.1", "plum.1"))   # wlot
    H.rrect(im, 0, 3, 3, 13, 1, ("hay.0", "hay.1", "hay.1", "hay.2"))
    H.hline(im, 12, 26, 3, "hay.3")
    return seal(im)


def prop_house():
    im = H.canvas(32, 32)
    H.rect(im, 4, 14, 27, 28, "wood.2"); H.hline(im, 4, 27, 14, "wood.3")
    for x in range(4, 28, 4): H.vline(im, x, 15, 28, "wood.1")           # deski
    for k in range(10):                                                    # dach
        H.hline(im, 14 - k * 1 - 3 + 0, 17 + k + 3 - 0, 4 + k, "brick.2" if k % 2 else "brick.3")
    H.hline(im, 3, 28, 13, "brick.0"); H.hline(im, 2, 29, 14, "brick.1")
    H.rrect(im, 11, 18, 20, 28, 4, ("plum.0", "plum.0", "plum.1", "plum.1"))   # drzwi
    H.rect(im, 22, 18, 25, 21, "hay.2"); H.put(im, 23, 19, "hay.0")             # okienko
    H.put(im, 15, 3, "wood.3")
    return seal(im)


def _candle_frame(flame):
    im = H.canvas(16, 16)
    H.rrect(im, 2, 3, 13, 14, 2, WD)
    H.rect(im, 4, 5, 11, 12, "linen.2"); H.rect(im, 5, 6, 10, 8, "dusk.3")   # zdjecie
    H.put(im, 7, 7, "plum.2"); H.hline(im, 5, 10, 8, "moss.3"); H.rect(im, 5, 9, 10, 11, "hay.1")
    H.rect(im, 12, 9, 13, 14, "linen.1"); H.put(im, 12, 8, "linen.2")       # swieca
    if flame is not None:
        c = ("flame.3", "flame.2", "flame.3", "flame.1")[flame]
        H.put(im, 12, 6, c); H.put(im, 12 + (flame % 2), 7, "flame.2")
    return im


def memory_frame():
    off = seal(_candle_frame(None), spread=1)
    on = [seal(_candle_frame(k), spread=1) for k in range(4)]
    return off, on


def dorm_nest():
    r = random.Random(14)
    im = H.canvas(64, 32)
    H.rrect(im, 2, 10, 61, 29, 8, ("hay.0", "hay.1", "hay.2", "hay.2"))
    H.rrect(im, 8, 14, 55, 26, 6, ("hay.1", "hay.2", "hay.2", "hay.3"))
    for _ in range(160):
        x, y = r.randint(5, 58), r.randint(12, 27)
        if im.getpixel((x, y))[3]: H.put(im, x, y, r.choice(["hay.0", "hay.3", "hay.0"]))
    H.rrect(im, 6, 8, 24, 16, 4, BR)                                        # poduszki
    H.rrect(im, 38, 8, 56, 16, 4, BR)
    H.hline(im, 9, 21, 9, "brick.3"); H.hline(im, 41, 53, 9, "brick.3")
    H.put(im, 15, 12, "brick.0"); H.put(im, 47, 12, "brick.0")
    H.rrect(im, 24, 12, 40, 20, 3, BR_D)                                    # koc
    H.break_checkers(im)
    return seal(im, spread=1)


A = {"prop_ball": prop_ball, "prop_tunnel": prop_tunnel, "prop_hay_ball": prop_hay_ball,
     "prop_house": prop_house, "dorm_nest": dorm_nest}


def build():
    out = []
    for i, fn in A.items():
        im = fn()
        H.register_item(i, "house", im)
        out.append((i, im))
    off, on = memory_frame()
    H.register_states("memory_frame", "house", off, on, "candle")
    out.append(("memory_frame", off))
    return out, on
