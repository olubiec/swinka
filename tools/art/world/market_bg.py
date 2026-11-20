"""B8-3: tlo targu 256x144, wieczor: sznur lampek, stragany, bruk. Swiat w dziennych kolorach + light.py, zrodla po swietle."""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import light
from PIL import Image
from garden import blob
from garden_bg import SKY, _break

W, HT, HORIZON = 256, 144, 56
STALLS = [("stall_basic", 14, HORIZON + 22), ("stall_big", 96, HORIZON + 24), ("stall_basic", 190, HORIZON + 22)]
BULBS = [(x, HORIZON + 8 + int(5 * math.sin((x % 64) / 64 * math.pi))) for x in range(8, 250, 16)]


def _img(rel):
    return Image.open(H.WORLD_DIR / rel).convert("RGBA")


def sky():
    bands = SKY["evening"]; rj = random.Random(5); n = len(bands)
    im = H.canvas(W, HORIZON + 8)
    for y in range(im.height):
        t = min(y / (HORIZON + 4), 1) * (n - 1); i, f = int(t), t - int(t)
        for x in range(W):
            k = min(n - 1, i + (1 if f > light.BAYER[y % 4, x % 4] + 0.5 + rj.uniform(-.18, .18) else 0))
            H.put(im, x, y, bands[k])
    _break(im)
    blob(im, 220, 50, 7, ("flame.0", "flame.1", "flame.2", "flame.2"), random.Random(3))
    return im


PLACED = []


def _wire_y(x):
    return HORIZON + 8 + int(5 * math.sin((x % 64) / 64 * math.pi))


def _draw_posters(im):
    specs = (
        (27, 58, "linen.3", "flame.1", "moss.1"),
        (91, 58, "hay.2", "brick.3", "wood.0"),
        (155, 58, "linen.2", "moss.1", "hay.2"),
    )
    for px, py, paper, accent, detail in specs:
        H.rrect(im, px, py, px + 8, py + 8, 0, ("wood.1", paper, paper, paper))
        H.put(im, px + 4, py, "wood.0")
        H.hline(im, px + 2, px + 6, py + 2, accent)
        H.hline(im, px + 2, px + 5, py + 4, detail)
        H.hline(im, px + 2, px + 6, py + 6, "wood.0")


def world():
    r = random.Random(61)
    im = H.canvas(W, HT)
    for x in range(W):                                                       # dachy miasteczka w oddali
        top = int(HORIZON - 10 - 4 * math.sin(x / 19.0) - 3 * ((x // 12) % 2))
        H.vline(im, x, top, HORIZON, "dusk.1" if (x // 24) % 2 else "plum.1")
    for y in range(HORIZON, HT):                                             # placyk: piasek + bruk
        for x in range(W):
            if HORIZON + 18 <= y < HORIZON + 64 and r.random() < 0.03:
                H.put(im, x, y, "wood.2" if r.random() < 0.6 else "linen.1")
            else:
                H.put(im, x, y, "wood.3" if y < HORIZON + 40 else "wood.2")
    for y in range(HORIZON - 2, HORIZON + 18):                               # tylny mur placu (nad linia straganow y>=78)
        for x in range(W):
            if y == HORIZON - 2:
                H.put(im, x, y, "dusk.2")
            elif y == HORIZON - 1:
                H.put(im, x, y, "dusk.3")
            elif y == HORIZON:
                H.put(im, x, y, "wood.1")
            elif y == HORIZON + 16:
                H.put(im, x, y, "wood.2")
            elif y == HORIZON + 17:
                H.put(im, x, y, "wood.1")
            elif y in (HORIZON + 6, HORIZON + 11) or r.random() < 0.08:
                H.put(im, x, y, "wood.3")
            else:
                H.put(im, x, y, "linen.1")
    pc = _img("park/path_cobble.png")
    for k, y in enumerate(range(HORIZON + 66, HT - 4, 13)):
        for x in range(-8 + (k % 2) * 8, W, 16): im.alpha_composite(pc, (x, y))
    H.break_checkers(im)
    _draw_posters(im)
    prev_y = _wire_y(0) - 1
    for x in range(W):                                                       # sznur pod wiszace lampki
        wy = _wire_y(x) - 1
        y0, y1 = min(prev_y, wy), max(prev_y, wy)
        H.vline(im, x, y0, y1, "wood.0")
        prev_y = wy
    for bx, by in BULBS:
        H.put(im, bx, by - 1, "wood.0")
        H.put(im, bx, by, "hay.2")
    PLACED.clear()
    return im


def build():
    wim = world()
    lit = light.render(wim, "evening", [])
    out = Image.new("RGBA", (W, HT)); out.alpha_composite(sky()); out.alpha_composite(lit)
    for bx, by in BULBS:                                                     # zrodla swiatla po light.render
        H.put(out, bx, by, "linen.3")
        H.put(out, bx, by + 1, "hay.3")
        H.put(out, bx - 1, by, "hay.2")
        H.put(out, bx + 1, by, "hay.2")
        H.put(out, bx - 1, by + 1, "flame.2")
        H.put(out, bx + 1, by + 1, "flame.2")
        H.put(out, bx, by + 2, "flame.1")
    return _break(out)


if __name__ == "__main__":
    im = build()
    H.save_png(im, H.WORLD_DIR / "bg/market.png")
