"""Generates assets/sprites/breeds/<breed>/<stage>/ for chubby, skinny, rosette, peruvian (smooth keeps assets/sprites/<stage>/)
and assets/sprites/breeds.json. Usage: python export_breeds.py <assets_dir> [breed,breed] [stage,stage]"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export_sprites

BREEDS = ['chubby', 'skinny', 'rosette', 'peruvian']
STAGES = ['baby', 'junior', 'adult', 'senior', 'legend']
BREED_DESC = {'smooth': 'Smooth', 'chubby': 'Chubby', 'skinny': 'Skinny', 'rosette': 'Rosette', 'peruvian': 'Peruvian'}

if __name__ == '__main__':
    root = sys.argv[1]
    breeds = sys.argv[2].split(',') if len(sys.argv) > 2 else BREEDS
    stages = sys.argv[3].split(',') if len(sys.argv) > 3 else STAGES
    desc = export_sprites.english_descriptions(root)
    for b in breeds:
        for st in stages:
            export_sprites.write_variant(os.path.join(root, 'sprites', 'breeds', b, st), st, breed=b,
                                         desc=BREED_DESC[b] + ' ' + st, descriptions=desc)
            print('wrote', b, st, flush=True)
    index = {'default': 'smooth', 'note': 'breed -> folder holding <stage>/spritesheet.png etc. smooth uses the root stage folders',
             'breeds': {'smooth': {'folder': '', 'description': 'Smooth'}}}
    for b in BREEDS:
        index['breeds'][b] = {'folder': 'breeds/' + b, 'description': BREED_DESC[b]}
    json.dump(index, open(os.path.join(root, 'sprites', 'breeds.json'), 'w'), indent=1)
