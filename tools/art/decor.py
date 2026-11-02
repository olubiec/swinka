"""Shop decor atlas (G7): 40 items drawn procedurally -> assets/decor/decor.png + decor.json, proposed shop entries -> assets/decor/decor_items.json.
Scene: Home room 240x130 (wall y 0-96, floor from y 96; the top ~34 px are cropped on screen). Anchor = bottom centre of the sprite on the floor line.
Usage: python decor.py [assets_dir]"""
import json, math, os, sys
import numpy as np
from PIL import Image

OUT = (0x3a, 0x1d, 0x17)


def H(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def hs(x, y, s=0):
    return ((int(x) * 73856093) ^ (int(y) * 19349663) ^ (s * 83492791)) & 0xffff


class Im:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)
        if bg:
            self.a[:, :] = list(H(bg) if isinstance(bg, str) else bg) + [255]
        self.yy, self.xx = np.mgrid[0:h, 0:w]

    def col(self, c):
        return list(H(c) if isinstance(c, str) else c) + [255]

    def mask(self, m, c):
        self.a[m] = self.col(c)

    def rect(self, x0, y0, x1, y1, c):
        self.mask((self.xx >= x0) & (self.xx < x1) & (self.yy >= y0) & (self.yy < y1), c)

    def ell_mask(self, cx, cy, rx, ry):
        return ((self.xx + 0.5 - cx) / rx) ** 2 + ((self.yy + 0.5 - cy) / ry) ** 2 <= 1

    def ell(self, cx, cy, rx, ry, cols, light=(-0.5, -0.8)):
        """Shaded ellipse with 3 tones: cols = (light, mid, dark)."""
        m = self.ell_mask(cx, cy, rx, ry)
        u = (self.xx + 0.5 - cx) / rx
        v = (self.yy + 0.5 - cy) / ry
        b = -(light[0] * -1 * u * -1 + light[1] * -1 * v * -1) if False else -(0.5 * u + 0.8 * v)
        lv = np.where(b > 0.35, 0, np.where(b > -0.35, 1, 2))
        for k in range(3):
            self.mask(m & (lv == k), cols[k])
        return m

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[int(y), int(x)] = self.col(c)

    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            self.px(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)

    def outline(self, c=OUT, inner=False):
        op = self.a[..., 3] > 0
        d = np.zeros_like(op)
        d[1:] |= op[:-1]; d[:-1] |= op[1:]; d[:, 1:] |= op[:, :-1]; d[:, :-1] |= op[:, 1:]
        o = d & ~op
        self.a[o] = self.col(c)

    def pad(self, n=1):
        b = np.zeros((self.h + 2 * n, self.w + 2 * n, 4), np.uint8)
        b[n:-n, n:-n] = self.a
        self.a = b; self.h += 2 * n; self.w += 2 * n
        self.yy, self.xx = np.mgrid[0:self.h, 0:self.w]


ITEMS = {}      # id -> dict(img, slot, layer, name, price, desc, frames)


def item(id, slot, name, price, desc, layer='front', frames=1):
    def deco(fn):
        ITEMS[id] = dict(fn=fn, slot=slot, name=name, price=price, desc=desc, layer=layer, frames=frames)
        return fn
    return deco


def noise(im, c1, c2, p=0.12, s=1):
    m = (hs(im.xx, im.yy, s) % 1000) < p * 1000
    im.mask(m & (im.a[..., 3] > 0), c2)


# ------------------------------------------------------------------ wallpapers 240x96
@item('wallpaper_hay_meadow', 'wallpaper', 'Hay meadow wallpaper', 150, 'Soft hay stripes and sunflowers.', 'wall')
def _(frame=0):
    im = Im(240, 96, 'f4ebc4')
    for y in range(96):
        t = y / 96
        im.rect(0, y, 240, y + 1, (int(244 - 18 * t), int(235 - 10 * t), int(196 - 30 * t)))
    for r in range(8):
        for x in range(-6, 246, 5):
            hx_ = x + (r * 3) % 5
            y0 = 14 + r * 11
            hh = 5 + hs(hx_, r) % 4
            c = ('c9b24e', 'dcc866', 'a8943c')[hs(hx_, r, 2) % 3]
            im.line(hx_, y0, hx_ + (hs(hx_, r, 3) % 3 - 1), y0 - hh, c)
    for (sx, sy) in ((30, 52), (110, 38), (190, 60), (70, 78), (160, 24)):
        for k in range(8):
            a = k * math.pi / 4
            im.px(round(sx + 3 * math.cos(a)), round(sy + 3 * math.sin(a)), 'f2c53b')
        im.rect(sx - 1, sy - 1, sx + 2, sy + 2, '7a4a22')
        im.line(sx, sy + 3, sx, sy + 12, '5f8f3a')
    return im


