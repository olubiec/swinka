// Palette remap test (Chromium): remaps the ginger adult sheet and checks pixel counts and exact equality with companion sheets.
// Usage: node tools/qa/palette-test.js   (CHROMIUM_PATH optional)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/assets/sprites/palettes.json');
  await page.addScriptTag({ url: base + '/web/home/lib/palette.js' });
  const result = await page.evaluate(async (b) => {
    await CuyPalette.load(b + '/assets/sprites/palettes.json');
    const loadImg = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
    const px = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const base0 = await loadImg(b + '/assets/sprites/adult/spritesheet.png');
    const d = await (await fetch(b + '/assets/sprites/palettes.json')).json();
    const toCanvas = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); return c; };
    const src = px(toCanvas(base0));
    const out = { ids: {}, same: {} };
    const hex = (h) => parseInt(h.slice(1), 16);
    for (const id of Object.keys(d.palettes)) {
      const c = CuyPalette.apply(base0, id);
      const p = px(c);
      let changed = 0, expected = 0;
      const from = new Set(d.palettes[id].map((x) => hex(x[0])));
      for (let i = 0; i < p.length; i += 4) {
        const s = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
        if (src[i + 3] === 255 && from.has(s)) expected++;
        if (p[i] !== src[i] || p[i + 1] !== src[i + 1] || p[i + 2] !== src[i + 2] || p[i + 3] !== src[i + 3]) changed++;
      }
      out.ids[id] = { changed, expected };
      if (CuyPalette.apply(base0, id) !== c) out.ids[id].notCached = true;
    }
    for (const [id, folder] of [['agouti', 'companion_agouti'], ['black_white', 'companion_black_white'], ['cream', 'companion_cream']]) {
      const comp = px(toCanvas(await loadImg(b + '/assets/sprites/' + folder + '/spritesheet.png')));
      const p = px(CuyPalette.apply(base0, id));
      let diff = 0;
      for (let i = 0; i < p.length; i += 4) if (p[i] !== comp[i] || p[i + 1] !== comp[i + 1] || p[i + 2] !== comp[i + 2] || p[i + 3] !== comp[i + 3]) diff++;
      out.same[id] = diff;
    }
    out.fallback = CuyPalette.normalize('zzz');
    return out;
  }, base);
  await browser.close();
  server.close();
  let bad = errors.slice();
  for (const [id, r] of Object.entries(result.ids)) {
    if (r.changed !== r.expected) bad.push(id + ': changed ' + r.changed + ' != expected ' + r.expected);
    if (r.changed === 0) bad.push(id + ': nothing changed');
    if (r.notCached) bad.push(id + ': not cached');
  }
  for (const [id, n] of Object.entries(result.same)) if (n !== 0) bad.push(id + ' differs from companion sheet in ' + n + ' pixels');
  if (result.fallback !== 'tricolor') bad.push('fallback is ' + result.fallback);
  console.log(JSON.stringify(result));
  if (bad.length) { console.error('PALETTE TEST FAILED\n' + bad.join('\n')); process.exit(1); }
  console.log('PALETTE TEST OK');
})();
