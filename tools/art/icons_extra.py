import os
import json
import numpy as np
from PIL import Image
from props import Canvas, MAT, RAMP, E, shade, rect, hx, XX, YY
from pig import OUT, EYE, dil

def _icon(draw):
    c = Canvas()
    draw(c)
    img = c.finish()
    return img[:16, :16].copy()

def _paint(c, mask, col):
    c.mat[mask] = -2
    c.pig[mask] = col
    c.fill |= mask

def _cloud(c, dy=0, dark=False):
    """Cloud made of three puffs on a flat base; dy shifts it vertically."""
    puffs = [E(5, 8.2 + dy, 3, 2.6), E(8.2, 6.2 + dy, 3.6, 3.2), E(11.2, 8 + dy, 3, 2.6)]
    m = rect(3, 8 + dy, 13, 11 + dy)
    for p, _, _ in puffs:
        m = m | p
    y0, y1 = 3.2 + dy, 11 + dy
    u = (XX - 7.5) / 5.5
    v = (YY - (y0 + y1) / 2) / ((y1 - y0) / 2)
    lv = np.minimum(shade(u, v), 2)
    if dark:
        ramp = [hx('8e9bb0'), hx('6b7890'), hx('4d5870'), hx('343d52')]
        for k in range(3):
            _paint(c, m & (lv == k), ramp[k])
    else:
        c.put_mat(m, MAT['grey'], lv)

