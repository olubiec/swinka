"""A1: coat engine in model space. A coat is a function of the point on the pig's surface (body: u forward -1..1, v down, w lateral;
head: xh forward, yh down, zh lateral in head units), not of a flat zone grid. Edges are warped by noise (organic), gradients are
dithered with a threshold fixed to the surface (no shimmer in animation or in the turn).
The five named pigs have their own slots Q0..Q3 and ramps; patterns are drawn after the photos in docs/reference/pigs/spec/."""
import numpy as np
import whorls as WH

# ---------------------------------------------------------------- noise (value noise 3D, hashed lattice, numpy only)
def _h(ix, iy, iz, seed):
    n = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 1274126177) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n = n ^ (n >> 16)
    return (n & 0xFFFF) / 32767.5 - 1.0


def noise3(x, y, z, seed=0):
    x, y, z = np.asarray(x, float), np.asarray(y, float), np.asarray(z, float)
    xi, yi, zi = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.floor(z).astype(np.int64)
    fx, fy, fz = x - xi, y - yi, z - zi
    sx, sy, sz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    out = 0.0
    for dx, wx in ((0, 1 - sx), (1, sx)):
        for dy, wy in ((0, 1 - sy), (1, sy)):
            for dz, wz in ((0, 1 - sz), (1, sz)):
                out = out + wx * wy * wz * _h(xi + dx, yi + dy, zi + dz, seed)
    return out


def fbm(x, y, z, seed=0, octaves=3):
    a, f, s = 1.0, 1.0, 0.0
    for o in range(octaves):
        s = s + a * noise3(x * f, y * f, z * f, seed + o * 17)
        a *= 0.5
        f *= 2.03
    return s / 1.75


