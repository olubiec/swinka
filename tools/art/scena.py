"""scena.py: arkusz bramki (c) dla przedmiotu: przedmiot + swinka w skali,
3 oswietlenia (dzien, wieczor z lampa, noc ze zrodlem przedmiotu lub swiecą),
4 warianty koloru (brick -> brick/dusk/moss/linen) i pomniejszenie 1x/2x.

    from scena import gate
    gate("sofa_cosy", img, "docs/album/przebudowa/sofa_cosy.png",
         light=("lamp_floor", dx, dy), recolor=True)

Swinka: pierwsza klatka `idle` wybranej swinki (domyslnie glen/adult), kotwica
dol-srodek, stoi obok przedmiotu na tej samej linii podlogi. Swinke oswietla
sie bez kwantyzacji (tint), przedmiot z kwantyzacja do palety.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import handart as H  # noqa: E402
import light as L  # noqa: E402

ROOT = H.ROOT
FLOOR = {"house": "wood.3", "garden": "moss.2", "park": "moss.3", "farm": "hay.1", "market": "linen.1"}
VARIANTS = [("brick", "brick"), ("brick", "dusk"), ("brick", "moss"), ("brick", "linen")]


def pig(who="glen", stage="adult"):
    d = ROOT / "assets/sprites/pigs" / who / stage
    meta = json.loads((d / "animations.json").read_text(encoding="utf-8"))
    fw, fh = meta["frame_size"] if isinstance(meta["frame_size"], list) else (meta["frame_size"],) * 2
    row = meta["animations"]["idle"]["row"]
    sheet = Image.open(d / "spritesheet.png").convert("RGBA")
    return sheet.crop((0, row * fh, fw, row * fh + fh))


def _stage(item, pig_im, place, tod, light, gap=6, on_item=None):
    """Jedna scena: tlo podlogi, przedmiot, swinka obok, oswietlenie."""
    w = item.width + gap + pig_im.width + 24
    h = max(item.height, pig_im.height) + 28
    floor_y = h - 14
    bg = Image.new("RGBA", (w, h), H.color(FLOOR.get(place, "wood.3")) + (255,))
    wall = H.color("linen.1" if place in ("house", "market") else "dusk.3")
    bg.paste(Image.new("RGBA", (w, floor_y - 18), wall + (255,)), (0, 0))
    if on_item is not None and tod != "day":
        item = on_item
    ix, iy = 12, floor_y - item.height
    bg.alpha_composite(item, (ix, iy))
    px_, py_ = ix + item.width + gap, floor_y - pig_im.height
    base = bg.copy()
    lights = []
    if light and tod != "day":
        kind, dx, dy = light
        lights.append((kind, ix + dx, iy + dy, 0.6))
    scene_lit = L.render(base, tod, lights)
    # swinka osobno, tint bez kwantyzacji
    pl = L.render(pig_im, tod, [(k, x - px_, y - py_, sc) for k, x, y, sc in lights], quantized=False)
    scene_lit.alpha_composite(pl, (px_, py_))
    return scene_lit


def gate(item_id, item, out, place="house", light=None, recolor=False, who="glen", scale=4, on_item=None):
    """Zapisuje arkusz bramki. light = (rodzaj_zrodla, dx, dy) wzgledem lewego-gornego rogu przedmiotu."""
    pg = pig(who)
    tods = [("dzien", "day"), ("wieczor", "evening"), ("noc", "night")]
    row1 = [_stage(item, pg, place, t, light, on_item=on_item) for _, t in tods]
    variants = [item] if not recolor else [H.recolor(item, a, b) if a != b else item for a, b in VARIANTS]
    row2 = [_stage(v, pg, place, "evening", light, on_item=on_item) for v in variants]
    small = [row1[0].copy() for _ in range(0)]
    cw, ch = row1[0].size
    cols = max(len(row1), len(row2))
    W = cols * (cw * scale + 8) + 8
    H_ = 2 * (ch * scale + 22) + 40 + ch * 2 + 10
    sheet = Image.new("RGB", (W, H_), H.color("plum.0"))
    d = ImageDraw.Draw(sheet)
    d.text((8, 4), f"{item_id}  |  dzien, wieczor, noc  |  warianty (wieczor)  |  1x i 2x", fill=H.color("linen.2"))
    y = 18
    for i, im in enumerate(row1):
        sheet.paste(im.resize((cw * scale, ch * scale), Image.NEAREST), (8 + i * (cw * scale + 8), y))
    y += ch * scale + 6
    for i, im in enumerate(row2):
        sheet.paste(im.resize((cw * scale, ch * scale), Image.NEAREST), (8 + i * (cw * scale + 8), y))
    y += ch * scale + 6
    x = 8
    for k in (1, 2):
        s = row1[1].resize((cw * k, ch * k), Image.NEAREST)
        sheet.paste(s, (x, y)); x += cw * k + 8
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    sheet.crop((0, 0, W, y + ch * 2 + 6)).save(out)
    return out


if __name__ == "__main__":
    # demo: stary sofa_cosy z atlasu
    it = Image.open(ROOT / "assets/world/house/sofa_cosy.png").convert("RGBA")
    print(gate("sofa_cosy_demo", it, sys.argv[1] if len(sys.argv) > 1 else "/tmp/scena_demo.png",
               light=("lamp_floor", 24, 8), recolor=True))


def group(items, out, place="house", lights=(), who="glen", scale=3, on=None):
    """Scena zbiorcza: przedmioty w rzedzie + swinka w skali, dzien / wieczor / noc.
    items: lista obrazow (kotwica dol); lights: [(rodzaj, x, y)] we wspolrzednych sceny, na kazdej wysokosci;
    on: {indeks_przedmiotu: obraz_wlaczony} podmieniany wieczorem i noca."""
    from PIL import Image, ImageDraw
    pg = pig(who)
    gap = 6
    W = sum(i.width for i in items) + gap * (len(items) + 1) + pg.width + 8
    Hh = max(max(i.height for i in items), pg.height) + 30
    floor_y = Hh - 12
    panels = []
    for tod in ("day", "evening", "night"):
        bg = Image.new("RGBA", (W, Hh), H.color(FLOOR.get(place, "wood.3")) + (255,))
        bg.paste(Image.new("RGBA", (W, floor_y - 20), H.color("linen.1" if place in ("house", "market") else "dusk.3") + (255,)), (0, 0))
        x = gap
        for k, it in enumerate(items):
            im = on[k] if (on and k in on and tod != "day") else it
            bg.alpha_composite(im, (x, floor_y - im.height))
            x += im.width + gap
        lit = L.render(bg, tod, list(lights) if tod != "day" else [])
        px_, py_ = x, floor_y - pg.height
        pl = L.render(pg, tod, [(k_, a - px_, b - py_, 0.5) for k_, a, b in (lights if tod != "day" else [])], quantized=False)
        lit.alpha_composite(pl, (px_, py_))
        panels.append(lit)
    sheet = Image.new("RGB", (W * scale * 3 + 16, Hh * scale + 6), H.color("plum.0"))
    for i, p in enumerate(panels):
        sheet.paste(p.convert("RGB").resize((W * scale, Hh * scale), Image.NEAREST), (4 + i * (W * scale + 4), 3))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out
