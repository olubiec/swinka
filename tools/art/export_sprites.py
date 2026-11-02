"""Writes sprite folders in the assets/ layout (spritesheet.png, spritesheet_x2.png, animations.json, animations_x2.json).
Usage: python export_sprites.py <assets_dir> stage1,stage2   (stages: baby junior adult senior legend; ginger smooth)
Breeds: python export_breeds.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import sheets
from pig import S, FLOOR

DESC = {'baby': 'Baby', 'junior': 'Junior', 'adult': 'Adult (ginger)', 'senior': 'Senior', 'legend': 'Legend'}


def write_variant(folder, age, coat='ruda', breed='smooth', desc=None, descriptions=None, build='normal', pattern=None, palette=None, master=None):
    A, sheet = sheets.render(age, coat, breed, build, pattern, palette, master)
    os.makedirs(folder, exist_ok=True)
    if descriptions is None:
        descriptions = {n: A[n]['opis'] for n in A}
    meta = {'variant': os.path.basename(folder) if (breed, build) == ('smooth', 'normal') else breed + '_' + build + '_' + age,
            'description': desc or DESC.get(age, age), 'frame_size': [S, S], 'floor_y': FLOOR, 'facing': 'right', 'animations': {}}
    for r, n in enumerate(A):
        meta['animations'][n] = {'row': r, 'frames': len(A[n]['frames']), 'fps': sheets.fps_for(age, n, A[n]['fps']),
                                 'loop': A[n]['loop'], 'description': descriptions.get(n, A[n]['opis'])}
    rot = {'note': 'Strips that share the row of a host animation (frame units, valid for x1 and x2 sheets). Not part of animations.json.',
           'strips': {n: {'row': list(A).index(x['host']), 'col': x['col'], 'frames': len(x['frames']), 'fps': sheets.fps_for(age, n, x['fps']),
                          'loop': x['loop'], 'description': x['opis']} for n, x in sheets.EXTRA().items()}}
    json.dump(rot, open(os.path.join(folder, 'rotation.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(folder, 'spritesheet.png'), optimize=True)
    x2 = Image.fromarray(sheet, 'RGBA').resize((sheet.shape[1] * 2, sheet.shape[0] * 2), Image.NEAREST)
    x2.save(os.path.join(folder, 'spritesheet_x2.png'), optimize=True)
    json.dump(meta, open(os.path.join(folder, 'animations.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    m2 = json.loads(json.dumps(meta))
    m2['frame_size'] = [S * 2, S * 2]
    m2['floor_y'] = FLOOR * 2
    json.dump(m2, open(os.path.join(folder, 'animations_x2.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return A, sheet


def english_descriptions(root):
    return {n: v['description'] for n, v in json.load(open(os.path.join(root, 'sprites', 'adult', 'animations.json')))['animations'].items()}


if __name__ == '__main__':
    root = sys.argv[1]
    desc = english_descriptions(root)
    COMP = {'companion_agouti': ('adult', 'agouti'), 'companion_black_white': ('adult', 'czarno-biala'),
            'companion_cream': ('adult', 'kremowa')}
    for st in sys.argv[2].split(','):
        folder = os.path.join(root, 'sprites', st)
        if st in COMP:
            old = json.load(open(os.path.join(folder, 'animations.json'), encoding='utf-8'))
            write_variant(folder, COMP[st][0], coat=COMP[st][1], desc=old['description'], descriptions=desc)
            m = json.load(open(os.path.join(folder, 'animations.json'), encoding='utf-8')); m['variant'] = old['variant']
            json.dump(m, open(os.path.join(folder, 'animations.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            m2 = json.load(open(os.path.join(folder, 'animations_x2.json'), encoding='utf-8')); m2['variant'] = old['variant']
            json.dump(m2, open(os.path.join(folder, 'animations_x2.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        else:
            write_variant(folder, st, descriptions=desc)
        print('wrote', st, flush=True)
