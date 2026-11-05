"""Zamykanie utworu (MT-05, PM-06): zawinięcie ogona, zerowe przejście, LUFS, limiter, OGG.

Kontrakt: finish(audio, spec, out_path=None, sr=44100) -> path   (tools/music/CONTRACT.md)

Kroki:
1. Długość ciała: loop.end_s, jeśli podany; inaczej bars * meter * 60 / bpm.
2. Pętla (loop.enabled): ogon poza ciałem (pogłos) dodawany na początek (zawinięcie).
3. Cięcie na zerowym przejściu (najbliższym końca ciała, ±10 ms), mikrofade 2 ms na obu końcach.
4. Głośność: zmierzona przez ffmpeg `ebur128` (BS.1770 zintegrowana), korekta do master.lufs.
5. Limiter `alimiter` (limit -1 dBTP) i kodowanie libvorbis do OGG. Pętla kontrolna: do 4 przebiegów,
   aż LUFS mieści się w ±0,2 i szczyt true peak ≤ -1 dBTP.

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
ZERO_SEARCH_S = 0.010
LIMIT_DBTP = -1.0
LUFS_TOL = 0.2
MAX_PASSES = 4
LAST_REPORT = {}  # ostatni wynik finish(): lufs, true_peak_dbtp, gain_db, path
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


def _encode(audio, sr, out_path, gain_db):
    limit = 10.0 ** (LIMIT_DBTP / 20.0)
    af = "volume=%.3fdB,alimiter=limit=%.4f:level=0" % (gain_db, limit)
    code, err = _run_ffmpeg([
        "-f", "f32le", "-ar", str(sr), "-ac", "2", "-i", "pipe:0",
        "-af", af, "-c:a", "libvorbis", "-q:a", "6", "-ar", str(sr), "-y", out_path,
    ], stdin_bytes=_raw_bytes(audio))
    if code != 0:
        raise RuntimeError("ffmpeg encode failed: " + err[-300:])


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
        _encode(imp, sr, path, 0.0)
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
    delay = codec_delay(sr)
    if loop.get("enabled"):
        body = wrap_tail(audio, body_len)
        cut = nearest_zero_cross(body[0], body_len, int(ZERO_SEARCH_S * sr))
        src = microfade(body[:, :cut].copy(), sr)
        pad = body[:, cut:cut + delay]
    else:
        src = microfade(audio.copy(), sr)
        pad = np.zeros((2, delay))
    # Kodek opóźnia dźwięk o `delay` próbek i gubi tyle próbek z końca. Dopisanie `delay` próbek
    # na koniec sprawia, że cała treść wraca, a szew pętli zostaje zerowy.
    if pad.shape[1] < delay:
        pad = np.concatenate([pad, np.zeros((2, delay - pad.shape[1]))], axis=1)
    enc = np.clip(np.concatenate([src, pad], axis=1), -1.0, 1.0)

    out_path = out_path or default_out_path(spec)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    target = float(spec["master"]["lufs"])

    gain = 0.0
    with tempfile.TemporaryDirectory() as tmpdir:
        probe = os.path.join(tmpdir, "probe.ogg")
        lufs, tp = None, None
        for _ in range(MAX_PASSES):
            _encode(enc, sr, probe, gain)
            lufs, tp = measure_file(probe)
            ok_lufs = abs(lufs - target) <= LUFS_TOL
            ok_tp = tp <= LIMIT_DBTP + 0.05
            if ok_lufs and ok_tp:
                break
            gain += target - lufs
        shutil.copyfile(probe, out_path)
    LAST_REPORT.clear()
    LAST_REPORT.update({"lufs": lufs, "true_peak_dbtp": tp, "gain_db": gain, "delay": delay,
                        "path": out_path})
    return out_path


if __name__ == "__main__":
    import sys
    print("finish.py jest modułem; używa go render.py (MW-1+).", file=sys.stderr)
    sys.exit(2)
