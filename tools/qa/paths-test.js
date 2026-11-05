// E4 asset paths: browser (http and file://) vs WebView2 (https://cuy.home/ and https://cuy.assets/ virtual hosts).
// Part 1 (node): UiAssets.assetsBase() for the Home page, a minigame page and WebView2, and that the resolved URL
// points at a real file under assets/. Part 2 (Playwright): loads the Home page and the minigame page over http and
// file://, and the Home page in an emulated WebView2 (routes https://cuy.home and https://cuy.assets to the folders).
// Reports every failed asset request. Exit code 1 on any failure that is not listed in KNOWN below.
// Usage (repo root): CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/qa/paths-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const HOME = path.join(ROOT, 'web', 'home');
const ASSETS = path.join(ROOT, 'assets');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ogg': 'audio/ogg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

// Known failures (open problems, not fixed here). Each entry names the request and why it stays.
// The test prints them as OPEN and does not fail on them, so new failures still fail the run.
const KNOWN = [
  { match: 'file:///', why: 'file:// fetch of JSON is blocked by Chromium: data and ui.json stay at fallbacks, music silent' },
  { match: 'minigames/minigames/games.json', why: 'minigames/index.html standalone: minigames-api.js fetches minigames/games.json relative to /minigames/' },
  { match: 'getImageData', why: 'canvas taint: cuy.assets images carry no CORS header in this emulation; real WebView2 not checked here' },
];
const ALLOWED_MISSING = require('./known-missing-assets.json').allowed;

