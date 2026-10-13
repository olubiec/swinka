import base64, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
ex = sys.argv[1]
t = open(os.path.join(here, 'galeria_szablon.html'), encoding='utf-8').read()
idx = json.load(open(os.path.join(ex, 'warianty.json'), encoding='utf-8'))
def b64(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
sheets, metas, labels = {}, {}, {}
for k, v in idx['warianty'].items():
    sheets[k] = b64(os.path.join(ex, k, 'swinka_spritesheet.png'))
    metas[k] = json.load(open(os.path.join(ex, k, 'swinka_animacje.json'), encoding='utf-8'))
    labels[k] = v['opis']
icm = json.load(open(os.path.join(ex, 'ikony', 'ikony.json'), encoding='utf-8'))['ikony']
t = (t.replace('__SHEETS__', json.dumps(sheets)).replace('__METAS__', json.dumps(metas, ensure_ascii=False))
      .replace('__ICONS__', b64(os.path.join(ex, 'ikony', 'ikony_16.png'))).replace('__ICONMETA__', json.dumps(icm))
      .replace('__VLABELS__', json.dumps(labels, ensure_ascii=False)))
open(os.path.join(ex, 'galeria.html'), 'w', encoding='utf-8').write(t)
print('ok', round(len(t) / 1e6, 2), 'MB')
