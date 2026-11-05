"""Szum: ptaki (MT-20, PM-N3). Pętla 20 s, generowana kodem, bez melodii.

Uruchom: python3 tools/music/noise/noise_birds.py  ->  assets/music/noise/noise_birds.ogg

Szew pętli: zdarzenia układane na okręgu 20 s (ćwierknięcie wychodzące za koniec
wraca na początek), więc sygnał jest okresowy i szew jest ciągły.
Poziom: bez normalizacji do LUFS (wymaga MT-20). finish() dostaje master.lufs równe
zmierzonej głośności surowego sygnału, więc nie dokłada wzmocnienia.
"""
import os
import sys
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import finish  # noqa: E402
import fx  # noqa: E402

ID = "noise_birds"
SEED = 36239
SR = finish.SR_DEFAULT
DUR_S = 20.0
N = int(round(DUR_S * SR))
ADSR_MS = (3.0, 20.0, 50.0, 40.0)  # atak / decay / sustain / release
SUSTAIN = 0.5
SEAM_HALF = 600  # próbek ciszy wokół szwu (zapas na ZERO_SEARCH i opóźnienie kodeka)
PEAK_MAX = 10.0 ** (-3.0 / 20.0)  # szczyt ≤ -3 dBFS
LEVEL_RANGE = (-30.0, -24.0)  # RMS pojedynczego ptaka przed miksem, dBFS


def _adsr(n):
    a, d, s, r = [m / 1000.0 * SR for m in ADSR_MS]
    k = min(1.0, n / (a + d + s + r))
    a, d, s, r = a * k, d * k, s * k, r * k
    return np.interp(np.arange(n, dtype=np.float64), [0, a, a + d, a + d + s, a + d + s + r],
                     [0.0, 1.0, SUSTAIN, SUSTAIN, 0.0])


def _sweep(f0, f1, dur):
    n = int(round(dur * SR))
    t = np.arange(n) / SR
    phase = 2 * np.pi * (f0 * t + (f1 - f0) * t * t / (2 * dur))
    return np.sin(phase) * _adsr(n)


def _trill():
    # 3 impulsy 3,8 kHz po 30 ms, przerwy 15 ms: razem 120 ms
    n = int(round(0.120 * SR))
    t = np.arange(n) / SR
    gate = np.zeros(n)
    for k in range(3):
        s = int(round(k * 0.045 * SR))
        gate[s:s + int(round(0.030 * SR))] = 1.0
    return np.sin(2 * np.pi * 3800.0 * t) * gate * _adsr(n)


def _ci():
    n = int(round(0.025 * SR))
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 5000.0 * t) * _adsr(n)


def _duet():
    # dwa sinusy w odstępie kwinty (x1,5), 150 ms
    n = int(round(0.150 * SR))
    t = np.arange(n) / SR
    return 0.5 * (np.sin(2 * np.pi * 3200.0 * t) + np.sin(2 * np.pi * 4800.0 * t)) * _adsr(n)


CHIRPS = {
    "sweep": lambda: _sweep(2500.0, 4500.0, 0.060),
    "trill": _trill,
    "piu": lambda: _sweep(3000.0, 2200.0, 0.140),
    "ci": _ci,
    "duet": _duet,
}
TYPE_NAMES = tuple(CHIRPS)


def _rms_db(x, db):
    rms = np.sqrt(np.mean(x * x))
    return x * (10.0 ** (db / 20.0) / rms)


def _pick_type(rng, exclude):
    choices = [c for c in TYPE_NAMES if c != exclude]
    return choices[int(rng.integers(len(choices)))]


def _schedule(rng):
    """Lista (start_s, typ, pan, rms_db). Przerwy 0,4-3 s; dwa ptaki naraz w różnych panoramach."""
    events = []
    last = None
    t = rng.uniform(0.0, 2.0)
    while t < DUR_S:
        kind = _pick_type(rng, last)
        if rng.random() < 0.3:
            events.append((t, kind, -0.6, rng.uniform(*LEVEL_RANGE)))
            kind2 = _pick_type(rng, kind)
            events.append((t + rng.uniform(0.02, 0.15), kind2, 0.6, rng.uniform(*LEVEL_RANGE)))
            last = kind2
        else:
            events.append((t, kind, rng.uniform(-0.6, 0.6), rng.uniform(*LEVEL_RANGE)))
            last = kind
        t += rng.uniform(0.4, 3.0)
    return events


def render():
    rng = np.random.default_rng(SEED)
    out = np.zeros((2, N))
    for start, kind, pan, db in _schedule(rng):
        c = _rms_db(CHIRPS[kind](), db)
        stereo = fx.apply([{"fx": "PAN(%.2f)" % pan}], c, SR)[:, :len(c)]
        idx = (int(round(start * SR)) + np.arange(len(c))) % N
        out[:, idx] += stereo
    return out


def _seam_roll(audio, body_len):
    """Obraca pętlę tak, by punkt cięcia (body_len) wypadł w ciszy.

    finish() przesuwa cięcie do najbliższego zera; w ciszy (same zera) nie przesuwa go wcale,
    więc plik ma dokładnie N - opóźnienie kodeka + opóźnienie = N próbek (20,000 s).
    """
    n = audio.shape[1]
    sil = np.concatenate([np.all(audio == 0.0, axis=0)] * 2).astype(np.int64)
    cs = np.concatenate([[0], np.cumsum(sil)])
    w = 2 * SEAM_HALF + 1
    run = cs[w:w + n] - cs[:n]
    cand = np.nonzero(run == w)[0]
    if cand.size == 0:
        raise RuntimeError("brak ciszy na szwie pętli")
    q = int(cand[0]) + SEAM_HALF
    return np.roll(audio, body_len - q, axis=1)


def _natural_lufs(audio):
    """Zintegrowana głośność surowego sygnału (ebur128 przez finish.measure_file)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "raw.wav")
        pcm = np.clip(np.round(audio.T * 32767.0), -32768, 32767).astype("<i2")
        with wave.open(path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        lufs, _ = finish.measure_file(path)
    return lufs


def main():
    audio = render()
    peak = float(np.max(np.abs(audio)))
    if peak > PEAK_MAX:
        raise ValueError("szczyt %.2f dBFS > -3 dBFS" % (20 * np.log10(peak)))
    body_len = N - finish.codec_delay(SR)
    audio = _seam_roll(audio, body_len)
    spec = {
        "id": ID, "kind": "noise",
        "loop": {"enabled": True, "start_s": 0.0, "end_s": body_len / SR},
        "master": {"lufs": round(_natural_lufs(audio), 1), "ceiling_dbtp": -1},
    }
    path = finish.finish(audio, spec, sr=SR)
    print(path, finish.LAST_REPORT)
    return path


if __name__ == "__main__":
    main()
