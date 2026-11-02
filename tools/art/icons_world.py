"""Wave F2: 41 new 16x16 icons (R4 pattern swatches, R7 memory/adoption, S0 world UI, S1 farm products). Appends to icons_16.png from index 120.
Usage: python icons_world.py <assets_dir>"""
import json, os, sys
import numpy as np
from PIL import Image
from worldart import *

def I():
    return Im(16, 16)

def fin(im):
    im.outline()
    return im.a.copy()

ICONS = {}
def icon(fn):
    ICONS[fn.__name__] = fn
    return fn

# ------------------------------------------------ R4 pattern swatches (round coat sample)
def swatch(base, fn):
    im = I(); m = blob(im, 8, 8, 6.2, 6.2, base); fn(im, m); return fin(im)

@icon
def pattern_brindle(): 
    def f(im, m):
        for k in range(-16, 16, 3):
            for y in range(16):
                x = k + y // 1
                if 0 <= x < 16 and m[y, x]: im.px(x, y, '3f2a1e')
    return swatch('b8854f', f)
@icon
def pattern_magpie():
    def f(im, m):
        im.mask(m & (im.yy >= 8), 'f8f4ea'); im.mask(m & (im.yy < 8), '2b2630'); im.mask(m & (im.yy >= 8) & (im.xx < 4), '2b2630')
    return swatch('2b2630', f)
@icon
def pattern_tortoiseshell():
    def f(im, m):
        for (x, y, r, c) in ((5, 5, 2.2, '2b2630'), (10, 6, 2.0, 'e98c42'), (7, 10, 2.2, 'e98c42'), (11, 11, 1.8, '2b2630'), (4, 10, 1.4, '2b2630')):
            im.mask(m & im.ell_mask(x, y, r, r), c)
    return swatch('c8692f', f)
@icon
def pattern_belt():
    def f(im, m):
        im.mask(m & (im.xx >= 6) & (im.xx < 10), 'f8f4ea')
    return swatch('3b2a24', f)
@icon
def pattern_blaze_only():
    def f(im, m):
        im.mask(m & (np.abs(im.xx - 7.5) < 1.6) & (im.yy < 12), 'f8f4ea'); im.mask(m & (im.yy >= 12), 'f8f4ea')
    return swatch('9a5a33', f)

# ------------------------------------------------ R7 memory / adoption
@icon
def candle():
    im = I(); box(im, 6, 7, 10, 14, 'cream'); im.px(8, 6, '3a1d17'); blob(im, 8, 3.5, 1.6, 2.4, 'yellow'); im.px(8, 4, 'fff2a8'); return fin(im)
@icon
def gift_offer():
    im = I(); box(im, 2, 6, 14, 14, 'red'); box(im, 1, 4, 15, 7, 'red'); im.rect(7, 4, 9, 14, C('yellow')); blob(im, 6, 2.5, 2.2, 1.6, 'yellow'); blob(im, 10, 2.5, 2.2, 1.6, 'yellow'); return fin(im)
@icon
def paw_walk():
    im = I(); blob(im, 8, 10, 3.6, 3.2, 'brown')
    for (x, y) in ((3.5, 6), (6.2, 3.5), (9.8, 3.5), (12.5, 6)): blob(im, x, y, 1.6, 2.0, 'brown')
    return fin(im)
@icon
def pair_pigs():
    im = I(); blob(im, 5, 9, 4, 3.6, 'orange'); blob(im, 11, 9, 4, 3.6, 'cream')
    for x in (4, 6, 10, 12): im.px(x, 8, '2b1712')
    blob(im, 8, 3.5, 1.5, 1.4, 'red'); blob(im, 6.8, 3.0, 1.0, 1.0, 'red'); blob(im, 9.2, 3.0, 1.0, 1.0, 'red')
    return fin(im)

# ------------------------------------------------ S0 world UI
def house_shape(im, body, roof):
    box(im, 3, 8, 13, 14, body); im.rect(7, 10, 10, 14, C('dbrown'))
    for i in range(7):
        im.rect(8 - 1 - i, 7 - i, 8 + 1 + i + 1, 8 - i, C(roof))
