"""B8: targ. stall_big, tablica zlecen, 3 tabliczki promocji, 3 plakaty (N). Wpisy w tiles.json -> market."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import market as M


def stall_big():
    """64x40: plandeka z siana-na-brick w latach, lada, kosze z towarem, dwie latarnie, tabliczka."""
    im = H.canvas(64, 40)
    for x in (3, 59):
        H.rect(im, x, 6, x + 1, 38, "wood.1"); H.vline(im, x, 6, 38, "wood.2")
    for y in range(3, 14):                                           # plandeka dusk z latami hay
        inset = max(0, (9 - y) // 2)
        H.hline(im, 1 + inset, 62 - inset, y, "dusk.2" if y < 11 else "dusk.1")
    H.hline(im, 3, 60, 3, "dusk.3")
    for x in range(1, 63):
        if (x // 4) % 2 == 0: H.put(im, x, 14, "hay.1"); H.put(im, x, 15, "hay.0")
        else: H.put(im, x, 14, "hay.0")
    for x, y in ((8, 6), (9, 6), (8, 7), (30, 8), (31, 8), (31, 9), (50, 5), (51, 5)):
        H.put(im, x, y, "hay.1")
    H.hline(im, 6, 16, 9, "dusk.0"); H.hline(im, 38, 48, 8, "dusk.0")
    H.rrect(im, 22, 0, 41, 4, 1, ("hay.1", "hay.2", "hay.3", "wood.1"))   # szyld
    for x in (26, 29, 32, 35): H.put(im, x, 2, "wood.1")
    for x in (10, 52):                                                # latarnie
        H.vline(im, x, 15, 17, "plum.2"); H.rect(im, x - 1, 18, x + 1, 21, "wood.1"); H.put(im, x, 19, "flame.2"); H.put(im, x, 20, "flame.1")
    H.rect(im, 4, 25, 59, 33, "wood.2")                               # lada
    H.hline(im, 3, 60, 24, "wood.3"); H.hline(im, 3, 60, 25, "wood.1")
    for y in (28, 31): H.hline(im, 4, 59, y, "wood.1")
    H.hline(im, 4, 59, 33, "wood.0")
    goods = [("brick.2", "brick.3"), ("moss.2", "moss.3"), ("flame.1", "flame.2"), ("hay.1", "hay.2"), ("rose.1", "rose.2"), ("plum.2", "plum.3")]
    for i, (a, b) in enumerate(goods):                                # koszyki z owocami na ladzie
        x = 7 + i * 9
        H.rect(im, x, 21, x + 6, 23, "wood.1"); H.hline(im, x, x + 6, 23, "wood.0")
        H.rect(im, x + 1, 19, x + 5, 20, a); H.put(im, x + 2, 19, b); H.put(im, x + 4, 19, b)
    H.rect(im, 5, 34, 14, 38, "hay.0"); H.hline(im, 5, 14, 34, "hay.1"); H.hline(im, 5, 14, 38, "wood.0")
    H.rect(im, 49, 34, 58, 38, "wood.2"); H.hline(im, 49, 58, 34, "wood.3"); H.hline(im, 49, 58, 38, "wood.0")
    H.break_checkers(im)
    return H.contact_shadow(H.outline(im), rows=1, spread=1)


def order_board():
    """32x32: tablica korkowa w ramie z desek, 4 karteczki (linen) z szpilkami (berry)."""
    im = H.canvas(32, 32)
    for x in (6, 24):
        H.rect(im, x, 24, x + 1, 30, "wood.1")
    H.rrect(im, 2, 2, 29, 25, 1, ("wood.2", "wood.3", "wood.1", "wood.0"))
    H.rect(im, 5, 5, 26, 22, "hay.0")
    for y in range(5, 23, 3):
        for x in range(5 + (y // 3) % 2, 27, 4): H.put(im, x, y, "hay.1")
    for i, (x, y) in enumerate(((6, 6), (17, 6), (6, 14), (17, 14))):
        H.rect(im, x, y, x + 8, y + 6, "linen.2"); H.hline(im, x, x + 8, y + 6, "linen.1")
        for k in range(2): H.hline(im, x + 1, x + 6 - k * 2, y + 2 + k * 2, "wood.1")
        H.put(im, x + 4, y, "berry.1" if i % 2 == 0 else "flame.1")
    H.break_checkers(im)
    return H.contact_shadow(H.outline(im), rows=1, spread=1)


def _plaque(base, mark):
    im = H.canvas(32, 16)
    for x in (5, 25): H.rect(im, x, 11, x + 1, 14, "wood.1")
    H.rrect(im, 1, 1, 30, 11, 1, base)
    mark(im)
    H.break_checkers(im)
    return H.contact_shadow(H.outline(im), rows=1, spread=1)


def promo_1():
    def m(im):
        for x in (6, 13, 20): H.rect(im, x, 5, x + 3, 7, "linen.2"); H.hline(im, x, x + 3, 7, "linen.1")
    return _plaque(("brick.1", "brick.2", "brick.0", "brick.0"), m)


def promo_2():
    def m(im):
        for dy, w in ((-3, 3), (-2, 5), (-1, 6), (0, 6), (1, 6), (2, 5), (3, 3)):
            H.hline(im, 16 - w // 2, 16 + w // 2 - 1, 6 + dy, "hay.2")
        H.hline(im, 14, 17, 4, "hay.3"); H.hline(im, 14, 17, 8, "hay.1")
    return _plaque(("moss.2", "moss.3", "moss.1", "moss.0"), m)


def promo_3():
    def m(im):
        for x in (7, 11, 15, 19, 23): H.vline(im, x, 4, 8, "linen.2")
    return _plaque(("dusk.2", "dusk.3", "dusk.1", "dusk.0"), m)


def _poster(kind):
    im = H.canvas(16, 32)
    H.rect(im, 7, 24, 8, 30, "wood.1")
    H.rect(im, 2, 2, 13, 24, "linen.2"); H.hline(im, 2, 13, 24, "linen.1"); H.vline(im, 13, 2, 24, "linen.1")
    H.hline(im, 3, 12, 4, "wood.1"); H.hline(im, 5, 10, 6, "wood.1")
    if kind == 0:                                                   # swinka
        H.rect(im, 4, 12, 11, 18, "plum.2"); H.rect(im, 3, 14, 5, 17, "plum.2"); H.put(im, 10, 12, "rose.1"); H.put(im, 4, 15, "rose.1")
    elif kind == 1:                                                 # marchewka
        H.rect(im, 6, 11, 9, 14, "flame.1"); H.rect(im, 7, 15, 8, 20, "flame.1"); H.put(im, 7, 21, "flame.0")
        H.rect(im, 6, 8, 9, 10, "moss.2"); H.put(im, 7, 7, "moss.3")
    else:                                                           # gwiazda
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0), (0, -2), (0, 2)):
            H.put(im, 7 + dx, 15 + dy, "hay.2")
        H.put(im, 7, 15, "hay.3")
    for p in ((2, 2), (13, 2)): H.put(im, *p, "berry.1")
    H.break_checkers(im)
    return H.contact_shadow(H.outline(im), rows=1, spread=1)


ITEMS = {"stall_basic": None, "stall_big": stall_big, "order_board": order_board, "promo_1": promo_1,
         "promo_2": promo_2, "promo_3": promo_3, "poster_1": lambda: _poster(0), "poster_2": lambda: _poster(1),
         "poster_3": lambda: _poster(2)}


def build_items():
    for mid, fn in ITEMS.items():
        if fn is None: continue
        im = fn()
        rel = f"market/{mid}.png"
        H.save_png(im, H.WORLD_DIR / rel)
        old = H.WORLD_DIR / f"market/{mid}_x2.png"
        if old.exists(): H.save_png(im.resize((im.width * 2, im.height * 2), H.Image.NEAREST), old)
        def upd(d, mid=mid, rel=rel, im=im):
            d["market"][mid] = {"file": rel, "size": [im.width, im.height]}
        H._update_json(H.TILES_FILE, upd)


if __name__ == "__main__":
    build_items()
