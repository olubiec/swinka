"""D2 (outdoor objects) + D4 (campfire). Run from repo root: python art_src/d2_d4_objects.py
Palette: assets/data/style_palette.json only. Hard pixels, alpha 0/255, outline #3a1d17."""
import json, os, math
from PIL import Image

W = os.path.join('assets', 'world')
OL = '#3a1d17'
WOOD = ['#47281c', '#6f4328', '#9b6238', '#c58a52', '#e3b27a']
HAY = ['#a97a2f', '#d1a548', '#e9c871', '#f6e2a0']
LINEN = ['#b79d78', '#d9c096', '#efdcb8', '#fbf0d9']
BRICK = ['#5e2a2a', '#8c4237', '#b8604a', '#d9876b']
FLAME = ['#e8622c', '#ff9f45', '#ffd166', '#fff3b0']
MOSS = ['#2f4234', '#475f3f', '#6c8050', '#97a569', '#c3c98a']
DUSK = ['#2b3c4e', '#3f5a68', '#5f7f87', '#8da9a8', '#b9c9c4']
PLUM = ['#241824', '#382538', '#54394f', '#7a5a6b']
BERRY = ['#5c2440', '#8e3b5a']


def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
def canvas(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), rgb(c))


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(im, x, y, c)


def ellipse(im, cx, cy, rx, ry, c):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x - cx) / (rx + .5)) ** 2 + ((y - cy) / (ry + .5)) ** 2 <= 1: px(im, x, y, c)


def ball(im, cx, cy, r, ramp):
    """ramp = [dark, mid, light, hi]; light from top-left."""
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * .6:
                d = ((x - cx) + (y - cy)) / (r * 1.5)
                px(im, x, y, ramp[3] if d < -.55 else ramp[2] if d < 0 else ramp[1] if d < .55 else ramp[0])


def outline(im):
    src = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            if src.getpixel((x, y))[3]: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < im.width and 0 <= ny < im.height and src.getpixel((nx, ny))[3]:
                    im.putpixel((x, y), rgb(OL)); break


def save(im, folder, name, meta=None):
    d = os.path.join(W, folder); os.makedirs(d, exist_ok=True)
    im.save(os.path.join(d, name + '.png'))
    if meta is not None:
        with open(os.path.join(d, name + '.json'), 'w') as f: json.dump(meta, f)


# ---------------- plots 32x24 ----------------
def plot(state):
    im = canvas(32, 24)
    rows = {8: (4, 27), 9: (3, 28), 20: (3, 28), 21: (4, 27)}
    wet = state == 'watered'
    top, front, rim, fur = (WOOD[1], WOOD[0], WOOD[2], WOOD[0]) if wet else (WOOD[2], WOOD[1], WOOD[3], WOOD[1])
    for y in range(8, 22):
        x0, x1 = rows.get(y, (2, 29))
        rect(im, x0, y, x1, y, top if y < 18 else front)
    rect(im, 5, 8, 26, 8, rim); rect(im, 3, 9, 3, 16, rim)
    for y in (11, 14):
        rect(im, 6, y, 25, y, fur)
        if not wet: rect(im, 7, y + 1, 24, y + 1, WOOD[3])
    if wet:
        for x, y in ((8, 10), (14, 12), (20, 10), (24, 13), (11, 15), (18, 16), (6, 13)):
            px(im, x, y, DUSK[2]); px(im, x + 1, y, DUSK[3])
        for x, y in ((9, 12), (22, 15)): px(im, x, y, DUSK[4])
    if state == 'sprout':
        for x in (9, 22):
            rect(im, x, 10, x, 13, MOSS[2]); px(im, x - 1, 9, MOSS[3]); px(im, x + 1, 9, MOSS[3])
            px(im, x - 1, 10, MOSS[2]); px(im, x + 1, 10, MOSS[1])
    if state == 'ripe':
        for x in (8, 16, 24):
            for dx, h in ((-2, 5), (0, 7), (2, 5)):
                for k in range(h): px(im, x + dx, 12 - k, MOSS[2] if dx <= 0 else MOSS[1])
            px(im, x, 5, MOSS[3]); px(im, x - 2, 7, MOSS[3])
            rect(im, x - 1, 12, x + 1, 13, FLAME[1]); px(im, x - 1, 12, FLAME[2]); px(im, x + 1, 13, FLAME[0]); px(im, x, 14, FLAME[0])
    outline(im)
    return im


