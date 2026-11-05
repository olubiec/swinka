"""Szum: świerszcze (MT-21, PM-N3). Pętla 16 s, generowana kodem, bez melodii.

Uruchom: python3 tools/music/noise/noise_crickets.py  ->  assets/music/noise/noise_crickets.ogg

Szew pętli: okres każdego świerszcza to 16 s / n (n całkowite), a falowanie 0,3 Hz to
5 cykli na pętlę (5/16 Hz = 0,3125 Hz), więc sygnał jest okresowy i szew jest ciągły.
Poziom: bez normalizacji do LUFS (wymaga MT-21). finish() dostaje master.lufs równe
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

ID = "noise_crickets"
SEED = 46283
SR = finish.SR_DEFAULT
DUR_S = 16.0
N = int(round(DUR_S * SR))
SEAM_HALF = 600  # próbek ciszy wokół szwu (zapas na ZERO_SEARCH i opóźnienie kodeka)
PEAK_MAX = 10.0 ** (-3.0 / 20.0)  # szczyt ≤ -3 dBFS
CRICKET_DB = -34.0  # RMS jednego świerszcza przed miksem, dBFS
TRILL_HZ = 4300.0
PULSE_S = 0.020
PULSE_GAP_S = 0.035
MOD_HZ = 5.0 / DUR_S  # 5 cykli na pętlę (0,3125 Hz, ≈ 0,3 Hz)
MOD_DB = 2.0


def _trill():
    """3 impulsy 4,3 kHz po 20 ms, co 35 ms (trylek, 90 ms)."""
    n = int(round((2 * PULSE_GAP_S + PULSE_S) * SR))
    t = np.arange(n) / SR
    env = np.zeros(n)
    p = int(round(PULSE_S * SR))
    for k in range(3):
        s = int(round(k * PULSE_GAP_S * SR))
        env[s:s + p] = np.sin(np.pi * np.arange(p) / p) ** 2  # czysty brzeg impulsu
    x = np.sin(2 * np.pi * TRILL_HZ * t) * env
    return x * (10.0 ** (CRICKET_DB / 20.0) / np.sqrt(np.mean(x * x)))


def render():
    rng = np.random.default_rng(SEED)
    trill = _trill()
    out = np.zeros((2, N))
    crickets = int(rng.integers(4, 6))  # 4-5 świerszczy
    for _ in range(crickets):
        n_per = int(rng.integers(23, 26))  # okres 16/n: 0,64-0,70 s, czyli ±4% od 0,667 s
        period = DUR_S / n_per
        pan = rng.uniform(-0.8, 0.8)
        phase = rng.uniform(0.0, period)  # brak jednoczesnego startu
        stereo = fx.apply([{"fx": "PAN(%.2f)" % pan}], trill, SR)[:, :len(trill)]
        for j in range(n_per):
            start = int(round((phase + j * period) * SR))
            idx = (start + np.arange(len(trill))) % N
            out[:, idx] += stereo
    t = np.arange(N) / SR
    gain = 10.0 ** (MOD_DB * np.sin(2 * np.pi * MOD_HZ * t) / 20.0)
    return out * gain


def _seam_roll(audio, body_len):
    """Obraca pętlę tak, by punkt cięcia (body_len) wypadł w ciszy.

    finish() przesuwa cięcie do najbliższego zera; w ciszy (same zera) nie przesuwa go wcale,
    więc plik ma dokładnie N próbek (16,000 s).
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
