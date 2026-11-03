"""Dom B (B4-4, B4-5): cieple dodatki. Tkaniny w rampie brick (recolor), drewno wood, rosliny moss."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from home_a import BR, BR_D, seal

WD = ("wood.0", "wood.1", "wood.2", "wood.3")


def gramophone():
    im = H.canvas(16, 16)
    H.rrect(im, 2, 9, 13, 14, 2, WD)                           # skrzynka
    H.hline(im, 3, 12, 10, "wood.3")
    H.rrect(im, 4, 7, 11, 9, 1, ("plum.0", "plum.0", "plum.1", "plum.1"))   # plyta
    H.hline(im, 5, 10, 7, "plum.2"); H.put(im, 8, 7, "rose.1")
    H.vline(im, 11, 3, 8, "wood.1")                            # ramie
    for x, y in ((9, 2), (10, 1), (11, 1), (12, 1), (13, 2), (13, 3), (12, 4), (11, 3)):  # tuba
        H.put(im, x, y, "hay.2")
    H.put(im, 10, 2, "hay.1"); H.put(im, 12, 3, "hay.0")
    H.put(im, 12, 11, "hay.1")                                 # korbka
    return seal(im)


def mug_steam():
    im = H.canvas(16, 16)
    H.rrect(im, 4, 8, 10, 13, 2, BR)
    H.hline(im, 5, 9, 8, "plum.0"); H.hline(im, 5, 9, 9, "hay.0")      # herbata
    H.put(im, 11, 9, "brick.2"); H.put(im, 12, 10, "brick.2"); H.put(im, 11, 11, "brick.2")
    for x, y in ((6, 6), (7, 5), (6, 4), (7, 3), (8, 6), (9, 5), (8, 4)):   # para
        H.put(im, x, y, "linen.2" if (x + y) % 2 else "linen.3")
    return seal(im, spread=1)


def rug_fringed():
    r = random.Random(6)
    im = H.canvas(32, 16)
    H.rect(im, 2, 3, 29, 12, "brick.2")
    H.rect(im, 4, 5, 27, 10, "brick.3")
    for x in range(5, 27, 4):                                  # romby haftu w srodku
        H.put(im, x, 7, "hay.1"); H.put(im, x + 1, 8, "hay.1"); H.put(im, x, 8, "brick.1")
    H.rect(im, 14, 6, 17, 9, "hay.2"); H.rect(im, 15, 7, 16, 8, "brick.1")
    for x in range(2, 30, 2):                                  # frendzle
        H.put(im, x, 2, "linen.2"); H.put(im, x, 1, "linen.1")
        H.put(im, x + (1 if r.random() < .5 else 0), 13, "linen.2")
    H.hline(im, 2, 29, 3, "brick.1"); H.hline(im, 2, 29, 12, "brick.1")
    H.break_checkers(im)
    return H.ground(im)


def blanket_folded():
    im = H.canvas(16, 16)
    H.rrect(im, 1, 6, 14, 13, 2, BR)
    for y in (8, 11): H.hline(im, 2, 13, y, "brick.1")
    H.rect(im, 1, 10, 3, 12, "brick.1")
    for x in range(1, 15, 2): H.put(im, x, 14, "linen.2")     # frendzle
    H.hline(im, 3, 12, 7, "brick.3")
    H.put(im, 10, 9, "hay.1"); H.put(im, 11, 10, "hay.1"); H.put(im, 9, 10, "hay.1")
    return seal(im)


def mirror_wavy():
    im = H.canvas(16, 32)
    pts = [(5, 4), (4, 7), (4, 12), (3, 18), (4, 23), (5, 26)]
    H.rrect(im, 3, 2, 12, 27, 3, WD)
    for y in range(4, 26):
        wob = 1 if (y // 5) % 2 else 0
        for x in range(5 + wob, 11 - (1 - wob)):
            H.put(im, x, y, "dusk.4" if (x + y) % 5 else "dusk.3")
    H.vline(im, 6, 6, 12, "linen.2"); H.vline(im, 6, 16, 18, "linen.2"); H.put(im, 7, 8, "linen.1")
    H.put(im, 8, 1, "wood.3"); H.put(im, 7, 0, "hay.0")
    return seal(im, shadow=False)


def frames_gallery():
    im = H.canvas(32, 16)
    spec = [(1, 3, 9, 11, "wood.2", "moss.3", "hay.2"), (11, 1, 8, 7, "hay.2", "rose.1", "plum.2"),
            (11, 8, 8, 14, "wood.1", "dusk.3", "linen.2"), (21, 2, 30, 12, "brick.2", "hay.1", "moss.2")]
    for x0, y0, x1, y1, fr, a, b in spec:
        H.rect(im, x0, y0, x1, y1, fr)
        H.rect(im, x0 + 1, y0 + 1, x1 - 1, y1 - 1, a)
        if x1 - x0 > 3 and y1 - y0 > 3:
            H.rect(im, x0 + 2, y1 - 3, x1 - 2, y1 - 1, b)
    H.put(im, 5, 6, "linen.1")
    return seal(im, shadow=False)


def plant_pot():
    im = H.canvas(16, 16)
    H.rrect(im, 4, 9, 11, 14, 2, ("brick.0", "brick.1", "brick.2", "brick.3"))
    H.hline(im, 4, 11, 9, "brick.3")
    for x, y in ((8, 8), (7, 6), (9, 6), (6, 4), (10, 4), (8, 3), (5, 6), (11, 6), (8, 5)):
        H.rect(im, x - 1, y, x + 1, y + 1, "moss.2")
    H.put(im, 8, 2, "moss.3"); H.put(im, 6, 5, "moss.4"); H.put(im, 10, 5, "moss.1")
    return seal(im)


def plant_shelf():
    im = H.canvas(16, 16)
    H.rrect(im, 5, 10, 10, 14, 1, WD)
    for k, (x, y) in enumerate(((7, 9), (6, 7), (9, 7), (8, 5), (5, 8), (10, 9))):
        H.rect(im, x, y, x + 1, y + 1, "moss.2" if k % 2 else "moss.3")
    H.put(im, 8, 4, "moss.4"); H.put(im, 9, 6, "rose.1")
    return seal(im, shadow=False)


def plant_trailing():
    im = H.canvas(16, 16)
    H.rrect(im, 4, 1, 11, 5, 1, WD)
    H.hline(im, 5, 10, 1, "moss.3")
    for x, h in ((4, 8), (6, 11), (8, 7), (10, 12), (11, 6)):
        for k in range(h):
            H.put(im, x, 5 + k, "moss.2" if k % 3 else "moss.3")
            if k % 4 == 2: H.put(im, x + 1, 5 + k, "moss.1")
    return seal(im, shadow=False)


A = {"gramophone": (gramophone, "house"), "mug_steam": (mug_steam, "house"),
     "rug_fringed": (rug_fringed, "house"), "blanket_folded": (blanket_folded, "house"),
     "mirror_wavy": (mirror_wavy, "house"), "frames_gallery": (frames_gallery, "house"),
     "plant_pot": (plant_pot, "house"), "plant_shelf": (plant_shelf, "house"),
     "plant_trailing": (plant_trailing, "house")}


def build(ids=None):
    out = []
    for i, (fn, pl) in A.items():
        if ids and i not in ids: continue
        im = fn()
        H.register_item(i, pl, im)
        out.append((i, im))
    return out
