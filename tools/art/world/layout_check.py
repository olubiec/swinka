"""Kontrola ukladu scen: wykrywa nakladanie sie nieprzezroczystych pikseli przedmiotow (poza dozwolonymi parami)."""
import numpy as np

FLAT = {"path_cobble", "path_stone", "picnic_blanket", "soil", "pond_big", "plot_lawn", "plot_field", "plot_orchard"}      # plaskie, moga lezec pod innymi


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


def order_issues(placed):
    """Kolejnosc warstw: przy nachodzeniu pikseli pozniej rysowany ma miec nizsza (wieksze y) dolna krawedz.
    placed w kolejnosci rysowania; przedmioty scienne (nazwa z prefiksem wall:) i plaskie pomijane."""
    out = []
    for i, (na, xa, ya, ia) in enumerate(placed):
        aa = np.array(ia)[:, :, 3] > 0
        for nb, xb, yb, ib in placed[i + 1:]:
            if na in FLAT or nb in FLAT: continue
            ab = np.array(ib)[:, :, 3] > 0
            x0, y0 = max(xa, xb), max(ya, yb); x1, y1 = min(xa + aa.shape[1], xb + ab.shape[1]), min(ya + aa.shape[0], yb + ab.shape[0])
            if x1 <= x0 or y1 <= y0: continue
            n = int((aa[y0 - ya:y1 - ya, x0 - xa:x1 - xa] & ab[y0 - yb:y1 - yb, x0 - xb:x1 - xb]).sum())
            if n and yb + ib.height < ya + ia.height:
                out.append((na, nb, n, "pozniej rysowany stoi wyzej na ekranie"))
    return out


def zone_issues(placed, forbidden, allow=()):
    """forbidden(x, y) -> True gdy punkt jest w zlej strefie (np. w wodzie). Sprawdza kotwice dol-srodek i dolne rogi."""
    out = []
    for n, x, y, im in placed:
        if n in FLAT or n in allow: continue
        by = y + im.height - 1
        for ax in (x + 2, x + im.width // 2, x + im.width - 3):
            if forbidden(ax, by):
                out.append((n, ax, by)); break
    return out


def report(name, placed, forbidden=None, allow_zone=(), allow=()):
    rows = [("nakladanie", *o) for o in overlaps(placed, allow)] + [("kolejnosc", *o) for o in order_issues(placed)]
    if forbidden: rows += [("strefa", *z) for z in zone_issues(placed, forbidden, allow_zone)]
    print(f"[{name}] {len(placed)} przedmiotow, problemow: {len(rows)}")
    for r in rows: print("   ", r)
    return rows
