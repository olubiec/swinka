"""Proof for palettes: for every stage x palette, the sheet rendered with that coat must equal the remap of the ginger sheet
pixel for pixel. Also checks remapped agouti/black_white/cream == committed companion sheets.
Usage: python verify_palettes.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import palettes, sheets

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
STAGES = ['baby', 'junior', 'adult', 'senior', 'legend']


def remap(sheet, pairs):
    out = sheet.copy()
    for a, b in pairs:
        ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
        cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
        m = (sheet[..., 0] == ca[0]) & (sheet[..., 1] == ca[1]) & (sheet[..., 2] == ca[2]) & (sheet[..., 3] == 255)
        out[m, 0], out[m, 1], out[m, 2] = cb
    return out


def main():
    data = palettes.build()
    bad = 0
    ginger = {}
    for st in STAGES:
        _, ginger[st] = sheets.render(st, 'ruda')
    for st in STAGES:
        for pid, coat in palettes.PALETTES.items():
            _, ref = sheets.render(st, coat)
            diff = int((remap(ginger[st], data['palettes'][pid]) != ref).any(axis=2).sum())
            print(f'{st:7s} {pid:12s} differing pixels: {diff}')
            bad += diff
    for br in ('chubby', 'skinny', 'rosette', 'peruvian'):   # breeds at adult stage
        _, gb = sheets.render('adult', 'ruda', br)
        for pid, coat in palettes.PALETTES.items():
            _, ref = sheets.render('adult', coat, br)
            diff = int((remap(gb, data['palettes'][pid]) != ref).any(axis=2).sum())
            print(f'{br:8s} adult {pid:12s} differing pixels: {diff}')
            bad += diff
    for pid, folder in (('agouti', 'companion_agouti'), ('black_white', 'companion_black_white'), ('cream', 'companion_cream')):
        comm = np.array(Image.open(os.path.join(ROOT, 'assets', 'sprites', folder, 'spritesheet.png')).convert('RGBA'))
        diff = int((remap(ginger['adult'], data['palettes'][pid]) != comm).any(axis=2).sum())
        print(f'adult remap({pid}) vs {folder}: {diff}')
        bad += diff
    committed = json.load(open(os.path.join(ROOT, 'assets', 'sprites', 'palettes.json')))
    if committed != data:
        print('assets/sprites/palettes.json is out of date; run palettes.py')
        bad += 1
    print('TOTAL DIFFERENCES:', bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
