"""Rekwizyty do animacji (domek, tunel, poidło...) i ikony przedmiotów 16x16."""
import math
import numpy as np
from PIL import Image
from pig import Canvas, MAT, RAMP, S, FLOOR, XX, YY, level, hx, OUT, dil


def E(cx, cy, rx, ry, rot=0.0):
    ux, uy = XX - cx, YY - cy
    if rot:
        r = math.radians(rot)
        ux, uy = ux * math.cos(r) + uy * math.sin(r), -ux * math.sin(r) + uy * math.cos(r)
    return (ux / rx) ** 2 + (uy / ry) ** 2 <= 1, ux / rx, uy / ry


def shade(u, v, bias=0.0):
    return level(-(0.42 * u + 0.88 * v) + bias)


def rect(x0, y0, x1, y1):
    return (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)


def compose(*layers):
    base = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for L in layers:
        if L is None:
            continue
        base.alpha_composite(Image.fromarray(np.ascontiguousarray(L), 'RGBA'))
    return np.array(base)


def hide_x(img, x0=None, x1=None):
    o = img.copy()
    if x0 is not None:
        o[:, max(0, x0):] = 0
    if x1 is not None:
        o[:, :max(0, x1)] = 0
    return o


def flip(img):
    return np.ascontiguousarray(img[:, ::-1])


def shift(img, dx=0, dy=0):
    o = np.zeros_like(img)
    h, w = img.shape[:2]
    xs0, xd0 = max(0, -dx), max(0, dx)
    ys0, yd0 = max(0, -dy), max(0, dy)
    ww, hh = w - abs(dx), h - abs(dy)
    if ww > 0 and hh > 0:
        o[yd0:yd0 + hh, xd0:xd0 + ww] = img[ys0:ys0 + hh, xs0:xs0 + ww]
    return o


# ------------------------------------------------------------------ rekwizyty w scenie (64x64)
def house(x0, w=26, h=22):
    """Drewniany domek-kryjówka widziany z boku; lewa krawędź = x0."""
    c = Canvas()
    yb = FLOOR - 0.5
    body = rect(x0, yb - h + 6, x0 + w, yb)
    roof, ru, rv = E(x0 + w / 2, yb - h + 6, w / 2 + 1.5, 7)
    roof &= YY < yb - h + 6.5
    u = (XX - x0 - w / 2) / (w / 2)
    lv = np.where(((XX.astype(int) - x0) % 5) == 0, 2, np.where(u < -0.6, 1, np.where(u > 0.6, 2, 1)))
    c.put_mat(body, MAT['wood'], lv)
    c.put_mat(roof, MAT['red'], shade(ru, rv))
    eave = rect(x0 - 1, yb - h + 5, x0 + w + 1, yb - h + 7)
    c.put_mat(eave, MAT['red'], 3)
    # okienko
    win, wu, wv = E(x0 + w * 0.62, yb - h + 12, 3, 3)
    c.put_mat(win, MAT['wood'], 3)
    shadow_left = rect(x0, yb - h + 7, x0 + 1, yb)
    c.put_mat(shadow_left, MAT['wood'], 3)
    return c.finish()


def tunnel(x0, w, open_side='left', bulge=None, hgt=29):
    c = Canvas()
    yb = FLOOR - 0.5
    top = yb - hgt
    body = rect(x0, top, x0 + w, yb)
    if bulge is not None:
        bmask, _, _ = E(bulge, top + 1, 6, 3)
        body |= bmask & (YY < top + 1)
    v = (YY - (top + hgt / 2)) / (hgt / 2)
    ring = ((XX.astype(int) - x0) % 7) < 1
    lv = np.where(ring, 3, shade(0 * v, v))
    c.put_mat(body, MAT['fabric'], lv)
    ox = x0 + 2 if open_side == 'left' else x0 + w - 3
    hole, hu, hv = E(ox, top + hgt / 2, 3.4, hgt / 2 - 1.5)
    c.put_mat(hole & body, MAT['fabric'], 3)
    inner, _, _ = E(ox + (0.8 if open_side == 'left' else -0.8), top + hgt / 2 + 1, 2.2, hgt / 2 - 3)
    img = c.finish()
    img[inner & body] = hx('3a1d2a')
    return img


