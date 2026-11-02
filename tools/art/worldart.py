"""Shared pixel helpers for the world art (icons, farm, items, tiles). Built on decor.Im.
Style: outline #3a1d17, 3-4 tones per material, light from top-left, no anti-aliasing."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from decor import Im, H, hs, OUT

def mix(a, b, t):
    a, b = H(a) if isinstance(a, str) else a, H(b) if isinstance(b, str) else b
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

def ramp(base):
    """(light, mid, dark, deep) from one base colour."""
    return (mix(base, 'ffffff', 0.38), tuple(H(base)) if isinstance(base, str) else base, mix(base, '3a1d17', 0.30), mix(base, '3a1d17', 0.55))

PAL = dict(
    red='d94a3e', orange='f2923a', yellow='f2c94c', green='5fa043', lime='8cc152', darkgreen='3d7a35', blue='4a84c4', lblue='8ec9f0',
    purple='8a5fb0', fabric='c4628c', hay='cdb556', carrot='f28a2e', pink='f08cb2', brown='9c6636', dbrown='6e4424', wood='c98d50', stone='a9a39a', dstone='7c766e', white='f8f4ea',
    cream='f6ead2', black='2b2630', soil='7a4f30', gold='f2c94c', grey='b8b0a5', sky='bfe3f7', water='5aa6dc')

def C(n):
    return PAL[n] if n in PAL else n

def blob(im, cx, cy, rx, ry, base):
    m = im.ell_mask(cx, cy, rx, ry)
    u = (im.xx + 0.5 - cx) / rx
    v = (im.yy + 0.5 - cy) / ry
    b = -(0.55 * u + 0.8 * v)
    lv = np.where(b > 0.4, 0, np.where(b > -0.25, 1, np.where(b > -0.7, 2, 3)))
    rp = ramp(C(base))
    for k in range(4):
        im.mask(m & (lv == k), rp[k])
    return m

def box(im, x0, y0, x1, y1, base, top=True):
    """Lit box: top-left highlight, bottom-right shade."""
    rp = ramp(C(base))
    im.rect(x0, y0, x1, y1, rp[1])
    im.rect(x0, y0, x1, y0 + 1, rp[0])
    im.rect(x0, y0, x0 + 1, y1, rp[0])
    im.rect(x0, y1 - 1, x1, y1, rp[2])
    im.rect(x1 - 1, y0, x1, y1, rp[2])

def shadow(im, cx, y, rx, ry=1.5):
    m = im.ell_mask(cx, y, rx, ry) & (im.a[..., 3] == 0)
    im.a[m] = [30, 20, 20, 70]

def finish(im, outline=True):
    if outline:
        im.outline()
    return im

def save_png(im, path, x2=True):
    from PIL import Image
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(im.a, 'RGBA').save(path, optimize=True)
    if x2:
        Image.fromarray(np.repeat(np.repeat(im.a, 2, 0), 2, 1), 'RGBA').save(path.replace('.png', '_x2.png'), optimize=True)

def sheet(ims, cols, pad=2, bg=(236, 228, 214, 255), scale=3):
    from PIL import Image
    w = max(i.w for i in ims) + pad; h = max(i.h for i in ims) + pad
    rows = (len(ims) + cols - 1) // cols
    out = np.zeros((rows * h + pad, cols * w + pad, 4), np.uint8); out[:] = bg
    for k, i in enumerate(ims):
        y, x = (k // cols) * h + pad, (k % cols) * w + pad
        sl = out[y:y + i.h, x:x + i.w]
        a = i.a[..., 3:4] / 255.0
        sl[..., :3] = (i.a[..., :3] * a + sl[..., :3] * (1 - a)).astype(np.uint8)
    return Image.fromarray(out, 'RGBA').resize((out.shape[1] * scale, out.shape[0] * scale), Image.NEAREST)


def pack(groups, root, name, width=256):
    """groups: {id: [Im,...]} -> root/name.png atlas + root/name.json (id -> frames [x,y,w,h]). Also x2 atlas."""
    import json
    from PIL import Image
    x = y = rowh = 0; pl = {}
    for id, fr in groups.items():
        for i, im in enumerate(fr):
            if x + im.w > width:
                x, y, rowh = 0, y + rowh, 0
            pl[(id, i)] = (x, y, im.w, im.h); x += im.w; rowh = max(rowh, im.h)
    H_ = y + rowh
    at = np.zeros((H_, width, 4), np.uint8)
    for (id, i), (px_, py, w, h) in pl.items():
        at[py:py + h, px_:px_ + w] = groups[id][i].a
    os.makedirs(root, exist_ok=True)
    Image.fromarray(at, 'RGBA').save(os.path.join(root, name + '.png'), optimize=True)
    Image.fromarray(np.repeat(np.repeat(at, 2, 0), 2, 1), 'RGBA').save(os.path.join(root, name + '_x2.png'), optimize=True)
    meta = {id: [list(pl[(id, i)]) for i in range(len(fr))] for id, fr in groups.items()}
    json.dump({'atlas': name + '.png', 'atlas_x2': name + '_x2.png', 'size': [width, H_], 'frames': meta}, open(os.path.join(root, name + '.json'), 'w'), indent=1)
    return meta
