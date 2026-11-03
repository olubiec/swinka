"""Targ: stragany. Karton, plandeka z latami, skrzynie. (domek z siana)"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H


def _crate(im, x, y, w, h, fill):
    H.rect(im, x, y, x + w - 1, y + h - 1, "wood.2")
    H.hline(im, x, x + w - 1, y, "wood.3"); H.hline(im, x, x + w - 1, y + h - 1, "wood.0")
    H.vline(im, x, y, y + h - 1, "wood.1"); H.vline(im, x + w - 1, y, y + h - 1, "wood.1")
    H.hline(im, x + 1, x + w - 2, y + h // 2, "wood.1")
    for i, c in enumerate(fill):                              # towar nad krawedzia skrzyni
        H.rect(im, x + 1 + i * 2, y - 2, x + 2 + i * 2, y - 1, c)
        H.put(im, x + 1 + i * 2, y - 2, "moss.3" if c.startswith("moss") else "flame.2" if c == "flame.1" else c)


def stall_basic():
    """Stragan 48x40: dwa slupki, plandeka z latami (brick, hay brzeg w fale), lada z desek, skrzynie z warzywami, wiszaca latarenka."""
    im = H.canvas(48, 40)
    # slupki
    for x in (4, 42):
        H.rect(im, x, 8, x + 1, 38, "wood.1"); H.vline(im, x, 8, 38, "wood.2")
    # plandeka: skos, brick z latami, brzeg w fale (hay)
    for y in range(2, 11):
        inset = (10 - y) // 2
        H.hline(im, 1 + inset, 46 - inset, y, "brick.1" if y > 3 else "brick.2")
    H.hline(im, 3, 44, 2, "brick.3")
    for x in range(1, 47):                                   # fala dolnej krawedzi
        H.put(im, x, 11, "hay.1" if (x // 3) % 2 == 0 else "hay.0")
        if (x // 3) % 2 == 0: H.put(im, x, 12, "hay.0")
    for x, y in ((9, 5), (10, 5), (9, 6), (30, 4), (31, 4), (31, 5), (38, 7), (39, 7)):   # lata
        H.put(im, x, y, "brick.2")
    H.hline(im, 5, 12, 8, "brick.0"); H.hline(im, 28, 36, 7, "brick.0")                 # szwy plandeki
    # lada z desek
    H.rect(im, 5, 24, 42, 32, "wood.2")
    H.hline(im, 4, 43, 23, "wood.3"); H.hline(im, 4, 43, 24, "wood.1")
    for y in (27, 30): H.hline(im, 5, 42, y, "wood.1")
    H.hline(im, 5, 42, 32, "wood.0")
    # skrzynie z towarem na ladzie i przed nia
    _crate(im, 7, 26, 9, 6, ["moss.2", "moss.2", "moss.3", "moss.2"])
    _crate(im, 18, 26, 9, 6, ["flame.1", "flame.0", "flame.1", "flame.1"])
    _crate(im, 29, 26, 9, 6, ["hay.1", "hay.2", "hay.1", "hay.2"])
    _crate(im, 3, 33, 10, 6, ["brick.2", "brick.3", "brick.2", "brick.2", "brick.3"])
    # karton z napisem (linen) obok
    H.rect(im, 34, 33, 44, 38, "hay.0"); H.hline(im, 34, 44, 33, "hay.1"); H.hline(im, 34, 44, 38, "wood.0")
    H.rect(im, 37, 35, 41, 35, "wood.1")
    # latarenka na haku
    H.vline(im, 24, 12, 14, "plum.2"); H.rect(im, 23, 15, 25, 17, "wood.1"); H.put(im, 24, 16, "flame.2")
    H.break_checkers(im)
    im = H.outline(im)
    return H.contact_shadow(im, rows=1, spread=1)
