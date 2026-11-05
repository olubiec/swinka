"""Efekty (MT-04, PM-03). Kontrakt: fx.apply(chain, audio, sr) -> ndarray (2, n) float32.

chain: lista {"fx": "REV-M", "wet": 0.16} (wet opcjonalne; domyślne z tabeli poniżej).
Nazwy: REV-S, REV-M, REV-L (pogłos), LP(f), HP(f) Hz, TAPE(w) falowanie ±w %, VINYL(db) trzask i szum
(poziom db względem szczytu 1,0), CRUSH (8 bit, 12 kHz), PAN(p) p w -1..1, WIDTH(w) szerokość stereo 0..2.

Długość: pogłos dokleja ogon (wyjście = n + długość IR - 1). Zawinięcie ogona do początku pętli
robi finish.py (PM-06), nie ten moduł.
"""
import math
import re

import numpy as np

REVERB = {
    "REV-S": {"t60": 0.6, "wet": 0.12, "predelay": 0.0},
    "REV-M": {"t60": 1.4, "wet": 0.18, "predelay": 0.0},
    "REV-L": {"t60": 3.2, "wet": 0.30, "predelay": 0.040},
}
LN1000 = math.log(1000.0)
CRUSH_BITS = 8
CRUSH_RATE = 12000.0
PATTERN = re.compile(r"^([A-Z][A-Z0-9-]*)(?:\(([-0-9.]+)\))?$")
KNOWN = set(REVERB) | {"LP", "HP", "TAPE", "VINYL", "CRUSH", "PAN", "WIDTH"}


def _as_stereo(audio):
    a = np.asarray(audio, dtype=np.float64)
    if a.ndim == 1:
        a = np.stack([a, a])
    if a.shape[0] != 2:
        raise ValueError("audio must have shape (2, n)")
    return a


def _reverb_ir(t60, predelay, sr, seed):
    """Stereo IR: szum o wykładniczym zaniku, dekorelowany między kanałami, z pre-delay."""
    rng = np.random.default_rng(seed)
    n = int(round(t60 * sr))
    t = np.arange(n) / sr
    env = np.exp(-t * LN1000 / t60)
    pre = int(round(predelay * sr))
    irs = []
    for _ in range(2):
        ir = np.zeros(n + pre)
        ir[pre:] = rng.standard_normal(n) * env
        energy = np.sqrt(np.sum(ir ** 2))
        irs.append(ir / energy if energy > 0 else ir)
    return irs


def _convolve_full(x, h):
    n, m = len(x), len(h)
    if n == 0:
        return np.zeros(0)
    L = n + m - 1
    nfft = 1 << int(math.ceil(math.log2(max(L, 2))))
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)
    return y[:L]


def _reverb(audio, name, wet, sr):
    p = REVERB[name]
    irs = _reverb_ir(p["t60"], p["predelay"], sr, seed=sum(map(ord, name)))
    dry = audio
    out_len = audio.shape[1] + len(irs[0]) - 1
    out = np.zeros((2, out_len))
    out[:, :audio.shape[1]] += (1.0 - wet) * dry
    for c in range(2):
        out[c] += wet * _convolve_full(audio[c], irs[c])
    return out


def _butter_mag(f, cutoff, order, kind):
    fs = np.maximum(f, 1e-9)
    if kind == "lp":
        return 1.0 / np.sqrt(1.0 + (f / cutoff) ** (2 * order))
    return 1.0 / np.sqrt(1.0 + (cutoff / fs) ** (2 * order))


def _filter(audio, sr, cutoff, kind, order=2):
    n = audio.shape[1]
    nfft = 1 << int(math.ceil(math.log2(max(n, 2))))
    f = np.fft.rfftfreq(nfft, 1.0 / sr)
    h = _butter_mag(f, cutoff, order, kind)
    out = np.empty_like(audio)
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(audio[c], nfft) * h, nfft)[:n]
    return out


