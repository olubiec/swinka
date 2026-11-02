"""Shared sheet rendering: (age, coat, breed) -> frames, sheet array, metadata. Used by export scripts and verifiers."""
import importlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pig
from pig import S

SLOW = {'walk', 'run', 'popcorn', 'follow', 'flee', 'greet', 'hurdle', 'spin', 'ball_push', 'tunnel_in', 'tunnel_out',
        'house_enter', 'house_exit', 'come_called', 'dance'}


def render(age='adult', coat='ruda', breed='smooth', build='normal', pattern=None, palette=None, master=None):
    """Returns (A, sheet) where A is the anims dict (name -> frames/fps/loop/opis) and sheet an RGBA ndarray."""
    pig.set_style(age, coat, breed, build, pattern, palette, master)
    import anims, anims2, anims3
    importlib.reload(anims)
    importlib.reload(anims2)
    importlib.reload(anims3)
    A = anims.A
    if pig.STYLE['gold']:
        sparkle(A['idle']['frames'])
    names = list(A)
    maxf = max(len(A[n]['frames']) for n in names)
    sheet = np.zeros((S * len(names), S * maxf, 4), np.uint8)
    for r, n in enumerate(names):
        for i, f in enumerate(A[n]['frames']):
            sheet[r * S:(r + 1) * S, i * S:(i + 1) * S] = f
    for n, e in anims3.EXTRA.items():   # extra strips in the free columns of a host row
        r = names.index(e['host'])
        for i, f in enumerate(e['frames']):
            sheet[r * S:(r + 1) * S, (e['col'] + i) * S:(e['col'] + i + 1) * S] = f
    return A, sheet


EXTRA = lambda: __import__('anims3').EXTRA


GOLD = np.array([255, 226, 120, 255], np.uint8)
GOLD_D = np.array([201, 154, 46, 255], np.uint8)
SPARKS = ((13, 30, 0), (50, 24, 5), (34, 10, 10))   # x, y, phase


def sparkle(frames):
    """Legend: three small gold sparkles twinkling around the pig in 'idle' (only on transparent pixels)."""
    n = len(frames)
    for i, f in enumerate(frames):
        for (x, y, ph) in SPARKS:
            k = (i + ph) % n
            if k >= 7:
                continue
            big = k in (2, 3, 4)
            pts = [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)] if big else [(0, 0)]
            if k in (3,):
                pts += [(0, -2), (0, 2), (-2, 0), (2, 0)]
            for dx, dy in pts:
                xx, yy = x + dx, y + dy
                if 0 <= xx < S and 0 <= yy < S and f[yy, xx, 3] == 0:
                    f[yy, xx] = GOLD if (dx, dy) == (0, 0) or big else GOLD_D


def fps_for(age, name, fps):
    if age in ('senior', 'legend') and name in SLOW:
        return max(1, round(fps * 0.8))
    return fps
