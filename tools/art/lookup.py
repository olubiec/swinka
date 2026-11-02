"""Reads the shipped sheets the way the game does (master sheet + palette remap) for contact sheets, albums and comparisons."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import palettes

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'sprites')
_cache = {}


def folder(shape, stage):
    return os.path.join(ROOT, stage) if shape == 'smooth_normal' else os.path.join(ROOT, 'breeds', shape, stage)


def remap(sheet, pairs):
    out = sheet.copy()
    for a, b in pairs:
        ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
        cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
        m = (sheet[..., 0] == ca[0]) & (sheet[..., 1] == ca[1]) & (sheet[..., 2] == ca[2]) & (sheet[..., 3] == 255)
        out[m, 0], out[m, 1], out[m, 2] = cb
    return out


def sheet(shape, stage, pattern, palette):
    k = (shape, stage, pattern, palette)
    if k not in _cache:
        f = folder(shape, stage)
        a = np.array(Image.open(os.path.join(f, 'spritesheet.png')).convert('RGBA'))
        _cache[k] = remap(a, palettes.pairs(pattern, palette, stage == 'senior'))
    return _cache[k]


def meta(shape, stage):
    f = folder(shape, stage)
    m = json.load(open(os.path.join(f, 'animations.json'), encoding='utf-8'))['animations']
    m.update(json.load(open(os.path.join(f, 'rotation.json'), encoding='utf-8'))['strips'])   # turn_smooth, idle_34
    return m


def frame(shape, stage, pattern, palette, anim, i=0):
    m = meta(shape, stage)[anim]
    r, c = m['row'], m.get('col', 0) + i
    return sheet(shape, stage, pattern, palette)[r * 64:(r + 1) * 64, c * 64:(c + 1) * 64]


def look_of(name):
    b, u, pt, pl = palettes.PT.NAMED[name]
    return b + '_' + u, pt, pl


def tile(frames, scale=3, bg=(222, 214, 200), cols=None):
    cols = cols or len(frames)
    rows = (len(frames) + cols - 1) // cols
    W = 64 * scale
    im = Image.new('RGB', (W * cols, W * rows), bg)
    for i, f in enumerate(frames):
        a = Image.fromarray(f, 'RGBA').resize((W, W), Image.NEAREST)
        im.paste(a, ((i % cols) * W, (i // cols) * W), a)
    return im
