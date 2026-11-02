"""Exports the five named pigs as baked sheets (own colours, no remap): assets/sprites/pigs/<id>/<stage>/ + pigs.json.
Usage: python export_named.py <assets_dir> [id,id] [stage,stage]"""
import json, os, sys
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export_sprites
import coatgen

STAGES = ['baby', 'junior', 'adult', 'senior', 'legend']
PIGS = {'ned': ('teddy', 'chubby'), 'kuki': ('rosette', 'normal'), 'glen': ('rosette', 'lean'), 'james': ('teddy', 'normal'),
        'racuch': ('smooth', 'chubby')}


def job(a):
    root, pid, st, desc = a
    b, u = PIGS[pid]
    folder = os.path.join(root, 'sprites', 'pigs', pid, st)
    export_sprites.write_variant(folder, st, breed=b, build=u, named=pid, master=False, desc='%s %s' % (pid.capitalize(), st), descriptions=desc)
    return folder


if __name__ == '__main__':
    root = sys.argv[1]
    ids = sys.argv[2].split(',') if len(sys.argv) > 2 else list(PIGS)
    stages = sys.argv[3].split(',') if len(sys.argv) > 3 else STAGES
    desc = export_sprites.english_descriptions(root)
    with Pool(4) as pool:
        for f in pool.imap_unordered(job, [(root, p, s, desc) for p in ids for s in stages]):
            print('wrote', f, flush=True)
    idx = {'version': 1, 'note': 'Baked sheets of the five named pigs (own colours, not remapped by palettes.json). Folder = pigs/<id>/<stage>/.',
           'pigs': {p: {'breed': b, 'build': u, 'stages': STAGES, 'eye': '#' + coatgen.EYES[p]} for p, (b, u) in PIGS.items()}}
    json.dump(idx, open(os.path.join(root, 'sprites', 'pigs', 'pigs.json'), 'w'), indent=1)