@icon
def place_house():
    im = I(); house_shape(im, 'cream', 'red'); return fin(im)
@icon
def place_garden():
    im = I()
    for x in (2, 6, 10): box(im, x, 11, x + 4, 14, 'wood')
    for (x, c) in ((3, 'pink'), (8, 'yellow'), (12, 'red')):
        im.line(x, 6, x, 11, C('green')); blob(im, x, 5, 1.8, 1.8, c)
    return fin(im)
@icon
def place_park():
    im = I(); box(im, 7, 9, 9, 14, 'dbrown'); blob(im, 8, 6, 5.2, 4.4, 'green'); blob(im, 6.5, 4.8, 1.8, 1.5, 'lime'); return fin(im)
@icon
def place_farm():
    im = I(); box(im, 2, 7, 14, 14, 'red'); im.rect(6, 9, 10, 14, C('cream'))
    for i in range(7): im.rect(8 - i // 1 - 1, 6 - i // 2 * 0 - 0, 8 + i + 1, 7, C('dbrown')) if False else None
    im.rect(4, 5, 12, 7, C('dbrown')); im.rect(6, 3, 10, 5, C('dbrown')); return fin(im)
@icon
def place_market():
    im = I(); box(im, 2, 9, 14, 14, 'wood')
    for k in range(6): im.rect(1 + k * 2 + 0, 3, 3 + k * 2, 8, C('red') if k % 2 == 0 else C('white'))
    blob(im, 5, 10, 1.4, 1.2, 'red'); blob(im, 9, 10, 1.4, 1.2, 'green'); return fin(im)
@icon
def can_water():
    im = I(); box(im, 3, 6, 11, 13, 'blue'); im.line(11, 8, 15, 4, C('blue')); im.line(11, 9, 15, 5, C('blue')); im.line(4, 5, 8, 3, C('dstone')); im.px(15, 6, '8ec9f0'); im.px(14, 8, '8ec9f0'); return fin(im)
@icon
def sprinkler():
    im = I(); im.rect(7, 9, 9, 14, C('stone')); box(im, 5, 7, 11, 9, 'blue')
    for (x, y) in ((3, 4), (5, 2), (8, 1), (11, 2), (13, 4), (2, 7), (14, 7)): im.px(x, y, '8ec9f0')
    return fin(im)
@icon
def shovel():
    im = I(); im.line(10, 1, 6, 9, C('dbrown')); im.line(11, 1, 7, 9, C('wood')); im.rect(8, 0, 13, 2, C('dbrown'))
    blob(im, 5.5, 11.5, 3.2, 3.2, 'stone'); im.rect(3, 9, 9, 10, C('stone')); return fin(im)
@icon
def seed_bag():
    im = I(); box(im, 4, 5, 12, 14, 'wood'); im.rect(5, 3, 11, 5, C('wood')); im.rect(4, 5, 12, 6, C('dbrown'))
    blob(im, 8, 10, 2.2, 2.2, 'green'); im.px(8, 9, 'b6e07a'); return fin(im)
@icon
def basket():
    im = I(); box(im, 2, 8, 14, 14, 'wood')
    for x in range(3, 14, 3): im.rect(x, 9, x + 1, 14, C('dbrown'))
    im.rect(2, 11, 14, 12, C('dbrown')); blob(im, 5, 6, 2, 2, 'red'); blob(im, 9, 6, 2, 2, 'orange'); blob(im, 11, 7, 1.6, 1.6, 'green'); return fin(im)
@icon
def stall():
    im = I(); box(im, 2, 9, 14, 14, 'wood')
    for k in range(6): im.rect(1 + k * 2, 3, 3 + k * 2, 8, C('blue') if k % 2 == 0 else C('white'))
    im.rect(2, 8, 14, 9, C('dbrown')); return fin(im)
@icon
def order_scroll():
    im = I(); box(im, 3, 3, 13, 13, 'cream'); blob(im, 3.5, 3, 1.5, 1.5, 'wood'); blob(im, 12.5, 13, 1.5, 1.5, 'wood')
    for y in (6, 8, 10): im.rect(5, y, 11, y + 1, C('brown'))
    return fin(im)
@icon
def comfort_heart():
    im = I(); blob(im, 5.5, 6, 3.3, 3.2, 'pink'); blob(im, 10.5, 6, 3.3, 3.2, 'pink')
    for i in range(7): im.rect(2 + i // 1 - 0, 7 + i, 14 - i, 8 + i, C('pink'))
    return fin(im)
@icon
def demand_meter():
    im = I(); box(im, 2, 11, 14, 14, 'stone')
    for i in range(8):
        a = np.pi * (1 - i / 7.0); im.px(round(8 + 6 * np.cos(a)), round(11 - 6 * np.sin(a)), C('red') if i > 4 else C('green'))
    im.line(8, 11, 11, 6, C('black')); return fin(im)
@icon
def cap_coin():
    im = I(); blob(im, 8, 8, 6, 6, 'gold'); im.rect(7, 4, 9, 12, C('dbrown')); im.rect(5, 6, 11, 7, C('dbrown')); im.rect(5, 9, 11, 10, C('dbrown')); return fin(im)
def arrow(im, pts, c):
    for (a, b) in zip(pts, pts[1:]): im.line(a[0], a[1], b[0], b[1], c)
@icon
def undo():
    im = I(); arrow(im, [(4, 5), (9, 3), (13, 6), (13, 10), (9, 12)], C('blue')); arrow(im, [(5, 5), (10, 4), (12, 7), (12, 10)], C('lblue'))
    im.rect(2, 3, 6, 7, C('blue')); im.rect(3, 4, 5, 6, C('lblue')); return fin(im)
@icon
def redo():
    a = undo(); return np.ascontiguousarray(a[:, ::-1])
@icon
def flip():
    im = I(); box(im, 2, 4, 6, 12, 'blue'); box(im, 10, 4, 14, 12, 'lblue'); im.rect(7, 2, 9, 14, C('white')); return fin(im)
@icon
def trash():
    im = I(); box(im, 4, 5, 12, 14, 'stone'); im.rect(3, 3, 13, 5, C('dstone')); im.rect(6, 2, 10, 3, C('dstone'))
    for x in (6, 8, 10): im.rect(x, 7, x + 1, 12, C('dstone'))
    return fin(im)
@icon
def grid():
    im = I(); im.rect(2, 2, 14, 14, C('lblue'))
    for k in (2, 6, 10, 13): im.rect(k, 2, k + 1, 14, C('blue')); im.rect(2, k, 14, k + 1, C('blue'))
    return fin(im)
@icon
def lock_place():
    im = I(); box(im, 3, 7, 13, 14, 'gold'); im.rect(5, 2, 6, 7, C('stone')); im.rect(10, 2, 11, 7, C('stone')); im.rect(5, 2, 11, 3, C('stone')); im.rect(7, 9, 9, 12, C('dbrown')); return fin(im)
@icon
def upgrade_arrow():
    im = I(); im.rect(6, 7, 10, 14, C('green')); 
    for i in range(6): im.rect(8 - i, 2 + i, 8 + i + 1, 3 + i, C('lime'))
    im.rect(6, 7, 10, 14, C('green')); im.rect(6, 7, 7, 14, C('lime')); return fin(im)
@icon
def harvest_ready():
    im = I(); blob(im, 8, 10, 4.6, 3.8, 'orange'); im.rect(7, 4, 9, 7, C('green')); blob(im, 5.5, 5, 2, 1.2, 'lime'); blob(im, 10.5, 5, 2, 1.2, 'lime')
    for (x, y) in ((1, 2), (14, 3), (13, 8)): im.px(x, y, 'f2c94c'); im.px(x - 1, y, 'fff2a8'); im.px(x + 1, y, 'fff2a8')
    return fin(im)
@icon
def sapling():
    im = I(); im.rect(7, 8, 9, 14, C('dbrown')); blob(im, 5, 6, 3, 2.2, 'green'); blob(im, 11, 5, 3, 2.2, 'lime'); blob(im, 8, 3.5, 2.4, 2, 'green'); im.rect(4, 13, 12, 15, C('soil')); return fin(im)

# ------------------------------------------------ S1 farm product icons
@icon
def seed():
    im = I(); box(im, 4, 7, 12, 14, 'cream'); im.rect(4, 5, 12, 7, C('wood'))
    for (x, y) in ((6, 10), (9, 11), (8, 9)): im.px(x, y, '5f4a30')
    return fin(im)
@icon
def cilantro():
    im = I(); im.line(8, 14, 8, 8, C('darkgreen'))
    for (x, y, r) in ((5, 6, 2.6), (11, 6, 2.6), (8, 4, 2.8), (6, 10, 1.8), (10, 10, 1.8)): blob(im, x, y, r, r * 0.9, 'green')
    return fin(im)
@icon
def basil():
    im = I(); im.line(8, 14, 8, 6, C('darkgreen'))
    for (x, y) in ((5, 11), (11, 11), (5, 7), (11, 7), (8, 3.5)): blob(im, x, y, 2.6, 2.0, 'darkgreen'); blob(im, x - 0.5, y - 0.5, 1.2, 0.9, 'green')
    return fin(im)
@icon
def romaine_lettuce():
    im = I(); blob(im, 8, 9, 3.2, 5.6, 'lime')
    blob(im, 5, 9, 2.8, 5, 'green'); blob(im, 11, 9, 2.8, 5, 'green'); blob(im, 8, 8, 2, 4.6, 'lime'); im.line(8, 5, 8, 13, 'e6f0b0'); return fin(im)
@icon
def zucchini():
    im = I(); 
    for i in range(10): blob(im, 3 + i * 1.1, 12 - i * 0.8, 2.6, 2.4, 'darkgreen')
    blob(im, 7, 9, 3, 2, 'green'); im.rect(12, 2, 14, 4, C('dbrown')); return fin(im)
@icon
def cherry_tomato():
    im = I(); blob(im, 5, 9, 3.4, 3.4, 'red'); blob(im, 11, 10, 3.2, 3.2, 'red'); im.px(4, 7, 'ffd0c8'); im.px(10, 8, 'ffd0c8')
    im.line(5, 6, 8, 3, C('darkgreen')); im.line(11, 7, 8, 3, C('darkgreen')); blob(im, 8, 3, 2, 1.2, 'green'); return fin(im)
@icon
def blueberry():
    im = I(); blob(im, 5, 10, 3.2, 3.2, 'blue'); blob(im, 11, 10, 3.2, 3.2, 'blue'); blob(im, 8, 6, 3.2, 3.2, 'purple')
    for (x, y) in ((5, 10), (11, 10), (8, 6)): im.px(x, y, '1c2a50')
    return fin(im)
@icon
def pear():
    im = I(); blob(im, 8, 11, 4.6, 3.8, 'lime'); blob(im, 8, 6.5, 3, 3.4, 'lime'); im.line(8, 3, 9, 1, C('dbrown')); blob(im, 11, 2, 2, 1.2, 'green'); return fin(im)

ORDER = list(ICONS)

def main(assets):
    jp = os.path.join(assets, 'icons', 'icons.json'); pp = os.path.join(assets, 'icons', 'icons_16.png')
    data = json.load(open(jp)); img = np.array(Image.open(pp).convert('RGBA'))
    base = 120
    img = img[:, :base * 16]
    data['icons'] = {k: v for k, v in data['icons'].items() if v < base}
    for n in ORDER:
        data['icons'][n] = base + ORDER.index(n)
        img = np.concatenate([img, ICONS[n]()], axis=1)
    Image.fromarray(img).save(pp, optimize=True)
    json.dump(data, open(jp, 'w'), indent=1); open(jp, 'a').write('\n')
    print('icons now', len(data['icons']), 'sheet', img.shape)
    return [ICONS[n]() for n in ORDER]

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '../../assets')
