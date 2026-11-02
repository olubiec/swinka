"""Exports every shipped sprite folder (zone-coded master sheets) and breeds.json v2.
Shapes = breed x build: smooth_normal lives in assets/sprites/<stage>/, the rest in assets/sprites/breeds/<breed>_<build>/<stage>/.
Legacy breed ids stay in breeds.json (chubby -> smooth_chubby, skinny -> smooth_lean, rosette -> rosette_normal, peruvian -> peruvian_normal).
Companion folders (adult only) are rendered with their legacy coat through the new pattern/palette model.
Usage: python export_all.py <assets_dir> [shape,shape] [stage,stage]"""
import json, os, shutil, sys
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export_sprites

STAGES = ['baby', 'junior', 'adult', 'senior', 'legend']
SHAPES = [('smooth', 'normal'), ('smooth', 'chubby'), ('smooth', 'lean'), ('teddy', 'normal'), ('teddy', 'chubby'),
          ('rosette', 'normal'), ('rosette', 'lean'), ('peruvian', 'normal')]
LEGACY = {'chubby': 'smooth_chubby', 'skinny': 'smooth_lean', 'rosette': 'rosette_normal', 'peruvian': 'peruvian_normal'}
COMP = {'companion_agouti': ('roan', 'agouti'), 'companion_black_white': ('dutch', 'black'), 'companion_cream': ('self', 'cream')}
DESC = {'smooth': 'Smooth', 'teddy': 'Teddy', 'rosette': 'Rosette', 'peruvian': 'Peruvian'}


def shape_id(b, u):
    return b + '_' + u


def folder_for(root, b, u, st):
    if (b, u) == ('smooth', 'normal'):
        return os.path.join(root, 'sprites', st)
    return os.path.join(root, 'sprites', 'breeds', shape_id(b, u), st)


def job(a):
    root, kind, b, u, st, desc = a
    if kind == 'companion':
        pat, pal = COMP[b]
        old = json.load(open(os.path.join(root, 'sprites', b, 'animations.json'), encoding='utf-8'))
        folder = os.path.join(root, 'sprites', b)
        export_sprites.write_variant(folder, 'adult', breed='smooth', build='normal', pattern=pat, palette=pal, master=False,
                                     desc=old['description'], descriptions=desc)
        for fn in ('animations.json', 'animations_x2.json'):
            m = json.load(open(os.path.join(folder, fn), encoding='utf-8')); m['variant'] = old['variant']
            json.dump(m, open(os.path.join(folder, fn), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        return folder
    folder = folder_for(root, b, u, st)
    label = (DESC[b] + ' ' + u + ' ' + st) if (b, u) != ('smooth', 'normal') else export_sprites.DESC[st]
    export_sprites.write_variant(folder, st, breed=b, build=u, desc=label, descriptions=desc)
    return folder


def write_index(root):
    shapes = {}
    for b, u in SHAPES:
        sid = shape_id(b, u)
        shapes[sid] = {'folder': '' if (b, u) == ('smooth', 'normal') else 'breeds/' + sid, 'breed': b, 'build': u,
                       'description': DESC[b] + ' ' + u}
    breeds = dict(shapes)
    for k, v in LEGACY.items():
        breeds[k] = {'folder': shapes[v]['folder'], 'description': 'Legacy id, same sheets as ' + v}
    breeds['smooth'] = {'folder': '', 'description': 'Smooth'}
    index = {'version': 2, 'default': 'smooth',
             'note': 'id -> folder holding <stage>/spritesheet.png etc. smooth uses the root stage folders. Shapes are breed x build; '
                     'legacy ids map to shapes. Sheets are zone-coded masters, coats come from palettes.json (patterns x palettes).',
             'adoptable': [shape_id(b, u) for b, u in SHAPES], 'breeds': breeds}
    json.dump(index, open(os.path.join(root, 'sprites', 'breeds.json'), 'w'), indent=1)


if __name__ == '__main__':
    root = sys.argv[1]
    shapes = [tuple(s.split('_')) for s in sys.argv[2].split(',')] if len(sys.argv) > 2 else SHAPES
    stages = sys.argv[3].split(',') if len(sys.argv) > 3 else STAGES
    desc = export_sprites.english_descriptions(root)
    jobs = [(root, 'shape', b, u, st, desc) for b, u in shapes for st in stages]
    if len(sys.argv) <= 2:
        jobs += [(root, 'companion', k, None, 'adult', desc) for k in COMP]
    with Pool(4) as pool:
        for f in pool.imap_unordered(job, jobs):
            print('wrote', f, flush=True)
    for old in ('chubby', 'skinny', 'rosette', 'peruvian'):   # the old breed folders are replaced by the shape folders
        d = os.path.join(root, 'sprites', 'breeds', old)
        if os.path.isdir(d):
            shutil.rmtree(d)
    write_index(root)
