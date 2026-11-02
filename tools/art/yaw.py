"""Yaw renderer: the pig as a small 3D model (super-ellipsoid body, head, muzzle, ears, feet) seen from a rotating camera,
shaded and coloured through the same Canvas/zone pipeline as the 2D poses. Used for the turn frames (0..90 degrees) so the
body gets real volume while it turns (no 'sheet of paper'). Yaw 0 = side view facing right, 90 = facing the viewer."""
import math
import numpy as np
import pig
import fur as FUR
import whorls as WH
from pig import S, FLOOR, YY, XX, MAT, STYLE, RAMP, OUT, EYE, HL, WHISK, Canvas, level, dil, body_zones, hx


def _hit(cx, cy, cz, rx, ry, rz, th, px, pe_top=2.0, pe_bot=2.0, pw=2.0):
    """Orthographic ray test of a super-ellipsoid, pivot (px) at screen centre. Returns mask, depth, model-space local point (x', y', z')
    and the unit normal in screen axes (nx, ny, nd). Screen: X right, Y down, depth towards the viewer."""
    c, s = math.cos(th), math.sin(th)
    Xp = XX - 32.0
    dx = cx - px
    # quadratic of the plain ellipsoid in depth D: x' = Xp*c + D*s - dx ; z' = -Xp*s + D*c - cz
    A = (s / rx) ** 2 + (c / rz) ** 2
    B = 2 * ((Xp * c - dx) * s / rx ** 2 + (-Xp * s - cz) * c / rz ** 2)
    Dm = -B / (2 * A)
    R = max(rx, ry, rz) * 1.7

    def f(D):
        xl = (Xp * c + D * s - dx) / rx
        zl = (-Xp * s + D * c - cz) / rz
        yl = (YY - cy) / ry
        pe = np.where(yl > 0, pe_bot, pe_top)
        return np.abs(xl) ** pe + np.abs(yl) ** pe + np.abs(zl) ** pw
    inside = f(Dm) <= 1.0
    lo = Dm.copy()
    hi = Dm + R
    for _ in range(18):
        mid = (lo + hi) / 2
        ok = f(mid) <= 1.0
        lo = np.where(ok, mid, lo)
        hi = np.where(ok, hi, mid)
    D = lo
    xl = (Xp * c + D * s - dx)
    zl = (-Xp * s + D * c - cz)
    yl = YY - cy
    # gradient of the implicit function -> normal (model), rotate to screen
    ux, uy, uz = xl / rx, yl / ry, zl / rz
    pe = np.where(uy > 0, pe_bot, pe_top)
    gx = pe * np.abs(ux) ** (pe - 1) * np.sign(ux) / rx
    gy = pe * np.abs(uy) ** (pe - 1) * np.sign(uy) / ry
    gz = pw * np.abs(uz) ** (pw - 1) * np.sign(uz) / rz
    nrm = np.sqrt(gx ** 2 + gy ** 2 + gz ** 2) + 1e-9
    gx, gy, gz = gx / nrm, gy / nrm, gz / nrm
    nxs = gx * c - gz * s
    nds = gx * s + gz * c
    return inside, D, (xl, yl, zl), (nxs, gy, nds), (ux, uy, uz)


def _shade(n):
    nx, ny, nd = n
    return -(0.42 * nx + 0.88 * ny) + 0.12 * nd - 0.05


