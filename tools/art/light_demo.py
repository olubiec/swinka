"""Prototyp systemu swiatla: ambient pory dnia + zrodla swiatla (on/off), wynik zawsze w palecie stylu.
Uzycie: python3 tools/art/light_demo.py [scena.png] [out.png]
To tylko dowod koncepcji dla docs/STYL_SWIATA.md pkt 3 (nie kod gry)."""
import json
import sys
import numpy as np
from PIL import Image, ImageDraw

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.5


def hx(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], float) / 255.0


def palette():
    p = json.load(open('assets/data/style_palette.json'))
    cols = [hx(c) for r in p['ramps'].values() for c in r] + [hx(c) for c in p['outline'].values()]
    return np.array(cols)


AMBIENT = {  # (kolor mnoznika, poziom)
    'morning': (np.array([1.00, 0.88, 0.78]), 0.82),
    'day': (np.array([1.00, 0.97, 0.90]), 1.00),
    'evening': (np.array([1.00, 0.72, 0.55]), 0.72),
    'night': (np.array([0.55, 0.62, 0.95]), 0.62),
}
# typ: (kolor, promien w px, sila, migotanie)
LIGHTS = {
    'lamp': ((1.0, 0.72, 0.38), 170, 1.0, 0.0),
    'mushroom': ((1.0, 0.55, 0.22), 140, 1.1, 0.0),
    'salt': ((1.0, 0.58, 0.45), 110, 0.8, 0.03),
    'lava': ((0.86, 0.32, 0.55), 110, 0.8, 0.05),
    'fireplace': ((1.0, 0.48, 0.2), 230, 1.2, 0.12),
    'candle': ((1.0, 0.80, 0.42), 80, 0.9, 0.10),
}


def render(img, tod, lights, seed=0):
    P = palette()
    a = np.asarray(img.convert('RGB'), float) / 255.0
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    amb_c, amb_l = AMBIENT[tod]
    illum = np.ones((h, w, 3)) * (amb_c * amb_l)
    glow = np.zeros((h, w, 3))
    rng = np.random.RandomState(seed)
    for kind, x, y in lights:
        col, r, s, fl = LIGHTS[kind]
        r = r * (1 + rng.uniform(-fl, fl))
        d = np.sqrt((xx - x) ** 2 + ((yy - y) * 1.25) ** 2) / r
        f = np.clip(1 - d, 0, 1) ** 1.6 * s
        f = np.floor(f * 5 + BAYER[yy % 4, xx % 4] + 0.5) / 5  # 5 stopni + dither
        f = np.clip(f, 0, 1)[..., None]
        illum = illum + f * np.array(col) * (1.15 if tod in ('evening', 'night') else 0.55)
        glow = glow + f * np.array(col) * 0.22
    out = np.clip(a * illum, 0, 1)
    out = 1 - (1 - out) * (1 - np.clip(glow, 0, 1))
    out = out + BAYER[yy % 4, xx % 4][..., None] * 0.035
    # najblizszy kolor palety (wazone RGB, ciemne kolory z przesunieciem w sliwke)
    flat = out.reshape(-1, 3)
    wgt = np.array([0.9, 1.0, 0.8])
    d2 = (((flat[:, None, :] - P[None]) * wgt) ** 2).sum(-1)
    q = P[d2.argmin(1)].reshape(h, w, 3)
    return Image.fromarray((q * 255).astype(np.uint8))


def main(scene='docs/album/podglad/dom.png', out='docs/album/stylbook/swiatlo_demo.png'):
    img = Image.open(scene)
    w, h = img.size
    cases = [
        ('rano, wszystko zgaszone', 'morning', []),
        ('dzien', 'day', []),
        ('wieczor: lampa + swieca', 'evening', [('lamp', 160, 120), ('candle', 330, 205)]),
        ('noc: sama swieca', 'night', [('candle', 330, 205)]),
        ('noc: kominek', 'night', [('fireplace', 600, 330)]),
        ('noc: lampa solna + lava', 'night', [('salt', 470, 170), ('lava', 60, 330)]),
        ('noc: grzybek + lampa', 'night', [('mushroom', 560, 230), ('lamp', 160, 120)]),
        ('noc: wszystko zgaszone', 'night', []),
    ]
    sheet = Image.new('RGB', (w * 2 + 30, (h + 26) * 4 + 10), (251, 240, 217))
    d = ImageDraw.Draw(sheet)
    for i, (name, tod, ls) in enumerate(cases):
        x, y = 10 + (i % 2) * (w + 10), 6 + (i // 2) * (h + 26)
        d.text((x, y), name, fill=(58, 29, 23))
        sheet.paste(render(img, tod, ls, seed=i), (x, y + 14))
    sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.NEAREST)
    sheet.save(out)
    print(out, sheet.size)


if __name__ == '__main__':
    main(*sys.argv[1:])
