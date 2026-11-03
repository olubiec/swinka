"""Dom (house): przedmioty przebudowy B4 + probki B1. Reczne bryly w palecie domku z siana."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H

BR = ("brick.1", "brick.2", "brick.3", "brick.3")      # tkanina: tylko rampa brick (recolor)
BR_D = ("brick.0", "brick.1", "brick.2", "brick.2")


def sofa_cosy():
    """Sofa-bochenek 3x2 (48x32): wypukly grzbiet jak bochen, rolowane boki, dwie poduchy, drewniane nozki."""
    im = H.canvas(48, 32)
    H.rrect(im, 5, 5, 42, 20, 7, BR_D)            # grzbiet-bochen (ciemniejszy, w tle)
    H.rrect(im, 2, 12, 11, 27, 4, BR)             # lewy rolowany bok
    H.rrect(im, 36, 12, 45, 27, 4, BR)            # prawy bok
    H.rrect(im, 11, 16, 24, 26, 3, BR)            # lewa poducha
    H.rrect(im, 23, 16, 36, 26, 3, BR)            # prawa poducha
    H.rect(im, 12, 26, 35, 27, "brick.0")         # podstawa
    # nozki z drewna
    for x in (5, 40):
        H.rect(im, x, 28, x + 2, 29, "wood.1"); H.put(im, x, 28, "wood.2")
    # szwy i guziki pikowania na grzbiecie (srodek 2 guziki + pikowanie)
    for x in (16, 23, 30):
        H.put(im, x, 10, "brick.0"); H.put(im, x, 9, "brick.2")
    for x in (19, 27):
        H.put(im, x, 13, "brick.0"); H.put(im, x, 12, "brick.2")
    # szew miedzy poduchami i krawedz siedziska
    H.vline(im, 23, 17, 26, "brick.0")
    H.hline(im, 12, 35, 16, "brick.3")
    # rolka boku: spirala (kreska) i swiatlo
    for x0 in (3, 37):
        H.hline(im, x0 + 1, x0 + 6, 15, "brick.0")
        H.put(im, x0 + 2, 14, "brick.3")
    # koc / proszek hay: maly pled na boku (ciepły akcent)
    H.rect(im, 38, 18, 43, 20, "hay.1"); H.hline(im, 38, 43, 20, "hay.0"); H.hline(im, 38, 43, 18, "hay.2")
    im = H.outline(im, sides="nesw")
    return H.contact_shadow(im, rows=1, spread=2)


# ---------------- kominek 48x48 ----------------
def _fire(frame):
    """Plomien w otworze (x 16..31, y 26..41). 4 klatki: jezyki o roznej wysokosci."""
    im = H.canvas(48, 48)
    cols = [(18, 7), (21, 12), (24, 10), (27, 13), (30, 6)]   # (x, wysokosc bazowa)
    heights = [
        [7, 12, 10, 13, 6],
        [9, 10, 13, 11, 7],
        [6, 13, 11, 12, 9],
        [8, 11, 12, 14, 6],
    ][frame]
    for (x, _), hgt in zip(cols, heights):
        for k in range(hgt):
            y = 41 - k
            t = k / hgt
            c = "flame.0" if t < 0.45 else "flame.1" if t < 0.75 else "flame.2"
            w = 3 if t < 0.6 else 2 if t < 0.9 else 1
            H.rect(im, x - (w // 2), y, x - (w // 2) + w - 1, y, c)
        H.put(im, x, 41 - max(hgt - 2, 1), "flame.3" if hgt > 10 else "flame.2")
    # zar i jadro
    H.hline(im, 19, 29, 41, "flame.1"); H.hline(im, 21, 27, 40, "flame.2")
    H.put(im, 24, 40, "flame.3"); H.put(im, 23 + frame % 2, 39, "flame.3")
    # iskry
    H.put(im, 20 + frame * 3 % 10, 22 - frame, "flame.2")
    return im


def fireplace_off():
    im = H.canvas(48, 48)
    H.rect(im, 4, 9, 43, 44, "brick.1")                    # murowana obudowa
    for y in range(10, 44, 4):                              # rzedy cegiel
        H.hline(im, 4, 43, y, "brick.0")
        off = 0 if (y // 4) % 2 == 0 else 4
        for x in range(5 + off, 43, 8):
            H.vline(im, x, y + 1, min(y + 3, 43), "brick.0")
    for y in range(11, 44, 4):                              # swiatlo na cegle
        H.hline(im, 5, 42, y, "brick.2") if y % 8 == 3 else None
    H.rect(im, 14, 24, 33, 43, "plum.0")                    # otwor
    H.rect(im, 15, 22, 32, 23, "plum.0"); H.rect(im, 17, 21, 30, 21, "plum.0")
    H.hline(im, 13, 34, 23, "brick.0"); H.vline(im, 13, 24, 43, "brick.0"); H.vline(im, 34, 24, 43, "brick.0")
    H.rect(im, 14, 44, 33, 44, "wood.0")
    # belka-polka (wood) z wystepem
    H.rect(im, 1, 5, 46, 8, "wood.2"); H.hline(im, 1, 46, 5, "wood.3"); H.hline(im, 1, 46, 8, "wood.1")
    H.hline(im, 2, 45, 4, "wood.0")
    H.vline(im, 14, 6, 7, "wood.1"); H.vline(im, 33, 6, 7, "wood.1")
    # polka: doniczka, ksiazki, swieca-slup
    H.rect(im, 6, 1, 9, 3, "wood.1"); H.rect(im, 6, 2, 9, 3, "brick.2")
    H.put(im, 7, 0, "moss.2"); H.put(im, 8, 0, "moss.3")
    H.rect(im, 38, 1, 41, 3, "linen.1"); H.put(im, 39, 0, "flame.1"); H.put(im, 39, 1, "linen.3")
    # kratka (zelazna) i palenisko
    for x in range(16, 32, 3):
        H.vline(im, x, 30, 42, "plum.3")
    H.hline(im, 15, 32, 36, "plum.2")
    # polana (wylaczony: weglowe)
    H.rect(im, 18, 40, 29, 42, "wood.0"); H.rect(im, 20, 38, 27, 39, "wood.1")
    H.hline(im, 18, 29, 42, "plum.1"); H.put(im, 22, 40, "brick.1"); H.put(im, 26, 41, "brick.1")
    im = H.outline(im)
    return H.contact_shadow(im, rows=1, spread=1) if im.getpixel((24, 47))[3] == 0 else im


def fireplace_on(frame):
    base = fireplace_off()
    im = base.copy()
    # w otworze wnetrze rozswietlone: tlo plum.1, plomien za kratka
    H.rect(im, 14, 24, 33, 43, "plum.1"); H.rect(im, 15, 22, 32, 23, "plum.1"); H.rect(im, 17, 21, 30, 21, "plum.1")
    H.rect(im, 15, 26, 32, 39, "brick.0") if False else None
    fire = _fire(frame)
    im.alpha_composite(fire, (0, 0))
    for x in range(16, 32, 3):
        H.vline(im, x, 33, 42, "plum.3")
    H.hline(im, 15, 32, 36, "plum.2")
    H.rect(im, 18, 42, 29, 43, "wood.0"); H.hline(im, 17, 30, 43, "flame.0")
    return im


# ---------------- lampa-grzybek 16x32 ----------------
def lamp_mushroom(on):
    im = H.canvas(16, 32)
    cap = ("flame.0", "flame.1", "flame.2", "flame.2") if on else ("brick.0", "brick.1", "brick.2", "brick.3")
    H.rrect(im, 1, 12, 14, 21, 5, cap)
    spots = "flame.3" if on else "hay.2"
    for x, y in ((4, 15), (9, 14), (11, 18), (6, 19)):
        H.rect(im, x, y, x + 1, y + 1, spots)
    # trzon z cienia/swiatla
    H.rect(im, 6, 22, 9, 27, "linen.2"); H.vline(im, 9, 22, 27, "linen.1"); H.vline(im, 6, 22, 27, "linen.3")
    H.hline(im, 4, 11, 28, "wood.2"); H.hline(im, 4, 11, 29, "wood.1")        # drewniana podstawka
    if on:
        H.hline(im, 3, 12, 22, "flame.1")                                       # swiatlo spod kapelusza
    im = H.outline(im)
    return H.contact_shadow(im, rows=1, spread=1)


# ---------------- tunel z wierzby 48x32 (ogrod) ----------------
def willow_tunnel():
    import math, random
    im = H.canvas(48, 32)
    cx, cy, rx, ry = 23.5, 27, 21, 22
    _r = random.Random(3)
    # wnetrze tunelu: ciemne, glebia (elipsa wewnetrzna)
    for y in range(32):
        for x in range(48):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            d = math.sqrt(dx * dx + dy * dy)
            if d <= 1.0 and y <= 29:
                if d > 0.72:
                    c = "moss.1" if _r.random() < 0.7 else "moss.2"      # grubosc luku z lisci
                    if d > 0.9: c = "moss.2" if _r.random() < 0.75 else "moss.3"
                elif d > 0.55:
                    c = "moss.0"
                else:
                    c = "plum.0" if y < 26 else "moss.0"
                H.put(im, x, y, c)
    # swiatlo na grzbiecie luku i drobne listki
    for x, y in ((16, 8), (30, 8), (9, 12), (38, 12), (23, 7)):
        H.put(im, x, y, "moss.4"); H.put(im, x + 1, y + 1, "moss.3")
    # sciezka w srodku (ciemna) + jasniejszy wylot
    H.rect(im, 15, 28, 32, 29, "wood.1"); H.hline(im, 17, 30, 28, "wood.2")
    # zwisajace witki z grzbietu luku (dlugie, rozne tony, kropka na koncu)
    rnd = random.Random(11)
    for x in range(3, 45):
        dx = (x - cx) / rx
        top = int(cy - ry * math.sqrt(max(0, 1 - dx * dx)))
        if rnd.random() < 0.5 and abs(dx) < 0.55:
            continue
        ln = rnd.randint(6, 13) if abs(dx) > 0.5 else rnd.randint(3, 6)
        for k in range(ln):
            y = top + 4 + k
            if y > 29: break
            H.put(im, x, y, "moss.3" if k == 0 else "moss.2" if k % 2 else "moss.1")
        if top + 4 + ln <= 29:
            H.put(im, x, top + 4 + ln, "moss.4")
    # pnie u podstawy
    for x0 in (2, 41):
        H.rect(im, x0, 24, x0 + 4, 29, "wood.1"); H.vline(im, x0, 24, 29, "wood.2"); H.vline(im, x0 + 4, 24, 29, "wood.0")
    H.break_checkers(im)
    im = H.outline(im, sides="nesw")
    return H.contact_shadow(im, rows=1, spread=0)


if __name__ == "__main__":
    pass
