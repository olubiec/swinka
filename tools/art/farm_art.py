"""Wave F3: farm crops (growth frames), beds, watering and great-harvest effects -> assets/world/farm/farm.png + farm.json"""
import os, sys
import numpy as np
from worldart import *

ANNUAL = ['dandelion', 'cilantro', 'parsley', 'basil', 'romaine_lettuce', 'cucumber', 'kale', 'zucchini', 'bell_pepper', 'carrot', 'cherry_tomato']
PERENNIAL = ['strawberry', 'apple', 'blueberry', 'pear']

def soil_mound(im, y=15, w=6):
    for dx in range(-w, w + 1):
        h = 2 if abs(dx) < w - 2 else 1
        im.rect(8 + dx, y - h + 1, 9 + dx, y + 1, C('soil') if (dx + y) % 3 else mix('7a4f30', 'ffffff', .12))

def leaf(im, x, y, rx, ry, c='green'):
    blob(im, x, y, rx, ry, c)

def seed_frame():
    im = Im(16, 16); soil_mound(im); im.rect(7, 11, 9, 12, '5f4a30'); im.rect(6, 12, 7, 13, '5f4a30') if False else None; return finish(im)

def sprout_frame(c='green'):
    im = Im(16, 16); soil_mound(im); im.rect(8, 10, 9, 13, C('darkgreen')); leaf(im, 6.5, 9.5, 2, 1.3, c); leaf(im, 10.5, 9, 2, 1.3, c); return finish(im)

def leafy(name, stage):
    cfg = dict(dandelion=('lime', 'darkgreen', 0.5), cilantro=('green', 'darkgreen', 0.9), parsley=('darkgreen', 'green', 0.9), basil=('green', 'lime', 1.0),
               romaine_lettuce=('lime', 'green', 1.2), kale=('darkgreen', 'green', 1.1))[name]
    im = Im(16, 16); soil_mound(im, 15, 5)
    n = {2: 3, 3: 5}[stage]; r = 2.0 + stage * 0.7
    for k in range(n):
        a = np.pi * (0.15 + 0.7 * k / max(n - 1, 1))
        x = 8 - np.cos(a) * (2 + stage * 1.6); y = 12 - np.sin(a) * (1 + stage * 2.8)
        im.line(8, 13, round(x), round(y), C(cfg[1]))
        blob(im, x, y, r * (1.1 if name in ('romaine_lettuce', 'kale') else 0.9), r * 0.8, cfg[0])
    if name == 'dandelion' and stage == 3:
        im.line(8, 12, 8, 5, C('darkgreen')); blob(im, 8, 4, 3, 2.6, 'yellow'); im.px(7, 3, 'fff2a8')
    if name in ('romaine_lettuce', 'kale') and stage == 3:
        blob(im, 8, 9, 2.4, 4, 'lime' if name == 'romaine_lettuce' else 'green')
    return finish(im)

def vine(name, stage):
    fruit = dict(cucumber='lime', zucchini='yellow', bell_pepper='red', cherry_tomato='red')[name]
    im = Im(16, 16); soil_mound(im, 15, 5)
    h = 4 + stage * 2.5
    im.line(8, 14, 8, round(14 - h), C('darkgreen')); im.line(9, 14, 9, round(14 - h), C('green'))
    for k in range(stage + 1):
        y = 13 - k * 3; leaf(im, 5 if k % 2 == 0 else 11, y, 2.4, 1.5, 'green')
    if stage == 3:
        if name == 'cucumber':
            for i in range(5): blob(im, 3 + i * 1.0, 11 + i * 0.5, 1.6, 1.5, fruit)
        elif name == 'zucchini':
            for i in range(6): blob(im, 3 + i * 1.5, 12 - i * 0.2, 1.8, 1.6, fruit)
        elif name == 'bell_pepper':
            blob(im, 5, 8, 2.2, 2.6, fruit); blob(im, 11, 9, 2.2, 2.6, 'yellow')
        else:
            for (x, y) in ((5, 7), (11, 6), (6, 10), (11, 10), (8, 5)): blob(im, x, y, 1.6, 1.6, fruit)
    return finish(im)

def carrot(stage):
    im = Im(16, 16); soil_mound(im, 15, 5)
    if stage == 2:
        for (x, y) in ((6, 9), (8, 7), (10, 9)): im.line(8, 13, x, y, C('green')); blob(im, x, y, 1.4, 1.4, 'lime')
    else:
        for (x, y) in ((5, 7), (8, 4), (11, 7), (7, 5), (9, 5)): im.line(8, 12, x, y, C('darkgreen')); blob(im, x, y, 1.6, 1.8, 'green')
        blob(im, 8, 13, 2.8, 1.6, 'carrot')
    return finish(im)

def crop_frames(name):
    fr = [seed_frame(), sprout_frame('lime' if name != 'parsley' else 'green')]
    if name in ('dandelion', 'cilantro', 'parsley', 'basil', 'romaine_lettuce', 'kale'):
        fr += [leafy(name, 2), leafy(name, 3)]
    elif name == 'carrot':
        fr += [carrot(2), carrot(3)]
    else:
        fr += [vine(name, 2), vine(name, 3)]
    return fr

