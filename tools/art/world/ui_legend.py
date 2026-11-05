"""UI-4 "legendarny" szlif interfejsu: te same pliki, rozmiary i slice co w ui_a.py/ui_kit.py (kod nie wymaga zmian),
ale bogatsze wnetrze: fazowane ramy z 3-4 tonami, mosiezne okucia na rogach, wciete sloty, polysk na przyciskach,
grawerowane paski, inlay z siana na papierze. Uzycie: python3 tools/art/world/ui_legend.py"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import ui_a as U

UI = U.UI_DIR
CUT = "plum.1"


def ring(im, i, tl, br, w=None, h=None):
    """Ramka 1 px na glebokosci i: tl = gora+lewo, br = dol+prawo (faza)."""
    w = im.width if w is None else w; h = im.height if h is None else h
    x0, y0, x1, y1 = i, i, w - 1 - i, h - 1 - i
    H.hline(im, x0, x1, y0, tl); H.vline(im, x0, y0, y1, tl)
    H.hline(im, x0, x1, y1, br); H.vline(im, x1, y0, y1, br)
    H.put(im, x0, y1, br if tl != br else tl); H.put(im, x1, y0, tl if tl != br else br)


def cut4(im, d=0):
    w, h = im.size
    for x, y in ((d, d), (w - 1 - d, d), (d, h - 1 - d), (w - 1 - d, h - 1 - d)): H.put(im, x, y, CUT)


def cap(im, x, y, n=6):
    """Mosiezne okucie rogu n x n (n=6): kontur, siano, polysk, cien, nit."""
    H.rect(im, x, y, x + n - 1, y + n - 1, "wood.0")
    H.rect(im, x + 1, y + 1, x + n - 2, y + n - 2, "hay.2")
    H.hline(im, x + 1, x + n - 2, y + 1, "hay.3"); H.vline(im, x + 1, y + 1, y + n - 2, "hay.3")
    H.hline(im, x + 1, x + n - 2, y + n - 2, "hay.1"); H.vline(im, x + n - 2, y + 2, y + n - 2, "hay.1")
    c = (n - 1) // 2
    H.put(im, x + c, y + c, "wood.0"); H.put(im, x + c - 1, y + c - 1, "hay.3"); H.put(im, x + c + 1, y + c + 1, "hay.1")


def mirror_caps(im, n=6):
    w, h = im.size
    cap(im, 0, 0, n); cap(im, w - n, 0, n); cap(im, 0, h - n, n); cap(im, w - n, h - n, n)


def panel_wood():
    im = H.canvas(24, 24)
    ring(im, 0, "wood.0", "wood.0"); ring(im, 1, "wood.3", "wood.1"); ring(im, 2, "wood.2", "wood.1")
    H.rect(im, 3, 3, 20, 20, "wood.2"); ring(im, 3, "wood.0", "wood.3")
    H.rect(im, 4, 4, 19, 19, "wood.1")
    for y in (8, 13, 17): H.hline(im, 4, 19, y, "wood.2")
    H.hline(im, 4, 19, 5, "wood.0")
    mirror_caps(im, 8)
    cut4(im)
    return im


def panel_paper():
    im = H.canvas(24, 24)
    ring(im, 0, "wood.0", "wood.0"); ring(im, 1, "wood.3", "wood.1"); ring(im, 2, "wood.2", "wood.1")
    ring(im, 3, "hay.1", "hay.1")                                       # inlay z siana
    ring(im, 4, "wood.0", "wood.0")
    H.rect(im, 5, 5, 18, 18, "linen.3")
    H.hline(im, 5, 18, 5, "linen.1"); H.vline(im, 5, 5, 18, "linen.1"); H.hline(im, 6, 18, 6, "linen.2"); H.vline(im, 6, 6, 18, "linen.2")
    H.hline(im, 5, 18, 18, "linen.2"); H.vline(im, 18, 5, 18, "linen.2")
    mirror_caps(im, 7)
    for (x, y, dx, dy) in ((6, 6, 1, 1), (17, 6, -1, 1), (6, 17, 1, -1), (17, 17, -1, -1)):   # nawias ozdobny na papierze
        H.put(im, x, y, "hay.2"); H.put(im, x + dx, y, "hay.2"); H.put(im, x, y + dy, "hay.2")
    cut4(im)
    return im


def btn(tones, pressed=False, hover=False):
    lt, base, sh, edge = tones
    w, h = 24, 16
    im = H.canvas(w, h); t = 1 if pressed else 0
    H.rect(im, 0, t, w - 1, h - 1, "wood.0"); H.rect(im, 1, t + 1, w - 2, h - 2, base)
    if pressed:
        H.hline(im, 1, w - 2, t + 1, sh); H.hline(im, 1, w - 2, t + 2, sh)
        H.vline(im, 1, t + 1, h - 2, sh)
    else:
        H.hline(im, 2, w - 3, 1, lt); H.hline(im, 2, w - 3, 2, lt)
        H.vline(im, 1, 2, h - 5, lt); H.vline(im, w - 2, 3, h - 5, sh)
        H.hline(im, 1, w - 2, h - 4, sh); H.hline(im, 1, w - 2, h - 3, edge); H.hline(im, 2, w - 3, h - 2, "wood.1" if hover is False else "hay.1")
        if hover: H.put(im, 2, 2, "linen.3"); H.put(im, w - 3, 2, "linen.3")
    for x, y in ((0, t), (w - 1, t), (0, h - 1), (w - 1, h - 1)): H.put(im, x, y, CUT)
    return im


def tab(on):
    w, h = 20, 14
    im = H.canvas(w, h); top = 0 if on else 1
    H.rect(im, 0, top, w - 1, h - 1, "wood.0")
    H.rect(im, 1, top + 1, w - 2, h - 1, "hay.2" if on else "wood.2")
    H.hline(im, 2, w - 3, top + 1, "hay.3" if on else "wood.3")
    H.hline(im, 2, w - 3, top + 2, "linen.3" if on else "wood.2")
    H.vline(im, 1, top + 2, h - 2, "hay.3" if on else "wood.3"); H.vline(im, w - 2, top + 3, h - 2, "hay.1" if on else "wood.1")
    if on: H.hline(im, 1, w - 2, h - 1, "hay.2")
    else:
        H.hline(im, 1, w - 2, h - 2, "wood.1"); H.hline(im, 1, w - 2, h - 1, "wood.0")
    for x in (0, w - 1): H.put(im, x, top, CUT)
    return im


def close(pressed=False):
    w = 16
    im = H.canvas(w, w); t = 1 if pressed else 0
    H.rect(im, 0, t, 15, 15, "wood.0"); H.rect(im, 1, t + 1, 14, 14, "brick.2")
    if not pressed:
        ring(im, 1, "brick.3", "brick.1", w, w); H.hline(im, 2, 13, 2, "brick.3"); H.put(im, 2, 2, "rose.2")
    for k in range(7):
        H.put(im, 5 + k, 5 + k + t, "brick.0"); H.put(im, 11 - k, 5 + k + t, "brick.0")     # cien ikS
    for k in range(7):
        H.put(im, 4 + k, 4 + k + t, "linen.3"); H.put(im, 10 - k, 4 + k + t, "linen.3")
    for x, y in ((0, t), (15, t), (0, 15), (15, 15)): H.put(im, x, y, CUT)
    return im


def groove():
    im = H.canvas(16, 8)
    H.rect(im, 0, 0, 15, 7, "wood.0"); H.rect(im, 1, 1, 14, 6, "plum.2")
    H.hline(im, 1, 14, 1, "plum.0"); H.hline(im, 1, 14, 2, "plum.1"); H.hline(im, 1, 14, 6, "plum.3")
    cut4(im)
    return im


def fill(c, stripe=True):
    im = H.canvas(4, 6)
    H.rect(im, 0, 0, 3, 5, c[1]); H.hline(im, 0, 3, 0, c[0]); H.hline(im, 0, 3, 1, c[0]); H.hline(im, 0, 3, 5, c[2]); H.hline(im, 0, 3, 4, c[2])
    return im


def badge():
    im = H.canvas(16, 12)
    H.rect(im, 0, 0, 15, 11, "wood.0"); H.rect(im, 1, 1, 14, 10, "hay.1")
    H.rect(im, 2, 2, 13, 9, "linen.2"); H.hline(im, 2, 13, 2, "linen.1"); H.vline(im, 2, 2, 9, "linen.1")
    H.hline(im, 3, 13, 9, "linen.3"); H.vline(im, 13, 3, 9, "linen.3")
    H.hline(im, 1, 14, 1, "hay.3"); H.vline(im, 1, 1, 10, "hay.3")
    cut4(im)
    return im


def field():
    im = H.canvas(16, 14)
    H.rect(im, 0, 0, 15, 13, "wood.0"); H.rect(im, 1, 1, 14, 12, "linen.3")
    H.hline(im, 1, 14, 1, "wood.1"); H.vline(im, 1, 1, 12, "wood.1"); H.hline(im, 2, 14, 2, "linen.1"); H.vline(im, 2, 2, 12, "linen.1")
    H.hline(im, 1, 14, 12, "hay.1"); H.hline(im, 2, 13, 11, "linen.2")
    cut4(im)
    return im


def card():
    im = H.canvas(16, 16)
    ring(im, 0, "wood.0", "wood.0"); ring(im, 1, "wood.3", "wood.1"); ring(im, 2, "hay.1", "hay.1")
    H.rect(im, 3, 3, 12, 12, "linen.3"); H.hline(im, 3, 12, 3, "linen.1"); H.vline(im, 3, 3, 12, "linen.1")
    H.hline(im, 3, 12, 12, "linen.2"); H.vline(im, 12, 3, 12, "linen.2")
    for x, y in ((1, 1), (14, 1), (1, 14), (14, 14)): H.put(im, x, y, "hay.3")
    cut4(im)
    return im


def tooltip():
    im = H.canvas(16, 16)
    ring(im, 0, "plum.0", "plum.0"); ring(im, 1, "plum.3", "plum.1"); H.rect(im, 2, 2, 13, 13, "plum.2")
    H.hline(im, 2, 13, 2, "plum.1"); H.put(im, 1, 1, "hay.2"); H.put(im, 14, 14, "hay.1")
    cut4(im)
    return im


def slot(on=False):
    im = H.canvas(20, 20)
    if on:
        ring(im, 0, "wood.0", "wood.0"); ring(im, 1, "hay.3", "hay.1"); ring(im, 2, "hay.2", "hay.2"); ring(im, 3, "hay.1", "hay.3")
        H.rect(im, 4, 4, 15, 15, "linen.3"); H.hline(im, 4, 15, 4, "linen.2"); H.vline(im, 4, 4, 15, "linen.2")
        for x, y in ((2, 2), (17, 2), (2, 17), (17, 17)): H.put(im, x, y, "linen.3")
    else:
        ring(im, 0, "wood.0", "wood.0"); ring(im, 1, "wood.0", "wood.3"); ring(im, 2, "wood.1", "wood.2")
        H.rect(im, 3, 3, 16, 16, "wood.2"); H.hline(im, 3, 16, 3, "wood.1"); H.vline(im, 3, 3, 16, "wood.1")
        for x, y in ((2, 2), (17, 2), (2, 17), (17, 17)): H.put(im, x, y, "wood.3")
    cut4(im)
    return im


def toggle(on):
    im = H.canvas(24, 12)
    H.rect(im, 0, 0, 23, 11, "wood.0"); H.rect(im, 1, 1, 22, 10, "moss.3" if on else "plum.2")
    H.hline(im, 1, 22, 1, "moss.2" if on else "plum.1"); H.hline(im, 1, 22, 10, "moss.4" if on else "plum.3")
    kx = 13 if on else 2
    H.rect(im, kx, 2, kx + 8, 9, "wood.0"); H.rect(im, kx + 1, 3, kx + 7, 8, "hay.2")
    H.hline(im, kx + 1, kx + 7, 3, "hay.3"); H.vline(im, kx + 1, 3, 7, "hay.3"); H.hline(im, kx + 1, kx + 7, 8, "hay.1")
    H.put(im, kx + 4, 5, "wood.0")
    cut4(im)
    return im


def bar_wood():
    im = H.canvas(16, 16)
    ring(im, 0, "wood.0", "wood.0"); ring(im, 1, "wood.3", "wood.1")
    H.rect(im, 2, 2, 13, 13, "wood.2"); H.hline(im, 2, 13, 2, "wood.3"); H.hline(im, 2, 13, 3, "wood.2")
    H.hline(im, 2, 13, 12, "wood.1"); H.hline(im, 2, 13, 13, "wood.0")
    H.hline(im, 2, 13, 5, "wood.2"); H.hline(im, 2, 13, 10, "wood.1")
    for x in (2, 11): H.rect(im, x, 6, x + 1, 9, "hay.2"); H.put(im, x, 6, "hay.3"); H.put(im, x + 1, 9, "hay.1")  # nity
    cut4(im)
    return im


def dot(full):
    im = H.canvas(8, 8)
    H.rect(im, 0, 0, 7, 7, "wood.0"); H.rect(im, 1, 1, 6, 6, "moss.3" if full else "linen.2")
    if full:
        H.hline(im, 1, 6, 1, "moss.4"); H.vline(im, 1, 1, 6, "moss.4"); H.hline(im, 2, 6, 6, "moss.2"); H.put(im, 3, 3, "hay.3")
    else:
        H.hline(im, 1, 6, 1, "linen.1"); H.vline(im, 1, 1, 6, "linen.1")
    cut4(im)
    return im


def sep_h():
    im = H.canvas(32, 4)
    H.hline(im, 0, 31, 0, "wood.0"); H.hline(im, 0, 31, 1, "wood.2"); H.hline(im, 0, 31, 2, "hay.1"); H.hline(im, 0, 31, 3, "plum.1")
    for x in range(1, 32, 4): H.put(im, x, 1, "hay.3")
    for x in (15, 16): H.put(im, x, 1, "hay.3"); H.put(im, x, 2, "hay.3")
    return im


def sep_v():
    im = H.canvas(4, 32)
    H.vline(im, 0, 0, 31, "wood.0"); H.vline(im, 1, 0, 31, "wood.2"); H.vline(im, 2, 0, 31, "hay.1"); H.vline(im, 3, 0, 31, "plum.1")
    for y in range(1, 32, 4): H.put(im, 1, y, "hay.3")
    return im


def header_banner():
    w, h = 96, 24
    im = H.canvas(w, h)
    H.rect(im, 0, 2, w - 1, h - 3, "wood.0"); H.rect(im, 1, 3, w - 2, h - 4, "wood.2")
    H.hline(im, 1, w - 2, 3, "wood.3"); H.hline(im, 1, w - 2, 4, "wood.3"); H.hline(im, 1, w - 2, h - 5, "wood.1"); H.hline(im, 1, w - 2, h - 4, "wood.1")
    for x in range(12, w - 12, 4): H.hline(im, x, x + 1, 7, "hay.2"); H.hline(im, x, x + 1, h - 8, "hay.2")
    for x in (0, w - 12):                                                       # mosiezne okucia konca wstegi
        H.rect(im, x, 1, x + 11, h - 2, "wood.0"); H.rect(im, x + 1, 2, x + 10, h - 3, "hay.2")
        H.hline(im, x + 1, x + 10, 2, "hay.3"); H.vline(im, x + 1, 2, h - 3, "hay.3"); H.hline(im, x + 1, x + 10, h - 3, "hay.1")
        H.put(im, x + 3, 5, "wood.0"); H.put(im, x + 8, 5, "wood.0"); H.put(im, x + 3, h - 7, "wood.0"); H.put(im, x + 8, h - 7, "wood.0")
    for x in (0, w - 1):
        for y in (1, h - 2): H.put(im, x, y, CUT)
    H.hline(im, 2, w - 3, h - 2, "plum.1")
    return im


ITEMS = {
    "panel_wood": (panel_wood, [8] * 4), "panel_paper": (panel_paper, [8] * 4), "header_banner": (header_banner, [12, 0, 12, 0]),
    "sep_h": (sep_h, [0] * 4), "sep_v": (sep_v, [0] * 4),
    "btn_normal": (lambda: btn(("hay.3", "hay.2", "hay.1", "wood.2")), [6] * 4),
    "btn_hover": (lambda: btn(("linen.3", "hay.3", "hay.2", "wood.2"), hover=True), [6] * 4),
    "btn_pressed": (lambda: btn(("hay.1", "hay.1", "hay.0", "wood.2"), True), [6] * 4),
}
GREEN = ("moss.4", "moss.3", "moss.2", "moss.1"); BLUE = ("dusk.4", "dusk.3", "dusk.2", "dusk.1")
ROSE = ("rose.2", "rose.1", "rose.0", "berry.1"); RED = ("brick.3", "brick.2", "brick.1", "brick.0")
for nm, tn in (("green", GREEN), ("blue", BLUE), ("rose", ROSE), ("red", RED)):
    ITEMS[f"btn_{nm}"] = ((lambda t=tn: btn(t)), [6] * 4)
    ITEMS[f"btn_{nm}_pressed"] = ((lambda t=tn: btn(t, True)), [6] * 4)
ITEMS.update({
    "tab_off": (lambda: tab(False), [5, 5, 5, 0]), "tab_on": (lambda: tab(True), [5, 5, 5, 0]),
    "close_btn": (lambda: close(), [5] * 4), "close_btn_pressed": (lambda: close(True), [5] * 4),
    "bar_groove": (groove, [3] * 4),
    "bar_fill_high": (lambda: fill(("moss.4", "moss.3", "moss.2")), [0] * 4),
    "bar_fill_mid": (lambda: fill(("hay.3", "hay.2", "hay.1")), [0] * 4),
    "bar_fill_low": (lambda: fill(("rose.2", "brick.2", "brick.1")), [0] * 4),
    "badge": (badge, [4] * 4), "field": (field, [4] * 4), "card": (card, [5] * 4), "tooltip": (tooltip, [5] * 4),
    "slot": (lambda: slot(), [6] * 4), "slot_on": (lambda: slot(True), [6] * 4),
    "toggle_off": (lambda: toggle(False), [0] * 4), "toggle_on": (lambda: toggle(True), [0] * 4),
    "bar_wood": (bar_wood, [5] * 4), "dot_empty": (lambda: dot(False), [0] * 4), "dot_full": (lambda: dot(True), [0] * 4),
})


def build():
    p = UI / "ui.json"; j = json.loads(p.read_text())
    for k, (f, sl) in ITEMS.items():
        im = f(); H.break_checkers(im); H.save_png(im, UI / f"{k}.png")
        j["items"][k] = {"file": f"ui/{k}.png", "size": list(im.size), "slice": sl}
    p.write_text(json.dumps(j, indent=1), encoding="utf-8")


if __name__ == "__main__":
    build(); print(len(ITEMS), "elementow")
