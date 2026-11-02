"""Photo | sprite panels of the five named pigs, rendered directly (acceptance review for A1-A5): docs/album/compare/<id>.png.
Row: photos, then adult side, turn 30/60/90, baby, senior, legend."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pig, yaw
from export_named import PIGS

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
PHOTOS = {'ned': ['ned_02_front', 'ned_01_topdown'], 'kuki': ['kuki_02_rosettes', 'kuki_03_topdown'], 'glen': ['glen_01_rosette_black'],
          'james': ['james_01_scale_928g'], 'racuch': ['racuch_02_dill', 'racuch_01_scale_1032g']}


def panel(pid, k=5):
    b, u = PIGS[pid]
    tiles = []
    for age, fn in (('adult', lambda: pig.render_side()), ('adult', lambda: yaw.render_yaw(30)), ('adult', lambda: yaw.render_yaw(60)),
                    ('adult', lambda: yaw.render_yaw(90)), ('baby', lambda: pig.render_side()), ('senior', lambda: pig.render_side()),
                    ('legend', lambda: pig.render_side())):
        pig.set_style(age, breed=b, build=u, named=pid)
        tiles.append(fn())
    row = np.concatenate(tiles, 1)
    bg = np.full(row.shape[:2] + (3,), (222, 214, 200), np.uint8)
    a = row[..., 3:4] / 255.0
    row = (row[..., :3] * a + bg * (1 - a)).astype(np.uint8)
    sp = Image.fromarray(row).resize((row.shape[1] * k, row.shape[0] * k), Image.NEAREST)
    ph = [Image.open(os.path.join(ROOT, 'docs', 'reference', 'pigs', n + '.jpg')).convert('RGB') for n in PHOTOS[pid]]
    h = sp.height
    ph = [p.resize((round(p.width * h / p.height), h), Image.LANCZOS) for p in ph]
    W = sum(p.width for p in ph) + sp.width
    out = Image.new('RGB', (W, h), (250, 246, 240))
    x = 0
    for p in ph + [sp]:
        out.paste(p, (x, 0))
        x += p.width
    return out


if __name__ == '__main__':
    dst = os.path.join(ROOT, 'docs', 'album', 'compare')
    os.makedirs(dst, exist_ok=True)
    for pid in (sys.argv[1].split(',') if len(sys.argv) > 1 else PIGS):
        panel(pid).save(os.path.join(dst, pid + '.png'))
        print(pid)
