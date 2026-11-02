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
    'tricolor': {'rust':   [hx('4b3f45'), hx('35292f'), hx('251c22'), hx('170f14')]},
    'dutch': {'orange': [hx('94603f'), hx('774a30'), hx('5c3724'), hx('412517')],
              'rust':   [hx('6c3a26'), hx('552c1c'), hx('401f14'), hx('2b140c')]},
    'albino': {'orange': [hx('fdf6ea'), hx('f1e3cc'), hx('dcc9ab'), hx('bba88a')],
               'rust':   [hx('ffeae0'), hx('f4d4c8'), hx('deb2a8'), hx('bf8e88')],
               'eye': hx('c2283a')},
    'cinnamon': {'orange': [hx('d58a52'), hx('b86d3e'), hx('94532f'), hx('6c3a22')],
                 'rust':   [hx('a65634'), hx('85412a'), hx('672f1e'), hx('481f14')]},
    'kremowa': {'orange': [hx('fff3d6'), hx('f8dfb2'), hx('e6c48e'), hx('c49e66')],
                'rust':   [hx('f4cc98'), hx('e2ae74'), hx('c28c54'), hx('966a42')]},
}
import patterns as PT
import coatgen as CG
import fur as FUR
import whorls as WH
STYLE = dict(kb=1.0, kh=1.0, kx=1.0, coat='ruda', senior=False, gold=False, breed='smooth', build='normal',
             pattern=PT.DEFAULT_PATTERN, palette=PT.DEFAULT_PALETTE, master=True, named=None)

# head profile per breed: (head width, muzzle offset, muzzle depth radius, muzzle width), shared by the side, yaw and front renderers
HEADS = {'smooth': (1.0, 1.0, 1.0, 1.0), 'teddy': (1.06, 0.82, 0.85, 1.12), 'rosette': (0.98, 1.04, 1.0, 0.92), 'peruvian': (0.95, 1.14, 1.05, 0.90)}
def head_prof():
    return HEADS.get(STYLE['breed'], HEADS['smooth'])

def set_style(age='adult', coat='ruda', breed='smooth', build='normal', pattern=None, palette=None, master=None, named=None):
    """breed: smooth/teddy/rosette/peruvian (legacy 'chubby'/'skinny' are builds). master=True renders the zone-coded sheet."""
    if breed in ('chubby', 'skinny'):
        build, breed = breed, 'smooth'
    if named:
        master = False
    if master is None:
        master = pattern is None and palette is None
    STYLE.update(kb=1.0, kh=1.0, kx=1.0, coat=coat, senior=False, gold=False, breed=breed, build=build,
                 pattern=pattern or PT.DEFAULT_PATTERN, palette=palette or PT.DEFAULT_PALETTE, master=master, named=named)
    if age == 'baby':
        STYLE.update(kb=0.78, kh=0.88)
    elif age == 'junior':
        STYLE.update(kb=0.9, kh=0.94)
    elif age == 'senior':
        STYLE.update(senior=True)
    elif age == 'legend':
        STYLE.update(gold=True)      # peak look (adult colours and body) + gold outline, sparkles are added in sheets.render
    if build == 'chubby':
        STYLE.update(kb=STYLE['kb'] * 1.07, kh=STYLE['kh'] * 1.05)   # plus 5% extra body height in render_side
    elif build == 'lean':
        STYLE.update(kb=STYLE['kb'] * 0.9, kh=STYLE['kh'] * 0.97, kx=1.09)   # long and slim
    elif build == 'skinny':
        STYLE.update(kb=STYLE['kb'] * 0.92, kh=STYLE['kh'] * 0.96)

def eyec():
    if STYLE['named']:
        return hx(CG.EYES[STYLE['named']])
    if STYLE['master']:
        return EYE
    e = PT.PALETTES[STYLE['palette']].get('eye')
    return np.array(list(e) + [255], np.uint8) if e is not None else EYE


def ramp(name):
    if name in ZMAT:
        return None
    return RAMP[name]


