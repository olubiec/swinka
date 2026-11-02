"""Coat model: zones x patterns x palettes.
The sheets are rendered in 'master' mode: every zone/shade/tick pixel gets a unique colour (the default look plus a
1-unit offset, invisible to the eye). A coat is then an exact colour remap, composed from the tables below.
Zones: N1 blaze/nose, N2 muzzle+chin, H crown, C cheeks+ears, S shoulder+chest, M middle/saddle, R rump, T rump tip,
B belly, L legs, X1 back mark (heart), X2 flank stripe (+ear stripe).
Slots: A main, B secondary, W white, K dark. '-' is not used: every slot is explicit so the remap is context free."""
import numpy as np

ZONES = ['N1', 'N2', 'H', 'C', 'S', 'M', 'R', 'T', 'B', 'L', 'X1', 'X2', 'X3']
ZI = {z: i for i, z in enumerate(ZONES)}


def hx(c):
    c = c.lstrip('#')
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def ramp(*cs):
    return [hx(c) for c in cs]


WHITE = ramp('fffdf8', 'f8eddd', 'e4cfb5', 'c7aa8a')
# palette: slot -> 4 shades (light, mid, dark, deepest). 'eye' optional.
PALETTES = {
    'ginger': {'A': ramp('f7b46e', 'e98c42', 'c8692f', '984721'), 'B': ramp('7a4a30', '5c3724', '412517', '2b140c'),
               'W': WHITE, 'K': ramp('4b3f45', '35292f', '251c22', '170f14')},
    'chestnut': {'A': ramp('b9724a', '9a5a38', '7a432a', '5a301d'), 'B': ramp('8a5232', '6c3d26', '502c1b', '371d12'),
                 'W': WHITE, 'K': ramp('4a3028', '38241e', '291912', '1a0f0b')},
    'chocolate': {'A': ramp('8c5e4a', '6e4638', '523126', '3a2119'), 'B': ramp('7c5240', '603c30', '472a21', '311c16'),
                  'W': WHITE, 'K': ramp('4a3028', '38241e', '291912', '1a0f0b')},
    'black': {'A': ramp('55525c', '3a3841', '27252c', '17161a'), 'B': ramp('dc7445', 'bb552e', '923c21', '6c2a17'),
              'W': WHITE, 'K': ramp('3a3841', '27252c', '1b1a1f', '101014')},
    'slate': {'A': ramp('b4b4b8', '8e8e94', '6c6c74', '4c4c54'), 'B': ramp('8e8e94', '6c6c74', '50505a', '383840'),
              'W': ramp('d8d8dc', 'bcbcc2', '9a9aa2', '7a7a82'), 'K': ramp('6c6c74', '50505a', '3a3a42', '27272d')},
    'cream': {'A': ramp('fff3d6', 'f8dfb2', 'e6c48e', 'c49e66'), 'B': ramp('f4cc98', 'e2ae74', 'c28c54', '966a42'),
              'W': WHITE, 'K': ramp('b88c60', '96704a', '745438', '553b27')},
    'white': {'A': ramp('fffdf8', 'f8eddd', 'e4cfb5', 'c7aa8a'), 'B': ramp('ffeae0', 'f4d4c8', 'deb2a8', 'bf8e88'),
              'W': WHITE, 'K': ramp('d8d0c4', 'b8ae9f', '968a7a', '73685a')},
    'cinnamon': {'A': ramp('d58a52', 'b86d3e', '94532f', '6c3a22'), 'B': ramp('a65634', '85412a', '672f1e', '481f14'),
                 'W': WHITE, 'K': ramp('6c3a22', '552c1b', '3f2014', '2a140d')},
    'agouti': {'A': ramp('c4ab84', '9a8260', '745f44', '4e3f2c'), 'B': ramp('94775a', '745a40', '56422e', '382a1c'),
               'W': WHITE, 'K': ramp('6a5640', '4e3f2c', '382c1f', '231b13')},
    'albino_pink': {'A': ramp('fdf6ea', 'f1e3cc', 'dcc9ab', 'bba88a'), 'B': ramp('ffeae0', 'f4d4c8', 'deb2a8', 'bf8e88'),
                    'W': WHITE, 'K': ramp('e8d8c4', 'd0bca4', 'b09c84', '8e7c66'), 'eye': hx('c2283a')},
}
# senior palettes are generated: desaturate and lighten slightly (a light fade, not a different animal)
FADE = {'sat': 0.72, 'light': 0.06}


