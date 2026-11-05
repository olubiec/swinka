// Music library audit (MUSIC_PLAN 5.10, MUSIC_WAVES MW-1 PM-05, MT-09).
// Offline: reads the manifest written by tools/music/build_manifest.py and checks the files on disk.
// Usage:
//   node tools/qa/music-audit.js                    repo root, assets/data/music.json
//   node tools/qa/music-audit.js --root DIR         other root (test sets)
//   node tools/qa/music-audit.js --full            enforce the full-library counts (144 + 5, 24 x 4)
//   node tools/qa/music-audit.js --only id1 id2    item checks for the given ids only
// No manifest = empty set: checks pass, legacy files without an entry are reported as warnings.
// Exit code 0 = green, 1 = at least one FAIL.
const fs = require('fs'), path = require('path');

const DEFAULT_ROOT = path.join(__dirname, '..', '..');
const FULL_GENERATED = 144, FULL_LEGACY = 5, FULL_RECORDS = 24, TRACKS_PER_RECORD = 4;
const LUFS_TOL = 1.5;          // LU around the spec target
const PEAK_MAX = -1.0;         // dBTP ceiling
const EDGE_TOL = 0.01;         // |sample| at loop edges (about -40 dBFS)
const LENGTH_RULES = {         // seconds, by kind (plan 5.10 point 3)
  bed: [120, 240], record: [90, 120], jingle: [0, 6],
};

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const full = args.includes('--full');
const root = path.resolve(opt('--root') || DEFAULT_ROOT);
const manifestPath = path.resolve(opt('--manifest') || path.join(root, 'assets', 'data', 'music.json'));
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? new Set(args.slice(onlyIdx + 1).filter(a => !a.startsWith('--'))) : null;

const results = [];
const check = (name, fails, note) => results.push({ name, fails, note: note || '' });
const warnings = [];

function readManifest() {
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function listOggs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listOggs(p));
    else if (e.name.endsWith('.ogg')) out.push(p);
  }
  return out;
}

const musicDir = path.join(root, 'assets', 'music');
const licensesDir = path.join(root, 'assets', 'LICENSES');
const manifest = readManifest();
const allItems = manifest ? manifest.items || [] : [];
const items = only ? allItems.filter(i => only.has(i.id)) : allItems;
const diskFiles = listOggs(musicDir).map(p => path.relative(path.join(root, 'assets'), p).split(path.sep).join('/'));

if (!manifest) {
  const legacy = diskFiles.length;
  if (legacy) warnings.push(manifestPath + ' missing; ' + legacy + ' OGG file(s) in assets/music are not in any manifest');
  else warnings.push('empty set: no manifest, no OGG files');
}

// 1. every manifest file exists and every OGG on disk has an entry
{
  const fails = [];
  if (manifest) {
    const listed = new Set(allItems.map(i => i.file));
    for (const i of allItems) {
      if (!fs.existsSync(path.join(root, 'assets', i.file))) fails.push('missing file: ' + i.file);
    }
    for (const f of diskFiles) if (!listed.has(f)) fails.push('no manifest entry: ' + f);
  }
  check('1 files <-> manifest', fails, manifest ? allItems.length + ' entries' : 'empty set');
}

// 2. counts (full library only)
{
  const fails = [];
  const gen = allItems.filter(i => i.generated).length;
  const leg = allItems.filter(i => !i.generated).length;
  if (full) {
    if (gen !== FULL_GENERATED) fails.push('generated = ' + gen + ', expected ' + FULL_GENERATED);
    if (leg !== FULL_LEGACY) fails.push('legacy = ' + leg + ', expected ' + FULL_LEGACY);
    check('2 counts (--full)', fails, gen + ' generated + ' + leg + ' legacy');
  } else {
    check('2 counts', [], 'not enforced without --full (' + gen + ' generated, ' + leg + ' legacy)');
  }
}

// 3. loop seams and lengths
{
  const fails = [];
  for (const i of items) {
    if (i.generated === false) continue;
    const rule = LENGTH_RULES[i.kind];
    if (rule && typeof i.length_s === 'number') {
      if (i.length_s < rule[0] || i.length_s > rule[1]) {
        fails.push(i.id + ': length ' + i.length_s + ' s outside ' + rule[0] + '-' + rule[1] + ' s');
      }
    }
    if (i.loop && i.loop.enabled) {
      if (typeof i.edge_first !== 'number' || typeof i.edge_last !== 'number') {
        fails.push(i.id + ': loop not measured');
      } else {
        if (i.edge_first > EDGE_TOL) fails.push(i.id + ': loop start not at zero crossing (' + i.edge_first + ')');
        if (i.edge_last > EDGE_TOL) fails.push(i.id + ': loop end not at zero crossing (' + i.edge_last + ')');
      }
    }
  }
  check('3 loop seams and lengths', fails, items.length + ' item(s)');
}

