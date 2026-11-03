"""Park A (B6-1..B6-3): drzewo, altana, laka, woda, most, fontanna, posag, lawki, koc, tunel.
Handart, paleta domek z siana. lamp_post jest z B3 (lights_art)."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from garden import blob, MOSS

WD = ("wood.0", "wood.1", "wood.2", "wood.3")
STONE = ("dusk.1", "dusk.2", "dusk.3", "dusk.3")
HAY = ("hay.0", "hay.1", "hay.2", "hay.3")


def tree_big():
    r = random.Random(31)
    im = H.canvas(48, 48)
    H.rect(im, 20, 26, 27, 45, "wood.1"); H.vline(im, 21, 26, 45, "wood.2"); H.vline(im, 22, 26, 45, "wood.2"); H.vline(im, 27, 26, 45, "wood.0")
    H.rect(im, 17, 43, 21, 45, "wood.1"); H.rect(im, 26, 43, 30, 45, "wood.1")       # korzenie
    for y in (30, 35, 40): H.put(im, 24, y, "wood.0"); H.put(im, 25, y + 1, "wood.0")
    for cx, cy, rr in ((12, 22, 9), (36, 22, 9), (24, 13, 12), (24, 24, 10)):
        blob(im, cx, cy, rr, ("moss.0", "moss.1", "moss.1", "moss.2"), r)
    for cx, cy, rr in ((15, 20, 8), (33, 20, 8), (24, 14, 10), (10, 26, 5), (38, 26, 5), (24, 25, 8)):
        blob(im, cx, cy, rr, MOSS, r)
    for x, y in ((17, 9), (24, 6), (31, 9), (12, 16), (36, 16)):                     # plamy slonca
        H.put(im, x, y, "moss.4"); H.put(im, x + 1, y, "moss.3")
    for x, y in ((14, 24), (30, 20), (22, 28)): H.put(im, x, y, "brick.2")           # owoce
    H.break_checkers(im)
    return H.ground(H.outline(im), spread=3)


def gazebo():
    im = H.canvas(64, 48)
    H.rect(im, 6, 38, 57, 44, "wood.1"); H.hline(im, 6, 57, 38, "wood.3"); H.hline(im, 6, 57, 44, "wood.0")   # podest
    H.rect(im, 10, 22, 53, 37, "plum.0")                                              # wnetrze
    H.rect(im, 12, 33, 51, 34, "wood.2"); H.rect(im, 12, 30, 51, 30, "wood.1")        # lawka w srodku
    for x in (10, 29, 32, 52):                                                         # slupki
        H.rrect(im, x, 18, x + 2, 38, 1, WD)
    for x in range(12, 52, 3):                                                         # balustrada
        H.vline(im, x, 31, 37, "wood.2") if x not in (28, 29, 31, 32) else None
    H.hline(im, 10, 54, 31, "wood.3"); H.hline(im, 10, 54, 32, "wood.1")
    for y in range(2, 20):                                                             # dach ze slomy
        half = 6 + int((y - 2) * 1.85)
        for x in range(32 - half, 32 + half + 1):
            k = (x + (y // 2) * 3) % 5
            H.put(im, x, y, "hay.2" if k else "hay.1")
        H.put(im, 32 - half, y, "hay.0"); H.put(im, 32 + half, y, "hay.0")
        if y % 3 == 0: H.hline(im, 32 - half + 1, 32 + half - 1, y, "hay.3")
    H.hline(im, 0, 63, 19, "hay.0"); H.hline(im, 1, 62, 20, "wood.0")                 # okap
    H.rect(im, 31, 0, 32, 3, "wood.2"); H.put(im, 31, 0, "flame.2")                    # kogut / szpic
    H.put(im, 20, 25, "hay.3"); H.put(im, 44, 26, "hay.3")                             # zawieszone lampiony
    H.break_checkers(im)
    return H.ground(H.outline(im), spread=2)


def flower_arch():
    r = random.Random(33)
    im = H.canvas(48, 16)
    for x in (4, 41): H.rrect(im, x, 5, x + 2, 14, 1, WD)
    for k in range(40):
        x = 4 + k
        y = int(1 + 5.0 * ((k - 20) / 20.0) ** 2)
        H.put(im, x, y, "wood.3"); H.put(im, x, y + 1, "wood.2")
    for x in range(3, 45):
        H.put(im, x, int(2 + 5.0 * ((x - 24) / 21.0) ** 2) + 1, "moss.1")
        y = int(1 + 5.0 * ((x - 24) / 21.0) ** 2) + r.randint(0, 2)
        H.put(im, x, y, "moss.2"); H.put(im, x, y + 1, "moss.3") if r.random() < .6 else None
        if r.random() < .45: H.put(im, x, y - 1, r.choice(["rose.1", "rose.2", "flame.2", "linen.2"]))
    for y in range(6, 14, 2):
        H.put(im, 3, y, "moss.2"); H.put(im, 6, y + 1, "rose.1"); H.put(im, 44, y, "moss.2"); H.put(im, 41, y + 1, "rose.2")
    return H.ground(H.outline(im))


def pond_big():
    r = random.Random(35)
    im = H.canvas(80, 48)
    for y in range(4, 44):
        for x in range(2, 78):
            d = ((x - 40) / 37.0) ** 2 + ((y - 24) / 19.0) ** 2
            if d <= 1.0:
                H.put(im, x, y, "dusk.3" if d < .5 else "dusk.2")
            elif d <= 1.2:
                H.put(im, x, y, r.choice(["dusk.1", "dusk.2", "dusk.3"]))
    for x, y in ((22, 14), (23, 14), (24, 14), (52, 30), (53, 30), (54, 30), (34, 34), (62, 18), (63, 18)):
        H.put(im, x, y, "dusk.4")
    for x, y in ((28, 20), (29, 20), (46, 24)): H.put(im, x, y, "linen.3")           # blyski
    for cx, cy in ((56, 16), (22, 30), (44, 36)):
        H.rrect(im, cx - 3, cy - 1, cx + 3, cy + 2, 1, ("moss.1", "moss.2", "moss.3", "moss.3"))
        H.put(im, cx, cy - 2, "rose.1")
    for x, y in ((8, 24), (12, 36), (68, 14), (70, 34)):                              # trzciny
        H.vline(im, x, y - 6, y, "moss.2"); H.put(im, x, y - 7, "wood.1"); H.vline(im, x + 1, y - 4, y, "moss.3")
    H.break_checkers(im)
    return H.ground(H.outline(im), spread=2)


A1 = {"tree_big": tree_big, "gazebo": gazebo, "flower_arch": flower_arch, "pond_big": pond_big}


def bridge_wood():
    """32x32: mostek przez strumien (poprzecznie): poklad z desek, po bokach porecze z slupkami, rozszerzone wejscia."""
    im = H.canvas(32, 32)
    H.rect(im, 4, 0, 27, 3, "wood.2"); H.rect(im, 4, 28, 27, 31, "wood.2")           # wejscia
    for y in range(2, 30):
        c = "wood.2" if (y // 3) % 2 else "wood.3"
        H.hline(im, 6, 25, y, c)
        if y % 3 == 2: H.hline(im, 6, 25, y, "wood.1")
    for x in (3, 4, 27, 28):
        H.vline(im, x, 2, 29, "wood.1" if x in (3, 28) else "wood.2")
    for y in (2, 10, 18, 26):
        for x in (2, 27): H.rrect(im, x, y, x + 2, y + 3, 1, WD)
    return H.ground(H.outline(im), spread=1)


def fountain():
    im = H.canvas(48, 48)
    H.rrect(im, 2, 30, 45, 44, 5, STONE)                                              # misa
    H.rrect(im, 5, 32, 42, 40, 4, ("dusk.2", "dusk.3", "dusk.3", "dusk.4"))
    H.hline(im, 8, 38, 34, "dusk.4"); H.hline(im, 14, 30, 37, "dusk.4")
    H.rrect(im, 20, 14, 27, 34, 2, STONE)                                             # kolumna
    H.rrect(im, 12, 20, 35, 26, 3, STONE)                                             # gorna misa
    H.rect(im, 15, 21, 32, 22, "dusk.4")
    for k in range(10):                                                                # strumien
        y = 4 + k
        H.put(im, 23 + (k > 6), y, "linen.3"); H.put(im, 24, y, "dusk.4")
    for k, (dx, dy) in enumerate(((-1, 0), (-2, 1), (-3, 2), (-4, 3), (-5, 5), (-6, 8), (-7, 12))):
        H.put(im, 23 + dx, 8 + dy, "dusk.4"); H.put(im, 24 - dx, 8 + dy, "dusk.4")
    for x, y in ((9, 36), (12, 38), (35, 36), (37, 38)): H.put(im, x, y, "linen.3")
    H.put(im, 6, 31, "moss.3"); H.put(im, 7, 31, "moss.2"); H.put(im, 40, 31, "moss.3")
    return H.ground(H.outline(im), spread=2)


def statue_pig():
    im = H.canvas(32, 32)
    H.rrect(im, 5, 22, 26, 30, 1, STONE); H.hline(im, 6, 25, 23, "dusk.4")             # cokol
    H.rect(im, 9, 26, 22, 27, "dusk.1")
    H.rrect(im, 7, 10, 21, 21, 5, STONE)                                               # tulow
    H.rrect(im, 18, 7, 26, 16, 3, STONE)                                               # glowa
    H.rect(im, 26, 10, 27, 13, "dusk.1"); H.put(im, 27, 11, "plum.1")                 # ryjek
    H.put(im, 23, 9, "plum.1"); H.rect(im, 19, 6, 22, 8, "dusk.1"); H.put(im, 22, 9, "dusk.1")  # oko, oklapniete ucho
    H.rect(im, 8, 19, 10, 22, "dusk.1"); H.rect(im, 18, 19, 20, 22, "dusk.1")         # lapki
    H.put(im, 7, 13, "dusk.2"); H.put(im, 6, 14, "dusk.1")                             # lok ogonka
    H.hline(im, 10, 17, 12, "dusk.4"); H.hline(im, 9, 16, 13, "dusk.4")               # swiatlo na grzbiecie
    for x, y in ((12, 22), (14, 22), (23, 24), (7, 25)): H.put(im, x, y, "moss.2")     # mech
    H.put(im, 13, 22, "moss.3")
    return H.ground(H.outline(im))


def path_cobble():
    im = H.canvas(16, 16)
    for cx, cy, w, h in ((4, 4, 6, 5), (12, 4, 5, 5), (4, 12, 5, 5), (11, 12, 6, 5)):
        H.rrect(im, cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2, 1, ("linen.0", "linen.1", "linen.2", "linen.2"))
        H.put(im, cx - 1, cy - h // 2 + 1, "linen.3")
    return H.ground(H.outline(im))


def bench_park():
    im = H.canvas(32, 16)
    for x in (3, 26): H.rect(im, x, 8, x + 2, 14, "plum.2"); H.vline(im, x, 8, 14, "plum.3")
    H.rrect(im, 1, 7, 30, 9, 1, WD)
    H.rrect(im, 2, 2, 29, 5, 1, WD); H.hline(im, 3, 28, 3, "wood.3")
    for x in (4, 27): H.vline(im, x, 5, 7, "plum.2")
    for x in range(8, 26, 6): H.put(im, x, 8, "wood.1")
    return H.ground(H.outline(im))


def picnic_blanket():
    im = H.canvas(48, 32)
    for y in range(8, 28):
        t = (y - 8) / 19.0
        x0 = int(10 - 8 * t); x1 = int(40 + 6 * t)
        for x in range(x0, x1 + 1):
            edge = x - x0 < 2 or x1 - x < 2 or y - 8 < 2 or 27 - y < 2
            sq = ((x - x0) // 6 + (y - 8) // 4) % 2
            H.put(im, x, y, "linen.2" if edge else ("brick.1" if sq else "brick.2"))
    H.rrect(im, 12, 12, 22, 19, 2, ("wood.0", "wood.1", "wood.2", "wood.2"))           # koszyk
    H.hline(im, 13, 21, 10, "wood.3"); H.hline(im, 14, 20, 9, "wood.2")
    H.put(im, 28, 16, "flame.1"); H.put(im, 29, 16, "flame.0"); H.put(im, 28, 15, "moss.3")   # jablko
    H.rect(im, 32, 14, 36, 17, "linen.3"); H.hline(im, 32, 36, 17, "linen.2")                  # chleb / serwetka
    H.break_checkers(im)
    return H.ground(H.outline(im))


def tunnel_playground():
    im = H.canvas(48, 32)
    H.rrect(im, 8, 8, 44, 28, 8, ("wood.1", "wood.2", "wood.2", "wood.3"))             # tulow rury
    for x in (16, 24, 32, 40):
        H.vline(im, x, 10, 27, "wood.1"); H.vline(im, x + 1, 10, 27, "wood.3")
    for y in range(8, 28):                                                              # otwor z przodu
        for x in range(2, 20):
            if ((x - 11) / 8.0) ** 2 + ((y - 18) / 10.0) ** 2 <= 1:
                H.put(im, x, y, "plum.0")
    for y in range(7, 29):
        for x in range(1, 21):
            d = ((x - 11) / 9.0) ** 2 + ((y - 18) / 11.0) ** 2
            if 1.0 < d <= 1.2: H.put(im, x, y, "hay.2")
    for x, y in ((36, 8), (38, 8), (30, 9)): H.put(im, x, y, "moss.3")
    H.break_checkers(im)
    return H.ground(H.outline(im), spread=2)


A2 = {"bridge_wood": bridge_wood, "fountain": fountain, "statue_pig": statue_pig, "path_cobble": path_cobble}
A3 = {"bench_park": bench_park, "picnic_blanket": picnic_blanket, "tunnel_playground": tunnel_playground}


def build(group):
    out = []
    for i, fn in group.items():
        im = fn()
        H.register_item(i, "park", im)
        out.append((i, im))
    return out


if __name__ == "__main__":
    from PIL import Image
    import json
    out = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    for n, g in (("b6-1", A1), ("b6-2", A2), ("b6-3", A3)):
        items = build(g)
        s = H.sheet([im for _, im in items], 4)
        s.save(out / f"{n}.png")
