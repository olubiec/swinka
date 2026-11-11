"""D3: nav bar assets (frame, title plate, arrow + edit buttons). Run from repo root: python art_src/d3_nav_bar.py
Palette: assets/data/style_palette.json only. Hard pixels, alpha 0/255."""
import json, os
from PIL import Image

OUT = os.path.join('assets', 'ui')
OL = '#3a1d17'
WOOD = ['#47281c', '#6f4328', '#9b6238', '#c58a52', '#e3b27a']
HAY = ['#a97a2f', '#d1a548', '#e9c871', '#f6e2a0']
LINEN = ['#b79d78', '#d9c096', '#efdcb8', '#fbf0d9']
BRICK = ['#5e2a2a', '#8c4237', '#b8604a', '#d9876b']
ROSE = ['#a65a68', '#d98a86', '#f2b5a0']

def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)

def canvas(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))

def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), rgb(c))

def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(im, x, y, c)

def body(im, x0, y0, x1, y1, fill, hi, shade):
    """Outlined box with cut corners, top-left light, bottom shade."""
    rect(im, x0, y0, x1, y1, OL)
    rect(im, x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill)
    rect(im, x0 + 1, y0 + 1, x1 - 1, y0 + 1, hi)
    rect(im, x0 + 1, y0 + 1, x0 + 1, y1 - 1, hi)
    rect(im, x0 + 1, y1 - 1, x1 - 1, y1 - 1, shade)
    for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
        im.putpixel((x, y), (0, 0, 0, 0))

def chevron(im, ox, oy, left, col):
    for y in range(9):
        d = abs(y - 4)
        xs = (d, d + 1) if left else (5 - d - 0, 5 - d - 1)
        if left: xs = (d, d + 1)
        else: xs = (5 - d, 4 - d)
        for x in xs: px(im, ox + x, oy + y, col)

# --- frame (9-slice) ---
def frame():
    w, h = 48, 26
    im = canvas(w, h)
    rect(im, 0, 0, w - 1, h - 1, OL)
    rect(im, 1, 1, w - 2, h - 2, WOOD[2])
    rect(im, 1, 1, w - 2, 1, WOOD[4])
    rect(im, 1, 2, w - 2, 2, WOOD[3])
    rect(im, 1, 3, 1, h - 3, WOOD[3])
    rect(im, 1, h - 3, w - 2, h - 3, WOOD[1])
    rect(im, 1, h - 2, w - 2, h - 2, WOOD[0])
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)): im.putpixel((x, y), (0, 0, 0, 0))
    for x in (4, 42):  # rivets, inside the 8 px caps
        rect(im, x, 12, x + 1, 13, HAY[1]); px(im, x, 12, HAY[3]); px(im, x + 1, 13, HAY[0])
    return im

# --- title plate (9-slice, flat centre: no seams under the text) ---
def plate():
    w, h = 64, 18
    im = canvas(w, h)
    rect(im, 0, 0, w - 1, h - 1, OL)
    rect(im, 1, 1, w - 2, h - 2, WOOD[1])
    rect(im, 2, 2, w - 3, h - 3, WOOD[0])
    rect(im, 1, h - 2, w - 2, h - 2, WOOD[0])
    rect(im, 1, 1, w - 2, 1, WOOD[2])
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)): im.putpixel((x, y), (0, 0, 0, 0))
    return im

PAL = {  # state -> (fill, hi, shade, lip)
    'normal': (BRICK[2], BRICK[3], BRICK[1], True),
    'hover': (BRICK[3], ROSE[2], BRICK[2], True),
    'pressed': (BRICK[2], BRICK[3], BRICK[1], False),
    'active': (HAY[1], HAY[3], HAY[0], False),
}

def button(w, h, state, glyph):
    im = canvas(w, h)
    fill, hi, shade, lip = PAL[state]
    dy = 0 if lip else 1
    if lip: rect(im, 2, h - 1, w - 3, h - 1, OL)
    body(im, 0, dy, w - 1, dy + h - 2, fill, hi, shade)
    glyph(im, dy, state)
    return im

def arrow_glyph(left):
    def g(im, dy, state):
        chevron(im, 7 if left else 7, 4 + dy, left, LINEN[3])
    return g

HAMMER = ['.hhhhhhh.', 'hhhhhhhhh', 'hhhhhhhhh', '.hhhhhhh.', '....ww...', '....ww...', '....ww...', '....ww...']
def edit_glyph(im, dy, state):
    act = state == 'active'
    cols = {'h': OL if act else LINEN[3], 'w': WOOD[1] if act else WOOD[4]}
    ox, oy = (24 - 9) // 2, 4 + dy
    for y, row in enumerate(HAMMER):
        for x, ch in enumerate(row):
            if ch == '.': continue
            c = cols[ch]
            if not act and ch == 'h' and y == 2: c = LINEN[1]
            if not act and ch == 'w' and x == 5: c = WOOD[3]
            px(im, ox + x, oy + y, c)

def save(im, name):
    im.save(os.path.join(OUT, name))

def main():
    save(frame(), 'nav_bar_frame.png'); json.dump({'slice': [8, 8, 8, 8]}, open(os.path.join(OUT, 'nav_bar_frame.json'), 'w'))
    save(plate(), 'nav_title_plate.png'); json.dump({'slice': [5, 5, 5, 5]}, open(os.path.join(OUT, 'nav_title_plate.json'), 'w'))
    for side in ('left', 'right'):
        for st, suf in (('normal', ''), ('hover', '_hover'), ('pressed', '_pressed')):
            save(button(20, 20, st, arrow_glyph(side == 'left')), f'nav_btn_arrow_{side}{suf}.png')
    for st, suf in (('normal', ''), ('hover', '_hover'), ('active', '_active')):
        save(button(24, 20, st, edit_glyph), f'nav_btn_edit{suf}.png')

main()
