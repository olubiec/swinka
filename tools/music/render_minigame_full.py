#!/usr/bin/env python3
"""Miks `<gra>_full` (MT-42…46, plan: 4 pliki `_full` renderowane automatycznie).

Sumuje trzy stemy (base, rhythm, lead) jednej gry przez stems.build_stems i zamyka finish.finish
(LUFS z master.lufs, TP <= -1 dBTP). Specyfikacja `mg_<gra>_full` powstaje w pamięci z warstw trzech
specyfikacji stemów; nic nie jest zapisywane poza plikiem OGG.

Użycie:
  python3 tools/music/render_minigame_full.py hay_maze nyan_cuy veggie_memory veggie_rain
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import finish as F  # noqa: E402
import stems as ST  # noqa: E402

SPECS = os.path.join(HERE, "specs")
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), "assets", "music", "minigames")


def full_spec(game):
    parts = []
    base = None
    for stem in ST.STEM_NAMES:
        with open(os.path.join(SPECS, "mg_%s_%s.json" % (game, stem)), encoding="utf-8") as f:
            s = json.load(f)
        if base is None:
            base = copy.deepcopy(s)
        parts.extend(s["layers"])
    base["id"] = "mg_%s_full" % game
    base["layers"] = parts
    base["title"] = "%s · pełny miks" % game
    base["stem_of"] = None
    return base


def main(games):
    for game in games:
        spec = full_spec(game)
        stems = ST.build_stems(spec)
        out = os.path.join(OUT, spec["id"] + ".ogg")
        F.finish(stems[ST.FULL], spec, out_path=out)
        print("ok", out)


if __name__ == "__main__":
    main(sys.argv[1:])
