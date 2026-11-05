"""UI-1: zestaw interfejsu "papier i drewno" - dodatkowe elementy 9-slice do assets/ui/ (obok ui_a.py).
Uzycie: python3 tools/art/world/ui_kit.py -> pliki PNG + dopisane wpisy w assets/ui/ui.json + assets/ui/ui_tokens.css"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import ui_a as U

UI = U.UI_DIR
CORNER = "plum.1"


def cut(im, w, h, top=0, bot=None):
    bot = h - 1 if bot is None else bot
    for x, y in ((0, top), (w - 1, top), (0, bot), (w - 1, bot)): H.put(im, x, y, CORNER)


def btn(tones, pressed=False):
    """Przycisk 24x16 w kolorze akcji: tones = (swiatlo, baza, cien, krawedz dolna)."""
    lt, base, sh, edge = tones
    w, h = 24, 16
    im = H.canvas(w, h); top = 1 if pressed else 0
    H.rect(im, 0, top, w - 1, h - 1, "wood.0"); H.rect(im, 1, top + 1, w - 2, h - 2, base)
    if pressed:
        H.hline(im, 1, w - 2, top + 1, sh)
    else:
        H.hline(im, 2, w - 3, 1, lt); H.vline(im, 1, 2, h - 4, lt); H.hline(im, 1, w - 2, h - 3, sh); H.hline(im, 1, w - 2, h - 2, edge)
    cut(im, w, h, top)
    return im


def tab(on):
    w, h = 20, 14
    im = H.canvas(w, h)
    top = 1 if not on else 0
    H.rect(im, 0, top, w - 1, h - 1, "wood.0")
    H.rect(im, 1, top + 1, w - 2, h - 1, "hay.2" if on else "wood.2")
    H.hline(im, 2, w - 3, top + 1, "hay.3" if on else "wood.3")
    if on: H.hline(im, 1, w - 2, h - 1, "hay.2")                # zlewa sie z panelem pod spodem
    else: H.hline(im, 1, w - 2, h - 1, "wood.0")
    for x in (0, w - 1): H.put(im, x, top, CORNER)
    return im


def close(pressed=False):
    w = 16
    im = H.canvas(w, w); top = 1 if pressed else 0
    H.rect(im, 0, top, 15, 15, "wood.0"); H.rect(im, 1, top + 1, 14, 14, "brick.2")
    if not pressed: H.hline(im, 2, 13, 1, "brick.3"); H.vline(im, 1, 2, 12, "brick.3"); H.hline(im, 1, 14, 13, "brick.1")
    for k in range(7): H.put(im, 4 + k, 4 + k + top, "linen.3"); H.put(im, 10 - k, 4 + k + top, "linen.3")
    cut(im, w, w, top, 15)
    return im


def groove():
    im = H.canvas(16, 8)
    H.rect(im, 0, 0, 15, 7, "wood.0"); H.rect(im, 1, 1, 14, 6, "plum.2"); H.hline(im, 1, 14, 1, "plum.1")
    cut(im, 16, 8)
    return im


def fill(c):
    im = H.canvas(4, 6)
    H.rect(im, 0, 0, 3, 5, c[1]); H.hline(im, 0, 3, 0, c[0]); H.hline(im, 0, 3, 5, c[2])
    return im


def badge():
    im = H.canvas(16, 12)
    H.rect(im, 0, 0, 15, 11, "wood.0"); H.rect(im, 1, 1, 14, 10, "linen.2"); H.hline(im, 2, 13, 1, "linen.3"); H.hline(im, 1, 14, 10, "linen.1")
    cut(im, 16, 12)
    return im


def field():
    im = H.canvas(16, 14)
    H.rect(im, 0, 0, 15, 13, "wood.0"); H.rect(im, 1, 1, 14, 12, "linen.3"); H.hline(im, 1, 14, 1, "linen.1"); H.vline(im, 1, 1, 12, "linen.1")
    cut(im, 16, 14)
    return im


def card():
    """Karta wewnatrz panelu (potrzeby, gry, sklep): papier z cienkim drewnianym brzegiem."""
    im = H.canvas(16, 16)
    H.rect(im, 0, 0, 15, 15, "wood.1"); H.rect(im, 1, 1, 14, 14, "linen.3"); H.hline(im, 1, 14, 14, "linen.1"); H.vline(im, 14, 1, 14, "linen.2")
    cut(im, 16, 16)
    return im


def tooltip():
    im = H.canvas(16, 16)
    H.rect(im, 0, 0, 15, 15, "plum.0"); H.rect(im, 1, 1, 14, 14, "plum.2"); H.hline(im, 1, 14, 1, "plum.3")
    cut(im, 16, 16, 0, 15)
    return im


def slot(on=False):
    im = H.canvas(20, 20)
    H.rect(im, 0, 0, 19, 19, "hay.1" if on else "wood.0"); H.rect(im, 1, 1, 18, 18, "hay.3" if on else "wood.1")
    H.rect(im, 2, 2, 17, 17, "linen.3" if on else "wood.2"); H.hline(im, 2, 17, 2, "linen.2" if on else "wood.1"); H.vline(im, 2, 2, 17, "linen.2" if on else "wood.1")
    cut(im, 20, 20, 0, 19)
    return im


def toggle(on):
    im = H.canvas(24, 12)
    H.rect(im, 0, 0, 23, 11, "wood.0"); H.rect(im, 1, 1, 22, 10, "moss.3" if on else "plum.2")
    kx = 13 if on else 2
    H.rect(im, kx, 2, kx + 7, 9, "linen.2"); H.hline(im, kx, kx + 7, 2, "linen.3"); H.hline(im, kx, kx + 7, 9, "linen.1")
    cut(im, 24, 12)
    return im


def bar_wood():
    """Naglowek okna/modala: gladkie drewno bez slojow (tekst musi byc czytelny)."""
    im = H.canvas(16, 16)
    H.rect(im, 0, 0, 15, 15, "wood.0"); H.rect(im, 1, 1, 14, 14, "wood.1"); H.hline(im, 1, 14, 1, "wood.2"); H.vline(im, 1, 1, 14, "wood.2")
    H.hline(im, 1, 14, 14, "wood.0")
    cut(im, 16, 16)
    return im


def dot(full):
    im = H.canvas(8, 8)
    H.rect(im, 0, 0, 7, 7, "wood.0"); H.rect(im, 1, 1, 6, 6, "moss.3" if full else "linen.2")
    if full: H.hline(im, 1, 6, 1, "moss.4")
    cut(im, 8, 8)
    return im


GREEN = ("moss.4", "moss.3", "moss.2", "moss.1"); BLUE = ("dusk.4", "dusk.3", "dusk.2", "dusk.1")
ROSE = ("rose.2", "rose.1", "rose.0", "berry.1"); RED = ("brick.3", "brick.2", "brick.1", "brick.0")
ITEMS = {
    "btn_green": (lambda: btn(GREEN), [6] * 4), "btn_green_pressed": (lambda: btn(GREEN, True), [6] * 4),
    "btn_blue": (lambda: btn(BLUE), [6] * 4), "btn_blue_pressed": (lambda: btn(BLUE, True), [6] * 4),
    "btn_rose": (lambda: btn(ROSE), [6] * 4), "btn_rose_pressed": (lambda: btn(ROSE, True), [6] * 4),
    "btn_red": (lambda: btn(RED), [6] * 4), "btn_red_pressed": (lambda: btn(RED, True), [6] * 4),
    "tab_off": (lambda: tab(False), [5, 5, 5, 0]), "tab_on": (lambda: tab(True), [5, 5, 5, 0]),
    "close_btn": (lambda: close(), [5] * 4), "close_btn_pressed": (lambda: close(True), [5] * 4),
    "bar_groove": (groove, [3] * 4), "bar_fill_high": (lambda: fill(("moss.4", "moss.3", "moss.2")), [0] * 4),
    "bar_fill_mid": (lambda: fill(("hay.3", "hay.2", "hay.1")), [0] * 4), "bar_fill_low": (lambda: fill(("rose.2", "brick.2", "brick.1")), [0] * 4),
    "badge": (badge, [4] * 4), "field": (field, [4] * 4), "card": (card, [5] * 4), "tooltip": (tooltip, [5] * 4),
    "slot": (lambda: slot(), [6] * 4), "slot_on": (lambda: slot(True), [6] * 4),
    "toggle_off": (lambda: toggle(False), [0] * 4), "toggle_on": (lambda: toggle(True), [0] * 4),
    "bar_wood": (bar_wood, [5] * 4),
    "dot_empty": (lambda: dot(False), [0] * 4), "dot_full": (lambda: dot(True), [0] * 4),
}


def build():
    p = UI / "ui.json"; j = json.loads(p.read_text())
    for k, (f, sl) in ITEMS.items():
        im = f(); H.break_checkers(im); H.save_png(im, UI / f"{k}.png")
        j["items"][k] = {"file": f"ui/{k}.png", "size": list(im.size), "slice": sl}
    p.write_text(json.dumps(j, indent=1), encoding="utf-8")


if __name__ == "__main__":
    build(); print(len(ITEMS), "elementow")