for s in ('empty', 'watered', 'sprout', 'ripe'):
    save(plot(s), 'farm', 'plot_' + s, {"anchor": [16, 23], "foot": None})


# ---------------- stalls 48x44 ----------------
def carrot(im, x, y):
    for i, w in enumerate((3, 3, 2, 2, 1)):
        rect(im, x - w // 2, y + 2 + i, x - w // 2 + w - 1, y + 2 + i, FLAME[1] if i < 3 else FLAME[0])
    px(im, x - 1, y + 2, FLAME[2]); px(im, x - 1, y, MOSS[2]); px(im, x, y + 1, MOSS[2]); px(im, x + 1, y, MOSS[3]); px(im, x, y, MOSS[3])


def stall(c1, c2, kind):
    im = canvas(48, 44)
    rect(im, 5, 14, 42, 27, WOOD[0])
    for x in (4, 41):
        rect(im, x, 13, x + 2, 40, WOOD[2]); rect(im, x, 13, x, 40, WOOD[3]); rect(im, x + 2, 13, x + 2, 40, WOOD[1])
    items = {'veg': [('b', 10, MOSS), ('c', 16), ('b', 22, MOSS), ('c', 29), ('b', 36, MOSS)],
             'fruit': [('b', 10, BRICK), ('b', 16, HAY), ('b', 22, BRICK), ('b', 29, HAY), ('b', 36, BRICK)],
             'seeds': [('s', 11), ('s', 19), ('d', 27), ('s', 35)]}[kind]
    for it in items:
        x = it[1]
        if it[0] == 'b':
            r = it[2]
            ball(im, x, 25, 3, [r[1], r[2], r[3], r[3]] if r is MOSS else [r[0], r[1], r[2], r[3]])
        elif it[0] == 'c': carrot(im, x, 21)
        elif it[0] == 's':
            ball(im, x, 24, 3, LINEN); rect(im, x - 1, 20, x + 1, 21, LINEN[1]); rect(im, x - 2, 21, x + 2, 21, HAY[1]); px(im, x, 24, BERRY[1])
        else:
            ellipse(im, x, 26, 4, 2, WOOD[1]); rect(im, x - 3, 24, x + 3, 25, HAY[1]); rect(im, x - 2, 24, x, 24, HAY[3]); px(im, x + 2, 24, HAY[2])
    rect(im, 2, 28, 45, 40, WOOD[2]); rect(im, 2, 28, 45, 30, WOOD[3]); rect(im, 2, 28, 45, 28, WOOD[4])
    rect(im, 2, 39, 45, 40, WOOD[1])
    for x in range(8, 45, 8): rect(im, x, 31, x, 38, WOOD[1])
    rect(im, 3, 31, 3, 38, WOOD[3])
    rect(im, 4, 41, 8, 43, WOOD[0]); rect(im, 39, 41, 43, 43, WOOD[0])
    for x in range(2, 46):
        even = ((x - 2) // 4) % 2 == 0
        c = c1 if even else c2
        bot = 14 if even else 13
        rect(im, x, 3, x, bot, c[1])
        px(im, x, 3, c[2]); px(im, x, 4, c[2]); px(im, x, bot, c[0])
        if even: px(im, x, bot - 1, c[0])
    for x, y in ((2, 3), (45, 3), (2, 4), (45, 4)): im.putpixel((x, y), (0, 0, 0, 0))
    outline(im)
    return im


LIN = [LINEN[0], LINEN[1], LINEN[2]]
GRN = [MOSS[0], MOSS[1], MOSS[2]]
RED = [BRICK[0], BRICK[1], BRICK[2]]
YEL = [HAY[0], HAY[1], HAY[2]]
for n, (a, b) in {'veg': (GRN, LIN), 'fruit': (RED, LIN), 'seeds': (YEL, LIN)}.items():
    save(stall(a, b, n), 'market', 'stall_' + n, {"anchor": [24, 43], "foot": [2, 34, 45, 43]})


# ---------------- fruit tree 40x64 ----------------
def tree(fruit):
    im = canvas(40, 64)
    for y in range(36, 63):
        x0, x1 = (17, 22) if y < 57 else (15, 24) if y > 59 else (16, 23)
        rect(im, x0, y, x1, y, WOOD[2]); px(im, x0, y, WOOD[3]); px(im, x0 + 1, y, WOOD[3]); px(im, x1, y, WOOD[1])
    rect(im, 15, 62, 24, 62, WOOD[1])
    for cx, cy, r in ((11, 29, 9), (29, 29, 9), (20, 15, 11), (20, 26, 12), (10, 19, 8), (30, 19, 8)):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    d = ((x - cx) + (y - cy)) / (r * 1.5)
                    px(im, x, y, MOSS[3] if d < -.55 else MOSS[2] if d < -.05 else MOSS[1] if d < .5 else MOSS[0])
    for x, y in ((9, 13), (14, 8), (20, 5), (6, 18), (16, 14), (24, 9), (12, 23), (28, 15), (30, 24), (22, 20)):
        px(im, x, y, MOSS[4]); px(im, x + 1, y, MOSS[3])
    outline(im)
    if fruit:
        for x, y in ((9, 22), (16, 31), (25, 27), (31, 19), (21, 13), (13, 12), (28, 33), (7, 31)):
            rect(im, x, y, x + 2, y + 2, BRICK[2]); px(im, x, y, BRICK[3]); px(im, x + 2, y + 2, BRICK[0]); px(im, x + 1, y - 1, MOSS[0])
    return im


foot_t = {"anchor": [20, 63], "foot": [15, 54, 24, 63]}
save(tree(False), 'farm', 'fruit_tree', foot_t)
save(tree(True), 'farm', 'fruit_tree_fruit', foot_t)


# ---------------- fountain 192x48 (4 frames) ----------------
def fountain(f):
    im = canvas(48, 48)
    ellipse(im, 24, 41, 22, 6, LINEN[0]); ellipse(im, 24, 38, 22, 8, LINEN[2]); ellipse(im, 24, 38, 18, 6, LINEN[1])
    ellipse(im, 24, 38, 17, 5, DUSK[2])
    rect(im, 21, 18, 26, 36, LINEN[1]); rect(im, 21, 18, 22, 36, LINEN[2]); rect(im, 26, 18, 26, 36, LINEN[0])
    ellipse(im, 24, 18, 9, 3, LINEN[2]); ellipse(im, 24, 17, 7, 2, DUSK[3])
    ball(im, 24, 13, 2, [LINEN[0], LINEN[1], LINEN[2], LINEN[3]])
    outline(im)
    for i, (x, y) in enumerate(((12, 38), (30, 40), (18, 36), (35, 37), (24, 40))):
        px(im, x + (f + i) % 2, y, DUSK[3]); px(im, x + 1 + (f + i) % 2, y, DUSK[4])
    r = 2 + f * 2
    for dx in (-1, 1):
        cx = 24 + dx * 11
        for a in range(0, 360, 20):
            x = cx + round(math.cos(math.radians(a)) * r); y = 38 + round(math.sin(math.radians(a)) * r * .35)
            if 8 < x < 40: px(im, x, y, DUSK[4])
    for i in range(8):
        s = ((f / 4) + i / 8) % 1
        for dx in (-1, 1):
            px(im, round(24 + dx * 10 * s), round(13 + 29 * s * s - 5 * s), DUSK[4])
            px(im, round(24 + dx * (7 + 3 * s)), round(18 + 18 * s), DUSK[3])
    px(im, 24, 10 - (f % 2), DUSK[4]); px(im, 24, 11, DUSK[3])
    return im


strip = canvas(192, 48)
for f in range(4): strip.paste(fountain(f), (f * 48, 0))
save(strip, 'park', 'fountain_anim', {"frames": 4, "fps": 4, "loop": True, "anchor": [24, 47], "foot": [4, 34, 43, 47]})

# ---------------- grass tufts 16x12 ----------------
tufts = [[(3, 6, 0), (6, 9, 0), (8, 11, 0), (11, 8, 1), (13, 5, 1)],
         [(2, 5, -1), (5, 8, 0), (7, 10, 0), (9, 9, 0), (12, 7, 1), (14, 4, 1)],
         [(4, 8, -1), (6, 10, 0), (8, 8, 0), (10, 10, 1), (12, 6, 1)],
         [(1, 4, 0), (4, 7, -1), (6, 9, 0), (9, 11, 0), (11, 8, 1), (13, 6, 0), (14, 8, 1)]]
for i, t in enumerate(tufts):
    im = canvas(16, 12)
    for x, h, lean in t:
        for k in range(h):
            px(im, x + (lean if k > h // 2 else 0), 11 - k, MOSS[1] if k < 2 else MOSS[2])
        px(im, x + lean, 11 - h + 1, MOSS[3]); px(im, x + lean, 11 - h, MOSS[4])
        px(im, x + 1, 11, MOSS[0])
    save(im, 'garden', 'grass_tuft_%d' % (i + 1), {"anchor": [8, 11], "foot": None})


# ---------------- D4: campfire ----------------
def campfire_base():
    im = canvas(32, 24)
    stones = [(16 + round(12 * math.cos(math.radians(a))), 16 + round(5 * math.sin(math.radians(a)))) for a in range(0, 360, 40)]
    stones.sort(key=lambda p: p[1])
    ellipse(im, 16, 16, 10, 4, PLUM[2]); ellipse(im, 16, 16, 7, 3, PLUM[1])
    for x, y in [s for s in stones if s[1] < 16]: ball(im, x, y, 3, [DUSK[1], DUSK[2], DUSK[3], DUSK[4]])
    for k in range(-1, 2):
        rect(im, 9 + abs(k), 15 + k, 22 - abs(k), 16 + k, WOOD[2 if k == -1 else 1])
    for i in range(10, 23):
        px(im, i, 14 + (i - 10) // 4, WOOD[3]); px(im, i, 17 - (i - 10) // 4, WOOD[2])
    for x, y in ((13, 15), (17, 14), (19, 16), (15, 17), (11, 16)): px(im, x, y, FLAME[0]); px(im, x + 1, y, FLAME[1])
    px(im, 16, 15, FLAME[2])
    for x, y in [s for s in stones if s[1] >= 16]: ball(im, x, y, 3, [DUSK[1], DUSK[2], DUSK[3], DUSK[4]])
    outline(im)
    return im


save(campfire_base(), 'garden', 'campfire_base', {"anchor": [16, 23], "foot": [4, 14, 27, 23], "flame_anchor": [16, 17]})


def flame(w, h, maxw, f, n):
    im = canvas(w, h)
    ph = f / n * 2 * math.pi
    H = h - 2 - round(2 * math.sin(ph)) - (f % 2)
    for sc, col in ((1.0, FLAME[0]), (.72, FLAME[1]), (.46, FLAME[2]), (.22, FLAME[3])):
        hh = H * (1 - .24 * (1 - sc)) if sc < 1 else H
        for y in range(h - 1, -1, -1):
            t = (h - 1 - y) / hh
            if t >= 1: continue
            hw = maxw / 2 * sc * min(1, t * 5 + .5) * (1 - t) ** .8
            if sc == 1 and .4 < t < .7 and f % 3 == 0: hw += 1
            c = w / 2 + round((2.2 if w > 18 else 1.4) * math.sin(ph + t * 2.5) * t * t * 2)
            for x in range(math.floor(c - hw), math.ceil(c + hw)): px(im, x, y, col)
    return im


for name, w, h, n, fps in (('campfire_flame', 24, 32, 6, 8), ('campfire_flame_small', 16, 20, 4, 6)):
    strip = canvas(w * n, h)
    for f in range(n): strip.paste(flame(w, h, w - 6, f, n), (f * w, 0))
    save(strip, 'garden', name, {"frames": n, "fps": fps, "loop": True, "anchor": [w // 2, h - 1], "foot": None})
print('ok')
