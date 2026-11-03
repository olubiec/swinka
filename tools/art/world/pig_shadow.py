"""B12-1/B12-2: cien kontaktowy pod swinka (3 etapy) i test czytelnosci swinek w pokojach (5 swinek x 5 pokoi x 4 pory)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
import handart as H
import light as L
import scena
import room_scenes as R
from PIL import Image

FX = H.WORLD_DIR / "fx"
SIZES = {"baby": (30, 6), "junior": (38, 6), "adult": (46, 6)}
PIGS = ("ned", "kuki", "glen", "james", "racuch")
TODS = ("morning", "day", "evening", "night")


def shadow(w, h):
    im = H.canvas(w, h)
    for y in range(h):
        for x in range(w):
            d = ((x + .5 - w / 2) / (w / 2)) ** 2 + ((y + .5 - h / 2) / (h / 2)) ** 2
            if d <= .62: H.put(im, x, y, "plum.1")
            elif d <= 1.0 and (x + y) % 2 == 0: H.put(im, x, y, "plum.1")        # polcien: szachowana krawedz
    return im


def build_shadows():
    for st, (w, h) in SIZES.items(): H.save_png(shadow(w, h), FX / f"shadow_pig_{st}.png")


def lum(a): return (a[..., :3] @ np.array([.299, .587, .114])) / 255.0


def room_bg(who):
    import json
    cfg = json.loads((H.ROOT / "assets/data/pig_rooms.json").read_text(encoding="utf-8"))["themes"][who]
    wt, ft = R._tile(cfg["wall_tile"]), R._tile(cfg["floor_tile"])
    bg = Image.new("RGBA", (R.W * 16, R.Ht * 16))
    for cx in range(R.W):
        for cy in range(R.Ht): bg.alpha_composite(wt if cy < R.WALL_ROWS else ft, (cx * 16, cy * 16))
    floor_y = R.Ht * 16 - 6; lights = []
    for iid, x, y in R.LAYOUT[who]:
        im = Image.open(H.WORLD_DIR / R.ATLAS[iid]["file"]).convert("RGBA")
        top = (floor_y - im.height + 2) if y is None else y
        if y is None and iid.startswith("sig_"): top = R.Ht * 16 - im.height - 4
        bg.alpha_composite(im, (x, top))
        if iid == "fairy_lights": lights.append(("fairy_lights", x + im.width // 2, top + 4))
    lights.append(("lamp_floor", 150, 40))
    return bg, lights, floor_y


def cell(room_who, pig_who, tod, stage="adult"):
    bg, lights, floor_y = room_bg(room_who)
    pg = scena.pig(pig_who, stage)
    px, py = R.W * 16 - pg.width - 4, floor_y - pg.height + 8
    sh = Image.open(FX / f"shadow_pig_{stage}.png").convert("RGBA")
    bg.alpha_composite(sh, (px + 32 - sh.width // 2, py + 57))
    lit = L.render(bg, tod, lights if tod != "day" else [])
    pl = L.render(pg, tod, [(k, a - px, b - py, .5) for k, a, b in lights] if tod != "day" else [], quantized=False)
    lit.alpha_composite(pl, (px, py))
    mask = np.zeros((lit.height, lit.width), bool)
    sub = np.array(pl)[:lit.height - py, :lit.width - px, 3] > 0
    mask[py:py + sub.shape[0], px:px + sub.shape[1]] = sub
    box_ = (max(px - 4, 0), max(py + 28, 0), min(px + 68, lit.width), min(py + 66, lit.height))
    ring = np.zeros_like(mask); ring[box_[1]:box_[3], box_[0]:box_[2]] = True
    lm = lum(np.array(lit)); bl = lum(np.array(L.render(bg, tod, lights if tod != "day" else [])))
    ring &= ~mask
    return lit.crop(box_), abs(lm[mask].mean() - bl[ring].mean()), lm[mask].mean()


def run():
    cw, ch = 76, 38
    out = Image.new("RGB", (len(TODS) * (cw + 2), len(PIGS) * len(PIGS) * (ch + 2)), (40, 40, 40))
    worst = []
    for i, r in enumerate(PIGS):
        for j, p in enumerate(PIGS):
            for k, t in enumerate(TODS):
                im, c, pl = cell(r, p, t)
                out.paste(im.convert("RGB"), (k * (cw + 2), (i * len(PIGS) + j) * (ch + 2)))
                worst.append((round(float(c), 3), round(float(pl), 3), p, r, t))
    worst.sort()
    return out, worst


if __name__ == "__main__":
    build_shadows()
    out, worst = run()
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    print("najnizszy kontrast swinka/tlo (roznica jasnosci, jasnosc swinki, swinka, pokoj, pora):")
    for w in worst[:8]: print("  ", w)
    out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(S / "b12-2.png")
    h2 = out.height // 2
    out.crop((0, 0, out.width, h2)).resize((out.width * 3, h2 * 3), Image.NEAREST).save(S / "b12-2a.png")
    out.crop((0, h2, out.width, out.height)).resize((out.width * 3, (out.height - h2) * 3), Image.NEAREST).save(S / "b12-2b.png")
    out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(H.ROOT / "docs/album/przebudowa/b12-2_czytelnosc_swinek.png")
