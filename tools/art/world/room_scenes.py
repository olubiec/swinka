"""B4-9: sceny pokoi swinek (5 zrzutow + przeglad). 10x7 kafli, dzien / wieczor / noc."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import light as L
import scena
from PIL import Image

ATLAS = json.loads(H.ATLAS_FILE.read_text(encoding="utf-8"))["items"]
TILES = json.loads(H.TILES_FILE.read_text(encoding="utf-8"))["tiles"]
WALL_ROWS, W, Ht = 4, 10, 7
LAYOUT = {   # id -> (x_lewy, y_gora | None = na podlodze)
    "kuki": [("window_sun", 8, 14), ("side_table", 52, None), ("cushion_big", 70, None), ("sig_kuki_blanket", 18, None)],
    "ned": [("shelf_small", 14, 20), ("cushion_big", 44, None), ("hay_bar_wood", 62, None), ("sig_ned_snack_nook", 10, None)],
    "james": [("curtains_dots", 10, 16), ("fairy_lights", 50, 8), ("cosy_nook", 60, None), ("sig_james_hideout", 10, None)],
    "glen": [("bookshelf", 4, None), ("sig_glen_knit_bed", 38, None), ("armchair", 74, None), ("cushion_big", 110, None)],
    "racuch": [("hanging_planter", 40, 12), ("fairy_lights", 4, 6), ("toy_basket", 60, None), ("sig_racuch_hop_pad", 6, None)],
}


def _tile(tid):
    return Image.open(H.WORLD_DIR / TILES[tid]["file"]).convert("RGBA")


def room(who, scale=3):
    d = json.loads((H.ROOT / "assets/data/pig_rooms.json").read_text(encoding="utf-8"))
    cfg = d["themes"][who]
    wt, ft = _tile(cfg["wall_tile"]), _tile(cfg["floor_tile"])
    bg = Image.new("RGBA", (W * 16, Ht * 16))
    for cx in range(W):
        for cy in range(Ht):
            bg.alpha_composite(wt if cy < WALL_ROWS else ft, (cx * 16, cy * 16))
    floor_y = Ht * 16 - 6
    lights = []
    for iid, x, y in LAYOUT[who]:
        e = ATLAS[iid]
        im = Image.open(H.WORLD_DIR / e["file"]).convert("RGBA")
        top = (floor_y - im.height + 2) if y is None else y
        if y is None and iid.startswith("sig_"):
            top = Ht * 16 - im.height - 4
        bg.alpha_composite(im, (x, top))
        if iid == "fairy_lights":
            lights.append(("fairy_lights", x + im.width // 2, top + 4))
    lights.append(("lamp_floor", 150, 40))
    pg = scena.pig(who)
    panels = []
    for tod in ("day", "evening", "night"):
        pan = L.render(bg, tod, lights if tod != "day" else [])
        pp = L.render(pg, tod, [(k, a - 90, b - 40, .5) for k, a, b in lights] if tod != "day" else [], quantized=False)
        pan.alpha_composite(pp, (W * 16 - pg.width - 4, floor_y - pg.height + 8))
        panels.append(pan)
    return panels


def build(out_dir, scale=3):
    sheets = {}
    for who in LAYOUT:
        ps = room(who)
        w, h = ps[0].size
        s = Image.new("RGB", (w * scale * 3 + 16, h * scale + 6), H.color("plum.0"))
        for i, p in enumerate(ps):
            s.paste(p.convert("RGB").resize((w * scale, h * scale), Image.NEAREST), (4 + i * (w * scale + 4), 3))
        Path(out_dir).mkdir(parents=True, exist_ok=True)
        s.save(Path(out_dir) / f"b4-9_pokoj_{who}.png")
        sheets[who] = ps
    w, h = sheets["kuki"][1].size
    s = Image.new("RGB", (w * 2 * 3 + 12, h * 2 * 2 + 10), H.color("plum.0"))
    for i, who in enumerate(sheets):
        s.paste(sheets[who][1].convert("RGB").resize((w * 2, h * 2), Image.NEAREST), (4 + (i % 3) * (w * 2 + 2), 4 + (i // 3) * (h * 2 + 2)))
    s.save(Path(out_dir) / "b4-9_przeglad_domu.png")


if __name__ == "__main__":
    build(H.ROOT / "docs/album/przebudowa")
