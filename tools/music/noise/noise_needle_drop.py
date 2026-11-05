"""Szum: opuszczenie igły, jednorazowy 0,9 s (MT-15, PM-N1).

Uruchom: python3 tools/music/noise/noise_needle_drop.py  -> assets/music/noise/noise_needle_drop.ogg
Trzask w części 350-900 ms to ten sam generator co noise_vinyl_crackle (render()).
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import noise_vinyl_crackle as VC  # noqa: E402

SR = VC.SR
N = 39690  # 0,900 s
SEED = 55490
OUT = os.path.join(VC.F.ROOT, "assets", "music", "noise", "noise_needle_drop.ogg")


def idx(seconds):
    return int(round(seconds * SR))


def render():
    rng = np.random.default_rng(SEED)
    out = np.zeros((2, N))
    # 40-100 ms: cichy puls 90 Hz, 60 ms, -18 dB, zanik wykładniczy
    a, b = idx(0.040), idx(0.100)
    tau = np.arange(b - a) / SR
    out[:, a:b] += VC.db2lin(-18.0) * np.sin(2.0 * np.pi * 90.0 * tau) * np.exp(-tau / 0.02)
    # 100-350 ms: szum szczotkowy 2-8 kHz, narastający od -50 do -30 dB
    a, b = idx(0.100), idx(0.350)
    out[:, a:b] += VC.brush(rng, b - a, -50.0, -30.0)
    # 350-900 ms: trzask winylu (ten sam generator) od -36 dB do poziomu pętli; ogon 100 ms rozpływa się
    crackle = VC.render()[:, :N]
    a, b = idx(0.350), idx(0.800)
    env = np.zeros(N)
    env[a:b] = VC.db2lin(np.linspace(-36.0, 0.0, b - a))
    tail = N - b
    env[b:] = 0.5 * (1.0 + np.cos(np.pi * np.arange(tail) / tail))
    out += crackle * env
    return out


def main():
    audio = render()
    lufs, tp = VC.write_oneshot(audio, OUT)
    print("noise_needle_drop: %s lufs=%.2f tp=%.2f dBTP" % (OUT, lufs, tp))


if __name__ == "__main__":
    main()
