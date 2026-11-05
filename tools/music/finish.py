"""Zamykanie utworu (MT-05, PM-06): zawinięcie ogona, zerowe przejście, LUFS, limiter, OGG.

Kontrakt: finish(audio, spec, out_path=None, sr=44100) -> path   (tools/music/CONTRACT.md)

Kroki:
1. Długość ciała: loop.end_s, jeśli podany; inaczej bars * meter * 60 / bpm.
2. Pętla (loop.enabled): ogon poza ciałem (pogłos) dodawany na początek (zawinięcie).
3. Mikrofade 2 ms na obu końcach (długość pętli dokładnie body_len, szew bez kliknięcia).
4. Głośność: zmierzona przez ffmpeg `ebur128` (BS.1770 zintegrowana), korekta do master.lufs.
5. Limiter wyprzedzający w numpy (sufit próbek CEILING_DBFS, bez opóźnienia) i kodowanie libvorbis do OGG
   o dokładnie n próbkach. Pętla kontrolna: do MAX_PASSES przebiegów, aż LUFS mieści się w ±0,2
   i szczyt true peak ≤ -1 dBTP.

Wymaga ffmpeg z libvorbis (w kontenerze jest). Bez ffmpeg funkcja zgłasza RuntimeError.
"""
import os
import re
import shutil
import subprocess
import tempfile

import numpy as np

SR_DEFAULT = 44100
MICROFADE_S = 0.002
LIMIT_DBTP = -1.0  # sufit spec (master.ceiling_dbtp)
TP_TARGET_DBTP = -1.05  # twardy cel po kodowaniu: true peak <= tej wartości
TP_AIM_DBTP = -1.15  # wartość, do której obniżamy sufit próbek po przekroczeniu
CEILING_DBFS = -1.5  # sufit próbek limitera; zapas na międzypróbkowe szczyty (true peak)
LOOK_S = 0.005  # wyprzedzenie limitera (połowa okna)
MAX_LEN_TRIES = 4
LUFS_TOL = 0.2
MAX_PASSES = 8
LAST_REPORT = {}  # ostatni wynik finish(): lufs, true_peak_dbtp, gain_db, delay, path
OUT_DIR_BY_KIND = {
    "theme": "home", "bed": "beds", "place": "places", "room": "places",
    "minigame": "minigames", "jingle": "jingles", "noise": "noise",
}
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _ffmpeg():
    exe = shutil.which("ffmpeg")
    if not exe:
        raise RuntimeError("ffmpeg nie jest zainstalowany (potrzebny do LUFS i OGG)")
    return exe


def body_length(spec, sr):
    """Długość ciała w próbkach: loop.end_s albo pełne takty."""
    loop = spec.get("loop", {})
    if loop.get("enabled") and "end_s" in loop:
        return int(round(loop["end_s"] * sr))
    seconds = spec["bars"] * spec["meter"] * 60.0 / spec["bpm"]
    return int(round(seconds * sr))


def wrap_tail(audio, body_len):
    """Zawija ogon (próbki od body_len) na początek. Zwraca (2, body_len)."""
    body = audio[:, :body_len].copy()
    tail = audio[:, body_len:]
    if tail.shape[1]:
        m = min(tail.shape[1], body_len)
        body[:, :m] += tail[:, :m]
        if tail.shape[1] > body_len:
            # ogon dłuższy niż ciało: dokładamy kolejne okrążenia
            rest = tail[:, body_len:]
            while rest.shape[1]:
                k = min(rest.shape[1], body_len)
                body[:, :k] += rest[:, :k]
                rest = rest[:, k:]
    return body


def nearest_zero_cross(mono, target, window):
    """Indeks najbliższego zmiany znaku w pobliżu target (±window próbek); target gdy brak."""
    lo = max(1, target - window)
    hi = min(len(mono) - 1, target + window)
    if hi <= lo:
        return max(0, min(target, len(mono)))
    seg = mono[lo - 1:hi]
    sign = np.signbit(seg)
    changes = np.nonzero(sign[1:] != sign[:-1])[0]
    if changes.size == 0:
        return target
    idx = lo + changes  # pierwsza próbka po zmianie znaku
    return int(idx[np.argmin(np.abs(idx - target))])


