"""Testy głosów (MT-02, PM-02). Uruchom: python3 tools/music/test_voices.py

Sprawdza: każdy kod z palety renderuje się (2, n) float32 bez NaN i bez przesterowania,
dominantę widma dla głosów strojonych, centroid dla perkusji i PAD, deterministykę
i odrzucanie złych nazw. Zapisuje arkusz odsłuchu do tmp/voice_sheet/ (nie commitowany).
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voices as V  # noqa: E402

SR = 44100
PALETTE = ["P12", "P25", "P50", "TRI", "PAD", "BELL", "BOX", "CEL", "GLK", "XYL", "EP", "BNJ",
           "PIZ", "HARP", "ACC", "BUZZ", "KICK", "SNR", "BRSH", "HAT", "SHK"]

# Głosy, których dominanta widma to częstotliwość nuty (sinusy i trójkąt).
PITCHED_DOMINANT = {"BELL": 60, "BOX": 60, "CEL": 60, "GLK": 60, "HARP": 60, "TRI": 60, "BUZZ": 57}


def spectrum(x):
    mono = x[0]
    win = np.hanning(len(mono))
    mag = np.abs(np.fft.rfft(mono * win))
    freqs = np.fft.rfftfreq(len(mono), 1.0 / SR)
    return freqs, mag


def centroid(x):
    f, m = spectrum(x)
    return float(np.sum(f * m) / np.sum(m))


def test_palette_complete():
    assert sorted(V.voice_names()) == sorted(PALETTE), "palette mismatch: %s" % V.voice_names()


def test_render_shape_peak_and_no_nan():
    rng = np.random.default_rng(1)
    for name in PALETTE:
        midi = 57 if name == "BUZZ" else 60
        a = V.render(name, midi, 1.0, 1.0, SR, rng)
        assert a.shape[0] == 2 and a.dtype == np.float32, name
        assert np.all(np.isfinite(a)), "NaN/inf in %s" % name
        peak = float(np.max(np.abs(a)))
        assert abs(peak - V.PEAK) < 1e-4, "%s peak %.4f" % (name, peak)
        assert peak <= 1.0, "clipping in %s" % name
        assert np.allclose(a[0], a[1]), "mono voice should be duplicated: %s" % name


def test_sustained_voices_last_dur():
    rng = np.random.default_rng(2)
    for name in ("PAD", "ACC", "BUZZ"):
        a = V.render(name, 60, 1.0, 1.0, SR, rng)
        assert a.shape[1] >= SR, "%s shorter than 1 s" % name


def test_decaying_voices_are_short():
    rng = np.random.default_rng(3)
    a = V.render("HAT", None, 0.0, 1.0, SR, rng)
    assert a.shape[1] < SR // 4, "closed hat too long"
    b = V.render("HAT", None, 0.2, 1.0, SR, rng)
    assert b.shape[1] > a.shape[1], "open hat should ring longer"


def test_pitched_dominant_frequency():
    rng = np.random.default_rng(4)
    for name, midi in PITCHED_DOMINANT.items():
        a = V.render(name, midi, 1.0, 1.0, SR, rng)
        f, m = spectrum(a)
        expected = V.midi_to_hz(midi)
        peak_f = f[int(np.argmax(m))]
        assert abs(peak_f - expected) <= 3.0, "%s dominant %.1f Hz, want %.1f" % (name, peak_f, expected)


def test_timbre_matches_description():
    rng = np.random.default_rng(5)
    checks = {
        "KICK": (0, 400),      # stopa: niskie
        "HAT": (6000, 22000),  # hi-hat: wysokie
        "SHK": (5000, 10000),  # shaker 5-10 kHz
        "BRSH": (3000, 9000),  # miotełki 3-9 kHz
        "SNR": (1000, 3000),   # werbel 1,8 kHz
        "PAD": (0, 2000),      # pad z dolnoprzepustem 2 kHz
    }
    for name, (lo, hi) in checks.items():
        midi = None if V.VOICES[name].get("drum") else 60
        c = centroid(V.render(name, midi, 1.0, 1.0, SR, rng))
        assert lo <= c <= hi, "%s centroid %.0f Hz outside %d-%d" % (name, c, lo, hi)


def test_lowpass_on_p12():
    rng = np.random.default_rng(6)
    a = V.render("P12", 60, 1.0, 1.0, SR, rng)
    f, m = spectrum(a)
    high = np.sum(m[f > 6000] ** 2) / np.sum(m ** 2)
    assert high < 0.05, "P12 has too much energy above 6 kHz (%.3f)" % high


def test_deterministic_for_same_seed():
    a = V.render("BOX", 62, 1.0, 0.8, SR, np.random.default_rng(9))
    b = V.render("BOX", 62, 1.0, 0.8, SR, np.random.default_rng(9))
    assert np.array_equal(a, b)


def test_bad_names_rejected():
    for bad in ("SAW", "noise_rain"):
        try:
            V.render(bad, 60, 1.0, 1.0, SR, None)
        except ValueError:
            continue
        raise AssertionError("%s accepted" % bad)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print("ok  " + t.__name__)
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                       "tmp", "voice_sheet")
    paths = V.render_sheet(out, SR)
    print("arkusz: %d plików w %s" % (len(paths), out))
    print("VOICES TEST OK")


if __name__ == "__main__":
    main()
