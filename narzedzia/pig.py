"""Proceduralny renderer pixel-artowej świnki morskiej.
Każda klatka = słownik parametrów pozy -> obraz RGBA 64x64.
"""
import math
import numpy as np

S = 64          # rozmiar klatki
FLOOR = 59      # linia podłogi (dolny wiersz konturu stóp)

def hx(c):
    c = c.lstrip('#')
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)] + [255], np.uint8)

RAMP = {
    'orange': [hx('f7b46e'), hx('e98c42'), hx('c8692f'), hx('984721')],
    'white':  [hx('fffdf8'), hx('f8eddd'), hx('e4cfb5'), hx('c7aa8a')],
    'rust':   [hx('dc7445'), hx('bb552e'), hx('923c21'), hx('6c2a17')],
    'pink':   [hx('ffcfca'), hx('f5a3a2'), hx('d97f87'), hx('ad5c68')],
    'hay':    [hx('eedb7c'), hx('cdb556'), hx('99903d'), hx('6f7a34')],
    'leaf':   [hx('b6e07a'), hx('7fbf4a'), hx('4f8f35'), hx('2f5f2a')],
    'grey':   [hx('f4f1ec'), hx('dcd6cd'), hx('b8b0a5'), hx('8c8479')],
    'wood':   [hx('e6b073'), hx('c98d50'), hx('9c6636'), hx('6e4424')],
    'blue':   [hx('c4e6ff'), hx('7fbaf0'), hx('4a84c4'), hx('2c5490')],
    'fabric': [hx('ffc0d6'), hx('f08cb2'), hx('c4628c'), hx('86395e')],
    'red':    [hx('ff9a8a'), hx('e8564c'), hx('b43a36'), hx('7a2422')],
    'cream':  [hx('fffaf0'), hx('f6ead2'), hx('e2cfa8'), hx('bda67c')],
    'gold':   [hx('fff2a8'), hx('f2c94c'), hx('c99a2e'), hx('8a6418')],
    'carrot': [hx('ffb86b'), hx('f28a2e'), hx('c9641e'), hx('8f4214')],
}
COATS = {
    'ruda': {},
    'czarno-biala': {'orange': [hx('6a6a78'), hx('44444f'), hx('2e2e37'), hx('1c1c22')],
                     'rust':   [hx('55555f'), hx('3a3a43'), hx('282830'), hx('18181d')]},
    'agouti': {'orange': [hx('c4ab84'), hx('9a8260'), hx('745f44'), hx('4e3f2c')],
               'rust':   [hx('94775a'), hx('745a40'), hx('56422e'), hx('382a1c')]},
    'kremowa': {'orange': [hx('fff3d6'), hx('f8dfb2'), hx('e6c48e'), hx('c49e66')],
                'rust':   [hx('f4cc98'), hx('e2ae74'), hx('c28c54'), hx('966a42')]},
}
STYLE = dict(kb=1.0, kh=1.0, coat='ruda', senior=False, gold=False)

def set_style(age='adult', coat='ruda'):
    STYLE.update(kb=1.0, kh=1.0, coat=coat, senior=False, gold=False)
    if age == 'baby':
        STYLE.update(kb=0.78, kh=0.88)
    elif age == 'senior':
        STYLE.update(senior=True)
    elif age == 'legend':
        STYLE.update(senior=True, gold=True)

def ramp(name):
    return COATS.get(STYLE['coat'], {}).get(name, RAMP[name])
OUT = hx('3a1d17')
EYE = hx('2b1712')
HL = hx('ffffff')
MOUTH = hx('7a2c2c')
TOOTH = hx('fffaf0')
WHISK = np.array([255, 246, 232, 190], np.uint8)
SHADOW = np.array([70, 45, 30, 70], np.uint8)
MATN = ['orange', 'white', 'rust', 'pink', 'grey', 'wood', 'blue', 'fabric', 'red', 'cream', 'gold', 'hay', 'leaf', 'carrot']
MAT = {n: i for i, n in enumerate(MATN)}

YY, XX = np.mgrid[0:S, 0:S].astype(float)
XX += 0.5
YY += 0.5


def dil(m):
    o = m.copy()
    o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    return o


def level(b):
    return np.where(b > 0.6, 0, np.where(b > -0.3, 1, np.where(b > -0.78, 2, 3)))


