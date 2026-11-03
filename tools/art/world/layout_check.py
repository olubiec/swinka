"""Kontrola ukladu scen: wykrywa nakladanie sie nieprzezroczystych pikseli przedmiotow (poza dozwolonymi parami)."""
import numpy as np

FLAT = {"path_cobble", "path_stone", "picnic_blanket", "soil", "pond_big"}      # plaskie, moga lezec pod innymi


def overlaps(placed, allow=()):
    """placed: lista (nazwa, x, y, Image RGBA). Zwraca [(a, b, liczba_pikseli)]."""
    out = []
    for i, (na, xa, ya, ia) in enumerate(placed):
        aa = np.array(ia)[:, :, 3] > 0
        for nb, xb, yb, ib in placed[i + 1:]:
            if (na in FLAT and nb in FLAT) or na == nb and na in FLAT: continue
            if {na, nb} in [set(p) for p in allow]: continue
            ab = np.array(ib)[:, :, 3] > 0
            x0, y0 = max(xa, xb), max(ya, yb); x1, y1 = min(xa + aa.shape[1], xb + ab.shape[1]), min(ya + aa.shape[0], yb + ab.shape[0])
            if x1 <= x0 or y1 <= y0: continue
            n = int((aa[y0 - ya:y1 - ya, x0 - xa:x1 - xa] & ab[y0 - yb:y1 - yb, x0 - xb:x1 - xb]).sum())
            if n and not (na in FLAT or nb in FLAT): out.append((na, nb, n))
    return out
