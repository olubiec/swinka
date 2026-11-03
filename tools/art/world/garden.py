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
