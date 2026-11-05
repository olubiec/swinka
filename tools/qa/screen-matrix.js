// E2 screen matrix: Home and every feature x viewport (360/420/480 px wide, 640 high) x theme (light/dark) x scale (1x/2x).
// Per cell: a screenshot and a probe (horizontal scroll, elements past the right edge, clipped text, Home action row
// reachable without scrolling, Settings header inside the viewport). Output: tools/qa/out/screen-matrix/ (git-ignored).
// Usage (repo root): CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/qa/screen-matrix.js [--quick]
//   --quick  only 360 and 480 at 1x, light theme (for a fast look)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out', 'screen-matrix');
fs.mkdirSync(OUT, { recursive: true });
const QUICK = process.argv.includes('--quick');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg' };

const WIDTHS = QUICK ? [360, 480] : [360, 420, 480];
const THEMES = QUICK ? ['light'] : ['light', 'dark'];
const SCALES = QUICK ? [1] : [1, 2];
const HEIGHT = 640;

// Runs in the page: returns problems found on the current screen.
const probe = (isHome) => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const res = { hscroll: document.documentElement.scrollWidth > vw + 1, wide: [], clipped: [], belowFold: [], headerCut: [] };
  const name = (el) => (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '') || el.tagName;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > vw + 2 && cs.position !== 'fixed' && !el.closest('[data-allow-scroll]')) res.wide.push(name(el));
    if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 2 && /hidden|ellipsis/.test(cs.overflow + cs.textOverflow)) {
      res.clipped.push(name(el) + ':' + el.textContent.trim().slice(0, 24));
    }
  }
  // Home: the bottom action row (Shop, Games, More) must be visible without scrolling the page.
  for (const id of isHome ? ['btnShop', 'btnMinigames', 'btnMore'] : []) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom > vh + 1) res.belowFold.push(id + ' bottom ' + Math.round(r.bottom) + '>' + vh);
  }
  // Settings: the modal title must start inside the viewport (a cut header starts above y=0 or is hidden under the top edge).
  const title = document.querySelector('.modal-title, .modal-header h2, .modal h2, h2');
  if (title && title.offsetParent !== null) {
    const r = title.getBoundingClientRect();
    if (r.top < 0 || r.bottom < 16) res.headerCut.push(name(title) + ' top ' + Math.round(r.top));
  }
  for (const k of ['wide', 'clipped', 'belowFold', 'headerCut']) res[k] = [...new Set(res[k])].slice(0, 8);
  return res;
};

function serve() {
  const server = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
    r.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((res) => server.listen(0, '127.0.0.1', () => res(server)));
}

(async () => {
  const features = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/home/features/index.json'), 'utf8'));
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  const results = [];
  const screens = ['home'].concat(features);
  for (const w of WIDTHS) for (const theme of THEMES) for (const scale of SCALES) {
    const ctx = await b.newContext({ viewport: { width: w, height: HEIGHT }, deviceScaleFactor: scale, colorScheme: theme });
    const tag = `${w}x${HEIGHT}_${theme}_${scale}x`;
    for (const f of screens) {
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      try {
        await page.goto(base + '/web/home/index.html?world=1');
        // Theme: colorScheme (prefers-color-scheme) is set on the context; data-theme is set too for pages that read it.
        await page.evaluate(([wide, t]) => { document.body.classList.toggle('webview-mode', wide); document.documentElement.setAttribute('data-theme', t); }, [w >= 420, theme]);
        await page.waitForTimeout(700);
        if (f !== 'home') {
          await page.evaluate((id) => window.CuyHome.openFeature(id), f);
          await page.waitForTimeout(450);
        }
        const m = await page.evaluate(probe, f === 'home');
        await page.screenshot({ path: path.join(OUT, f + '_' + tag + '.png') });
        results.push({ screen: f, cell: tag, errors: errs.slice(), ...m });
      } catch (e) {
        results.push({ screen: f, cell: tag, fatal: e.message.split('\n')[0] });
      }
      await page.close();
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  const bad = results.filter((r) => r.fatal || r.hscroll || r.wide.length || r.clipped.length || r.belowFold.length || r.headerCut.length || r.errors.length);
  console.log(`screen-matrix: ${results.length} cells, ${bad.length} with findings -> ${OUT}`);
  for (const r of bad) {
    const parts = r.fatal ? ['FATAL ' + r.fatal] : [];
    if (r.hscroll) parts.push('hscroll');
    for (const k of ['wide', 'clipped', 'belowFold', 'headerCut']) if (r[k] && r[k].length) parts.push(k + ': ' + r[k].join(' | '));
    if (r.errors && r.errors.length) parts.push('js: ' + r.errors.slice(0, 2).join(' | '));
    console.log(`  ${r.screen} ${r.cell}: ${parts.join('; ')}`);
  }
  await b.close();
  server.close();
  process.exit(bad.some((r) => r.fatal || r.errors.length) ? 1 : 0);
})().catch((e) => { console.error('screen-matrix crashed: ' + (e && e.stack || e)); process.exit(1); });
