"""B3-6: lights.json v2 z plikow (sciezki <id>.png / <id>_on.png, klatki, kotwica blasku, maski, okna),
arkusz demo kazdego zrodla przy 4 porach dnia, test: wynik swiatla zawsze w palecie."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent)); sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
import light
import scena
import lights_art as LA
from PIL import Image, ImageDraw

GLOW = {"candle": (8, 9), "lamp_floor": (8, 10), "lamp_arc": (25, 14), "lantern_paper": (8, 8), "lamp_salt": (8, 8),
        "lamp_lava": (8, 14), "fairy_lights": (24, 8), "torch": (8, 6), "lamp_oil": (8, 8), "brazier": (8, 5),
        "lantern_garden": (8, 8), "lamp_post": (8, 5), "fireplace": (24, 34), "lamp_mushroom": (8, 16)}
ITEM_OF_KIND = {"lamp_floor": "lamp_floor", "lamp_mushroom": "lamp_mushroom", "lamp_arc": "lamp_arc",
                "lantern_paper": "lantern_paper", "lamp_salt": "lamp_salt", "lamp_lava": "lamp_lava",
                "fireplace": "fireplace", "candle": "candle", "fairy_lights": "fairy_lights", "window": "window_sun",
                "torch": "torch", "lamp_oil": "lamp_oil", "lantern": "lantern_garden", "lamp_street": "lamp_post",
                "brazier": "brazier"}
MASKS = {"window": "fx/beam_window.png", "lamp_floor": "fx/cone_shade.png", "lamp_arc": "fx/cone_shade.png",
         "fireplace": "fx/cone_fireplace.png", "lantern": "fx/glow_round.png", "lamp_street": "fx/glow_round.png"}


def contract():
    p = H.ROOT / "assets/data/lights.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    atlas = json.loads(H.ATLAS_FILE.read_text(encoding="utf-8"))["items"]
    d["version"] = 2
    d["files_note"] = ("Pliki wzgledem assets/world/. item = id w atlas.json: <file> = zrodlo wylaczone, light.on_file = pasek "
                       "klatek wlaczonego (klatki obok siebie, szerokosc = size[0]), light.fps. glow = punkt srodka blasku w px "
                       "przedmiotu (lewy-gorny rog = 0,0). mask = maska natezenia (alfa, 5 stopni) skalowana nearest. "
                       "Okno: window_tods[pora] = plik. dust = pasek 4 klatek 16x16 czasteczek kurzu w swietle.")
    d["dust"] = {"file": "fx/dust_motes.png", "frames": 4, "cell": 16, "fps": 4}
    for kind, s in d["sources"].items():
        iid = ITEM_OF_KIND.get(kind)
        if not iid or iid not in atlas:
            continue
        e = atlas[iid]
        s["item"] = iid
        s["file"] = e["file"]
        if "light" in e:
            s["on_file"] = e["light"]["on_file"]; s["frames"] = e["light"]["frames"]; s["fps"] = e["light"]["fps"]
        if kind == "window":
            s["window_tods"] = e["window_tods"]
        if iid in GLOW:
            s["glow"] = list(GLOW[iid])
        if kind in MASKS:
            s["mask"] = MASKS[kind]
    p.write_text(json.dumps(d, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return d


def demo(out):
    atlas = json.loads(H.ATLAS_FILE.read_text(encoding="utf-8"))["items"]
    pg = scena.pig()
    rows = []
    for iid, (dx, dy) in GLOW.items():
        if iid not in atlas or "light" not in atlas[iid]:
            continue
        e = atlas[iid]
        off = Image.open(H.WORLD_DIR / e["file"]).convert("RGBA")
        on = Image.open(H.WORLD_DIR / e["light"]["on_file"]).convert("RGBA").crop((0, 0, off.width, off.height))
        place = e["place"]
        cells = []
        for tod in ("morning", "day", "evening", "night"):
            cells.append(scena._stage(off, pg, place, tod, None))
        cells.append(scena._stage(off, pg, place, "night", None, on_item=on, ) if False else None)
        kind = {v: k for k, v in ITEM_OF_KIND.items()}[iid]
        lit = [scena._stage(off, pg, place, t, (kind, dx, dy), on_item=on) for t in ("morning", "day", "evening", "night")]
        # pierwsza kolumna: wylaczone w nocy; potem wlaczone 4 pory dnia
        night_off = scena._stage(off, pg, place, "night", None)
        row = [night_off] + lit
        rows.append((iid, row))
    cw, ch = rows[0][1][0].size
    W = max(r[1][0].width for r in rows)
    sc = 2
    cw = max(im.width for _, r in rows for im in r)
    ch = max(im.height for _, r in rows for im in r)
    sh = Image.new("RGB", (5 * cw * sc + 6 * 4, len(rows) * (ch * sc + 14) + 4), (36, 24, 36))
    d = ImageDraw.Draw(sh)
    for ri, (iid, r) in enumerate(rows):
        y = 4 + ri * (ch * sc + 14)
        d.text((4, y), f"{iid}: noc wylaczone | rano | dzien | wieczor | noc (wlaczone)", fill=(239, 220, 184))
        for ci, im in enumerate(r):
            sh.paste(im.convert("RGB").resize((im.width * sc, im.height * sc), Image.NEAREST), (4 + ci * (cw * sc + 4), y + 12))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    sh.save(out)
    return len(rows)


def palette_test():
    base = Image.new("RGBA", (96, 64), H.RAMPS["wood"][3] + (255,))
    for tod in ("morning", "day", "evening", "night"):
        o = light.render(base, tod, [("candle", 20, 30), ("fireplace", 70, 30), ("lamp_street", 48, 10), ("brazier", 48, 50)])
        px = {p[:3] for p in (o.get_flattened_data() if hasattr(o, "get_flattened_data") else o.getdata()) if p[3]}
        assert not (px - H.PALETTE), tod
    return True


if __name__ == "__main__":
    contract()
    print("zrodel w demo:", demo(H.ROOT / "docs/album/przebudowa/b3-6_zrodla_swiatla.png"))
    print("test palety:", palette_test())
