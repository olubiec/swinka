"""Głosy z palety (MT-02, PM-02). Jedyne źródło dźwięku w utworach Cuy.

API (kontrakt MW-0, tools/music/CONTRACT.md):
    render(voice, midi, dur_s, vel, sr, rng) -> ndarray (2, n) float32

Reguły czasu:
- Głosy zanikające (większość): zanik T60 = czas spadku o 60 dB od ataku. Dźwięk nie jest
  skracany przez dur_s; ogon trwa do -60 dB. Sekwencer nakłada nuty według t_beats.
- Głosy podtrzymywane (PAD, ACC): dur_s to czas trzymania, potem release.
- HAT: zamknięty (T60 0,03 s) przy dur_s < 0,12, otwarty (T60 0,16 s) przy dur_s >= 0,12.

Poziom: każdy wynik jest normalizowany do szczytu 0,5 * vel (vel w 0..1). Poziomy względne
warstw (dB) nakłada sekwencer, nie głos.

Parametry strojenia wg palety z docs/music_prompts/README.md, sekcja 1.
Test i arkusz odsłuchu: tools/music/test_voices.py.
"""
import math

import numpy as np

SR_DEFAULT = 44100
PEAK = 0.5
LN1000 = math.log(1000.0)  # T60 -> współczynnik zaniku: amplituda = exp(-t * LN1000 / T60)

# Składnik: {"osc": sine|tri|pulse|noise, "ratio": 1.0, "db": 0.0, "detune": 0 (centy), "hz": None (absolutne), "duty": 0.5}
# Głos: {"parts": [...], "attack": s, "t60": s | None, "sustain": bool, "release": s,
#        "lp": Hz, "hp": Hz, "bp": (lo, hi), "vib": (Hz, centy), "trem": (Hz, głębokość),
#        "fm": (Hz, dewiacja Hz), "sweep": (start_Hz, end_Hz, czas_s), "comb": (opóźnienie_s, wzmocnienie),
#        "drift": centy, "drum": bool}
VOICES = {
    "P12": {"parts": [{"osc": "pulse", "duty": 0.125}], "attack": 0.002, "t60": 0.265, "lp": 4000},
    "P25": {"parts": [{"osc": "pulse", "duty": 0.25}], "attack": 0.003, "t60": 0.425},
    "P50": {"parts": [{"osc": "pulse", "duty": 0.5}], "attack": 0.003, "t60": 0.4, "lp": 6000},
    "TRI": {"parts": [{"osc": "tri"}], "attack": 0.008, "t60": 0.5},
    "PAD": {"parts": [{"osc": "tri", "detune": -7}, {"osc": "tri", "detune": 0}, {"osc": "tri", "detune": 7}],
            "attack": 1.2, "sustain": True, "release": 1.5, "lp": 2000},
    "BELL": {"parts": [{"osc": "sine"}, {"osc": "sine", "ratio": 2.76, "db": -18},
                       {"osc": "sine", "ratio": 5.4, "db": -26}], "attack": 0.001, "t60": 1.2},
    "BOX": {"parts": [{"osc": "sine"}, {"osc": "sine", "ratio": 2.76, "db": -18},
                      {"osc": "sine", "ratio": 5.4, "db": -26}], "attack": 0.001, "t60": 0.6, "drift": 4},
    "CEL": {"parts": [{"osc": "sine"}, {"osc": "sine", "ratio": 4.0, "db": -14}], "attack": 0.001, "t60": 0.5},
    "GLK": {"parts": [{"osc": "sine"}, {"osc": "sine", "ratio": 3.0, "db": -10},
                      {"osc": "sine", "ratio": 6.0, "db": -18}], "attack": 0.001, "t60": 0.35},
    "XYL": {"parts": [{"osc": "pulse", "duty": 0.25}, {"osc": "sine", "ratio": 4.0, "db": -12}],
            "attack": 0.001, "t60": 0.09},
    "EP": {"parts": [{"osc": "pulse", "duty": 0.25}], "attack": 0.003, "t60": 0.6, "vib": (5.0, 8.0)},
    "BNJ": {"parts": [{"osc": "pulse", "duty": 0.125}], "attack": 0.002, "t60": 0.18, "comb": (0.003, 0.5)},
    "PIZ": {"parts": [{"osc": "tri"}, {"osc": "pulse", "duty": 0.125, "db": -12}],
            "attack": 0.002, "t60": 0.12},
    "HARP": {"parts": [{"osc": "sine"}], "attack": 0.001, "t60": 0.9},
    "ACC": {"parts": [{"osc": "pulse", "duty": 0.25}], "attack": 0.004, "sustain": True, "release": 0.15,
            "trem": (6.0, 0.2)},
    "BUZZ": {"parts": [{"osc": "sine"}], "attack": 0.01, "sustain": True, "release": 0.2,
             "fm": (40.0, 30.0)},
    "KICK": {"parts": [{"osc": "tri"}], "attack": 0.001, "t60": 0.35, "sweep": (140.0, 45.0, 0.15), "drum": True},
    "SNR": {"parts": [{"osc": "noise"}, {"osc": "tri", "hz": 200.0, "db": -12}],
            "attack": 0.001, "t60": 0.12, "bp": (1200.0, 2600.0), "drum": True},
    "BRSH": {"parts": [{"osc": "noise"}], "attack": 0.09, "t60": 0.18, "bp": (3000.0, 9000.0), "drum": True},
    "HAT": {"parts": [{"osc": "noise"}], "attack": 0.001, "t60": 0.03, "hp": 8000.0, "drum": True,
            "t60_open": 0.16},
    "SHK": {"parts": [{"osc": "noise"}], "attack": 0.015, "t60": 0.07, "bp": (5000.0, 10000.0), "drum": True},
}

