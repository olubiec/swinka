"""B7-6: tlo farmy 256x144 (dzien) i przeglad farmy z uprawami we wszystkich stadiach."""
import json
import math
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image
from garden import blob
from garden_bg import SKY, _break
import farm_a
import farm_b

W, HT, HORIZON = 256, 144, 54


def _img(rel):
    return Image.open(H.WORLD_DIR / rel).convert("RGBA")


def sky():
    import light
    bands = SKY["day"]
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
    for cx, cy, w in ((50, 14, 20), (170, 24, 26), (225, 10, 14)):
        for k in range(3):
            H.hline(im, cx - w // 2 + k * 2, cx + w // 2 - k * 2, cy + k, "linen.3" if k == 0 else "linen.2")
    blob(im, 214, 18, 7, ("hay.1", "hay.2", "hay.3", "flame.3"), random.Random(3))
    return im


PLACED = []
GX, GY, COLS, ROWS = 32, HORIZON + 22, 12, 4      # siatka dzialek 16x16 na trawniku (kazda przerabiana osobno)
START = [("lawn", c, r) for r in range(ROWS) for c in range(COLS)]
MID = [("lawn", c, r) for r in range(ROWS) for c in range(COLS) if (c, r) not in {(1, 1), (2, 1), (3, 1), (1, 2), (3, 2), (6, 1), (8, 1), (10, 1), (6, 3), (8, 3), (10, 3), (5, 2)}] + \
      [("bed", 1, 1), ("bed", 2, 1), ("bed", 3, 1), ("bed", 1, 2), ("bed_wet", 3, 2), ("bed", 5, 2),
       ("tree", 6, 1), ("tree", 8, 1), ("tree", 10, 1), ("tree", 6, 3), ("tree", 8, 3), ("tree", 10, 3)]


def meadow(im, r):
    """Polana: plamy tonow trawy (niska czestotliwosc), kepy z dlugimi zdzblami, kwiatki, koniczyna, paprocie i kamyki."""
    for y in range(HORIZON + 2, HT):
        for x in range(W):
            v = math.sin(x / 17.0 + y / 23.0) + math.sin(x / 9.0 - y / 13.0 + 2) * .6 + math.sin(y / 7.0 + x / 31.0) * .4
            v += (y - HORIZON) / 60.0 - .6 + r.uniform(-.35, .35)
            c = "moss.1" if v < -.75 else ("moss.2" if v < .8 else "moss.3")
            if r.random() < .06: c = "moss.0" if c == "moss.1" else ("moss.1" if c == "moss.2" else "moss.2")
            H.put(im, x, y, c)
    for _ in range(190):                                           # kepy trawy: 3-5 zdzbel o roznej dlugosci
        x, y = r.randint(2, W - 3), r.randint(HORIZON + 6, HT - 2)
        for dx, ln in ((-2, r.randint(2, 3)), (0, r.randint(3, 6)), (2, r.randint(2, 4)), (r.choice((-1, 1)), r.randint(2, 4))):
            for k in range(ln): H.put(im, x + dx + (k // 3) * (1 if dx >= 0 else -1), y - k, "moss.0" if k == 0 else ("moss.3" if k < ln - 1 else "moss.4"))
    for _ in range(26):                                            # koniczyna i listki lezace w trawie
        x, y = r.randint(2, W - 4), r.randint(HORIZON + 6, HT - 3)
        for dx, dy in ((0, 0), (2, 0), (1, 1), (1, -1)): H.put(im, x + dx, y + dy, "moss.4" if (dx + dy) % 2 else "moss.3")
        H.put(im, x + 1, y, "moss.0")
    for _ in range(9):                                             # wieksze rosliny: paprocie / krzaczki
        x, y = r.randint(6, W - 8), r.randint(HORIZON + 10, HT - 3)
        for k, (dx, dy) in enumerate(((0, 0), (-3, 1), (3, 1), (-2, -2), (2, -2), (0, -3), (-4, 3), (4, 3))):
            H.put(im, x + dx, y + dy, "moss.0" if k < 1 else "moss.4"); H.put(im, x + dx // 2, y + dy // 2, "moss.3")
    pal = ("rose.1", "rose.2", "hay.3", "linen.3", "linen.2", "berry.0", "hay.2")
    for _ in range(95):                                            # pojedyncze kwiatki na lodygach
        x, y = r.randint(2, W - 3), r.randint(HORIZON + 8, HT - 4)
        c = r.choice(pal); big = r.random() < .3
        H.vline(im, x, y, y + 2, "moss.0")
        if r.random() < .5: H.put(im, x + 1, y + 1, "moss.4")
        H.put(im, x, y - 1, c)
        if big:
            for dx, dy in ((-1, -1), (1, -1), (0, -2)): H.put(im, x + dx, y + dy, c)
            H.put(im, x, y - 1, "hay.3" if c != "hay.3" else "hay.1")
    for _ in range(14):                                            # kamyki
        x, y = r.randint(3, W - 5), r.randint(HORIZON + 10, HT - 3)
        H.hline(im, x, x + 2, y, "dusk.3"); H.hline(im, x + 1, x + 2, y - 1, "dusk.4"); H.hline(im, x, x + 2, y + 1, "plum.1")


def world(plots=()):
    r = random.Random(51)
    im = H.canvas(W, HT)
    for x in range(W):
        H.vline(im, x, int(HORIZON - 8 - 4 * math.sin(x / 23.0) - 2 * math.sin(x / 8.0)), HORIZON, "dusk.1")
    for x in range(W):
        H.vline(im, x, int(HORIZON - 1 - 2 * math.sin(x / 11.0 + 1)), HORIZON + 2, "moss.0")
    meadow(im, r)
    H.break_checkers(im)
    meta = json.loads((H.WORLD_DIR / "farm/farm.json").read_text(encoding="utf-8"))["frames"]
    sheet = _img("farm/farm.png")
    def fr(name, i):
        x, y, w, h = meta[name][i]; return sheet.crop((x, y, x + w, y + h))
    fence = _img("farm/fence_farm.png")
    for x in range(0, W, 16): im.alpha_composite(fence, (x, HORIZON + 6))
    PLACED.clear()
    def put(n, x, y, i):
        PLACED.append((n, x, y, i)); im.alpha_composite(i, (x, y))
    put("barn_hay", 176, HORIZON - 34, _img("farm/barn_hay.png"))
    kinds = {"lawn": ("plot_lawn", None), "bed": ("bed_empty", 0), "bed_wet": ("bed_wet", 0)}
    for kind, c, rw in sorted(plots, key=lambda p: p[2]):                       # rzedami od gory: nizsze rysowane pozniej
        x, y = GX + c * 16, GY + rw * 16
        if kind == "lawn": put("plot_lawn", x, y, _img("farm/plot_lawn.png"))
        elif kind in ("bed", "bed_wet"): put(kinds[kind][0], x, y, fr(kinds[kind][0], 0))
        elif kind == "tree":
            put("plot_orchard", x, y, _img("farm/plot_orchard.png"))
            nm = "tree_apple" if (c + rw) % 2 == 0 else "tree_strawberry"
            put(nm, x, y - 16, fr(nm, 2))
    return im


def orchard_scene():
    """bg:orchard - podglad sadu: trzy dzialki sadu z drzewkami w stadiach 0-2, kosz i drabina na trawie."""
    out = Image.new("RGBA", (W, HT))
    out.alpha_composite(sky()); base = world([])
    PLACED.clear()
    def put(n, x, y, i):
        PLACED.append((n, x, y, i)); base.alpha_composite(i, (x, y))
    meta = json.loads((H.WORLD_DIR / "farm/farm.json").read_text(encoding="utf-8"))["frames"]
    sheet = _img("farm/farm.png")
    for st in range(3):
        for k in range(4):
            c, r = 1 + st * 4 + (k % 2) * 2, 1 + (k // 2) * 2
            x, y = GX - 16 + c * 16, GY + r * 16
            put("plot_orchard", x, y, _img("farm/plot_orchard.png"))
            name = ("tree_apple", "tree_strawberry", "tree_pear", "tree_blueberry")[k]
            x0, y0, w, h = meta[name][st]
            put(name, x, y + 16 - h, sheet.crop((x0, y0, x0 + w, y0 + h)))
    out.alpha_composite(base)
    return _break(out)


def build(plots=()):
    out = Image.new("RGBA", (W, HT))
    out.alpha_composite(sky()); out.alpha_composite(world(plots))
    return _break(out)


def overview(path):
    bg = build()
    meta = json.loads((H.WORLD_DIR / "farm/farm.json").read_text(encoding="utf-8"))
    sheet = _img("farm/farm.png")
    def frame(name, i):
        x, y, w, h = meta["frames"][name][i]
        return sheet.crop((x, y, x + w, y + h))
    soil = frame("bed_empty", 0)
    HH = HORIZON + 14 + 4 * 20 + 44
    scene = Image.new("RGBA", (W, HH))
    scene.alpha_composite(bg.crop((0, 0, W, HORIZON + 14)))
    for ty in range(HORIZON + 14, HH, 16):
        for tx in range(0, W, 16): scene.alpha_composite(soil, (tx, ty))
    k = 0
    for row in range(4):
        for col in range(3):
            if k >= len(farm_a.CROPS): break
            c = farm_a.CROPS[k]; k += 1
            for st in range(4):
                scene.alpha_composite(frame("crop_" + c, st), (8 + col * 84 + st * 19, HORIZON + 16 + row * 20))
    for i, t in enumerate(farm_a.TREES):
        for st in range(3):
            scene.alpha_composite(frame("tree_" + t, st), (4 + i * 64 + st * 20, HH - 36))
    scene = scene.convert("RGB").resize((W * 4, HH * 4), Image.NEAREST)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    scene.save(path)


if __name__ == "__main__":
    im = build()
    H.save_png(im, H.WORLD_DIR / "bg/farm.png")
    oi = orchard_scene(); H.save_png(oi, H.WORLD_DIR / "bg/orchard.png")
    import layout_check as _LC; _LC.report("sad", PLACED)
    H._update_json(H.TILES_FILE, lambda d: d["bg"].__setitem__("orchard", {"file": "bg/orchard.png", "size": [W, HT]}))
    oi.convert("RGB").resize((W * 3, HT * 3), Image.NEAREST).save(H.ROOT / "docs/album/przebudowa/b14-4_sad.png")
    H.save_png(im.resize((W * 2, HT * 2), Image.NEAREST), H.WORLD_DIR / "bg/farm_x2.png")
    overview(H.ROOT / "docs/album/przebudowa/b7-6_przeglad_farmy.png")
    import layout_check as LC
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    stages = [START, MID, [p for p in MID if p[0] != "lawn"]]
    sh = Image.new("RGB", (W, HT * 3 + 8))
    for i, st in enumerate(stages):
        im2 = build(st); LC.report(f"farma etap {i}", PLACED); sh.paste(im2.convert("RGB"), (0, i * (HT + 4)))
    sh = sh.resize((sh.width * 3, sh.height * 3), Image.NEAREST)
    sh.save(S / "b14-farm.png")
    Path(H.ROOT / "docs/album/przebudowa").mkdir(parents=True, exist_ok=True)
    sh.save(H.ROOT / "docs/album/przebudowa/b14-4_farma_etapy.png")
