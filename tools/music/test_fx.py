"""Testy efektów (MT-04, PM-03). Uruchom: python3 tools/music/test_fx.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fx  # noqa: E402

SR = 44100


def sine(freq, dur, amp=0.5):
    t = np.arange(int(dur * SR)) / SR
    x = amp * np.sin(2 * np.pi * freq * t)
    return np.stack([x, x])


def rms_db(x):
    return 20 * np.log10(max(np.sqrt(np.mean(x ** 2)), 1e-12))


def peak_freq(x):
    mono = x[0]
    mag = np.abs(np.fft.rfft(mono * np.hanning(len(mono))))
    return np.fft.rfftfreq(len(mono), 1.0 / SR)[int(np.argmax(mag))]


def test_reverb_tail_and_length():
    imp = np.zeros((2, SR // 10))
    imp[:, 0] = 1.0
    out = fx.apply([{"fx": "REV-M"}], imp, SR)
    assert out.shape[1] > imp.shape[1], "reverb must add a tail"
    early = rms_db(out[:, int(0.2 * SR):int(0.3 * SR)])
    late = rms_db(out[:, int(1.0 * SR):int(1.1 * SR)])
    assert early - late > 10, "REV-M tail should decay (early %.1f late %.1f dB)" % (early, late)


def test_reverb_wet_level():
    rng = np.random.default_rng(3)
    x = rng.standard_normal((2, SR)) * 0.2
    out = fx.apply([{"fx": "REV-S", "wet": 0.0}], x, SR)
    assert np.allclose(out[:, :SR], x, atol=1e-6), "wet 0 must be dry"
    wet = fx.apply([{"fx": "REV-S", "wet": 0.5}], x, SR)
    ratio = np.sqrt(np.mean(wet[:, :SR] ** 2)) / np.sqrt(np.mean(x ** 2))
    assert 0.3 < ratio < 1.2, "wet level off: %.2f" % ratio


def test_lowpass_and_highpass():
    lo = fx.apply([{"fx": "LP(1000)"}], sine(5000, 0.5), SR)
    hi = fx.apply([{"fx": "LP(1000)"}], sine(200, 0.5), SR)
    assert rms_db(lo) < rms_db(sine(5000, 0.5)) - 20, "LP(1000) must cut 5 kHz"
    assert abs(rms_db(hi) - rms_db(sine(200, 0.5))) < 1.0, "LP(1000) must keep 200 Hz"
    hp_out = fx.apply([{"fx": "HP(1000)"}], sine(200, 0.5), SR)
    assert rms_db(hp_out) < rms_db(sine(200, 0.5)) - 20, "HP(1000) must cut 200 Hz"


def test_tape_keeps_length_and_pitch():
    x = sine(440, 1.0)
    out = fx.apply([{"fx": "TAPE(0.2)"}], x, SR)
    assert out.shape == x.shape
    assert abs(peak_freq(out) - 440) < 3.0, "tape wobble should stay near 440 Hz"


def test_vinyl_adds_noise_at_level():
    silence = np.zeros((2, SR * 2))
    out = fx.apply([{"fx": "VINYL(-40)"}], silence, SR)
    level = rms_db(out)
    assert -55 < level < -25, "VINYL(-40) level %.1f dB" % level
    assert np.max(np.abs(out)) < 0.5, "crackle too loud"


def test_sat_shelf_lofi():
    x = sine(300, 0.5, amp=0.05)
    assert abs(rms_db(fx.apply([{"fx": "SAT(2)"}], x, SR)) - rms_db(x)) < 0.2, "SAT must keep small signals"
    loud = fx.apply([{"fx": "SAT(3)"}], sine(300, 0.5, amp=0.9), SR)
    assert np.max(np.abs(loud)) < 0.9 / 1.0 and np.max(np.abs(loud)) <= 1.0 / 3.0 + 1e-6, "SAT must soft-clip"
    hi = sine(8000, 0.5)
    cut = fx.apply([{"fx": "SHELF(-9)"}], hi, SR)
    assert rms_db(cut) < rms_db(hi) - 6, "SHELF(-9) must cut highs"
    lo = fx.apply([{"fx": "SHELF(-9)"}], sine(200, 0.5), SR)
    assert abs(rms_db(lo) - rms_db(sine(200, 0.5))) < 0.5, "SHELF must keep lows"
    y = fx.apply([{"fx": "LOFI"}], sine(300, 0.5, amp=0.5), SR)
    assert y.shape == sine(300, 0.5, amp=0.5).shape and abs(peak_freq(y) - 300) < 3.0


def test_crush_limits_levels():
    x = sine(300, 0.5, amp=0.9)
    out = fx.apply([{"fx": "CRUSH"}], x, SR)
    assert len(np.unique(np.round(out[0], 9))) <= 2 ** fx.CRUSH_BITS, "more than 8-bit levels"


def test_pan_and_width():
    x = sine(440, 0.2)
    left = fx.apply([{"fx": "PAN(-1)"}], x, SR)
    assert np.max(np.abs(left[1])) < 1e-6, "PAN(-1) must silence right"
    right = fx.apply([{"fx": "PAN(1)"}], x, SR)
    assert np.max(np.abs(right[0])) < 1e-6, "PAN(1) must silence left"
    mono = fx.apply([{"fx": "WIDTH(0)"}], np.stack([x[0], -x[0]]), SR)
    assert np.allclose(mono[0], mono[1], atol=1e-7), "WIDTH(0) must make mono"


def test_chain_order_and_float32():
    x = sine(440, 0.3)
    out = fx.apply([{"fx": "LP(4000)"}, {"fx": "PAN(0)"}], x, SR)
    assert out.dtype == np.float32 and out.shape[0] == 2


def test_bad_names_rejected():
    for bad in ({"fx": "DELAY"}, {"fx": "LP"}, {"fx": "rev-m"}):
        try:
            fx.apply([bad], sine(440, 0.1), SR)
        except ValueError:
            continue
        raise AssertionError("accepted %r" % bad)


def test_chorus_widens_keeps_length():
    x = sine(440, 1.0)
    out = fx.apply([{"fx": "CHORUS(3)"}], x, SR)
    assert out.shape == x.shape and out.dtype == np.float32
    assert not np.allclose(out[0], out[1], atol=1e-3), "chorus must decorrelate L/R"
    assert abs(peak_freq(out) - 440) < 5.0
    assert fx.apply([{"fx": "CHORUS"}], x, SR).shape == x.shape


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print("ok  " + t.__name__)
    print("FX TEST OK")


if __name__ == "__main__":
    main()
