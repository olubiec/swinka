"""Wave F4: 45 placeable world items (house 14, garden 15, park 12, farm 4) -> assets/world/<place>/<id>.png (+_x2) and assets/world/atlas.json"""
import json, os, sys
import numpy as np
from worldart import *

ITEMS = {}   # id -> (place, w, h, fn)
def it(place, id, w, h):
    def d(fn):
        ITEMS[id] = (place, w, h, fn); return fn
    return d
def new(w, h): return Im(16 * w, 16 * h)
def stripes(im, x0, y0, x1, y1, c1, c2, n=2):
    for x in range(x0, x1):
        if ((x - x0) // n) % 2: im.rect(x, y0, x + 1, y1, C(c2))
def post(im, x, y0, y1, c='wood'): box(im, x, y0, x + 2, y1, c)
def leaves(im, cx, cy, rx, ry):
    blob(im, cx, cy, rx, ry, 'green'); blob(im, cx - rx * .35, cy - ry * .35, rx * .5, ry * .45, 'lime'); blob(im, cx + rx * .4, cy + ry * .3, rx * .45, ry * .4, 'darkgreen')

# ---------------------------------------------------------------- house
@it('house', 'sofa_cosy', 3, 2)
def _():
    im = new(3, 2); box(im, 2, 8, 46, 28, 'pink'); box(im, 0, 12, 8, 30, 'fabric'); box(im, 40, 12, 48, 30, 'fabric')
    box(im, 8, 18, 40, 28, 'pink'); im.rect(24, 18, 25, 28, C('fabric')); box(im, 4, 4, 44, 12, 'pink'); im.rect(5, 28, 8, 31, C('dbrown')); im.rect(40, 28, 43, 31, C('dbrown'))
    for x in (14, 32): blob(im, x, 17, 3.5, 2.5, 'cream')
    return im
@it('house', 'armchair', 2, 2)
def _():
    im = new(2, 2); box(im, 4, 4, 28, 14, 'blue'); box(im, 0, 12, 8, 28, 'blue'); box(im, 24, 12, 32, 28, 'blue'); box(im, 8, 18, 24, 28, 'lblue'); im.rect(5, 28, 8, 31, C('dbrown')); im.rect(24, 28, 27, 31, C('dbrown')); return im
@it('house', 'bookshelf', 2, 3)
def _():
    im = new(2, 3); box(im, 2, 2, 30, 46, 'wood'); im.rect(5, 5, 27, 43, C('dbrown'))
    for k, y in enumerate((5, 18, 31)):
        im.rect(5, y + 11, 27, y + 13, C('wood'))
        x = 6
        for j in range(6):
            w = 3 + (hs(j, k) % 2); c = ('red', 'blue', 'green', 'yellow', 'purple', 'orange')[(j + k * 2) % 6]
            h = 8 + hs(j, k, 1) % 3; box(im, x, y + 11 - h, x + w, y + 11, c); x += w + 1
    return im
@it('house', 'side_table', 1, 1)
def _():
    im = new(1, 1); box(im, 2, 5, 14, 8, 'wood'); im.rect(3, 8, 5, 15, C('brown')); im.rect(11, 8, 13, 15, C('brown')); blob(im, 8, 3, 2.5, 2.5, 'lblue'); return im
@it('house', 'cushion_big', 1, 1)
def _():
    im = new(1, 1); blob(im, 8, 9, 7, 5.6, 'fabric'); im.line(3, 6, 13, 12, C('pink')); im.px(8, 9, 'ffd0e0'); return im
@it('house', 'toy_basket', 1, 1)
def _():
    im = new(1, 1); box(im, 2, 8, 14, 15, 'wood')
    for x in range(4, 14, 3): im.rect(x, 9, x + 1, 15, C('dbrown'))
    blob(im, 5, 6, 2.4, 2.4, 'red'); blob(im, 9, 5, 2.4, 2.4, 'blue'); blob(im, 12, 7, 2, 2, 'yellow'); return im
@it('house', 'hay_bar_wood', 2, 1)
def _():
    im = new(2, 1); box(im, 1, 7, 31, 14, 'wood'); im.rect(3, 14, 6, 16, C('dbrown')); im.rect(26, 14, 29, 16, C('dbrown'))
    for x in range(3, 29, 2): im.line(x, 6, x + (hs(x, 0) % 3 - 1), 2 + hs(x, 1) % 3, C('hay') if 'hay' in PAL else 'cdb556')
    return im
@it('house', 'window_sun', 2, 2)
def _():
    im = new(2, 2); box(im, 2, 2, 30, 30, 'white'); im.rect(5, 5, 27, 27, C('sky')); im.rect(15, 5, 17, 27, C('white')); im.rect(5, 15, 27, 17, C('white'))
    blob(im, 10, 10, 3, 3, 'yellow'); im.rect(5, 22, 27, 27, 'a9dcb0'); return im
@it('house', 'curtains_dots', 2, 2)
def _():
    im = new(2, 2); im.rect(2, 1, 30, 3, C('dbrown'))
    for (x0, x1) in ((3, 12), (20, 29)):
        box(im, x0, 3, x1, 30, 'pink')
        for (x, y) in ((x0 + 2, 8), (x0 + 6, 14), (x0 + 3, 20), (x0 + 6, 26)): im.rect(x, y, x + 2, y + 2, C('white'))
    return im
@it('house', 'wall_clock', 1, 1)
def _():
    im = new(1, 1); blob(im, 8, 8, 6.5, 6.5, 'cream'); im.line(8, 8, 8, 4, C('black')); im.line(8, 8, 11, 8, C('black')); im.px(8, 2, 'd94a3e'); return im
@it('house', 'shelf_small', 2, 1)
def _():
    im = new(2, 1); box(im, 1, 9, 31, 12, 'wood'); im.rect(4, 12, 6, 15, C('dbrown')); im.rect(26, 12, 28, 15, C('dbrown')); blob(im, 8, 6, 3, 3, 'red'); box(im, 14, 3, 18, 9, 'blue'); blob(im, 24, 6, 3, 3, 'green'); return im
@it('house', 'hanging_planter', 1, 1)
def _():
    im = new(1, 1); im.line(8, 0, 8, 5, C('dstone')); box(im, 4, 5, 12, 11, 'orange')
    for (x, y, r) in ((4, 4, 2.4), (8, 3, 2.6), (12, 4, 2.4), (3, 11, 1.8), (13, 11, 1.8)): blob(im, x, y, r, r, 'green')
    im.line(3, 12, 3, 15, C('green')); im.line(13, 12, 13, 14, C('green')); return im
@it('house', 'fairy_lights', 3, 1)
def _():
    im = new(3, 1)
    for x in range(48):
        im.px(x, 2 + round(3 * np.sin(x / 48 * np.pi * 3)), C('black'))
    for k in range(8):
        x = 3 + k * 6; y = 2 + round(3 * np.sin(x / 48 * np.pi * 3)); blob(im, x, y + 3, 1.6, 1.8, ('yellow', 'pink', 'lblue', 'lime')[k % 4])
    return im
@it('house', 'cosy_nook', 2, 2)
def _():
    im = new(2, 2); blob(im, 16, 20, 15, 11, 'wood'); blob(im, 16, 24, 11, 6, 'fabric'); im.rect(5, 29, 27, 31, C('dbrown')) if False else None
    blob(im, 16, 22, 8, 4, 'pink'); blob(im, 16, 12, 6, 3, 'cream'); box(im, 1, 26, 31, 31, 'brown'); return im

# ---------------------------------------------------------------- garden
@it('garden', 'fence_wood', 1, 1)
def _():
    im = new(1, 1); im.rect(0, 5, 16, 7, C('wood')); im.rect(0, 10, 16, 12, C('wood'))
    for x in (2, 10): box(im, x, 2, x + 4, 15, 'wood'); im.rect(x + 1, 1, x + 3, 2, C('wood'))
    return im
@it('garden', 'hedge', 1, 1)
def _():
    im = new(1, 1); blob(im, 8, 9, 8, 6.5, 'darkgreen'); blob(im, 5, 7, 4, 3, 'green'); blob(im, 11, 8, 3.5, 3, 'green'); return im
@it('garden', 'flowerbed_tulip', 2, 1)
def _():
    im = new(2, 1); box(im, 1, 10, 31, 15, 'soil')
    for k, x in enumerate(range(4, 30, 5)):
        im.line(x, 10, x, 5, C('green')); blob(im, x, 4, 2.2, 2.8, ('red', 'yellow', 'pink')[k % 3]); blob(im, x - 2, 8, 2, 1, 'green')
    return im
@it('garden', 'flowerbed_daisy', 2, 1)
def _():
    im = new(2, 1); box(im, 1, 10, 31, 15, 'soil')
    for k, x in enumerate(range(4, 30, 5)):
        im.line(x, 10, x, 5, C('green'))
        for a in range(6): im.px(round(x + 2.2 * np.cos(a * 1.05)), round(4 + 2.2 * np.sin(a * 1.05)), C('white'))
        im.rect(x, 4, x + 1, 5, C('yellow'))
    return im
@it('garden', 'bush_berry', 1, 1)
def _():
    im = new(1, 1); blob(im, 8, 9, 7, 6, 'darkgreen'); blob(im, 6, 7, 4, 3, 'green')
    for (x, y) in ((4, 9), (9, 6), (11, 10), (7, 11)): blob(im, x, y, 1.3, 1.3, 'red')
    return im
@it('garden', 'tree_small', 2, 2)
def _():
    im = new(2, 2); box(im, 13, 18, 19, 32, 'brown'); leaves(im, 16, 12, 13, 11); return im
@it('garden', 'pond_small', 3, 2)
def _():
    im = new(3, 2); blob(im, 24, 18, 23, 12, 'stone'); blob(im, 24, 19, 20, 9, 'water'); blob(im, 18, 16, 8, 3, 'lblue')
    blob(im, 33, 21, 3.5, 2, 'green'); blob(im, 12, 22, 3, 1.8, 'green'); im.px(33, 20, 'f08cb2'); return im
@it('garden', 'bench_wood', 2, 1)
def _():
    im = new(2, 1); box(im, 1, 4, 31, 8, 'wood'); box(im, 0, 8, 32, 11, 'wood'); im.rect(3, 11, 5, 16, C('dbrown')); im.rect(27, 11, 29, 16, C('dbrown')); return im
@it('garden', 'bird_bath', 1, 1)
def _():
    im = new(1, 1); box(im, 6, 8, 10, 15, 'stone'); blob(im, 8, 7, 7, 3, 'stone'); blob(im, 8, 6.5, 5.5, 2, 'water'); blob(im, 12, 3, 1.5, 1.2, 'blue'); return im
@it('garden', 'path_stone', 1, 1)
def _():
    im = new(1, 1); im.rect(0, 0, 16, 16, '9ec27a')
    for (x, y, w, h) in ((1, 1, 6, 6), (8, 2, 7, 5), (2, 8, 5, 6), (8, 9, 7, 6)): box(im, x, y, x + w, y + h, 'stone')
    return im
@it('garden', 'lantern_garden', 1, 1)
def _():
    im = new(1, 1); im.rect(7, 7, 9, 15, C('black')); box(im, 4, 2, 12, 8, 'yellow'); im.rect(3, 1, 13, 3, C('black')); im.rect(3, 8, 13, 9, C('black')); im.px(8, 5, 'ffffff'); return im
@it('garden', 'arch_rose', 2, 1)
def _():
    im = new(2, 1); im.rect(3, 4, 5, 16, C('wood')); im.rect(27, 4, 29, 16, C('wood')); im.rect(3, 2, 29, 5, C('wood'))
    for x in range(3, 30, 3): blob(im, x, 3, 2, 2, 'green'); 
    for x in (6, 12, 19, 25, 4, 28): blob(im, x, 3 + hs(x, 1) % 5, 1.5, 1.5, 'pink' if x % 2 else 'red')
    return im
@it('garden', 'sandbox_pig', 2, 2)
def _():
    im = new(2, 2); box(im, 1, 12, 31, 31, 'wood'); im.rect(3, 14, 29, 29, 'e8d098')
    for (x, y) in ((8, 20), (15, 24), (22, 18), (12, 17)): im.px(x, y, 'c9b078')
    blob(im, 20, 22, 4, 3, 'orange'); im.px(18, 21, '2b1712'); im.px(22, 21, '2b1712'); return im
@it('garden', 'pigloo_garden', 2, 2)
def _():
    im = new(2, 2); blob(im, 16, 24, 15, 11, 'cream')
    im.mask(im.ell_mask(16, 29, 6, 5) & (im.yy > 24), C('black'))
    for x in (6, 26): im.rect(x, 20, x + 2, 22, C('stone'))
    blob(im, 16, 14, 5, 3, 'white'); return im
@it('garden', 'memory_corner', 2, 2)
def _():
    im = new(2, 2); box(im, 8, 10, 24, 29, 'stone'); blob(im, 16, 10, 8, 3, 'stone'); im.rect(11, 14, 21, 15, C('dstone')); im.rect(11, 18, 19, 19, C('dstone')); im.rect(11, 22, 21, 23, C('dstone'))
    blob(im, 5, 27, 3, 2.4, 'pink'); blob(im, 27, 27, 3, 2.4, 'yellow'); blob(im, 4, 24, 1.5, 2, 'green'); blob(im, 16, 4, 1.4, 1.8, 'yellow'); return im

# ---------------------------------------------------------------- park
@it('park', 'fountain', 3, 3)
def _():
    im = new(3, 3); blob(im, 24, 36, 23, 11, 'stone'); blob(im, 24, 36, 19, 8, 'water'); box(im, 21, 14, 27, 36, 'stone'); blob(im, 24, 20, 9, 3, 'stone'); blob(im, 24, 19, 7, 2, 'water')
    for (x, y) in ((24, 6), (22, 9), (26, 9), (19, 13), (29, 13), (24, 11)): im.px(x, y, '8ec9f0'); im.px(x, y + 1, '5aa6dc')
    return im
@it('park', 'tree_big', 3, 3)
def _():
    im = new(3, 3); box(im, 20, 26, 28, 46, 'brown'); leaves(im, 24, 18, 22, 17); blob(im, 12, 26, 9, 7, 'green'); blob(im, 36, 26, 9, 7, 'darkgreen'); return im
@it('park', 'gazebo', 4, 3)
def _():
    im = new(4, 3)
    for x in (6, 54): box(im, x, 18, x + 4, 46, 'white')
    box(im, 6, 40, 58, 46, 'wood')
    for i in range(15):
        y = 3 + i; half = 6 + i * 2
        for x in range(32 - half, 32 + half):
            im.px(x, y, C('red') if ((x - 32 + 64) // 4) % 2 == 0 else C('white'))
    im.rect(2, 18, 62, 21, C('dbrown'))
    im.rect(8, 18, 56, 20, C('white')); blob(im, 32, 2, 2, 2, 'gold'); return im
@it('park', 'bridge_wood', 4, 2)
def _():
    im = new(4, 2)
    for k in range(16):
        x = 2 + k * 4; y = 14 - round(6 * np.sin(k / 15 * np.pi)); box(im, x, y, x + 4, y + 8, 'wood')
    for x in (4, 58): im.rect(x, 4, x + 2, 24, C('dbrown'))
    for k in range(60): im.px(4 + k, 6 - round(6 * np.sin(k / 59 * np.pi)) + 4, C('dbrown'))
    return im
@it('park', 'lamp_post', 1, 1)
def _():
    im = new(1, 1); im.rect(7, 4, 9, 16, C('black')); im.rect(5, 14, 11, 16, C('black')); box(im, 4, 0, 12, 5, 'yellow'); im.px(8, 2, 'ffffff'); return im
@it('park', 'picnic_blanket', 3, 2)
def _():
    im = new(3, 2)
    for y in range(8, 30):
        for x in range(2, 46):
            im.px(x, y, C('red') if ((x // 4) + (y // 4)) % 2 == 0 else C('white'))
    blob(im, 14, 14, 4, 2.4, 'wood'); blob(im, 14, 12, 3, 1.8, 'red'); box(im, 28, 13, 34, 18, 'wood'); return im
@it('park', 'statue_pig', 2, 2)
def _():
    im = new(2, 2); box(im, 4, 22, 28, 31, 'stone'); blob(im, 16, 16, 9, 6.5, 'grey'); blob(im, 22, 12, 4.5, 4, 'grey'); im.px(24, 11, '2b2630'); blob(im, 20, 8, 1.8, 2, 'grey'); return im
@it('park', 'flower_arch', 3, 1)
def _():
    im = new(3, 1)
    for x in (3, 43): im.rect(x, 3, x + 2, 16, C('white'))
    for k in range(48): im.px(k, 2 + round(2 * np.sin(k / 47 * np.pi)) * -1 + 2, C('green'))
    for x in range(4, 46, 4): blob(im, x, 3 + hs(x, 2) % 3, 2, 2, ('pink', 'red', 'yellow', 'purple')[x % 4])
    return im
@it('park', 'pond_big', 5, 3)
def _():
    im = new(5, 3); blob(im, 40, 28, 39, 19, 'stone'); blob(im, 40, 29, 36, 16, 'water'); blob(im, 30, 22, 12, 4, 'lblue')
    for (x, y) in ((58, 30), (20, 36), (48, 38)): blob(im, x, y, 4, 2, 'green'); im.px(x + 1, y - 1, 'f08cb2')
    return im
@it('park', 'tunnel_playground', 3, 2)
def _():
    im = new(3, 2); blob(im, 24, 24, 22, 14, 'orange'); im.mask(im.ell_mask(24, 29, 12, 9) & (im.yy > 21), C('black'))
    for x in (8, 18, 30, 40): im.rect(x, 12 + abs(x - 24) // 4, x + 2, 16 + abs(x - 24) // 4, C('yellow'))
    return im
@it('park', 'bench_park', 2, 1)
def _():
    im = new(2, 1); box(im, 1, 3, 31, 7, 'green'); box(im, 0, 7, 32, 10, 'green'); im.rect(3, 10, 5, 16, C('black')); im.rect(27, 10, 29, 16, C('black')); return im
@it('park', 'path_cobble', 1, 1)
def _():
    im = new(1, 1); im.rect(0, 0, 16, 16, '8a8076')
    for (x, y, w, h) in ((0, 0, 5, 4), (6, 0, 5, 5), (12, 1, 4, 4), (1, 5, 6, 5), (8, 6, 7, 4), (0, 11, 5, 5), (6, 11, 6, 5), (13, 11, 3, 5)): box(im, x, y, x + w, y + h, 'stone')
    return im
# ---------------------------------------------------------------- farm
@it('farm', 'scarecrow', 1, 2)
def _():
    im = new(1, 2); im.rect(7, 10, 9, 32, C('dbrown')); im.rect(1, 14, 15, 16, C('brown')); box(im, 4, 12, 12, 24, 'blue')
    blob(im, 8, 8, 4, 4, 'hay' if 'hay' in PAL else 'cream'); im.px(6, 8, '2b2630'); im.px(10, 8, '2b2630'); im.rect(3, 3, 13, 5, C('dbrown')); im.rect(5, 0, 11, 3, C('dbrown')); return im
@it('farm', 'fence_farm', 1, 1)
def _():
    im = new(1, 1); im.rect(0, 5, 16, 7, C('wood')); im.rect(0, 10, 16, 12, C('wood'))
    for x in (1, 11): box(im, x, 2, x + 4, 15, 'dbrown')
    return im
@it('farm', 'wheelbarrow', 2, 1)
def _():
    im = new(2, 1); box(im, 4, 3, 24, 11, 'red'); im.rect(5, 3, 23, 4, C('dstone')); blob(im, 20, 14, 3.2, 3.2, 'black'); im.px(20, 14, '8c8479'); im.line(24, 8, 31, 5, C('dbrown'));
    im.line(4, 9, 0, 6, C('dbrown')); blob(im, 10, 2, 3, 1.6, 'orange'); blob(im, 16, 2, 2.5, 1.6, 'green'); return im
@it('farm', 'signpost', 1, 1)
def _():
    im = new(1, 1); im.rect(7, 3, 9, 16, C('dbrown')); box(im, 2, 3, 14, 8, 'wood'); im.rect(4, 5, 11, 6, C('dbrown')); return im

def build(root):
    out = {}; meta = {}
    for id, (place, w, h, fn) in ITEMS.items():
        im = fn(); assert im.w == 16 * w and im.h == 16 * h, id
        finish(im); shadow(im, im.w / 2, im.h - 0.5, im.w * 0.38, 1.2) if False else None
        save_png(im, os.path.join(root, 'world', place, id + '.png'))
        out[id] = im; meta[id] = {'place': place, 'cells': [w, h], 'size': [im.w, im.h], 'file': f'{place}/{id}.png', 'file_x2': f'{place}/{id}_x2.png', 'anchor': [im.w // 2, im.h]}
    return out, meta

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '../../assets'
    o, meta = build(root)
    json.dump({'note': 'World item sprites, one PNG per item (+_x2). anchor = bottom centre of the footprint. Generated by tools/art/items_art.py', 'items': meta},
              open(os.path.join(root, 'world', 'atlas.json'), 'w'), indent=1)
    for p in ('house', 'garden', 'park', 'farm'):
        ims = [o[i] for i, v in ITEMS.items() if v[0] == p]
        sheet(ims, 5, pad=4, scale=2).save(f'/tmp/items_{p}.png')
    print(len(o), 'items')
