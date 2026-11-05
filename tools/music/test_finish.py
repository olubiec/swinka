"""Testy zamykania utworu (MT-05, PM-06). Uruchom: python3 tools/music/test_finish.py

Wymaga ffmpeg z libvorbis. Sprawdza: szew pętli (5 kopii) i dokładną długość pętli, limiter sufitu próbek, LUFS ±0,5 od master.lufs,
true peak ≤ -1 dBTP, zawinięcie ogona, pętla wyłączona zachowuje ogon.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import finish as F  # noqa: E402

SR = 44100


def base_spec(**over):
    spec = {"id": "test_loop", "kind": "bed", "bars": 2, "meter": 4, "bpm": 120,
            "master": {"lufs": -18, "ceiling_dbtp": -1}, "loop": {"enabled": True}}
    spec.update(over)
    return spec


def decode(path):
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error", "-i", path,
                           "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"],
                          stdout=subprocess.PIPE, check=True)
    return np.frombuffer(proc.stdout, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def test_wrap_tail_adds_tail_to_start():
    audio = np.zeros((2, 10))
    audio[:, 8:] = 1.0  # ogon: 2 próbki poza ciałem o długości 8
    body = F.wrap_tail(audio, 8)
    assert body.shape == (2, 8)
    assert np.allclose(body[:, :2], 1.0) and np.allclose(body[:, 2:], 0.0)


def test_zero_cross_is_near_target():
    x = np.sin(2 * np.pi * 440 * np.arange(SR) / SR)
    idx = F.nearest_zero_cross(x, 10000, 441)
    assert abs(x[idx]) < 0.05, "cut not at a zero crossing"
    assert abs(idx - 10000) <= 441


def test_loop_seam_is_inaudible():
    spec = base_spec()
    n = F.body_length(spec, SR)
    t = np.arange(n) / SR
    # niecałkowita liczba cykli: próbki na początku i końcu są niezerowe
    tone = 0.4 * np.sin(2 * np.pi * 440.5 * t + 0.7) + 0.2 * np.cos(2 * np.pi * 1234.0 * t)
    assert abs(tone[0]) > 0.1 and abs(tone[-1]) > 0.1, "test signal must be non-zero at the ends"
    audio = np.stack([tone, tone])
    with tempfile.TemporaryDirectory() as d:
        out = F.finish(audio, spec, out_path=os.path.join(d, "loop.ogg"), sr=SR)
        x = decode(out)
    assert x.shape[1] == n, "loop length %d != %d" % (x.shape[1], n)
    diffs = np.abs(np.diff(x[0]))
    typical = np.median(diffs)
    seam = np.abs(x[0, -1] - x[0, 0])
    assert seam < 3.0 * typical + 1e-3, "seam %.5f vs typical step %.5f" % (seam, typical)
    five = np.concatenate([x[0]] * 5)
    seams = np.abs(five[len(x[0]) - 1::len(x[0])][:4] - five[len(x[0])::len(x[0])][:4])
    assert np.all(seams < 3.0 * typical + 1e-3), "repeated seams click"


def test_limiter_keeps_sample_peak_under_ceiling():
    rng = np.random.default_rng(3)
    x = rng.standard_normal((2, 20000)) * 0.6
    x[:, 5000] = 2.0  # pojedynczy szczyt
    y = F.limit_peaks(x, SR)
    ceiling = 10.0 ** (F.CEILING_DBFS / 20.0)
    assert np.max(np.abs(y)) <= ceiling + 1e-9, "peak %.4f > %.4f" % (np.max(np.abs(y)), ceiling)


def test_lufs_and_true_peak_on_target():
    rng = np.random.default_rng(11)
    spec = base_spec(bars=8, bpm=60)  # 32 s
    n = F.body_length(spec, SR)
    audio = rng.standard_normal((2, n)) * 0.3
    with tempfile.TemporaryDirectory() as d:
        out = F.finish(audio, spec, out_path=os.path.join(d, "lufs.ogg"), sr=SR)
        lufs, tp = F.measure_file(out)
    assert abs(lufs - (-18.0)) <= 0.5, "LUFS %.2f" % lufs
    assert tp <= F.TP_TARGET_DBTP, "true peak %.2f dBTP" % tp


def test_non_loop_keeps_tail():
    spec = base_spec(loop={"enabled": False}, bars=1, bpm=120)  # ciało 2 s
    n = F.body_length(spec, SR) + SR // 2
    audio = np.zeros((2, n))
    audio[:, -100:] = 0.1
    with tempfile.TemporaryDirectory() as d:
        out = F.finish(audio, spec, out_path=os.path.join(d, "tail.ogg"), sr=SR)
        x = decode(out)
    assert x.shape[1] >= n - SR // 100, "tail was cut: %d < %d" % (x.shape[1], n)


def main():
    if F.shutil.which("ffmpeg") is None:
        print("SKIP: brak ffmpeg")
        return 0
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print("ok  " + t.__name__)
    print("FINISH TEST OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
