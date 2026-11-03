"""B6-4/B6-5: tla parku 384x192 (rano, dzien, wieczor, noc): strumien z mostem, altana, sciezka,
lampy parkowe i kosz z zarem. Swiat w kolorach dnia, potem swiatlo z light.py; niebo osobno."""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import light
from PIL import Image
from garden import blob, MOSS
from garden_bg import SKY, _break
from meadow import meadow

W, HT, HORIZON = 384, 192, 70
STREAM = (HORIZON + 16, HORIZON + 30)                                       # gorny i dolny brzeg wody
LAMPS = [(24, HORIZON + 46), (280, HORIZON + 46), (344, HORIZON + 106)]     # lewy-gorny rog lamp_post 16x16
BRAZIERS = [(352, HORIZON + 40)]
BRIDGE = (168, STREAM[0] - 6)                                                 # poklad przecina strumien
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
        for cx, cy, w in ((70, 16, 24), (210, 28, 30), (330, 12, 18)):
            for k in range(3):
                H.hline(im, cx - w // 2 + k * 2, cx + w // 2 - k * 2, cy + k, "linen.3" if k == 0 else "linen.2")
        blob(im, 320, 24, 8, ("hay.1", "hay.2", "hay.3", "flame.3"), r)
    if tod == "morning":
        blob(im, 56, 60, 9, ("flame.1", "flame.2", "flame.3", "flame.3"), r)
    if tod == "evening":
        blob(im, 300, 62, 8, ("flame.0", "flame.1", "flame.2", "flame.2"), r)
    if tod == "night":
        for _ in range(60):
            H.put(im, r.randint(0, W - 1), r.randint(0, 46), "linen.3" if r.random() < .5 else "linen.1")
        for y in range(12, 31):
            for x in range(300, 320):
                d = ((x - 310) ** 2 + (y - 21) ** 2) ** .5
                d2 = ((x - 314) ** 2 + (y - 19) ** 2) ** .5
                if d < 9 and d2 >= 8: H.put(im, x, y, "linen.3" if d < 7 else "linen.2")
    return im


def world(extra=()):
    r = random.Random(43)
    im = H.canvas(W, HT)
    for x in range(W):                                                          # dalekie wzgorza
        top = int(HORIZON - 8 - 5 * math.sin(x / 27.0) - 2 * math.sin(x / 9.0 + 1))
        H.vline(im, x, top, HORIZON, "dusk.1")
    for x in range(W):
        top = int(HORIZON - 2 - 2 * math.sin(x / 13.0 + 2))
        H.vline(im, x, top, HORIZON + 2, "moss.0")
    for cx in range(6, W, 22):                                                  # linia drzew na horyzoncie
        blob(im, cx + r.randint(-3, 3), HORIZON - 3, 7 + r.randint(0, 2), ("moss.0", "moss.1", "moss.1", "moss.2"), r)
    meadow(im, r, W, HT, HORIZON)
    H.break_checkers(im)
    for y in range(STREAM[0], STREAM[1] + 1):                                  # strumien
        for x in range(W):
            off = int(2 * math.sin(x / 15.0))
            if STREAM[0] + off <= y <= STREAM[1] + off:
                edge = y in (STREAM[0] + off, STREAM[1] + off)
                H.put(im, x, y, "dusk.1" if edge else ("dusk.3" if (x // 7 + y) % 5 else "dusk.4"))
    PLACED.clear()
    def put(name, x, y, rel=None):
        i = _img(rel or f"park/{name}.png"); PLACED.append((name, x, y, i)); im.alpha_composite(i, (x, y))
    bank = STREAM[0] - 2                                                       # drzewa i altana stoja na dalekim brzegu
    put("gazebo", 70, bank - 48)
    for x in (2, 212, 262, 316): put("tree_big", x, bank - 52 + (x % 3))
    put("bridge_wood", *BRIDGE)
    pc = _img("park/path_cobble.png")                                          # sciezka od mostu w dol
    for k, y in enumerate(range(STREAM[1] + 8, HT - 4, 13)):
        x = 180 + int(22 * math.sin(k / 2.1))
        for dx in (-8, 8): im.alpha_composite(pc, (x + dx - 8 + (k % 2) * 4, y))
    put("flower_arch", 156, STREAM[1] + 16)
    put("bench_park", 112, HORIZON + 62); put("bench_park", 344, HORIZON + 78)
    for rel, x, y in extra:
        put(Path(rel).stem, x, y, rel)
    return im


def build(tod, extra=(), pigs=()):
    wim = world(extra)
    for n, (x, y) in [("lamp_post", p) for p in LAMPS] + [("brazier", p) for p in BRAZIERS]: PLACED.append((n, x, y, _img("park/lamp_post.png")))
    lights = []
    if tod in ("evening", "night"):
        lights = [("lamp_street", x + 8, y + 5) for x, y in LAMPS] + [("brazier", x + 8, y + 4) for x, y in BRAZIERS]
    elif tod == "morning":
        lights = []
    sk = sky(tod)
    lit = light.render(wim, tod, lights) if tod != "day" else wim
    out = Image.new("RGBA", (W, HT))
    out.alpha_composite(sk, (0, 0)); out.alpha_composite(lit)
    if tod in ("evening", "night"):                                             # zrodla swiatla rysowane po swietle
        lp, br = _img("park/lamp_post_on.png"), _img("garden/brazier_on.png").crop((0, 0, 16, 16))
        for x, y in LAMPS: out.alpha_composite(lp, (x, y))
        for x, y in BRAZIERS: out.alpha_composite(br, (x, y))
    else:
        lp, br = _img("park/lamp_post.png"), _img("garden/brazier.png")
        for x, y in LAMPS: out.alpha_composite(lp, (x, y))
        for x, y in BRAZIERS: out.alpha_composite(br, (x, y))
    _break(out)
    lamps = [(k, x + 8, y + 5) for x, y in LAMPS for k in ('lamp_street',)] + [('brazier', x + 8, y + 4) for x, y in BRAZIERS]
    if tod in ('evening', 'night') and pigs:
        import scena
        for who, px, py in pigs:
            pg = scena.pig(who)
            out.alpha_composite(light.render(pg, tod, [(k, a - px, b - py, .6) for k, a, b in lamps], quantized=False), (px, py))
    elif pigs:
        import scena
        for who, px, py in pigs:
            out.alpha_composite(light.render(scena.pig(who), tod, [], quantized=False), (px, py))
    return out


def build_all():
    for tod in ("morning", "day", "evening", "night"):
        H.save_png(build(tod), H.WORLD_DIR / f"bg/park_{tod}.png")
        old = H.WORLD_DIR / f"bg/park_{tod}_x2.png"
        if old.exists():
            H.save_png(build(tod).resize((W * 2, HT * 2), Image.NEAREST), old)


if __name__ == "__main__":
    build_all()
    out = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    ims = [Image.open(H.WORLD_DIR / f"bg/park_{t}.png").convert("RGB") for t in ("morning", "day", "evening", "night")]
    sh = Image.new("RGB", (W * 2 + 4, HT * 2 + 4))
    for i, im in enumerate(ims): sh.paste(im, ((i % 2) * (W + 4), (i // 2) * (HT + 4)))
    sh.resize((sh.width * 2 // 1, sh.height * 2 // 1), Image.NEAREST).save(out / "b6-4.png")
