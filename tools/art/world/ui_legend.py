"""UI-4 (v2): interfejs wg LEGENDY STYLU "domek z siana" (docs/STYL_SWIATA.md), nie wg ogolnego "ladnego UI":
- kontur pierwszego planu = outline.fg #3a1d17 (nie wood.0), rogi sciete o 1-2 px,
- cien = krok w dol + przesuniecie w plum, swiatlo = krok w gore ku hay (nigdy "ten sam kolor ciemniejszy"),
- reczna robota: szew z siana, naszywki, tasma kartonowa hay[2], gwozdzie, sek, nieidealna symetria (kazdy rog inny),
- materialy z biblioteki (pkt 5): drewno (deski, jasna krawedz, ciemna szczelina), karton (tasma, brzeg), papier,
  dzianina ("v" scieg), mosiadz (ciemna rama, jasny odblask, nit); max 4-5 tonow na material.
Te same pliki, rozmiary i slice co w ui_a.py/ui_kit.py. Uzycie: python3 tools/art/world/ui_legend.py"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import ui_a as U

UI = U.UI_DIR
O = "outline.fg"


def rnd(w, h, r=1, tone=O):
    """Prostokat z konturem i rogami sciętymi o r px (r=1: 1 px, r=2: 2 px)."""
    im = H.canvas(w, h)
    H.rect(im, 0, 0, w - 1, h - 1, O)
    return im


def round_corners(im, r=1, which="tlrb", y0=0, y1=None):
    w, h = im.size
    y1 = h - 1 if y1 is None else y1
    for (cx, cy, sx, sy, key) in ((0, y0, 1, 1, "t"), (w - 1, y0, -1, 1, "r"), (0, y1, 1, -1, "l"), (w - 1, y1, -1, -1, "b")):
        if key not in "tlrb" or key not in which:
            continue
        im.putpixel((cx, cy), (0, 0, 0, 0))
        if r >= 2:
            im.putpixel((cx + sx, cy), (0, 0, 0, 0)); im.putpixel((cx, cy + sy), (0, 0, 0, 0))
            H.put(im, cx + sx, cy + sy, O)


def nail(im, x, y):
    """Gwozdz mosiezny 2x2: jasny czubek, cien (hay), obok ciemny otwor."""
    H.put(im, x, y, "hay.3"); H.put(im, x + 1, y, "hay.2"); H.put(im, x, y + 1, "hay.1"); H.put(im, x + 1, y + 1, "hay.0")


def knot(im, x, y):
    """Sek w deskach: ciemny owal z jasnym oczkiem."""
    for dx, dy in ((0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1)): H.put(im, x + dx, y + dy, "wood.1")
    H.put(im, x + 1, y, "wood.0"); H.put(im, x + 1, y + 1, "wood.2")


def tape(im, x, y, vertical=False):
    """Pasek tasmy kartonowej hay[2] z ciemniejszym brzegiem, lekko krzywo."""
    pts = [(x + i, y + (1 if i > 3 else 0)) for i in range(6)] if not vertical else [(x + (1 if i > 3 else 0), y + i) for i in range(6)]
    for px, py in pts:
        H.put(im, px, py, "hay.2")
        if vertical: H.put(im, px + 1, py, "hay.1")
        else: H.put(im, px, py + 1, "hay.1")
    H.put(im, pts[0][0], pts[0][1], "hay.3")


def photo_tape(im, cx, cy, sx, sy):
    """Tasma kartonowa przez narozn (jak przyklejone zdjecie): pas po przekatnej, hay[2] z cieniem hay[1] i odblaskiem hay[3]."""
    for i in range(0, 9):
        for j in range(0, 9):
            d = i + j
            if 4 <= d <= 6:
                x, y = cx + sx * i, cy + sy * j
                if 0 <= x < im.width and 0 <= y < im.height:
                    H.put(im, x, y, "hay.3" if d == 4 else ("hay.2" if d == 5 else "hay.1"))


def plank_edge_h(im, x0, x1, y, light=True):
    H.hline(im, x0, x1, y, "wood.3" if light else "wood.1")


def frame_planks(im, n=6):
    """Rama z desek 6 px: kontur, jasna krawedz, deska z nitkami sloju, ciemna dolna krawedz, wewnetrzny kontur."""
    w, h = im.size
    H.rect(im, 0, 0, w - 1, h - 1, O)
    H.rect(im, 1, 1, w - 2, h - 2, "wood.2")
    H.hline(im, 1, w - 2, 1, "wood.3"); H.vline(im, 1, 1, h - 2, "wood.3")
    H.hline(im, 1, w - 2, h - 2, "wood.1"); H.vline(im, w - 2, 1, h - 2, "wood.1")
    for y in (3,): H.hline(im, 2, w - 3, y, "wood.1")                                # szczelina miedzy deskami
    H.hline(im, 2, w - 3, 4, "wood.3") if False else None
    H.rect(im, n, n, w - 1 - n, h - 1 - n, O)


def panel_wood():
    """Skrzynka z desek: gruba rama, wnetrze z cieniem w plum, gwozdzie nierowno, sek, tasma."""
    im = H.canvas(24, 24)
    frame_planks(im)
    H.rect(im, 7, 7, 16, 16, "wood.1")
    H.hline(im, 7, 16, 7, "plum.1"); H.vline(im, 7, 7, 16, "plum.1"); H.hline(im, 7, 16, 16, "wood.2"); H.vline(im, 16, 8, 16, "wood.2")
    nail(im, 2, 1); nail(im, 20, 3); nail(im, 3, 20)
    knot(im, 19, 19)
    photo_tape(im, 0, 0, 1, 1) if False else None
    round_corners(im, 2)
    return im


def panel_paper():
    """Kartka w drewnianej ramie: gruba rama z desek, papier z cieniem pod rama, tasma przez rogi, gwozdz, zagiety rog."""
    im = H.canvas(24, 24)
    frame_planks(im)
    H.rect(im, 7, 7, 16, 16, "linen.3")
    H.hline(im, 7, 16, 7, "linen.1"); H.vline(im, 7, 7, 16, "linen.1")
    photo_tape(im, 0, 0, 1, 1)                                                # tasma przez lewy gorny narozn
    nail(im, 20, 2)                                                           # gwozdz w prawym gornym
    photo_tape(im, 23, 23, -1, -1)                                            # tasma przez prawy dolny
    nail(im, 2, 20)
    round_corners(im, 2)
    return im


def btn(tones, pressed=False, hover=False):
    """Naszywka z filcu/skory: kontur, swiatlo lewa-gora, szew wokol (jasniejszy ton), cien w plum u dolu."""
    lt, base, sh, edge = tones
    w, h = 24, 16; t = 1 if pressed else 0
    im = H.canvas(w, h)
    H.rect(im, 0, t, w - 1, h - 1, O); H.rect(im, 1, t + 1, w - 2, h - 2, base)
    if pressed:
        H.hline(im, 1, w - 2, t + 1, sh); H.vline(im, 1, t + 1, h - 2, sh)
    else:
        H.hline(im, 1, w - 2, 1, lt); H.vline(im, 1, 1, h - 4, lt)
        H.vline(im, w - 2, 2, h - 4, sh); H.hline(im, 1, w - 2, h - 4, sh); H.hline(im, 1, w - 2, h - 3, edge); H.hline(im, 1, w - 2, h - 2, "plum.1")
    sy = t + 3                                                                 # szew: kreska 1 px wewnatrz, jasny ton
    seam = "hay.2" if hover else lt
    for x in range(3, w - 3): H.put(im, x, sy, seam)
    for y in range(sy + 1, h - 5 + t): H.put(im, 3, y, seam); H.put(im, w - 4, y, seam)
    H.hline(im, 3, w - 4, h - 5 + t, seam)
    H.put(im, 4, sy, base); H.put(im, w - 6, sy, base)                         # przerwy w szwie (reczna robota)
    H.put(im, w - 2, 1 + t, "hay.3")                                           # jeden odblask
    round_corners(im, 2, y0=t)
    return im


def tab(on):
    w, h = 20, 14
    im = H.canvas(w, h); top = 0 if on else 1
    H.rect(im, 0, top, w - 1, h - 1, O)
    H.rect(im, 1, top + 1, w - 2, h - 1, "hay.2" if on else "wood.2")
    H.hline(im, 1, w - 2, top + 1, "hay.3" if on else "wood.3"); H.vline(im, 1, top + 1, h - 1, "hay.3" if on else "wood.3")
    H.vline(im, w - 2, top + 2, h - 1, "hay.1" if on else "wood.1")
    if on:
        H.hline(im, 1, w - 2, h - 1, "hay.2")
        for x in range(4, w - 4, 2): H.put(im, x, top + 3, "hay.1")           # szew
    else:
        H.hline(im, 1, w - 2, h - 2, "wood.1"); H.hline(im, 1, w - 2, h - 1, O)
        H.put(im, 3, top + 3, "wood.1"); H.put(im, 4, top + 3, "wood.1")      # sek
    round_corners(im, 1, "tl" , top)
    return im


def close(pressed=False):
    w = 16; t = 1 if pressed else 0
    im = H.canvas(w, w)
    H.rect(im, 0, t, 15, 15, O); H.rect(im, 1, t + 1, 14, 14, "brick.2")
    if not pressed:
        H.hline(im, 1, 14, 1, "brick.3"); H.vline(im, 1, 1, 12, "brick.3")
        H.hline(im, 1, 14, 12, "brick.1"); H.hline(im, 1, 14, 13, "plum.1"); H.vline(im, 14, 2, 12, "brick.1")
    for k in range(7):
        H.put(im, 4 + k, 4 + k + t, "linen.3"); H.put(im, 10 - k, 4 + k + t, "linen.3")            # krzyz z nici
    H.put(im, 4, 4 + t, "hay.2"); H.put(im, 10, 4 + t, "linen.2"); H.put(im, 4, 10 + t, "linen.2"); H.put(im, 10, 10 + t, "hay.2")
    round_corners(im, 1, "tlrb", t)
    return im


def groove():
    """Rowek z ciemnego drewna (plum): cien u gory-lewej, jasna listwa u dolu."""
    im = H.canvas(16, 8)
    H.rect(im, 0, 0, 15, 7, O); H.rect(im, 1, 1, 14, 6, "plum.2")
    H.hline(im, 1, 14, 1, "plum.0"); H.hline(im, 1, 14, 2, "plum.1"); H.hline(im, 1, 14, 6, "plum.3")
    round_corners(im, 1)
    return im


def fill(c):
    """Wypelnienie paska jak dzianina: gorna krawedz jasna, dol w plum, rzad "v" scieg (kafel 4 px powtarzany)."""
    im = H.canvas(4, 6)
    H.rect(im, 0, 0, 3, 5, c[1]); H.hline(im, 0, 3, 0, c[0]); H.hline(im, 0, 3, 5, "plum.1"); H.hline(im, 0, 3, 4, c[2])
    H.put(im, 0, 2, c[0]); H.put(im, 1, 3, c[2]); H.put(im, 2, 3, c[2]); H.put(im, 3, 2, c[0])
    return im


def badge():
    """Metka z papieru z tasma na rogu."""
    im = H.canvas(16, 12)
    H.rect(im, 0, 0, 15, 11, O); H.rect(im, 1, 1, 14, 10, "linen.3")
    H.hline(im, 1, 14, 1, "linen.2"); H.vline(im, 1, 1, 10, "linen.2")
    H.hline(im, 1, 14, 10, "linen.1"); H.vline(im, 14, 2, 10, "linen.1")
    H.put(im, 1, 1, "hay.2"); H.put(im, 2, 1, "hay.2"); H.put(im, 1, 2, "hay.2")
    round_corners(im, 1)
    return im


def field():
    """Pole tekstu: wglebienie w papierze, cien w plum z gory-lewej, szew z siana u dolu."""
    im = H.canvas(16, 14)
    H.rect(im, 0, 0, 15, 13, O); H.rect(im, 1, 1, 14, 12, "linen.3")
    H.hline(im, 1, 14, 1, "plum.3"); H.vline(im, 1, 1, 12, "plum.3"); H.hline(im, 2, 14, 2, "linen.1"); H.vline(im, 2, 2, 12, "linen.1")
    H.hline(im, 1, 14, 12, "linen.2")
    round_corners(im, 1)
    return im


def card():
    """Karta z kartonu: wood.1 rant, papier, tasma hay[2] w lewym gornym rogu, odgiety prawy dolny rog."""
    im = H.canvas(16, 16)
    H.rect(im, 0, 0, 15, 15, O); H.rect(im, 1, 1, 14, 14, "wood.1")
    H.rect(im, 2, 2, 13, 13, "linen.3")
    H.hline(im, 2, 13, 2, "linen.1"); H.vline(im, 2, 2, 13, "linen.1")
    H.hline(im, 2, 13, 13, "linen.2"); H.vline(im, 13, 3, 13, "linen.2")
    H.hline(im, 1, 14, 1, "wood.2"); H.vline(im, 1, 1, 14, "wood.2")
    H.put(im, 2, 2, "hay.2"); H.put(im, 3, 2, "hay.2"); H.put(im, 2, 3, "hay.2"); H.put(im, 1, 1, "hay.3")
    H.put(im, 13, 13, "linen.1"); H.put(im, 12, 13, "linen.1"); H.put(im, 13, 12, "linen.1")
    round_corners(im, 1)
    return im


def tooltip():
    im = H.canvas(16, 16)
    H.rect(im, 0, 0, 15, 15, O); H.rect(im, 1, 1, 14, 14, "plum.2")
    H.hline(im, 1, 14, 1, "plum.3"); H.vline(im, 1, 1, 14, "plum.3"); H.hline(im, 1, 14, 14, "plum.1"); H.vline(im, 14, 2, 14, "plum.1")
    for x in range(3, 13, 2): H.put(im, x, 3, "hay.1")
    round_corners(im, 1)
    return im


def slot(on=False):
    im = H.canvas(20, 20)
    if on:
        H.rect(im, 0, 0, 19, 19, O); H.rect(im, 1, 1, 18, 18, "hay.2"); H.hline(im, 1, 18, 1, "hay.3"); H.vline(im, 1, 1, 18, "hay.3")
        H.hline(im, 1, 18, 18, "hay.1"); H.vline(im, 18, 2, 18, "hay.1")
        H.rect(im, 3, 3, 16, 16, O); H.rect(im, 4, 4, 15, 15, "linen.3")
        H.hline(im, 4, 15, 4, "linen.1"); H.vline(im, 4, 4, 15, "linen.1")
        tape(im, 14, 1)
    else:
        H.rect(im, 0, 0, 19, 19, O); H.rect(im, 1, 1, 18, 18, "wood.2"); H.hline(im, 1, 18, 18, "wood.3"); H.vline(im, 18, 1, 18, "wood.3")
        H.rect(im, 3, 3, 16, 16, "wood.1"); H.hline(im, 2, 17, 2, "plum.1"); H.vline(im, 2, 2, 17, "plum.1")
        H.hline(im, 3, 16, 3, "plum.1"); H.vline(im, 3, 3, 16, "plum.1")
        H.hline(im, 3, 16, 16, "wood.2"); H.vline(im, 16, 4, 16, "wood.2")
        knot(im, 5, 14)
    round_corners(im, 1)
    return im


def toggle(on):
    im = H.canvas(24, 12)
    H.rect(im, 0, 0, 23, 11, O); H.rect(im, 1, 1, 22, 10, "moss.2" if on else "plum.2")
    H.hline(im, 1, 22, 1, "moss.1" if on else "plum.1"); H.hline(im, 1, 22, 10, "moss.3" if on else "plum.3")
    kx = 13 if on else 2
    H.rect(im, kx, 2, kx + 8, 9, O); H.rect(im, kx + 1, 3, kx + 7, 8, "hay.2")
    H.hline(im, kx + 1, kx + 7, 3, "hay.3"); H.vline(im, kx + 1, 3, 8, "hay.3"); H.hline(im, kx + 1, kx + 7, 8, "hay.1")
    H.put(im, kx + 4, 5, "hay.0"); H.put(im, kx + 5, 5, "hay.0")                  # nit
    round_corners(im, 1)
    return im


def bar_wood():
    """Belka okna: deska z jasna krawedzia, szczelina, dwa gwozdzie (nierowno), sek."""
    im = H.canvas(16, 16)
    H.rect(im, 0, 0, 15, 15, O); H.rect(im, 1, 1, 14, 14, "wood.2")
    H.hline(im, 1, 14, 1, "wood.3"); H.vline(im, 1, 1, 14, "wood.3"); H.hline(im, 1, 14, 2, "wood.3")
    H.hline(im, 1, 14, 13, "wood.1"); H.hline(im, 1, 14, 14, "wood.1"); H.vline(im, 14, 2, 14, "wood.1")
    H.hline(im, 2, 14, 12, "plum.1")
    nail(im, 2, 2); nail(im, 12, 1)
    round_corners(im, 1)
    return im


def dot(full):
    im = H.canvas(8, 8)
    H.rect(im, 0, 0, 7, 7, O); H.rect(im, 1, 1, 6, 6, "moss.3" if full else "linen.2")
    if full:
        H.hline(im, 1, 5, 1, "moss.4"); H.vline(im, 1, 1, 5, "moss.4"); H.hline(im, 2, 6, 6, "moss.2"); H.put(im, 3, 3, "hay.3")
    else:
        H.hline(im, 1, 6, 1, "linen.1"); H.vline(im, 1, 1, 6, "linen.1")
    round_corners(im, 1)
    return im


def sep_h():
    """Szew z siana miedzy dwoma liniami: powtarzalny co 4 px."""
    im = H.canvas(32, 4)
    H.hline(im, 0, 31, 0, O); H.hline(im, 0, 31, 3, "plum.1")
    for x in range(32): H.put(im, x, 1, "hay.2" if x % 4 < 2 else "hay.1")
    for x in range(32): H.put(im, x, 2, "wood.2")
    return im


def sep_v():
    im = H.canvas(4, 32)
    H.vline(im, 0, 0, 31, O); H.vline(im, 3, 0, 31, "plum.1")
    for y in range(32): H.put(im, 1, y, "hay.2" if y % 4 < 2 else "hay.1")
    for y in range(32): H.put(im, 2, y, "wood.2")
    return im


def header_banner():
    """Szyld na linach: deska z gwozdziami (nierowno), konce z petla ze sznurka."""
    w, h = 96, 24
    im = H.canvas(w, h)
    H.rect(im, 0, 3, w - 1, h - 4, O); H.rect(im, 1, 4, w - 2, h - 5, "wood.2")
    H.hline(im, 1, w - 2, 4, "wood.3"); H.hline(im, 1, w - 2, 5, "wood.3"); H.hline(im, 1, w - 2, h - 6, "wood.1"); H.hline(im, 1, w - 2, h - 5, "plum.1")
    for x in range(14, w - 14, 4): H.hline(im, x, x + 1, 8, "hay.2"); H.hline(im, x, x + 1, h - 9, "hay.2")    # szew z siana
    for x, y in ((3, 8), (w - 6, 10)): nail(im, x, y)                          # gwozdzie, nierowno
    for x in (0, w - 1):
        for y in (3, h - 4): im.putpixel((x, y), (0, 0, 0, 0))
    for sx in (5, w - 6):                                                       # petle sznurka u gory
        for dy, dx in ((2, 0), (1, 1), (0, 2), (0, 3), (1, 4), (2, 5)): H.put(im, sx - 2 + dx, dy, "hay.2" if dx % 2 else "hay.1")
    return im


ITEMS = {
    "panel_wood": (panel_wood, [8] * 4), "panel_paper": (panel_paper, [8] * 4), "header_banner": (header_banner, [12, 0, 12, 0]),
    "sep_h": (sep_h, [0] * 4), "sep_v": (sep_v, [0] * 4),
    "btn_normal": (lambda: btn(("hay.3", "hay.2", "hay.1", "hay.0")), [6] * 4),
    "btn_hover": (lambda: btn(("linen.3", "hay.3", "hay.2", "hay.0"), hover=True), [6] * 4),
    "btn_pressed": (lambda: btn(("hay.1", "hay.1", "hay.0", "hay.0"), True), [6] * 4),
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
