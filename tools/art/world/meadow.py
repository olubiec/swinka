"""Wspolna polana (farma, ogrod, park): plamy tonow trawy, kepy ze zdzblami, kwiatki, koniczyna, paprocie, kamyki."""
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H


def meadow(im, r, W, HT, HORIZON):
    """Polana: plamy tonow trawy (niska czestotliwosc), kepy z dlugimi zdzblami, kwiatki, koniczyna, paprocie i kamyki."""
    k = W * (HT - HORIZON) / (256 * 90.0)                            # gestosc roslin proporcjonalna do powierzchni
    for y in range(HORIZON + 2, HT):
        for x in range(W):
            v = math.sin(x / 17.0 + y / 23.0) + math.sin(x / 9.0 - y / 13.0 + 2) * .6 + math.sin(y / 7.0 + x / 31.0) * .4
            v += (y - HORIZON) / 60.0 - .6 + r.uniform(-.35, .35)
            c = "moss.1" if v < -.75 else ("moss.2" if v < .8 else "moss.3")
            if r.random() < .06: c = "moss.0" if c == "moss.1" else ("moss.1" if c == "moss.2" else "moss.2")
            H.put(im, x, y, c)
    for _ in range(int(190 * k)):                                           # kepy trawy: 3-5 zdzbel o roznej dlugosci
        x, y = r.randint(2, W - 3), r.randint(HORIZON + 6, HT - 2)
        for dx, ln in ((-2, r.randint(2, 3)), (0, r.randint(3, 6)), (2, r.randint(2, 4)), (r.choice((-1, 1)), r.randint(2, 4))):
            for k in range(ln): H.put(im, x + dx + (k // 3) * (1 if dx >= 0 else -1), y - k, "moss.0" if k == 0 else ("moss.3" if k < ln - 1 else "moss.4"))
    for _ in range(int(26 * k)):                                            # koniczyna i listki lezace w trawie
        x, y = r.randint(2, W - 4), r.randint(HORIZON + 6, HT - 3)
        for dx, dy in ((0, 0), (2, 0), (1, 1), (1, -1)): H.put(im, x + dx, y + dy, "moss.4" if (dx + dy) % 2 else "moss.3")
        H.put(im, x + 1, y, "moss.0")
    for _ in range(int(9 * k)):                                             # wieksze rosliny: paprocie / krzaczki
        x, y = r.randint(6, W - 8), r.randint(HORIZON + 10, HT - 3)
        for k, (dx, dy) in enumerate(((0, 0), (-3, 1), (3, 1), (-2, -2), (2, -2), (0, -3), (-4, 3), (4, 3))):
            H.put(im, x + dx, y + dy, "moss.0" if k < 1 else "moss.4"); H.put(im, x + dx // 2, y + dy // 2, "moss.3")
    pal = ("rose.1", "rose.2", "hay.3", "linen.3", "linen.2", "berry.0", "hay.2")
    for _ in range(int(95 * k)):                                            # pojedyncze kwiatki na lodygach
        x, y = r.randint(2, W - 3), r.randint(HORIZON + 8, HT - 4)
        c = r.choice(pal); big = r.random() < .3
        H.vline(im, x, y, y + 2, "moss.0")
        if r.random() < .5: H.put(im, x + 1, y + 1, "moss.4")
        H.put(im, x, y - 1, c)
        if big:
            for dx, dy in ((-1, -1), (1, -1), (0, -2)): H.put(im, x + dx, y + dy, c)
            H.put(im, x, y - 1, "hay.3" if c != "hay.3" else "hay.1")
    for _ in range(int(14 * k)):                                            # kamyki
        x, y = r.randint(3, W - 5), r.randint(HORIZON + 10, HT - 3)
        H.hline(im, x, x + 2, y, "dusk.3"); H.hline(im, x + 1, x + 2, y - 1, "dusk.4"); H.hline(im, x, x + 2, y + 1, "plum.1")