def fade_ramp(r):
    out = []
    for c in r:
        a = np.array(c, float)
        g = a.mean()
        a = g + (a - g) * FADE['sat']
        a = a + (255 - a) * FADE['light']
        out.append([int(round(v)) for v in np.clip(a, 0, 255)])
    return out


# pattern: zone -> slot. 'tick': slot whose shades speckle the coat (roan). 'eye_pink': himalayan.
def pat(**kw):
    d = dict(N1='W', N2='W', H='A', C='A', S='A', M='A', R='A', T='A', B='W', L='W')
    d.update({k: v for k, v in kw.items() if k in d})
    d['X1'] = kw.get('X1', d['M'])
    d['X2'] = kw.get('X2', d['M'])
    d['X3'] = kw.get('X3', d['C'])
    if 'tick' in kw:
        d['tick'] = kw['tick']
    return d


PATTERNS = {
    'tricolor': pat(M='K'),
    'dutch': pat(S='W', T='W', B='W', L='W', R='A', M='A'),
    'himalayan': pat(N1='K', N2='K', H='W', C='W', S='W', M='W', R='W', T='W', L='K'),
    'roan': pat(N1='A', N2='K', B='A', L='K', tick='W'),
    'bicolor_head': pat(H='B', C='B', S='W', M='W', R='W', T='W', L='W', X1='B'),
    'saddle': pat(H='K', S='A', M='K', R='A', T='W', B='A', L='A'),
    'two_tone': pat(M='B', R='B', T='B', B='B', L='A'),
    'self': pat(N1='A', N2='A', B='A', L='A', X2='B', X3='B'),
}
DEFAULT_PATTERN = 'tricolor'
DEFAULT_PALETTE = 'ginger'
# legacy palette ids of the old game -> (pattern, palette)
LEGACY = {'tricolor': ('tricolor', 'ginger'), 'dutch': ('dutch', 'chestnut'), 'agouti': ('roan', 'agouti'),
          'albino': ('self', 'albino_pink'), 'cinnamon': ('self', 'cinnamon'), 'black_white': ('dutch', 'black'),
          'cream': ('self', 'cream')}
# named pigs of the collection: id -> (breed, build, pattern, palette)
NAMED = {'ned': ('teddy', 'chubby', 'bicolor_head', 'chocolate'), 'kuki': ('rosette', 'normal', 'two_tone', 'ginger'),
         'glen': ('rosette', 'lean', 'self', 'black'), 'james': ('teddy', 'normal', 'roan', 'slate'),
         'racuch': ('smooth', 'chubby', 'saddle', 'ginger')}


def slot_ramp(palette, slot, senior=False):
    r = PALETTES[palette][slot]
    return fade_ramp(r) if senior else r


def zone_ramp(pattern, palette, zone, senior=False, tick=False):
    p = PATTERNS[pattern]
    slot = p['tick'] if (tick and 'tick' in p) else p[zone]
    return slot_ramp(palette, slot, senior)


RUST = ramp('dc7445', 'bb552e', '923c21', '6c2a17')
ORANGE = PALETTES['ginger']['A']
# Unpainted look of the master sheet (legacy convention: ginger with a rust back, white belly/legs/muzzle). M is the only zone
# whose master colours are exactly the legacy rust ramp, so the legacy tricolor remap (rust -> dark) keeps its meaning.
MASTER_BASE = {'N1': WHITE, 'N2': WHITE, 'H': ORANGE, 'C': ORANGE, 'S': ORANGE, 'M': RUST, 'R': ORANGE, 'T': ORANGE,
               'B': WHITE, 'L': WHITE, 'X1': RUST, 'X2': RUST, 'X3': ORANGE}


def master_colour(zone, lv, tick=False):
    """Unique code colour for (zone, shade, tick): the unpainted look plus an offset (blue += zone index + 1, green += 1 for tick)."""
    base = MASTER_BASE[zone][lv]
    c = list(base)
    off = 0 if zone == 'M' else ZI[zone] + 1
    c[2] = c[2] + off if c[2] + off <= 255 else c[2] - off
    if tick:
        c[1] = c[1] + 1 if c[1] < 255 else c[1] - 1
    return c


def check_master_unique():
    seen = {}
    for z in ZONES:
        for lv in range(4):
            for t in (False, True):
                k = tuple(master_colour(z, lv, t))
                assert k not in seen, ('master colour collision', z, lv, t, seen[k])
                seen[k] = (z, lv, t)
    return seen


if __name__ == '__main__':
    print(len(check_master_unique()), 'unique master colours')
