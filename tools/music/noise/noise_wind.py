"""Szum MT-19: wiatr (pętla 14 s, stereo). Generowany kodem, bez melodii.

Okresy LFO dobrane tak, by mieściły się w pętli całkowitą liczbę razy:
- przemiatanie pasma 300-900 Hz: 2 cykle na pętlę (0,1429 Hz, okres 7 s; zamiast 0,1 Hz),
- porywy: 2 na pętlę (0,1429 Hz, szczyt co 7 s),
- modulacja gwizdu: 3 cykle na pętlę (0,2143 Hz; zamiast 0,2 Hz).
Składniki okresowe (dziedzina częstości na pełnej pętli), więc szew jest bezszwowy.
Uruchomienie: python3 tools/music/noise/noise_wind.py
"""
import os
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, "tools", "music"))
import finish  # noqa: E402

NAME = "noise_wind"
SEED = 33201
SR = 44100
DUR_S = 14.0
N = int(round(DUR_S * SR))  # 617400
PEAK_LIMIT_DBFS = -3.5
OUT = os.path.join(ROOT, "assets", "music", "noise", NAME + ".ogg")

K_BANDS = 16
SWEEP_CYCLES = 2  # na pętlę
GUST_CYCLES = 2
WHISTLE_AM_CYCLES = 3
BAND_LO, BAND_HI = 300.0, 900.0
BAND_SIGMA = 0.11  # szerokość pasma w ln(f)


def rms(x):
    return float(np.sqrt(np.mean(x * x)))


def to_rms(x, db):
    return x * (10.0 ** (db / 20.0) / rms(x))


def freqs(n):
    return np.fft.rfftfreq(n, 1.0 / SR)


def highpass(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-9)) ** (2 * order))


def periodic_noise(rng, n, exponent=0.0):
    f = freqs(n)
    spec = rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))
    spec[0] = 0.0
    spec[1:] *= np.maximum(f[1:], 1.0) ** (-exponent / 2.0)
    return np.fft.irfft(spec, n)


def band_gain(f, f_center):
    """Gauss w skali logarytmicznej wokół f_center (Hz)."""
    with np.errstate(divide="ignore"):
        lf = np.log(np.maximum(f, 1e-9))
    return np.exp(-0.5 * ((lf - np.log(f_center)) / BAND_SIGMA) ** 2)


def build(rng):
    t = np.arange(N) / SR
    phase = 2 * np.pi * t / DUR_S  # jeden okres pętli
    center = BAND_LO * (BAND_HI / BAND_LO) ** (
        0.5 * (1.0 - np.cos(SWEEP_CYCLES * phase)))  # przemiatanie 300 -> 900 Hz
    gust = 0.75 + 0.25 * np.cos(GUST_CYCLES * phase + 0.4)
    band_centers = BAND_LO * (BAND_HI / BAND_LO) ** (np.arange(K_BANDS) / (K_BANDS - 1))

    out = np.zeros((2, N))
    for ch in range(2):
        base = periodic_noise(rng, N, 1.0)  # różowy
        spec = np.fft.rfft(base)
        f = freqs(N)
        bed = np.zeros(N)
        for fk in band_centers:
            bk = np.fft.irfft(spec * band_gain(f, fk), N)  # pasmo wokół fk
            wk = np.exp(-0.5 * ((np.log(fk) - np.log(center)) / BAND_SIGMA) ** 2)
            bed += wk * bk
        bed *= gust
        out[ch] += to_rms(bed, -34.0)

    # Gwizd: sinus 700 Hz (9800 cykli w pętli), -48 dB, AM 3 cykle na pętlę.
    whistle = np.sin(2 * np.pi * 700.0 * np.arange(N) / SR)
    am = 0.5 + 0.5 * np.sin(WHISTLE_AM_CYCLES * phase)
    whistle = to_rms(whistle * am, -48.0)
    out += whistle[None, :]
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
        "id": NAME, "kind": "noise", "title": "Szum: wiatr (pętla)", "bars": 1,
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
