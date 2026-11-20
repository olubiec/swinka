"""B5-5/B5-6: tla ogrodu 256x144 (rano, dzien, wieczor, noc). Swiat rysowany w kolorach dnia,
potem swiatlo z light.py wg pory; niebo osobno (nie podlega oswietleniu)."""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import light
from PIL import Image
from garden import blob
from meadow import meadow

W, HT, HORIZON = 256, 144, 58
SKY = {
    "morning": ["dusk.3", "dusk.4", "linen.2", "rose.2", "hay.2", "flame.2"],
    "day": ["dusk.2", "dusk.3", "dusk.4", "dusk.4", "linen.3"],
    "evening": ["plum.2", "plum.3", "rose.0", "brick.3", "flame.0", "flame.1"],
    "night": ["dusk.0", "dusk.0", "plum.0", "plum.1", "plum.1"],
}


def _break(im):
    """Jedno przejscie: tam gdzie jest szachownica 4x4, zamienia piksel na kolor sasiada (R6)."""
    px = im.load()
    for y in range(im.height - 3):
        for x in range(im.width - 3):
            a, b = px[x, y], px[x + 1, y]
            if a != b and all(px[x + i, y + j] == (a if (i + j) % 2 == 0 else b) for i in range(4) for j in range(4)):
                px[x + 1, y + 1] = a if (x + y) % 2 else b
                px[x + 2, y + 2] = a if (x + y) % 2 == 0 else b
    return im