def tree(kind, stage):
    im = Im(16, 32); y0 = 31
    if kind in ('strawberry', 'blueberry'):
        ch = 'darkgreen'; fruit = dict(strawberry='red', blueberry='blue')[kind]
        soil_mound(im, y0, 6)
        if stage == 0:
            im.line(8, y0 - 2, 8, y0 - 6, C('darkgreen')); leaf(im, 6, y0 - 7, 2, 1.4); leaf(im, 10, y0 - 8, 2, 1.4)
        else:
            rr = 4 + stage * 1.5
            blob(im, 8, y0 - rr, rr + 2, rr, 'green'); blob(im, 6, y0 - rr - 1, rr * 0.5, rr * 0.4, 'lime')
            if stage == 2:
                for (x, y) in ((4, y0 - 5), (10, y0 - 6), (7, y0 - 9), (12, y0 - 3), (5, y0 - 10)): blob(im, x, y, 1.5, 1.5, fruit)
    else:
        fruit = dict(apple='red', pear='lime')[kind]
        soil_mound(im, y0, 4)
        if stage == 0:
            im.line(8, y0 - 1, 8, y0 - 9, C('dbrown')); leaf(im, 6, y0 - 11, 2.2, 1.6); leaf(im, 10, y0 - 10, 2.2, 1.6)
        else:
            th = 9 + stage * 3
            im.rect(7, y0 - th, 10, y0, C('brown')); im.rect(7, y0 - th, 8, y0, C('wood'))
            rr = 5 + stage * 1.6
            blob(im, 8, y0 - th - 2, rr + 1, rr, 'green'); blob(im, 5, y0 - th - 4, rr * 0.5, rr * 0.4, 'lime'); blob(im, 11, y0 - th, rr * 0.45, rr * 0.4, 'darkgreen')
            if stage == 2:
                for (x, y) in ((4, y0 - th), (11, y0 - th - 3), (8, y0 - th - 6), (12, y0 - th + 2), (6, y0 - th - 2)): blob(im, x, y, 1.6, 1.6, fruit); im.px(x - 1, y - 1, 'ffffff') if False else None
    return finish(im)

def bed(wet):
    im = Im(16, 16)
    c = ('4a3020', '5a3a26', '6a4630') if wet else ('8a5c38', '7a4f30', '9a6c44')
    im.rect(0, 0, 16, 16, c[1])
    for y in range(16):
        for x in range(16):
            h = hs(x, y, 3) % 10
            if h < 2: im.px(x, y, c[0])
            elif h == 3: im.px(x, y, c[2])
    im.rect(0, 0, 16, 1, c[0]); im.rect(0, 15, 16, 16, c[0]) 
    if wet:
        for (x, y) in ((3, 4), (10, 3), (7, 9), (12, 12), (4, 12)): im.px(x, y, '7ab4e0')
    return im

def soil():
    im = Im(16, 16, '7a4f30')
    for y in range(16):
        for x in range(16):
            h = hs(x, y, 9) % 9
            if h < 2: im.px(x, y, '6a4228')
            elif h == 4: im.px(x, y, '8a5c38')
    return im

def water_frames():
    out = []
    for f in range(4):
        im = Im(16, 16)
        for k in range(5):
            x = 2 + k * 3; y = (f * 3 + k * 5) % 14
            im.rect(x, y, x + 1, y + 2, '8ec9f0'); im.px(x, y + 2, '5aa6dc')
        out.append(im)
    return out

def sparkle_frames():
    out = []
    for f in range(4):
        im = Im(16, 16); r = 2 + f * 1.5
        for k in range(8):
            a = k * np.pi / 4 + f * 0.3
            for d in (r, r + 1):
                im.px(round(8 + d * np.cos(a)), round(8 + d * np.sin(a)), 'f2c94c' if d == r else 'fff2a8')
        im.px(8, 8, 'fff2a8'); out.append(im)
    return out

def build(root):
    g = {}
    for n in ANNUAL: g['crop_' + n] = crop_frames(n)
    for n in PERENNIAL: g['tree_' + n] = [tree(n, s) for s in range(3)]
    g['bed_empty'] = [bed(False)]; g['bed_wet'] = [bed(True)]; g['soil'] = [soil()]
    g['water_anim'] = water_frames(); g['great_harvest'] = sparkle_frames()
    meta = pack(g, os.path.join(root, 'world', 'farm'), 'farm', 256)
    return g

if __name__ == '__main__':
    g = build(sys.argv[1] if len(sys.argv) > 1 else '../../assets')
    ims = [i for k, v in g.items() for i in v if i.h == 16]
    sheet(ims, 16).save('/tmp/farm16.png')
    sheet([i for v in g.values() for i in v if i.h == 32], 12).save('/tmp/farm32.png')
    print(sum(len(v) for v in g.values()), 'frames')
