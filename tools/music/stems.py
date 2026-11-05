"""Stemy (MT-07, PM-08): jedna specyfikacja -> 3 stemy (base, rhythm, lead) + `_full`.

Użycie: from stems import build_stems; stems = build_stems(spec)  # {nazwa: (2, n) float32}

- Warstwy grupowane są po `layers[].stem` (base / rhythm / lead). Każda warstwa musi mieć stem.
- Stem bez warstw to cisza o tej samej długości co pozostałe.
- Wszystkie cztery tablice mają tę samą długość: ciało utworu plus ogon (jak sequencer.build).
- `_full` = base + rhythm + lead (przed finish.py; głośność całości ustala osobny krok).
- Warstwy, których sekwencer nie renderuje (noise.loop, drums), są w sekwencer.SKIPPED.
  Wtedy `_full` nie zawiera tych warstw; wywołujący powinien sprawdzić SKIPPED.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402

import sequencer as S  # noqa: E402

STEM_NAMES = ("base", "rhythm", "lead")
FULL = "_full"


def build_stems(spec):
    """Spec -> {"base", "rhythm", "lead", "_full"}: tablice (2, n) float32 o jednakowej długości n."""
    for layer in spec["layers"]:
        if layer.get("stem") not in STEM_NAMES:
            raise ValueError("warstwa %r nie ma stemu base/rhythm/lead" % layer["role"])
    rendered = S.build(spec)  # czyści S.SKIPPED
    body_len = int(round(spec["bars"] * spec["meter"] * 60.0 / spec["bpm"] * S.SR_DEFAULT))
    n = max([a.shape[1] for a in rendered.values()] + [body_len])

    stems = {name: np.zeros((2, n), dtype=np.float64) for name in STEM_NAMES}
    by_role = {layer["role"]: layer for layer in spec["layers"]}
    for role, audio in rendered.items():
        stems[by_role[role]["stem"]][:, :audio.shape[1]] += audio

    full = stems["base"] + stems["rhythm"] + stems["lead"]
    out = {name: stems[name].astype(np.float32) for name in STEM_NAMES}
    out[FULL] = full.astype(np.float32)
    return out
