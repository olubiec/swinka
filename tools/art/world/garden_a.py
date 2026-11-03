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
    """Strzyzony zywoplot: prostokatna bryla z falistym wierzchem i jasnymi listkami; kontur zamyka boki,
    wiec dwa kafle obok siebie czytaja sie jako dwa segmenty."""
    r = random.Random(4)
    im = H.canvas(16, 16)
    for x in range(1, 15):
        top = 5 + (1 if (x // 3) % 2 else 0)
        H.vline(im, x, top, 13, "moss.1")
    for x in range(1, 15):
        H.put(im, x, 5 + (1 if (x // 3) % 2 else 0), "moss.2")
    for _ in range(14): H.put(im, r.randint(2, 13), r.randint(7, 11), "moss.2")
    for _ in range(8): H.put(im, r.randint(2, 13), r.randint(8, 12), "moss.0")
    for x, y in ((4, 7), (9, 8), (12, 6), (6, 10)): H.put(im, x, y, "moss.3")
    H.hline(im, 1, 14, 13, "moss.0")
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


# ---------------- B5-3: woda i zabawa ----------------
STONE = ("dusk.1", "dusk.2", "dusk.3", "dusk.3")


def pond_small():
    r = random.Random(13)
    im = H.canvas(48, 32)
    for y in range(4, 28):
        for x in range(2, 46):
            d = ((x - 24) / 22.0) ** 2 + ((y - 16) / 11.0) ** 2
            if d <= 1.0:
                c = "dusk.3" if d < .55 else "dusk.2"
                H.put(im, x, y, c)
            elif d <= 1.28:
                H.put(im, x, y, r.choice(["dusk.1", "dusk.2", "dusk.3"]))      # kamienne obrzeze
    for x, y in ((14, 12), (15, 12), (28, 18), (29, 18), (30, 18), (20, 21)): H.put(im, x, y, "dusk.4")
    for cx, cy in ((34, 12), (12, 20)):                                          # lilie
        H.rrect(im, cx - 2, cy - 1, cx + 2, cy + 1, 1, ("moss.1", "moss.2", "moss.3", "moss.3"))
        H.put(im, cx, cy - 2, "rose.1")
    H.break_checkers(im)
    return H.ground(H.outline(im), spread=2)


def bird_bath():
    im = H.canvas(16, 16)
    H.rrect(im, 6, 8, 9, 14, 1, STONE)
    H.rrect(im, 3, 12, 12, 14, 1, STONE)
    H.rrect(im, 2, 5, 13, 9, 3, STONE)
    H.rect(im, 4, 6, 11, 7, "dusk.4"); H.put(im, 6, 6, "linen.2")
    H.put(im, 12, 3, "wood.2"); H.put(im, 13, 3, "wood.2"); H.put(im, 12, 4, "flame.2")   # ptaszek
    return H.ground(H.outline(im))


def sandbox_pig():
    r = random.Random(15)
    im = H.canvas(32, 32)
    H.rrect(im, 1, 9, 30, 28, 4, WD)
    H.rrect(im, 4, 12, 27, 25, 3, ("hay.0", "hay.1", "hay.2", "hay.2"))
    for _ in range(70):
        x, y = r.randint(5, 26), r.randint(13, 24)
        H.put(im, x, y, r.choice(["hay.0", "hay.3", "hay.0"]))
    for x, y in ((11, 18), (12, 18), (10, 19), (13, 19), (11, 20), (12, 20)): H.put(im, x, y, "hay.3")   # slad lapek
    H.put(im, 20, 16, "brick.2"); H.rect(im, 20, 17, 22, 18, "brick.3")                                  # wiaderko
    H.rect(im, 4, 9, 27, 10, "wood.3")
    H.break_checkers(im)
    return H.ground(H.outline(im))


def pigloo_garden():
    r = random.Random(16)
    im = H.canvas(32, 32)
    for y in range(4, 29):
        half = int(14 * (1 - ((y - 29) / 25.0) ** 2) ** 0.5)
        for x in range(16 - half, 16 + half + 1):
            c = "linen.2" if x < 16 + half - 4 else "linen.1"
            if r.random() < .15: c = "linen.1"
            H.put(im, x, y, c)
    for y in range(8, 28, 5): H.hline(im, 16 - int(13 * (1 - ((y - 29) / 25.0) ** 2) ** 0.5), 16 + int(13 * (1 - ((y - 29) / 25.0) ** 2) ** 0.5), y, "linen.3")
    for y in range(16, 29):
        half = int(6 * (1 - ((y - 29) / 13.0) ** 2) ** 0.5)
        for x in range(16 - half, 16 + half + 1): H.put(im, x, y, "plum.0")
    H.put(im, 16, 3, "rose.1")
    H.break_checkers(im)
    return H.ground(H.outline(im))


def memory_corner():
    im = H.canvas(32, 32)
    H.rrect(im, 3, 24, 28, 29, 2, ("moss.0", "moss.1", "moss.2", "moss.2"))     # lawa darniowa
    H.rrect(im, 11, 8, 20, 26, 4, STONE)                                         # kamien pamieci
    H.rect(im, 13, 11, 18, 14, "dusk.4"); H.put(im, 15, 12, "plum.1"); H.put(im, 16, 13, "plum.1")
    H.rrect(im, 5, 18, 9, 25, 2, ("wood.0", "wood.1", "wood.2", "wood.2"))      # latarnia na kiju
    H.rect(im, 6, 15, 8, 18, "hay.1"); H.put(im, 7, 16, "flame.3")
    for x, y in ((23, 22), (25, 21), (24, 23), (26, 23)):
        H.put(im, x, y, "rose.1"); H.put(im, x, y + 1, "moss.3")                 # kwiaty
    H.put(im, 22, 24, "moss.3"); H.put(im, 27, 24, "moss.3")
    H.break_checkers(im)
    return H.ground(H.outline(im))


A3 = {"pond_small": pond_small, "bird_bath": bird_bath, "sandbox_pig": sandbox_pig,
      "pigloo_garden": pigloo_garden, "memory_corner": memory_corner}


# ---------------- B5-4: dodatki ogrodu (tunel z wierzby jest z B1-3) ----------------
def watering_can():
    im = H.canvas(16, 16)
    H.rrect(im, 3, 6, 10, 13, 2, ("dusk.1", "dusk.2", "dusk.3", "dusk.3"))
    H.hline(im, 4, 9, 7, "dusk.4")
    for k in range(5): H.put(im, 11 + k // 2, 9 - k, "dusk.2"); H.put(im, 11 + k // 2, 10 - k, "dusk.1")   # dziob
    H.put(im, 14, 4, "dusk.4"); H.put(im, 15, 4, "dusk.4")
    for x, y in ((4, 3), (5, 2), (6, 2), (7, 3)): H.put(im, x, y, "dusk.1")                               # raczka
    return H.ground(H.outline(im))


def hay_basket():
    r = random.Random(17)
    im = H.canvas(16, 16)
    H.rrect(im, 2, 8, 13, 14, 2, ("wood.0", "wood.1", "wood.2", "wood.2"))
    for x in range(3, 13, 2): H.vline(im, x, 9, 13, "wood.1")
    H.hline(im, 2, 13, 8, "wood.3")
    for x in range(3, 13):
        H.put(im, x, 6 + r.randint(0, 1), "hay.2"); H.put(im, x, 7, "hay.1")
    for x in (4, 8, 11): H.put(im, x, 5, "hay.3")
    H.break_checkers(im)
    return H.ground(H.outline(im))


def stump_seat():
    im = H.canvas(16, 16)
    H.rrect(im, 3, 6, 12, 13, 2, WD)
    H.rrect(im, 3, 4, 12, 8, 3, ("wood.1", "wood.2", "hay.1", "hay.2"))          # blat z rocznymi kregami
    H.hline(im, 6, 9, 5, "wood.2"); H.hline(im, 5, 10, 6, "wood.3")
    H.put(im, 7, 5, "wood.1"); H.put(im, 11, 12, "moss.3"); H.put(im, 4, 12, "moss.3")
    return H.ground(H.outline(im))


A4 = {"watering_can": watering_can, "hay_basket": hay_basket, "stump_seat": stump_seat}