NOISE_VOICES_PREFIX = "noise_"


def voice_names():
    return sorted(VOICES)


def midi_to_hz(midi):
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def _fft_filter(x, sr, lp=None, hp=None, bp=None, order=2):
    """Filtr zerofazowy Butterwortha w dziedzinie częstotliwości (jeden dźwięk, bez pętli Pythona)."""
    n = len(x)
    if n == 0:
        return x
    nfft = 1 << int(math.ceil(math.log2(max(n, 2))))
    f = np.fft.rfftfreq(nfft, 1.0 / sr)
    fs = np.maximum(f, 1e-9)
    h = np.ones_like(f)
    if bp is not None:
        hp, lp = bp
    if hp:
        h *= 1.0 / np.sqrt(1.0 + (hp / fs) ** (2 * order))
    if lp:
        h *= 1.0 / np.sqrt(1.0 + (f / lp) ** (2 * order))
    return np.fft.irfft(np.fft.rfft(x, nfft) * h, nfft)[:n]


def _env_decay(t, attack, t60):
    env = np.ones_like(t)
    if attack > 0:
        env = np.minimum(t / attack, 1.0)
    if t60:
        env = env * np.exp(-t * LN1000 / t60)
    return env


def _env_sustain(t, attack, dur_s, release):
    env = np.ones_like(t)
    if attack > 0:
        env = np.minimum(t / attack, 1.0)
    rel_start = max(dur_s, 0.0)
    rel = np.clip((t - rel_start) / max(release, 1e-6), 0.0, 1.0)
    return env * (1.0 - rel)


def _osc(kind, phase_cycles, part, n, rng):
    if kind == "sine":
        return np.sin(2 * np.pi * phase_cycles)
    if kind == "tri":
        frac = phase_cycles % 1.0
        return 2.0 * np.abs(2.0 * frac - 1.0) - 1.0
    if kind == "pulse":
        frac = phase_cycles % 1.0
        return np.where(frac < part.get("duty", 0.5), 1.0, -1.0)
    if kind == "noise":
        return rng.standard_normal(n)
    raise ValueError("unknown oscillator: %s" % kind)


