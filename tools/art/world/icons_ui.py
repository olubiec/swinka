"""UI-2: ikony menu i interfejsu 16x16 (akcje, funkcje, systemowe). Dopisywane na koniec icons_16.png.
Uzycie: python3 tools/art/world/icons_ui.py [--apply]  (bez --apply tylko podglad w scratchpadzie)"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H
import icons_a as A
from PIL import Image

P = H.put


def disc(im, cx, cy, r, c):
    for y in range(16):
        for x in range(16):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * .6: P(im, x, y, c)


def ring(im, cx, cy, r, c):
    for y in range(16):
        for x in range(16):
            d = (x - cx) ** 2 + (y - cy) ** 2
            if r * r - r * 1.4 <= d <= r * r + r * .8: P(im, x, y, c)


def mk(fn):
    im = H.canvas(16, 16); fn(im); H.break_checkers(im); return H.outline(im)


def m_feed(im):
    H.rect(im, 1, 9, 14, 9, "wood.3"); H.rect(im, 2, 10, 13, 12, "wood.2"); H.rect(im, 4, 13, 11, 13, "wood.1"); H.hline(im, 2, 13, 10, "wood.3")
    for x in range(3, 13): H.put(im, x, 8 - (x * 7) % 3, "hay.2"); H.put(im, x, 7 - (x * 5) % 3, "hay.3" if x % 2 else "hay.1")
    H.rect(im, 4, 6, 11, 8, "hay.2"); H.vline(im, 6, 4, 6, "hay.3"); H.vline(im, 9, 3, 6, "hay.2"); P(im, 11, 4, "moss.3"); P(im, 12, 3, "moss.3"); P(im, 12, 4, "moss.2")


def m_clean(im):
    H.rect(im, 2, 8, 9, 13, "hay.2"); H.hline(im, 2, 9, 8, "hay.3"); H.hline(im, 2, 9, 13, "hay.1")
    for x, y in ((4, 10), (7, 11), (5, 12)): P(im, x, y, "hay.1")
    ring(im, 11, 4, 2, "dusk.4"); P(im, 10, 3, "linen.3"); ring(im, 5, 4, 1, "dusk.3"); ring(im, 13, 10, 1, "dusk.4"); P(im, 8, 2, "linen.3")


def m_call(im):
    H.rect(im, 1, 2, 14, 9, "linen.3"); H.hline(im, 1, 14, 9, "linen.1"); H.rect(im, 3, 10, 5, 12, "linen.3"); P(im, 3, 12, "linen.1")
    for x, y in ((5, 4), (6, 4), (9, 4), (10, 4), (7, 5), (8, 5), (7, 6), (8, 6)): pass
    H.rect(im, 4, 4, 6, 5, "rose.1"); H.rect(im, 8, 4, 10, 5, "rose.1"); H.rect(im, 5, 6, 9, 6, "rose.1"); H.rect(im, 6, 7, 8, 7, "rose.1"); P(im, 7, 8, "rose.1")
    P(im, 12, 4, "hay.2"); P(im, 13, 6, "hay.2")


def m_more(im):
    H.rect(im, 1, 3, 14, 12, "wood.2"); H.hline(im, 1, 14, 3, "wood.3"); H.hline(im, 1, 14, 12, "wood.1")
    for x in (4, 7, 10): H.rect(im, x, 7, x + 1, 8, "linen.3")


def m_tricks(im):
    for x in (2, 12): H.rect(im, x, 7, x + 1, 13, "wood.2"); H.vline(im, x, 7, 13, "wood.3")
    H.rect(im, 2, 8, 13, 9, "hay.2"); H.hline(im, 2, 13, 8, "hay.3"); H.rect(im, 5, 8, 6, 9, "brick.2"); H.rect(im, 9, 8, 10, 9, "brick.2")
    H.hline(im, 1, 14, 14, "moss.2")
    H.rect(im, 7, 1, 8, 5, "flame.3"); H.rect(im, 5, 2, 10, 3, "flame.3"); P(im, 6, 4, "flame.3"); P(im, 9, 4, "flame.3")


def m_diary(im):
    H.rect(im, 2, 2, 11, 13, "brick.2"); H.vline(im, 2, 2, 13, "brick.3"); H.rect(im, 4, 3, 11, 12, "linen.3"); H.hline(im, 4, 11, 12, "linen.1")
    for y in (5, 7, 9): H.hline(im, 5, 9, y, "linen.0")
    H.vline(im, 3, 2, 13, "brick.1")
    for k in range(6): P(im, 14 - k, 4 + k, "wood.3"); P(im, 13 - k, 4 + k, "hay.2")
    P(im, 8, 10, "wood.0")


def m_games(im):
    H.rect(im, 1, 5, 14, 11, "dusk.2"); H.rect(im, 2, 4, 13, 4, "dusk.2"); H.rect(im, 2, 12, 5, 13, "dusk.2"); H.rect(im, 10, 12, 13, 13, "dusk.2")
    H.hline(im, 2, 13, 4, "dusk.3"); H.hline(im, 1, 14, 5, "dusk.3"); H.hline(im, 1, 14, 11, "dusk.1")
    H.rect(im, 3, 7, 6, 8, "linen.3"); H.rect(im, 4, 6, 5, 9, "linen.3")
    P(im, 10, 6, "brick.3"); P(im, 12, 8, "moss.4"); P(im, 11, 9, "hay.3"); P(im, 9, 8, "rose.1")


def x_close(im):
    for k in range(9): H.rect(im, 3 + k, 3 + k, 4 + k, 4 + k, "brick.2"); H.rect(im, 11 - k, 3 + k, 12 - k, 4 + k, "brick.2")


def x_plus(im): H.rect(im, 6, 2, 9, 13, "moss.3"); H.rect(im, 2, 6, 13, 9, "moss.3"); H.vline(im, 6, 2, 13, "moss.4"); H.hline(im, 2, 13, 6, "moss.4")
def x_minus(im): H.rect(im, 2, 6, 13, 9, "brick.2"); H.hline(im, 2, 13, 6, "brick.3")


def x_info(im):
    disc(im, 7.5, 7.5, 6, "dusk.3"); H.rect(im, 7, 6, 8, 11, "linen.3"); H.rect(im, 7, 3, 8, 4, "linen.3")


def x_help(im):
    disc(im, 7.5, 7.5, 6, "hay.2"); c = "wood.0"
    for x, y in ((6, 4), (7, 3), (8, 3), (9, 4), (9, 5), (8, 6), (7, 7), (7, 8), (7, 10)): P(im, x, y, c)


def x_search(im):
    ring(im, 6, 6, 4, "wood.2"); disc(im, 6, 6, 3, "dusk.4")
    for k in range(5): H.rect(im, 9 + k, 9 + k, 10 + k, 10 + k, "wood.2")


def x_timer(im):
    disc(im, 7.5, 8.5, 6, "linen.2"); ring(im, 7.5, 8.5, 6, "wood.2"); H.rect(im, 6, 1, 9, 2, "wood.2")
    H.vline(im, 7, 5, 8, "wood.0"); H.hline(im, 7, 10, 8, "wood.0")


def x_bell(im):
    H.rect(im, 5, 3, 10, 4, "hay.2"); H.rect(im, 4, 5, 11, 10, "hay.2"); H.rect(im, 2, 11, 13, 12, "hay.2"); H.vline(im, 5, 5, 10, "hay.3"); H.vline(im, 10, 5, 11, "hay.1")
    H.rect(im, 7, 1, 8, 2, "hay.1"); H.rect(im, 6, 13, 9, 14, "wood.2")


def x_menu(im):
    for y in (3, 7, 11): H.rect(im, 2, y, 13, y + 1, "wood.3"); H.hline(im, 2, 13, y, "wood.4")


def chev(im, d):
    pts = {"r": [(5 + min(k, 6 - k), 2 + k) for k in range(7)], }
    for k in range(7):
        o = min(k, 6 - k)
        a = {"r": (4 + o * 1, 3 + k), "u": (3 + k, 9 - o), "d": (3 + k, 4 + o)}[d]
        H.rect(im, a[0] + (2 if d == "r" else 0), a[1] + (0 if d == "r" else 0), a[0] + 2 + (2 if d == "r" else 0), a[1] + (0 if d == "r" else 1), "hay.2") if False else None
    for k in range(7):
        o = min(k, 6 - k)
        if d == "r": H.rect(im, 4 + o, 3 + k, 6 + o, 3 + k, "hay.2")
        if d == "u": H.rect(im, 3 + k, 8 - o, 3 + k, 10 - o, "hay.2"); 
        if d == "d": H.rect(im, 3 + k, 4 + o, 3 + k, 6 + o, "hay.2")


def x_filter(im):
    H.rect(im, 1, 2, 14, 4, "dusk.3"); H.rect(im, 4, 5, 11, 6, "dusk.3"); H.rect(im, 6, 7, 9, 13, "dusk.2"); H.hline(im, 1, 14, 2, "dusk.4")


def x_star_empty(im):
    rows = ["......XX......", ".....X..X.....", ".....X..X.....", "XXXXXX..XXXXXX", "X............X", ".X..........X.", "..X........X..", "..X..XXXX..X..", ".X..XX..XX..X.", ".X.XX....XX.X.", "XXXX......XXXX"]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == "X": P(im, x + 1, y + 2, "linen.1")


def x_music_off(im):
    H.rect(im, 5, 2, 6, 10, "plum.3"); H.rect(im, 5, 2, 11, 3, "plum.3"); H.rect(im, 3, 9, 6, 12, "plum.3"); H.rect(im, 9, 7, 12, 10, "plum.3")
    for k in range(10): P(im, 2 + k, 13 - k, "brick.2"); P(im, 3 + k, 13 - k, "brick.2")


def x_dot_full(im): disc(im, 7.5, 7.5, 4, "moss.3"); P(im, 6, 5, "moss.4")


NEW = {"m_feed": m_feed, "m_clean": m_clean, "m_call": m_call, "m_more": m_more, "m_games": m_games, "m_tricks": m_tricks, "m_diary": m_diary,
       "x_close": x_close, "x_plus": x_plus, "x_minus": x_minus, "x_info": x_info, "x_help": x_help, "x_search": x_search,
       "x_timer": x_timer, "x_bell": x_bell, "x_menu": x_menu, "x_chevron_right": lambda im: chev(im, "r"),
       "x_chevron_up": lambda im: chev(im, "u"), "x_chevron_down": lambda im: chev(im, "d"), "x_filter": x_filter,
       "x_star_empty": x_star_empty, "x_music_off": x_music_off, "x_dot_full": x_dot_full}

if __name__ == "__main__":
    j = json.loads(A.JSON.read_text(encoding="utf-8"))
    base = Image.open(A.SHEET).convert("RGBA"); n0 = base.width // 16
    ids = [i for i in NEW if i not in j["icons"]]
    ims = [mk(NEW[i]) for i in ids]
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sh = Image.new("RGBA", (18 * len(ims), 18), (120, 110, 100, 255))
    for k, im in enumerate(ims): sh.alpha_composite(im, (18 * k + 1, 1))
    sh.resize((sh.width * 5, sh.height * 5), Image.NEAREST).save(S / "iu.png")
    if "--apply" in sys.argv:
        full = Image.new("RGBA", (16 * (n0 + len(ids)), 16), (0, 0, 0, 0)); full.alpha_composite(base); css = []
        for k, (i, im) in enumerate(zip(ids, ims)):
            full.alpha_composite(im, (16 * (n0 + k), 0)); j["icons"][i] = n0 + k; css.append(f".icon-{i.replace('_', '-')} {{ --i: {n0 + k}; }}")
        H.save_png(full, A.SHEET, indexed=False)
        A.JSON.write_text(json.dumps(j, indent=1, ensure_ascii=False), encoding="utf-8")
        old = (H.ROOT / "docs/icons_css_block.css")
        txt = old.read_text(encoding="utf-8").splitlines()
        txt[0] = f"/* C2/C3/UI-2: --icon-count = {n0 + len(ids)} */"
        old.write_text("\n".join(txt + css) + "\n", encoding="utf-8")
        print(len(ids), "nowych, arkusz", n0 + len(ids))