class Canvas:
    def __init__(self):
        self.pig = np.zeros((S, S, 4), np.uint8)
        self.fill = np.zeros((S, S), bool)
        self.mat = np.full((S, S), -1, int)
        self.lvl = np.zeros((S, S), int)
        self.under = np.zeros((S, S, 4), np.uint8)   # cień
        self.fx = []                                 # (pattern, x, y, colmap) po konturze
        self.over = np.zeros((S, S, 4), np.uint8)    # wąsy itd. bez konturu

    def put_mat(self, mask, mat, lvl):
        """mat: int array or scalar, lvl: int array or scalar"""
        mat = np.broadcast_to(mat, mask.shape)
        lvl = np.broadcast_to(lvl, mask.shape)
        self.mat[mask] = mat[mask]
        self.lvl[mask] = lvl[mask]
        self.fill |= mask

    def put_px(self, x, y, col, outline=True):
        if 0 <= x < S and 0 <= y < S:
            self.mat[y, x] = -2
            self.pig[y, x] = col
            if outline:
                self.fill[y, x] = True

    def stamp(self, pat, x, y, cmap, outline=True):
        for j, row in enumerate(pat):
            for i, ch in enumerate(row):
                if ch in cmap:
                    self.put_px(x + i, y + j, cmap[ch], outline)

    def finish(self, shift=0, outline=None):
        img = np.zeros((S, S, 4), np.uint8)
        # cień pod spodem
        img[:] = self.under
        # materiały
        for mi, mn in enumerate(MATN):
            for lv in range(4):
                m = (self.mat == mi) & (self.lvl == lv)
                img[m] = ramp(mn)[lv]
        m = self.mat == -2
        img[m] = self.pig[m]
        ol = dil(self.fill) & ~self.fill
        img[ol] = outline if outline is not None else (RAMP['gold'][2] if STYLE['gold'] else OUT)
        # wąsy / nakładki bez konturu
        a = self.over[:, :, 3] > 0
        wm = a & ((img[:, :, 3] == 0) | (img[:, :, 3] < 255))
        img[wm] = self.over[wm]
        if shift:
            img = np.roll(img, shift, axis=0)
            if shift > 0: img[:shift] = 0
            else: img[shift:] = 0
            self.fill = np.roll(self.fill, shift, axis=0)
        # efekty z własnym konturem
        for pat, x, y, cmap in self.fx:
            fm = np.zeros((S, S), bool)
            tmp = {}
            for j, row in enumerate(pat):
                for i, ch in enumerate(row):
                    if ch in cmap and 0 <= x + i < S and 0 <= y + j < S:
                        fm[y + j, x + i] = True
                        tmp[(x + i, y + j)] = cmap[ch]
            if cmap.get('_o', OUT) is not False:
                fo = dil(fm) & ~fm & ~self.fill
                img[fo] = cmap.get('_o', OUT)
            for (px, py), c in tmp.items():
                img[py, px] = c
        return img


# --------------------------------------------------------------------------- pozy z boku
DEF = dict(
    bx=29.0, brx=17.0, bry=10.5, lift=0.0,       # tułów; lift = wysokość nad podłogą
    rot=0.0, sx=1.0, sy=1.0, tx=0.0, ty=0.0,     # transformacja całości
    hdx=13.5, hdy=-5.0, hrx=9.5, hry=8.5,         # głowa względem tułowia
    ear=0.0, ear_back=0.0,                        # uniesienie / położenie ucha
    eye='open', mouth='closed', nose=0,           # mimika
    feet=None,                                    # przesunięcia stóp [(dx,dy)]*4  (tył-daleko, tył-blisko, przód-daleko, przód-blisko)
    legs=0,                                       # wysunięte nogi (złapana / spadanie)
    paws=None,                                    # uniesione przednie łapki (x,y) względem nosa
    feet_hidden=0,                                # 0..2 chowanie stóp pod tułów (leżenie)
    blush=False, shadow=1.0, whisk=0,
    hay=None, fx=(), _head=False, piv=0.0, hat=False, fluff=False, back_out=False, arms=None, scratch=None,
)


