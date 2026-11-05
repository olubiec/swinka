"""Szum MT-18: deszcz na dachu (pętla 12 s, stereo). Generowany kodem, bez melodii.

Wszystkie składniki są okresowe (filtry w dziedzinie częstości na pełnej długości pętli,
zdarzenia zawijane modulo długość), więc szew pętli jest bezszwowy.
Uruchomienie: python3 tools/music/noise/noise_rain.py
"""
import os
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, "tools", "music"))
import finish  # noqa: E402

NAME = "noise_rain"
SEED = 32953
SR = 44100
DUR_S = 12.0
N = int(round(DUR_S * SR))  # 529200
PEAK_LIMIT_DBFS = -3.5  # odbiór: szczyt <= -3 dBFS, z zapasem
OUT = os.path.join(ROOT, "assets", "music", "noise", NAME + ".ogg")


def rms(x):
    return float(np.sqrt(np.mean(x * x)))


def to_rms(x, db):
    return x * (10.0 ** (db / 20.0) / rms(x))


def freqs(n):
    return np.fft.rfftfreq(n, 1.0 / SR)


def highpass(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-9)) ** (2 * order))


def lowpass(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (np.maximum(f, 0.0) / fc) ** (2 * order))


def resonance(f, f0, q):
    """Pasmowy rezonans, |H| = 1 w f0."""
    with np.errstate(divide="ignore", invalid="ignore"):
        d = f / f0 - f0 / np.where(f > 0, f, np.inf)
    return 1.0 / np.sqrt(1.0 + (q * d) ** 2)


def periodic_noise(rng, n, exponent=0.0):
    """Szum okresowy: amplituda widma ~ f^(-exponent/2) (0 biały, 1 różowy)."""
    f = freqs(n)
    spec = rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))
    spec[0] = 0.0
    spec[1:] *= np.maximum(f[1:], 1.0) ** (-exponent / 2.0)
    return np.fft.irfft(spec, n)


def filt(x, gain):
    f = freqs(len(x))
    return np.fft.irfft(np.fft.rfft(x) * gain(f), len(x))


def add_click(buf, pos, freq, db, pan, env_len, env_t60):
    """Sinus z wykładniczym zanikiem, zawinięty modulo długość pętli."""
    t = np.arange(env_len) / SR
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-6.9078 * t / env_t60)
    sig = sig * (10.0 ** (db / 20.0) / np.sqrt(np.mean(sig * sig)))
    idx = (pos + np.arange(env_len)) % N
    gl = np.cos((pan + 1.0) * np.pi / 4.0)
    gr = np.sin((pan + 1.0) * np.pi / 4.0)
    buf[0, idx] += gl * sig
    buf[1, idx] += gr * sig


def build(rng):
    out = np.zeros((2, N))

    # 1. Podłoże: szum różowy, górnoprzepust 400 Hz, -34 dB RMS.
    for ch in range(2):
        bed = filt(periodic_noise(rng, N, 1.0), lambda f: highpass(f, 400.0))
        out[ch] += to_rms(bed, -34.0)

    # 2. Krople: 60/s * 12 s = 720, sinus 3-6 kHz, zanik 8 ms (-60 dB), pan +-0.8, -40..-30 dB.
    env_len = int(round(0.008 * SR))
    for _ in range(int(60 * DUR_S)):
        pos = int(rng.integers(0, N))
        freq = rng.uniform(3000.0, 6000.0)
        db = rng.uniform(-40.0, -30.0)
        pan = rng.uniform(-0.8, 0.8)
        add_click(out, pos, freq, db, pan, env_len, 0.008)

    # 3. Rozbryzgi: co ~3 s (4 w pętli), 80 ms, szum pasmowy 1-4 kHz, -32 dB, Hann.
    L = int(round(0.080 * SR))
    win = np.hanning(L)
    for i in range(4):
        t = (i * 3.0 + rng.uniform(-0.25, 0.25)) % DUR_S
        start = int(round(t * SR))
        for ch in range(2):
            snip = filt(rng.standard_normal(L), lambda f: highpass(f, 1000.0) * lowpass(f, 4000.0))
            snip = to_rms(snip * win, -32.0)
            idx = (start + np.arange(L)) % N
            out[ch, idx] += snip

    # 4. Dach: rezonans 220 Hz (Q 4), -46 dB.
    for ch in range(2):
        roof = filt(periodic_noise(rng, N, 0.0), lambda f: resonance(f, 220.0, 4.0))
        out[ch] += to_rms(roof, -46.0)

    return out


def write(audio):
    out = audio - audio.mean(axis=1, keepdims=True)  # brak DC
    peak = float(np.max(np.abs(out)))
    limit = 10.0 ** (PEAK_LIMIT_DBFS / 20.0)
    if peak > limit:
        out *= limit / peak
    # Plik nie jest normalizowany do LUFS: docelowe LUFS = zmierzone z surowego renderu,
    # więc finish() nie zmienia poziomów składników.
    with tempfile.TemporaryDirectory() as tmp:
        probe = os.path.join(tmp, "probe.ogg")
        finish._encode(out, SR, probe)
        lufs, _ = finish.measure_file(probe)
    spec = {
        "id": NAME, "kind": "noise", "title": "Szum: deszcz na dachu (pętla)", "bars": 1,
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
