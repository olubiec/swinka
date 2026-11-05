"""UI-4: ikony systemowe w stylu "legendarnym" (bogatsze niz UI-2): kazda ksztalt dostaje automatyczna faze
(swiatlo lewa-gora, cien prawa-dol), medaliony maja mosiezny rant i polysk. Nadpisuje te same indeksy w icons_16.png
(nazwy i indeksy sie nie zmieniaja). Uzycie: python3 tools/art/world/icons_legend.py"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H
from PIL import Image

P = H.put
ROOT = H.ROOT
SHEET = ROOT / "assets/icons/icons_16.png"
NAMES = json.loads((ROOT / "assets/icons/icons.json").read_text())
NAMES = NAMES.get("icons", NAMES)


def circle(cx, cy, r):
    return {(x, y) for y in range(16) for x in range(16) if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * .6}


def rectm(x0, y0, x1, y1):
    return {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}


def shaded(im, mask, hi, base, sh, deep=None):
    """Wypelnia maske z faza: gorny-lewy brzeg = hi, dolny-prawy = sh, srodek = base."""
    for (x, y) in mask:
        if (x - 1, y - 1) not in mask or (x, y - 1) not in mask and (x - 1, y) not in mask: c = hi
        elif (x + 1, y + 1) not in mask or ((x + 1, y) not in mask and (x, y + 1) not in mask): c = sh
        else: c = base
        P(im, x, y, c)
    if deep:
        for (x, y) in mask:
            if (x + 1, y + 1) not in mask and (x, y + 1) not in mask and (x + 1, y) not in mask: P(im, x, y, deep)


def medallion(im, cx, cy, r, face, glyph=None):
    """Mosiezny rant + twarz w kolorze akcji (face = (hi, base, sh))."""
    shaded(im, circle(cx, cy, r), "hay.3", "hay.2", "hay.1")
    shaded(im, circle(cx, cy, r - 2), face[2], face[1], face[0])        # twarz wcieta: cien u gory-lewej
    P(im, cx - r + 3, cy - r + 3, face[0])


def mk(fn):
    im = H.canvas(16, 16); fn(im); H.break_checkers(im); return H.outline(im)


def x_close(im):
    medallion(im, 8, 8, 7, ("brick.2", "brick.1", "brick.0"))
    for k in range(6): P(im, 5 + k, 5 + k, "linen.3"); P(im, 10 - k, 5 + k, "linen.3")
    P(im, 6, 6, "linen.2"); P(im, 9, 9, "linen.2")


def x_plus(im):
    medallion(im, 8, 8, 7, ("moss.3", "moss.2", "moss.1"))
    H.rect(im, 7, 4, 8, 11, "linen.3"); H.rect(im, 4, 7, 11, 8, "linen.3"); H.vline(im, 8, 8, 11, "linen.2"); H.hline(im, 8, 11, 8, "linen.2")


def x_minus(im):
    medallion(im, 8, 8, 7, ("brick.2", "brick.1", "brick.0"))
    H.rect(im, 4, 7, 11, 8, "linen.3"); H.hline(im, 4, 11, 8, "linen.2")


def x_info(im):
    medallion(im, 8, 8, 7, ("dusk.3", "dusk.2", "dusk.1"))
    P(im, 8, 4, "linen.3"); P(im, 8, 5, "linen.3"); H.rect(im, 7, 7, 8, 11, "linen.3"); H.hline(im, 6, 9, 11, "linen.3"); P(im, 6, 7, "linen.3"); H.vline(im, 8, 8, 11, "linen.2")


def x_help(im):
    medallion(im, 8, 8, 7, ("hay.3", "hay.2", "hay.1"))
    for x, y in ((6, 4), (7, 3), (8, 3), (9, 4), (10, 5), (9, 6), (8, 7), (8, 8), (7, 8)): P(im, x, y, "wood.1")
    H.rect(im, 7, 10, 8, 11, "wood.1")
    for x, y in ((6, 4), (7, 3), (8, 3)): P(im, x, y, "wood.2")


def x_search(im):
    ringm = circle(6, 6, 5) - circle(6, 6, 3)
    shaded(im, ringm, "hay.3", "hay.2", "hay.1")
    shaded(im, circle(6, 6, 3), "dusk.4", "dusk.3", "dusk.2")
    P(im, 5, 5, "linen.3"); P(im, 4, 6, "linen.3"); P(im, 6, 4, "linen.3")
    for k in range(5): P(im, 10 + k, 10 + k - 1 if k < 5 else 14, "wood.2"); P(im, 10 + k, 11 + k - 1, "wood.1")
    P(im, 14, 14, "wood.1")


def x_timer(im):
    shaded(im, circle(8, 9, 6), "hay.3", "hay.2", "hay.1")
    shaded(im, circle(8, 9, 4), "linen.1", "linen.3", "linen.2")
    H.rect(im, 7, 1, 9, 2, "hay.2"); P(im, 7, 1, "hay.3"); H.hline(im, 11, 13, 3, "hay.2"); P(im, 12, 2, "hay.3")
    H.vline(im, 8, 6, 9, "wood.0"); H.hline(im, 8, 10, 9, "wood.0"); P(im, 8, 9, "brick.2")
    for x, y in ((8, 5), (8, 13), (4, 9), (12, 9)): P(im, x, y, "wood.2")


def x_bell(im):
    m = circle(8, 8, 5) | rectm(3, 8, 12, 11)
    m = {p for p in m if not (p[1] < 3)}
    shaded(im, m, "hay.3", "hay.2", "hay.1")
    H.hline(im, 2, 13, 12, "hay.1"); H.hline(im, 2, 13, 11, "hay.2"); H.hline(im, 2, 3, 11, "hay.3")
    H.rect(im, 7, 1, 8, 2, "hay.2"); P(im, 7, 1, "hay.3")
    shaded(im, circle(8, 14, 1), "wood.3", "wood.2", "wood.1")
    P(im, 5, 5, "linen.3"); P(im, 5, 6, "linen.3"); P(im, 6, 4, "hay.3")


def x_menu(im):
    shaded(im, rectm(1, 2, 14, 13), "wood.3", "wood.2", "wood.1")
    for y in (4, 7, 10):
        shaded(im, rectm(3, y, 12, y + 1), "hay.3", "hay.2", "hay.1")
    for y in (4, 7, 10): P(im, 2, y, "wood.0"); P(im, 13, y, "wood.0")


def x_filter(im):
    m = set()
    for y in range(2, 6):
        for x in range(2 + 0, 14): m.add((x, y))
    for y in range(6, 9):
        k = y - 5
        for x in range(2 + k, 14 - k): m.add((x, y))
    for y in range(9, 14):
        for x in range(6, 10): m.add((x, y))
    shaded(im, m, "dusk.4", "dusk.3", "dusk.2")
    H.hline(im, 3, 12, 3, "linen.3"); P(im, 7, 10, "linen.3"); P(im, 7, 11, "linen.3")


def x_star_empty(im):
    cx, cy = 7.5, 8.2
    import math
    m = set()
    for y in range(16):
        for x in range(16):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy); a = math.atan2(dy, dx)
            lim = 3.2 + 3.6 * abs(math.cos(2.5 * (a + math.pi / 2))) ** 1.3
            if r <= lim + .4: m.add((x, y))
    shaded(im, m, "plum.3", "plum.2", "plum.1")
    inner = {p for p in m if all((p[0] + dx, p[1] + dy) in m for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)))}
    for p in m - inner: P(im, p[0], p[1], "hay.1")
    for p in m:
        if (p[0] - 1, p[1] - 1) not in m: P(im, p[0], p[1], "hay.3")


def x_music_off(im):
    shaded(im, circle(5, 11, 2) | rectm(6, 3, 7, 11), "plum.3", "plum.2", "plum.1")
    shaded(im, rectm(7, 3, 12, 5), "plum.3", "plum.2", "plum.1")
    for k in range(13): P(im, 2 + k, 13 - k, "brick.3"); P(im, 3 + k, 13 - k, "brick.2")


def x_dot_full(im):
    shaded(im, circle(8, 8, 4), "moss.4", "moss.3", "moss.2")
    P(im, 6, 6, "linen.3"); P(im, 7, 6, "linen.3"); P(im, 6, 7, "linen.3")



def chev(im, kind):
    m = set()
    for t in range(12):
        d = int(abs(t - 5.5) - 0.5) if abs(t - 5.5) >= .5 else 0
        a = 2 + t
        for k in range(3):
            if kind == "up": m.add((a, 4 + d + k))
            elif kind == "down": m.add((a, 11 - d - k))
            else: m.add((11 - d - k, a))
    shaded(im, m, "hay.3", "hay.2", "hay.1")
    for (x, y) in m:
        if (x + 1, y + 1) not in m and (x + 1, y) not in m and (x, y + 1) not in m: P(im, x, y, "plum.1")


def m_feed(im):
    shaded(im, circle(8, 12, 6) - {(x, y) for y in range(16) for x in range(16) if y < 9}, "wood.3", "wood.2", "wood.1")   # miska
    H.hline(im, 2, 13, 9, "wood.3"); H.hline(im, 2, 13, 10, "wood.2"); H.hline(im, 4, 11, 14, "plum.1")
    for x in range(3, 13):                                                      # kopiec siana (zdzbla w roznych kierunkach)
        top = 5 + abs(x - 8) // 2 + (x * 5) % 2
        for y in range(top, 9): P(im, x, y, "hay.2" if (x + y) % 3 else "hay.3")
        P(im, x, top, "hay.3")
    for x, y in ((5, 6), (9, 5), (7, 7), (11, 7)): P(im, x, y, "hay.1")
    shaded(im, {(10, 3), (11, 3), (10, 4), (11, 4), (11, 5)}, "brick.3", "flame.0", "brick.1")  # marchewka
    P(im, 10, 2, "moss.3"); P(im, 11, 2, "moss.2"); P(im, 12, 1, "moss.3")


def m_tricks(im):
    ringm = circle(8, 6, 6) - circle(8, 6, 4)
    shaded(im, ringm, "hay.3", "hay.2", "hay.1")                                # obrecz zwinnosci z mosiadzu
    shaded(im, rectm(6, 11, 10, 13), "wood.3", "wood.2", "wood.1")              # podstawa
    shaded(im, rectm(7, 9, 8, 11), "wood.3", "wood.2", "wood.1")
    for x, y in ((8, 5), (7, 6), (8, 6), (9, 6), (8, 7), (5, 6), (11, 6)): P(im, x, y, "rose.1" if (x, y) != (8, 6) else "rose.2")  # serduszko-gwiazdka
    P(im, 8, 1, "linen.3"); P(im, 13, 4, "flame.2"); P(im, 3, 3, "flame.2")


def m_diary(im):
    shaded(im, rectm(3, 1, 12, 14), "brick.3", "brick.2", "brick.1")           # okladka
    H.vline(im, 4, 2, 13, "brick.1"); H.vline(im, 5, 2, 13, "brick.3")           # grzbiet
    shaded(im, rectm(6, 3, 11, 12), "linen.3", "linen.2", "linen.1")            # kartki
    for y in (5, 7, 9): H.hline(im, 7, 10, y, "wood.2")                         # reczne linie
    P(im, 7, 5, "wood.1"); P(im, 9, 7, "wood.1")
    shaded(im, {(10, 12), (11, 12), (10, 13), (11, 13), (11, 14), (10, 14)}, "rose.2", "rose.1", "rose.0")  # zakladka-wstazka
    shaded(im, {(8, 11), (9, 11)}, "hay.3", "hay.2", "hay.1")                   # lapka-zapinka


FN = {"m_feed": m_feed, "m_tricks": m_tricks, "m_diary": m_diary, "x_chevron_right": lambda im: chev(im, "right"), "x_chevron_up": lambda im: chev(im, "up"), "x_chevron_down": lambda im: chev(im, "down"), "x_close": x_close, "x_plus": x_plus, "x_minus": x_minus, "x_info": x_info, "x_help": x_help, "x_search": x_search, "x_timer": x_timer,
      "x_bell": x_bell, "x_menu": x_menu, "x_filter": x_filter, "x_star_empty": x_star_empty, "x_music_off": x_music_off, "x_dot_full": x_dot_full}


def build():
    sh = Image.open(SHEET).convert("RGBA")
    out = []
    for name, fn in FN.items():
        im = mk(fn); i = NAMES[name]
        sh.paste((0, 0, 0, 0), (i * 16, 0, i * 16 + 16, 16)); sh.alpha_composite(im, (i * 16, 0))
        out.append(im)
    sh.save(SHEET)
    return out


if __name__ == "__main__":
    ims = build()
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    pv = Image.new("RGBA", (len(ims) * 18, 18), (214, 196, 150, 255))
    for k, im in enumerate(ims): pv.alpha_composite(im, (k * 18 + 1, 1))
    pv.resize((pv.width * 6, pv.height * 6), Image.NEAREST).save(S / "leg_icons.png")
    print(len(ims), "ikon")