// 4. loudness and peak
{
  const fails = [];
  for (const i of items) {
    if (typeof i.lufs !== 'number' || typeof i.peak_dbtp !== 'number') {
      fails.push(i.id + ': not measured');
      continue;
    }
    if (i.generated !== false) {
      if (typeof i.target_lufs !== 'number') fails.push(i.id + ': no target LUFS in manifest');
      else if (Math.abs(i.lufs - i.target_lufs) > LUFS_TOL) {
        fails.push(i.id + ': LUFS ' + i.lufs + ' vs target ' + i.target_lufs);
      }
      if (i.peak_dbtp > PEAK_MAX) fails.push(i.id + ': peak ' + i.peak_dbtp + ' dBTP above ' + PEAK_MAX);
    } else if (i.peak_dbtp > 0) {
      warnings.push(i.id + ': true peak ' + i.peak_dbtp + ' dBTP above 0 (external file, not re-mastered)');
    }
  }
  check('4 loudness and peak', fails, 'generated: target +-' + LUFS_TOL + ' LU, peak <= ' + PEAK_MAX + ' dBTP');
}

// 5. stems of one game: equal length in samples and equal tempo
{
  const fails = [];
  const groups = {};
  for (const i of items) {
    if (!i.stem_group) continue;
    (groups[i.stem_group] = groups[i.stem_group] || []).push(i);
  }
  for (const [g, members] of Object.entries(groups)) {
    const n0 = members[0].length_samples, bpm0 = members[0].bpm;
    for (const m of members) {
      if (m.length_samples !== n0) fails.push(g + ': ' + m.id + ' has ' + m.length_samples + ' samples, expected ' + n0);
      if (m.bpm !== bpm0) fails.push(g + ': ' + m.id + ' tempo ' + m.bpm + ' vs ' + bpm0);
    }
  }
  check('5 stems equal length and tempo', fails, Object.keys(groups).length + ' stem group(s)');
}

// 6. records: 24 albums x 4 tracks
{
  const fails = [];
  const albums = {};
  for (const i of allItems) if (i.album) albums[i.album] = (albums[i.album] || 0) + 1;
  const recs = manifest ? manifest.records || [] : [];
  for (const r of recs) {
    if (r.tracks !== (albums[r.id] || 0)) fails.push('record ' + r.id + ': tracks field ' + r.tracks + ' != entries ' + (albums[r.id] || 0));
    if (r.tracks > TRACKS_PER_RECORD) fails.push('record ' + r.id + ': ' + r.tracks + ' tracks');
    if (full && r.tracks !== TRACKS_PER_RECORD) fails.push('record ' + r.id + ': ' + r.tracks + ' tracks, expected ' + TRACKS_PER_RECORD);
  }
  if (full && recs.length !== FULL_RECORDS) fails.push('records = ' + recs.length + ', expected ' + FULL_RECORDS);
  check('6 records 24 x 4' + (full ? ' (--full)' : ''), fails, recs.length + ' record(s)');
}

// 7. licences: every non-generated file is listed in assets/LICENSES; generated files have the own-licence file
{
  const fails = [];
  let licText = '';
  if (fs.existsSync(licensesDir)) {
    for (const f of fs.readdirSync(licensesDir)) licText += fs.readFileSync(path.join(licensesDir, f), 'utf8') + '\n';
  }
  for (const i of items) {
    if (!i.license) { fails.push(i.id + ': no license'); continue; }
    if (i.generated === false && i.title && !licText.includes(i.title)) {
      fails.push(i.id + ': title "' + i.title + '" not in assets/LICENSES');
    }
  }
  if (items.some(i => i.generated !== false) && !fs.existsSync(path.join(licensesDir, 'music.md'))) {
    fails.push('assets/LICENSES/music.md missing for generated music');
  }
  check('7 licences', fails, items.length + ' item(s)');
}

let bad = 0;
for (const r of results) {
  if (r.fails.length) bad++;
  console.log((r.fails.length ? 'FAIL ' : 'PASS ') + r.name + (r.note ? ' - ' + r.note : ''));
  for (const f of r.fails) console.log('     ' + f);
}
for (const w of warnings) console.log('WARN ' + w);
console.log(bad ? 'music-audit: RED (' + bad + ' check(s) failed)' : 'music-audit: GREEN');
process.exit(bad ? 1 : 0);
