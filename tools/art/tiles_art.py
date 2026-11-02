"""Wave F5: scene backgrounds, ground/water/fence tiles, room tiles, memory stone, market props -> assets/world/{bg,tiles,market}/"""
import json, os, sys
import numpy as np
from worldart import *

TIMES = {'morning': ((255, 214, 170), 0.20, ('f6b98a', 'ffe4b8')), 'day': (None, 0, ('7ec8f0', 'cfeefc')),
         'evening': ((255, 140, 90), 0.34, ('e0805a', 'f8c08a')), 'night': ((30, 40, 90), 0.62, ('1c2650', '34427a'))}

def vgrad(im, y0, y1, c0, c1):
    for y in range(y0, y1):
        t = (y - y0) / max(y1 - y0 - 1, 1); im.rect(0, y, im.w, y + 1, mix(c0, c1, t))

def grass_tile(v=0, base='7fbf4a'):
    im = Im(16, 16, base)
    for y in range(16):
        for x in range(16):
            h = hs(x, y, 11 + v) % 14
            if h == 0: im.px(x, y, mix(base, '3d7a35', .55))
            elif h == 1: im.px(x, y, mix(base, 'ffffff', .22))
    for k in range(3 + v):
        x, y = hs(k, v, 5) % 14, 2 + hs(k, v, 6) % 12
        im.px(x, y, mix(base, '2f5f2a', .5)); im.px(x, y - 1, mix(base, '2f5f2a', .5))
    return im

