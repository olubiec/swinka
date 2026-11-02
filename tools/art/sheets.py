"""Shared sheet rendering: (age, coat, breed) -> frames, sheet array, metadata. Used by export scripts and verifiers."""
import importlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pig
from pig import S

SLOW = {'walk', 'run', 'popcorn', 'follow', 'flee', 'greet', 'hurdle', 'spin', 'ball_push', 'tunnel_in', 'tunnel_out',
        'house_enter', 'house_exit', 'come_called', 'dance'}


def render(age='adult', coat='ruda', breed='smooth'):
    """Returns (A, sheet) where A is the anims dict (name -> frames/fps/loop/opis) and sheet an RGBA ndarray."""
    pig.set_style(age, coat, breed)
    import anims, anims2
    importlib.reload(anims)
    importlib.reload(anims2)
    A = anims.A
    names = list(A)
    maxf = max(len(A[n]['frames']) for n in names)
    sheet = np.zeros((S * len(names), S * maxf, 4), np.uint8)
    for r, n in enumerate(names):
        for i, f in enumerate(A[n]['frames']):
            sheet[r * S:(r + 1) * S, i * S:(i + 1) * S] = f
    return A, sheet


def fps_for(age, name, fps):
    if age in ('senior', 'legend') and name in SLOW:
        return max(1, round(fps * 0.8))
    return fps
