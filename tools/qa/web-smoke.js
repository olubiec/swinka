// Headless smoke test of the Home page (web/home) in mock mode, as it looks inside the app (400x620).
// Usage (from repo root): npm --prefix tools/qa ci && npx --prefix tools/qa playwright install chromium && node tools/qa/web-smoke.js
// Fails (exit 1) on any page error or console error, and on a broken basic flow. Screenshots: tools/qa/out/*.png
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 420, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // Missing optional files (404) are reported separately; other console errors fail the run.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text());
  });
  const missing = [];
  page.on('response', (r) => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });

  const step = async (name, fn) => {
    try { await fn(); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('PASS ' + name); }
    catch (e) { errors.push(name + ': ' + e.message); console.log('FAIL ' + name + ': ' + e.message); }
  };

  await step('01_home', async () => {
    await page.goto(base + '/web/home/index.html');
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForTimeout(1200);
    const ok = await page.evaluate(() => !!window.bridge && !!document.getElementById('pigCanvas'));
    if (!ok) throw new Error('bridge or canvas missing');
  });
  await step('02_feed_drawer', async () => {
    await page.click('#btnFeed'); await page.waitForTimeout(300);
    if (!(await page.isVisible('#foodDrawer'))) throw new Error('food drawer not visible');
    await page.click('#foodDrawerClose'); await page.waitForTimeout(200);
  });
  for (const [btn, name] of [['#btnShop', '03_shop'], ['#btnMinigames', '04_games'], ['#btnMore', '05_more']]) {
    if (!(await page.$(btn))) { console.log('SKIP ' + name + ' (no ' + btn + ')'); continue; }
    await step(name, async () => {
      await page.click(btn); await page.waitForTimeout(400);
      if (!(await page.isVisible('#modalBackdrop.active, .modal-backdrop.active'))) throw new Error('dialog did not open');
      await page.click('#modalCloseBtn'); await page.waitForTimeout(200);
    });
  }
  // Feature modules (web/home/features/<id>/feature.js), if the loader exists
  const features = await page.evaluate(() => (window.CuyHome && window.CuyHome.listFeatures) ? window.CuyHome.listFeatures().map((f) => f.id) : []);
  for (const id of features) {
    await step('10_feature_' + id, async () => {
      await page.evaluate((fid) => window.CuyHome.openFeature(fid), id);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.CuyHome.closeFeature && window.CuyHome.closeFeature());
      await page.waitForTimeout(200);
    });
  }

  await browser.close();
  server.close();
  if (missing.length) console.log('Missing files:\n  ' + missing.join('\n  '));
  if (errors.length) { console.log('ERRORS:\n  ' + errors.join('\n  ')); process.exit(1); }
  console.log('WEB SMOKE OK');
})().catch((e) => { console.error(e); process.exit(1); });
