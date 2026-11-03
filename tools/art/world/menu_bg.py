"""B11-2: tlo menu / ekranu startowego 256x144: wieczor, stodola z sianem, lampy, cieple swiatlo (paleta domek z siana)."""
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import light
import farm_bg as F
import garden_bg as G
from PIL import Image

W, HT, HZ = F.W, F.HT, F.HORIZON
LAMPS = [(40, HZ + 40), (212, HZ + 46)]


def sky():
    bands = G.SKY["evening"]; n = len(bands); rj = random.Random(5)
    im = H.canvas(W, HZ + 8)
    for y in range(im.height):
        t = min(y / (HZ + 4), 1) * (n - 1); i, f = int(t), t - int(t)
        for x in range(W):
            k = min(n - 1, i + (1 if f > light.BAYER[y % 4, x % 4] + 0.5 + rj.uniform(-.18, .18) else 0))
            H.put(im, x, y, bands[k])
    r = random.Random(9)
    for _ in range(24): H.put(im, r.randint(0, W - 1), r.randint(0, 22), "linen.3")
    return im


def build():
    wim = F.world([])
    lights = [("lamp_street", x + 8, y + 5) for x, y in LAMPS]
    lit = light.render(wim, "evening", lights)
    out = Image.new("RGBA", (W, HT)); out.alpha_composite(sky()); out.alpha_composite(lit)
    lp = Image.open(H.WORLD_DIR / "park/lamp_post_on.png").convert("RGBA")
    for x, y in LAMPS: out.alpha_composite(lp, (x, y))
    return G._break(out)


if __name__ == "__main__":
    im = build(); H.save_png(im, H.WORLD_DIR / "bg/menu.png")
    H._update_json(H.TILES_FILE, lambda d: d["bg"].__setitem__("menu", {"file": "bg/menu.png", "size": [W, HT]}))
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    out = im.convert("RGB").resize((W * 3, HT * 3), Image.NEAREST)
    # podglad z panelem i naglowkiem
    import ui_a
    ld = lambda k: Image.open(ui_a.UI_DIR / f"{k}.png").convert("RGBA")
    pv = im.copy()
    pv.alpha_composite(ui_a.stretch(ld("header_banner"), [12, 0, 12, 0], 120, 24), (68, 14))
    pv.alpha_composite(ui_a.stretch(ld("panel_paper"), [8, 8, 8, 8], 80, 56), (88, 52))
    for i, st in enumerate(("normal", "hover", "pressed")):
        pv.alpha_composite(ui_a.stretch(ld("btn_" + st), [6, 6, 6, 6], 64, 14), (96, 58 + i * 16))
    pv.convert("RGB").resize((W * 3, HT * 3), Image.NEAREST).save(S / "b11-2.png")
    pv.convert("RGB").resize((W * 3, HT * 3), Image.NEAREST).save(H.ROOT / "docs/album/przebudowa/b11-2_menu.png")