def bottle(x, bubble=0, drop=False):
    c = Canvas()
    glass = rect(x, 18, x + 7, 38)
    cap = rect(x - 1, 15, x + 8, 18)
    water = rect(x, 24, x + 7, 38)
    c.put_mat(glass, MAT['blue'], 0)
    c.put_mat(water, MAT['blue'], np.where(XX < x + 2, 0, np.where(XX > x + 5, 2, 1)))
    c.put_mat(cap, MAT['red'], 2)
    for i in range(1, 6):   # metalowa rurka
        c.put_px(x - i, 37 + i, hx('b9c2cc'))
    c.put_px(x + 2, 36 - (bubble % 10) * 1, RAMP['blue'][0])
    c.put_px(x + 4, 33 - (bubble * 2 % 8), RAMP['blue'][0])
    img = c.finish()
    if drop:
        img[44, x - 5] = RAMP['blue'][1]
    return img


def bowl(x, pellets=6):
    c = Canvas()
    b, bu, bv = E(x + 7, FLOOR - 4, 8, 4)
    b &= YY > FLOOR - 5
    c.put_mat(b, MAT['blue'], shade(bu, bv))
    rim = rect(x - 1, FLOOR - 6, x + 16, FLOOR - 4)
    c.put_mat(rim, MAT['blue'], 0)
    img = c.finish()
    spots = [(x + 3, FLOOR - 7), (x + 6, FLOOR - 7), (x + 9, FLOOR - 7), (x + 12, FLOOR - 7), (x + 5, FLOOR - 8), (x + 10, FLOOR - 8)]
    for i, (px, py) in enumerate(spots[:pellets]):
        img[py, px] = RAMP['hay'][2 if i % 2 else 3]
        img[py, px + 1] = RAMP['hay'][2]
    return img


def ball(cx, cy, phase=0):
    c = Canvas()
    m, u, v = E(cx, cy, 3.6, 3.6)
    lv = shade(u, v)
    stripe = (((XX - cx) * math.cos(phase) + (YY - cy) * math.sin(phase)) % 3) < 1
    c.put_mat(m, MAT['red'], lv)
    c.put_mat(m & stripe, MAT['cream'], np.maximum(lv - 1, 0))
    return c.finish()


