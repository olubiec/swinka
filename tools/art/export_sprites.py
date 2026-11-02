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


def write_variant(folder, age, coat='ruda', breed='smooth', desc=None, descriptions=None):
    A, sheet = sheets.render(age, coat, breed)
    os.makedirs(folder, exist_ok=True)
    if descriptions is None:
        descriptions = {n: A[n]['opis'] for n in A}
    meta = {'variant': os.path.basename(folder) if breed == 'smooth' else breed + '_' + age,
            'description': desc or DESC.get(age, age), 'frame_size': [S, S], 'floor_y': FLOOR, 'facing': 'right', 'animations': {}}
    for r, n in enumerate(A):
        meta['animations'][n] = {'row': r, 'frames': len(A[n]['frames']), 'fps': sheets.fps_for(age, n, A[n]['fps']),
                                 'loop': A[n]['loop'], 'description': descriptions.get(n, A[n]['opis'])}
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
    for st in sys.argv[2].split(','):
        write_variant(os.path.join(root, 'sprites', st), st, descriptions=desc)
        print('wrote', st)
