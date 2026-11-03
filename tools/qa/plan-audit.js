// Plan audit: prompt format, waves.yaml references, sub-wave order, art coverage vs designer brief.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const js = p => JSON.parse(rd(p));

// 1. prompt format
const pdir = path.join(root, 'docs/prompts');
const prompts = fs.readdirSync(pdir).filter(f => /^W\d+-\d+-.*\.md$/.test(f));
for (const f of prompts) {
  const t = fs.readFileSync(path.join(pdir, f), 'utf8');
  const g = k => (t.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1];
  if (!/^# W\d+-\d+: /.test(t)) fail(f + ' title');
  const z = g('Zmieniaj'), w = g('Wymagane');
  if (!z) { fail(f + ' Zmieniaj'); continue; }
  if (!g('Weryfikacja')) fail(f + ' Weryfikacja');
  if (!g('Pytania')) fail(f + ' Pytania');
  const zs = z.split(/[\s,]+/).filter(Boolean);
  if (w) for (const x of w.split(/[\s,]+/).filter(Boolean)) if (!zs.includes(x)) fail(f + ' Wymagane not in Zmieniaj: ' + x);
  if (!/^Steps:/m.test(t) || !/^Goal:/m.test(t)) fail(f + ' Goal/Steps');
}
console.log(prompts.length + ' prompts checked');

// 2. waves.yaml prompt_file references
const wy = rd('waves.yaml');
const refs = [...wy.matchAll(/prompt_file:\s*(\S+)/g)].map(m => m[1]);
for (const r of refs) if (!fs.existsSync(path.join(root, r))) fail('waves.yaml missing ' + r);
const inYaml = new Set(refs.map(r => path.basename(r)));
for (const f of prompts) if (/^W(2[3-9]|30)-/.test(f) && !inYaml.has(f)) fail('prompt not in waves.yaml: ' + f);
console.log(refs.length + ' waves.yaml prompt refs');

// 3. sub-waves: every W23-W30 prompt belongs to exactly one sub-wave
const sw = js('docs/prompts/subwaves.json');
const seen = {};
const walk = o => { if (Array.isArray(o)) o.forEach(x => typeof x === 'string' ? (seen[x] = (seen[x] || 0) + 1) : walk(x)); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
walk(sw);
for (const f of prompts) {
  const id = f.match(/^(W\d+-\d+)/)[1];
  if (/^W(2[3-9]|30)-/.test(f) && seen[id] !== 1) fail('sub-wave membership ' + id + ' x' + (seen[id] || 0));
}

// 4. art coverage: every placeable/skin/icon must have art or be named in the designer brief
const brief = rd('docs/DESIGNER_BRIEF.md');
let atlas = {}; try { atlas = js('assets/world/atlas.json').items || {}; } catch (e) {}
let tiles = {}; try { tiles = js('assets/world/tiles.json'); } catch (e) {}
const tileStr = JSON.stringify(tiles);
const items = js('assets/data/world_items.json').items;
let missingArt = 0;
for (const it of items) {
  if (atlas[it.id] || brief.includes(it.id)) continue;
  missingArt++;
}
console.log(items.length + ' placeables, ' + missingArt + ' without atlas entry and not in brief (glyph fallback only)');
const rooms = js('assets/data/pig_rooms.json');
for (const [id, th] of Object.entries(rooms.themes)) {
  for (const k of ['wall_tile', 'floor_tile']) {
    const n = th[k]; if (n && !tileStr.includes(n) && !brief.includes(n)) fail('tile ' + n + ' not in tiles.json nor brief');
  }
  for (const s of [th.signature].concat(th.starter || [])) {
    const sid = typeof s === 'string' ? s : s && s.id;
    if (sid && !items.find(i => i.id === sid)) fail('theme ' + id + ' item missing in world_items: ' + sid);
  }
  if (th.signature && !brief.includes(typeof th.signature === 'string' ? th.signature : th.signature.id)) fail('signature not in brief: ' + id);
}
for (const i of items.filter(i => i.signature_of || i.prop_of || i.id === 'gate_garden'))
  if (!brief.includes(i.id)) fail('brief lacks ' + i.id);

// 5. icons named in brief exist in count
const iconsJson = (() => { try { return js('assets/icons/icons.json'); } catch (e) { return null; } })();
if (iconsJson) console.log('icons.json loaded');
for (const n of ['candle','dorm_bed','run','gate','tray','store','house_plan','storage_box','swatch','roam','tied','rename_pen','variant_lock'])
  if (!brief.includes(n)) fail('brief lacks icon ' + n);

// 6. packs: every H pack mapped
const sty = rd('docs/STYL_SWIATA.md');
if (!/H0 \(13 ikon/.test(sty)) fail('STYL_SWIATA lacks H-pack mapping');
console.log(bad ? bad + ' problem(s)' : 'PLAN AUDIT OK');
process.exit(bad ? 1 : 0);
