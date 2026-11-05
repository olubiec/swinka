"""Szum: trzask winylu, pętla 8,000 s (MT-14, PM-N1). Także generator dla noise_needle_drop.

Uruchom: python3 tools/music/noise/noise_vinyl_crackle.py  -> assets/music/noise/noise_vinyl_crackle.ogg

Poziomy komponentów to RMS / peak w dBFS przed miksem; plik NIE jest normalizowany do LUFS
(poziom ustawia warstwa miksu). Zapis przez finish.py: zawinięcie i szew pętli, OGG libvorbis, limiter.
Funkcje pomocnicze (click_shape, add_click, brown_periodic, brush, write_oneshot) są współdzielone
przez noise_needle_*.py.
"""
import os
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import finish as F  # noqa: E402

SR = 44100
N = 352800  # 8,000 s
LOOP_S = N / SR
SEED = 62589
RATE_HZ = 0.25  # wolna zmiana intensywności; 0,25 Hz to 2 pełne cykle w 8 s (0,2 Hz nie zamyka pętli)
OUT = os.path.join(F.ROOT, "assets", "music", "noise", "noise_vinyl_crackle.ogg")


def db2lin(x):
    return 10.0 ** (np.asarray(x, dtype=np.float64) / 20.0)


def click_shape(length_ms):
    """Kliknięcie: różnica dwóch wykładniczych, szczyt znormalizowany do 1, zaczyna się od zera."""
    length = length_ms * 1e-3
    n = max(2, int(round(length * SR)))
    t = np.arange(n) / SR
    shape = np.exp(-t / (length / 20.0)) - np.exp(-t / (length / 6.0))
    return shape / np.max(np.abs(shape))


def add_click(out, start, shape, amp, pan=0.0):
    """Dodaje kliknięcie od próbki start; pan w -1..1 (gain L/R o stałej mocy)."""
    gl = np.sqrt((1.0 - pan) / 2.0)
    gr = np.sqrt((1.0 + pan) / 2.0)
    end = start + shape.size
    out[0, start:end] += amp * gl * shape
    out[1, start:end] += amp * gr * shape


def brown_periodic(rng, n, hp_hz=200.0):
    """Szum brązowy (1/f) z górnoprzepustem; w FFT, więc okresowy (zszywa się w pętli). 2 kanały."""
    spec = np.fft.rfft(rng.standard_normal((2, n)), axis=1)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    weight = np.zeros_like(f)
    keep = f >= hp_hz
    weight[keep] = 1.0 / f[keep]
    y = np.fft.irfft(spec * weight, n, axis=1)
    return y / np.sqrt(np.mean(y ** 2, axis=1, keepdims=True))  # RMS 1, skalowanie u wywołującego


def brush(rng, n, db0, db1, lo=2000.0, hi=8000.0):
    """Szum szczotkowy: pasmo lo..hi, RMS narasta liniowo w dB od db0 do db1."""
    f = np.fft.rfftfreq(n, 1.0 / SR)
    spec = np.fft.rfft(rng.standard_normal((2, n)), axis=1) * ((f >= lo) & (f <= hi))
    y = np.fft.irfft(spec, n, axis=1)
    y /= np.sqrt(np.mean(y ** 2, axis=1, keepdims=True))
    return y * db2lin(np.linspace(db0, db1, n))


def ogg_sample_count(path):
    """Liczba próbek strumienia OGG z granule position ostatniej strony (bez dekodowania).

    Granule ostatniej strony to liczba prawdziwych próbek (Vorbis-in-Ogg przycina koniec);
    ffmpeg w potoku (-f f32le) tego nie przycina i zwraca pełne bloki, stąd nie dekodujemy.
    """
    with open(path, "rb") as f:
        data = f.read()
    pos, last = 0, None
    while pos + 27 <= len(data):
        if data[pos:pos + 4] != b"OggS":
            raise ValueError("niepoprawna strona OGG w %s" % path)
        nseg = data[pos + 26]
        body = sum(data[pos + 27:pos + 27 + nseg])
        last = int.from_bytes(data[pos + 6:pos + 14], "little", signed=True)
        pos += 27 + nseg + body
    if last is None or pos != len(data):
        raise ValueError("uszkodzony OGG: %s" % path)
    return last


