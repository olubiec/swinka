"""Rejestr przedmiotow swiata: jedno zrodlo prawdy dla atlas.json.

Wpis: id -> {place, cells, light (rodzaj zrodla z lights.json albo None), recolor}.
Plik to zawsze <place>/<id>.png, kotwica dol-srodek. Rozmiary i recolor czytane
z assets/data/world_items.json (kontrakt kodu), swiatlo dopisane tu.

  python3 tools/art/world/registry.py            # raport: brakujace id i pliki
  python3 tools/art/world/registry.py --write    # atlas.json: dopisuje wpisy dla istniejacych plikow
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H  # noqa: E402

ITEMS_FILE = H.ROOT / "assets/data/world_items.json"

# przedmiot -> rodzaj zrodla swiatla (klucz w lights.json)
LIGHT = {
    "lamp_mushroom": "lamp_mushroom", "lamp_floor": "lamp_floor", "lamp_arc": "lamp_arc",
    "lantern_paper": "lantern_paper", "lamp_salt": "lamp_salt", "lamp_lava": "lamp_lava",
    "fireplace": "fireplace", "candle": "candle", "fairy_lights": "fairy_lights",
    "window_sun": "window", "lantern_garden": "lantern", "lamp_post": "lamp_street",
}


# Nowe przedmioty-zrodla swiatla spoza world_items.json (kontrakt kodu): id -> (miejsce, komorki).
# Wpis do danych sklepu i world_items.json zglaszam kodowi w przekazaniu (B13-5).
NEW_NOT_IN_ITEMS = {"fireplace": ("house", [3, 3]), "lamp_mushroom": ("house", [1, 2]), "lamp_floor": ("house", [1, 2]),
                    "lamp_arc": ("house", [2, 3]), "lantern_paper": ("house", [1, 1]), "lamp_salt": ("house", [1, 1]),
                    "lamp_lava": ("house", [1, 2]), "candle": ("both", [1, 1]), "torch": ("garden", [1, 2]),
                    "lamp_oil": ("garden", [1, 1]), "brazier": ("garden", [1, 1]), "willow_tunnel": ("garden", [3, 2])}


def registry():
    d = json.loads(ITEMS_FILE.read_text(encoding="utf-8"))["items"]
    reg = {}
    for i in d:
        place = i["place"][0]
        reg[i["id"]] = {"place": place, "cells": [i["w"], i["h"]], "layer": i.get("layer"),
                        "recolor": bool(i.get("recolor")), "light": LIGHT.get(i["id"]),
                        "file": f"{place}/{i['id']}.png"}
    return reg


def report():
    reg = registry()
    atlas = json.loads(H.ATLAS_FILE.read_text(encoding="utf-8"))["items"]
    missing_atlas = [k for k in reg if k not in atlas]
    missing_file = [k for k in reg if not (H.WORLD_DIR / reg[k]["file"]).exists()]
    bad_size = [k for k, e in atlas.items() if k in reg and e["cells"] != reg[k]["cells"]]
    extra = [k for k in atlas if k not in reg]
    lights = [k for k, v in reg.items() if v["light"]]
    nowe_bez_pliku = [k for k, (pl, _) in NEW_NOT_IN_ITEMS.items() if k not in atlas]
    return {"nowe_poza_world_items": sorted(NEW_NOT_IN_ITEMS), "nowe_bez_wpisu_w_atlasie": nowe_bez_pliku, "ids": len(reg), "bez_wpisu_w_atlasie": missing_atlas, "bez_pliku": missing_file,
            "rozmiar_niezgodny": bad_size, "nadmiarowe_w_atlasie": extra, "ze_swiatlem": lights}


def write_atlas():
    reg = registry()
    n = 0

    def upd(a):
        nonlocal n
        for k, v in reg.items():
            f = H.WORLD_DIR / v["file"]
            if k in a["items"] or not f.exists():
                continue
            w, h = v["cells"][0] * 16, v["cells"][1] * 16
            a["items"][k] = {"place": v["place"], "cells": v["cells"], "size": [w, h],
                             "file": v["file"], "anchor": [w // 2, h]}
            n += 1
    H._update_json(H.ATLAS_FILE, upd)
    return n


if __name__ == "__main__":
    if "--write" in sys.argv:
        print("dopisano", write_atlas())
    r = report()
    for k, v in r.items():
        print(f"{k}: {v}")
