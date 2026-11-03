"""Silnik swiatla stylu "domek z siana" (biblioteka, wersja z prototypu light_demo.py).

Dane z assets/data/lights.json (ambient pory dnia + zrodla), wynik dla swiata
zawsze w palecie style_palette.json (dither Bayer 4x4, 5 stopni). Swinki oswietla
sie bez kwantyzacji (tint=True, decyzja 2 z legendy). Poprawka wzgledem prototypu:
srodek blasku nie wypala sie do bieli, jasnosc wyniku jest przycieta do flame[3].

    from light import render
    out = render(img_rgba, "night", [("fireplace", 120, 90), ("candle", 40, 100)])

Wspolrzedne zrodel w px obrazu (1x). Promien = radius_cells * 16 px.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LIGHTS = json.loads((ROOT / "assets/data/lights.json").read_text(encoding="utf-8"))
_pal = json.loads((ROOT / "assets/data/style_palette.json").read_text(encoding="utf-8"))
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.5
STEPS = LIGHTS.get("steps", 5)


def _hx(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], float) / 255.0


PALETTE = np.array([_hx(c) for r in _pal["ramps"].values() for c in r]
                   + [_hx(c) for c in _pal["outline"].values()])
FLAME3 = _hx(_pal["ramps"]["flame"][3])
_LUMW = np.array([0.299, 0.587, 0.114])
LUM_CAP = float((_hx(_pal["ramps"]["flame"][2]) * 0.4 + FLAME3 * 0.6) @ _LUMW)  # miedzy flame[2] a flame[3], bez bieli


def ambient(tod):
    a = LIGHTS["ambient"][tod]
    return np.array(a["color"], float) * a["level"]


def _source(kind):
    s = LIGHTS["sources"][kind]
    col = s["color"]
    if col == "ambient":
        col = LIGHTS["ambient"]["day"]["color"]
    return np.array(col, float), s["radius_cells"] * 16.0, s["strength"], s.get("flicker", 0.0)


def illumination(shape, tod, lights, seed=0, phase=0.0, masks=None):
    """(illum[h,w,3] mnoznik, glow[h,w,3] dodatek). lights: (kind, x, y[, scale]).
    masks: opcjonalnie {indeks_zrodla: float[h,w] 0..1} (np. snop przez okno)."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    illum = np.ones((h, w, 3)) * ambient(tod)
    glow = np.zeros((h, w, 3))
    rng = np.random.RandomState(seed)
    night = tod in ("evening", "night")
    for i, L in enumerate(lights):
        kind, x, y = L[0], L[1], L[2]
        k = L[3] if len(L) > 3 else 1.0
        col, r, s, fl = _source(kind)
        r = r * (1 + rng.uniform(-fl, fl) * (1 + np.sin(phase)))
        d = np.sqrt((xx - x) ** 2 + ((yy - y) * 1.25) ** 2) / max(r, 1e-6)
        f = np.clip(1 - d, 0, 1) ** 1.6 * s * k
        if masks and i in masks:
            f = f * masks[i]
        f = np.clip(np.floor(f * STEPS + BAYER[yy % 4, xx % 4] + 0.5) / STEPS, 0, 1)[..., None]
        illum = illum + f * col * (1.15 if night else 0.55)
        glow = glow + f * col * 0.22
    return illum, glow


def _cap(out):
    """Przycina jasnosc: piksel jasniejszy niz flame[3] skaluje sie w dol."""
    lum = out @ _LUMW
    sc = np.where(lum > LUM_CAP, LUM_CAP / np.maximum(lum, 1e-6), 1.0)
    return out * sc[..., None]


def quantize(out):
    flat = out.reshape(-1, 3)
    wgt = np.array([0.9, 1.0, 0.8])
    d2 = (((flat[:, None, :] - PALETTE[None]) * wgt) ** 2).sum(-1)
    return PALETTE[d2.argmin(1)].reshape(out.shape)


def render(img, tod, lights=(), quantized=True, seed=0, phase=0.0, masks=None):
    """img: PIL RGB/RGBA. quantized=False dla swinek (tint bez kwantyzacji i ditheru)."""
    im = img.convert("RGBA")
    a = np.asarray(im, float) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    h, w, _ = rgb.shape
    illum, glow = illumination((h, w), tod, lights, seed, phase, masks)
    out = np.clip(rgb * illum, 0, 1)
    out = 1 - (1 - out) * (1 - np.clip(glow, 0, 1))
    out = _cap(np.clip(out, 0, 1)) if quantized else np.clip(out, 0, 1)
    if quantized:
        yy, xx = np.mgrid[0:h, 0:w]
        out = np.clip(out + BAYER[yy % 4, xx % 4][..., None] * 0.035, 0, 1)
        out = quantize(out)
    res = np.dstack([out, alpha])
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), "RGBA")