def _synth(name, midi, dur_s, sr, rng):
    v = VOICES[name]
    sustained = v.get("sustain", False)
    t60 = v.get("t60")
    if name == "HAT" and dur_s >= 0.12:
        t60 = v["t60_open"]
    attack = v.get("attack", 0.0)
    if sustained:
        total = max(dur_s, attack) + v.get("release", 0.0)
    else:
        total = attack + (t60 or 0.0) + 0.02
    n = max(1, int(round(total * sr)))
    t = np.arange(n) / sr

    # Częstotliwość bazowa.
    f0 = midi_to_hz(midi) if midi is not None else 220.0
    if "drift" in v:
        f0 *= 2.0 ** (rng.uniform(-v["drift"], v["drift"]) / 1200.0)
    mod = np.ones(n)
    if "vib" in v:
        rate, cents = v["vib"]
        mod = mod * (1.0 + (2.0 ** (cents / 1200.0) - 1.0) * np.sin(2 * np.pi * rate * t))
    if "sweep" in v:
        start, end, tsw = v["sweep"]
        f_inst = end + (start - end) * np.clip(1.0 - t / tsw, 0.0, 1.0)
    else:
        f_inst = f0 * mod
    if "fm" in v:
        rate, dev = v["fm"]
        f_inst = f_inst + dev * np.sin(2 * np.pi * rate * t)

    src = np.zeros(n)
    for part in v["parts"]:
        db = part.get("db", 0.0)
        gain = 10.0 ** (db / 20.0)
        if part["osc"] == "noise":
            sig = rng.standard_normal(n)
        else:
            if "hz" in part:
                f = np.full(n, part["hz"])
            else:
                f = f_inst * part.get("ratio", 1.0) * (2.0 ** (part.get("detune", 0.0) / 1200.0))
            phase = np.cumsum(f) / sr
            sig = _osc(part["osc"], phase, part, n, rng)
        src += gain * sig

    lp = v.get("lp")
    hp = v.get("hp")
    bp = v.get("bp")
    if bp is not None:
        src = _fft_filter(src, sr, bp=bp, order=4)
    elif lp or hp:
        src = _fft_filter(src, sr, lp=lp, hp=hp)

    if "comb" in v:
        delay_s, g = v["comb"]
        d = int(round(delay_s * sr))
        if 0 < d < n:
            src = src.copy()
            src[d:] += g * src[:-d]

    if sustained:
        env = _env_sustain(t, attack, dur_s, v.get("release", 0.0))
    else:
        env = _env_decay(t, attack, t60)
    out = src * env

    if "trem" in v:
        rate, depth = v["trem"]
        out = out * (1.0 - depth * 0.5 * (1.0 + np.sin(2 * np.pi * rate * t)))
    return out


def _to_stereo(mono, vel):
    peak = float(np.max(np.abs(mono))) if mono.size else 0.0
    if peak > 0:
        mono = mono * (PEAK * vel / peak)
    else:
        mono = np.zeros_like(mono)
    stereo = np.stack([mono, mono]).astype(np.float32)
    return stereo


def render(voice, midi, dur_s, vel, sr, rng):
    """Jeden dźwięk z palety. voice: kod (np. 'BELL') lub 'noise_<nazwa>' (szum z tools/music/noise/)."""
    if voice.startswith(NOISE_VOICES_PREFIX):
        raise ValueError("szumy renderuje tools/music/noise/, nie voices.render: %s" % voice)
    if voice not in VOICES:
        raise ValueError("unknown voice: %s" % voice)
    if rng is None:
        rng = np.random.default_rng(0)
    vel = min(max(float(vel), 0.0), 1.0)
    mono = _synth(voice, None if VOICES[voice].get("drum") else midi, float(dur_s), int(sr), rng)
    return _to_stereo(mono, vel)


def write_wav(path, stereo, sr):
    """Zapis 16-bit PCM WAV (stdlib), tylko do arkuszy odsłuchu i testów."""
    import wave
    data = np.clip(stereo.T, -1.0, 1.0)
    pcm = (data * 32767.0).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(int(sr))
        w.writeframes(pcm.tobytes())


def render_sheet(out_dir, sr=SR_DEFAULT, seed=1):
    """Arkusz odsłuchu: po jednym WAV na głos, 1 s, C4 (MIDI 60) dla strojonych, bez MIDI dla perkusji."""
    import os
    os.makedirs(out_dir, exist_ok=True)
    rng = np.random.default_rng(seed)
    paths = []
    for name in voice_names():
        audio = render(name, 60, 1.0, 1.0, sr, rng)
        path = os.path.join(out_dir, name + ".wav")
        write_wav(path, audio, sr)
        paths.append(path)
    return paths


if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "tmp/voice_sheet"
    for p in render_sheet(target):
        print(p)
