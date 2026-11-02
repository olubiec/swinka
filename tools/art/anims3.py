"""Rotation frames (G2). 'turn' (desktop, 4 frames, 0/30/60/90 deg) replaces the old flat 2-frame squeeze; the extra strips live
in the free columns of the same sheet row (turn_smooth: col 4-11, idle_34: col 12-15), see EXTRA and sheets.render."""
import anims
from anims import A, sn
from pig import render_side as R
import yaw

EXTRA = {}


def Y(d, **kw):
    return yaw.render_yaw(d, **kw)


A['turn'] = dict(frames=[R(), Y(30), Y(60), Y(90)], fps=10, loop=False,
                 opis='Turn from side to front (0, 30, 60, 90 degrees, volumetric)')
EXTRA['turn_smooth'] = dict(host='turn', col=4, fps=14, loop=False,
                            frames=[R()] + [Y(d) for d in (13, 26, 39, 52, 65, 78, 90)],
                            opis='Smooth turn from side to front, 8 frames (Home)')
EXTRA['idle_34'] = dict(host='turn', col=12, fps=6, loop=True,
                        frames=[Y(45, breathe=0.4 * sn(i / 4), ear=1 if i == 2 else 0, nose=1 if i == 1 else 0) for i in range(4)],
                        opis='Curious three-quarter pose: breath, nose, ear (Home)')
