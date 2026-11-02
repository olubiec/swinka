"""Proof for the coat model: for every checked (pattern, palette) and stage, the sheet rendered directly with that coat must equal
the exact colour remap of the zone-coded master sheet, pixel for pixel. Usage: python verify_palettes.py [quick]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import palettes, patterns as PT, sheets

SHAPES = [('smooth', 'normal')]


def remap(sheet, pairs):
    out = sheet.copy()
    for a, b in pairs:
        ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
        cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
        m = (sheet[..., 0] == ca[0]) & (sheet[..., 1] == ca[1]) & (sheet[..., 2] == ca[2]) & (sheet[..., 3] == 255)
        out[m, 0], out[m, 1], out[m, 2] = cb
    return out


def combos(quick):
    pats = list(PT.PATTERNS)
    pals = list(PT.PALETTES)
    out = [(p, PT.DEFAULT_PALETTE) for p in pats] + [(PT.DEFAULT_PATTERN, q) for q in pals if q != PT.DEFAULT_PALETTE]
    out += [(p, q) for (_, _, p, q) in PT.NAMED.values() if (p, q) not in out]
    return out[:6] if quick else out


def main():
    quick = len(sys.argv) > 1 and sys.argv[1] == 'quick'
    bad = 0
    for st in (['adult', 'senior'] if not quick else ['adult']):
        for br, bu in SHAPES:
            _, master = sheets.render(st, breed=br, build=bu)
            for pat, pal in combos(quick):
                _, ref = sheets.render(st, breed=br, build=bu, pattern=pat, palette=pal, master=False)
                diff = int((remap(master, palettes.pairs(pat, pal, st == 'senior')) != ref).any(axis=2).sum())
                print(f'{st:7s} {br}_{bu:7s} {pat:13s} {pal:12s} differing pixels: {diff}', flush=True)
                bad += diff
    print('TOTAL DIFFERENCES:', bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
