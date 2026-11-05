"""Szum: przeskok igły, jednorazowy 0,35 s (MT-17, PM-N1).

Uruchom: python3 tools/music/noise/noise_needle_skip.py  -> assets/music/noise/noise_needle_skip.ogg
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import noise_vinyl_crackle as VC  # noqa: E402

SR = VC.SR
N = 15435  # 0,350 s
SEED = 55552
FRAME = 512
HOP = 128
OUT = os.path.join(VC.F.ROOT, "assets", "music", "noise", "noise_needle_skip.ogg")


def sweep(rng, n):
    """Szum pasmowy (600 Hz szerokości) przesuwający się z 2 do 6 kHz w ciągu 120 ms (STFT, Hann)."""
    x = rng.standard_normal((2, n))
    out = np.zeros((2, n))
    win = np.hanning(FRAME)
    freqs = np.fft.rfftfreq(FRAME, 1.0 / SR)
    for s in range(-FRAME, n, HOP):
        lo, hi = max(s, 0), min(s + FRAME, n)
        if hi <= lo:
            continue
        centre_t = (s + FRAME / 2) / SR
        fc = 2000.0 + 4000.0 * min(max(centre_t / 0.120, 0.0), 1.0)
        seg = np.zeros((2, FRAME))
        seg[:, lo - s:hi - s] = x[:, lo:hi]
        spec = np.fft.rfft(seg * win, axis=1) * (np.abs(freqs - fc) <= 600.0)
        y = np.fft.irfft(spec, FRAME, axis=1) * win
        out[:, lo:hi] += y[:, lo - s:hi - s]
    return out / 1.5  # suma kwadratów okna Hann przy 75% zakładki


def render():
    rng = np.random.default_rng(SEED)
    t = np.arange(N) / SR
    # sweep: poziom -30 dB RMS w pierwszych 120 ms
    body = sweep(rng, N)
    body /= np.sqrt(np.mean(body[:, :idx(0.120)] ** 2))
    body *= VC.db2lin(-30.0)
    # obwiednia: 120-330 ms zanik 60 ms; 330-350 ms urwany ogon (fade 20 ms)
    env = np.where(t < 0.120, 1.0, np.exp(-(t - 0.120) / 0.060))
    fade = t >= 0.330
    env[fade] *= 0.5 * (1.0 + np.cos(np.pi * (t[fade] - 0.330) / 0.020))
    out = body * env
    # dwa pop-y -20 dB: w 0,00 s i 0,09 s
    for pos in (0.0, 0.09):
        shape = VC.click_shape(2.0)
        VC.add_click(out, idx(pos), shape, VC.db2lin(-20.0) * rng.choice([-1.0, 1.0]), 0.0)
    return out


def idx(seconds):
    return int(round(seconds * SR))


def main():
    lufs, tp = VC.write_oneshot(render(), OUT)
    print("noise_needle_skip: %s lufs=%.2f tp=%.2f dBTP" % (OUT, lufs, tp))


if __name__ == "__main__":
    main()
