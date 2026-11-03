"""Ogrod A (B5-1..B5-3): rosliny, konstrukcje, woda i zabawa. Handart, paleta domek z siana."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from garden import blob, MOSS

WD = ("wood.0", "wood.1", "wood.2", "wood.3")


def _soil(im, x0, x1, y0, y1):
    H.rect(im, x0, y0, x1, y1, "wood.0")
    H.hline(im, x0, x1, y0, "wood.1")


def _bed(flower_fn, seed):
    r = random.Random(seed)
    im = H.canvas(32, 16)
    H.rrect(im, 1, 9, 30, 14, 2, WD)                                  # obrzeze
    _soil(im, 3, 28, 9, 11)
    for x in range(3, 29, 3):
        blob(im, x + 1, 8, 3, MOSS, r)
        flower_fn(im, x + 1, 5 + r.randint(0, 2), r)
    H.break_checkers(im)
    return H.ground(im)


def _tulip(im, x, y, r):
    c = r.choice(["rose.1", "rose.2", "flame.2", "brick.2"])
    H.put(im, x, y, c); H.put(im, x - 1, y - 1 if False else y, c); H.put(im, x, y - 1, c)
    H.put(im, x, y + 1, "moss.3")


def _daisy(im, x, y, r):
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)): H.put(im, x + dx, y + dy, "linen.2")
    H.put(im, x, y, "hay.2")


def flowerbed_tulip(): return _bed(_tulip, 1)
def flowerbed_daisy(): return _bed(_daisy, 2)


def bush_berry():
    r = random.Random(3)
    im = H.canvas(16, 16)
    for cx, cy, rr in ((5, 9, 4), (11, 9, 4), (8, 6, 5)): blob(im, cx, cy, rr, MOSS, r)
    for x, y in ((5, 8), (9, 6), (11, 10), (7, 10), (4, 11), (12, 8)):
        H.put(im, x, y, "berry.0"); H.put(im, x, y - 1, "berry.1") if y > 6 else None
    H.break_checkers(im)
    return H.ground(H.outline(im))


def hedge():
    r = random.Random(4)
    im = H.canvas(16, 16)
    for cx in (3, 8, 13): blob(im, cx, 9, 5, MOSS, r)
    H.rect(im, 0, 10, 15, 13, "moss.1")
    for x in range(0, 16, 3): H.put(im, x + r.randint(0, 1), 8 + r.randint(0, 2), "moss.3")
    H.break_checkers(im)
    return H.ground(H.outline(im))


A1 = {"flowerbed_tulip": flowerbed_tulip, "flowerbed_daisy": flowerbed_daisy,
      "bush_berry": bush_berry, "hedge": hedge}


def build(group):
    out = []
    for i, fn in group.items():
        im = fn()
        H.register_item(i, "garden", im)
        out.append((i, im))
    return out


# ---------------- B5-2: konstrukcje ----------------
def fence_wood():
    im = H.canvas(16, 16)
    for x in (2, 7, 12):
        H.rrect(im, x, 4, x + 2, 14, 1, WD); H.put(im, x + 1, 3, "wood.2")
    H.rect(im, 0, 7, 15, 8, "wood.2"); H.hline(im, 0, 15, 7, "wood.3"); H.hline(im, 0, 15, 8, "wood.1")
    H.rect(im, 0, 11, 15, 12, "wood.2"); H.hline(im, 0, 15, 11, "wood.3")
    return H.ground(H.outline(im))


def gate_garden():
    im = H.canvas(16, 16)
    for x in (1, 12):
        H.rrect(im, x, 3, x + 2, 14, 1, WD); H.put(im, x + 1, 2, "hay.2")
    for k, y in enumerate((5, 4, 3)):                                # luk
        H.hline(im, 3 + k * 1, 12 - k * 1, y, "wood.2") if False else None
    for x, y in ((3, 4), (4, 3), (5, 2), (6, 2), (7, 1), (8, 1), (9, 2), (10, 2), (11, 3), (12, 4)):
        H.put(im, x, y, "wood.3"); H.put(im, x, y + 1, "wood.2")
    for x in (5, 8, 10): H.vline(im, x, 7, 13, "wood.1")             # sztachety skrzydla
    H.hline(im, 3, 11, 8, "wood.2"); H.hline(im, 3, 11, 12, "wood.2")
    H.put(im, 7, 0, "rose.1"); H.put(im, 9, 0, "rose.2"); H.put(im, 8, 1, "moss.3")
    H.put(im, 3, 10, "hay.3"); H.put(im, 4, 10, "hay.2")             # klamka
    return H.ground(H.outline(im))


def arch_rose():
    r = random.Random(7)
    im = H.canvas(32, 16)
    for x in (3, 26):
        H.rrect(im, x, 4, x + 2, 14, 1, WD)
    for k in range(13):                                              # luk
        x = 5 + k * 2
        y = int(2 + 3.0 * ((k - 6) / 6.0) ** 2)
        H.put(im, x, y, "wood.3"); H.put(im, x + 1, y, "wood.3"); H.put(im, x, y + 1, "wood.2")
    for x in range(3, 29, 2):
        blob_y = int(3 + 3.0 * ((x - 16) / 13.0) ** 2) if x > 4 and x < 27 else 6 + (x % 3)
        H.put(im, x, blob_y, "moss.2"); H.put(im, x + 1, blob_y + 1, "moss.3")
        if r.random() < .6: H.put(im, x, blob_y - 1, r.choice(["rose.1", "rose.2", "rose.0"]))
    for y in range(6, 13, 2):
        H.put(im, 2, y, "moss.2"); H.put(im, 5, y + 1, "rose.1"); H.put(im, 28, y, "moss.2"); H.put(im, 25, y + 1, "rose.1")
    return H.ground(H.outline(im))


def path_stone():
    r = random.Random(9)
    im = H.canvas(16, 16)
    for cx, cy, w, h in ((4, 4, 5, 4), (11, 5, 5, 4), (5, 11, 6, 4), (12, 12, 4, 4)):
        H.rrect(im, cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2, 1, ("dusk.1", "dusk.2", "dusk.3", "dusk.3"))
        H.put(im, cx - 1, cy - h // 2 + 1, "dusk.4")
    return H.ground(H.outline(im))


def bench_wood():
    im = H.canvas(32, 16)
    for x in (3, 27): H.rect(im, x, 9, x + 1, 14, "wood.1")
    H.rrect(im, 1, 8, 30, 10, 1, WD)
    H.rrect(im, 2, 2, 29, 5, 1, WD); H.hline(im, 3, 28, 3, "wood.3")
    for x in (4, 27): H.vline(im, x, 5, 8, "wood.1")
    return H.ground(H.outline(im))


A2 = {"fence_wood": fence_wood, "gate_garden": gate_garden, "arch_rose": arch_rose,
      "path_stone": path_stone, "bench_wood": bench_wood}
