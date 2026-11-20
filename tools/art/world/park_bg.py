"""B6-4/B6-5: tla parku 256x144 (rano, dzien, wieczor, noc): linia drzew na horyzoncie, strumien,
sciezka. Swiat w kolorach dnia, potem swiatlo z light.py; niebo osobno."""
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
from meadow import meadow

W, HT, HORIZON = 256, 144, 46
STREAM = (54, 68)                                                             # gorny i dolny brzeg wody
PLACED = []


def _img(rel):
    return Image.open(H.WORLD_DIR / rel).convert("RGBA")


def sky(tod):
    bands = SKY[tod]
    rj = random.Random(5)
    n = len(bands)
    im = H.canvas(W, HORIZON + 10)
    for y in range(im.height):
        t = min(y / (HORIZON + 4), 1) * (n - 1)
        i, f = int(t), t - int(t)
        for x in range(W):
            k = min(n - 1, i + (1 if f > light.BAYER[y % 4, x % 4] + 0.5 + rj.uniform(-.18, .18) else 0))
            H.put(im, x, y, bands[k])
    _break(im)
    r = random.Random(3)
    if tod == "day":
        for cx, cy, w in ((50, 14, 20), (160, 20, 24), (220, 10, 14)):
            for k in range(3):
                H.hline(im, cx - w // 2 + k * 2, cx + w // 2 - k * 2, cy + k, "linen.3" if k == 0 else "linen.2")
        blob(im, 214, 18, 7, ("hay.1", "hay.2", "hay.3", "flame.3"), r)
    if tod == "morning":
        blob(im, 40, 40, 8, ("flame.1", "flame.2", "flame.3", "flame.3"), r)
    if tod == "evening":
        blob(im, 190, 42, 7, ("flame.0", "flame.1", "flame.2", "flame.2"), r)
    if tod == "night":
        for _ in range(40):
            H.put(im, r.randint(0, W - 1), r.randint(0, 36), "linen.3" if r.random() < .5 else "linen.1")
        for y in range(10, 27):
            for x in range(200, 218):
                d = ((x - 209) ** 2 + (y - 18) ** 2) ** .5
                d2 = ((x - 213) ** 2 + (y - 16) ** 2) ** .5
                if d < 8 and d2 >= 7: H.put(im, x, y, "linen.3" if d < 6 else "linen.2")
    return im


def world(extra=()):
    r = random.Random(43)
    im = H.canvas(W, HT)
    for x in range(W):                                                          # dalekie wzgorza
        top = int(HORIZON - 7 - 4 * math.sin(x / 23.0) - 2 * math.sin(x / 9.0 + 1))
        H.vline(im, x, top, HORIZON, "dusk.1")
    for cx in range(10, W, 28):                                                 # dalekie drzewa za strumieniem (y < HORIZON)
        ty = HORIZON - 10 - r.randint(0, 6)
        rad = 7 + r.randint(0, 3)
        H.vline(im, cx, ty, HORIZON + 1, "wood.0")
        H.vline(im, cx + 1, ty + 1, HORIZON + 1, "wood.1")
        blob(im, cx, ty, rad, ("moss.0", "moss.1", "moss.1", "moss.2"), r)
        blob(im, cx - 5, ty + 3, max(4, rad - 3), ("moss.0", "moss.1", "moss.1", "moss.2"), r)
        blob(im, cx + 5, ty + 3, max(4, rad - 3), ("moss.0", "moss.1", "moss.1", "moss.2"), r)
    for x in range(W):
        top = int(HORIZON - 2 - 2 * math.sin(x / 13.0 + 2))
        H.vline(im, x, top, HORIZON + 2, "moss.0")
    for cx in range(6, W, 20):                                                  # linia krzewow na horyzoncie
        blob(im, cx + r.randint(-3, 3), HORIZON - 3, 5 + r.randint(0, 2), ("moss.0", "moss.1", "moss.1", "moss.2"), r)
    meadow(im, r, W, HT, HORIZON)
    H.break_checkers(im)
    for y in range(STREAM[0] - 2, STREAM[1] + 3):                              # strumien
        for x in range(W):
            off = int(2 * math.sin(x / 15.0))
            if STREAM[0] + off <= y <= STREAM[1] + off:
                edge = y in (STREAM[0] + off, STREAM[1] + off)
                H.put(im, x, y, "dusk.0" if edge else ("dusk.2" if (x // 7 + y) % 5 else "dusk.3"))
    PLACED.clear()
    pc = _img("park/path_cobble.png")                                          # sciezka od mostu (x=10) w dol
    for k, y in enumerate(range(STREAM[1] + 4, HT - 4, 13)):
        x = 160 - 4 * k + int(6 * math.sin(k / 1.8))
        for dx in (-8, 8): im.alpha_composite(pc, (x + dx - 8 + (k % 2) * 4, y))
    for rel, x, y in extra:
        i = _img(rel); PLACED.append((Path(rel).stem, x, y, i)); im.alpha_composite(i, (x, y))
    return im


def build(tod, extra=(), pigs=()):
    wim = world(extra)
    sk = sky(tod)
    lit = light.render(wim, tod, []) if tod != "day" else wim
    out = Image.new("RGBA", (W, HT))
    out.alpha_composite(sk, (0, 0)); out.alpha_composite(lit)
    _break(out)
    if pigs:
        import scena
        for who, px, py in pigs:
            out.alpha_composite(light.render(scena.pig(who), tod, [], quantized=False), (px, py))
    return out


def build_all():
    for tod in ("morning", "day", "evening", "night"):
        H.save_png(build(tod), H.WORLD_DIR / f"bg/park_{tod}.png")


if __name__ == "__main__":
    build_all()
