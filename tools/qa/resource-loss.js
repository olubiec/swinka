// E6 resource loss: the Home page (web/home) must still start and must not look broken when a UI asset is missing.
// Missing files are simulated with Playwright page.route (the real files stay in the repo).
// Scenarios: ui.json 404, ui.json without some entries, one 9-slice PNG 404, the icon sheet 404.
// Checks per scenario: no page errors, no console errors except "Failed to load resource", the mock was hit,
// the start flow works (buttons and bars exist), the frames keep a visible palette border (not transparent),
// and no element is painted mostly near-white (white blots). Screenshots: tools/qa/out/resource-loss-*.png
// Usage (from repo root): CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/qa/resource-loss.js
// Exit 1 on any failure.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const UI_JSON = path.join(ROOT, 'assets', 'ui', 'ui.json');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const NOT_FOUND = { status: 404, contentType: 'text/plain', body: 'not found' };

// Frames whose computed border colour must be a visible palette colour (the fallback under border-image, see style.css).
// .game-btn also needs a visible palette fill when its frame is gone.
const FRAMED = ['.game-btn', '.currency-badge', '.progress-groove'];
const FILLED = ['.game-btn'];
const WHITE_SELECTORS = ['.game-btn', '.currency-badge', '.progress-groove', '.progress-fill', '.pixel-icon'];

function uiJsonWithout(ids) {
  const data = JSON.parse(fs.readFileSync(UI_JSON, 'utf8'));
  ids.forEach((id) => { delete data.items[id]; });
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) };
}

const SCENARIOS = [
  { name: 'control (no mocks)', mocks: [] },
  { name: 'ui.json missing (404)', mocks: [{ pattern: '**/assets/ui/ui.json', response: NOT_FOUND }] },
  { name: 'ui.json without btn_normal and badge entries', mocks: [{ pattern: '**/assets/ui/ui.json', response: () => uiJsonWithout(['btn_normal', 'badge']) }] },
  { name: 'ui/btn_normal.png missing (404)', mocks: [{ pattern: '**/assets/ui/btn_normal.png', response: NOT_FOUND }] },
  // canvas-pig logs its own error for the sheet it preloads; that line is expected and does not block the page.
  { name: 'icons_16.png sheet missing (404)', mocks: [{ pattern: '**/assets/icons/icons_16.png', response: NOT_FOUND }],
    allowConsole: [/\[canvas-pig\] Failed to load image: .*icons_16\.png/] },
];

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

// Reads the computed frame and fill of the first visible element of each selector.
async function readStyles(page) {
  return page.evaluate((sels) => {
    const out = {};
    sels.forEach((sel) => {
      const el = Array.from(document.querySelectorAll(sel)).find((e) => e.getClientRects().length > 0);
      if (!el) { out[sel] = null; return; }
      const cs = getComputedStyle(el);
      out[sel] = { borderTopStyle: cs.borderTopStyle, borderTopColor: cs.borderTopColor, backgroundColor: cs.backgroundColor };
    });
    return out;
  }, FRAMED);
}

// Share of near-white pixels in the element's own screenshot (white blot = most of the box is >= 240 on every channel).
async function whiteShare(page, sel) {
  const visible = page.locator(sel).filter({ visible: true });
  const count = Math.min(await visible.count(), 3);
  let worst = 0;
  for (let i = 0; i < count; i++) {
    const buf = await visible.nth(i).screenshot({ timeout: 5000 });
    const share = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let white = 0; const n = d.length / 4;
      for (let p = 0; p < d.length; p += 4) if (d[p] >= 240 && d[p + 1] >= 240 && d[p + 2] >= 240) white++;
      return white / n;
    }, buf.toString('base64'));
    worst = Math.max(worst, share);
  }
  return worst;
}

function parseRgba(color) {
  const m = color && color.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

async function runScenario(browser, base, scenario, failures) {
  const context = await browser.newContext({ viewport: { width: 420, height: 640 } });
  const page = await context.newPage();
  const label = scenario.name;
  const fail = (msg) => failures.push(`${label}: ${msg}`);
  const hits = scenario.mocks.map(() => 0);
  let failedLoads = 0;
  let allowedLogs = 0;

  page.on('pageerror', (e) => fail('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/.test(m.text())) { failedLoads++; return; }
    if ((scenario.allowConsole || []).some((re) => re.test(m.text()))) { allowedLogs++; return; }
    fail('console: ' + m.text());
  });
  for (let i = 0; i < scenario.mocks.length; i++) {
    const mock = scenario.mocks[i];
    await page.route(mock.pattern, (route) => {
      hits[i]++;
      route.fulfill(typeof mock.response === 'function' ? mock.response() : mock.response);
    });
  }

  await page.goto(base + '/web/home/index.html');
  await page.waitForTimeout(1000);
  if (await page.isVisible('#modalBackdrop.active')) {
    await page.click('#modalCloseBtn');
    await page.waitForTimeout(200);
  }

  scenario.mocks.forEach((mock, i) => { if (hits[i] === 0) fail(`mock not hit: ${mock.pattern}`); });

  // Start flow: the main controls and bars are in the DOM and the page still responds to a click.
  const started = await page.evaluate(() => ({
    feed: !!document.querySelector('#btnFeed'),
    clover: !!document.querySelector('#cloverCount'),
    bars: document.querySelectorAll('.progress-fill').length,
  }));
  if (!started.feed || !started.clover || started.bars < 6) fail('start flow broken: ' + JSON.stringify(started));
  try {
    await page.click('#btnSound', { timeout: 3000 });
    await page.click('#btnSound', { timeout: 3000 });
  } catch (e) { fail('click after start failed: ' + e.message); }

  // Frames: a missing frame image must leave a visible palette border, not a transparent one.
  const styles = await readStyles(page);
  for (const sel of FRAMED) {
    const s = styles[sel];
    if (!s) { fail(`no visible ${sel}`); continue; }
    const c = parseRgba(s.borderTopColor);
    if (s.borderTopStyle === 'none' || !c || c.a === 0) fail(`${sel} has no visible border (style ${s.borderTopStyle}, colour ${s.borderTopColor})`);
  }
  for (const sel of FILLED) {
    const s = styles[sel];
    const c = s && parseRgba(s.backgroundColor);
    if (!c || c.a === 0) fail(`${sel} has no visible fill (${s && s.backgroundColor})`);
  }

  // White blots: no framed control, bar or icon is painted mostly near-white.
  for (const sel of WHITE_SELECTORS) {
    const share = await whiteShare(page, sel);
    if (share > 0.5) fail(`${sel} is mostly white (${Math.round(share * 100)}%)`);
  }

  await page.screenshot({ path: path.join(OUT, 'resource-loss-' + scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png') });
  console.log(`${label}: mockHits=${JSON.stringify(hits)} resourceErrors=${failedLoads} allowedLogs=${allowedLogs}`);
  await context.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const failures = [];
  for (const scenario of SCENARIOS) {
    const before = failures.length;
    try {
      await runScenario(browser, base, scenario, failures);
    } catch (e) {
      failures.push(`${scenario.name}: ${e.message}`);
    }
    console.log(failures.length === before ? 'PASS ' + scenario.name : 'FAIL ' + scenario.name);
  }
  await browser.close();
  server.close();
  if (failures.length) { console.log('FAILURES:\n  ' + failures.join('\n  ')); process.exit(1); }
  console.log('RESOURCE LOSS OK');
})().catch((e) => { console.error(e); process.exit(1); });
