"""Testy stemów (MT-07, PM-08). Uruchom: python3 tools/music/test_stems.py

Sprawdza: 3 stemy i `_full` mają identyczną liczbę próbek, `_full` = suma stemów = suma warstw
z sekwencera, pusty stem to cisza, warstwa bez stemu jest błędem, warstwa pominięta przez
sekwencer (noise.loop) nie psuje długości i trafia do SKIPPED.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sequencer as S  # noqa: E402
import stems as ST  # noqa: E402


def sample_spec(**over):
    spec = {
        "id": "test_stems", "kind": "minigame", "title": "test", "bpm": 120, "meter": 4, "key": "C",
        "mode": "major", "bars": 4, "swing": 50, "seed": 99,
        "chords": [{"bar": 1, "sym": "Cmaj9"}, {"bar": 3, "sym": "Am9"}],
        "layers": [
            {"role": "bass", "voice": "TRI", "db": -3, "pattern": "bass.root_fifth", "stem": "base"},
            {"role": "chd", "voice": "P25", "db": -8, "pattern": "chords.offbeat_2_4",
             "stem": "rhythm", "from_bar": 3},
            {"role": "mel", "voice": "XYL", "db": -4, "pattern": "random.pentatonic_walk",
             "stem": "lead", "from_bar": 2, "register": "C4-G5"},
        ],
        "drums": None,
        "fx": [{"fx": "REV-S", "wet": 0.1, "on": "all"}],
        "master": {"lufs": -16, "ceiling_dbtp": -1},
        "loop": {"enabled": True},
        "stem_of": None,
    }
    spec.update(over)
    return spec


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)


def test_lengths_and_sum():
    stems = ST.build_stems(sample_spec())
    check(set(stems) == {"base", "rhythm", "lead", "_full"}, "zły zestaw kluczy: %s" % sorted(stems))
    shapes = {name: a.shape for name, a in stems.items()}
    check(len(set(shapes.values())) == 1, "różne kształty: %s" % shapes)
    check(all(a.dtype == np.float32 for a in stems.values()), "dtype inny niż float32")
    n = shapes["_full"][1]
    check(n >= int(round(4 * 4 * 60.0 / 120 * S.SR_DEFAULT)), "za krótki utwór: %d" % n)
    total = stems["base"] + stems["rhythm"] + stems["lead"]
    check(np.allclose(stems["_full"], total, atol=1e-6), "_full != base+rhythm+lead")
    check(float(np.max(np.abs(stems["_full"]))) > 0.01, "_full cichy")


def test_full_equals_layer_mix():
    spec = sample_spec()
    stems = ST.build_stems(spec)
    layers = S.build(spec)
    mix = np.sum([a.astype(np.float64) for a in layers.values()], axis=0)
    check(np.allclose(stems["_full"], mix, atol=1e-5), "_full != suma warstw sekwencera")
    check(float(np.max(np.abs(stems["base"]))) > 0.01, "stem base cichy")
    check(float(np.max(np.abs(stems["lead"]))) > 0.01, "stem lead cichy")


def test_empty_stem_is_silent_and_same_length():
    spec = sample_spec()
    spec["layers"] = [layer for layer in spec["layers"] if layer["stem"] != "rhythm"]
    stems = ST.build_stems(spec)
    check(stems["rhythm"].shape == stems["base"].shape, "pusty stem ma inną długość")
    check(not np.any(stems["rhythm"]), "pusty stem nie jest ciszą")


def test_missing_stem_rejected():
    spec = sample_spec()
    del spec["layers"][0]["stem"]
    try:
        ST.build_stems(spec)
    except ValueError:
        return
    raise AssertionError("warstwa bez stemu nie została odrzucona")


def test_skipped_layer_keeps_lengths():
    spec = sample_spec()
    spec["layers"].append({"role": "szum", "voice": "noise_rain", "db": -20,
                           "pattern": "noise.loop(rain, -20)", "stem": "rhythm"})
    stems = ST.build_stems(spec)
    check(any(role == "szum" for role, _ in S.SKIPPED), "noise.loop nie trafił do SKIPPED")
    lengths = {a.shape[1] for a in stems.values()}
    check(len(lengths) == 1, "różne długości przy pominiętej warstwie")


def test_deterministic():
    a = ST.build_stems(sample_spec())
    b = ST.build_stems(sample_spec())
    check(all(np.array_equal(a[k], b[k]) for k in a), "ten sam seed daje inne stemy")


def main():
    tests = [test_lengths_and_sum, test_full_equals_layer_mix, test_empty_stem_is_silent_and_same_length,
             test_missing_stem_rejected, test_skipped_layer_keeps_lengths, test_deterministic]
    for t in tests:
        t()
        print("ok", t.__name__)
    print("TEST OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