@item('wallpaper_brick', 'wallpaper', 'Brick wallpaper', 150, 'Warm brick wall.', 'wall')
def _(frame=0):
    im = Im(240, 96, 'cfb9a0')
    for r in range(16):
        off = 0 if r % 2 == 0 else 8
        for c in range(-1, 16):
            x0, y0 = c * 16 + off, r * 6
            tone = hs(c, r) % 4
            col = ('b5603f', 'a85838', 'c26c48', 'b0623f')[tone]
            im.rect(x0 + 1, y0 + 1, x0 + 15, y0 + 5, col)
            im.rect(x0 + 1, y0 + 1, x0 + 15, y0 + 2, 'cf7a55')
            im.rect(x0 + 1, y0 + 4, x0 + 15, y0 + 5, '8f4a2f')
    return im


@item('wallpaper_wood_panels', 'wallpaper', 'Wood panel wallpaper', 150, 'Warm wooden boards.', 'wall')
def _(frame=0):
    im = Im(240, 96, 'b98552')
    for b in range(15):
        x0 = b * 16
        base = ('c08c58', 'b78250', 'c4915d')[b % 3]
        im.rect(x0, 0, x0 + 15, 96, base)
        im.rect(x0 + 15, 0, x0 + 16, 96, '6e4424')
        im.rect(x0, 0, x0 + 1, 96, 'd6a672')
        for k in range(10):
            gx = x0 + 3 + hs(b, k) % 10
            gy = hs(b, k, 4) % 90
            im.line(gx, gy, gx, gy + 6 + hs(b, k, 5) % 10, '9c6636')
    return im


@item('wallpaper_forest', 'wallpaper', 'Forest wallpaper', 150, 'Leafy green forest.', 'wall')
def _(frame=0):
    im = Im(240, 96, 'cfe3b0')
    for y in range(96):
        t = y / 96
        im.rect(0, y, 240, y + 1, (int(207 - 40 * t), int(227 - 30 * t), int(176 - 40 * t)))
    for i in range(70):
        cx, cy = hs(i, 1) % 240, hs(i, 2) % 96
        c = (('7fbf4a', '5a9a3a', '9ad060')[i % 3])
        r = 3 + hs(i, 3) % 4
        im.ell(cx, cy, r, r * 0.6, ('9ad060', '7fbf4a', '4f8f35'))
    for tx in (20, 95, 170, 225):
        im.rect(tx, 40, tx + 5, 96, '7a5232')
        im.rect(tx, 40, tx + 1, 96, '9a6a42')
    return im


@item('wallpaper_cosy_stripes', 'wallpaper', 'Cosy stripes wallpaper', 150, 'Cream and brown stripes.', 'wall')
def _(frame=0):
    im = Im(240, 96, 'f3e6cd')
    for x in range(0, 240, 16):
        im.rect(x, 0, x + 8, 96, 'c9a27a')
        im.rect(x, 0, x + 1, 96, 'd8b690')
        im.rect(x + 7, 0, x + 8, 96, 'b08760')
        for y in range(2, 96, 6):
            im.px(x + 11, y, 'd9c7a8')
    return im


