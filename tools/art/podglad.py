"""Wave F6: preview of everything in the game -> docs/album/podglad/*.png (scenes, pigs, items, icons). Usage: python podglad.py [assets_dir] [out_dir]"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
A = sys.argv[1] if len(sys.argv) > 1 else '../../assets'
O = sys.argv[2] if len(sys.argv) > 2 else '../../docs/album/podglad'
os.makedirs(O, exist_ok=True)
W = os.path.join(A, 'world')
def ld(p): return Image.open(p).convert('RGBA')
def up(im, k): return im.resize((im.size[0] * k, im.size[1] * k), Image.NEAREST)
def put(scene, im, x, y):   # anchor bottom-left cell coordinates in pixels (x,y = top-left)
    scene.alpha_composite(im, (int(x), int(y)))
def item(id): 
    m = json.load(open(os.path.join(W, 'atlas.json')))['items'][id]; return ld(os.path.join(W, m['file']))
def tile(n): return ld(os.path.join(W, 'tiles', n + '.png'))
def fill(scene, name, x0, y0, x1, y1):
    t = tile(name)
    for y in range(y0, y1, 16):
        for x in range(x0, x1, 16): scene.alpha_composite(t.crop((0, 0, min(16, x1 - x), min(16, y1 - y))), (x, y))
def at(scene, id, cx, cy):   # cell coords of top-left
    put(scene, item(id), cx * 16, cy * 16)

def scene_garden():
    s = ld(os.path.join(W, 'bg', 'garden_day.png'))
    for x in range(0, 256, 16): pass
    for (id, cx, cy) in (('tree_small', 0, 4), ('pond_small', 10, 5), ('flowerbed_tulip', 4, 7), ('bench_wood', 6, 5), ('bird_bath', 13, 4), ('arch_rose', 1, 7), ('hedge', 3, 4), ('lantern_garden', 8, 4),
                         ('flowerbed_daisy', 8, 8), ('pigloo_garden', 13, 6), ('sandbox_pig', 0, 6), ('memory_corner', 5, 6), ('bush_berry', 15, 5)):
        at(s, id, cx, cy)
    for k in range(6): at(s, 'path_stone', 9 + k % 2, 4 + k // 1 if False else 4 + k)
    return s
def scene_park():
    s = ld(os.path.join(W, 'bg', 'park_day.png'))
    for (id, cx, cy) in (('pond_big', 1, 8), ('gazebo', 14, 4), ('tree_big', 0, 3), ('tree_big', 21, 4), ('fountain', 10, 7), ('bridge_wood', 5, 8), ('lamp_post', 9, 6), ('lamp_post', 17, 7),
                         ('picnic_blanket', 18, 8), ('statue_pig', 13, 8), ('bench_park', 21, 8), ('flower_arch', 6, 6), ('tunnel_playground', 2, 5)):
        at(s, id, cx, cy)
    return s
def scene_farm():
    s = ld(os.path.join(W, 'bg', 'farm.png'))
    F = json.load(open(os.path.join(W, 'farm', 'farm.json'))); at_ = ld(os.path.join(W, 'farm', 'farm.png'))
    def fr(id, i):
        x, y, w, h = F['frames'][id][i]; return at_.crop((x, y, x + w, y + h))
    crops = ['dandelion', 'cilantro', 'parsley', 'basil', 'romaine_lettuce', 'cucumber', 'kale', 'zucchini', 'bell_pepper', 'carrot', 'cherry_tomato']
    for r in range(4):
        for k in range(14):
            n = crops[(k + r * 3) % len(crops)]; stage = (k + r) % 4
            put(s, fr('bed_wet' if k % 3 == 0 else 'bed_empty', 0), 8 + k * 16 if 8 + k * 16 < 232 else 232, 86 + r * 12)
            put(s, fr('crop_' + n, stage), 8 + k * 16, 78 + r * 12)
    for k, t in enumerate(['strawberry', 'apple', 'blueberry', 'pear']): put(s, fr('tree_' + t, 2), 20 + k * 28, 20 + 0)
    at(s, 'scarecrow', 14, 7); at(s, 'wheelbarrow', 1, 6); at(s, 'signpost', 5, 6)
    return s
def scene_market():
    s = ld(os.path.join(W, 'bg', 'market.png'))
    M = lambda n: ld(os.path.join(W, 'market', n + '.png'))
    put(s, M('stall_basic'), 20, 60); put(s, M('stall_big'), 100, 52); put(s, M('order_board'), 190, 62)
    for i in range(3): put(s, M(f'promo_{i + 1}'), 20 + i * 34, 112)
    return s
def scene_house():
    s = Image.new('RGBA', (240, 144), (0, 0, 0, 255))
    fill(s, 'wall_bedroom_2', 0, 0, 240, 64); fill(s, 'floor_bedroom_1', 0, 64, 240, 144)
    for (id, cx, cy) in (('sofa_cosy', 2, 3), ('bookshelf', 8, 1), ('window_sun', 5, 0), ('curtains_dots', 11, 0), ('armchair', 11, 4), ('side_table', 6, 4), ('toy_basket', 13, 6),
                         ('cushion_big', 1, 6), ('wall_clock', 8, 0), ('shelf_small', 12, 2), ('hanging_planter', 0, 1), ('fairy_lights', 1, 0), ('cosy_nook', 9, 6), ('hay_bar_wood', 4, 7)):
        at(s, id, cx, cy)
    return s
def sheet_items():
    meta = json.load(open(os.path.join(W, 'atlas.json')))['items']
    ims = [(i, ld(os.path.join(W, m['file']))) for i, m in meta.items()]
    cw = 100; cols = 8; rows = (len(ims) + cols - 1) // cols; s = Image.new('RGBA', (cols * cw, rows * 100), (236, 228, 214, 255)); d = ImageDraw.Draw(s)
    for k, (i, im) in enumerate(ims):
        sc = 1 if im.size[0] > 48 else 2; im2 = up(im, sc) if im.size[0] * sc <= 96 and im.size[1] * sc <= 80 else im
        x, y = (k % cols) * cw, (k // cols) * 100
        s.alpha_composite(im2, (x + (cw - im2.size[0]) // 2, y + 4 + (80 - im2.size[1]) // 2)); d.text((x + 4, y + 86), i[:16], fill=(60, 40, 30, 255))
    return s
def sheet_icons():
    ic = ld(os.path.join(A, 'icons', 'icons_16.png')); n = ic.size[0] // 16; names = {v: k for k, v in json.load(open(os.path.join(A, 'icons', 'icons.json')))['icons'].items()}
    cols = 24; rows = (n + cols - 1) // cols; s = Image.new('RGBA', (cols * 56, rows * 56), (236, 228, 214, 255))
    for i in range(n):
        im = up(ic.crop((i * 16, 0, i * 16 + 16, 16)), 3); s.alpha_composite(im, ((i % cols) * 56 + 4, (i // cols) * 56 + 4))
    return s
def sheet_pigs():
    ids = ['ned', 'kuki', 'glen', 'james', 'racuch']; st = ['baby', 'junior', 'adult', 'senior', 'legend']
    s = Image.new('RGBA', (len(st) * 140 + 150, len(ids) * 140 + 10), (236, 228, 214, 255)); d = ImageDraw.Draw(s)
    for r, p in enumerate(ids):
        for c, g in enumerate(st):
            sh = ld(os.path.join(A, 'sprites', 'pigs', p, g, 'spritesheet_x2.png')); s.alpha_composite(sh.crop((0, 0, 128, 128)), (c * 140 + 6, r * 140 + 8))
        s.alpha_composite(ld(os.path.join(A, 'sprites', 'portraits', p + '.png')), (len(st) * 140 + 10, r * 140 + 6))
    return s
def sheet_generic():
    shapes = [('smooth', 'normal'), ('smooth', 'chubby'), ('smooth', 'lean'), ('teddy', 'normal'), ('teddy', 'chubby'), ('rosette', 'normal'), ('rosette', 'lean'), ('peruvian', 'normal')]
    s = Image.new('RGBA', (len(shapes) * 140, 150), (236, 228, 214, 255))
    bj = json.load(open(os.path.join(A, 'sprites', 'breeds.json')))['breeds']
    for i, (b, u) in enumerate(shapes):
        cands = [os.path.join(A, 'sprites', 'breeds', f'{b}_{u}', 'adult'), os.path.join(A, 'sprites', 'breeds', b, 'adult'), os.path.join(A, 'sprites', 'adult')]
        for c in cands:
            p = os.path.join(c, 'spritesheet_x2.png')
            if os.path.exists(p): s.alpha_composite(ld(p).crop((0, 0, 128, 128)), (i * 140 + 6, 10)); break
    return s
if __name__ == '__main__':
    for n, f in (('dom', scene_house), ('ogrod', scene_garden), ('park', scene_park), ('farma', scene_farm), ('targ', scene_market)):
        im = f(); up(im, 3).save(os.path.join(O, n + '.png')); print(n, im.size)
    sheet_items().save(os.path.join(O, 'przedmioty.png')); sheet_icons().save(os.path.join(O, 'ikony.png'))
    sheet_pigs().save(os.path.join(O, 'swinki.png')); sheet_generic().save(os.path.join(O, 'swinki_generyczne.png'))
