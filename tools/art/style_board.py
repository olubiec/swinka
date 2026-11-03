"""Render docs/album/stylbook/paleta.png from assets/data/style_palette.json (read only)."""
import json
import sys
from PIL import Image, ImageDraw


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def main(root='assets', out='docs/album/stylbook/paleta.png'):
    pal = json.load(open(f'{root}/data/style_palette.json'))
    ramps = pal['ramps']
    sw = 44
    W = 40 + 5 * sw + 150
    rows = len(ramps) + 7
    im = Image.new('RGB', (W + 360, 40 + rows * (sw + 8) + 30), hx('#fbf0d9'))
    d = ImageDraw.Draw(im)
    y = 20
    d.text((20, y), 'cuy-hay-house: ramps (dark -> light)', fill=hx('#3a1d17'))
    y += 18
    for name, cols in ramps.items():
        d.text((20, y + sw // 2 - 5), name, fill=hx('#3a1d17'))
        for i, c in enumerate(cols):
            x = 90 + i * sw
            d.rectangle([x, y, x + sw - 2, y + sw - 2], fill=hx(c), outline=hx('#3a1d17'))
        y += sw + 6
    # outlines
    d.text((20, y + 10), 'outline', fill=hx('#3a1d17'))
    for i, c in enumerate(pal['outline'].values()):
        x = 90 + i * sw
        d.rectangle([x, y, x + sw - 2, y + sw - 2], fill=hx(c))
    y += sw + 10
    # skies by time of day, to the right
    x0 = 90 + 5 * sw + 40
    yy = 38
    d.text((x0, 20), 'sky by time of day', fill=hx('#3a1d17'))
    for tod, cols in pal['roles']['sky'].items():
        d.text((x0, yy + 14), tod, fill=hx('#3a1d17'))
        for i, c in enumerate(cols):
            xx = x0 + 70 + i * 70
            d.rectangle([xx, yy, xx + 66, yy + 40], fill=hx(c), outline=hx('#3a1d17'))
        yy += 52
    # glow strip
    d.text((x0, yy + 10), 'glow (lamp, candle)', fill=hx('#3a1d17'))
    for i, c in enumerate(pal['roles']['glow']):
        xx = x0 + 150 + i * 60
        d.rectangle([xx, yy, xx + 56, yy + 30], fill=hx(c), outline=hx('#3a1d17'))
    import os
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out)
    n = sum(len(v) for v in ramps.values()) + 2
    print('colors', n, '->', out)


if __name__ == '__main__':
    main(*sys.argv[1:])
