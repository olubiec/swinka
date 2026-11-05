// QA-4 visual matrix: every feature x viewport -> screenshot + layout/pixel-art checks. Output: tools/qa/out/visual/
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const out = path.join(__dirname, 'out', 'visual');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
  r.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r);
});
const features = JSON.parse(fs.readFileSync(path.join(root, 'web/home/features/index.json'), 'utf8'));
const viewports = [[360, 640], [420, 640], [800, 600], [1280, 720]];
const probe = () => {
  const vw = window.innerWidth, res = { hscroll: document.documentElement.scrollWidth > vw + 1, wide: [], clipped: [], blurry: [], broken: [], tiny: [], missingGlobals: [] };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const id = (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') || el.tagName;
    if (r.right > vw + 2 && cs.position !== 'fixed' && !el.closest('[data-allow-scroll]')) res.wide.push(el.tagName + id);
    if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && el.textContent.trim()) res.clipped.push(el.tagName + id + ':' + el.textContent.trim().slice(0, 24));
    if ((el.tagName === 'CANVAS' || el.tagName === 'IMG') && !/pixelated|crisp-edges/.test(cs.imageRendering) && r.width > 24) res.blurry.push(el.tagName + id);
    if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) res.broken.push(el.src.slice(-40));
    if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && (r.width < 24 || r.height < 24)) res.tiny.push(el.tagName + id + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  for (const k of ['wide', 'clipped', 'blurry', 'broken', 'tiny']) res[k] = [...new Set(res[k])].slice(0, 8);
  return res;
};
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  const results = [];
  for (const [w, h] of viewports) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + '/web/home/index.html?world=1');
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForTimeout(900);
    for (const f of ['home'].concat(features)) {
      errs.length = 0;
      try {
        if (f !== 'home') { await page.evaluate(id => window.CuyHome.openFeature(id), f); await page.waitForTimeout(450); }
        const m = await page.evaluate(probe);
        await page.screenshot({ path: path.join(out, f + '_' + w + 'x' + h + '.png') });
        results.push({ feature: f, vp: w + 'x' + h, errors: errs.slice(), ...m });
        if (f !== 'home') { await page.keyboard.press('Escape'); const c = await page.$('#modalCloseBtn'); if (c && await c.isVisible()) await c.click(); await page.waitForTimeout(150); }
      } catch (e) { results.push({ feature: f, vp: w + 'x' + h, fatal: e.message }); }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
  const bad = results.filter(r => r.fatal || r.hscroll || r.wide.length || r.clipped.length || r.broken.length || r.errors.length);
  console.log('cells', results.length, 'with-findings', bad.length);
  for (const r of bad) console.log(r.feature, r.vp, r.fatal ? 'FATAL ' + r.fatal : JSON.stringify({ h: r.hscroll, wide: r.wide, clipped: r.clipped, broken: r.broken, err: r.errors }));
  const blurry = [...new Set(results.flatMap(r => r.blurry || []))]; console.log('non-pixelated canvas/img:', blurry.join(', ') || 'none');
  const tiny = [...new Set(results.flatMap(r => r.tiny || []))]; console.log('tiny buttons:', tiny.join(', ') || 'none');
  await b.close(); server.close();
})();