def microfade(audio, sr):
    n = int(MICROFADE_S * sr)
    if n <= 0 or audio.shape[1] < 2 * n:
        return audio
    ramp = np.linspace(0.0, 1.0, n)
    audio[:, :n] *= ramp
    audio[:, -n:] *= ramp[::-1]
    return audio


def _raw_bytes(audio):
    return np.ascontiguousarray(audio.T, dtype="<f4").tobytes()


def _run_ffmpeg(args, stdin_bytes=None):
    proc = subprocess.run([_ffmpeg(), "-hide_banner", "-nostdin"] + args,
                          input=stdin_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return proc.returncode, proc.stderr.decode("utf-8", "replace")


def measure_file(path):
    """Zwraca (zintegrowana LUFS, true peak dBTP) z ffmpeg ebur128."""
    code, err = _run_ffmpeg(["-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"])
    if code != 0:
        raise RuntimeError("ffmpeg ebur128 failed: " + err[-300:])
    lufs = None
    m = re.findall(r"I:\s+(-?[0-9.]+) LUFS", err)
    if m:
        lufs = float(m[-1])
    tp = None
    summary = err.split("True peak:")
    if len(summary) > 1:
        p = re.search(r"Peak:\s+(-?[0-9.]+) dBFS", summary[-1])
        if p:
            tp = float(p.group(1))
    if lufs is None or tp is None:
        raise RuntimeError("could not parse ebur128 output")
    return lufs, tp


def _sliding_min(a, w):
    """Minimum w kolejnych próbek: wynik[i] = min(a[i:i+w]) (długość len(a)-w+1)."""
    b, p = a, 1
    while 2 * p <= w:  # doubling: b[i] = min(a[i:i+p])
        b = np.minimum(b[:-p], b[p:])
        p *= 2
    return np.minimum(b[:len(b) - (w - p)], b[w - p:])


def limit_peaks(audio, sr, ceiling_dbfs=CEILING_DBFS):
    """Limiter wyprzedzający w numpy (bez opóźnienia): gain-envelope, która nigdy nie przekracza sufitu.

    Dla każdej próbki z przekroczeniem wymagany gain = sufit/szczyt. Minimum z okna ±LOOK_S,
    potem średnia z tego samego okna: w każdym szczycie gain <= wymagany, a zmiany są łagodne.
    """
    ceiling = 10.0 ** (ceiling_dbfs / 20.0)
    peak = np.max(np.abs(audio), axis=0)
    over = peak > ceiling
    if not over.any():
        return audio
    req = np.ones(audio.shape[1])
    req[over] = ceiling / peak[over]
    w_half = max(1, int(round(LOOK_S * sr)))
    w = 2 * w_half + 1
    m = _sliding_min(np.pad(req, w_half, mode="edge"), w)
    cs = np.concatenate([[0.0], np.cumsum(np.pad(m, w_half, mode="edge"))])
    gain = (cs[w:] - cs[:-w]) / w
    return audio * gain[None, :]


def _decoded_len(path):
    return _decode(path).shape[1]


def _write_ogg(audio, sr, out_path):
    code, err = _run_ffmpeg([
        "-f", "f32le", "-ar", str(sr), "-ac", "2", "-i", "pipe:0",
        "-c:a", "libvorbis", "-q:a", "6", "-ar", str(sr), "-y", out_path,
    ], stdin_bytes=_raw_bytes(audio))
    if code != 0:
        raise RuntimeError("ffmpeg encode failed: " + err[-300:])


def _encode(audio, sr, out_path):
    """Koduje (2, n) do OGG o dokładnie n próbkach (bez limitera: alimiter dawał 219 próbek opóźnienia).

    libvorbis (ffmpeg) czasem gubi kilka próbek z końca. Dopisujemy ciszę do wejścia i szukamy
    najmniejszej długości wejścia m >= n, dla której dekodowanie daje dokładnie n próbek.
    """
    n = audio.shape[1]
    for extra in range(MAX_LEN_TRIES):
        inp = np.concatenate([audio, np.zeros((2, extra))], axis=1) if extra else audio
        _write_ogg(inp, sr, out_path)
        if _decoded_len(out_path) == n:
            return
    raise RuntimeError("nie udało się zapisać OGG o dokładnie %d próbkach" % n)


def default_out_path(spec):
    folder = OUT_DIR_BY_KIND.get(spec.get("kind"))
    if folder is None:
        raise ValueError("no default folder for kind %r; pass out_path" % spec.get("kind"))
    return os.path.join(ROOT, "assets", "music", folder, spec["id"] + ".ogg")


_DELAY = {}


def _decode(path):
    """Dekodowanie OGG do (2, n) float64 przez ffmpeg."""
    proc = subprocess.run([_ffmpeg(), "-hide_banner", "-nostdin", "-loglevel", "error", "-i", path,
                           "-f", "f32le", "-ac", "2", "-ar", str(SR_DEFAULT), "pipe:1"],
                          stdout=subprocess.PIPE, check=True)
    return np.frombuffer(proc.stdout, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def codec_delay(sr):
    """Opóźnienie kodeka Vorbis w próbkach: impuls w 20000, mierzymy, gdzie wraca po dekodowaniu."""
    if sr in _DELAY:
        return _DELAY[sr]
    imp = np.zeros((2, sr))
    imp[:, 20000] = 0.5
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "delay.ogg")
        _write_ogg(imp, sr, path)
        x = _decode(path)[0]
    _DELAY[sr] = int(np.argmax(np.abs(x))) - 20000
    return _DELAY[sr]


def finish(audio, spec, out_path=None, sr=SR_DEFAULT):
    audio = np.asarray(audio, dtype=np.float64)
    if audio.ndim == 1:
        audio = np.stack([audio, audio])
    if audio.shape[0] != 2:
        raise ValueError("audio must have shape (2, n)")
    _ffmpeg()  # wczesny błąd, gdy brak ffmpeg

    body_len = body_length(spec, sr)
    loop = spec.get("loop", {})
    if loop.get("enabled"):
        # dokładnie body_len próbek; szew domykają mikrofady 2 ms na obu końcach (zero na szwie)
        src = microfade(wrap_tail(audio, body_len), sr)
    else:
        src = microfade(audio.copy(), sr)

    out_path = out_path or default_out_path(spec)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    target = float(spec["master"]["lufs"])
    delay = codec_delay(sr)

    gain = 0.0  # dB, korekta głośności do master.lufs
    ceiling = CEILING_DBFS  # sufit próbek limitera; obniżany, gdy true peak po kodowaniu jest za wysoki
    with tempfile.TemporaryDirectory() as tmpdir:
        probe = os.path.join(tmpdir, "probe.ogg")
        lufs, tp = None, None
        for _ in range(MAX_PASSES):
            gain_lin = 10.0 ** (gain / 20.0)
            limited = limit_peaks(np.clip(src * gain_lin, -4.0, 4.0), sr, ceiling)
            _encode(limited, sr, probe)
            lufs, tp = measure_file(probe)
            ok_lufs = abs(lufs - target) <= LUFS_TOL
            ok_tp = tp <= TP_TARGET_DBTP
            if ok_lufs and ok_tp:
                break
            if not ok_lufs:
                gain += target - lufs
            if not ok_tp:
                # przesunięcie tp względem sufitu (międzypróbkowe szczyty) zostaje takie samo
                ceiling = TP_AIM_DBTP - (tp - ceiling)
        shutil.copyfile(probe, out_path)
    LAST_REPORT.clear()
    LAST_REPORT.update({"lufs": lufs, "true_peak_dbtp": tp, "gain_db": gain, "delay": delay,
                        "path": out_path})
    return out_path


if __name__ == "__main__":
    import sys
    print("finish.py jest modułem; używa go render.py (MW-1+).", file=sys.stderr)
    sys.exit(2)