def zone_col(zname, lv, tick=False):
    """Colour (RGBA) of zone `zname` at shade `lv` for the current style (master code colours or the real coat)."""
    if STYLE['master']:
        c = PT.master_colour(zname, lv, tick)
    else:
        c = PT.zone_ramp(STYLE['pattern'], STYLE['palette'], zname, STYLE['senior'], tick)[lv]
    return np.array(list(c) + [255], np.uint8)
OUT = hx('3a1d17')
EYE = hx('2b1712')
HL = hx('ffffff')
MOUTH = hx('7a2c2c')
TOOTH = hx('fffaf0')
WHISK = np.array([255, 246, 232, 190], np.uint8)
WHISK_OLD = np.array([255, 255, 255, 255], np.uint8)
SHADOW = np.array([70, 45, 30, 70], np.uint8)
ZMAT = ['Z' + z for z in PT.ZONES]
MATN = ['orange', 'white', 'rust', 'pink', 'grey', 'wood', 'blue', 'fabric', 'red', 'cream', 'gold', 'hay', 'leaf', 'carrot', 'FT'] + ZMAT
QMAT = ['Q0', 'Q1', 'Q2', 'Q3']
MATN = MATN + QMAT
MAT = {n: i for i, n in enumerate(MATN)}
QIDX = np.array([MAT[q] for q in QMAT])


def named_col(slot, lv):
    r = CG.RAMPS[STYLE['named']][slot]
    if STYLE['senior']:
        r = PT.fade_ramp(r)
    return np.array(list(r[lv]) + [255], np.uint8)


def named_body_mat(u, v, w=None):
    """Material indices of the named pig's coat at body-model coordinates (w = visible-side depth when None)."""
    if w is None:
        w = np.sqrt(np.clip(1 - u * u - v * v, 0, 1))
    return QIDX[CG.body_slots(STYLE['named'], u, v, w)]


def FR(i):
    """Foot / paw ramp: pink, except pigs with dark feet (coatgen.FEET)."""
    f = CG.FEET.get(STYLE['named']) if STYLE['named'] else None
    return np.array(list(f[i]) + [255], np.uint8) if f is not None else RAMP['pink'][i]


def named_head_mat(xh, yh, zh):
    return QIDX[CG.head_slots(STYLE['named'], xh, yh, zh)]

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
        self.hash = (np.arange(S)[None, :] * 7 + np.arange(S)[:, None] * 13) % 11   # speckle source (renderers set local coords)

    def zpx(self, x, y, zone, lv):
        if 0 <= x < S and 0 <= y < S:
            self.mat[y, x] = MAT['Z' + zone]
            self.lvl[y, x] = lv
            self.fill[y, x] = True

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
                if mn == 'FT':
                    if m.any():
                        img[m] = FR(lv)
                elif mn in QMAT:
                    if m.any():
                        img[m] = named_col(int(mn[1]), lv)
                elif mn in ZMAT and STYLE['named']:
                    img[m] = named_col(CG.NZ[STYLE['named']][mn], lv)
                elif mn in ZMAT:
                    z = mn[1:]
                    img[m] = zone_col(z, lv)
                    if lv < 3:
                        tk = m & (self.hash == 0)
                        img[tk] = zone_col(z, lv, True)
                else:
                    img[m] = RAMP[mn][lv]
        m = self.mat == -2
        img[m] = self.pig[m]
        ol = dil(self.fill) & ~self.fill
        img[ol] = outline if outline is not None else (RAMP['gold'][2] if STYLE['gold'] else OUT)
        if STYLE['named'] and outline is None and not STYLE['gold']:
            # selective outline: the outline takes a dark version of the neighbouring fur colour (warm brown on white, near black on black)
            f = self.fill
            acc = np.zeros((S, S, 3))
            cnt = np.zeros((S, S))
            for dy_, dx_ in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                sh = np.roll(np.roll(f, dy_, 0), dx_, 1)
                col = np.roll(np.roll(img[:, :, :3].astype(float), dy_, 0), dx_, 1)
                acc += col * sh[..., None]
                cnt += sh
            mean = acc / np.maximum(cnt, 1)[..., None]
            sel = ol & (cnt > 0)
            img[sel, :3] = np.clip(0.50 * mean[sel] + 0.50 * OUT[:3].astype(float) * 0.9, 0, 255).astype(np.uint8)
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