def write_oneshot(audio, out_path):
    """Dźwięk bez pętli: mikrofade 2 ms na obu końcach, OGG przez finish (bez normalizacji LUFS).

    Plik ma dokładnie len(audio) próbek (granule ostatniej strony); bez dopisywania ciszy, więc
    fade-out kończy się w obrębie tej długości. Zwraca (LUFS, true peak dBTP) po zakodowaniu;
    LUFS przy krótkim pliku jest orientacyjny.
    """
    audio = F.microfade(np.asarray(audio, dtype=np.float64).copy(), SR)
    n = audio.shape[1]
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    F._write_ogg(audio, SR, out_path)
    got = ogg_sample_count(out_path)
    if got != n:
        raise RuntimeError("OGG ma %d próbek, oczekiwano %d: %s" % (got, n, out_path))
    return F.measure_file(out_path)


def render():
    """Pętla 8 s: impulsy Poissona 4-12/s, pop -24 dB co ~2 s, szum brązowy -50 dB (HP 200 Hz)."""
    rng = np.random.default_rng(SEED)
    out = np.zeros((2, N))
    # 1. impulsy: proces Poissona z intensywnością 8 +- 4 /s, odstęp min. 10 ms (<= 2 w oknie 20 ms)
    phase = rng.uniform(0.0, 2.0 * np.pi)
    t = rng.exponential(1.0 / 8.0)
    last = -1.0
    while t < LOOP_S:
        rate = 8.0 + 4.0 * np.sin(2.0 * np.pi * RATE_HZ * t + phase)
        if t - last >= 0.010:
            start = int(t * SR)
            shape = click_shape(rng.uniform(0.3, 1.5))
            if start + shape.size <= N:  # impuls nie przecina punktu zszycia
                amp = db2lin(np.clip(rng.normal(-35.0, 2.5), -42.0, -28.0))
                amp *= rng.choice([-1.0, 1.0])
                add_click(out, start, shape, amp, rng.uniform(-0.6, 0.6))
                last = t
        t += rng.exponential(1.0 / rate)
    # 2. pop -24 dB co ~2 s (+-0,5 s), do 3 ms
    for k in range(4):
        pos = 2.0 * k + 1.0 + rng.uniform(-0.5, 0.5)
        shape = click_shape(rng.uniform(1.5, 3.0))
        amp = db2lin(-24.0) * rng.choice([-1.0, 1.0])
        add_click(out, int(pos * SR), shape, amp, rng.uniform(-0.6, 0.6))
    # 3. szum brązowy -50 dB RMS, górnoprzepust 200 Hz
    out += brown_periodic(rng, N) * db2lin(-50.0)
    return out


def write_loop(audio, out_path):
    """Pętla: finish zawija i zszywa; master.lufs = zmierzona głośność surowego sygnału,
    więc finish nie zmienia poziomu (spec: bez normalizacji LUFS)."""
    with tempfile.TemporaryDirectory() as tmp:
        probe = os.path.join(tmp, "raw.ogg")
        F._encode(audio, SR, probe)
        raw_lufs, _ = F.measure_file(probe)
    spec = {"id": "noise_vinyl_crackle", "kind": "noise", "bars": 1, "meter": 4, "bpm": 60,
            "master": {"lufs": round(raw_lufs, 1), "ceiling_dbtp": -1},
            "loop": {"enabled": True, "end_s": LOOP_S}}
    F.finish(audio, spec, out_path=out_path, sr=SR)
    return dict(F.LAST_REPORT)


def main():
    rep = write_loop(render(), OUT)
    print("noise_vinyl_crackle: %s lufs=%.2f tp=%.2f dBTP gain=%.2f dB" % (
        OUT, rep["lufs"], rep["true_peak_dbtp"], rep["gain_db"]))


if __name__ == "__main__":
    main()
