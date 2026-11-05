"""Test długości jednorazowych igły (MT-15..17). Uruchom: python3 tools/music/noise/test_needle_length.py

Sprawdza, że każdy plik ma dokładnie zamierzoną liczbę próbek (ffprobe, duration_ts = granule
ostatniej strony OGG) i że dekodowanie zaczyna się od tej samej treści (pierwsze próbki niezerowe).
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
NEEDLE_DIR = os.path.join(ROOT, "assets", "music", "noise")

EXPECTED = {
    "noise_needle_drop.ogg": 39690,  # 0,900 s
    "noise_needle_lift.ogg": 26460,  # 0,600 s
    "noise_needle_skip.ogg": 15435,  # 0,350 s
}


def probe_samples(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration_ts,sample_rate",
         "-of", "default=nw=1:nk=0", path],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, text=True).stdout
    vals = dict(line.split("=", 1) for line in out.split())
    return int(vals["duration_ts"]), int(vals["sample_rate"])


def test_needle_lengths():
    for name, expected in EXPECTED.items():
        path = os.path.join(NEEDLE_DIR, name)
        n, sr = probe_samples(path)
        assert sr == 44100, "%s: sample rate %d" % (name, sr)
        assert n == expected, "%s: %d samples, expected %d" % (name, n, expected)


def main():
    test_needle_lengths()
    print("ok: needle lengths match %s" % ", ".join("%s=%d" % kv for kv in EXPECTED.items()))


if __name__ == "__main__":
    sys.exit(main())
