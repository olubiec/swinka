// Fit check: every minigame canvas must fit inside .minigames-canvas-wrapper (420x640 viewport, webview-like layout).
// Usage: node tools/qa/minigame-fit-check.js   (CHROMIUM_PATH optional). Prints FIT OK.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };

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
  const page = await browser.newPage({ viewport: { width: 420, height: 640 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  const problems = [];
  await page.goto(base + '/web/home/index.html');
  await page.waitForTimeout(1000);
  const ids = await page.evaluate(() => (window.Minigry.list ? window.Minigry.list() : window.Minigry.getAllGames()).map((g) => g.id));
  if (ids.length < 4) problems.push('only ' + ids.length + ' games registered');
  for (const id of ids) {
    await page.goto(base + '/web/home/index.html');
    await page.waitForTimeout(800);
    await page.evaluate(() => { const c = document.getElementById('modalCloseBtn'); if (c) c.click(); });
    await page.evaluate(() => document.getElementById('btnMinigames').click());
    await page.waitForTimeout(300);
    // statement body: Minigry.start returns a Phaser.Game that must not be serialised
    await page.evaluate((g) => { window.Minigry.start(g, { container: document.getElementById('modalBody') }); }, id);
    await page.waitForTimeout(1800);
    const r = await page.evaluate(() => {
      const c = document.querySelector('#modalBody canvas');
      if (!c) return null;
      const w = document.querySelector('#modalBody .minigames-canvas-wrapper');
      const a = c.getBoundingClientRect(), b = w.getBoundingClientRect();
      return { cw: a.width, ch: a.height, ww: b.width, wh: b.height, l: a.left - b.left, r: b.right - a.right, t: a.top - b.top, b: b.bottom - a.bottom };
    });
    if (!r) { problems.push(id + ': no canvas'); continue; }
    const tol = 4; // wrapper border
    if (r.cw > r.ww + 0.5 || r.ch > r.wh + 0.5 || r.l < -tol || r.r < -tol || r.t < -tol || r.b < -tol) problems.push(id + ': canvas overflows wrapper ' + JSON.stringify(r));
  }
  await browser.close();
  server.close();
  const bad = problems.concat(pageErrors);
  if (bad.length) { console.error('FIT FAILED\n' + bad.join('\n')); process.exit(1); }
  console.log('FIT OK (' + ids.join(', ') + ')');
})();