def sky(tod):
    bands = SKY[tod]
    rj = random.Random(5)
    n = len(bands)
    im = H.canvas(W, HORIZON + 8)
    for y in range(im.height):
        t = min(y / (HORIZON + 4), 1) * (n - 1)
        i, f = int(t), t - int(t)
        for x in range(W):
            k = min(n - 1, i + (1 if f > light.BAYER[y % 4, x % 4] + 0.5 + rj.uniform(-.18, .18) else 0))
            H.put(im, x, y, bands[k])
    _break(im)
    r = random.Random(3)
    if tod == "day":
        for cx, cy, w in ((50, 14, 20), (170, 22, 26), (225, 10, 14)):         # chmury
            for k in range(3):
                H.hline(im, cx - w // 2 + k * 2, cx + w // 2 - k * 2, cy + k, "linen.3" if k == 0 else "linen.2")
        blob(im, 214, 20, 7, ("hay.1", "hay.2", "hay.3", "flame.3"), r)          # slonce
    if tod == "morning":
        blob(im, 40, 50, 8, ("flame.1", "flame.2", "flame.3", "flame.3"), r)
    if tod == "evening":
        blob(im, 60, 52, 7, ("flame.0", "flame.1", "flame.2", "flame.2"), r)
    if tod == "night":
        for _ in range(40):
            H.put(im, r.randint(0, W - 1), r.randint(0, 40), "linen.3" if r.random() < .5 else "linen.1")
        for y in range(10, 27):                                                   # polksiezyc
            for x in range(200, 218):
                d = ((x - 209) ** 2 + (y - 18) ** 2) ** .5
                d2 = ((x - 213) ** 2 + (y - 16) ** 2) ** .5
                if d < 8 and d2 >= 7: H.put(im, x, y, "linen.3" if d < 6 else "linen.2")
    return im


PLACED = []


def _gate_sprite():
    gate_path = H.WORLD_DIR / "garden/gate_garden.png"
    if gate_path.exists():
        return Image.open(gate_path).convert("RGBA")
    gate = H.canvas(24, 16)
    for px in range(2, 22, 4):
        H.rrect(gate, px, 2, px + 2, 14, 1, ("wood.0", "wood.1", "wood.2", "wood.2"))
    H.hline(gate, 1, 22, 5, "wood.2"); H.hline(gate, 1, 22, 6, "wood.1")
    H.hline(gate, 1, 22, 10, "wood.2"); H.hline(gate, 1, 22, 11, "wood.1")
    H.rrect(gate, 0, 0, 2, 15, 1, ("wood.0", "wood.1", "wood.2", "wood.3"))
    H.rrect(gate, 21, 0, 23, 15, 1, ("wood.0", "wood.1", "wood.2", "wood.3"))
    return gate


def world(tod):
    r = random.Random(22)
    tr = random.Random(23)
    im = H.canvas(W, HT)
    for x in range(W):                                                            # dalekie wzgorza i krzewy
        top = int(HORIZON - 6 - 4 * math.sin(x / 21.0) - 2 * math.sin(x / 8.0 + 1))
        H.vline(im, x, top, HORIZON, "dusk.1" if tod != "evening" else "plum.1")
    for tx, top_y, rad in ((18, 34, 9), (44, 38, 7), (76, 31, 10), (102, 37, 7), (156, 35, 8)):
        H.vline(im, tx, top_y, HORIZON + 1, "wood.0")
        H.vline(im, tx + 1, top_y + 1, HORIZON + 1, "wood.1")
        blob(im, tx, top_y, rad, ("moss.0", "moss.1", "moss.1", "moss.2"), tr)
        blob(im, tx - rad // 2, top_y + 3, max(4, rad - 3), ("moss.0", "moss.1", "moss.1", "moss.2"), tr)
        blob(im, tx + rad // 2, top_y + 4, max(4, rad - 4), ("moss.0", "moss.1", "moss.1", "moss.2"), tr)
    for x in range(W):
        top = int(HORIZON - 1 - 2 * math.sin(x / 12.0 + 2))
        H.vline(im, x, top, HORIZON + 2, "moss.0")
    meadow(im, r, W, HT, HORIZON, flowers=.5)                                             # trawa
    H.break_checkers(im)
    gate = _gate_sprite()
    gx = (W - gate.width) // 2
    gap_l, gap_r = gx, gx + gate.width
    for x in range(0, W, 8):                                                      # plot z przerwa na furtke
        if x + 4 >= gap_l and x + 1 < gap_r:
            continue
        H.rrect(im, x + 1, HORIZON - 2, x + 4, HORIZON + 12, 1, ("wood.0", "wood.1", "wood.2", "wood.2"))
    if gap_l > 0:
        H.hline(im, 0, gap_l - 1, HORIZON + 3, "wood.2"); H.hline(im, 0, gap_l - 1, HORIZON + 4, "wood.1")
        H.hline(im, 0, gap_l - 1, HORIZON + 8, "wood.2"); H.hline(im, 0, gap_l - 1, HORIZON + 9, "wood.1")
    if gap_r < W:
        H.hline(im, gap_r, W - 1, HORIZON + 3, "wood.2"); H.hline(im, gap_r, W - 1, HORIZON + 4, "wood.1")
        H.hline(im, gap_r, W - 1, HORIZON + 8, "wood.2"); H.hline(im, gap_r, W - 1, HORIZON + 9, "wood.1")
    im.alpha_composite(gate, (gx, HORIZON - 2))
    PLACED.clear()
    # sciezka: kamienie coraz wieksze ku dolowi
    ps = Image.open(H.WORLD_DIR / "garden/path_stone.png").convert("RGBA")
    for row in range(6):
        im.alpha_composite(ps, (122 + (8 if row % 2 else -4) + row, HORIZON + 14 + row * 13))
    return im


def build(tod):
    wim = world(tod)
    sk = sky(tod)
    lit = light.render(wim, tod, []) if tod != "day" else wim
    out = Image.new("RGBA", (W, HT))
    out.alpha_composite(sk, (0, 0)); out.alpha_composite(lit)
    _break(out)
    return out.convert("RGBA")


def build_all():
    for tod in ("morning", "day", "evening", "night"):
        im = build(tod)
        H.save_png(im, H.WORLD_DIR / f"bg/garden_{tod}.png")


if __name__ == "__main__":
    build_all()