def sm(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


BAYER8 = (np.array([[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
                    [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
                    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]]) + 0.5) / 64.0


def surf(u, v, w):
    """Surface coordinates of a body point: s along the body (+ head), phi = angle round the long axis (0 top, pi/2 flank, pi belly)."""
    v = np.asarray(v, float)
    w = np.abs(np.asarray(w, float))
    return np.asarray(u, float), np.arctan2(w, -v)


def thr(s, phi, kind=0):
    """Dither threshold fixed to the surface: cell ~ one screen pixel (body 17 cells/unit along, 14 per radian round)."""
    i = np.floor(s * 17).astype(int)
    j = np.floor(phi * 14).astype(int)
    return BAYER8[(j + kind) % 8, i % 8]


def warp(s, phi, seed, amp_s=0.06, amp_p=0.22):
    return (s + amp_s * fbm(s * 2.6, phi * 1.7, 0.3, seed), phi + amp_p * fbm(s * 2.1 + 5, phi * 2.2, 1.1, seed + 3))


def pick(field, s, phi, a, b):
    """slot a where the coverage field wins against the surface threshold, else slot b."""
    return np.where(field > thr(s, phi), a, b)


# ---------------------------------------------------------------- named pigs
def rp(*cs):
    return [[int(c[i:i + 2], 16) for i in (0, 2, 4)] for c in cs]


# slot ramps (light -> dark), hue-shifted by hand from the photo ramps (docs/reference/pigs/spec): shadows cool, lights warm
RAMPS = {
    'ned': [rp('fffdf8', 'f6ece0', 'dfcfbf', 'bfa89a'),     # 0 white-cream
            rp('8e6c5a', '6b4a3a', '4a3126', '30201b'),     # 1 chocolate
            rp('cdb9a8', 'ad9382', '8b7260', '695344'),     # 2 pale brown (heart, nape fade)
            rp('fffdf8', 'f6ece0', 'dfcfbf', 'bfa89a')],
    'kuki': [rp('f4ac48', 'dc8a2a', 'b86a1d', '8a4b13'),    # 0 ginger-gold
             rp('73502f', '56391f', '3b2615', '281a0e'),    # 1 dark brown
             rp('fffdf8', 'f6ece0', 'dfcfbf', 'bfa89a'),    # 2 white blaze
             rp('fbd884', 'eab655', 'cf9437', 'a06e22')],   # 3 gold (rosette rays)
    'glen': [rp('5a6070', '3b3e49', '25272f', '131419'),    # 0 black with blue-grey sheen
             rp('d08236', 'ae6024', '82431a', '5a2d11'),    # 1 ginger streak
             rp('9a9aa2', '7a7a83', '5c5c64', '404046'),    # 2 grey feet
             rp('7a8296', '555b6b', '3b3e49', '25272f')],   # 3 sheen highlight
    'james': [rp('9aa0a8', '787e87', '5a5f68', '3f434b'),   # 0 grey base
              rp('b4bac2', '979da6', '7a808a', '5d626c'),   # 1 light ticks (one step lighter than the base)
              rp('5c5f67', '444750', '2f3138', '1d1e23'),   # 2 dark muzzle / legs
              rp('b4b9bf', '979ca4', '767b84', '585c65')],
    'racuch': [rp('f7ac52', 'e18c32', 'bf6b23', '8f4a17'),  # 0 ginger
               rp('544f5a', '39353f', '262329', '151418'),  # 1 black saddle
               rp('fffdf8', 'f6ece0', 'dfcfbf', 'bfa89a'),  # 2 white
               rp('f7ac52', 'e18c32', 'bf6b23', '8f4a17')],
}
FEET = {'glen': rp('3c3f47', '2b2d34', '1c1d22', '111216')}   # Glen has black paws (the others keep pink feet)
EYES = {'ned': '2b1712', 'kuki': '24140f', 'glen': '17161a', 'james': '23201e', 'racuch': '211611'}
# what every unconverted zone material becomes in a named coat (legs, ears, back views ...)
NZ = {
    'ned': dict(ZC=1, ZH=1, ZN1=0, ZN2=0, ZL=0, ZS=0, ZM=0, ZR=0, ZT=0, ZB=0, ZX1=2, ZX2=0, ZX3=1),
    'kuki': dict(ZC=0, ZH=0, ZN1=2, ZN2=2, ZL=1, ZS=0, ZM=1, ZR=1, ZT=1, ZB=1, ZX1=1, ZX2=1, ZX3=0),
    'glen': dict(ZC=0, ZH=0, ZN1=0, ZN2=0, ZL=0, ZS=0, ZM=0, ZR=0, ZT=0, ZB=0, ZX1=0, ZX2=0, ZX3=1),
    'james': dict(ZC=0, ZH=0, ZN1=0, ZN2=0, ZL=0, ZS=0, ZM=0, ZR=0, ZT=0, ZB=0, ZX1=0, ZX2=0, ZX3=0),
    'racuch': dict(ZC=1, ZH=0, ZN1=2, ZN2=2, ZL=0, ZS=0, ZM=1, ZR=0, ZT=2, ZB=0, ZX1=1, ZX2=1, ZX3=1),
}


def heart_mask(u, v, w, centre=(-0.40, 0.85), size=5.4, angle=40.0):
    """Ned's heart: on ONE side of the back (the +w side = the side facing the camera in the side view), slanted by `angle` degrees.
    Drawn in the tangent plane of the surface at `centre` (u, phi); implicit heart curve (x^2+y^2-1)^3 - x^2 y^3 < 0."""
    u, v, w = np.asarray(u, float), np.asarray(v, float), np.asarray(w, float)
    P = np.stack([u * WH.NOM[0], v * WH.NOM[1], w * WH.NOM[2]])
    a, b = WH.tangent(centre + (0, 0, 0), 1, P)
    t = np.radians(angle)
    x = (a * np.cos(t) + b * np.sin(t)) / size
    y = (-a * np.sin(t) + b * np.cos(t)) / size
    near = np.hypot(a, b) < size * 1.8
    return near & (w > 0) & ((x * x + y * y - 1) ** 3 - x * x * y ** 3 < 0)


def body_slots(pid, u, v, w):
    s, phi = surf(u, v, w)
    sw, pw = warp(s, phi, {'ned': 11, 'kuki': 23, 'glen': 31, 'james': 47, 'racuch': 59}[pid])
    out = np.zeros(np.shape(s), int)
    if pid == 'ned':
        # chocolate shoulder cap behind the head (dark on top, fading down the flank) and a small low-contrast heart on the rump
        cap = sm(0.22, 0.46, sw) * (1 - sm(0.95, 1.5, pw))
        out = pick(cap, s, phi, 1, 0)
        out = np.where(heart_mask(u, v, w) & (out == 0), 1, out)
    elif pid == 'kuki':
        ub = 0.34 - 0.29 * sm(0.7, 1.25, pw) + 0.09 * np.sin(pw * 3.2 + 1.0)                    # front (ginger) ends further back on the flank than on the back
        front = sm(ub - 0.20, ub + 0.20, sw)
        patch = 1 - sm(0.85, 1.25, np.hypot((sw + 0.27) / 0.36, pw / 1.15))    # ginger hip patch on the back (rosettes sit here)
        out = pick(np.maximum(front, patch), s, phi, 0, 1)
    elif pid == 'glen':
        streak = (pw > 0.95) & (pw < 1.55) & (np.abs(sw - 0.10 - 0.12 * (pw - 1.2)) < 0.030)
        out = np.where(streak, 1, 0)
        _, ray, core = WH.field('glen', u, v, w)
        out = np.where((ray | core) & ~streak, 3, out)
    elif pid == 'james':
        out = np.zeros(np.shape(s), int)       # James is one even grey: the coat texture comes from the fur strokes only
    elif pid == 'racuch':
        edge = 1.95 + 0.14 * fbm(s * 3.0, 0.0, 2.0, 61) + 0.05 * np.sin(s * 7)           # wavy lower edge of the saddle
        fr, rr = 0.30 + 0.06 * (pw - 0.8), -0.38 - 0.06 * (pw - 0.8)                       # slightly slanted front/rear edges
        saddle = sm(rr - 0.02, rr + 0.04, sw) * (1 - sm(fr - 0.04, fr + 0.02, sw)) * (1 - sm(edge - 0.1, edge + 0.1, pw))
        out = pick(saddle, s, phi, 1, 0)
        tip = (sw < -0.76 + 0.07 * fbm(w * 4.0, v * 4.0, u * 2.0, 8)) & (v < 0.45)      # rump tip: no phi (it is undefined at the pole)
        out = np.where(tip, 2, out)
    return out


def head_slots(pid, xh, yh, zh):
    xh, yh, zh = np.asarray(xh, float), np.asarray(yh, float), np.abs(np.asarray(zh, float))
    n = fbm(xh * 0.35, yh * 0.35, zh * 0.35, 90 + len(pid)) * (0.45 if pid == 'ned' else 0.9)
    out = np.zeros(np.shape(xh), int)
    if pid == 'ned':
        # white: muzzle, cheeks in front of the eye, chin, narrow blaze widening towards the nose. Brown: crown, ears, eye ring, back of the head
        # brown head (crown, ears, eye ring, cheeks); white only on a narrow blaze, the muzzle cone and the chin
        blaze = (zh < 0.8 + 0.10 * np.maximum(xh, 0) + 0.3 * n) & (yh < 2.0) & (xh > 1.0)
        muz = (xh + n > 7.0) & (zh < 4.4 - 0.15 * np.maximum(-yh, 0)) & (yh > -1.2)
        chin = ((yh > 2.4) & (xh + n > 4.6)) | (yh > 5.4 + n)      # the underside of the jaw is white too (no dark rim under the chin)
        out = np.where(blaze | muz | chin, 0, 1)
    elif pid == 'kuki':
        blaze = (xh + n > 5.0 - 0.5 * yh) & (zh < 2.8) & (yh < 3.5)
        chin = (xh + n > 4.2) & (yh > 2.4)
        out = np.where(blaze | chin, 2, 0)
    elif pid == 'glen':
        out = np.zeros(np.shape(xh), int)
    elif pid == 'james':
        out = np.zeros(np.shape(xh), int)      # same grey on the face: no dark muzzle
    elif pid == 'racuch':
        patch = (((xh + 1.2) / 4.4) ** 2 + ((yh + 0.8) / 3.6) ** 2 + (zh / 7.5) ** 2) < 1
        blaze = ((zh < 1.2 + 0.18 * (xh + 4)) & (yh < 2.2) & (xh > 1.0 + n)) | ((xh + n > 3.2 - 0.4 * yh) & (yh < 0.5) & (zh < 3.2))
        chin = (xh + n > 4.0) & (yh > 2.4)
        out = np.where(blaze | chin, 2, np.where(patch, 1, 0))
    return out
