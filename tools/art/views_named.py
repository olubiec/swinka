"""Contact sheet per named pig: side, yaw 30/60/90, front, back (adult) -> docs/album/views/<id>.png."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pig, yaw
from export_named import PIGS
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
def sheet(pid, k=6):
    b, u = PIGS[pid]
    pig.set_style('adult', breed=b, build=u, named=pid)
    fns = [lambda: pig.render_side(), lambda: yaw.render_yaw(30), lambda: yaw.render_yaw(60), lambda: yaw.render_yaw(90),
           lambda: pig.render_front(), lambda: pig.render_front(back=True)]
    row = np.concatenate([f() for f in fns], 1)
    bg = np.full(row.shape[:2] + (3,), (222, 214, 200), np.uint8)
    a = row[..., 3:4] / 255.0
    row = (row[..., :3] * a + bg * (1 - a)).astype(np.uint8)
    return Image.fromarray(row).resize((row.shape[1] * k, row.shape[0] * k), Image.NEAREST)
if __name__ == '__main__':
    d = os.path.join(ROOT, 'docs', 'album', 'views'); os.makedirs(d, exist_ok=True)
    for pid in PIGS:
        sheet(pid).save(os.path.join(d, pid + '.png')); print(pid)
