"""Testy sekwencera (MT-03, PM-07). Uruchom: python3 tools/music/test_sequencer.py

Sprawdza: 8-taktową próbkę z 3 warstwami (kształt, brak przesterowania, cisza, deterministykę),
czasy zdarzeń wzorów i swing, szew pętli po finish (5 kopii, LUFS, true peak), nieobsługiwany wzór.
Pliki tymczasowe w katalogu tymczasowym systemu, nie w assets/.
"""
import math
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


def groove_spec(pattern, meter=4, swing=50, bars=4):
    """Specyfikacja jednej warstwy wzoru groove; akordy jak w sample_spec, bez fx."""
    spec = sample_spec(meter=meter, swing=swing, bars=bars, drums=None, fx=[])
    spec["chords"] = [{"bar": 1, "sym": "Cmaj9"}, {"bar": 2, "sym": "Am9"},
                      {"bar": 3, "sym": "Fmaj9"}, {"bar": 4, "sym": "G13"}]
    spec["layers"] = [{"role": "x", "voice": "TRI", "db": -6, "pattern": pattern}]
    return spec


def test_walking_bass():
    spec = groove_spec("bass.walking")
    ev = S.layer_events(spec, spec["layers"][0])
    assert len(ev) == 4 * 4, len(ev)  # 4 ćwierćnuty na takt
    assert all(abs(e["dur_beats"] - 1.0) < 1e-9 for e in ev), "ćwierćnuty mają trwać 1 uderzenie"
    times = sorted(e["t_beats"] for e in ev)
    assert times == [float(i) for i in range(16)], times  # równo co uderzenie, bez offbeatów
    assert all(39 <= e["midi"] <= 52 for e in ev), "bas poza rejestrem 39-52 (podejście może być o pół tonu niżej)"
    by_bar = {}
    for e in ev:
        by_bar.setdefault(int(e["t_beats"] // 4), []).append(e["midi"])
    # takt 1 (Cmaj9): korzeń C (48), tercja E (52), kwinta G (43), podejście do Am (A=45 -> 44)
    assert by_bar[0] == [48, 52, 43, 44], by_bar[0]
    assert by_bar[0][3] == by_bar[1][0] - 1, "ostatnie uderzenie taktu podchodzi półtonem do korzenia następnego"
    assert by_bar[3][3] == by_bar[0][0] - 1, "ostatni takt zapętlony: podejście do korzenia taktu 1"
    sw = S.layer_events(groove_spec("bass.walking", swing=66), groove_spec("bass.walking", swing=66)["layers"][0])
    assert sorted(e["t_beats"] for e in sw) == times, "swing nie powinien przesuwać ćwierćnut"
    three = S.layer_events(groove_spec("bass.walking", meter=3), groove_spec("bass.walking", meter=3)["layers"][0])
    assert len(three) == 4 * 3, len(three)
    print("  bass.walking: 4 ćwierćnuty/takt, rejestr 40-52, podejście półtonem, swing bez wpływu OK")


def test_arp8():
    spec = groove_spec("chords.arp8")
    ev = S.layer_events(spec, spec["layers"][0])
    assert len(ev) == 8 * 4, len(ev)  # osiem ósemek na takt
    assert all(abs(e["dur_beats"] - 0.5) < 1e-9 for e in ev)
    times = sorted({e["t_beats"] for e in ev})
    want = sorted(b * 4 + k * 0.5 for b in range(4) for k in range(8))
    assert times == want, times[:10]
    assert all(60 <= e["midi"] <= 71 for e in ev), "arpeggio poza rejestrem C4-B4"
    chords = ["Cmaj9", "Am9", "Fmaj9", "G13"]
    for bar, sym in enumerate(chords):
        notes, _ = S.T.chord_notes(sym)
        tones = S._voice_chord(notes, 60)
        got = [e["midi"] for e in sorted(ev, key=lambda e: e["t_beats"])
               if int(e["t_beats"] // 4) == bar]
        assert got == [tones[i % len(tones)] for i in range(8)], (sym, got, tones)
    sw = S.layer_events(groove_spec("chords.arp8", swing=66), groove_spec("chords.arp8", swing=66)["layers"][0])
    off = [e["t_beats"] for e in sw if abs(e["t_beats"] - math.floor(e["t_beats"]) - 0.5) < 1e-9
           or abs(e["t_beats"] - math.floor(e["t_beats"]) - 0.66) < 1e-6]
    assert off and all(abs(t - (math.floor(t) + 0.66)) < 1e-9 for t in off), "swing 66 nie przesunął offbeatów"
    print("  chords.arp8: 8 ósemek/takt, rejestr 60-71, cykl tonów, swing 66 na offbeatach OK")


def off_of(ev):
    return [e for e in ev if abs(e["t_beats"] - math.floor(e["t_beats"]) - 0.5) < 1e-9]


def test_brush_and_hat_swing():
    for pattern, per_beat, vel_on in (("drums.brush_swing", None, None), ("drums.hat_swing", 2, 0.5)):
        spec = groove_spec(pattern)
        ev = S.layer_events(spec, spec["layers"][0])
        if pattern == "drums.brush_swing":
            # 4/4: 2 akcenty (uderzenia 2 i 4) + 4 ghosty (offbeaty) na takt
            assert len(ev) == 6 * 4, len(ev)
            on = [e for e in ev if abs(e["t_beats"] - math.floor(e["t_beats"])) < 1e-9]
            assert sorted(e["t_beats"] % 4 for e in on) == [1.0] * 4 + [3.0] * 4, "akcenty nie na 2 i 4"
            assert all(e["vel"] > 0.5 for e in on) and all(e["vel"] < 0.5 for e in off_of(ev)), "akcent/ghost"
        else:
            assert len(ev) == per_beat * 4 * 4, len(ev)  # ósemki: 8 na takt
            on = [e for e in ev if abs(e["t_beats"] - math.floor(e["t_beats"])) < 1e-9]
            assert len(on) == 16 and all(e["vel"] > 0 for e in ev)
        off = [e for e in ev if abs(e["t_beats"] - math.floor(e["t_beats"]) - 0.5) < 1e-9]
        assert len(off) == len(ev) - len(on), "zły podział na uderzenia i offbeaty"
        assert all(0 <= e["t_beats"] % 4 < 4 for e in ev), "zdarzenie poza taktem"
        assert all(e["voice"] == "TRI" for e in ev)
        sw = S.layer_events(groove_spec(pattern, swing=66), groove_spec(pattern, swing=66)["layers"][0])
        sw_off = [e["t_beats"] for e in sw if abs(e["t_beats"] - math.floor(e["t_beats"]) - 0.66) < 1e-6]
        assert len(sw_off) == len(off), "swing 66 nie przesunął offbeatów o 0,16"
        sw_on = sorted(e["t_beats"] for e in sw if abs(e["t_beats"] - math.floor(e["t_beats"])) < 1e-9)
        assert sw_on == sorted(e["t_beats"] for e in on), "uderzenia nie powinny się przesuwać"
        three = S.layer_events(groove_spec(pattern, meter=3), groove_spec(pattern, meter=3)["layers"][0])
        want3 = 4 * 4 if pattern == "drums.brush_swing" else 6 * 4  # 3/4: akcent na 2 + 3 ghosty; 6 ósemek
        assert len(three) == want3, (pattern, len(three))
    print("  drums.brush_swing i drums.hat_swing: liczba zdarzeń, takt, offbeaty przesunięte swingiem OK")


def test_chords_rolled():
    spec = sample_spec(layers=[{"role": "pad", "voice": "PAD", "db": -6, "pattern": "chords.rolled"}])
    ev = S.layer_events(spec, spec["layers"][0])
    by_bar = {}
    for e in ev:
        by_bar.setdefault(int(e["t_beats"] // 4), []).append(e)
    assert sorted(by_bar) == list(range(8))
    prev = None
    for bar in range(8):
        es = sorted(by_bar[bar], key=lambda e: e["t_beats"])
        mids = [e["midi"] for e in es]
        assert 5 <= len(mids) <= 5 and mids == sorted(mids), mids
        assert [e["t_beats"] for e in es] == sorted(e["t_beats"] for e in es)
        assert es[1]["t_beats"] > es[0]["t_beats"], "brak rozłożenia (roll)"
        assert all(e["t_beats"] + e["dur_beats"] >= (bar + 1) * 4 for e in es), "akord urywa się przed końcem taktu"
        if prev is not None:
            move = sum(abs(a - b) for a, b in zip(mids[1:], prev[1:]))
            assert move <= 16, "słabe prowadzenie głosów (%d półtonów)" % move
        prev = mids
    assert S.build(spec)["pad"].shape[0] == 2
    print("  chords.rolled: 5 głosów, roll, prowadzenie głosów OK")


def test_unsupported_pattern_raises():
    spec = sample_spec()
    spec["layers"][0]["pattern"] = "bass.bossa"
    try:
        S.build(spec)
    except NotImplementedError:
        print("  nieobsługiwany wzór zgłasza NotImplementedError")
        return
    raise AssertionError("bass.bossa powinien zgłaszać NotImplementedError")


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
             test_walking_bass, test_arp8, test_brush_and_hat_swing, test_chords_rolled,
             test_unsupported_pattern_raises, test_noise_and_drums_skipped]
    for t in tests:
        print(t.__name__)
        t()
    print("TEST OK: sekwencer, %d testów" % len(tests))
    return 0


if __name__ == "__main__":
    sys.exit(main())