def get_new_icons():
    I = {}

    # food
    def dandelion(c):
        m, u, v = E(8, 8, 4.5, 4.5)
        petals = (np.abs((XX.astype(int) - 8) * (YY.astype(int) - 8)) % 2 == 0)
        c.put_mat(m, MAT['gold'], np.where(petals, 2, shade(u, v)))
        stem, _, _ = E(8, 12, 1.5, 3)
        c.put_mat(stem, MAT['leaf'], 1)
        c.put_px(8, 8, hx('ffd166'))
    I['dandelion'] = _icon(dandelion)

    def apple(c):
        m, u, v = E(8, 9, 5, 4.5)
        m &= (YY > 6)
        top, tu, tv = E(8, 7, 3, 2)
        c.put_mat(m | top, MAT['red'], shade(u, v))
        stem, _, _ = E(8, 4.5, 1, 2)
        c.put_mat(stem, MAT['wood'], 2)
        leaf_m, _, _ = E(10, 5, 2, 1, 30)
        c.put_mat(leaf_m, MAT['leaf'], 1)
        c.put_px(6, 6, RAMP['cream'][0])
    I['apple'] = _icon(apple)

    # toys
    def hay_ball(c):
        m, u, v = E(8, 8, 5.5, 5.5)
        straws = ((XX.astype(int) * 3 + YY.astype(int)) % 4 == 0)
        c.put_mat(m, MAT['hay'], np.where(straws, 3, shade(u, v)))
    I['hay_ball'] = _icon(hay_ball)

    def chew_bridge(c):
        m, u, v = E(8, 8, 6.5, 4.5)
        m &= YY < 10
        gap, _, _ = E(8, 10, 4.5, 3)
        c.put_mat(m & ~gap, MAT['wood'], shade(u, v))
        lines = (XX.astype(int) % 3 == 0)
        c.put_mat(m & ~gap & lines, MAT['wood'], 3)
    I['chew_bridge'] = _icon(chew_bridge)

    def hammock(c):
        c.put_mat(rect(3, 5, 14, 11), MAT['fabric'], 1)
        c.put_mat(rect(4, 6, 13, 10), MAT['fabric'], 2)
        # ropes
        c.put_px(2, 4, RAMP['fabric'][0]); c.put_px(1, 3, RAMP['fabric'][0])
        c.put_px(13, 4, RAMP['fabric'][0]); c.put_px(14, 3, RAMP['fabric'][0])
        c.put_px(2, 11, RAMP['fabric'][0]); c.put_px(1, 12, RAMP['fabric'][0])
        c.put_px(13, 11, RAMP['fabric'][0]); c.put_px(14, 12, RAMP['fabric'][0])
    I['hammock'] = _icon(hammock)

    def cuddle_cup(c):
        m, u, v = E(8, 10, 6, 3)
        c.put_mat(m, MAT['fabric'], shade(u, v))
        inner, _, _ = E(8, 9, 4, 1.5)
        c.put_mat(inner, MAT['fabric'], 3)
        back, _, _ = E(8, 7, 5, 2.5)
        c.put_mat(back & (YY < 9), MAT['fabric'], 1)
    I['cuddle_cup'] = _icon(cuddle_cup)

    # vet
    def vet(c):
        m, u, v = E(8, 8, 5, 5)
        c.put_mat(m, MAT['cream'], shade(u, v))
        cross = (m & ((np.abs(XX - 8) < 1.5) | (np.abs(YY - 8) < 1.5))) & (np.abs(XX - 8) < 3.5) & (np.abs(YY - 8) < 3.5)
        c.put_mat(cross, MAT['red'], 1)
    I['vet'] = _icon(vet)

    def vitamin_drops(c):
        body = rect(5, 7, 12, 14)
        c.put_mat(body, MAT['blue'], 1)
        cap = rect(6, 4, 11, 7)
        c.put_mat(cap, MAT['red'], 2)
        drop, _, _ = E(8, 14, 1.5, 2)
        c.put_mat(drop, MAT['carrot'], 1)
        c.put_px(6, 8, RAMP['blue'][0]); c.put_px(6, 9, RAMP['blue'][0])
    I['vitamin_drops'] = _icon(vitamin_drops)

    def medicine(c):
        c.put_mat(rect(4, 5, 13, 13), MAT['blue'], 1)
        c.put_mat(rect(5, 3, 12, 5), MAT['wood'], 1)
        label = rect(5, 7, 12, 11)
        c.put_mat(label, MAT['cream'], 0)
        c.put_px(8, 8, RAMP['red'][1]); c.put_px(8, 9, RAMP['red'][1])
        c.put_px(7, 9, RAMP['red'][1]); c.put_px(9, 9, RAMP['red'][1])
    I['medicine'] = _icon(medicine)

    # care
    def calendar(c):
        c.put_mat(rect(3, 4, 14, 14), MAT['cream'], 1)
        c.put_mat(rect(3, 3, 14, 6), MAT['red'], 1)
        for x in [5, 8, 11]:
            c.put_mat(rect(x, 1, x+2, 4), MAT['wood'], 2)
        c.put_mat(rect(5, 8, 7, 10), MAT['blue'], 1)
        c.put_mat(rect(9, 8, 11, 10), MAT['blue'], 1)
    I['calendar'] = _icon(calendar)

    def water_drop(c):
        m, u, v = E(8, 10, 4, 4)
        top = (YY < 10) & (YY > 3) & (np.abs(XX - 8) < (YY - 3) * 0.7)
        c.put_mat(m | top, MAT['blue'], shade(u, v))
        c.put_px(6, 9, RAMP['blue'][0]); c.put_px(6, 10, RAMP['blue'][0])
    I['water_drop'] = _icon(water_drop)

    def scale(c):
        c.put_mat(rect(3, 8, 14, 12), MAT['wood'], 1)
        plate, _, _ = E(8, 7, 5, 2)
        c.put_mat(plate, MAT['wood'], 3)
        dial, _, _ = E(8, 10, 2, 2)
        c.put_mat(dial, MAT['cream'], 0)
        c.put_px(8, 9, RAMP['red'][2])
    I['scale'] = _icon(scale)

    def brush(c):
        c.put_mat(rect(4, 7, 13, 10), MAT['wood'], 1)
        c.put_mat(rect(4, 10, 13, 13), MAT['hay'], 2)
        handle = rect(2, 6, 6, 8)
        c.put_mat(handle, MAT['wood'], 2)
    I['brush'] = _icon(brush)

    def nail_clipper(c):
        c.put_mat(rect(5, 5, 12, 13), MAT['blue'], 2)
        c.put_mat(rect(4, 3, 9, 7), MAT['blue'], 1)
        c.put_mat(rect(7, 5, 10, 11), MAT['blue'], 0)
        c.put_px(6, 13, hx('b9c2cc')); c.put_px(10, 13, hx('b9c2cc'))
    I['nail_clipper'] = _icon(nail_clipper)

    def broom(c):
        c.put_mat(rect(7, 2, 9, 10), MAT['wood'], 1)
        bristles, _, _ = E(8, 12, 4, 3)
        c.put_mat(bristles & (YY > 9), MAT['hay'], 1)
        lines = (XX.astype(int) % 2 == 0)
        c.put_mat(bristles & (YY > 9) & lines, MAT['hay'], 3)
    I['broom'] = _icon(broom)

    # decor
    def wallpaper(c):
        c.put_mat(rect(3, 3, 14, 14), MAT['fabric'], 0)
        stripes = (XX.astype(int) % 4 < 2)
        c.put_mat(rect(3, 3, 14, 14) & stripes, MAT['fabric'], 2)
        roll = rect(12, 2, 15, 15)
        c.put_mat(roll, MAT['fabric'], 3)
    I['wallpaper'] = _icon(wallpaper)

    def floor(c):
        m, u, v = E(8, 8, 6, 6)
        c.put_mat(m, MAT['wood'], 1)
        planks = (YY.astype(int) % 4 == 0)
        c.put_mat(m & planks, MAT['wood'], 3)
        c.put_px(6, 6, RAMP['wood'][2]); c.put_px(10, 10, RAMP['wood'][2])
    I['floor'] = _icon(floor)

    def rug(c):
        m, u, v = E(8, 9, 6, 3)
        c.put_mat(m, MAT['red'], 1)
        inner, _, _ = E(8, 9, 4, 1.5)
        c.put_mat(inner, MAT['cream'], 1)
        fringe = (XX.astype(int) % 2 == 0) & ((XX < 4) | (XX > 12)) & (YY > 7) & (YY < 11)
        c.put_mat(fringe, MAT['cream'], 0)
    I['rug'] = _icon(rug)

    def plant(c):
        pot = rect(5, 10, 12, 14)
        c.put_mat(pot, MAT['wood'], 2)
        for cx, cy in [(6, 7), (10, 7), (8, 5)]:
            m, u, v = E(cx, cy, 2.5, 3)
            c.put_mat(m, MAT['leaf'], shade(u, v))
    I['plant'] = _icon(plant)

    def picture_frame(c):
        c.put_mat(rect(3, 3, 14, 14), MAT['wood'], 1)
        c.put_mat(rect(5, 5, 12, 12), MAT['cream'], 0)
        pic, _, _ = E(8, 8, 2, 2)
        c.put_mat(pic, MAT['leaf'], 1)
    I['picture_frame'] = _icon(picture_frame)

    def lamp(c):
        shade_m, _, _ = E(8, 6, 4, 3)
        shade_m &= YY > 5
        c.put_mat(shade_m, MAT['gold'], 1)
        base = rect(7, 6, 10, 13)
        c.put_mat(base, MAT['blue'], 2)
        stand = rect(5, 13, 12, 15)
        c.put_mat(stand, MAT['blue'], 1)
        c.put_px(8, 5, hx('ffd166'))
    I['lamp'] = _icon(lamp)

    # misc
    def gift(c):
        c.put_mat(rect(4, 6, 13, 14), MAT['red'], 1)
        c.put_mat(rect(3, 5, 14, 8), MAT['red'], 0)
        c.put_mat(rect(7, 5, 10, 14), MAT['gold'], 1)
        bow1, _, _ = E(6, 4, 2, 1.5, -20)
        bow2, _, _ = E(11, 4, 2, 1.5, 20)
        c.put_mat(bow1 | bow2, MAT['gold'], 2)
    I['gift'] = _icon(gift)

    def palette(c):
        m, u, v = E(8, 8, 6, 5)
        hole, _, _ = E(11, 8, 1.5, 1.5)
        c.put_mat(m & ~hole, MAT['wood'], 1)
        c.put_px(5, 6, RAMP['red'][1]); c.put_px(6, 6, RAMP['red'][1])
        c.put_px(5, 9, RAMP['blue'][1]); c.put_px(6, 9, RAMP['blue'][1])
        c.put_px(8, 5, RAMP['leaf'][1]); c.put_px(9, 5, RAMP['leaf'][1])
        c.put_px(8, 10, RAMP['gold'][1]); c.put_px(9, 10, RAMP['gold'][1])
    I['palette'] = _icon(palette)

    def music_note(c):
        c.put_mat(rect(6, 4, 8, 12), MAT['blue'], 3)
        c.put_mat(rect(10, 3, 12, 11), MAT['blue'], 3)
        c.put_mat(rect(6, 3, 12, 5), MAT['blue'], 2)
        n1, _, _ = E(5, 12, 2.5, 2, -15)
        n2, _, _ = E(9, 11, 2.5, 2, -15)
        c.put_mat(n1 | n2, MAT['blue'], 1)
    I['music_note'] = _icon(music_note)

    # weather
    def weather_clear(c):
        disk, u, v = E(8, 8, 3.6, 3.6)
        for r in (rect(7, 1, 9, 3), rect(7, 13, 9, 15), rect(1, 7, 3, 9), rect(13, 7, 15, 9)):
            c.put_mat(r, MAT['gold'], 2)
        for x, y in [(3, 3), (12, 3), (3, 12), (12, 12)]:
            c.put_px(x, y, RAMP['gold'][2])
        c.put_mat(disk, MAT['gold'], shade(u, v))
        c.put_px(6, 6, RAMP['gold'][0])
    I['weather_clear'] = _icon(weather_clear)

    def weather_cloudy(c):
        _cloud(c, 0)
    I['weather_cloudy'] = _icon(weather_cloudy)

    def weather_fog(c):
        _cloud(c, -2)
        c.put_mat(rect(2, 10, 12, 11), MAT['grey'], 1)
        c.put_mat(rect(4, 12, 14, 13), MAT['grey'], 2)
        c.put_mat(rect(2, 14, 10, 15), MAT['grey'], 1)
    I['weather_fog'] = _icon(weather_fog)

    def weather_rain(c):
        _cloud(c, -2)
        for cx, cy in [(3, 11.5), (8, 12.5), (13, 11.5)]:
            d, u, v = E(cx, cy, 1.1, 1.8)
            c.put_mat(d, MAT['blue'], np.where(XX < cx, 1, 2))
            c.put_px(int(cx) - 1, int(cy) - 1, RAMP['blue'][0])
    I['weather_rain'] = _icon(weather_rain)

    def weather_snow(c):
        _cloud(c, -2)
        for cx, cy in [(3, 12), (8, 13), (13, 12)]:
            for dx, dy in [(0, -1), (-1, 0), (1, 0), (0, 1)]:
                c.put_px(cx + dx, cy + dy, hx('c4e6ff'))
            c.put_px(cx, cy, hx('ffffff'))
    I['weather_snow'] = _icon(weather_snow)

    def weather_storm(c):
        _cloud(c, -2, dark=True)
        bolt = [(9, 9), (10, 9), (11, 9), (8, 10), (9, 10), (10, 10), (6, 11), (7, 11), (8, 11), (9, 11), (10, 11),
                (9, 12), (10, 12), (8, 13), (9, 13), (8, 14)]
        for x, y in bolt:
            c.put_px(x, y, RAMP['gold'][1] if x < 9 else RAMP['gold'][2])
        c.put_px(9, 9, RAMP['gold'][0]); c.put_px(8, 10, RAMP['gold'][0]); c.put_px(7, 11, RAMP['gold'][0])
    I['weather_storm'] = _icon(weather_storm)

    # padlock / trophy
    def padlock(c):
        outer, _, _ = E(8.5, 6.5, 4.3, 5.2)
        inner, _, _ = E(8.5, 7, 2.2, 3.4)
        sh = outer & ~inner & (YY < 9)
        c.put_mat(sh, MAT['grey'], np.where(XX < 6, 0, np.where(XX < 10, 1, 2)))
        body = rect(3, 7, 14, 14) & ~(((XX < 4) | (XX >= 13)) & ((YY < 8) | (YY >= 13)))
        c.put_mat(body, MAT['gold'], shade((XX - 8.5) / 5.5, (YY - 10.5) / 3.5))
        for x in (7, 8, 9):
            c.put_px(x, 9, OUT); c.put_px(x, 10, OUT)
        c.put_px(8, 11, OUT); c.put_px(8, 12, OUT)
    I['padlock'] = _icon(padlock)

    def trophy(c):
        for cx in (2.8, 13.2):
            o, _, _ = E(cx, 4.6, 2.1, 2.3)
            i, _, _ = E(cx, 4.6, 0.9, 1.1)
            c.put_mat(o & ~i & (YY < 8), MAT['gold'], 2)
        bowl, u, v = E(8, 2, 4, 6.8)
        bowl &= (YY >= 2) & (YY < 9)
        c.put_mat(bowl, MAT['gold'], shade(u, v))
        c.put_mat(rect(3, 1, 13, 3), MAT['gold'], np.where(XX < 8, 0, 1))
        c.put_mat(rect(7, 9, 9, 12), MAT['gold'], np.where(XX < 8, 1, 2))
        c.put_mat(rect(5, 12, 11, 13), MAT['gold'], 1)
        c.put_mat(rect(4, 13, 12, 15), MAT['gold'], 2)
        c.put_px(5, 4, RAMP['gold'][0]); c.put_px(5, 5, RAMP['gold'][0])
    I['trophy'] = _icon(trophy)

    # achievement badges
    def badge_care(c):
        hw = np.where(YY < 8, 5.5, 5.5 - (YY - 8) * 0.95)
        shield = (np.abs(XX - 8) <= hw) & (YY >= 1) & (YY < 15)
        hw2 = hw - 1.3
        inner = (np.abs(XX - 8) <= hw2) & (YY >= 2.3) & (YY < 13.6)
        c.put_mat(shield, MAT['gold'], shade((XX - 8) / 5.5, (YY - 8) / 6.5))
        c.put_mat(inner, MAT['blue'], shade((XX - 8) / 5.5, (YY - 8) / 6.5, 0.15))
        cm = {'a': RAMP['red'][0], 'b': RAMP['red'][1], 'c': RAMP['red'][2]}
        c.stamp(['.ab.bb.', 'abbbbbc', 'bbbbbbc', '.bbbbc.', '..bbc..', '...c...'], 5, 4, cm)
    I['badge_care'] = _icon(badge_care)

    def badge_play(c):
        m, u, v = E(8, 8, 6.3, 6.3)
        c.put_mat(m, MAT['red'], shade(u, v))
        band = m & (np.abs((YY - 8) - 0.45 * (XX - 8)) < 1.4)
        c.put_mat(band, MAT['cream'], shade(u, v, 0.35))
        c.put_px(4, 4, RAMP['red'][0]); c.put_px(5, 3, RAMP['red'][0]); c.put_px(4, 5, RAMP['red'][0])
    I['badge_play'] = _icon(badge_play)

    def badge_growth(c):
        soil, su, sv = E(8, 14, 5.5, 2.6)
        c.put_mat(soil & (YY >= 12), MAT['wood'], shade(su, sv, -0.2))
        c.put_mat(rect(7, 6, 9, 13), MAT['leaf'], np.where(XX < 8, 1, 2))
        l1, u1, v1 = E(5, 5.5, 3.6, 2.0, 35)
        l2, u2, v2 = E(11.2, 4, 3.6, 2.0, -35)
        c.put_mat(l1, MAT['leaf'], shade(u1, v1))
        c.put_mat(l2, MAT['leaf'], shade(u2, v2))
        c.put_px(4, 5, RAMP['leaf'][0]); c.put_px(10, 3, RAMP['leaf'][0])
    I['badge_growth'] = _icon(badge_growth)

    def badge_social(c):
        def head(cp, rp, mat):
            m, u, v = E(cp + 0.5, rp + 0.5, 3.6, 3.6)
            ears = E(cp + 0.5 - 2.8, rp + 0.5 - 2.6, 1.4, 1.3)[0] | E(cp + 0.5 + 2.8, rp + 0.5 - 2.6, 1.4, 1.3)[0]
            c.put_mat(ears & ~m, MAT['pink'], 1)
            c.put_mat(m, MAT[mat], shade(u, v))
            c.put_px(cp - 2, rp, EYE); c.put_px(cp + 2, rp, EYE)
            c.put_px(cp, rp + 2, RAMP['pink'][2])
            return m | ears
        back = head(10, 6, 'white')
        front_cp, front_rp = 5, 10
        front = head(front_cp, front_rp, 'orange')
        ring = dil(front) & ~front & back
        c.pig[ring] = OUT
        c.mat[ring] = -2
    I['badge_social'] = _icon(badge_social)

    # ------------------------------------------------------------------ V5: own icons (items, traits, games, coats)
    R = RAMP

    def cm_of(*names_lv):
        return {ch: R[n][lv] for ch, (n, lv) in names_lv}

    def soft_pellets(c):
        bowl, u, v = E(8, 10.5, 6.2, 4.2)
        bowl &= (YY >= 9.5)
        c.put_mat(bowl, MAT['blue'], shade(u, v))
        c.put_mat(rect(2, 9, 14, 10.4), MAT['blue'], 0)
        for (px, py) in ((5, 6), (8, 5), (11, 6), (6.5, 8), (9.5, 8)):
            m, pu, pv = E(px, py, 2.0, 1.7)
            c.put_mat(m, MAT['orange'], shade(pu, pv, 0.1))
        c.put_px(7, 4, R['cream'][0]); c.put_px(4, 5, R['cream'][0])
    I['soft_pellets'] = _icon(soft_pellets)

    def warm_house_bed(c):
        cush, u, v = E(8, 11, 6.4, 3.2)
        c.put_mat(cush, MAT['fabric'], shade(u, v))
        pil, pu, pv = E(5.5, 8.6, 3.0, 2.0, -10)
        c.put_mat(pil, MAT['cream'], shade(pu, pv))
        blan, bu, bv = E(10.5, 9.4, 3.6, 2.4, 10)
        c.put_mat(blan, MAT['red'], shade(bu, bv))
        c.stamp(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 5, 0,
                {'r': R['red'][1]})
        c.put_px(6, 1, R['red'][0])
    I['warm_house_bed'] = _icon(warm_house_bed)

    def dental_chew(c):
        c.stamp(['.WW.......WW.', 'WWWC.....CWWD', 'WWCCCWbWCCCDD', 'WCCCDDbDDCCCD', '.CCD.....CDD.', '..D.......D..'], 1, 5,
                {'W': R['cream'][0], 'C': R['cream'][1], 'D': R['cream'][2], 'b': R['blue'][1]})
        c.put_px(11, 3, R['white'][0]); c.put_px(10, 4, R['white'][0]); c.put_px(12, 4, R['white'][0]); c.put_px(11, 5 - 0, R['white'][0]) if False else None
    I['dental_chew'] = _icon(dental_chew)

    def vitamin_mix(c):
        jar = rect(4, 5, 12, 14)
        c.put_mat(jar, MAT['blue'], np.where(XX < 6, 0, np.where(XX < 10, 1, 2)))
        c.put_mat(rect(5, 3, 11, 5), MAT['wood'], 1)
        c.put_mat(rect(6, 6, 10, 7), MAT['blue'], 0)
        for (px, py, col) in ((6, 9, R['red'][1]), (9, 8, R['gold'][1]), (7, 12, R['leaf'][1]), (10, 11, R['orange'][1]), (8, 10, R['red'][0])):
            c.put_px(px, py, col)
    I['vitamin_mix'] = _icon(vitamin_mix)

    def carrot_top(c):
        for (cx, cy, rx, ry, rot) in ((5.5, 6, 2.0, 4.6, 25), (8, 5, 1.8, 4.9, 0), (10.5, 6, 2.0, 4.6, -25)):
            m, u, v = E(cx, cy, rx, ry, rot)
            c.put_mat(m, MAT['leaf'], shade(u, v, 0.05))
        c.put_mat(E(8, 11.5, 3.3, 2.0)[0], MAT['carrot'], 1)
        c.put_mat(rect(6, 12, 10, 14) & E(8, 12, 3, 3)[0], MAT['carrot'], 2)
        c.put_px(7, 11, R['carrot'][0]); c.put_px(8, 3, R['leaf'][0])
    I['carrot_top'] = _icon(carrot_top)

    # --- traits
    def trait_cuddly(c):
        c.stamp(['.hhh.hhh.', 'hHHHhHHHh', 'hHHHHHHHh', 'hHHHHHHHh', '.hHHHHHh.', '..hHHHh..', '...hHh...', '....h....'], 3, 4,
                {'H': R['red'][1], 'h': R['red'][2]})
        c.put_px(5, 5, R['red'][0]); c.put_px(6, 5, R['red'][0]); c.put_px(5, 6, R['red'][0])
        c.put_px(11, 3, R['pink'][0]); c.put_px(3, 3, R['pink'][1])
    I['trait_cuddly'] = _icon(trait_cuddly)

    def trait_glutton(c):
        bowl, u, v = E(8, 9.5, 6.2, 4.6)
        bowl &= (YY >= 9)
        c.put_mat(bowl, MAT['red'], shade(u, v))
        c.put_mat(rect(2, 8.4, 14, 9.9), MAT['red'], 0)
        m1, u1, v1 = E(5.5, 6.2, 2.3, 2.2); m2, u2, v2 = E(8.5, 5.4, 2.4, 2.4); m3, u3, v3 = E(11, 6.6, 2.1, 2.0)
        c.put_mat(m1, MAT['leaf'], shade(u1, v1)); c.put_mat(m2, MAT['carrot'], shade(u2, v2)); c.put_mat(m3, MAT['gold'], shade(u3, v3))
        c.put_px(8, 12, R['red'][0])
    I['trait_glutton'] = _icon(trait_glutton)

    def trait_explorer(c):
        m, u, v = E(8, 8, 6.3, 6.3)
        c.put_mat(m, MAT['gold'], shade(u, v))
        inner, iu, iv = E(8, 8, 4.4, 4.4)
        c.put_mat(inner, MAT['cream'], shade(iu, iv, 0.5))
        for k in range(1, 5):
            c.put_px(8 + k, 8 - k, R['red'][1]) if k < 4 else None
        c.stamp(['.r.', 'rrr', '.r.'], 9, 5, {'r': R['red'][1]}, False)
        c.stamp(['.b.', 'bbb', '.b.'], 5, 9, {'b': R['blue'][2]}, False)
        c.put_px(8, 8, OUT)
        c.put_px(8, 2, R['gold'][0])
    I['trait_explorer'] = _icon(trait_explorer)

    def trait_sleepyhead(c):
        m, u, v = E(8, 9, 5.8, 5.8)
        cut, _, _ = E(11, 7.3, 5.2, 5.2)
        moon = m & ~cut
        c.put_mat(moon, MAT['gold'], shade(u, v))
        c.stamp(['bbb', '..b', '.b.', 'bbb'], 10, 2, {'b': R['blue'][1]})
        c.put_px(12, 11, R['gold'][0]); c.put_px(4, 4, R['gold'][0])
    I['trait_sleepyhead'] = _icon(trait_sleepyhead)

    def trait_popcorning(c):
        cup = rect(4, 10, 12, 15)
        c.put_mat(cup, MAT['red'], np.where(((XX.astype(int)) % 2) == 0, 1, 0))
        c.put_mat(rect(4, 10, 12, 11), MAT['red'], 2)
        for (px, py, rx) in ((5.5, 7.5, 2.4), (8.5, 5.8, 2.7), (11, 7.8, 2.3), (7, 9, 1.8)):
            m, pu, pv = E(px, py, rx, rx)
            c.put_mat(m, MAT['cream'], shade(pu, pv))
        c.put_px(3, 3, R['gold'][1]); c.put_px(13, 3, R['gold'][1]); c.put_px(8, 2, R['gold'][0])
    I['trait_popcorning'] = _icon(trait_popcorning)

    def trait_vocal(c):
        bub, u, v = E(8, 7, 6.4, 5.2)
        c.put_mat(bub, MAT['cream'], shade(u, v, 0.4))
        c.stamp(['bb', '.b'], 4, 11, {'b': R['cream'][1]})
        for (x, h) in ((4, 1), (6, 3), (8, 5), (10, 3), (12, 1)):
            for y in range(7 - h // 2 - 1 + 1, 7 + h // 2 + 2):
                c.put_px(x, y, R['blue'][2], False)
    I['trait_vocal'] = _icon(trait_vocal)

    # --- minigame icons
    def game_veggie_rain(c):
        _cloud(c, dy=-2, dark=True)
        m, u, v = E(8, 11.5, 2.0, 3.8, -25)
        c.put_mat(m, MAT['carrot'], shade(u, v))
        c.put_mat(E(9.6, 8.4, 1.4, 1.6)[0], MAT['leaf'], 1)
        for (x, y) in ((3, 10), (13, 9), (4, 14)):
            c.put_px(x, y, R['blue'][1]); c.put_px(x, y + 1, R['blue'][1])
    I['game_veggie_rain'] = _icon(game_veggie_rain)

    def game_nyan_cuy(c):
        cols = [R['red'][1], R['carrot'][1], R['gold'][1], R['leaf'][1], R['blue'][1]]
        for i, col in enumerate(cols[:4]):
            for x in range(1, 8):
                _paint(c, (XX.astype(int) == x) & (YY.astype(int) == 4 + i * 2 - (1 if (x % 2) else 0)), col); _paint(c, (XX.astype(int) == x) & (YY.astype(int) == 5 + i * 2 - (1 if (x % 2) else 0)), col)
        body, u, v = E(10, 8, 4.6, 3.8)
        c.put_mat(body, MAT['orange'], shade(u, v))
        c.put_mat(E(8.5, 4.8, 1.3, 1.3)[0], MAT['rust'], 2)
        c.put_px(11, 7, EYE); c.put_px(14, 8, R['pink'][1])
        c.put_px(8, 12, R['pink'][1]); c.put_px(12, 12, R['pink'][1])
    I['game_nyan_cuy'] = _icon(game_nyan_cuy)

    def game_veggie_memory(c):
        c.put_mat(rect(1, 4, 8, 14), MAT['blue'], np.where(XX < 3, 0, np.where(XX < 6, 1, 2)))
        c.stamp(['.b.', 'b.b', '..b', '.b.', '...', '.b.'], 3, 5, {'b': R['cream'][0]}, False)
        c.put_mat(rect(8, 2, 15, 12), MAT['cream'], np.where(XX < 10, 0, 1))
        m, u, v = E(11.5, 8, 1.5, 3.4, -25)
        c.put_mat(m, MAT['carrot'], shade(u, v))
        c.put_px(12, 4, R['leaf'][1]); c.put_px(11, 4, R['leaf'][2])
    I['game_veggie_memory'] = _icon(game_veggie_memory)

    def game_hay_maze(c):
        sq = rect(1, 1, 15, 15)
        c.put_mat(sq, MAT['hay'], np.where((XX.astype(int) + YY.astype(int)) % 2 == 0, 1, 0))
        walls = rect(1, 5, 11, 6.5) | rect(5, 9, 15, 10.5) | rect(10, 5, 11.5, 10.5) | rect(1, 12, 9, 13.5)
        c.put_mat(walls & sq, MAT['wood'], 2)
        c.put_px(3, 3, R['orange'][1]); c.put_px(4, 3, R['orange'][1]); c.put_px(13, 13, R['red'][1])
    I['game_hay_maze'] = _icon(game_hay_maze)

    # --- coat swatches (circle with the main patches of the coat)
    import pig as _pig

    def coat_ramp(key, ramp_name):
        return _pig.COATS[key].get(ramp_name, _pig.RAMP[ramp_name])

    def swatch(coat_key, band=True, dark=True, eye=None):
        def draw(c):
            m, u, v = E(8, 8, 6.4, 6.4)
            lv = shade(u, v)
            orange, rust, white = coat_ramp(coat_key, 'orange'), coat_ramp(coat_key, 'rust'), R['white']
            for k in range(4):
                _paint(c, m & (lv == k), orange[k])
            if band:
                for k in range(4):
                    _paint(c, m & (np.abs(XX - 8.2) < 1.5) & (lv == k), white[k])
            if dark:
                pm = m & (E(5.2, 8.8, 2.4, 3.0)[0])
                for k in range(4):
                    _paint(c, pm & (lv == k), rust[k])
            if eye is not None:
                c.put_px(11, 6, eye)
        return draw
    I['coat_tricolor'] = _icon(swatch('tricolor'))
    I['coat_dutch'] = _icon(swatch('dutch', band=True, dark=False))
    I['coat_agouti'] = _icon(swatch('agouti', band=False, dark=True))
    I['coat_albino'] = _icon(swatch('albino', band=False, dark=False, eye=_pig.COATS['albino']['eye']))
    I['coat_cinnamon'] = _icon(swatch('cinnamon', band=True, dark=True))

    return I

def main(assets_dir):
    json_path = os.path.join(assets_dir, 'icons', 'icons.json')
    png_path = os.path.join(assets_dir, 'icons', 'icons_16.png')

    with open(json_path, 'r') as f:
        data = json.load(f)

    # order specified in the issue
    icon_order = [
        'dandelion', 'apple', 'hay_ball', 'chew_bridge', 'hammock', 'cuddle_cup',
        'vet', 'vitamin_drops', 'medicine', 'calendar', 'water_drop', 'scale', 'brush', 'nail_clipper', 'broom',
        'wallpaper', 'floor', 'rug', 'plant', 'picture_frame', 'lamp',
        'gift', 'palette', 'music_note',
        'weather_clear', 'weather_cloudy', 'weather_fog', 'weather_rain', 'weather_snow', 'weather_storm',
        'padlock', 'trophy',
        'badge_care', 'badge_play', 'badge_growth', 'badge_social',
        'soft_pellets', 'warm_house_bed', 'dental_chew', 'vitamin_mix', 'carrot_top',
        'trait_cuddly', 'trait_glutton', 'trait_explorer', 'trait_sleepyhead', 'trait_popcorning', 'trait_vocal',
        'game_veggie_rain', 'game_nyan_cuy', 'game_veggie_memory', 'game_hay_maze',
        'coat_tricolor', 'coat_dutch', 'coat_agouti', 'coat_albino', 'coat_cinnamon'
    ]

    new_icons_funcs = get_new_icons()
    img = Image.open(png_path).convert('RGBA')
    img_np = np.array(img)

    for name in icon_order:
        if name not in data['icons']:
            idx = len(data['icons'])
            data['icons'][name] = idx

            # draw icon
            icon_img = new_icons_funcs[name]

            # append to the right
            new_width = img_np.shape[1] + 16
            new_img_np = np.zeros((16, new_width, 4), dtype=np.uint8)
            new_img_np[:, :img_np.shape[1]] = img_np
            new_img_np[:, img_np.shape[1]:] = icon_img
            img_np = new_img_np

    Image.fromarray(img_np).save(png_path)
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=1)
        f.write('\n')
    print(f"Total icons now: {len(data['icons'])}")

if __name__ == '__main__':
    import sys
    assets = sys.argv[1] if len(sys.argv) > 1 else '../../assets'
    main(assets)