// ---- part 1: assetsBase() in the three locations ----
function loadUiAssets(pathname, chromeWebview) {
  const win = {
    location: { pathname, href: 'http://127.0.0.1/' + pathname.replace(/^\//, '') },
    chrome: chromeWebview ? { webview: {} } : undefined,
    addEventListener() {},
  };
  const ctx = vm.createContext({ window: win, console, URL });
  win.window = win;
  vm.runInContext(fs.readFileSync(path.join(HOME, 'lib', 'ui-assets.js'), 'utf8'), Object.assign(ctx, { window: win }));
  return win.UiAssets;
}

function part1() {
  const cases = [
    { name: 'browser Home /web/home/index.html', pathname: '/web/home/index.html', wv: false, expect: '../../assets/' },
    { name: 'browser minigame /web/home/minigames/index.html', pathname: '/web/home/minigames/index.html', wv: false, expect: '../../../assets/' },
    { name: 'WebView2 https://cuy.home/index.html', pathname: '/index.html', wv: true, expect: 'https://cuy.assets/' },
  ];
  for (const c of cases) {
    const ua = loadUiAssets(c.pathname, c.wv);
    const base = ua.assetsBase();
    assert.strictEqual(base, c.expect, c.name + ': assetsBase');
    if (!c.wv) {
      // resolve the base against the page URL the way the browser does, then check a real file exists
      const page = new URL('http://127.0.0.1' + c.pathname);
      const resolved = new URL(base, page);
      assert.strictEqual(resolved.pathname, '/assets/', c.name + ': resolves to /assets/ (got ' + resolved.pathname + ')');
      assert.ok(fs.existsSync(path.join(ASSETS, 'ui', 'ui.json')), 'assets/ui/ui.json exists');
    }
    console.log('ok   part1 ' + c.name + ' -> ' + base);
  }
}

// ---- part 2: real pages ----
function serve() {
  const server = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
    r.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((res) => server.listen(0, '127.0.0.1', () => res(server)));
}

// Collects failed sub-resource requests (status >= 400 or aborted) during a page's life.
function collector(page) {
  const failed = new Set();
  page.on('response', (r) => { if (r.status() >= 400) failed.add(r.status() + ' ' + r.url()); });
  page.on('requestfailed', (r) => failed.add('FAILED ' + r.failure().errorText + ' ' + r.url()));
  return failed;
}

async function settle(page) {
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(800);
}

async function runPage(b, label, url, { routes, init, extra } = {}) {
  const ctx = await b.newContext({ viewport: { width: 420, height: 640 } });
  if (init) await ctx.addInitScript(init);
  if (routes) await routes(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const failed = collector(page);
  await page.goto(url).catch((e) => errors.push('goto: ' + e.message));
  await settle(page);
  if (extra) await extra(page);
  await ctx.close();
  return { label, failed: [...failed], errors };
}

function report(results) {
  let bad = 0;
  for (const r of results) {
    const known = [], unknown = [];
    for (const f of r.failed) {
      if (ALLOWED_MISSING.some((a) => f.includes(a))) continue; // mock.js: known missing, see known-missing-assets.json
      const k = KNOWN.find((x) => f.includes(x.match));
      (k ? known : unknown).push(f + (k ? '  [' + k.why + ']' : ''));
    }
    for (const e of r.errors) {
      const k = KNOWN.find((x) => e.includes(x.match));
      if (!k) continue;
      r.errors.splice(r.errors.indexOf(e), 1);
      known.push('page error: ' + e + '  [' + k.why + ']');
    }
    console.log(
      `${unknown.length || r.errors.length ? 'FAIL' : 'ok  '} part2 ${r.label}: ${r.failed.length} failed request(s), ${r.errors.length} page error(s)`);
    for (const f of unknown) console.log('       ' + f);
    for (const e of r.errors) console.log('       page error: ' + e);
    for (const f of known) console.log('       OPEN ' + f);
    bad += unknown.length + r.errors.length;
  }
  return bad;
}

async function part2() {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  const results = [];
  try {
    // browser over http: Home, then a minigame page with veggie-rain started (its icon path depends on /minigames)
    results.push(await runPage(b, 'http Home', base + '/web/home/index.html?world=1'));
    results.push(await runPage(b, 'http minigame veggie_rain', base + '/web/home/minigames/index.html', {
      extra: async (page) => {
        await page.evaluate(() => { if (window.Minigry) window.Minigry.start('veggie_rain', {}).catch(() => {}); });
        await page.waitForTimeout(1500);
      },
    }));

    // browser over file://: the same Home page
    const fileUrl = 'file://' + path.join(HOME, 'index.html');
    results.push(await runPage(b, 'file:// Home', fileUrl));

    // WebView2 emulation: https://cuy.home/ -> web/home, https://cuy.assets/ -> assets/, window.chrome.webview present
    const routes = async (ctx) => {
      await ctx.route('https://cuy.home/**', (route) => serveFile(route, HOME, 'https://cuy.home/'));
      await ctx.route('https://cuy.assets/**', (route) => serveFile(route, ASSETS, 'https://cuy.assets/'));
      await ctx.route(/^https:\/\/(?!cuy\.)/, (route) => route.abort());
    };
    results.push(await runPage(b, 'WebView2 emulated Home', 'https://cuy.home/index.html', {
      routes,
      init: 'window.chrome = window.chrome || {}; window.chrome.webview = { postMessage() {}, addEventListener() {} };',
      extra: async (page) => {
        const base2 = await page.evaluate(() => window.UiAssets && window.UiAssets.assetsBase());
        if (base2 !== 'https://cuy.assets/') throw new Error('WebView2 assetsBase is ' + base2);
      },
    }));
  } finally {
    await b.close();
    server.close();
  }
  return report(results);
}

async function serveFile(route, dir, prefix) {
  const url = route.request().url();
  const rel = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  const f = path.join(dir, rel.replace(/^\/+/, ''));
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    return route.fulfill({ status: 404, body: 'not found' });
  }
  return route.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'application/octet-stream' });
}

(async () => {
  part1();
  const bad = await part2();
  if (bad) { console.log(`paths-test: ${bad} unexpected problem(s)`); process.exit(1); }
  console.log('paths-test: OK');
})().catch((e) => { console.error('paths-test crashed: ' + (e && e.stack || e)); process.exit(1); });
