"""Ogrod i park: drzewa, rosliny. Reczne bryly (domek z siana)."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H

MOSS = ("moss.0", "moss.1", "moss.2", "moss.3")


def blob(im, cx, cy, r, tones=MOSS, rnd=None):
    """Kepa lisci: kolo z cieniowaniem (swiatlo lewy-gorny)."""
    sh, base, lt, hi = [H.color(t) for t in tones]
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d > r:
                continue
            l = ((x - cx) * -0.6 + (y - cy) * -0.8) / max(r, 1)   # -1..1 = do swiatla
            c = base
            if l > 0.55: c = lt
            if l > 0.85 and (rnd is None or rnd.random() < 0.6): c = hi
            if l < -0.35: c = sh
            H.put(im, x, y, c)


def tree_small():
    """Drzewko 32x32: puszysta korona z kep, pien z korzeniami, cieple swiatlo (hay) w koronie."""
    r = random.Random(5)
    im = H.canvas(32, 32)
    # pien
    H.rect(im, 13, 18, 18, 29, "wood.1"); H.vline(im, 14, 18, 29, "wood.2"); H.vline(im, 18, 18, 29, "wood.0")
    H.rect(im, 11, 28, 14, 29, "wood.1"); H.rect(im, 17, 28, 20, 29, "wood.1")           # korzenie
    H.put(im, 15, 22, "wood.0"); H.put(im, 16, 25, "wood.0")
    # korona z kep: tylne ciemniejsze, przednie jasniejsze
    for cx, cy, rr in ((9, 14, 6), (23, 14, 6), (16, 9, 8)):
        blob(im, cx, cy, rr, ("moss.0", "moss.1", "moss.1", "moss.2"), r)
    for cx, cy, rr in ((12, 12, 6), (20, 12, 6), (16, 16, 6), (7, 17, 4), (25, 17, 4)):
        blob(im, cx, cy, rr, MOSS, r)
    # cieple swiatlo i owoce (hay) w koronie
    for x, y in ((11, 8), (14, 6), (18, 8)):
        H.put(im, x, y, "hay.2"); H.put(im, x + 1, y, "moss.4")
    H.put(im, 22, 14, "brick.2"); H.put(im, 9, 17, "brick.2")
    H.break_checkers(im)
    im = H.outline(im)
    return H.contact_shadow(im, rows=1, spread=2)


# ---------------- tlo ogrodu wieczorem: wycinek 240x96 ----------------
def _sky_evening(w, h):
    """Niebo w pasach z ditherem Bayer (gora plum -> rose -> brick -> flame na horyzoncie)."""
    import light
    im = H.canvas(w, h)
    bands = ["plum.2", "plum.3", "rose.0", "brick.3", "flame.0", "flame.1"]
    n = len(bands)
    for y in range(h):
        t = y / (h - 1) * (n - 1)
        i = int(t)
        f = t - i
        for x in range(w):
            b = light.BAYER[y % 4, x % 4] + 0.5
            k = min(n - 1, i + (1 if f > b else 0))
            H.put(im, x, y, bands[k])
    return im


def bg_garden_evening_slice():
    from PIL import Image
    import light
    r = random.Random(9)
    W, Hh = 240, 96
    horizon = 50
    world = H.canvas(W, Hh)
    # dalekie wzgorza (sylwetki) i drzewka
    for x in range(W):
        top = int(horizon - 8 - 5 * __import__("math").sin(x / 23.0) - 3 * __import__("math").sin(x / 9.0 + 1))
        H.vline(world, x, top, horizon, "plum.1")
    for x in range(W):
        top = int(horizon - 2 - 3 * __import__("math").sin(x / 15.0 + 2))
        H.vline(world, x, top, horizon + 1, "moss.0")
    # trawa
    for y in range(horizon + 2, Hh):
        for x in range(W):
            c = "moss.1" if y < horizon + 20 else "moss.2"
            if r.random() < 0.08: c = "moss.2" if c == "moss.1" else "moss.3"
            H.put(world, x, y, c)
    H.break_checkers(world)
    # sciezka z kamykow (wood/hay)
    for y in range(horizon + 14, Hh):
        w0 = 70 + (y - horizon - 14) // 2
        H.hline(world, w0, w0 + 44 + (y - horizon - 14) // 2, y, "hay.0" if (y // 3) % 2 else "wood.3")
    # plot (wood) w tle
    for x in range(0, W, 8):
        H.rect(world, x + 1, horizon + 3, x + 4, horizon + 12, "wood.1"); H.vline(world, x + 1, horizon + 3, horizon + 12, "wood.2")
    H.hline(world, 0, W - 1, horizon + 6, "wood.1"); H.hline(world, 0, W - 1, horizon + 10, "wood.0")
    # dom z oknem po lewej
    H.rect(world, 6, horizon - 22, 52, horizon + 3, "brick.1")
    for y in range(horizon - 22, horizon + 3, 4): H.hline(world, 6, 52, y, "brick.0")
    H.rect(world, 2, horizon - 28, 56, horizon - 22, "wood.1"); H.hline(world, 2, 56, horizon - 28, "wood.2")
    window = (16, horizon - 14, 18, 13)
    H.rect(world, window[0] - 1, window[1] - 1, window[0] + window[2], window[1] + window[3], "wood.0")
    # drzewo i tunel z wierzby
    tr = tree_small()
    world.alpha_composite(tr, (190, horizon - 16))
    import home
    world.alpha_composite(home.willow_tunnel(), (120, horizon - 6))
    # lampa parkowa (slup), zrodlo swiatla
    H.rect(world, 96, horizon - 22, 97, horizon + 18, "plum.2"); H.rect(world, 93, horizon - 28, 100, horizon - 22, "plum.1")
    # kwiaty
    for _ in range(40):
        x, y = r.randint(0, W - 1), r.randint(horizon + 22, Hh - 3)
        H.put(world, x, y, r.choice(["rose.1", "hay.2", "linen.2"]))
        H.put(world, x, y + 1, "moss.3")
    world = H.outline(world) if False else world
    lamp = ("lamp_street", 96, horizon - 25)
    lit = light.render(world, "evening", [lamp, ("window", window[0] + 9, window[1] + 6, 0.8)])
    # niebo pod spodem (na przezroczystych pikselach), po swietle
    sky = _sky_evening(W, Hh)
    out = sky.copy()
    out.alpha_composite(lit)
    # okno i lampa swieca (emisja po swietle)
    H.rect(out, window[0], window[1], window[0] + window[2] - 1, window[1] + window[3] - 1, "flame.2")
    H.rect(out, window[0] + 1, window[1] + 1, window[0] + window[2] - 2, window[1] + window[3] // 2, "flame.1")
    H.vline(out, window[0] + window[2] // 2, window[1], window[1] + window[3] - 1, "wood.0")
    H.hline(out, window[0], window[0] + window[2] - 1, window[1] + window[3] // 2, "wood.0")
    H.rect(out, 94, horizon - 27, 99, horizon - 23, "flame.3"); H.rect(out, 95, horizon - 26, 98, horizon - 24, "flame.2")
    return out