def body_zones(u, v, w=None):
    """Zone material per pixel from body-model coordinates: u forward (-1..1), v down (-1 top..1 belly), w lateral (3D only)."""
    z = lambda n: MAT['Z' + n]
    u = np.asarray(u, float)
    v = np.asarray(v, float)
    ww = np.sqrt(np.clip(1 - u * u - v * v, 0, 1)) if w is None else np.asarray(w, float)
    u = u + 0.07 * CG.fbm(u * 2.4 + v * 1.3, v * 2.1 + 3.0, np.abs(ww) * 1.5, 5)   # organic zone borders (same warp for every coat)
    v = v + 0.06 * CG.fbm(u * 2.0 + 7.0, v * 2.6, np.abs(ww) * 1.7, 9)
    mat = np.full(np.shape(u), z('M'))
    mat[u > 0.30] = z('S')
    mat[u < -0.50] = z('R')
    mat[u < -0.76] = z('T')
    mat[(v > 0.52) & (u < 0.55)] = z('B')
    if w is None:
        heart = ((u + 0.27) / 0.17) ** 2 + ((v + 0.68) / 0.22) ** 2 < 1
        stripe = (u > 0.0) & (u < 0.28) & (v > 0.02) & (v < 0.2)
    else:
        heart = (v < -0.4) & (((u + 0.27) / 0.17) ** 2 + (w / 0.3) ** 2 < 1)
        stripe = (u > 0.0) & (u < 0.28) & (v > 0.02) & (v < 0.2) & (np.abs(w) > 0.4)
    mat[heart & (mat == z('M'))] = z('X1')
    mat[stripe & (mat == z('M'))] = z('X2')
    return mat


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
    bx, brx, bry = p['bx'], p['brx'] * kb * STYLE['kx'], p['bry'] * kb
    if STYLE['build'] == 'chubby':
        brx = min(brx, 20.5)   # keep the widest poses (heat_flop) inside the 64 px frame
        bx -= 0.0 if p['back_out'] else 1.0
        bry *= 1.05            # rounder, taller belly (total body height x1.12 of the stage value)
    by = FLOOR - 1.5 - bry - p['lift']
    hxc, hyc = bx + p['hdx'] * (1.0 if STYLE['build'] == 'chubby' else kb), by + p['hdy'] * kb
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
            leg = capsule(fx0 + 1.0, top, fx0 + 1.2, fy0 + 0.5, 1.05 if STYLE['build'] == 'skinny' else 1.35)
            c.put_mat(leg, MAT['ZL'], 2 if far else 1)
        X, Y = fwd(fx0 + 0.5, fy0 + 0.5)
        col = FR(2 if far else 1)
        toe = FR(3 if far else 2)
        c.stamp(foot_pat, X, Y, {'P': col})
        c.put_px(X + 2, Y + 1, toe)

    draw_foot(0, True)
    draw_foot(2, True)

    # tułów
    u = (lx - bx) / brx
    v = (ly - by) / bry
    pw = np.where(v > 0, 2.3 if STYLE['build'] == 'chubby' else 2.7, 2.0)
    body = (np.abs(u) ** pw + np.abs(v) ** pw) <= 1.0
    ix, iy = np.floor(lx).astype(int), np.floor(ly).astype(int)
    hs7 = (ix * 5 + iy * 11 + (ix * iy) % 7) % 7      # fur noise fixed to the body
    breed = STYLE['breed']
    safe = (XX > 3) & (XX < S - 3) & (YY > 3) & (YY < S - 3)   # fur tufts must not touch the frame border
    if p['fluff']:
        tuft = dil(body) & ~body & (v < 0.3) & (((XX + 2 * YY).astype(int) % 4) == 0)
        body = body | tuft
    if breed == 'teddy':      # dense fuzzy coat: ragged 1 px tufts all round, stronger on the back and rump
        ring1 = dil(body) & ~body
        body = body | (ring1 & safe & (hs7 < 3) & (v < 0.7))
        body = body | (ring1 & safe & (hs7 < 2) & (v >= 0.7) & (u > -0.6) & (u < 0.5))
    elif breed == 'rosette':  # tousled coat: sticking tufts on the back and rump
        ring1 = dil(body) & ~body
        body = body | (ring1 & safe & (hs7 < 2) & (v < 0.2)) | (ring1 & safe & (hs7 < 3) & (u < -0.5))
    b = -(0.42 * u + 0.88 * v)
    if breed != 'smooth' or STYLE['named']:   # fur strokes fixed to the body (model coordinates, same as in the yaw frames)
        wz = np.sqrt(np.clip(1 - u * u - v * v, 0, 1)) * 13.5 * kb
        b = b + FUR.delta(u * brx, v * bry, wz, breed, 3 if not STYLE['named'] else 3 + len(STYLE['named'])) * (1.0 - 0.5 * (v > 0.5))
    wkey = STYLE['named'] if STYLE['named'] in WH.WHORLS else ('rosette' if breed == 'rosette' else None)
    if wkey:       # rosettes: rays round a bright centre and a ridge between the whorls (model coordinates)
        b = b + 0.5 * WH.field(wkey, u, v, np.sqrt(np.clip(1 - u * u - v * v, 0, 1)))[0]
    top = body & ~np.roll(body, 1, axis=0)       # rim light on the upper silhouette (light from the top left): readable black fur
    b = np.where(top & (u < 0.8), np.maximum(b, 0.62), b)
    c.hash = (ix * 7 + iy * 13 + (ix * iy) % 5) % 11    # speckle source fixed to the body (local coordinates, no shimmer)
    mat = body_zones(u, np.minimum(v, 0.5) if breed == 'peruvian' else v)   # long hair covers the belly colour
    if STYLE['named']:
        mat = named_body_mat(u, v)

    # głowa (czaszka + pyszczek)
    HW, MZ, MZR, MW = head_prof()
    hs_ = 1.04 if breed == 'teddy' else 1.0
    head = ell(hxc, hyc, hrx * hs_, hry * (1.02 if breed == 'teddy' else 1.0)) | ell(hxc + 5.5 * kh * MZ, hyc + 2.6 * kh, 5.0 * kh * MZR, 4.6 * kh)
    if breed in ('teddy', 'rosette'):
        hr1 = dil(head) & ~head
        head = head | (hr1 & safe & (hs7 < 2) & (ly < hyc + 3 * kh) & (lx < hxc + 5 * kh))
    if STYLE['breed'] == 'rosette':   # small crest on top of the head
        head = head | ell(hxc + 1.5 * kh, hyc - hry - 0.1 * kh, 3.4 * kh, 2.0 * kh)
    hu = (lx - hxc) / hrx
    hv = (ly - hyc) / hry
    hb = -(0.42 * hu + 0.88 * hv) + 0.1
    hdx_, hdy_ = (lx - hxc) / kh, (ly - hyc) / kh
    blaze = hdx_ > (4.2 - 0.75 * hdy_)
    n2 = (hdx_ > 2.4) & (hdy_ > 1.4) & ~blaze
    hmat = np.full((S, S), MAT['ZC'])          # face incl. the eye region
    hmat[hdy_ < -2.6] = MAT['ZH']              # crown above the eye line
    hmat[n2] = MAT['ZN2']
    hmat[blaze] = MAT['ZN1']
    if STYLE['named']:
        hmat = named_head_mat(hdx_, hdy_, 10.0 * np.sqrt(np.clip(1 - hu ** 2 - hv ** 2, 0, 1)))
    if STYLE['senior']:
        dith = ((XX.astype(int) + YY.astype(int)) % 2) == 0
        muz = ((lx - hxc) / kh > 1.0) & ((ly - hyc) / kh > -2.0) & ~blaze
        grey = muz & ((((lx - hxc) / kh > 3.2) & ((ly - hyc) / kh > 0.6)) | dith)
        brow = ell(hxc + 1.6 * kh, hyc - 5.0 * kh, 3.0 * kh, 1.3 * kh)
        hmat[grey | brow] = MAT['grey']

    lv = level(b)
    occl = dil(dil(head)) & body & ~head
    lv = np.where(occl, np.maximum(lv, 2), lv)
    c.put_mat(body, mat, lv)
    # dalekie ucho (za głową)
    ey = hyc - hry + 2.6 * kh - p['ear']
    exx = hxc - 4.6 * kh - p['ear_back']
    far_ear = ell(exx + 4.2 * kh, ey - 1.6 * kh, 2.8 * kh, 2.0 * kh, -15)
    c.put_mat(far_ear & ~head, MAT['ZC'], 2)

    # głowa
    if breed != 'smooth' or STYLE['named']:
        hz = 10.0 * np.sqrt(np.clip(1 - hu ** 2 - hv ** 2, 0, 1))
        hb = hb + 0.6 * FUR.delta(hdx_, hdy_, hz, breed, 11 + len(STYLE['named'] or ''))
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
    c.put_mat(rim, MAT['ZC'], 3)
    ev = (ly - ey) / 2.5
    c.put_mat(ear, MAT['ZC'], level(-ev * 0.9))
    c.put_mat(ear & (np.abs(ly - ey - 0.4) < 0.7) & (lx > exx - 1.5), MAT['ZX3'], 2)
    c.put_mat(inner & ear, MAT['pink'], 2)

    # rumieniec
    if p['blush']:
        X, Y = fwd(hxc + 3.5 * kh, hyc + 3.5 * kh)
        c.stamp(['BB'], X, Y, {'B': RAMP['pink'][1]})

    # oko
    EX, EY = fwd(hxc + 0.6 * kh, hyc - 3.0 * kh)
    eyes = {
        'open':   (['.EE.', 'EEHE', 'EEEE', '.EE.'], {'E': eyec(), 'H': HL}),
        'look':   (['HEE', 'EEE', 'EEE'], {'E': eyec(), 'H': HL}),
        'wide':   (['.EE.', 'EHHE', 'EHEE', 'EEEE', '.EE.'], {'E': eyec(), 'H': HL}),
        'half':   (['....', 'OOOO', 'EEHE', '.EE.'], {'E': eyec(), 'H': HL, 'O': OUT}),
        'closed': (['....', '....', 'OOOO', '....'], {'O': OUT}),
        'happy':  (['....', '.OO.', 'O..O', '....'], {'O': OUT}),
        'squeeze': (['O..', '.OO', 'O..'], {'O': OUT}),
        'sad':    (['....', 'OO..', 'EEHE', '.EE.'], {'E': eyec(), 'H': HL, 'O': OUT}),
        'none':   ([], {}),
    }
    pat, cm = eyes[p['eye']]
    if p['eye'] == 'wide':
        EY -= 1
    c.stamp(pat, EX, EY, cm)
    if STYLE['breed'] == 'peruvian' and p['eye'] != 'none':   # fringe falling over the eyes
        for k, (dxk, hk) in enumerate(((-1, 1), (0, 2), (1, 2), (2, 2), (3, 1), (4, 1))):
            for hh in range(-1, hk):
                c.zpx(EX + dxk, EY + hh - 1 + (1 if p['eye'] == 'wide' else 0), 'H', 3 if (k + hh) % 2 else 2)

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
            c.put_mat(arm, MAT['ZL'], 1 + k)
            paw = ell(px1, py1, 1.6, 1.3)
            c.put_mat(paw, MAT['FT'], 1 + k)
    if p['arms']:   # przednie łapki przy piersi (stanie na tylnych łapkach)
        for k, (ax, ay) in enumerate(p['arms']):
            sx0, sy0 = bx + brx * 0.55 - k * 2, by + 1
            arm = capsule(sx0, sy0, sx0 + ax, sy0 + ay, 1.4)
            c.put_mat(arm, MAT['ZL'], 1 + k)
            c.put_mat(ell(sx0 + ax + 0.4, sy0 + ay + 0.6, 1.5, 1.2), MAT['FT'], 1 + k)

    if p['back_out']:   # tylne łapki wyciągnięte do tyłu (upał), przyczepione do tułowia
        for k in (1, 0):
            hipx, hipy = bx - brx * 0.62, by + bry * 0.55 - k * 0.8
            fx1, fy1 = bx - brx - 4.5 + k * 1.5, FLOOR - 2.0 - p['lift'] - k * 0.5
            c.put_mat(capsule(hipx, hipy, fx1 + 1.2, fy1, 1.6), MAT['ZL'], 2 if k else 1)
            c.put_mat(ell(fx1, fy1, 1.8, 1.1), MAT['FT'], 2 if k else 1)
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
        c.put_mat(rim, MAT['ZL'], 3)
        tu, tv = (lx - hipx) / 5.0, (ly - hipy) / 4.0
        c.put_mat(thigh | shin, MAT['ZL'], np.where(level(-(0.42 * tu + 0.88 * tv)) == 0, 0, 1))
        c.put_mat(foot, MAT['FT'], 1)
        X, Y = fwd(fx1 + 1, fy1)
        c.put_px(X, Y, FR(3))
    if p['hat']:
        X, Y = fwd(hxc - 0.5 * kh, hyc - hry - 6.0)
        c.stamp(['...Y...', '..YYY..', '...R...', '..RRR..', '..BBB..', '.RRRRR.', 'BBBBBBB'], X - 3, Y,
                {'Y': hx('ffe066'), 'R': hx('ff6b8a'), 'B': hx('6aa8ff')})

    # bliskie stopy
    if p['scratch'] is None:
        draw_foot(1, False)
    draw_foot(3, False)
    if STYLE['breed'] == 'peruvian':
        # long hair skirt: hangs from the belly down to just above the floor line (hides most of the feet)
        ix = np.floor(lx).astype(int)
        raise_ = np.zeros_like(lx)
        for i in range(4):
            fdx, fdy = feet[i]
            raise_ += max(0.0, -fdy) * np.exp(-((lx - (bx + base[i][0] + fdx)) / 3.5) ** 2)
        hem = FLOOR - 2.0 - p['lift'] - raise_ - ((ix % 3) == 0) * 0.9
        skirt = (np.abs(u) < 0.93 - 0.06 * np.clip((ly - by) / bry - 1.0, 0, 2)) & (ly > by + bry * 0.55) & (ly <= hem)
        sk_lv = np.where(ly > hem - 1.3, 3, np.where((ix % 2) == 0, 1, 2))
        c.put_mat(skirt, body_zones(u, np.full_like(v, 0.1)), sk_lv)

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
                c.over[Y, X] = WHISK_OLD if STYLE['senior'] else WHISK

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

    # the same model as yaw.render_yaw(90): body radii, head centre and head radii
    chub = STYLE['build'] == 'chubby'
    bry = 10.5 * kb * (1.05 if chub else 1.0) + p['breathe']
    brz = 12.6 * kb * (1.12 if chub else 0.9 if STYLE['build'] in ('lean', 'skinny') else 1.0)
    brx = min(17.0 * kb, 20.5) if chub else 17.0 * kb
    byc = FLOOR - 1.5 - bry
    hxc, hyc = cx + lkx * 0.7, byc - 5.0 * kb + 1.2 + lky * 0.5
    bodym = np.zeros((S, S), bool)
    # tułów
    if p['body']:
        u = (lx - cx) / brz
        v = (ly - byc) / bry
        body = u ** 2 + v ** 2 <= 1
        b = -(0.35 * u + 0.9 * v)
        mat = np.where((np.abs(lx - cx) < 6.5 * kb) & (ly > byc - 2) & (not p['back']), MAT['ZB'], MAT['ZS'])
        if p['back']:
            mat = np.where(((lx - cx) ** 2 / 30 + (ly - byc + 2) ** 2 / 40) < 1, MAT['ZT'], MAT['ZR'])
            mat = np.where((ly < byc - 3) & (np.abs(lx - cx) < 5), MAT['ZM'], mat)
        if STYLE['named'] or STYLE['breed'] != 'smooth':
            # the same model-space coat as the side and yaw views: the chest/rump faces the camera (u = depth), w = screen lateral
            wm = (u if p['back'] else -u)
            um = np.sqrt(np.clip(1 - v * v - u * u, 0, 1)) * (-1.0 if p['back'] else 1.0)
            if STYLE['named']:
                mat = named_body_mat(um, v, wm)
            b = b + FUR.delta(um * brx, v * bry, wm * brz, STYLE['breed'], 3 if not STYLE['named'] else 3 + len(STYLE['named'])) * (1.0 - 0.5 * (v > 0.5))
            wk_ = STYLE['named'] if STYLE['named'] in WH.WHORLS else ('rosette' if STYLE['breed'] == 'rosette' else None)
            if wk_:
                b = b + 0.5 * WH.field(wk_, um, v, wm)[0]
        c.hash = (np.floor(lx).astype(int) * 7 + np.floor(ly).astype(int) * 13 + (np.floor(lx).astype(int) * np.floor(ly).astype(int)) % 5) % 11
        c.put_mat(body, mat, level(b))
        bodym = body
        for fx0 in (cx - 7 * kb * p['sx'], cx + (4 * kb) * p['sx']):
            c.stamp(['PPP', 'PPP'], int(fx0), FLOOR - 2 + int(oy), {'P': FR(1)})
            c.put_px(int(fx0) + 1, FLOOR - 1 + int(oy), FR(2))
        if STYLE['breed'] == 'peruvian':   # hair skirt down to the floor, hides the feet
            ixx = np.floor(lx).astype(int)
            hem = FLOOR - 2.0 - ((ixx % 3) == 0) * 0.9
            skirt = (np.abs(lx - cx) < 12.6 * kb) & (ly > byc + bry * 0.35) & (ly <= hem) & (u ** 2 + ((ly - byc) / bry - 0.4) ** 2 <= 1.6)
            c.put_mat(skirt, MAT['ZS'], np.where(ly > hem - 1.3, 3, np.where((ixx % 2) == 0, 1, 2)))

    # uszy (za głową)
    for side in (-1, 1):
        ex, ey = hxc + side * 10.8 * kh, hyc - 5.9 * kh - p['ear'] * (1 if side == 1 else 0.5)
        ear = ell(ex, ey, 3.8 * kh, 2.7 * kh)
        inner = ell(ex - side * 0.3, ey + 0.4, 2.1 * kh, 1.4 * kh)
        if p['back']:
            ear = ear & ~bodym      # seen from behind the body hides the head and the ears' roots
        c.put_mat(ear, MAT['ZC'], level(-(ly - ey) / 2.7))
        if not p['back']:
            c.put_mat(inner & ear, MAT['pink'], 2)

    HW, MZ, MZR, MW = head_prof()
    head = ell(hxc, hyc, 11.6 * HW * kh, 9.3 * kh)
    if STYLE['breed'] == 'rosette':
        head = head | ell(hxc + 0.5, hyc - 9.4 * kh, 4.0 * kh, 2.0 * kh)
    hu = (lx - hxc) / (11.6 * HW * kh)
    hv = (ly - hyc) / (9.3 * kh)
    hb = np.maximum(-(0.35 * hu + 0.9 * hv) + 0.15, -0.2)      # no darkest rim under the chin (it read as a smile)
    blaze = np.abs(lx - hxc - lkx * 0.3) < (1.2 + np.maximum(ly - (hyc - 9 * kh), 0) * 0.28)
    muzzle = ell(hxc + lkx * 0.4, hyc + 4.6 * kh, 5.2 * MW * kh, 3.4 * kh)
    hmat = np.full((S, S), MAT['ZC'])
    hmat[ly < hyc - 4.6 * kh] = MAT['ZH']
    hmat[muzzle] = MAT['ZN2']
    hmat[blaze] = MAT['ZN1']
    if STYLE['named']:
        # head frame of the yaw renderer: xh = depth (the face points at the camera), yh down, zh lateral (+z = screen left from the front)
        # the exact surface of yaw.render_yaw(90): head ellipsoid (9.5, 9.3, 11.6) and muzzle ellipsoid (5.2, 4.6, 5.2) at (5.5, 2.6, 0)
        lat = (lx - hxc) / kh
        yh = (ly - hyc) / kh
        xh_h = 9.5 * np.sqrt(np.clip(1 - (lat / (11.6 * HW)) ** 2 - (yh / 9.3) ** 2, 0, 1))
        rm = 1 - (lat / (5.2 * MW)) ** 2 - ((yh - 2.6) / 4.6) ** 2
        xh_m = np.where(rm > 0, 5.5 * MZ + 5.2 * MZR * np.sqrt(np.clip(rm, 0, 1)), -1e9)
        xh = np.maximum(xh_h, xh_m)
        if p['back']:
            hmat = named_head_mat(-xh_h, yh, lat)
        else:
            hmat = named_head_mat(xh, yh, -lat)
    if STYLE['senior'] and not p['back']:
        dith = ((XX.astype(int) + YY.astype(int)) % 2) == 0
        ring = ell(hxc + lkx * 0.4, hyc + 4.6 * kh, 8.2 * kh, 5.6 * kh) & ~muzzle & ~blaze & (dith | ell(hxc + lkx * 0.4, hyc + 4.6 * kh, 6.6 * kh, 4.4 * kh))
        brows = ell(hxc - 5.6 * kh, hyc - 6.2 * kh, 3.2, 1.4) | ell(hxc + 5.6 * kh, hyc - 6.2 * kh, 3.2, 1.4)
        hmat = np.where(ring | brows, MAT['grey'], hmat)
    if p['back']:
        hmat = np.full((S, S), MAT['ZH'])
    hl = level(hb)
    if p['body'] and not p['back']:
        occl = dil(dil(head)) & bodym & ~head          # the body in the shade right under the head, like the yaw renderer
        c.lvl[occl] = np.maximum(c.lvl[occl], 1)
    if p['back']:
        head = head & ~bodym
    c.put_mat(head, hmat, hl)
    if p['back']:
        for f in p['fx']:
            c.fx.append(f)
        return c.finish(shift=int(p['cy']))

    # oczy
    eyes = {
        'open':   (['.EE.', 'EEHE', 'EEEE', '.EE.'], {'E': eyec(), 'H': HL}),
        'half':   (['....', 'OOOO', 'EEHE', '.EE.'], {'E': eyec(), 'H': HL, 'O': OUT}),
        'closed': (['....', '....', 'OOOO', '....'], {'O': OUT}),
        'happy':  (['....', '.OO.', 'O..O', '....'], {'O': OUT}),
        'wide':   (['.EE.', 'EHHE', 'EHEE', 'EEEE', '.EE.'], {'E': eyec(), 'H': HL}),
    }
    pat, cm = eyes[p['eye']]
    for side in (-1, 1):
        ex = int(math.floor(hxc + side * 5.8 * kh + lkx * 0.6)) - 2
        ey = int(math.floor(hyc - 1.6 * kh + lky * 0.6)) - 2
        if p['eye'] == 'wide':
            ey -= 1
        pp = pat if side == 1 else [r[::-1] for r in pat]
        c.stamp(pp, ex, ey, cm)
        if STYLE['breed'] == 'peruvian':   # fringe over the eyes
            for k in range(-1, 5):
                for hh in range(-1, 1 + (k in (1, 2))):
                    c.zpx(ex + (k if side == 1 else 3 - k), ey + hh - (1 if p['eye'] == 'wide' else 0), 'H', 3 if (k + hh) % 2 else 2)
        if p['blush']:
            c.stamp(['BB'], int(round(hxc + side * 6.5 * kh - 1)), int(round(hyc + 2.5 * kh)), {'B': RAMP['pink'][1]})
    nx = int(round(hxc - 1 + lkx * 0.8))
    ny = int(round(hyc + 1.2 * kh + lky * 0.6 - p['nose']))
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
            c.fx.append((['.PP.', 'PPPP'], fx0, S - 3, {'P': FR(1), '_o': OUT}))
    img = c.finish(shift=int(p['cy']))
    if p['clip'] is not None:
        img[p['clip']:] = 0
    return img
