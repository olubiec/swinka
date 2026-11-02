"""Structural check of sprite folders. Usage: python check_sprites.py <folder> [<folder> ...]
Checks: sheet sizes, x2 == nearest-neighbour of x1, json tables match the sheet, no empty frames (except peek 0 and 11),
no opaque pixel on the frame border (clipping) except known prop animations, lowest opaque row <= 60 for idle."""
import json, os, sys
import numpy as np
from PIL import Image

ALLOW_EMPTY = {('peek', 0), ('peek', 11)}
ALLOW_CLIP = {'peek', 'sleep_house', 'ball_push', 'house_enter', 'house_exit', 'tunnel_in', 'tunnel_out'}  # prop animations clip by design


def check(folder, ref=None):
    errs = []
    sp = os.path.join(folder, 'spritesheet.png')
    a = np.array(Image.open(sp).convert('RGBA'))
    b = np.array(Image.open(os.path.join(folder, 'spritesheet_x2.png')).convert('RGBA'))
    if a.shape != (3840, 1024, 4): errs.append(f'size {a.shape}')
    if b.shape != (7680, 2048, 4): errs.append(f'x2 size {b.shape}')
    elif not (np.repeat(np.repeat(a, 2, 0), 2, 1) == b).all(): errs.append('x2 is not nearest of x1')
    j = json.load(open(os.path.join(folder, 'animations.json'), encoding='utf-8'))
    j2 = json.load(open(os.path.join(folder, 'animations_x2.json'), encoding='utf-8'))
    an = j['animations']
    if len(an) != 60: errs.append(f'{len(an)} animations')
    if sum(v['frames'] for v in an.values()) != 592: errs.append('frame total != 592')
    if j2['frame_size'] != [128, 128] or j2['floor_y'] != 118: errs.append('x2 json header')
    for n, v in an.items():
        r = v['row']
        if ref and (ref['animations'][n]['row'], ref['animations'][n]['frames']) != (r, v['frames']): errs.append(f'{n}: table differs from reference')
        for i in range(16):
            fr = a[r * 64:(r + 1) * 64, i * 64:(i + 1) * 64]
            op = fr[..., 3] > 0
            if i >= v['frames']:
                if op.any(): errs.append(f'{n}[{i}] has pixels beyond frames')
                continue
            if not op.any():
                if (n, i) not in ALLOW_EMPTY: errs.append(f'{n}[{i}] empty')
                continue
            if n not in ALLOW_CLIP and (op[0].any() or op[-1].any() or op[:, 0].any() or op[:, -1].any()):
                errs.append(f'{n}[{i}] touches frame border')
    return errs


if __name__ == '__main__':
    ref = None
    bad = 0
    for f in sys.argv[1:]:
        e = check(f, ref)
        print(('FAIL ' if e else 'ok   ') + f)
        for x in e[:12]: print('   ', x)
        bad += len(e)
    sys.exit(1 if bad else 0)
