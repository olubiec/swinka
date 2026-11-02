"""Colour tools in numpy only: sRGB<->CIELAB, CIEDE2000 (Sharma, Wu, Dalal 2005), k-means in Lab with merge of close centroids,
and ramps of a photo region. Used for the reference specs (A0) and for the acceptance checks of the coat engine."""
import numpy as np

D65 = np.array([0.95047, 1.0, 1.08883])
M = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])


def rgb2lab(rgb):
    c = np.asarray(rgb, float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    xyz = (c @ M.T) / D65
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab2rgb(lab):
    lab = np.asarray(lab, float)
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) / (24389 / 27)) * D65
    c = xyz @ np.linalg.inv(M).T
    c = np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055)
    return np.clip(np.round(c * 255), 0, 255).astype(np.uint8)


def ciede2000(l1, l2, kL=1.0, kC=1.0, kH=1.0):
    l1 = np.asarray(l1, float)
    l2 = np.asarray(l2, float)
    L1, a1, b1 = l1[..., 0], l1[..., 1], l1[..., 2]
    L2, a2, b2 = l2[..., 0], l2[..., 1], l2[..., 2]
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb ** 7 / (Cb ** 7 + 25.0 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    dh = np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh))
    dh = np.where(C1p * C2p == 0, 0, dh)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh) / 2)
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hs = h1p + h2p
    hb = np.where(np.abs(h1p - h2p) <= 180, hs / 2, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2))
    hb = np.where(C1p * C2p == 0, hs, hb)
    T = (1 - 0.17 * np.cos(np.radians(hb - 30)) + 0.24 * np.cos(np.radians(2 * hb)) + 0.32 * np.cos(np.radians(3 * hb + 6))
         - 0.20 * np.cos(np.radians(4 * hb - 63)))
    dth = 30 * np.exp(-(((hb - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dth)) * Rc
    return np.sqrt((dLp / (kL * Sl)) ** 2 + (dCp / (kC * Sc)) ** 2 + (dHp / (kH * Sh)) ** 2 + Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)))


def kmeans(x, k, iters=40, seed=1):
    rng = np.random.default_rng(seed)
    c = x[rng.choice(len(x), k, replace=False)].astype(float)
    for _ in range(iters):
        lab = np.argmin(((x[:, None, :] - c[None]) ** 2).sum(-1), 1)
        n = np.array([c[i] if not (lab == i).any() else x[lab == i].mean(0) for i in range(k)])
        if np.allclose(n, c):
            break
        c = n
    return c, np.bincount(lab, minlength=k) / len(x)


def palette(rgb_pixels, k=5, merge=6.0):
    """k-means in Lab; centroids closer than `merge` dE2000 are joined. Returns [(rgb, share)] sorted by share."""
    lab = rgb2lab(rgb_pixels.reshape(-1, 3))
    if len(lab) > 6000:
        lab = lab[np.random.default_rng(0).choice(len(lab), 6000, replace=False)]
    c, w = kmeans(lab, k)
    out = []
    for i in np.argsort(-w):
        for o in out:
            if ciede2000(c[i], o[0]) < merge:
                o[1] += w[i]
                break
        else:
            out.append([c[i], w[i]])
    return [(lab2rgb(c).tolist(), float(w)) for c, w in out]


def ramp(rgb_pixels, n=4):
    """n shades of a region: Lab means of the lightness quantile bands (light -> dark)."""
    lab = rgb2lab(rgb_pixels.reshape(-1, 3))
    order = np.argsort(-lab[:, 0])
    parts = np.array_split(order, n + 2)[1:-1] if n >= 2 else [order]
    return [lab2rgb(lab[p].mean(0)).tolist() for p in parts]


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


if __name__ == '__main__':
    # Sharma, Wu, Dalal (2005) test pairs
    tests = [((50, 2.6772, -79.7751), (50, 0, -82.7485), 2.0425), ((50, 2.5, 0), (50, 0, -2.5), 4.3065),
             ((50, -1, 2), (50, 0, 0), 2.3669)]
    for a, b, e in tests:
        d = float(ciede2000(np.array(a), np.array(b)))
        print(a, b, round(d, 4), e, 'OK' if abs(d - e) < 1e-3 else 'FAIL')
        assert abs(d - e) < 1e-3
    x = np.random.default_rng(3).integers(0, 256, (50, 3))
    assert np.abs(lab2rgb(rgb2lab(x)).astype(int) - x).max() <= 1
    print('colorlab ok')
