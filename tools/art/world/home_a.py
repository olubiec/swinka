"""Dom A (B4-1..B4-3): siedziska, meble, sciana i okna. Tkaniny tylko w rampie brick (recolor)."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H

BR = ("brick.1", "brick.2", "brick.3", "brick.3")
BR_D = ("brick.0", "brick.1", "brick.2", "brick.2")


def seal(im, shadow=True, spread=1):
    return H.ground(im, spread=spread) if shadow else H.outline(im)


def armchair():
    im = H.canvas(32, 32)
    H.rrect(im, 4, 4, 27, 17, 6, BR_D)
    H.rrect(im, 2, 12, 9, 26, 3, BR); H.rrect(im, 22, 12, 29, 26, 3, BR)
    H.rrect(im, 9, 16, 22, 26, 3, BR)
    H.rect(im, 10, 26, 21, 27, "brick.0")
    for x in (4, 25): H.rect(im, x, 28, x + 2, 29, "wood.1"); H.put(im, x, 28, "wood.2")
    for x in (13, 18): H.put(im, x, 10, "brick.0"); H.put(im, x, 9, "brick.2")
    H.hline(im, 3, 8, 15, "brick.0"); H.hline(im, 23, 28, 15, "brick.0")
    H.hline(im, 10, 21, 16, "brick.3")
    return seal(im)


def cushion_big():
    im = H.canvas(16, 16)
    H.rrect(im, 2, 3, 13, 12, 3, BR)
    for x, y in ((2, 3), (13, 3), (2, 12), (13, 12)): H.put(im, x, y, "brick.0")
    H.put(im, 7, 7, "brick.0"); H.put(im, 8, 7, "brick.0"); H.put(im, 7, 6, "brick.3")
    H.hline(im, 4, 11, 4, "hay.1")
    return seal(im)


def pouf_boucle():
    r = random.Random(2)
    im = H.canvas(16, 16)
    H.rrect(im, 2, 5, 13, 13, 4, BR)
    px = im.load()
    for _ in range(26):                                       # petelki bouclé: krotkie luki
        x, y = r.randint(3, 12), r.randint(6, 12)
        if px[x, y][3]:
            H.put(im, x, y, r.choice(["brick.0", "brick.3", "brick.3"]))
    H.hline(im, 4, 11, 5, "brick.3")
    return seal(im)


def cosy_nook():
    im = H.canvas(32, 32)
    r = random.Random(4)
    for y in range(3, 27):                                    # kopula ze slomy
        half = int(14 * (1 - ((y - 27) / 24.0) ** 2) ** 0.5)
        for x in range(16 - half, 16 + half + 1):
            c = "hay.1"
            if r.random() < 0.25: c = r.choice(["hay.0", "hay.2"])
            if x < 16 - half + 3 and y > 6: c = "hay.2" if r.random() < 0.6 else "hay.1"
            if x > 16 + half - 4 and y > 6: c = "hay.0"
            H.put(im, x, y, c)
    for i in range(10):                                       # zdzbla: ukosne kreski
        x, y = r.randint(6, 25), r.randint(5, 22)
        for k in range(3): H.put_in(im, x + k, y - k, "hay.3")
    H.rrect(im, 10, 15, 21, 27, 5, ("plum.0", "plum.0", "plum.1", "plum.1"))      # wejscie
    H.rect(im, 5, 27, 26, 28, "wood.1"); H.hline(im, 5, 26, 27, "wood.2")           # deski
    H.rrect(im, 11, 22, 20, 28, 2, BR)                                              # poduszka w srodku
    H.break_checkers(im)
    return seal(im)


def toy_basket():
    im = H.canvas(16, 16)
    H.rrect(im, 5, 2, 10, 7, 2, ("brick.1", "brick.2", "brick.3", "brick.3"))        # pilka wystaje
    H.rect(im, 11, 4, 12, 7, "flame.1"); H.put(im, 12, 3, "moss.2")                  # marchewka
    H.rect(im, 3, 7, 4, 9, "linen.2"); H.put(im, 3, 6, "linen.3")                   # ucho pluszaka
    H.rect(im, 2, 8, 13, 14, "wood.3")                                              # kosz
    for y in range(8, 14):
        for x in range(2, 14):
            if (x + y) % 3 == 0: H.put(im, x, y, "wood.1")
            elif (x - y) % 3 == 0: H.put(im, x, y, "wood.4")
    H.hline(im, 2, 13, 8, "wood.2"); H.hline(im, 2, 13, 14, "wood.0")
    H.break_checkers(im)
    return seal(im)


def bookshelf():
    r = random.Random(8)
    im = H.canvas(32, 48)
    H.rect(im, 1, 2, 30, 46, "wood.2"); H.vline(im, 1, 2, 46, "wood.3"); H.vline(im, 30, 2, 46, "wood.0")
    H.rect(im, 3, 4, 28, 44, "wood.0")
    cols = ["brick.1", "moss.1", "dusk.2", "hay.1", "plum.3", "berry.1", "brick.2", "moss.2", "dusk.1", "hay.0"]
    for k, y0 in enumerate((4, 16, 28)):
        yb = y0 + 11
        x = 4; last = None
        while x < 26:
            w = r.choice([2, 3, 3, 4]); h = r.randint(7, 10)
            c = r.choice([c for c in cols if c != last]); last = c
            H.rect(im, x, yb - h, x + w - 1, yb - 1, c)
            H.vline(im, x, yb - h, yb - 1, c.replace("1", "2").replace("0", "1")) if False else None
            H.put(im, x, yb - h, "linen.2") if r.random() < 0.3 else None
            x += w
        H.rect(im, 3, yb, 28, yb + 1, "wood.3"); H.hline(im, 3, 28, yb + 1, "wood.1")
    H.rect(im, 2, 0, 29, 2, "wood.3"); H.hline(im, 2, 29, 0, "wood.4")                  # blat
    H.rect(im, 20, 40, 27, 43, "hay.1")                                                    # sloik/ pudelko na dole
    H.rect(im, 4, 45, 6, 47, "wood.1"); H.rect(im, 25, 45, 27, 47, "wood.1")
    H.break_checkers(im)
    return seal(im)


def side_table():
    im = H.canvas(16, 16)
    H.rrect(im, 2, 5, 13, 8, 2, ("wood.1", "wood.3", "wood.4", "wood.4"))
    H.hline(im, 4, 11, 6, "linen.2"); H.hline(im, 5, 10, 5, "linen.3")                     # serwetka
    for x in (3, 12): H.vline(im, x, 9, 14, "wood.1"); H.vline(im, x + (1 if x < 8 else -1), 9, 14, "wood.2")
    H.rect(im, 7, 9, 8, 13, "wood.1")
    H.rect(im, 6, 2, 9, 4, "dusk.3"); H.put(im, 7, 1, "moss.3"); H.put(im, 8, 1, "moss.2")  # wazonik
    return seal(im)


def shelf_small():
    im = H.canvas(32, 16)
    H.rect(im, 1, 8, 30, 9, "wood.3"); H.hline(im, 1, 30, 8, "wood.4"); H.hline(im, 1, 30, 10, "wood.1")
    for x in (4, 26): H.rect(im, x, 10, x + 1, 13, "wood.1")
    H.rect(im, 3, 3, 5, 7, "moss.1"); H.rect(im, 6, 2, 8, 7, "brick.1"); H.rect(im, 9, 4, 11, 7, "dusk.2")
    H.rect(im, 18, 2, 22, 7, "dusk.3"); H.hline(im, 18, 22, 2, "hay.1"); H.rect(im, 19, 4, 21, 6, "hay.2")      # sloik z miodem
    H.rect(im, 25, 4, 28, 7, "brick.2"); H.put(im, 26, 3, "moss.3"); H.put(im, 27, 2, "moss.2")
    H.break_checkers(im)
    return seal(im, shadow=False)


def hay_bar_wood():
    r = random.Random(3)
    im = H.canvas(32, 16)
    H.rect(im, 2, 5, 29, 11, "hay.1")                                                       # siano w zlobie
    for _ in range(26):
        x, y = r.randint(2, 28), r.randint(2, 10)
        H.put_in(im, x, y, r.choice(["hay.0", "hay.2", "hay.3"])); H.put_in(im, x + 1, y - 1, "hay.2")
    H.rrect(im, 3, 3, 28, 7, 2, ("hay.0", "hay.1", "hay.2", "hay.3"))
    for x in range(4, 29, 4): H.vline(im, x, 8, 13, "wood.2")                                # szczeble
    H.rect(im, 1, 8, 30, 9, "wood.3"); H.hline(im, 1, 30, 9, "wood.1"); H.hline(im, 1, 30, 13, "wood.1")
    for x in (2, 27): H.rect(im, x, 13, x + 2, 14, "wood.1")
    H.break_checkers(im)
    return seal(im)


def curtains_dots():
    im = H.canvas(32, 32)
    H.rect(im, 0, 1, 31, 2, "wood.2"); H.hline(im, 0, 31, 1, "wood.3")                    # karnisz
    for x in (0, 31): H.rect(im, x - (x > 0), 0, x + (x == 0), 3, "hay.1")
    for x0, x1 in ((2, 10), (21, 29)):
        for y in range(3, 29):
            for x in range(x0, x1 + 1):
                f = (x - x0) % 4
                c = "brick.2" if f in (1, 2) else "brick.1" if f == 0 else "brick.3"
                H.put(im, x, y, c)
        for k in range(3):                                                                    # kropki
            H.put(im, x0 + 2 + (k * 3) % 5, 7 + k * 7, "hay.2"); H.put(im, x0 + 5 - (k * 3) % 4, 11 + k * 7, "hay.2")
        H.hline(im, x0, x1, 28, "brick.0")
    H.rect(im, 9 if True else 0, 17, 11, 18, "hay.1"); H.rect(im, 20, 17, 22, 18, "hay.1")  # chwosty/wiazanie
    H.break_checkers(im)
    return seal(im, shadow=False)


def wall_clock():
    im = H.canvas(16, 16)
    H.rrect(im, 2, 2, 13, 13, 5, ("wood.0", "wood.1", "wood.2", "wood.3"))
    H.rrect(im, 4, 4, 11, 11, 3, ("linen.1", "linen.2", "linen.3", "linen.3"))
    H.vline(im, 8, 5, 8, "plum.1"); H.hline(im, 8, 10, 8, "plum.1")
    for x, y in ((8, 4), (11, 8), (8, 11), (4, 8)): H.put(im, x, y, "brick.1")
    H.put(im, 8, 8, "brick.0")
    return seal(im, shadow=False)


def hanging_planter():
    im = H.canvas(16, 16)
    H.vline(im, 8, 0, 3, "hay.1"); H.put(im, 6, 3, "hay.1"); H.put(im, 10, 3, "hay.1")
    H.hline(im, 6, 10, 4, "hay.0")
    H.rrect(im, 4, 5, 11, 10, 2, ("brick.0", "brick.1", "brick.2", "brick.3"))
    for x, h in ((4, 4), (6, 6), (9, 5), (11, 3)):                                          # zwisajace pedy
        for k in range(h): H.put(im, x, 10 + k, "moss.2" if k % 2 else "moss.3")
    H.put(im, 7, 5, "moss.3"); H.put(im, 8, 4, "moss.2"); H.put(im, 9, 4, "rose.1")
    return seal(im, shadow=False)


def lace_curtain():
    im = H.canvas(32, 32)
    H.rect(im, 0, 1, 31, 2, "wood.2"); H.hline(im, 0, 31, 1, "wood.3")
    for x0, x1 in ((2, 12), (19, 29)):
        for y in range(3, 29):
            for x in range(x0, x1 + 1):
                f = (x - x0) % 4
                H.put(im, x, y, "linen.2" if f in (1, 2) else "linen.1" if f == 0 else "linen.3")
        for y in range(5, 27, 4):                                                              # azur: dziurki
            for x in range(x0 + 1, x1, 4):
                im.putpixel((x + (y // 4) % 2 * 2 % 3 + 1, y), (0, 0, 0, 0))
        for x in range(x0, x1 + 1, 2):                                                         # festony na dole
            H.put(im, x, 29, "linen.2"); H.put(im, x + 1, 28, "linen.1")
        H.vline(im, x0, 3, 27, "linen.1")
    H.rect(im, 12, 15, 19, 16, "rose.1")                                                       # wstazka
    H.break_checkers(im)
    return seal(im, shadow=False)


A = {"armchair": (armchair, "house"), "cushion_big": (cushion_big, "house"), "pouf_boucle": (pouf_boucle, "house"),
     "cosy_nook": (cosy_nook, "house"), "toy_basket": (toy_basket, "house"), "bookshelf": (bookshelf, "house"),
     "side_table": (side_table, "house"), "shelf_small": (shelf_small, "house"), "hay_bar_wood": (hay_bar_wood, "house"),
     "curtains_dots": (curtains_dots, "house"), "wall_clock": (wall_clock, "house"), "hanging_planter": (hanging_planter, "house"),
     "lace_curtain": (lace_curtain, "house")}


def build(ids=None):
    out = []
    for i, (fn, pl) in A.items():
        if ids and i not in ids: continue
        im = fn()
        H.register_item(i, pl, im)
        out.append((i, im))
    return out


if __name__ == "__main__":
    pass