def tile_fill(im, y0, tile_fn, nv=2):
    tiles = [tile_fn(v) for v in range(nv)]
    for ty in range(y0 // 16, (im.h + 15) // 16):
        for tx in range((im.w + 15) // 16):
            t = tiles[hs(tx, ty, 2) % nv]
            for yy in range(16):
                y = ty * 16 + yy
                if y0 <= y < im.h:
                    x0 = tx * 16; x1 = min(x0 + 16, im.w)
                    im.a[y, x0:x1] = t.a[yy, :x1 - x0]

def hills(im, y, c, amp, ph):
    for x in range(im.w):
        top = y - int(amp * (0.5 + 0.5 * np.sin(x / im.w * 6.28 * 1.3 + ph)))
        im.rect(x, top, x + 1, y + 1, c)

def tint(im, key):
    col, k, _ = TIMES[key]
    if col is None: return im
    a = im.a[..., :3].astype(float); t = np.array(col, float)
    mult = 1 - k * 0.55
    out = a * mult + t * k * 0.45
    im.a[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    return im

def sky(im, h, key):
    _, _, (c0, c1) = TIMES[key]; vgrad(im, 0, h, c0, c1)

def decorate_sky(im, key, h):
    if key == 'night':
        for k in range(26): im.px(hs(k, 1) % im.w, hs(k, 2) % max(h - 10, 1), 'fff2c8')
        blob(im, im.w - 40, 22, 8, 8, 'cream')
    elif key == 'day': blob(im, 50, 20, 9, 9, 'yellow')
    elif key == 'morning': blob(im, 40, h - 14, 10, 10, 'yellow')
    else: blob(im, im.w - 50, h - 14, 10, 10, 'orange')
    if key in ('day', 'morning', 'evening'):
        for (x, y) in ((im.w * 0.35, 18), (im.w * 0.7, 28)):
            for (dx, r) in ((-6, 5), (0, 7), (8, 5)): blob(im, x + dx, y, r, r * .6, 'white')

def tree_line(im, y, n, c1='3d7a35', c2='5fa043'):
    for k in range(n):
        x = 6 + k * (im.w - 12) // max(n - 1, 1); r = 9 + hs(k, 3) % 6
        blob(im, x, y - r * .5, r, r * .85, c1); blob(im, x - 2, y - r * .8, r * .5, r * .4, c2)

def bg_garden(key):
    im = Im(256, 144); H_ = 70; sky(im, H_, key); decorate_sky(im, key, H_); hills(im, 76, '6fae4a', 10, 1.0); tree_line(im, 82, 11)
    tile_fill(im, 76, grass_tile)
    for x in range(0, 256, 14): box(im, x, 66, x + 4, 84, 'wood')
    im.rect(0, 70, 256, 72, C('wood')); im.rect(0, 77, 256, 79, C('wood'))
    for (x, y, c) in ((30, 110, 'pink'), (90, 125, 'yellow'), (200, 105, 'red'), (150, 130, 'white'), (230, 128, 'pink')):
        im.line(x, y, x, y + 4, C('green')); blob(im, x, y - 1, 2, 2, c)
    return tint(im, key)

def bg_park(key):
    im = Im(384, 192); H_ = 90; sky(im, H_, key); decorate_sky(im, key, H_); hills(im, 100, '6fae4a', 14, 0.4); tree_line(im, 108, 18, '2f6a2e', '4f9040')
    tile_fill(im, 100, lambda v: grass_tile(v, '78b845'))
    for y in range(120, 192):   # winding path
        cx = 192 + int(40 * np.sin(y / 192 * 6.28 * 1.1)); im.rect(cx - 14 - (y - 120) // 8, y, cx + 14 + (y - 120) // 8, y + 1, mix('d8c8a0', 'b8a880', (hs(y, 3) % 4) / 8))
    for (x, y) in ((40, 150), (330, 140), (90, 175), (300, 178)): blob(im, x, y, 3, 2.4, 'white'); im.px(x, y, 'f2c94c')
    return tint(im, key)

def bg_farm():
    im = Im(256, 144); H_ = 60; sky(im, H_, 'day'); decorate_sky(im, 'day', H_); hills(im, 64, '8cc152', 8, 0.3); tile_fill(im, 62, lambda v: grass_tile(v, '8cbf50'))
    box(im, 190, 26, 238, 62, 'red'); im.rect(204, 42, 224, 62, C('cream'))
    for i in range(14): im.rect(214 - 24 - i * 2 + 24 - 0, 25 - i // 1 * 0, 214 + 24 + i * 2 - 24 + 0, 26, C('dbrown')) if False else None
    im.rect(186, 20, 242, 28, C('dbrown')); im.rect(196, 14, 232, 20, C('dbrown'))
    for x in range(0, 256, 12): box(im, x, 58, x + 3, 74, 'dbrown')
    im.rect(0, 62, 256, 64, C('wood')); im.rect(0, 69, 256, 71, C('wood'))
    for r in range(4):
        im.rect(8, 90 + r * 12, 248, 98 + r * 12, '7a4f30'); im.rect(8, 90 + r * 12, 248, 91 + r * 12, '9a6c44')
    return im

def bg_market():
    im = Im(256, 144, 'efe3c8'); vgrad(im, 0, 70, 'cfeefc', 'f6ead2')
    for x in range(0, 256, 32):
        box(im, x + 2, 24, x + 30, 70, ('wood', 'cream')[(x // 32) % 2]); im.rect(x + 6, 36, x + 26, 62, C('dbrown'))
    for k in range(16): im.rect(k * 16, 14, k * 16 + 16, 24, C('red') if k % 2 == 0 else C('white'))
    for ty in range(5, 9):
        for tx in range(16):
            box(im, tx * 16 + (8 if ty % 2 else 0) - 8 * 0, ty * 16 + 4, tx * 16 + 15 + (8 if ty % 2 else 0) - 0, ty * 16 + 15, 'stone') if tx < 15 else None
    return im

def water_tile(f):
    im = Im(16, 16, '5aa6dc')
    for y in range(16):
        for x in range(16):
            w = np.sin((x + f * 4) / 16 * 6.28 * 2 + y * 0.5)
            if w > 0.8: im.px(x, y, '8ec9f0')
            elif w < -0.9: im.px(x, y, '4a84c4')
    return im

def fence_tile(mask):
    """mask bits: 1 N, 2 E, 4 S, 8 W connections; farm fence made of posts and rails."""
    im = Im(16, 16)
    cx = cy = 8
    if mask & 2: im.rect(8, 5, 16, 7, C('wood')); im.rect(8, 10, 16, 12, C('wood'))
    if mask & 8: im.rect(0, 5, 8, 7, C('wood')); im.rect(0, 10, 8, 12, C('wood'))
    if mask & 1: im.rect(6, 0, 8, 8, C('wood')); im.rect(10, 0, 12, 8, C('wood')) if False else None
    if mask & 4: im.rect(6, 8, 8, 16, C('wood'))
    box(im, 6, 3, 10, 14, 'dbrown')
    return finish(im)

def room_tiles():
    out = {}
    wall = {'bedroom': [('c8d8f0', 'stripe'), ('f4d8e4', 'dots'), ('d8e8d0', 'plain'), ('e8dcc8', 'check')],
            'playroom': [('f8e0a0', 'dots'), ('c4e4f4', 'stripe'), ('f4c8c0', 'check'), ('d8d0f0', 'plain')]}
    floor = {'bedroom': [('c9a070', 'planks'), ('d8c8b0', 'carpet'), ('a8a098', 'tiles'), ('b8885a', 'planks')],
             'playroom': [('e8c860', 'tiles'), ('88b8e0', 'carpet'), ('c9a070', 'planks'), ('b0d890', 'tiles')]}
    for room in wall:
        for i, (c, kind) in enumerate(wall[room]):
            im = Im(16, 16, c); d = mix(c, '3a1d17', .15); l = mix(c, 'ffffff', .4)
            if kind == 'stripe': im.rect(0, 0, 1, 16, d); im.rect(8, 0, 9, 16, d); im.rect(1, 0, 2, 16, l)
            elif kind == 'dots':
                for (x, y) in ((3, 3), (11, 11), (11, 3) if False else (3, 11)): im.rect(x, y, x + 2, y + 2, l)
                im.rect(10, 6, 12, 8, l)
            elif kind == 'check':
                for y in range(16):
                    for x in range(16):
                        if ((x // 4) + (y // 4)) % 2: im.px(x, y, d)
            out[f'wall_{room}_{i + 1}'] = im
        for i, (c, kind) in enumerate(floor[room]):
            im = Im(16, 16, c); d = mix(c, '3a1d17', .25); l = mix(c, 'ffffff', .3)
            if kind == 'planks':
                im.rect(0, 7, 16, 8, d); im.rect(0, 15, 16, 16, d); im.rect(5, 0, 6, 8, d); im.rect(11, 8, 12, 15, d); im.rect(0, 0, 16, 1, l)
            elif kind == 'carpet':
                for y in range(16):
                    for x in range(16):
                        if (hs(x, y, 4) % 5) == 0: im.px(x, y, d)
                im.rect(0, 0, 16, 1, l); im.rect(0, 15, 16, 16, d)
            else:
                im.rect(0, 0, 16, 1, d); im.rect(0, 0, 1, 16, d); im.rect(8, 8, 16, 9, d); im.rect(8, 8, 9, 16, d); im.rect(1, 1, 7, 2, l)
            out[f'floor_{room}_{i + 1}'] = im
    return out

def memory_stone():
    im = Im(32, 32); box(im, 4, 6, 28, 30, 'stone'); blob(im, 16, 7, 12, 5, 'stone')
    im.rect(7, 12, 25, 18, C('cream')); im.rect(7, 12, 25, 13, C('dstone')); im.rect(7, 17, 25, 18, C('dstone')); im.rect(7, 12, 8, 18, C('dstone')); im.rect(24, 12, 25, 18, C('dstone'))
    blob(im, 16, 24, 2.4, 2.1, 'pink'); blob(im, 4, 29, 3, 2, 'green'); blob(im, 28, 29, 3, 2, 'yellow'); return finish(im)

def stall(big):
    w = 64 if big else 48; im = Im(w, 40)
    box(im, 3, 20, w - 3, 38, 'wood'); im.rect(4, 31, w - 4, 32, C('dbrown'))
    for k in range(w // 4): im.rect(1 + k * 4, 6, 5 + k * 4, 20, C('red') if k % 2 == 0 else C('white'))
    im.rect(0, 20, w, 22, C('dbrown'))
    for k, x in enumerate(range(8, w - 8, 9)): blob(im, x, 17 if False else 26, 3, 3, ('red', 'green', 'orange', 'purple', 'yellow')[k % 5])
    if big:
        for x in (1, w - 4): im.rect(x, 4, x + 3, 40, C('dbrown'))
        box(im, 20, 0, 44, 6, 'yellow')
    return finish(im)

def order_board():
    im = Im(32, 32); box(im, 2, 2, 30, 26, 'wood'); im.rect(4, 4, 28, 24, C('dbrown')); im.rect(5, 5, 27, 23, '3a5a3a')
    for (x, y) in ((7, 7), (17, 7), (7, 15), (17, 15)): box(im, x, y, x + 8, y + 7, 'cream'); im.rect(x + 1, y + 2, x + 7, y + 3, C('brown')); im.rect(x + 1, y + 4, x + 5, y + 5, C('brown'))
    im.rect(6, 26, 8, 32, C('dbrown')); im.rect(24, 26, 26, 32, C('dbrown')); return finish(im)

def promo(i):
    im = Im(32, 16); c = ('red', 'green', 'blue')[i]; box(im, 1, 1, 31, 12, c)
    if i == 0:
        for k in range(3): im.rect(5 + k * 8, 4, 9 + k * 8, 8, C('white'))
    elif i == 1: blob(im, 16, 6, 4, 4, 'yellow')
    else:
        for k in range(4): im.rect(5 + k * 6, 4, 7 + k * 6, 9, C('white'))
    im.rect(4, 12, 6, 16, C('dbrown')); im.rect(26, 12, 28, 16, C('dbrown')); return finish(im)

def build(root):
    base = os.path.join(root, 'world'); meta = {'bg': {}, 'tiles': {}, 'market': {}}
    def put(sub, id, im, x2=True):
        save_png(im, os.path.join(base, sub, id + '.png'), x2); meta[sub][id] = {'file': f'{sub}/{id}.png', 'size': [im.w, im.h]}
    bgs = {}
    for k in TIMES:
        for n, fn in (('garden', bg_garden), ('park', bg_park)):
            im = fn(k); put('bg', f'{n}_{k}', im); bgs[f'{n}_{k}'] = im
    for n, fn in (('farm', bg_farm), ('market', bg_market)):
        im = fn(); put('bg', n, im); bgs[n] = im
    tl = {}
    for v in range(2): tl[f'grass_{v + 1}'] = grass_tile(v)
    tl['grass_park'] = grass_tile(0, '78b845')
    for f in range(4): tl[f'water_{f}'] = water_tile(f)
    for m in range(16): tl[f'fence_{m:02d}'] = fence_tile(m)
    tl.update(room_tiles())
    for k, im in tl.items(): put('tiles', k, im, True)
    ms = memory_stone(); put('tiles', 'memory_stone', ms)
    mk = {'stall_basic': stall(False), 'stall_big': stall(True), 'order_board': order_board()}
    for i in range(3): mk[f'promo_{i + 1}'] = promo(i)
    for k, im in mk.items(): put('market', k, im)
    json.dump({'note': 'Backgrounds (bg: garden/park x morning,day,evening,night; farm; market), 16x16 tiles, market props. Fence bitmask: 1 N, 2 E, 4 S, 8 W. Water tiles water_0..3 animate. Generated by tools/art/tiles_art.py', **meta},
              open(os.path.join(base, 'tiles.json'), 'w'), indent=1)
    return bgs, tl, mk, ms

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '../../assets'
    bgs, tl, mk, ms = build(root)
    from PIL import Image
    for k in ('garden_day', 'garden_night', 'park_evening', 'farm', 'market'):
        Image.fromarray(bgs[k].a).resize((bgs[k].w * 2, bgs[k].h * 2), Image.NEAREST).save(f'/tmp/bg_{k}.png')
    sheet(list(tl.values()), 20, pad=2, scale=3).save('/tmp/tiles.png')
    sheet(list(mk.values()) + [ms], 8, pad=3, scale=3).save('/tmp/market.png')
    print(len(bgs), 'bg', len(tl), 'tiles')
