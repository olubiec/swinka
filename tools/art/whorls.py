"""A3: rosettes = whorl (rays round a bright centre) + ridge (the crease where neighbouring whorls meet, standing hair), after the
abyssinian standard: whorls symmetric on both sides (shoulder, hip, rump) with ridges between them. Everything in normalised body
coordinates (u forward, v down, w lateral) so it is identical in the 2D poses and in the yaw frames and scales with the body.
Centres: (u, phi, radius px, rays, twist); phi = angle round the long axis (0 top, pi/2 flank)."""
import numpy as np
import coatgen as CG

NOM = (17.0, 10.5, 13.5)         # nominal body radii (px), only to convert normalised distances to pixels
WHORLS = {
    'rosette': [(0.38, 1.15, 6.2, 7, 0.05), (-0.30, 0.95, 7.4, 8, 0.05), (-0.68, 1.45, 6.4, 7, 0.05)],
    'kuki': [(-0.30, 0.90, 8.6, 11, 0.07), (-0.58, 1.55, 8.0, 10, 0.07)],
    'glen': [(-0.45, 0.95, 6.4, 8, 0.05), (0.16, 1.15, 5.2, 7, 0.05)],
}


def tangent(centre, sd, P, rx=NOM):
    """Tangent-plane coordinates (a forward, b round the body) of points P relative to the surface point `centre` = (u, phi, ...)."""
    return _local(centre, sd, P, rx, xy=True)


def _local(centre, sd, P, rx=NOM, xy=False):
    cu, phi, R, nsp, tw = centre
    r = np.sqrt(max(1 - cu * cu, 0.0))
    C = np.array([cu * rx[0], -r * np.cos(phi) * rx[1], sd * r * np.sin(phi) * rx[2]])
    n = np.array([cu / rx[0], -r * np.cos(phi) / rx[1], sd * r * np.sin(phi) / rx[2]])
    n = n / np.linalg.norm(n)
    e1 = np.array([1.0, 0, 0]) - n * n[0]
    e1 = e1 / np.linalg.norm(e1)
    e2 = np.cross(n, e1)
    d = P - C[:, None, None] if P.ndim == 3 else P - C
    a = d[0] * e1[0] + d[1] * e1[1] + d[2] * e1[2]
    b = d[0] * e2[0] + d[1] * e2[1] + d[2] * e2[2]
    if xy:
        return a, b
    return np.hypot(a, b), np.arctan2(b, a)


def field(key, u, v, w):
    """Returns (delta brightness, ray mask, core mask) for the whorl set `key` at the model points."""
    cs = WHORLS.get(key)
    shape = np.shape(u)
    if not cs:
        return np.zeros(shape), np.zeros(shape, bool), np.zeros(shape, bool)
    u, v, w = np.asarray(u, float), np.asarray(v, float), np.asarray(w, float)
    P = np.stack([u * NOM[0], v * NOM[1], w * NOM[2]])
    side = np.where(w >= 0, 1, -1)
    dmap = np.full(shape, 1e9)
    amap = np.zeros(shape)
    cfg = np.zeros(shape)
    dists = {}
    for ci, c in enumerate(cs):
        for sd in (1, -1):
            dd, ang = _local(c, sd, P)
            dd = np.where(side == sd, dd, 1e9)
            dists[(ci, sd)] = dd
            use = dd < dmap
            dmap = np.where(use, dd, dmap)
            amap = np.where(use, ang, amap)
            cfg = np.where(use, ci, cfg)
    R = np.array([c[2] for c in cs])[cfg.astype(int)]
    nsp = np.array([c[3] for c in cs])[cfg.astype(int)]
    tw = np.array([c[4] for c in cs])[cfg.astype(int)]
    inside = dmap < R
    t = amap / (2 * np.pi) * nsp + tw * dmap
    ph = t % 1.0
    k = np.floor(t).astype(np.int64)
    lm = 0.45 + 0.55 * (CG._h(k, cfg.astype(np.int64), 1, 5) + 1) / 2        # every ray has its own length
    ray = inside & (dmap > 1.1) & (ph < 0.55) & (dmap < R * lm)
    core = inside & (dmap <= 1.4)
    d = np.zeros(shape)
    d = np.where(inside & (ph >= 0.5) & (dmap > 1.1), -0.8 * (1 - dmap / R) - 0.1, d)
    d = np.where(ray, 0.9 * (1 - 0.5 * dmap / R) + 0.2, d)
    d = np.where(core, 1.5, d)
    # ridge: crease between neighbouring whorls on the same side (dark line with a light lip on the front side)
    for ci in range(len(cs)):
        for cj in range(ci + 1, len(cs)):
            for sd in (1, -1):
                di, dj = dists[(ci, sd)], dists[(cj, sd)]
                di = np.where(di > 1e8, 99, di)
                dj = np.where(dj > 1e8, 99, dj)
                near = (di < cs[ci][2] * 1.5) & (dj < cs[cj][2] * 1.5)
                dif = di - dj
                d = np.where(near & (np.abs(dif) < 0.7) & ~core, -1.2, np.where(near & (dif > 0.7) & (dif < 1.7) & ~core, np.maximum(d, 0.6), d))
    if key == 'rosette':
        d = d * 2.6      # generic coats have no colour change in the whorls: the light has to carry them
    return d, ray, core