def render_side(**kw):
    p = dict(DEF)
    p.update(kw)
    c = Canvas()
    kb, kh = STYLE['kb'], STYLE['kh']
    bx, brx, bry = p['bx'], p['brx'] * kb, p['bry'] * kb
    by = FLOOR - 1.5 - bry - p['lift']
    hxc, hyc = bx + p['hdx'] * kb, by + p['hdy'] * kb
    hrx, hry = p['hrx'] * kh, p['hry'] * kh
    pivx, pivy = bx + p['piv'] * kb, FLOOR - 1.0 - p['lift']
    a = math.radians(p['rot'])
    ca, sa = math.cos(a), math.sin(a)
    sx, sy, tx, ty = p['sx'], p['sy'], p['tx'], p['ty']

    # odwrotna transformacja pikseli ekranu -> lokalne
    dx = XX - tx - pivx
    dy = YY - ty - pivy
    lx = (dx * ca + dy * sa) / sx + pivx
    ly = (-dx * sa + dy * ca) / sy + pivy

    def fwd(x, y):
        ddx, ddy = (x - pivx) * sx, (y - pivy) * sy
        return (int(math.floor(pivx + ddx * ca - ddy * sa + tx)),
                int(math.floor(pivy + ddx * sa + ddy * ca + ty)))

    def ell(cx, cy, rx, ry, rot=0.0, pw=2.0):
        ux, uy = lx - cx, ly - cy
        if rot:
            r = math.radians(rot)
            ux, uy = ux * math.cos(r) + uy * math.sin(r), -ux * math.sin(r) + uy * math.cos(r)
        return (np.abs(ux / rx) ** pw + np.abs(uy / ry) ** pw) <= 1.0

    def capsule(x0, y0, x1, y1, r):
        vx, vy = x1 - x0, y1 - y0
        L2 = vx * vx + vy * vy or 1e-6
        t = np.clip(((lx - x0) * vx + (ly - y0) * vy) / L2, 0, 1)
        return (lx - x0 - t * vx) ** 2 + (ly - y0 - t * vy) ** 2 <= r * r

    # cień
    sh_w = brx * 0.95 * p['shadow']
    if p['shadow'] > 0.05:
        m = (((XX - bx - tx * 0.3) / max(sh_w, 1)) ** 2 + ((YY - FLOOR - 0.5) / 1.6) ** 2) <= 1
        c.under[m] = SHADOW

    # stopy
    feet = p['feet'] or [(0, 0)] * 4
    base = [(-12 * kb, 0), (-9 * kb, 0), (8 * kb, 0), (11 * kb, 0)]
    fbot = FLOOR - 1 - p['lift']
    foot_pat = ['PP.', 'PPP']

    def draw_foot(i, far):
        if p['feet_hidden'] >= 2:
            return
        fx0 = bx + base[i][0] + feet[i][0]
        fy0 = fbot - 1 + feet[i][1] - p['feet_hidden']
        if p['legs']:
            top = by + bry - 3
            leg = capsule(fx0 + 1.0, top, fx0 + 1.2, fy0 + 0.5, 1.35)
            c.put_mat(leg, MAT['orange'], 2 if far else 1)
        X, Y = fwd(fx0 + 0.5, fy0 + 0.5)
        col = RAMP['pink'][2 if far else 1]
        toe = RAMP['pink'][3 if far else 2]
        c.stamp(foot_pat, X, Y, {'P': col})
        c.put_px(X + 2, Y + 1, toe)

    draw_foot(0, True)
    draw_foot(2, True)

    # tułów
    u = (lx - bx) / brx
    v = (ly - by) / bry
    pw = np.where(v > 0, 2.7, 2.0)
    body = (np.abs(u) ** pw + np.abs(v) ** pw) <= 1.0
    if p['fluff']:
        tuft = dil(body) & ~body & (v < 0.3) & (((XX + 2 * YY).astype(int) % 4) == 0)
        body = body | tuft
    b = -(0.42 * u + 0.88 * v)
    mat = np.full((S, S), MAT['orange'])
    band = (np.abs(u - 0.08) < 0.16)
    belly = (v > 0.55) & (u > -0.45)
    chest = (u > 0.5) & (v > -0.1)
    rump = ((u + 0.78) ** 2 / 0.09 + (v + 0.25) ** 2 / 0.3) < 1
    mat[band | belly | chest] = MAT['white']
    mat[rump & ~band] = MAT['rust']

    # głowa (czaszka + pyszczek)
    head = ell(hxc, hyc, hrx, hry) | ell(hxc + 5.5 * kh, hyc + 2.6 * kh, 5.0 * kh, 4.6 * kh)
    hu = (lx - hxc) / hrx
    hv = (ly - hyc) / hry
    hb = -(0.42 * hu + 0.88 * hv) + 0.1
    hmat = np.full((S, S), MAT['orange'])
    blaze = (lx - hxc) / kh > (4.2 - 0.75 * (ly - hyc) / kh)
    hmat[blaze] = MAT['white']
    if STYLE['senior']:
        dith = ((XX.astype(int) + YY.astype(int)) % 2) == 0
        grey = ((lx - hxc) / kh > 2.0) & ((ly - hyc) / kh > -1.0) & ~blaze & dith
        brow = ell(hxc + 1.6 * kh, hyc - 5.2 * kh, 2.2 * kh, 0.9 * kh) & dith
        hmat[grey | brow] = MAT['grey']

    lv = level(b)
    occl = dil(dil(head)) & body & ~head
    lv = np.where(occl, np.maximum(lv, 2), lv)
    c.put_mat(body, mat, lv)

    # dalekie ucho (za głową)
    ey = hyc - hry + 2.6 * kh - p['ear']
    exx = hxc - 4.6 * kh - p['ear_back']
    far_ear = ell(exx + 4.2 * kh, ey - 1.6 * kh, 2.8 * kh, 2.0 * kh, -15)
    c.put_mat(far_ear & ~head, MAT['rust'], 2)

    # głowa
    hl = level(hb)
    body_only = body & ~head
    left_nb = np.zeros_like(body_only); left_nb[:, 1:] = body_only[:, :-1]
    low_nb = np.zeros_like(body_only); low_nb[:-1] = body_only[1:]
    jowl = head & (left_nb | low_nb) & (ly > hyc - 1)
    hl = np.where(jowl, 3, hl)
    c.put_mat(head, hmat, hl)

    # bliskie ucho z obwódką
    ear = ell(exx, ey, 4.0 * kh, 2.6 * kh, 18)
    inner = ell(exx + 0.9 * kh, ey - 0.5 * kh, 2.2 * kh, 1.0 * kh, 18)
    rim = dil(ear) & ~ear & head
    c.put_mat(rim, MAT['rust'], 3)
    ev = (ly - ey) / 2.5
    c.put_mat(ear, MAT['rust'], level(-ev * 0.9))
    c.put_mat(inner & ear, MAT['pink'], 2)

    # rumieniec
    if p['blush']:
        X, Y = fwd(hxc + 3.5 * kh, hyc + 3.5 * kh)
        c.stamp(['BB'], X, Y, {'B': RAMP['pink'][1]})

    # oko
    EX, EY = fwd(hxc + 0.6 * kh, hyc - 3.0 * kh)
    eyes = {
        'open':   (['.EE.', 'EEHE', 'EEEE', '.EE.'], {'E': EYE, 'H': HL}),
        'look':   (['HEE', 'EEE', 'EEE'], {'E': EYE, 'H': HL}),
        'wide':   (['.EE.', 'EHHE', 'EHEE', 'EEEE', '.EE.'], {'E': EYE, 'H': HL}),
        'half':   (['....', 'OOOO', 'EEHE', '.EE.'], {'E': EYE, 'H': HL, 'O': OUT}),
        'closed': (['....', '....', 'OOOO', '....'], {'O': OUT}),
        'happy':  (['....', '.OO.', 'O..O', '....'], {'O': OUT}),
        'squeeze': (['O..', '.OO', 'O..'], {'O': OUT}),
        'sad':    (['....', 'OO..', 'EEHE', '.EE.'], {'E': EYE, 'H': HL, 'O': OUT}),
        'none':   ([], {}),
    }
    pat, cm = eyes[p['eye']]
    if p['eye'] == 'wide':
        EY -= 1
    c.stamp(pat, EX, EY, cm)

    # nos i pyszczek
    NX, NY = fwd(hxc + 9.2 * kh, hyc + 0.6 * kh - p['nose'])
    mouths = {
        'closed': ['NN', 'O.'],
        'chew':   ['NN', '.O', 'O.'],
        'chew2':  ['NN', 'OO'],
        'open':   ['NN', 'OO', 'MM', '.O'],
        'yawn':   ['NN', 'TT', 'MM', 'MM', 'OO'],
        'teeth':  ['NN', 'TT', 'OO'],
        'small':  ['NN', 'MO'],
    }
    c.stamp(mouths[p['mouth']], NX, NY, {'N': RAMP['pink'][1], 'O': OUT, 'M': MOUTH, 'T': TOOTH})

    # uniesione łapki
    if p['paws']:
        for k, (pdx, pdy) in enumerate(p['paws']):
            sx0, sy0 = hxc + 3.5 * kh - k * 1.5, hyc + 7.0 * kh
            px1, py1 = hxc + 9.2 * kh + pdx, hyc + 0.6 * kh + pdy
            arm = capsule(sx0, sy0, px1 - 0.6, py1 + 0.4, 1.5)
            c.put_mat(arm, MAT['orange'] if not STYLE['senior'] else MAT['orange'], 1 + k)
            paw = ell(px1, py1, 1.6, 1.3)
            c.put_mat(paw, MAT['pink'], 1 + k)
    if p['arms']:   # przednie łapki przy piersi (stanie na tylnych łapkach)
        for k, (ax, ay) in enumerate(p['arms']):
            sx0, sy0 = bx + brx * 0.55 - k * 2, by + 1
            arm = capsule(sx0, sy0, sx0 + ax, sy0 + ay, 1.4)
            c.put_mat(arm, MAT['orange'], 1 + k)
            c.put_mat(ell(sx0 + ax + 0.4, sy0 + ay + 0.6, 1.5, 1.2), MAT['pink'], 1 + k)

    if p['back_out']:   # tylne łapki wyciągnięte do tyłu (upał), przyczepione do tułowia
        for k in (1, 0):
            hipx, hipy = bx - brx * 0.62, by + bry * 0.55 - k * 0.8
            fx1, fy1 = bx - brx - 4.5 + k * 1.5, FLOOR - 2.0 - p['lift'] - k * 0.5
            c.put_mat(capsule(hipx, hipy, fx1 + 1.2, fy1, 1.6), MAT['orange'], 2 if k else 1)
            c.put_mat(ell(fx1, fy1, 1.8, 1.1), MAT['pink'], 2 if k else 1)
    if p['scratch'] is not None:   # tylna łapka drapie za uchem
        sdx, sdy = p['scratch']
        hipx, hipy = bx - brx * 0.3, by + bry * 0.45
        kx, ky = bx - brx * 0.05, by - bry * 0.05          # kolano
        fx1, fy1 = exx - 1.0 * kh + sdx, ey + 3.2 * kh + sdy
        thigh = ell(hipx, hipy, 5.0 * kb, 4.0 * kb)
        shin = capsule(hipx, hipy, kx, ky, 2.0) | capsule(kx, ky, fx1 - 0.5, fy1 + 0.8, 1.6)
        foot = ell(fx1, fy1, 2.2, 1.4, -40)
        leg = thigh | shin | foot
        rim = dil(leg) & ~leg & c.fill
        c.put_mat(rim, MAT['orange'], 3)
        tu, tv = (lx - hipx) / 5.0, (ly - hipy) / 4.0
        c.put_mat(thigh | shin, MAT['orange'], np.where(level(-(0.42 * tu + 0.88 * tv)) == 0, 0, 1))
        c.put_mat(foot, MAT['pink'], 1)
        X, Y = fwd(fx1 + 1, fy1)
        c.put_px(X, Y, RAMP['pink'][3])
    if p['hat']:
        X, Y = fwd(hxc - 0.5 * kh, hyc - hry - 6.0)
        c.stamp(['...Y...', '..YYY..', '...R...', '..RRR..', '..BBB..', '.RRRRR.', 'BBBBBBB'], X - 3, Y,
                {'Y': hx('ffe066'), 'R': hx('ff6b8a'), 'B': hx('6aa8ff')})

    # bliskie stopy
    if p['scratch'] is None:
        draw_foot(1, False)
    draw_foot(3, False)

    # siano / jedzenie w pyszczku
    if p['hay']:
        kind, L = p['hay']
        X, Y = fwd(hxc + 9.5 * kh, hyc + 3.0 * kh)
        ramp = RAMP['leaf'] if kind == 'leaf' else RAMP['hay']
        if kind == 'hay':
            n = int(L)
            for i in range(n):
                yy = Y + 1 + i
                if yy > FLOOR - 1: break
                c.put_px(X + 1 + (i + 1) // 2, yy, ramp[1 if i % 3 else 2])
            for k in range(-3, 6):
                if (k * 7) % 3 != 1:
                    c.put_px(X + 2 + k, FLOOR - 1, ramp[(k + 9) % 3])
        else:
            c.stamp(['GGg', 'GGGg', 'gGG'][:3], X + 1, Y, {'G': ramp[1], 'g': ramp[2]})

    # wąsy
    if p['whisk'] >= 0:
        WX, WY = fwd(hxc + 10.5 * kh, hyc + 2.0 * kh)
        w = p['whisk']
        for (ox, oy) in [(1, -1 - w), (2, -1 - w), (3, -2 - w), (1, 1), (2, 1 + w), (3, 2 + w)]:
            X, Y = WX + ox, WY + oy
            if 0 <= X < S and 0 <= Y < S:
                c.over[Y, X] = WHISK

    for f in p['fx']:
        c.fx.append(f)
    img = c.finish()
    if p.get('_head'):
        return img, (hxc, hyc, NX, NY)
    return img


# --------------------------------------------------------------------------- widok z przodu
FDEF = dict(cy=0.0, breathe=0.0, look=(0, 0), eye='open', ear=0, nose=0, mouth='closed',
            body=True, paws_edge=False, clip=None, tilt=0, fx=(), blush=False, shadow=1.0, back=False, sx=1.0)


def render_front(**kw):
    p = dict(FDEF)
    p.update(kw)
    c = Canvas()
    cx = 32.0
    oy = 0
    lkx, lky = p['look']
    tilt = math.radians(p['tilt'])
    kb, kh = STYLE['kb'], STYLE['kh']
    lx = ((XX - cx) * math.cos(tilt) + (YY - 44 - oy) * math.sin(tilt)) / p['sx'] + cx
    ly = -(XX - cx) * math.sin(tilt) + (YY - 44 - oy) * math.cos(tilt) + 44

    def ell(x0, y0, rx, ry, rot=0.0):
        ux, uy = lx - x0, ly - y0
        if rot:
            r = math.radians(rot)
            ux, uy = ux * math.cos(r) + uy * math.sin(r), -ux * math.sin(r) + uy * math.cos(r)
        return (ux / rx) ** 2 + (uy / ry) ** 2 <= 1

    if p['body'] and p['shadow'] > 0:
        m = ((XX - cx) / (15 * kb * p['sx'])) ** 2 + ((YY - FLOOR - 0.5) / 1.6) ** 2 <= 1
        c.under[m] = SHADOW

    hxc, hyc = cx + lkx * 0.7, (FLOOR - 1.5 - 11 * kb) - 7 * kb + lky * 0.5
    # tułów
    if p['body']:
        bry = 11 * kb + p['breathe']
        byc = FLOOR - 1.5 - bry
        u = (lx - cx) / (14.5 * kb)
        v = (ly - byc) / bry
        body = u ** 2 + v ** 2 <= 1
        b = -(0.35 * u + 0.9 * v)
        mat = np.where((np.abs(lx - cx) < 6.5 * kb) & (ly > byc - 2) & (not p['back']), MAT['white'], MAT['orange'])
        if p['back']:
            mat = np.where(((lx - cx) ** 2 / 30 + (ly - byc + 2) ** 2 / 40) < 1, MAT['rust'], mat)
        c.put_mat(body, mat, level(b))
        for fx0 in (cx - 7 * kb * p['sx'], cx + (4 * kb) * p['sx']):
            c.stamp(['PPP', 'PPP'], int(fx0), FLOOR - 2 + int(oy), {'P': RAMP['pink'][1]})
            c.put_px(int(fx0) + 1, FLOOR - 1 + int(oy), RAMP['pink'][2])

    # uszy (za głową)
    for side in (-1, 1):
        ex, ey = hxc + side * 10.0 * kh, hyc - 6.5 * kh - p['ear'] * (1 if side == 1 else 0.5)
        ear = ell(ex, ey, 3.8 * kh, 2.7 * kh, side * 28)
        inner = ell(ex - side * 0.3, ey + 0.4, 2.1 * kh, 1.4 * kh, side * 28)
        c.put_mat(ear, MAT['rust'], level(-(ly - ey) / 2.7))
        if not p['back']:
            c.put_mat(inner & ear, MAT['pink'], 2)

    head = ell(hxc, hyc, 11.0 * kh, 9.3 * kh)
    hu = (lx - hxc) / (11 * kh)
    hv = (ly - hyc) / (9.3 * kh)
    hb = -(0.35 * hu + 0.9 * hv) + 0.15
    blaze = np.abs(lx - hxc - lkx * 0.3) < (1.2 + np.maximum(ly - (hyc - 9 * kh), 0) * 0.28)
    muzzle = ell(hxc + lkx * 0.4, hyc + 5.0 * kh, 5.6 * kh, 3.6 * kh)
    hmat = np.where(blaze | muzzle, MAT['white'], MAT['orange'])
    if STYLE['senior'] and not p['back']:
        dith = ((XX.astype(int) + YY.astype(int)) % 2) == 0
        ring = ell(hxc + lkx * 0.4, hyc + 4.6 * kh, 7.0 * kh, 4.6 * kh) & ~muzzle & ~blaze & dith
        brows = (ell(hxc - 5.6 * kh, hyc - 6.2 * kh, 2.4, 1.0) | ell(hxc + 5.6 * kh, hyc - 6.2 * kh, 2.4, 1.0)) & dith
        hmat = np.where(ring | brows, MAT['grey'], hmat)
    if p['back']:
        hmat = np.full((S, S), MAT['orange'])
    hl = level(hb)
    c.put_mat(head, hmat, hl)
    if p['back']:
        for f in p['fx']:
            c.fx.append(f)
        return c.finish(shift=int(p['cy']))

    # oczy
    eyes = {
        'open':   (['.EE.', 'EEHE', 'EEEE', '.EE.'], {'E': EYE, 'H': HL}),
        'half':   (['....', 'OOOO', 'EEHE', '.EE.'], {'E': EYE, 'H': HL, 'O': OUT}),
        'closed': (['....', '....', 'OOOO', '....'], {'O': OUT}),
        'happy':  (['....', '.OO.', 'O..O', '....'], {'O': OUT}),
        'wide':   (['.EE.', 'EHHE', 'EHEE', 'EEEE', '.EE.'], {'E': EYE, 'H': HL}),
    }
    pat, cm = eyes[p['eye']]
    for side in (-1, 1):
        ex = int(round(hxc + side * 5.6 * kh - 2 + lkx * 0.6))
        ey = int(round(hyc - 4 * kh + lky * 0.6))
        if p['eye'] == 'wide':
            ey -= 1
        pp = pat if side == 1 else [r[::-1] for r in pat]
        c.stamp(pp, ex, ey, cm)
        if p['blush']:
            c.stamp(['BB'], int(round(hxc + side * 6.5 * kh - 1)), int(round(hyc + 2.5 * kh)), {'B': RAMP['pink'][1]})
    nx = int(round(hxc - 1 + lkx * 0.8))
    ny = int(round(hyc + 2.5 * kh + lky * 0.6 - p['nose']))
    mouths = {
        'closed': ['.NN.', '..O.', '.O.O'],
        'chew':   ['.NN.', '.O..', 'O.O.'],
        'open':   ['.NN.', '.OO.', '.MM.', '..O.'],
    }
    c.stamp(mouths[p['mouth']], nx - 1, ny, {'N': RAMP['pink'][1], 'O': OUT, 'M': MOUTH})
    # wąsy
    for side in (-1, 1):
        bxw = nx + (4 if side == 1 else -3)
        for k, (ox, oy) in enumerate([(0, 1), (1, 1), (2, 0), (0, 3), (1, 3), (2, 4)]):
            X, Y = bxw + side * ox, ny + oy
            if 0 <= X < S and 0 <= Y < S:
                c.over[Y, X] = WHISK
    for f in p['fx']:
        c.fx.append(f)
    if p['paws_edge']:
        for fx0 in (int(cx) - 9, int(cx) + 5):
            c.fx.append((['.PP.', 'PPPP'], fx0, S - 3, {'P': RAMP['pink'][1], '_o': OUT}))
    img = c.finish(shift=int(p['cy']))
    if p['clip'] is not None:
        img[p['clip']:] = 0
    return img