def _tape(audio, depth_pct, sr):
    """Falowanie taśmy: modulacja prędkości odczytu (wow 0,5 Hz, flutter 6 Hz, flutter na 1/5 głębokości)."""
    n = audio.shape[1]
    t = np.arange(n) / sr
    d = depth_pct / 100.0
    rate = 1.0 + d * (np.sin(2 * np.pi * 0.5 * t) + 0.2 * np.sin(2 * np.pi * 6.0 * t))
    pos = np.clip(np.cumsum(rate) - rate[0], 0, n - 1)  # pozycja odczytu w próbkach
    idx = np.arange(n)
    return np.stack([np.interp(pos, idx, audio[c]) for c in range(2)])


def _vinyl(audio, db, sr, seed=7):
    """Szum powierzchni (górnoprzepust 2 kHz) i rzadkie trzaski; poziom db względem szczytu 1,0."""
    rng = np.random.default_rng(seed)
    n = audio.shape[1]
    amp = 10.0 ** (db / 20.0)
    out = audio.copy()
    hiss = rng.standard_normal((2, n))
    hiss = _filter(hiss, sr, 2000.0, "hp")
    hiss *= amp / max(np.sqrt(np.mean(hiss ** 2)), 1e-12)
    out += hiss
    clicks = int(n / sr * 3)  # około 3 trzaski na sekundę
    for c in range(2):
        pos = rng.integers(0, max(n, 1), size=clicks)
        val = rng.exponential(1.0, size=clicks) * amp * 4.0 * rng.choice([-1.0, 1.0], size=clicks)
        np.add.at(out[c], pos, val)
    return out


def _crush(audio, sr):
    n = audio.shape[1]
    hold = np.floor(np.arange(n) * CRUSH_RATE / sr).astype(int)
    hold = np.minimum(hold, n - 1)
    steps = 2 ** (CRUSH_BITS - 1) - 1
    out = np.empty_like(audio)
    for c in range(2):
        held = audio[c][hold]
        out[c] = np.round(np.clip(held, -1, 1) * steps) / steps
    return out


def _pan(audio, pos):
    pos = min(max(pos, -1.0), 1.0)
    mono = 0.5 * (audio[0] + audio[1])
    theta = (pos + 1.0) * math.pi / 4.0
    return np.stack([mono * math.cos(theta), mono * math.sin(theta)])


def _width(audio, w):
    w = max(0.0, min(w, 2.0))
    mid = 0.5 * (audio[0] + audio[1])
    side = 0.5 * (audio[0] - audio[1]) * w
    return np.stack([mid + side, mid - side])


def _parse(item):
    name = item["fx"]
    m = PATTERN.match(name)
    if not m or m.group(1) not in KNOWN:
        raise ValueError("unknown fx: %s" % name)
    arg = float(m.group(2)) if m.group(2) is not None else None
    base = m.group(1)
    if base in ("LP", "HP", "TAPE", "VINYL", "PAN", "WIDTH") and arg is None:
        raise ValueError("%s needs an argument" % name)
    return base, arg


def apply(chain, audio, sr):
    """Stosuje łańcuch efektów po kolei. Zwraca float32 (2, n') z n' >= n."""
    out = _as_stereo(audio)
    for item in chain:
        base, arg = _parse(item)
        if base in REVERB:
            wet = float(item.get("wet", REVERB[base]["wet"]))
            out = _reverb(out, base, wet, sr)
        elif base == "LP":
            out = _filter(out, sr, arg, "lp")
        elif base == "HP":
            out = _filter(out, sr, arg, "hp")
        elif base == "TAPE":
            out = _tape(out, arg, sr)
        elif base == "VINYL":
            out = _vinyl(out, arg, sr)
        elif base == "CRUSH":
            out = _crush(out, sr)
        elif base == "PAN":
            out = _pan(out, arg)
        elif base == "WIDTH":
            out = _width(out, arg)
    return out.astype(np.float32)
