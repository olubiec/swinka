"""Photo | sprite comparison sheets for the five named pigs -> docs/album/compare/<pig>.png and docs/reference/pigs/looks.json.
Usage: python compare.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
import lookup as L
import patterns as PT

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PHOTOS = {'ned': ['ned_01_topdown', 'ned_02_front'], 'kuki': ['kuki_01_parsley_back', 'kuki_02_rosettes'], 'glen': ['glen_01_rosette_black'],
          'james': ['james_01_scale_928g'], 'racuch': ['racuch_01_scale_1032g', 'racuch_02_dill', 'racuch_03_scale_848g']}
CHAR = {'ned': 'lazy, glutton, poops a lot, chubby, curious', 'kuki': 'friendly, calm, neutral', 'glen': 'barely moves, calm, cuddly, lean, eats little',
        'james': 'skittish, loud, strong', 'racuch': 'chubby, active, calm, funny'}
DETAIL = {'ned': 'white body, chocolate head and ears, narrow white blaze with pink nose, heart on the lower back, teddy fuzz',
          'kuki': 'ginger front, dark brown rump and flanks, rosettes on the rump and shoulders, white blaze, pink ears',
          'glen': 'black, shaggy, lean, rust streak on the flank, rosettes',
          'james': 'slate grey roan (light speckles), dark muzzle and feet, rough teddy coat, strong build',
          'racuch': 'ginger, black cap and saddle, white blaze and muzzle, white rump tip, smooth coat, chubby'}


def panel(name):
    sh, pt, pl = L.look_of(name)
    ph = []
    for p in PHOTOS[name]:
        im = Image.open(os.path.join(REPO, 'docs', 'reference', 'pigs', p + '.jpg')).convert('RGB')
        im = im.resize((int(im.width * 300 / im.height), 300))
        ph.append(im)
    fr = [L.frame(sh, 'adult', pt, pl, a, i) for a, i in (('idle', 0), ('walk', 2), ('eat', 4), ('front_idle', 0), ('idle_34', 0), ('turn', 1))]
    row1 = L.tile(fr, 4)
    st = L.tile([L.frame(sh, s, pt, pl, 'idle', 0) for s in ('baby', 'junior', 'adult', 'senior', 'legend')], 4)
    W = sum(i.width for i in ph) + max(row1.width, st.width) + 30
    out = Image.new('RGB', (W, 520), (250, 246, 238))
    x = 0
    for i in ph:
        out.paste(i, (x, 0)); x += i.width + 10
    out.paste(row1, (x + 10, 0)); out.paste(st, (x + 10, 260))
    return out


if __name__ == '__main__':
    d = os.path.join(REPO, 'docs', 'album', 'compare')
    os.makedirs(d, exist_ok=True)
    looks = {}
    for n in PHOTOS:
        panel(n).save(os.path.join(d, n + '.png'), optimize=True)
        b, u, pt, pl = PT.NAMED[n]
        looks[n] = {'breed': b, 'build': u, 'pattern': pt, 'palette': pl, 'photos': PHOTOS[n], 'traits': CHAR[n], 'detail': DETAIL[n]}
        print('wrote', n)
    json.dump({'note': 'Look of the five named pigs (graphics). Sheets: shape = breed_build, coat = pattern.palette in palettes.json (senior: add @senior).',
               'pigs': looks}, open(os.path.join(REPO, 'docs', 'reference', 'pigs', 'looks.json'), 'w'), indent=1)
