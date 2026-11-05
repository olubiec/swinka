"""Testy sekwencera (MT-03, PM-07). Uruchom: python3 tools/music/test_sequencer.py

Sprawdza: 8-taktową próbkę z 3 warstwami (kształt, brak przesterowania, cisza, deterministykę),
czasy zdarzeń wzorów i swing, szew pętli po finish (5 kopii, LUFS, true peak), nieobsługiwany wzór.
Pliki tymczasowe w katalogu tymczasowym systemu, nie w assets/.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import finish as F  # noqa: E402
import sequencer as S  # noqa: E402

SR = 44100


def sample_spec(**over):
    spec = {
        "id": "test_seq", "kind": "bed", "title": "test", "bpm": 90, "meter": 4, "key": "C",
        "mode": "major", "bars": 8, "swing": 50, "seed": 4242,
        "chords": [{"bar": 1, "sym": "Cmaj9"}, {"bar": 3, "sym": "Am9"},
                   {"bar": 5, "sym": "Fmaj9"}, {"bar": 7, "sym": "G13sus"}],
        "layers": [
            {"role": "pad", "voice": "PAD", "db": -6, "pattern": "chords.sustain"},
            {"role": "mel", "voice": "BELL", "db": -4, "pattern": "melody.skeleton",
             "from_bar": 3, "register": "C4-G5"},
            {"role": "chd", "voice": "P25", "db": -10, "pattern": "chords.offbeat_2_4"},
        ],
        "drums": None,
        "fx": [{"fx": "REV-S", "wet": 0.12, "on": "BELL"}, {"fx": "LP(8000)", "on": "all"}],
        "master": {"lufs": -18, "ceiling_dbtp": -1},
        "loop": {"enabled": True},
        "stem_of": None,
    }
    spec.update(over)
    return spec


def decode(path):
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error", "-i", path,
                           "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"],
                          stdout=subprocess.PIPE, check=True)
    return np.frombuffer(proc.stdout, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def test_three_layers_clean():
    spec = sample_spec()
    layers = S.build(spec)
    assert set(layers) == {"pad", "mel", "chd"}, layers.keys()
    lengths = {a.shape[1] for a in layers.values()}
    assert len(lengths) == 1, "warstwy mają różne długości"
    body = int(round(8 * 4 * 60.0 / 90 * SR))
    assert lengths.pop() >= body
    mix = np.zeros((2, max(a.shape[1] for a in layers.values())))
    for name, a in layers.items():
        assert a.dtype == np.float32 and a.shape[0] == 2, name
        assert np.all(np.isfinite(a)), name
        assert np.sqrt(np.mean(a.astype(np.float64) ** 2)) > 1e-4, "warstwa %s jest cicha" % name
        mix[:, :a.shape[1]] += a
    assert np.max(np.abs(mix)) < 0.99, "suma warstw przesterowana: %.3f" % np.max(np.abs(mix))
    assert S.SKIPPED == [], S.SKIPPED
    again = S.build(spec)
    for name in layers:
        assert np.array_equal(layers[name], again[name]), "build nie jest deterministyczny: " + name
    print("  3 warstwy: kształt, cisza, przesterowanie, deterministyka OK, szczyt %.3f" % np.max(np.abs(mix)))


def test_event_timing_and_swing():
    spec = sample_spec()
    ev = S.layer_events(spec, spec["layers"][2])  # chords.offbeat_2_4
    times = sorted({e["t_beats"] for e in ev})
    want = sorted(b * 4 + off for b in range(8) for off in (1.5, 3.5))
    assert times == want, times[:6]

    spec66 = sample_spec(swing=66)
    ev66 = S.layer_events(spec66, spec66["layers"][2])
    times66 = sorted({e["t_beats"] for e in ev66})
    assert abs(times66[0] - (1.5 + 0.16)) < 1e-9, times66[0]
    assert all(abs(a - b) < 1e-9 for a, b in zip(sorted({e["t_beats"] for e in S.layer_events(
        spec, spec["layers"][0])}), sorted({e["t_beats"] for e in S.layer_events(
        spec66, spec66["layers"][0])}))), "swing nie powinien ruszać nut na uderzeniach"

    mel = S.layer_events(spec, spec["layers"][1])
    assert min(e["t_beats"] for e in mel) >= 2 * 4 - 1e-9, "melodia zaczyna się przed from_bar"
    assert all(60 <= e["midi"] <= 79 for e in mel), "melodia poza rejestrem C4-G5"
    print("  zdarzenia: offbeat 1,5/3,5 w 8 taktach, swing 66 (+0,16), rejestr melodii OK")


def test_loop_seam_and_levels():
    spec = sample_spec()
    audio = np.sum(list(S.build(spec).values()), axis=0).astype(np.float64)
    with tempfile.TemporaryDirectory() as tmp:
        out = F.finish(audio, spec, out_path=os.path.join(tmp, "test_seq.ogg"))
        rep = dict(F.LAST_REPORT)
        x = decode(out)
    assert abs(rep["lufs"] - spec["master"]["lufs"]) <= 0.5, rep
    assert rep["true_peak_dbtp"] <= -1.0 + 0.05, rep
    # szew: pięć kopii, skok na granicy nie większy niż typowy skok w próbce
    loop5 = np.concatenate([x] * 5, axis=1)
    typical = np.percentile(np.abs(np.diff(x, axis=1)), 99.9) + 1e-3
    seams = [abs(loop5[0, k * x.shape[1] - 1] - loop5[0, k * x.shape[1]]) for k in range(1, 5)]
    assert max(seams) <= 2.0 * typical, (max(seams), typical)
    print("  pętla: LUFS %.2f, TP %.2f dBTP, szew max %.4f (typowy skok %.4f)" % (
        rep["lufs"], rep["true_peak_dbtp"], max(seams), typical))


def test_unsupported_pattern_raises():
    spec = sample_spec()
    spec["layers"][0]["pattern"] = "bass.walking"
    try:
        S.build(spec)
    except NotImplementedError:
        print("  nieobsługiwany wzór zgłasza NotImplementedError")
        return
    raise AssertionError("bass.walking powinien zgłaszać NotImplementedError")


def test_noise_and_drums_skipped():
    spec = sample_spec(drums={"kit": "chip_drive", "levels": {"KICK": -6}})
    spec["layers"].append({"role": "rain", "voice": "noise_rain", "db": -20,
                           "pattern": "noise.loop(noise_rain, -20)"})
    layers = S.build(spec)
    assert "rain" not in layers and set(layers) == {"pad", "mel", "chd"}
    roles = [r for r, _ in S.SKIPPED]
    assert roles == ["rain", "drums"], roles
    print("  szum i perkusja pominięte z wpisem w SKIPPED")


def main():
    tests = [test_three_layers_clean, test_event_timing_and_swing, test_loop_seam_and_levels,
             test_unsupported_pattern_raises, test_noise_and_drums_skipped]
    for t in tests:
        print(t.__name__)
        t()
    print("TEST OK: sekwencer, %d testów" % len(tests))
    return 0


if __name__ == "__main__":
    sys.exit(main())