def hay_pile(x, w=16, h=7, phase=0):
    c = Canvas()
    m, u, v = E(x + w / 2, FLOOR - 0.5, w / 2, h)
    m &= YY < FLOOR
    straws = ((XX.astype(int) * 3 + YY.astype(int) * 2 + phase) % 5) == 0
    c.put_mat(m, MAT['hay'], np.where(straws, 3, shade(u, v)))
    img = c.finish()
    for k, (sx, sy) in enumerate([(x + 2, FLOOR - h - 1), (x + w - 3, FLOOR - h), (x + w // 2, FLOOR - h - 2)]):
        if 0 <= sx < S:
            img[sy, sx] = RAMP['hay'][1]
    return img


def leaf(x, size=1.0):
    c = Canvas()
    m, u, v = E(x + 7 * size, FLOOR - 2.5, 7.5 * size, 3.2 * size, -8)
    m &= YY < FLOOR
    vein = np.abs(YY - (FLOOR - 2.5) + (XX - x) * 0.12) < 0.5
    c.put_mat(m, MAT['leaf'], np.where(vein, 0, shade(u, v)))
    return c.finish()


def cake(x, bites=0, flame=0):
    c = Canvas()
    w = 13 - bites * 2
    block = rect(x, FLOOR - 7, x + w, FLOOR)
    c.put_mat(block, MAT['cream'], np.where(YY < FLOOR - 5, 0, np.where(YY > FLOOR - 2, 2, 1)))
    icing = rect(x, FLOOR - 8, x + w, FLOOR - 6)
    c.put_mat(icing, MAT['leaf'], 1)
    for k in range(0, w, 4):   # kawałki selera
        c.put_mat(rect(x + k, FLOOR - 9, x + k + 2, FLOOR - 7), MAT['leaf'], 0)
    candle = rect(x + w // 2, FLOOR - 13, x + w // 2 + 1, FLOOR - 8)
    c.put_mat(candle, MAT['blue'], 1)
    img = c.finish()
    fx_ = x + w // 2
    img[FLOOR - 14 - (flame % 2), fx_] = hx('ffd166')
    img[FLOOR - 15 - (flame % 2), fx_] = hx('ff8a3d')
    return img


def pellet(x, y=None):
    c = Canvas()
    y = FLOOR - 2 if y is None else y
    c.stamp(['PPP', 'PPP'], x, y, {'P': RAMP['wood'][3]})
    c.put_px(x, y, RAMP['wood'][2])
    return c.finish()


def stick_in_mouth(NX, NY, bob=0):
    c = Canvas()
    x0, y0 = NX + 1, NY + 2 + bob
    x1, y1 = NX + 9, FLOOR - 1
    n = max(abs(x1 - x0), abs(y1 - y0))
    for k in range(n + 1):
        x = round(x0 + (x1 - x0) * k / n); y = round(y0 + (y1 - y0) * k / n)
        c.put_px(x, y, RAMP['wood'][1 if k % 4 else 2])
        c.put_px(x + 1, y, RAMP['wood'][2])
    return c.finish()


# ------------------------------------------------------------------ ikony 16x16
def _icon(draw):
    c = Canvas()
    draw(c)
    img = c.finish()
    return img[:16, :16].copy()


def icons():
    I = {}

    def papryka(c):
        m, u, v = E(8, 9, 4.6, 5.4)
        l1, _, _ = E(5.6, 12.2, 2.4, 2.4)
        l2, _, _ = E(10.4, 12.2, 2.4, 2.4)
        m = (m | l1 | l2) & (YY < 14.6)
        c.put_mat(m, MAT['red'], np.where(np.abs(XX - 8) < 0.5, 2, shade(u, v)))
        c.put_mat(rect(7, 2, 9, 5), MAT['leaf'], 2)
        c.put_mat(E(8, 4.5, 3, 1.2)[0], MAT['leaf'], 1)
    I['papryka'] = _icon(papryka)

    def ogorek(c):
        m, u, v = E(8, 8, 6.5, 2.8, -40)
        seeds = ((XX.astype(int) + 2 * YY.astype(int)) % 4 == 0)
        c.put_mat(m, MAT['leaf'], np.where(seeds, 1, np.minimum(shade(u, v) + 1, 3)))
    I['ogorek'] = _icon(ogorek)

    def natka(c):
        for cx, cy in [(5, 5), (9, 4), (11, 7), (6, 8), (9, 9)]:
            m, u, v = E(cx, cy, 2.2, 2.0)
            c.put_mat(m, MAT['leaf'], shade(u, v))
        for i in range(6):
            c.put_px(8, 9 + i, RAMP['leaf'][2])
    I['natka'] = _icon(natka)

    def marchewka2(c):
        m, u, v = E(7, 9.5, 6, 2.3, -55)
        c.put_mat(m, MAT['carrot'], np.minimum(shade(u, v) + 1, 3))
        for i, (px, py) in enumerate([(10, 3), (11, 2), (12, 3), (11, 4), (13, 2), (10, 4)]):
            c.put_px(px, py, RAMP['leaf'][1 + i % 2])
    I['marchewka'] = _icon(marchewka2)

    def granulat(c):
        for i, (cx, cy) in enumerate([(5, 11), (8, 11), (11, 11), (6.5, 8.5), (9.5, 8.5), (8, 6)]):
            m, u, v = E(cx, cy, 1.8, 1.3, 20 * i)
            c.put_mat(m, MAT['hay'], np.minimum(shade(u, v) + 1, 3))
    I['granulat'] = _icon(granulat)

    def gryzak(c):
        m, u, v = E(8, 8, 6.5, 1.8, -35)
        rings = ((XX + YY).astype(int) % 4 == 0)
        c.put_mat(m, MAT['wood'], np.where(rings, 3, shade(u, v)))
    I['gryzak'] = _icon(gryzak)

    def pilka(c):
        m, u, v = E(8, 8, 5.5, 5.5)
        lv = shade(u, v)
        c.put_mat(m, MAT['red'], lv)
        c.put_mat(m & ((np.abs(XX - 8) < 0.6) | (np.abs(YY - 8) < 0.6)), MAT['cream'], 1)
    I['pilka'] = _icon(pilka)

    def tunel(c):
        c.put_mat(rect(3, 5, 14, 13), MAT['fabric'], np.where((XX.astype(int) % 3) == 0, 2, 1))
        m, u, v = E(3.5, 9, 2.2, 4.2)
        c.put_mat(m, MAT['fabric'], 3)
    I['tunel'] = _icon(tunel)

    def domek(c):
        c.put_mat(rect(3, 7, 14, 14), MAT['wood'], np.where((XX.astype(int) % 3) == 0, 2, 1))
        roof, u, v = E(8.5, 7, 6.5, 4)
        c.put_mat(roof & (YY < 7.5), MAT['red'], shade(u, v))
        door, _, _ = E(8.5, 12, 2, 2.5)
        c.put_mat(door & (YY < 14), MAT['wood'], 3)
    I['domek'] = _icon(domek)

    def poidlo(c):
        c.put_mat(rect(6, 3, 11, 12), MAT['blue'], np.where(XX < 7.5, 0, 1))
        c.put_mat(rect(5, 2, 12, 4), MAT['red'], 2)
        c.put_px(7, 12, hx('b9c2cc')); c.put_px(6, 13, hx('b9c2cc')); c.put_px(5, 14, hx('b9c2cc'))
    I['poidlo'] = _icon(poidlo)

    def bobek(c):
        m, u, v = E(8, 9, 3.4, 2.2, 10)
        c.put_mat(m, MAT['wood'], np.minimum(shade(u, v) + 2, 3))
    I['bobek'] = _icon(bobek)

    def tort(c):
        c.put_mat(rect(3, 8, 14, 14), MAT['cream'], np.where(YY > 12, 2, 1))
        c.put_mat(rect(3, 7, 14, 9), MAT['leaf'], 1)
        c.put_mat(rect(8, 3, 9, 7), MAT['blue'], 1)
        c.put_px(8, 2, hx('ffd166'))
    I['tort'] = _icon(tort)

    def siano(c):
        m, u, v = E(8, 9, 6, 4.5)
        straws = ((XX.astype(int) * 3 + YY.astype(int)) % 4 == 0)
        c.put_mat(m, MAT['hay'], np.where(straws, 3, shade(u, v)))
        c.put_mat(m & (np.abs(XX - 8) < 0.7), MAT['red'], 2)
    I['siano'] = _icon(siano)

    def koniczynka(c):
        allm = np.zeros((S, S), bool)
        for cx, cy in [(5.5, 5.5), (10.5, 5.5), (5.5, 10.5), (10.5, 10.5)]:
            m, u, v = E(cx, cy, 2.6, 2.6)
            c.put_mat(m, MAT['leaf'], shade(u, v)); allm |= m
        gap = allm & ((np.abs(XX - 8) < 0.6) | (np.abs(YY - 8) < 0.6))
        c.put_mat(gap, MAT['leaf'], 3)
        c.put_mat(E(8, 8, 1.0, 1.0)[0], MAT['leaf'], 1)
        for i in range(4):
            c.put_px(9 + i // 2, 11 + i, RAMP['leaf'][2])
    I['koniczynka'] = _icon(koniczynka)

    def lisc(c):
        m, u, v = E(8, 8, 6, 3.6, -30)
        c.put_mat(m, MAT['leaf'], shade(u, v))
    I['jarmuz'] = _icon(lisc)

    def truskawka(c):
        m, u, v = E(8, 9.5, 4.6, 5.0)
        tip, _, _ = E(8, 12.5, 2.6, 2.6)
        c.put_mat(m | tip, MAT['red'], shade(u, v))
        for px, py in [(6, 8), (9, 7), (7, 11), (10, 10), (8, 13)]:
            c.put_px(px, py, RAMP['cream'][1])
        c.put_mat(E(8, 4.5, 3.6, 1.3)[0], MAT['leaf'], 1)
        c.put_px(8, 2, RAMP['leaf'][2]); c.put_px(8, 3, RAMP['leaf'][2])
    I['truskawka'] = _icon(truskawka)

    def cebula(c):
        m, u, v = E(8, 10, 5, 4.5)
        top, _, _ = E(8, 6, 2.2, 3)
        c.put_mat(m | top, MAT['cream'], shade(u, v))
        lines = (m | top) & ((np.abs(XX - 6) < 0.5) | (np.abs(XX - 10) < 0.5))
        c.put_mat(lines, MAT['fabric'], 2)
        c.put_px(8, 2, RAMP['leaf'][1]); c.put_px(8, 3, RAMP['leaf'][2])
    I['cebula'] = _icon(cebula)

    def czekolada(c):
        c.put_mat(rect(3, 4, 13, 13), MAT['wood'], np.where(((XX.astype(int) - 3) % 3 == 2) | ((YY.astype(int) - 4) % 3 == 2), 3, 2))
        c.put_mat(rect(9, 9, 14, 14), MAT['red'], 1)
    I['czekolada'] = _icon(czekolada)

    # ikony potrzeb
    def p_najedzenie(c):
        m, u, v = E(8, 10, 6, 3.5)
        m &= YY > 9
        c.put_mat(m, MAT['blue'], shade(u, v))
        c.put_mat(rect(2, 8, 15, 10), MAT['blue'], 0)
        c.put_mat(E(8, 7.5, 4, 2)[0] & (YY < 8.5), MAT['hay'], 1)
    I['potrzeba_najedzenie'] = _icon(p_najedzenie)

    def p_witamina(c):
        m, u, v = E(8, 8, 5.5, 5.5)
        c.put_mat(m, MAT['carrot'], shade(u, v))
        c.stamp(['.WWW', 'W...', 'W...', 'W...', '.WWW'], 6, 6, {'W': RAMP['cream'][0]})
    I['potrzeba_witamina_c'] = _icon(p_witamina)

    def p_energia(c):
        m, u, v = E(8, 8, 5.5, 5.5)
        cut, _, _ = E(10.5, 6.5, 4.5, 4.5)
        c.put_mat(m & ~cut, MAT['gold'], shade(u, v))
    I['potrzeba_energia'] = _icon(p_energia)

    def p_humor(c):
        c.stamp(['..RR...RR..', '.RLRR.RRRR.', 'RLRRRRRRRRD', 'RRRRRRRRRRD', '.RRRRRRRRD.', '..RRRRRRD..',
                 '...RRRRD...', '....RRD....', '.....D.....'], 2, 3,
                {'R': RAMP['red'][1], 'L': RAMP['red'][0], 'D': RAMP['red'][2]})
    I['potrzeba_humor'] = _icon(p_humor)

    def p_czystosc(c):
        m, u, v = E(7, 9.5, 4, 4)
        tip = (YY > 3) & (YY < 8) & (np.abs(XX - 7) < (YY - 3) * 0.8)
        c.put_mat(m | tip, MAT['blue'], shade(u, v))
        c.stamp(['.Y.', 'YYY', '.Y.'], 11, 2, {'Y': hx('fff3a0')})
    I['potrzeba_czystosc'] = _icon(p_czystosc)

    def p_zabki(c):
        c.put_mat(rect(4, 3, 12, 10), MAT['cream'], np.where(XX < 6, 0, 1))
        c.put_mat(rect(4, 10, 7, 14) | rect(9, 10, 12, 14), MAT['cream'], 1)
        c.put_mat(rect(7.6, 9, 8.4, 14), MAT['cream'], 3)
    I['potrzeba_zabki'] = _icon(p_zabki)
    I['glowa_swinki'] = _head_icon()
    return I


def _head_icon():
    import pig
    saved = dict(pig.STYLE)
    for k in (0.62, 0.58, 0.55, 0.52, 0.5, 0.48):
        pig.STYLE.update(kb=k, kh=k)
        f = pig.render_front(body=False, shadow=0)
        f[f[:, :, 3] < 255] = 0      # bez wąsów
        a = f[:, :, 3] > 0
        ys, xs = np.where(a)
        if ys.max() - ys.min() < 15 and xs.max() - xs.min() < 15:
            break
    pig.STYLE.clear(); pig.STYLE.update(saved)
    out = np.zeros((16, 16, 4), np.uint8)
    y0 = ys.max() - 14
    x0 = (xs.min() + xs.max() + 1) // 2 - 8
    out[:] = f[y0:y0 + 16, x0:x0 + 16]
    return out