def render_yaw(deg, breathe=0.0, eye='open', ear=0.0, nose=0, look=0.0, mouth='closed', shadow=1.0):
    th = math.radians(deg)
    c, s = math.cos(th), math.sin(th)
    kb, kh = STYLE['kb'], STYLE['kh']
    build = STYLE['build']
    brx, bry = 17.0 * kb, 10.5 * kb + breathe
    if build == 'chubby':
        brx = min(brx, 20.5)
        bry *= 1.05
    brz = 13.5 * kb * (1.12 if build == 'chubby' else 0.9 if build in ('lean', 'skinny') else 1.0)
    bx = 29.0 - (1.0 if build == 'chubby' else 0.0)
    by = FLOOR - 1.5 - bry
    hdx = 13.5 * (1.0 if build == 'chubby' else kb)
    t = min(1.0, deg / 90.0)
    hxc, hyc = bx + hdx, by - 5.0 * kb + 2.5 * t * t   # head hangs lower in front of the chest when facing us
    hrx, hry, hrz = 9.5 * kh, 8.5 * kh, 10.0 * kh
    px = bx + 4.0                                  # pivot: middle of the pig
    # the whole pig drifts so that it stays centred while the long axis turns towards the viewer
    cv = Canvas()
    ZB = np.full((S, S), -1e9)
    MATIDX = np.full((S, S), -1, int)
    LV = np.zeros((S, S), int)
    OWNER = np.full((S, S), '', dtype=object)
    NORM = np.zeros((3, S, S))
    parts = {}

    def put(name, hit, mat, lvmap=None, force_lv=None):
        inside, D, loc, n, un = hit
        take = inside & (D > ZB)
        ZB[take] = D[take]
        OWNER[take] = name
        m = mat if not callable(mat) else mat(loc, un)
        MATIDX[take] = np.broadcast_to(m, (S, S))[take]
        b = _shade(n)
        wk = STYLE['named'] if STYLE['named'] in WH.WHORLS else ('rosette' if STYLE['breed'] == 'rosette' else None)
        if name == 'body' and wk:
            b = b + 0.5 * WH.field(wk, un[0], un[1], un[2])[0]
        if name == 'body' and (STYLE['breed'] != 'smooth' or STYLE['named']):
            b = b + FUR.delta(loc[0], loc[1], loc[2], STYLE['breed'], 3 if not STYLE['named'] else 3 + len(STYLE['named']))
        lv = level(b) if force_lv is None else np.full((S, S), force_lv)
        LV[take] = lv[take]
        for k in range(3):
            NORM[k][take] = n[k][take]
        parts[name] = (take.copy(), loc, un)
        return take

    # feet (pink) -------------------------------------------------------------------------
    foot_y = FLOOR - 2.2
    for (fxo, fz) in ((-12 * kb, -7.0), (-9 * kb, 7.0), (8 * kb, -7.0), (11 * kb, 7.0)):
        h = _hit(bx + fxo, foot_y, fz * kb * (0.9 if build in ('lean', 'skinny') else 1.0), 2.4, 1.5, 2.0, th, px)
        put('foot', h, MAT['FT'])
    # body ------------------------------------------------------------------------------
    hb = _hit(bx, by, 0.0, brx, bry, brz, th, px, pe_top=2.0, pe_bot=2.5, pw=2.0)
    inside, D, loc, n, un = hb
    mb = body_zones(un[0], np.minimum(un[1], 0.5) if STYLE['breed'] == 'peruvian' else un[1], un[2])
    if STYLE['named']:
        mb = pig.named_body_mat(un[0], un[1], un[2])
    take = put('body', hb, mb)
    # head ------------------------------------------------------------------------------
    hh = _hit(hxc, hyc, 0.0, hrx, hry, hrz, th, px)
    hm = _hit(hxc + 5.5 * kh, hyc + 2.6 * kh, 0.0, 5.2 * kh, 4.6 * kh, 5.2 * kh, th, px)

    def head_mat(loc_, un_):
        xh, yh, zh = loc_[0] / kh, loc_[1] / kh, loc_[2] / kh
        return head_zone(xh, yh, zh)

    def head_zone(xh, yh, zh):
        if STYLE['named']:
            return pig.named_head_mat(xh, yh, zh)
        out = np.full((S, S), MAT['ZC'])
        out[yh < -2.6] = MAT['ZH']
        blaze = (xh > 4.2 - 0.75 * yh) & (np.abs(zh) < 5.2)
        n2 = (xh > 2.4) & (yh > 1.4) & ~blaze
        out[n2] = MAT['ZN2']
        out[blaze] = MAT['ZN1']
        if STYLE['senior']:   # grey muzzle, dithered like the 2D poses
            dith = ((XX.astype(int) + YY.astype(int)) % 2) == 0
            out[(xh > 1.0) & (yh > -2.0) & (~blaze | dith) & dith] = MAT['grey']
        return out
    # muzzle ellipsoid has its own local frame: convert to head frame
    def muz_mat(loc_, un_):
        return head_zone(loc_[0] / kh + 5.5, loc_[1] / kh + 2.6, loc_[2] / kh)
    put('head', hh, head_mat)
    put('muzzle', hm, muz_mat)
    if STYLE['breed'] == 'rosette':
        hc = _hit(hxc + 1.5 * kh, hyc - hry - 0.1 * kh, 0.0, 3.4 * kh, 2.0 * kh, 4.0 * kh, th, px)
        put('crest', hc, MAT['ZH'])
    if STYLE['breed'] == 'peruvian':
        # long hair: a skirt hanging from the flanks to the floor, and a fringe over the eyes
        top = by + bry * 0.45
        bot = FLOOR - 2.0
        hs = _hit(bx, (top + bot) / 2, 0.0, brx * 0.97, (bot - top) / 2, brz * 0.97, th, px, pe_top=2.6, pe_bot=2.6, pw=2.6)
        zs = lambda loc_, un_: body_zones(un_[0], np.full((S, S), 0.1), un_[2])
        tk = put('skirt', hs, zs)
        strand = (np.floor(XX).astype(int) % 2 == 0)
        LV[tk] = np.where(strand[tk], 1, 2)
        hem = tk & (YY > bot - 1.6)
        LV[hem] = 3
        hf = _hit(hxc + 4.5 * kh, hyc - 3.2 * kh, 0.0, 3.6 * kh, 3.4 * kh, 6.5 * kh, th, px)
        put('fringe', hf, MAT['ZH'])
    # ears --------------------------------------------------------------------------------
    for side in (-1, 1):
        ex = hxc - (4.6 - 0.6 * t) * kh
        ey = hyc - 5.9 * kh - ear
        ez = side * (7.0 + 2.6 * t) * kh
        he = _hit(ex, ey, ez, 3.8 * kh, 2.7 * kh, 1.5 * kh, th, px)
        take_e = put('ear%d' % side, he, MAT['ZC'])
        # inner pink on the face turned towards the viewer / front
        nxs, nys, nds = he[3]
        xl, yl, zl = he[2]
        pink = take_e & (np.abs(xl) < 2.4 * kh) & (np.abs(yl) < 1.5 * kh) & ((zl * side) > 0.8 * kh) & (nds > 0.05)
        MATIDX[pink] = MAT['pink']
        LV[pink] = 2
    # nose pad ----------------------------------------------------------------------------
    nose_c = (hxc + 10.4 * kh, hyc + 1.2 * kh - nose, 0.0)
    hn = _hit(nose_c[0], nose_c[1], nose_c[2], 1.5 * kh, 1.3 * kh, 2.0 * kh, th, px)
    put('nose', hn, MAT['pink'], force_lv=1)

    # compose -----------------------------------------------------------------------------
    vis = MATIDX >= 0
    headmask = np.zeros((S, S), bool)
    for nm in ('head', 'muzzle'):
        tk = parts[nm][0]
        headmask |= tk & (MATIDX >= 0) & (ZB >= -1e8)
    body_front = parts['body'][0] & ~headmask
    occl = dil(dil(headmask)) & body_front & ~headmask
    LV = np.where(occl, np.maximum(LV, 2), LV)
    cv.put_mat(vis, np.where(vis, MATIDX, 0), LV)
    # shadow
    if shadow > 0.05:
        sw = (abs(c) * (brx + 8.0) + abs(s) * brz) * 0.95 * shadow
        m = (((XX - 32.0) / max(sw, 1)) ** 2 + ((YY - FLOOR - 0.5) / 1.6) ** 2) <= 1
        cv.under[m] = pig.SHADOW

    # eyes: model point slides on the face between the side and the front placement, drawn only when facing the camera
    def proj(x, y, z):
        return 32.0 + (x - px) * c - z * s, y, (x - px) * s + z * c

    ex_m = hxc + (2.6 + 5.2 * t) * kh
    ez_m = (9.2 - 3.4 * t) * kh
    ey_m = hyc - 1.6 * kh
    pat, cm = pig_eye_patterns()[eye]
    for side in (-1, 1):
        X, Y, Dd = proj(ex_m, ey_m, side * ez_m)
        ix, iy = int(math.floor(X)), int(math.floor(Y))
        if not (0 <= ix < S and 0 <= iy < S) or not (parts['head'][0][iy, ix] or parts['muzzle'][0][iy, ix]):
            continue
        if Dd < ZB[iy, ix] - 2.4:      # behind the face surface
            continue
        face = abs(math.cos(th + side * math.radians(90 - 90 * t))) if False else 1.0
        for j, row in enumerate(pat):
            for i, chr_ in enumerate(row):
                if chr_ in cm:
                    cv.put_px(ix - 2 + i, iy - 2 + j, cm[chr_])
    # mouth under the nose
    X, Y, Dd = proj(*nose_c)
    nxp, nyp = int(round(X)), int(round(Y))
    if deg >= 50:
        cv.stamp(['.NN.', '..O.', '.O.O'], nxp - 2, nyp, {'N': RAMP['pink'][1], 'O': OUT})
    else:
        cv.stamp(['NN', 'O.'], nxp - 1, nyp, {'N': RAMP['pink'][1], 'O': OUT})
    # whiskers (over the outline, like the 2D poses)
    if deg >= 40:
        for side in (-1, 1):
            for k, (ox, oy) in enumerate(((0, 1), (1, 1), (2, 0), (0, 3), (1, 3), (2, 4))):
                xx, yy = nxp + (3 if side == 1 else -2) + side * ox, nyp + oy - 1
                if 0 <= xx < S and 0 <= yy < S:
                    cv.over[yy, xx] = WHISK
    else:
        for (ox, oy) in ((2, -1), (3, -1), (4, -2), (2, 1), (3, 1), (4, 2)):
            xx, yy = nxp + ox, nyp + oy
            if 0 <= xx < S and 0 <= yy < S:
                cv.over[yy, xx] = WHISK
    return cv.finish()


def pig_eye_patterns():
    E, H = pig.eyec(), HL
    return {
        'open': (['.EE.', 'EEHE', 'EEEE', '.EE.'], {'E': E, 'H': H}),
        'wide': (['.EE.', 'EHHE', 'EHEE', 'EEEE', '.EE.'], {'E': E, 'H': H}),
        'half': (['....', 'OOOO', 'EEHE', '.EE.'], {'E': E, 'H': H, 'O': OUT}),
        'closed': (['....', '....', 'OOOO', '....'], {'O': OUT}),
        'happy': (['....', '.OO.', 'O..O', '....'], {'O': OUT}),
    }
