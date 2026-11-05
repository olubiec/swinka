"""Szum: podniesienie igły, jednorazowy 0,6 s (MT-16, PM-N1).

Uruchom: python3 tools/music/noise/noise_needle_lift.py  -> assets/music/noise/noise_needle_lift.ogg
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import noise_vinyl_crackle as VC  # noqa: E402

SR = VC.SR
N = 26460  # 0,600 s
SEED = 55304
OUT = os.path.join(VC.F.ROOT, "assets", "music", "noise", "noise_needle_lift.ogg")


def idx(seconds):
    return int(round(seconds * SR))


def render():
    rng = np.random.default_rng(SEED)
    out = np.zeros((2, N))
    # 0-330 ms: trzask winylu -36 dB i narastający szum szczotkowy (0-250 ms)
    e = idx(0.330)
    b = idx(0.250)
    pre = VC.render()[:, :e] * VC.db2lin(-36.0)
    pre[:, :b] += VC.brush(rng, b, -50.0, -30.0)
    # 250-330 ms: nagły spadek o 30 dB, krzywa wykładnicza 80 ms
    d = idx(0.250)
    tau = np.arange(e - d) / SR
    drop_db = -30.0 * (1.0 - np.exp(-tau / 0.08)) / (1.0 - np.exp(-1.0))
    pre[:, d:e] *= VC.db2lin(drop_db)
    out[:, :e] += pre
    # 330-410 ms: stuk 140 Hz, -20 dB, zanik 80 ms
    s, u = idx(0.330), idx(0.410)
    tau = np.arange(u - s) / SR
    out[:, s:u] += VC.db2lin(-20.0) * np.sin(2.0 * np.pi * 140.0 * tau) * np.exp(-tau / 0.08)
    # 410-600 ms: cisza z ogonem pokoju, szum brązowy -60 dB
    tail = VC.brown_periodic(rng, N - u) * VC.db2lin(-60.0)
    out[:, u:] += tail
    return out


def main():
    lufs, tp = VC.write_oneshot(render(), OUT)
    print("noise_needle_lift: %s lufs=%.2f tp=%.2f dBTP" % (OUT, lufs, tp))


if __name__ == "__main__":
    main()
