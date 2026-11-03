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


def world():
    r = random.Random(61)
    im = H.canvas(W, HT)
    for x in range(W):                                                       # dachy miasteczka w oddali
        top = int(HORIZON - 10 - 4 * math.sin(x / 19.0) - 3 * ((x // 12) % 2))
        H.vline(im, x, top, HORIZON, "dusk.1" if (x // 24) % 2 else "plum.1")
    for y in range(HORIZON, HT):                                             # placyk: piasek + bruk
        for x in range(W):
            H.put(im, x, y, "wood.3" if y < HORIZON + 40 else "wood.2")
    pc = _img("park/path_cobble.png")
    for k, y in enumerate(range(HORIZON + 66, HT - 4, 13)):
        for x in range(-8 + (k % 2) * 8, W, 16): im.alpha_composite(pc, (x, y))
    H.break_checkers(im)
    for name, x, y in STALLS: im.alpha_composite(_img(f"market/{name}.png"), (x, y))
    im.alpha_composite(_img("market/order_board.png"), (62, HORIZON + 44))
    for n, x in (("promo_1", 40), ("promo_2", 158), ("promo_3", 224)): im.alpha_composite(_img(f"market/{n}.png"), (x, HORIZON + 52 + (x % 3) * 6))
    for n, x in (("poster_1", 4), ("poster_2", 134), ("poster_3", 118)): im.alpha_composite(_img(f"market/{n}.png"), (x, HORIZON + 60 + (x % 2) * 18))
    return im


def build():
    wim = world()
    lights = [("lantern", x + 1, y + 2, .22) for x, y in BULBS] + [("lantern", 24, HORIZON + 38, .6), ("lantern", 120, HORIZON + 38, .6), ("lantern", 214, HORIZON + 38, .6)]
    lit = light.render(wim, "evening", lights)
    out = Image.new("RGBA", (W, HT)); out.alpha_composite(sky()); out.alpha_composite(lit)
    for i in range(len(BULBS) - 1):                                          # sznur: lina i zarowki po swietle
        (x0, y0), (x1, y1) = BULBS[i], BULBS[i + 1]
        for x in range(x0, x1 + 1):
            t = (x - x0) / max(1, x1 - x0); y = int(y0 + (y1 - y0) * t + 3 * math.sin(t * math.pi))
            H.put(out, x, y, "wood.0")
    for x, y in BULBS:
        H.rect(out, x - 1, y + 1, x + 1, y + 3, "flame.2"); H.rect(out, x, y + 1, x, y + 2, "linen.3"); H.put(out, x, y + 4, "flame.1")
    return _break(out)


if __name__ == "__main__":
    im = build()
    H.save_png(im, H.WORLD_DIR / "bg/market.png")
    H.save_png(im.resize((W * 2, HT * 2), Image.NEAREST), H.WORLD_DIR / "bg/market_x2.png")
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    im.convert("RGB").resize((W * 4, HT * 4), Image.NEAREST).save(S / "b8-3.png")
