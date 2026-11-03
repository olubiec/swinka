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


def world():
    r = random.Random(51)
    im = H.canvas(W, HT)
    for x in range(W):
        H.vline(im, x, int(HORIZON - 8 - 4 * math.sin(x / 23.0) - 2 * math.sin(x / 8.0)), HORIZON, "dusk.1")
    for x in range(W):
        H.vline(im, x, int(HORIZON - 1 - 2 * math.sin(x / 11.0 + 1)), HORIZON + 2, "moss.0")
    for y in range(HORIZON + 2, HT):
        for x in range(W):
            c = "moss.1" if y < HORIZON + 26 else "moss.2"
            if r.random() < .09: c = "moss.2" if c == "moss.1" else "moss.3"
            H.put(im, x, y, c)
    H.break_checkers(im)
    for yy in range(HORIZON + 22, HT - 6, 1):                                     # pole: ziemia pod grzadki
        pass
    soil = _img("farm/farm.png").crop((160, 64, 176, 80))
    for ty in range(HORIZON + 22, HT - 8, 16):
        for tx in range(24, 232, 16):
            im.alpha_composite(soil, (tx, ty))
    fence = _img("farm/fence_farm.png")
    for x in range(0, W, 16): im.alpha_composite(fence, (x, HORIZON + 6))
    im.alpha_composite(_img("farm/barn_hay.png"), (176, HORIZON - 34))
    t = _img("garden/tree_small.png") if (H.WORLD_DIR / "garden/tree_small.png").exists() else None
    from garden import tree_small
    for x, y in ((6, HORIZON - 22), (36, HORIZON - 16), (140, HORIZON - 18)):
        im.alpha_composite(tree_small(), (x, y))
    for _ in range(30):
        x, y = r.randint(0, W - 1), r.randint(HORIZON + 24, HT - 3)
        if im.getpixel((x, y))[:3] in H.RAMPS["moss"]: H.put(im, x, y, r.choice(["hay.2", "linen.2"]))
    return im


def build():
    out = Image.new("RGBA", (W, HT))
    out.alpha_composite(sky()); out.alpha_composite(world())
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
    H.save_png(im.resize((W * 2, HT * 2), Image.NEAREST), H.WORLD_DIR / "bg/farm_x2.png")
    overview(H.ROOT / "docs/album/przebudowa/b7-6_przeglad_farmy.png")
