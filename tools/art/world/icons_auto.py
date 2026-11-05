"""C2/C3: ikony 16x16 wyprowadzone z sprite'ow atlasu: przyciecie, skalowanie modalne (najczestszy kolor bloku),
przyciaganie do palety, nowy kontur. Uzycie: python3 tools/art/world/icons_auto.py [ids...] (podglad) | --apply"""
import json, sys
from collections import Counter
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H
import icons_a as A
from PIL import Image

AT = json.loads((H.ROOT / "assets/world/atlas.json").read_text())["items"]
BOX = 14


def derive(id_):
    src = Image.open(H.WORLD_DIR / AT[id_]["file"]).convert("RGBA")
    bb = src.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    src = src.crop(bb)
    w, h = src.size
    s = max(w, h) / BOX
    tw, th = max(1, round(w / s)), max(1, round(h / s))
    out = H.canvas(16, 16)
    ox, oy = (16 - tw) // 2, 15 - th - (16 - 2 - th) // 2 if False else (16 - th) // 2 + (0)
    for ty in range(th):
        for tx in range(tw):
            x0, x1 = int(tx * w / tw), max(int(tx * w / tw) + 1, int((tx + 1) * w / tw))
            y0, y1 = int(ty * h / th), max(int(ty * h / th) + 1, int((ty + 1) * h / th))
            cnt = Counter(); n = 0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    p = src.getpixel((x, y)); n += 1
                    if p[3] > 128 and sum(p[:3]) > 3 * 62: cnt[p[:3]] += 1
                    elif p[3] > 128: cnt[("o",)] += 0.5
            tot = sum(v for k, v in cnt.items() if k != ("o",))
            if tot * 2 >= n * 0.5 or (tot > 0 and tot >= n / 3):
                c = max((k for k in cnt if k != ("o",)), key=lambda k: cnt[k])
                out.putpixel((ox + tx, oy + ty), A.snap(c) + (255,))
    return H.outline(out)


if __name__ == "__main__":
    ids = [a for a in sys.argv[1:] if not a.startswith("--")]
    S = Path("/tmp/claude-0/-home-user/06cc83a8-7800-529c-8cf3-9903bd86f472/scratchpad")
    ims = [derive(i) for i in ids]
    sh = Image.new("RGBA", (20 * len(ims), 20), (120, 110, 100, 255))
    for k, im in enumerate(ims): sh.alpha_composite(im, (20 * k + 2, 2))
    sh.resize((sh.width * 6, sh.height * 6), Image.NEAREST).save(S / "ia.png")


C3 = ("fireplace lamp_mushroom lamp_floor lamp_arc lantern_paper lamp_salt lamp_lava pouf_boucle lace_curtain gramophone mug_steam "
      "rug_fringed blanket_folded mirror_wavy frames_gallery plant_pot plant_shelf plant_trailing memory_frame willow_tunnel torch "
      "lamp_oil brazier watering_can hay_basket stump_seat").split()


def apply(ids):
    j = json.loads(A.JSON.read_text(encoding="utf-8"))
    base = Image.open(A.SHEET).convert("RGBA")
    n0 = base.width // 16
    ids = [i for i in ids if i not in j["icons"]]
    full = Image.new("RGBA", (16 * (n0 + len(ids)), 16), (0, 0, 0, 0)); full.alpha_composite(base)
    css = []
    for k, i in enumerate(ids):
        full.alpha_composite(derive(i), (16 * (n0 + k), 0)); j["icons"][i] = n0 + k
        css.append(f".icon-{i.replace('_', '-')} {{ --i: {n0 + k}; }}")
    H.save_png(full, A.SHEET, indexed=False)
    A.JSON.write_text(json.dumps(j, indent=1, ensure_ascii=False), encoding="utf-8")
    (H.ROOT / "docs/icons_css_block.css").write_text(f"/* C2/C3: --icon-count = {n0 + len(ids)} */\n" + "\n".join(css) + "\n", encoding="utf-8")
    print(len(ids), "nowych, arkusz", n0 + len(ids))
    return ids