@item('wallpaper_winter', 'wallpaper', 'Winter wallpaper', 150, 'Snowy fir trees.', 'wall')
def _(frame=0):
    im = Im(240, 96, 'dcecf8')
    for y in range(96):
        t = y / 96
        im.rect(0, y, 240, y + 1, (int(212 + 25 * t), int(232 + 14 * t), int(248 + 5 * t)))
    for (tx, th) in ((20, 46), (70, 38), (125, 52), (180, 40), (228, 48)):
        for k in range(5):
            w = 4 + k * 4
            y0 = 96 - th + k * (th // 6)
            im.rect(tx - w // 2, y0, tx + w // 2 + 1, y0 + th // 5 + 2, ('3f7a4a', '2f6a3c')[k % 2])
            im.rect(tx - w // 2, y0, tx + w // 2 + 1, y0 + 1, 'f2f8ff')
        im.rect(tx - 1, 90, tx + 2, 96, '6e4424')
    for i in range(40):
        im.px(hs(i, 7) % 240, hs(i, 8) % 80, 'ffffff')
    return im


# ------------------------------------------------------------------ floors 240x34
@item('floor_grey_laminate', 'floor', 'Grey laminate floor', 120, 'Grey wood-look planks, like the real one.', 'floor')
def _(frame=0):
    im = Im(240, 34, 'a29c94')
    for r in range(4):
        y0 = r * 9
        off = (r * 47) % 120
        for p in range(-1, 3):
            x0 = p * 120 + off
            tone = ('a29c94', '98928a', 'aaa49c', '9d978f')[hs(p, r) % 4]
            im.rect(max(x0, 0), y0, min(x0 + 119, 240), y0 + 8, tone)
            im.rect(max(x0 + 119, 0), y0, min(x0 + 120, 240), y0 + 9, '7d776f')
            for k in range(14):
                gx = x0 + 4 + hs(p, r, k) % 110
                if 0 <= gx < 240:
                    im.line(gx, y0 + 1 + hs(p, r, k + 9) % 6, gx + 6 + hs(k, r) % 8, y0 + 1 + hs(p, r, k + 9) % 6, 'b3ada5' if k % 2 else '8d877f')
        im.rect(0, y0 + 8, 240, y0 + 9, '7d776f')
    return im


@item('floor_dark_hardwood', 'floor', 'Dark hardwood floor', 120, 'Dark wooden planks.', 'floor')
def _(frame=0):
    im = Im(240, 34, '5a3a28')
    for r in range(4):
        y0 = r * 9
        off = (r * 53) % 100
        for p in range(-1, 4):
            x0 = p * 100 + off
            im.rect(max(x0, 0), y0, min(x0 + 99, 240), y0 + 8, ('5a3a28', '654230', '503222')[hs(p, r) % 3])
            im.rect(max(x0 + 99, 0), y0, min(x0 + 100, 240), y0 + 9, '2e1a10')
            for k in range(10):
                gx = x0 + 3 + hs(p, r, k) % 92
                if 0 <= gx < 240:
                    im.line(gx, y0 + 2 + k % 5, gx + 7, y0 + 2 + k % 5, '7a523a')
        im.rect(0, y0 + 8, 240, y0 + 9, '2e1a10')
    return im


@item('floor_stone_tiles', 'floor', 'Stone tile floor', 120, 'Grey stone tiles.', 'floor')
def _(frame=0):
    im = Im(240, 34, '6e7078')
    for r in range(3):
        for c in range(-1, 13):
            x0, y0 = c * 20 + (10 if r % 2 else 0), r * 12 - 1
            t = hs(c, r) % 3
            im.rect(x0 + 1, y0 + 1, x0 + 19, y0 + 11, ('b4b6bc', 'a8aab2', 'bcbec4')[t])
            im.rect(x0 + 1, y0 + 1, x0 + 19, y0 + 2, 'd0d2d8')
            im.rect(x0 + 1, y0 + 10, x0 + 19, y0 + 11, '8c8e96')
    return im


@item('floor_straw', 'floor', 'Straw floor', 120, 'A floor of golden straw.', 'floor')
def _(frame=0):
    im = Im(240, 34, 'd9bd5c')
    for i in range(420):
        x, y = hs(i, 1) % 240, hs(i, 2) % 34
        L = 3 + hs(i, 3) % 6
        c = ('f0d878', 'b8993e', 'e6c862', 'a8892f')[hs(i, 4) % 4]
        im.line(x, y, x + L, y + (hs(i, 5) % 3 - 1), c)
    return im


@item('floor_cardboard', 'floor', 'Cardboard floor', 120, 'Corrugated cardboard.', 'floor')
def _(frame=0):
    im = Im(240, 34, 'c49a62')
    for x in range(0, 240, 4):
        im.rect(x, 0, x + 1, 34, 'd8b078')
        im.rect(x + 2, 0, x + 3, 34, 'a98250')
    for y in (11, 22):
        im.rect(0, y, 240, y + 1, '8c6a3e')
    for i in range(30):
        im.px(hs(i, 1) % 240, hs(i, 2) % 34, '7a5a30')
    return im


@item('floor_wool_mat', 'floor', 'Wool mat floor', 120, 'A grey knitted mat, like the cosy one at home.', 'floor')
def _(frame=0):
    im = Im(240, 34, 'a8a6a4')
    for y in range(0, 34, 3):
        for x in range(0, 240, 4):
            o = 2 if (y // 3) % 2 else 0
            tone = ('c8c6c4', 'b4b2b0', 'd6d4d2')[hs(x, y) % 3]
            im.px(x + o, y, tone); im.px(x + o + 1, y + 1, '8e8c8a'); im.px(x + o + 2, y, tone)
            im.px(x + o + 1, y, tone)
    im.rect(0, 0, 240, 1, '7e7c7a')
    return im


# ------------------------------------------------------------------ bedding 96x14
def pile(im, base, mid, dark, hi, jitter=True):
    w, h = im.w, im.h
    for x in range(w):
        t = (x + 0.5) / w
        top = h - 2 - int(round((h - 4) * math.sin(math.pi * min(max(t, 0.02), 0.98)) ** 0.55)) - ((hs(x, 1) % 2) if jitter else 0)
        for y in range(top, h):
            im.px(x, y, base)
    return im


@item('bed_fleece_brown', 'bedding', 'Brown fleece bed', 90, 'Soft brown fleece with folds.', 'floor_top')
def _(frame=0):
    im = Im(96, 14)
    pile(im, '8a5a3a', 0, 0, 0, False)
    a = im.a
    for x in range(96):
        col = np.where(a[:, x, 3] > 0)[0]
        if len(col):
            a[col[0], x] = im.col('b0805a')
            a[col[0] + 1:col[0] + 2, x] = im.col('9c6c48') if (x // 7) % 2 else im.col('8a5a3a')
    for f in (14, 31, 52, 70, 86):
        im.line(f, 6, f + 3, 12, '6e4528')
    im.outline()
    return im


@item('bed_fleece_grey', 'bedding', 'Grey fleece bed', 90, 'Soft grey fleece with folds.', 'floor_top')
def _(frame=0):
    im = Im(96, 14)
    pile(im, '9a9ca4', 0, 0, 0, False)
    a = im.a
    for x in range(96):
        col = np.where(a[:, x, 3] > 0)[0]
        if len(col):
            a[col[0], x] = im.col('c4c6ce')
            a[col[0] + 1, x] = im.col('b0b2ba') if (x // 7) % 2 else im.col('9a9ca4')
    for f in (14, 31, 52, 70, 86):
        im.line(f, 6, f + 3, 12, '71737b')
    im.outline()
    return im


@item('bed_aspen', 'bedding', 'Aspen shavings', 90, 'A deep layer of aspen shavings.', 'floor_top')
def _(frame=0):
    im = Im(96, 14)
    pile(im, 'e8d4a4', 0, 0, 0)
    m = im.a[..., 3] > 0
    for i in range(160):
        x, y = hs(i, 1) % 96, hs(i, 2) % 14
        if m[y, x]:
            L = 2 + hs(i, 3) % 3
            im.line(x, y, x + L, y + (hs(i, 4) % 3 - 1), ('f5e6bc', 'c8b07a', 'd9c28e')[hs(i, 5) % 3])
    im.outline()
    return im


@item('bed_hay_pile', 'bedding', 'Hay pile', 90, 'A cosy pile of fresh hay.', 'floor_top')
def _(frame=0):
    im = Im(96, 14)
    pile(im, 'cdb556', 0, 0, 0)
    m = im.a[..., 3] > 0
    for i in range(110):
        x, y = hs(i, 1) % 96, hs(i, 2) % 14
        if m[y, x]:
            im.line(x, y, x + 4 + hs(i, 3) % 4, y - 1 + hs(i, 4) % 3, ('eedb7c', '99903d', 'b8a548')[hs(i, 5) % 3])
    for i in range(24):    # straws sticking out
        x = hs(i, 8) % 96
        col = np.where(im.a[:, x, 3] > 0)[0]
        if len(col):
            im.line(x, col[0], x + 2, col[0] - 2, 'eedb7c')
    im.outline()
    return im


# ------------------------------------------------------------------ hides
LOG = ('c28a52', 'a06a3a', '7a4c28')


@item('hide_log_stack', 'hide', 'Log stack', 240, 'A stack of bark logs with a gap to hide in.', 'front')
def _(frame=0):
    im = Im(72, 44)
    rows = [(36, 6, 7, 0), (36, 6, 7, 4), (25, 7, 7, 1), (14, 7, 7, 3), (4, 6, 7, 2)]
    # three rows of horizontal logs, the lower middle left open as the entrance
    for r, y in enumerate((34, 24, 14, 4)):
        x = 2 + (r % 2) * 4
        n = 0
        while x < 66:
            L = 22 + hs(r, n) % 8
            if r == 0 and 22 <= x <= 44:   # entrance gap
                x += 24; n += 1
                continue
            im.rect(x, y, min(x + L, 70), y + 9, LOG[hs(r, n, 2) % 2 + 1 if False else (0 if hs(r, n) % 3 else 1)])
            im.rect(x, y + 7, min(x + L, 70), y + 9, LOG[2])
            for k in range(0, L, 5):
                im.px(x + k + 1, y + 3 + hs(k, r) % 3, LOG[2])
            im.ell(x + 1, y + 4.5, 4, 4.5, ('e6b073', 'd49b60', 'b07a44'))
            im.px(x + 1, y + 4, '8a5a2a'); im.px(x + 2, y + 5, 'a06a3a')
            x += L - 2; n += 1
    # entrance backdrop
    im.rect(24, 34, 44, 44, '3a2418')
    im.outline()
    return im


@item('hide_willow_tunnel', 'hide', 'Willow tunnel', 220, 'A woven willow tunnel.', 'front')
def _(frame=0):
    im = Im(72, 32)
    m = im.ell_mask(36, 32, 34, 28) & (im.yy < 32)
    inner = im.ell_mask(36, 32, 24, 19)
    im.mask(m, 'b8884a')
    for x in range(72):
        for y in range(32):
            if m[y, x] and (x + y * 2) % 6 < 2:
                im.px(x, y, 'd4a868')
            if m[y, x] and (x - y * 2) % 7 == 0:
                im.px(x, y, '8a6030')
    im.mask(inner, '2a1a12')
    im.mask(inner & (im.yy < 12), '3a2418')
    im.outline()
    return im


@item('hide_cardboard_box', 'hide', 'Cardboard box', 180, 'A cardboard box with a doorway.', 'front')
def _(frame=0):
    im = Im(56, 40)
    im.rect(2, 8, 54, 40, 'c49a62')
    im.rect(2, 8, 54, 12, 'd8b078')
    im.rect(2, 8, 54, 9, 'e4c08c')
    for x in range(4, 54, 4):
        im.rect(x, 12, x + 1, 40, 'b88e58')
    im.rect(24, 6, 32, 10, 'e8d8a8')      # tape
    door = im.ell_mask(28, 40, 11, 17) & (im.yy < 40)
    im.mask(door, '2a1a12')
    im.mask(door & (im.yy < 26), '3a2418')
    im.rect(2, 38, 54, 40, 'a98250')
    im.outline()
    return im


@item('hide_fleece_sack', 'hide', 'Fleece sack', 190, 'A soft fleece hideout.', 'front')
def _(frame=0):
    im = Im(56, 34)
    im.ell(28, 34, 27, 32, ('f4a6c6', 'e888b0', 'c46890'))
    door = im.ell_mask(28, 34, 11, 14) & (im.yy < 34)
    im.mask(door, '4a2236')
    for f in (8, 14, 42, 48):
        im.line(f, 8 + abs(f - 28) // 6, f - 2 + (f > 28) * 4, 30, 'c46890')
    im.outline()
    return im


@item('hide_igloo', 'hide', 'Igloo', 230, 'A cosy igloo made of soft blocks.', 'front')
def _(frame=0):
    im = Im(56, 40)
    dome = im.ell_mask(28, 40, 27, 38) & (im.yy < 40)
    im.mask(dome, 'e8f0f8')
    for r in range(5):
        y = 4 + r * 7
        im.rect(0, y, 56, y + 1, 'b8c8d8')
        for c in range(-1, 8):
            x = c * 8 + (4 if r % 2 else 0)
            im.rect(x, y, x + 1, y + 7, 'b8c8d8')
    im.mask(dome & (im.xx > 40), 'c8d8e8')
    door = im.ell_mask(28, 40, 9, 14) & (im.yy < 40)
    im.mask(door, '2a3a4a')
    im.mask(~dome, (0, 0, 0)) if False else None
    m2 = ~dome
    im.a[m2] = 0
    im.outline()
    return im


@item('hide_wooden_house', 'hide', 'Wooden house', 260, 'A wooden house with a window and a door.', 'front')
def _(frame=0):
    im = Im(72, 44)
    im.rect(4, 16, 68, 44, 'c08850')
    for x in range(4, 68, 8):
        im.rect(x, 16, x + 1, 44, '9a6a3a')
        im.rect(x + 1, 16, x + 2, 44, 'd4a068')
    for y in range(16, 44):   # roof triangle
        pass
    for k in range(16):
        im.rect(2 + k * 2 - 0, 16 - k, 70 - k * 2, 17 - k, ('b04a3a', '8f3a2e')[k % 2]) if 2 + k * 2 < 70 - k * 2 else None
    im.rect(2, 15, 70, 17, '6e2a22')
    im.rect(10, 24, 22, 34, '9fd0e8'); im.rect(10, 24, 22, 25, '6e4424'); im.rect(10, 33, 22, 34, '6e4424'); im.rect(15, 24, 16, 34, '6e4424')
    door = im.ell_mask(48, 44, 9, 16) & (im.yy < 44)
    im.mask(door, '2a1a12')
    im.outline()
    return im


# ------------------------------------------------------------------ fence 24x40 (tile, behind the pig)
def wire_fence(c1, c2):
    im = Im(24, 40)
    for x in (0, 8, 16):
        im.rect(x, 2, x + 1, 38, c1)
    im.rect(0, 2, 24, 3, c1)
    im.rect(0, 20, 24, 21, c1)
    im.rect(0, 37, 24, 38, c1)
    for x in (0, 8, 16):
        im.px(x + 1, 3, c2)
    return im


@item('fence_wire_black', 'fence', 'Black wire fence', 140, 'A black wire pen panel.', 'back')
def _(frame=0):
    return wire_fence('2e2e34', '55555e')


@item('fence_wire_white', 'fence', 'White wire fence', 140, 'A white wire pen panel.', 'back')
def _(frame=0):
    return wire_fence('e8e4dc', 'ffffff')


@item('fence_picket', 'fence', 'Picket fence', 140, 'A little white picket fence.', 'back')
def _(frame=0):
    im = Im(24, 40)
    for x in range(1, 24, 8):
        im.rect(x, 12, x + 5, 38, 'f4efe6')
        im.rect(x, 12, x + 1, 38, 'ffffff')
        im.rect(x + 4, 12, x + 5, 38, 'd2c8b6')
        im.rect(x + 1, 10, x + 4, 12, 'f4efe6'); im.px(x + 2, 9, 'f4efe6')
    im.rect(0, 20, 24, 23, 'e4dccc'); im.rect(0, 30, 24, 33, 'e4dccc')
    im.outline('7a6a58')
    return im


# ------------------------------------------------------------------ feeders
@item('feeder_bowl_blue', 'feeder', 'Blue ceramic bowl', 70, 'A blue ceramic bowl full of pellets.', 'front')
def _(frame=0):
    im = Im(20, 12)
    im.ell(10, 10, 9.5, 8, ('a8d4f8', '6aa8e0', '3c78b8'))
    im.rect(0, 4, 20, 5, 'd8eeff')
    for i in range(14):
        x, y = 3 + hs(i, 1) % 14, 1 + hs(i, 2) % 3
        im.rect(x, y, x + 2, y + 1, ('a07850', '8a6440', 'b8905c')[i % 3])
    im.rect(4, 4, 16, 5, 'a07850')
    im.outline()
    return im


@item('feeder_hay_rack', 'feeder', 'Hay rack', 90, 'A wire rack stuffed with hay.', 'front')
def _(frame=0):
    im = Im(32, 30)
    for i in range(80):
        x, y = 3 + hs(i, 1) % 26, 2 + hs(i, 2) % 18
        im.line(x, y, x + 3, y - 1 + hs(i, 3) % 3, ('eedb7c', 'cdb556', 'b8a548')[i % 3])
    for x in range(2, 31, 5):
        im.rect(x, 4, x + 1, 24, '55555e')
    im.rect(1, 22, 31, 25, '3a3a42'); im.rect(1, 3, 31, 5, '3a3a42')
    im.rect(14, 25, 18, 30, '3a3a42')
    im.outline()
    return im


@item('feeder_wicker_basket', 'feeder', 'Wicker basket', 90, 'A wicker basket of treats.', 'front')
def _(frame=0):
    im = Im(28, 20)
    im.ell(14, 8, 12, 3, ('9ad060', '7fbf4a', '4f8f35'))
    body = im.ell_mask(14, 8, 13, 11) & (im.yy >= 8)
    for y in range(20):
        for x in range(28):
            if body[y, x]:
                im.px(x, y, ('c8955a', 'b08046')[((x // 3) + (y // 2)) % 2])
    im.rect(1, 8, 27, 10, '8a6030')
    im.outline()
    return im


@item('feeder_water_bottle', 'feeder', 'Water bottle', 100, 'A bottle with a metal ball tip.', 'front')
def _(frame=0):
    im = Im(14, 30)
    im.rect(3, 2, 11, 24, '9fd0f0'); im.rect(3, 2, 5, 24, 'd4ecfc'); im.rect(9, 2, 11, 24, '6aa8d8')
    im.rect(3, 12, 11, 24, '7fbae8')
    im.rect(4, 0, 10, 2, '3c78b8')
    im.rect(6, 24, 8, 28, 'b0b0b8'); im.ell(7, 28, 1.6, 1.6, ('e8e8f0', 'c0c0c8', '8a8a94'))
    im.outline()
    return im


@item('feeder_veggie_dish', 'feeder', 'Veggie dish', 110, 'A dish with carrot slices and greens.', 'front')
def _(frame=0):
    im = Im(24, 12)
    im.ell(12, 9, 11.5, 7, ('f0e6d0', 'd8c8a8', 'b09c78'))
    for (x, y) in ((6, 3), (10, 2), (14, 3), (17, 4)):
        im.ell(x, y, 2.2, 1.6, ('ffb86b', 'f28a2e', 'c9641e'))
    im.line(8, 5, 13, 4, '7fbf4a'); im.line(12, 5, 17, 5, '4f8f35')
    im.outline()
    return im


# ------------------------------------------------------------------ rugs 56x12
@item('rug_knit_round', 'rug', 'Knit round rug', 80, 'A knitted oval rug.', 'floor_top')
def _(frame=0):
    im = Im(56, 12)
    im.ell(28, 6, 27.5, 5.5, ('f4d6a4', 'e8b878', 'c8905a'))
    for y in range(12):
        for x in range(56):
            if im.a[y, x, 3] and (x + y) % 3 == 0 and ((x * 5 + y) % 2 == 0):
                im.px(x, y, 'c8905a')
    im.ell(28, 6, 15, 2.8, ('f9e4c0', 'f4d6a4', 'e8b878'))
    im.outline()
    return im


@item('rug_plaid', 'rug', 'Plaid rug', 80, 'A red and green plaid rug.', 'floor_top')
def _(frame=0):
    im = Im(56, 12)
    m = im.ell_mask(28, 6, 27.5, 5.5)
    im.mask(m, 'b8423a')
    for x in range(0, 56, 8):
        im.mask(m & (im.xx % 8 < 3) & (im.xx >= x), '3f7a4a') if False else None
    im.mask(m & ((im.xx % 10) < 3), '3f7a4a')
    im.mask(m & ((im.yy % 6) < 2), 'd8a838')
    im.mask(m & ((im.xx % 10) < 3) & ((im.yy % 6) < 2), '6e5a20')
    im.outline()
    return im


@item('rug_paws', 'rug', 'Paw print rug', 80, 'A beige rug with paw prints.', 'floor_top')
def _(frame=0):
    im = Im(56, 12)
    im.ell(28, 6, 27.5, 5.5, ('f6ead6', 'e8d8b8', 'c8b08a'))
    for (x, y) in ((10, 6), (22, 4), (34, 7), (46, 5)):
        im.rect(x, y, x + 3, y + 2, 'a07850')
        for dx in (-1, 1, 3):
            im.px(x + dx, y - 1, 'a07850')
    im.outline()
    return im


# ------------------------------------------------------------------ plants 20x28
@item('plant_dandelion', 'plant', 'Dandelion pot', 60, 'A pot with a bright dandelion.', 'front')
def _(frame=0):
    im = Im(20, 28)
    im.rect(5, 19, 15, 28, 'c8693a'); im.rect(5, 19, 15, 21, 'e0804a'); im.rect(5, 26, 15, 28, '984721')
    im.line(10, 19, 10, 10, '4f8f35'); im.line(9, 17, 6, 14, '7fbf4a'); im.line(11, 16, 14, 13, '7fbf4a')
    im.ell(10, 8, 5, 4.2, ('fff2a8', 'f2c94c', 'c99a2e'))
    for k in range(10):
        im.px(6 + k, 5 + hs(k, 1) % 2, 'ffe888')
    im.outline()
    return im


@item('plant_parsley', 'plant', 'Parsley pot', 60, 'Curly parsley in a pot.', 'front')
def _(frame=0):
    im = Im(20, 28)
    im.rect(5, 19, 15, 28, 'a8a098'); im.rect(5, 19, 15, 21, 'c8c0b8'); im.rect(5, 26, 15, 28, '78706a')
    for i in range(7):
        a = -1.2 + i * 0.4
        x, y = 10 + math.sin(a) * 7, 12 - math.cos(a) * 6 + hs(i, 1) % 3
        im.line(10, 19, round(x), round(y) + 3, '5a9a3a')
        im.ell(x, y, 3.2, 2.6, ('b6e07a', '7fbf4a', '3f7f2f'))
    im.outline()
    return im


@item('plant_wheatgrass', 'plant', 'Wheatgrass tray', 60, 'A tray of fresh wheatgrass.', 'front')
def _(frame=0):
    im = Im(20, 28)
    im.rect(2, 22, 18, 28, '8a6a4a'); im.rect(2, 22, 18, 23, 'b08a64'); im.rect(3, 23, 17, 24, '3a2418')
    for i in range(18):
        x = 3 + i
        L = 8 + hs(i, 1) % 8
        im.line(x, 22, x + (hs(i, 2) % 3 - 1), 22 - L, ('9ad060', '7fbf4a', '5a9a3a')[i % 3])
    im.outline()
    return im


# ------------------------------------------------------------------ lamps
@item('lamp_fairy_lights', 'lamp', 'Fairy lights', 140, 'A string of warm fairy lights.', 'wall_top', frames=2)
def _(frame=0):
    im = Im(60, 14)
    pts = [(x, 2 + round(3 * math.sin(x / 60 * math.pi * 4)) ** 2 * 0 + round(2.5 * abs(math.sin(x / 15 * math.pi / 1)))) for x in range(0, 60)]
    for (x, y) in pts:
        im.px(x, y, '3a3a42')
    for i, x in enumerate(range(4, 60, 8)):
        y = pts[x][1] + 1
        on = (i + frame) % 2 == 0
        im.line(x, y, x, y + 1, '3a3a42')
        im.ell(x, y + 4, 1.8, 2.2, ('fff2a8', 'ffd166', 'e8a020') if on else ('d8c88a', 'b8a050', '8a7430'))
        if on:
            im.px(x, y + 2, 'ffffff')
    im.outline() if False else None
    return im


@item('lamp_desk', 'lamp', 'Desk lamp', 140, 'A small desk lamp.', 'front')
def _(frame=0):
    im = Im(20, 30)
    im.rect(5, 26, 15, 29, '3a3a42'); im.rect(5, 26, 15, 27, '6a6a74')
    im.line(10, 26, 7, 14, '55555e'); im.line(7, 14, 12, 8, '55555e')
    for k in range(7):
        im.rect(8 + k // 2, 3 + k, 18 - k // 2, 4 + k, ('e8a020', 'f2c94c')[k % 2])
    im.rect(10, 11, 15, 12, 'fff2a8')
    im.outline()
    return im


# ------------------------------------------------------------------ pictures 22x18
def frame_pic(inner):
    im = Im(22, 18, '8a5a3a')
    im.rect(0, 0, 22, 1, 'b0805a'); im.rect(0, 17, 22, 18, '5a3a22')
    im.rect(2, 2, 20, 16, inner)
    return im


@item('picture_hay_field', 'picture', 'Hay field picture', 100, 'A golden hay field.', 'wall_top')
def _(frame=0):
    im = frame_pic('bfe0f4')
    im.rect(2, 9, 20, 16, 'e0c860')
    for x in range(3, 20, 2):
        im.line(x, 15, x + 1, 10 + hs(x, 1) % 3, 'b8993e')
    im.ell(15, 5, 2, 2, ('fff2a8', 'f2c94c', 'c99a2e'))
    im.outline()
    return im


@item('picture_pig_family', 'picture', 'Pig family picture', 100, 'A portrait of three little pigs.', 'wall_top')
def _(frame=0):
    im = frame_pic('f4ead0')
    for (x, y, rx, c) in ((7, 12, 3.5, ('f7b46e', 'e98c42', 'c8692f')), (14, 12, 3.2, ('e8e4dc', 'c8c0b4', 'a09888')), (11, 8, 2.6, ('8c5e4a', '6e4638', '523126'))):
        im.ell(x, y, rx, rx * 0.8, c)
        im.px(int(x + rx * 0.5), int(y - 1), '2b1712')
    im.outline()
    return im


def build(root):
    entries, frames_out = {}, {}
    # render all
    rendered = {}
    for id, it in ITEMS.items():
        imgs = [it['fn'](f) for f in range(it['frames'])]
        rendered[id] = imgs
    # shelf packing
    ATLAS_W = 1024
    x = y = rowh = 0
    placements = {}
    order = sorted(rendered, key=lambda k: -rendered[k][0].a.shape[0])
    for id in order:
        for fi, im in enumerate(rendered[id]):
            h, w = im.a.shape[:2]
            if x + w + 1 > ATLAS_W:
                x, y, rowh = 0, y + rowh + 1, 0
            placements[(id, fi)] = (x, y, w, h)
            x += w + 1
            rowh = max(rowh, h)
    H_ = y + rowh
    atlas = np.zeros((H_, ATLAS_W, 4), np.uint8)
    for (id, fi), (x, y, w, h) in placements.items():
        atlas[y:y + h, x:x + w] = rendered[id][fi].a
    os.makedirs(os.path.join(root, 'decor'), exist_ok=True)
    Image.fromarray(atlas, 'RGBA').save(os.path.join(root, 'decor', 'decor.png'), optimize=True)
    meta = {'note': 'Shop decor atlas. rect = [x, y, w, h] per frame in decor.png; anchor = bottom centre of the sprite on the floor line (wall items: anchor on the wall). '
                    'layer: wall (behind everything, 240x96 tile), floor (240x34 tile from y 96), back (behind the pig), front (in front of the pig), floor_top (flat on the floor, under the pig), wall_top (hung on the wall). '
                    'Scene 240x130, the top ~34 px are cropped on screen. Generated by tools/art/decor.py',
            'scene': [240, 130], 'items': {}}
    shop = []
    for id, it in ITEMS.items():
        w, h = placements[(id, 0)][2:]
        meta['items'][id] = {'slot': it['slot'], 'layer': it['layer'], 'size': [w, h], 'anchor': [w // 2, h],
                             'frames': [list(placements[(id, f)]) for f in range(it['frames'])], 'fps': 2 if it['frames'] > 1 else 0}
        icon = {'wallpaper': 'wallpaper', 'floor': 'floor', 'rug': 'rug', 'plant': 'plant', 'picture': 'picture_frame', 'lamp': 'lamp',
                'hide': 'hide', 'fence': 'fence', 'feeder': 'feeder', 'bedding': 'bedding'}[it['slot']]
        shop.append({'id': id, 'name': it['name'], 'category': 'decor', 'price': it['price'], 'icon': icon, 'one_time': True, 'slot': it['slot'],
                     'description': it['desc'], 'look': {'atlas': id}})
    json.dump(meta, open(os.path.join(root, 'decor', 'decor.json'), 'w'), indent=1)
    json.dump({'note': 'Proposed shop entries for the new decor (not merged into items_decor.json: slots hide/fence/feeder/bedding and look.atlas need renderer support).',
               'items': shop}, open(os.path.join(root, 'decor', 'decor_items.json'), 'w'), indent=1)
    return rendered, atlas.shape


if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets')
    r, shp = build(root)
    print(len(r), 'items, atlas', shp)
