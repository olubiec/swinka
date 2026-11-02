"""A2: fur as a function of the model-space point (xl forward, yl down, zl lateral, in pixel units of the body model), so the strokes
are fixed to the body: the same in the 2D poses and in the yaw (turn) frames, no shimmer.
delta() returns a brightness offset added to the shading before it is quantised to the 4-shade ramp: strand tips lighter, gaps darker,
clumps 1-2 px wide and 2-9 px long, stronger on the back (light from the top left). Breed profiles after the research notes:
teddy = dense short fuzz, rex = tight curls, rosette = rough longer strands, peruvian = long strands, smooth = almost flat."""
import numpy as np
import coatgen as CG

# cell (px), length along the flow (px), share of the length lit, amplitude, curl
PROFILE = {
    'smooth': (1.0, 8.0, 0.80, 0.05, 0.0),
    'teddy': (1.0, 2.4, 0.55, 0.30, 0.0),
    'rex': (1.0, 2.0, 0.50, 0.34, 1.6),
    'rosette': (1.0, 4.6, 0.55, 0.30, 0.0),
    'peruvian': (1.0, 6.5, 0.60, 0.26, 0.0),
}


def delta(xl, yl, zl, breed, seed=3, whorl=None):
    cell, L, duty, amp, curl = PROFILE[breed]
    if amp <= 0.06:
        return np.zeros(np.shape(xl))
    cy = np.floor(yl / cell).astype(np.int64)
    cz = np.floor(zl / cell).astype(np.int64)
    h = (CG._h(cy, cz, 5, seed) + 1) / 2                      # 0..1 per strand
    h2 = (CG._h(cy + 7, cz - 3, 9, seed + 1) + 1) / 2
    along = xl + 0.45 * yl + h * L * 3.0
    if curl:
        along = along + curl * np.sin(yl * 1.9 + zl * 1.3 + h * 6.0)
    ph = (along / (L * (0.75 + 0.5 * h2))) % 1.0
    lit = ph < duty
    tip = lit & (ph < duty * 0.35)
    d = np.where(tip, 1.0, np.where(lit, 0.35, -0.85))
    if whorl is not None:
        d = whorl(d, xl, yl, zl, h, h2)
    return amp * d
