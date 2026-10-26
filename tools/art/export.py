"""Eksport: arkusze klatek dla każdego wariantu, JSON, GIF-y, ikony, arkusz kontrolny.
Użycie: python3 narzedzia/export.py <folder_wyjściowy>"""
import importlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
import pig
from pig import S

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'eksport')
VARIANTS = [
    ('dorosla', 'adult', 'ruda', 'Dorosła (ruda)'),
    ('maluch', 'baby', 'ruda', 'Maluch'),
    ('mlodzik', 'junior', 'ruda', 'Młodzik'),
    ('senior', 'senior', 'ruda', 'Senior'),
    ('legenda', 'legend', 'ruda', 'Legenda'),
    ('towarzysz_czarno-biala', 'adult', 'czarno-biala', 'Towarzysz: czarno-biała'),
    ('towarzysz_agouti', 'adult', 'agouti', 'Towarzysz: agouti'),
    ('towarzysz_kremowa', 'adult', 'kremowa', 'Towarzysz: kremowa'),
]
SLOW = {'walk', 'run', 'popcorn', 'follow', 'flee', 'greet', 'hurdle', 'spin', 'ball_push', 'tunnel_in', 'tunnel_out',
        'house_enter', 'house_exit', 'come_called', 'dance'}
NOT_LOOP_NOTE = 'front_look to 5 klatek do śledzenia kursora: 0 lewo, 1 prawo, 2 góra, 3 dół, 4 środek'


def build(age, coat):
    pig.set_style(age, coat)
    import anims, anims2
    importlib.reload(anims)
    importlib.reload(anims2)
    return anims.A


os.makedirs(OUT, exist_ok=True)
index = {'frame_size': [S, S], 'floor_y': 59, 'facing': 'right', 'uwaga': NOT_LOOP_NOTE, 'warianty': {}}
for key, age, coat, label in VARIANTS:
    A = build(age, coat)
    names = list(A)
    maxf = max(len(A[n]['frames']) for n in names)
    sheet = Image.new('RGBA', (S * maxf, S * len(names)), (0, 0, 0, 0))
    meta = {'wariant': key, 'opis': label, 'frame_size': [S, S], 'floor_y': 59, 'facing': 'right', 'animations': {}}
    for r, n in enumerate(names):
        a = A[n]
        fps = a['fps']
        if age in ('senior', 'legend') and n in SLOW:
            fps = max(1, round(fps * 0.8))
        for i, f in enumerate(a['frames']):
            sheet.alpha_composite(Image.fromarray(f, 'RGBA'), (i * S, r * S))
        meta['animations'][n] = {'row': r, 'frames': len(a['frames']), 'fps': fps, 'loop': a['loop'], 'opis': a['opis']}
    vdir = os.path.join(OUT, key)
    os.makedirs(vdir, exist_ok=True)
    sheet.save(os.path.join(vdir, 'swinka_spritesheet.png'), optimize=True)
    json.dump(meta, open(os.path.join(vdir, 'swinka_animacje.json'), 'w'), ensure_ascii=False, indent=2)
    index['warianty'][key] = {'opis': label, 'folder': key, 'animacji': len(names),
                              'klatek': sum(len(A[n]['frames']) for n in names)}
    if key == 'dorosla':
        gdir = os.path.join(OUT, 'gif')
        os.makedirs(gdir, exist_ok=True)
        for n in names:
            a = A[n]
            fr = []
            for f in a['frames']:
                c = Image.new('RGBA', (S * 5, S * 5), (240, 230, 212, 255))
                c.alpha_composite(Image.fromarray(f, 'RGBA').resize((S * 5, S * 5), Image.NEAREST))
                fr.append(c.convert('RGB'))
            fr[0].save(os.path.join(gdir, f'{n}.gif'), save_all=True, append_images=fr[1:],
                       duration=int(1000 / a['fps']), loop=0)
        # arkusz kontrolny
        sc, lab = 2, 100
        ctl = Image.new('RGB', (lab + S * sc * maxf, S * sc * len(names)), (240, 230, 212))
        d = ImageDraw.Draw(ctl)
        for r, n in enumerate(names):
            d.text((6, r * S * sc + 6), n, fill=(60, 30, 20))
            for i, f in enumerate(A[n]['frames']):
                im = Image.fromarray(f, 'RGBA').resize((S * sc, S * sc), Image.NEAREST)
                ctl.paste(im, (lab + i * S * sc, r * S * sc), im)
        ctl.save(os.path.join(OUT, 'kontrola.png'))
    print(key, len(names), 'animacji')

# ikony przedmiotów
pig.set_style()
import props
importlib.reload(props)
I = props.icons()
names = list(I)
ic = Image.new('RGBA', (16 * len(names), 16), (0, 0, 0, 0))
for i, n in enumerate(names):
    ic.alpha_composite(Image.fromarray(I[n], 'RGBA'), (i * 16, 0))
idir = os.path.join(OUT, 'ikony')
os.makedirs(idir, exist_ok=True)
ic.save(os.path.join(idir, 'ikony_16.png'))
json.dump({'size': 16, 'ikony': {n: i for i, n in enumerate(names)}}, open(os.path.join(idir, 'ikony.json'), 'w'),
          ensure_ascii=False, indent=2)
index['ikony'] = names
json.dump(index, open(os.path.join(OUT, 'warianty.json'), 'w'), ensure_ascii=False, indent=2)
print('ikony', len(names))
