"""UI-3: przerobione ikony menu wg legendy (material, 3 tony, odblask z lewej gory, drobny detal reczny).
Podmienia istniejace sloty w icons_16.png (indeksy i CSS bez zmian). Uzycie: python3 tools/art/world/icons_ui2.py [--apply]"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H
import icons_a as A
from PIL import Image
P = H.put


def mk(fn):
    im = H.canvas(16, 16); fn(im); H.break_checkers(im); return H.outline(im)


def sph(im, cx, cy, r, ramp):
    for y in range(16):
        for x in range(16):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                s = -((x - cx) + (y - cy)) / (r * 1.4)
                P(im, x, y, ramp[2] if s > .6 else ramp[1] if s > -.3 else ramp[0])


def line(im, x0, y0, x1, y1, c):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1): P(im, round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)


def m_more(im):  # drewniana tabliczka na sznurku, trzy mosiezne gałki
    line(im, 3, 4, 7, 1, "hay.2"); line(im, 12, 4, 8, 1, "hay.2"); P(im, 7, 0, "hay.3"); P(im, 8, 0, "hay.3"); P(im, 7, 1, "hay.3"); P(im, 8, 1, "hay.3")
    H.rect(im, 1, 4, 14, 13, "wood.2"); H.hline(im, 1, 14, 4, "wood.3"); H.vline(im, 1, 4, 13, "wood.3")
    H.hline(im, 1, 14, 13, "wood.1"); H.vline(im, 14, 4, 13, "wood.1")
    for x, y, c in ((3, 6, "wood.1"), (4, 6, "wood.1"), (9, 11, "wood.1"), (10, 11, "wood.1"), (12, 6, "wood.1")): P(im, x, y, c)
    for x in (4, 7, 10): H.rect(im, x, 7, x + 1, 8, "hay.3"); P(im, x, 7, "hay.3"); P(im, x + 1, 9, "hay.1"); P(im, x, 9, "hay.1"); P(im, x + 1, 8, "hay.2")
    for x, y in ((2, 5), (13, 5), (2, 12), (13, 12)): P(im, x, y, "hay.3")


def m_call(im):  # babelek z sercem-nosem
    H.rect(im, 1, 2, 14, 10, "linen.3"); H.hline(im, 1, 14, 10, "linen.1"); H.vline(im, 14, 2, 10, "linen.2")
    for x, y in ((1, 2), (14, 2), (1, 10), (14, 10)): im.putpixel((x, y), (0, 0, 0, 0))
    H.rect(im, 3, 11, 6, 13, "linen.3"); P(im, 3, 13, "linen.1"); P(im, 4, 12, "linen.2"); H.hline(im, 3, 4, 13, "linen.1")
    for x, y in ((4, 4), (5, 4), (9, 4), (10, 4)): P(im, x, y, "rose.1")
    H.rect(im, 4, 5, 10, 6, "rose.1"); H.rect(im, 5, 7, 9, 7, "rose.1"); H.rect(im, 6, 8, 8, 8, "rose.0"); P(im, 7, 9, "rose.0")
    P(im, 5, 4, "rose.2"); P(im, 4, 5, "rose.2"); P(im, 9, 7, "rose.0"); P(im, 10, 6, "rose.0")
    for x, y in ((12, 4), (13, 6), (12, 8)): P(im, x, y, "hay.2")


def m_clean(im):  # gabka z dziurkami i banki z odblaskami
    H.rect(im, 2, 8, 10, 13, "hay.2"); H.hline(im, 2, 10, 8, "hay.3"); H.vline(im, 2, 8, 13, "hay.3"); H.hline(im, 2, 10, 13, "hay.1"); H.vline(im, 10, 8, 13, "hay.1")
    for x, y in ((4, 10), (7, 11), (5, 12), (8, 9)): P(im, x, y, "hay.0"); P(im, x + 1, y, "hay.1")
    H.rect(im, 3, 6, 9, 7, "moss.3"); H.hline(im, 3, 9, 6, "moss.4"); H.hline(im, 3, 9, 7, "moss.2")    # zielona szorstka warstwa
    for cx, cy, r in ((12, 4, 2.6), (6, 3, 1.8), (13, 10, 1.8)):
        sph(im, cx, cy, r, ("dusk.3", "dusk.4", "linen.3")); 
    P(im, 11, 3, "linen.3"); P(im, 5, 2, "linen.3"); P(im, 12, 9, "linen.3")


def m_games(im):  # klebek welny z nitka
    sph(im, 7, 7, 5.6, ("rose.0", "rose.1", "rose.2"))
    for x, y in ((3, 8), (4, 9), (5, 10), (6, 10), (4, 5), (5, 4), (7, 4), (8, 5), (9, 6), (10, 8), (9, 10), (7, 11)): P(im, x, y, "rose.0")
    for x, y in ((5, 5), (6, 6), (7, 7), (8, 8), (9, 9)): P(im, x, y, "rose.2")
    for x, y in ((10, 11), (11, 12), (12, 12), (13, 13), (14, 12), (14, 11)): P(im, x, y, "rose.1")
    P(im, 12, 11, "hay.3"); P(im, 13, 11, "hay.2")


def x_close(im):  # dwa skrzyzowane patyki z wiazaniem
    for i in range(11):
        for dx in (0, 1): P(im, 2 + i + dx, 2 + i, "wood.2"); P(im, 13 - i - dx, 2 + i, "wood.2")
        P(im, 2 + i, 2 + i, "wood.3"); P(im, 13 - i, 2 + i, "wood.3"); P(im, 3 + i, 2 + i, "wood.1") if i > 5 else None
    P(im, 12, 11, "wood.1"); P(im, 11, 12, "wood.1")
    H.rect(im, 6, 6, 9, 9, "hay.2"); H.hline(im, 6, 9, 6, "hay.3"); H.hline(im, 6, 9, 9, "hay.1"); P(im, 7, 7, "hay.3"); P(im, 8, 8, "hay.1")


def x_plus(im):
    H.rect(im, 6, 2, 9, 13, "moss.3"); H.rect(im, 2, 6, 13, 9, "moss.3")
    H.vline(im, 6, 2, 13, "moss.4"); H.hline(im, 2, 13, 6, "moss.4"); H.vline(im, 9, 7, 13, "moss.2"); H.hline(im, 7, 13, 9, "moss.2")
    H.vline(im, 9, 2, 5, "moss.2"); H.hline(im, 2, 5, 9, "moss.2"); P(im, 7, 7, "hay.3"); P(im, 8, 8, "hay.2"); P(im, 7, 8, "hay.2"); P(im, 8, 7, "hay.2")


def x_minus(im):
    H.rect(im, 2, 5, 13, 10, "brick.2"); H.hline(im, 2, 13, 5, "brick.3"); H.vline(im, 2, 5, 10, "brick.3"); H.hline(im, 2, 13, 10, "brick.1"); H.vline(im, 13, 5, 10, "brick.1")
    for x in (4, 7, 10): P(im, x, 7, "brick.1"); P(im, x + 1, 8, "brick.3")
    P(im, 3, 6, "hay.3"); P(im, 12, 6, "hay.3"); P(im, 3, 9, "hay.1"); P(im, 12, 9, "hay.1")


def x_menu(im):
    for y0 in (2, 6, 10):
        H.rect(im, 2, y0, 13, y0 + 2, "wood.2"); H.hline(im, 2, 13, y0, "wood.3"); H.hline(im, 2, 13, y0 + 2, "wood.1")
        P(im, 3, y0 + 1, "hay.3"); P(im, 12, y0 + 1, "hay.3"); H.hline(im, 6, 9, y0 + 1, "wood.1" if y0 == 6 else "wood.2")


def chev_base(im):
    for yy in range(2, 14):
        o = (yy - 2) if yy <= 7 else (13 - yy)
        P(im, 3 + o, yy, "wood.3" if yy <= 7 else "wood.2"); P(im, 4 + o, yy, "wood.2"); P(im, 5 + o, yy, "wood.2" if yy <= 7 else "wood.1")


def rot(fn, k):
    def f(im):
        t = H.canvas(16, 16); fn(t); t = t.rotate(k)
        im.alpha_composite(t)
    return f


NEW = {"m_more": m_more, "m_call": m_call, "m_clean": m_clean, "m_games": m_games, "x_close": x_close, "x_plus": x_plus, "x_minus": x_minus,
       "x_menu": x_menu, "x_chevron_right": chev_base, "x_chevron_up": rot(chev_base, 90), "x_chevron_down": rot(chev_base, 270)}

if __name__ == "__main__":
    j = json.loads(A.JSON.read_text(encoding="utf-8"))["icons"]
    base = Image.open(A.SHEET).convert("RGBA")
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    sh = Image.new("RGBA", (18 * len(NEW), 38), (120, 110, 100, 255))
    for k, (i, fn) in enumerate(NEW.items()):
        im = mk(fn); sh.alpha_composite(base.crop((j[i] * 16, 0, j[i] * 16 + 16, 16)), (18 * k + 1, 1)); sh.alpha_composite(im, (18 * k + 1, 20))
        if "--apply" in sys.argv:
            base.paste((0, 0, 0, 0), (j[i] * 16, 0, j[i] * 16 + 16, 16)); base.alpha_composite(im, (j[i] * 16, 0))
    sh.resize((sh.width * 5, sh.height * 5), Image.NEAREST).save(S / "iu2.png")
    if "--apply" in sys.argv: H.save_png(base, A.SHEET, indexed=False); print("podmieniono", len(NEW))
