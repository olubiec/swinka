"""Szum MT-22: ton pokoju (pętla 10 s, stereo). Generowany kodem, bez melodii.

Składniki okresowe (dziedzina częstości na pełnej pętli; zdarzenia zawijane modulo),
więc szew pętli jest bezszwowy. Uruchomienie: python3 tools/music/noise/noise_room_tone.py
"""
import os
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, "tools", "music"))
import finish  # noqa: E402

NAME = "noise_room_tone"
SEED = 50065
SR = 44100
DUR_S = 10.0
N = int(round(DUR_S * SR))  # 441000
PEAK_LIMIT_DBFS = -3.5
OUT = os.path.join(ROOT, "assets", "music", "noise", NAME + ".ogg")


def rms(x):
    return float(np.sqrt(np.mean(x * x)))


def to_rms(x, db):
    return x * (10.0 ** (db / 20.0) / rms(x))


def freqs(n):
    return np.fft.rfftfreq(n, 1.0 / SR)


def lowpass(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (np.maximum(f, 0.0) / fc) ** (2 * order))


def resonance(f, f0, q):
    """Pasmowy rezonans, |H| = 1 w f0."""
    with np.errstate(divide="ignore", invalid="ignore"):
        d = f / f0 - f0 / np.where(f > 0, f, np.inf)
    return 1.0 / np.sqrt(1.0 + (q * d) ** 2)


def periodic_noise(rng, n, exponent=0.0):
    f = freqs(n)
    spec = rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))
    spec[0] = 0.0
    spec[1:] *= np.maximum(f[1:], 1.0) ** (-exponent / 2.0)
    return np.fft.irfft(spec, n)


def filt(x, gain):
    f = freqs(len(x))
    return np.fft.irfft(np.fft.rfft(x) * gain(f), len(x))


def build(rng):
    out = np.zeros((2, N))

    # 1. Szum brązowy, dolnoprzepust 400 Hz, -50 dB.
    for ch in range(2):
        brown = filt(periodic_noise(rng, N, 2.0), lambda f: lowpass(f, 400.0))
        out[ch] += to_rms(brown, -50.0)

    # 2. Rezonans 120 Hz (Q 6), -56 dB.
    for ch in range(2):
        res = filt(periodic_noise(rng, N, 0.0), lambda f: resonance(f, 120.0, 6.0))
        out[ch] += to_rms(res, -56.0)

    # 3. Skrzyp drewna: szum pasmowy 600 Hz (Q 8), 150 ms, -46 dB, co ~6 s (±2 s).
    # Dwa skrzypy na pętli 10 s, odstęp między nimi 4-6 s (oba odstępy mieszczą się w 6 s ±2 s).
    L = int(round(0.150 * SR))
    win = np.sin(np.linspace(0.0, np.pi, L)) ** 2
    gap = rng.uniform(4.0, 6.0)
    t1 = rng.uniform(0.0, DUR_S)
    for t in (t1, (t1 + gap) % DUR_S):
        start = int(round(t * SR))
        for ch in range(2):
            snip = np.fft.irfft(np.fft.rfft(rng.standard_normal(L)) * resonance(
                np.fft.rfftfreq(L, 1.0 / SR), 600.0, 8.0), L)
            snip = to_rms(snip * win, -46.0)
            idx = (start + np.arange(L)) % N
            out[ch, idx] += snip

    return out


def write(audio):
    out = audio - audio.mean(axis=1, keepdims=True)
    peak = float(np.max(np.abs(out)))
    limit = 10.0 ** (PEAK_LIMIT_DBFS / 20.0)
    if peak > limit:
        out *= limit / peak
    with tempfile.TemporaryDirectory() as tmp:
        probe = os.path.join(tmp, "probe.ogg")
        finish._encode(out, SR, probe)
        lufs, _ = finish.measure_file(probe)
    spec = {
        "id": NAME, "kind": "noise", "title": "Szum: ton pokoju (pętla)", "bars": 1,
        "meter": 3, "bpm": 60, "loop": {"enabled": True, "start_s": 0.0, "end_s": DUR_S},
        "master": {"lufs": round(lufs, 1), "ceiling_dbtp": -1},
    }
    path = finish.finish(out, spec, out_path=OUT, sr=SR)
    return path, dict(finish.LAST_REPORT)


def main():
    rng = np.random.default_rng(SEED)
    path, report = write(build(rng))
    print(path, report)


if __name__ == "__main__":
    main()
