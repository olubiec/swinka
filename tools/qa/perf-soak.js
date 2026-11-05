// E7 performance soak: random clicks on web/home for SOAK_SECONDS (default 60), then checks that the DOM node count,
// the JS event listener count and the number of pending requestAnimationFrame callbacks stay flat after warm-up.
// Counters: CDP Memory.getDOMCounters (nodes, listeners) and a wrapper on requestAnimationFrame (pending callbacks).
// Also fails on page errors. Output: JSON summary on stdout; exit 1 on a failed check.
// Usage (repo root): CHROMIUM_PATH=/opt/pw-browsers/chromium SOAK_SECONDS=60 node tools/qa/perf-soak.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const SECS = parseInt(process.env.SOAK_SECONDS || '60', 10);
const WARMUP_SECS = Math.min(15, Math.round(SECS * 0.25));
const SAMPLE_MS = 2000;
// Allowed growth of the floor in the second half after warm-up: 5% or 25 items (nodes/listeners), rAF +3.
const LIMIT = { nodesPct: 5, nodesAbs: 25, listenersPct: 5, listenersAbs: 25, rafAbs: 3 };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg' };

// Wraps requestAnimationFrame before any page script runs, so pending callbacks can be counted.
const RAF_INIT = `
  (function () {
    var pending = new Set(); var nextId = 1;
    var raf = window.requestAnimationFrame.bind(window), caf = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
      var id = raf(function (t) { pending.delete(id); cb(t); });
      pending.add(id); return id;
    };
    window.cancelAnimationFrame = function (id) { pending.delete(id); return caf(id); };
    window.__rafPending = function () { return pending.size; };
  })();`;

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
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 420, height: 640 } });
  await ctx.addInitScript(RAF_INIT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Memory.getDOMCounters').catch(() => null);

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  // Console 404s are reported through the response event below, so only uncaught errors and other console errors count.
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const badResponses = [];
  const allowed = require('./known-missing-assets.json').allowed;
  page.on('response', (r) => { if (r.status() >= 400 && !allowed.some((a) => r.url().includes(a))) badResponses.push(r.status() + ' ' + r.url()); });

  await page.goto(base + '/web/home/index.html?world=1');
  await page.waitForTimeout(1000);

  const samples = [];
  const clickLog = [];
  const sample = async (t) => {
    // A forced GC first: DOM counters also count detached nodes that are still alive, so only a GC shows leaks.
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const dom = await cdp.send('Memory.getDOMCounters');
    const live = await page.evaluate(() => document.getElementsByTagName('*').length);
    const raf = await page.evaluate(() => (window.__rafPending ? window.__rafPending() : -1));
    const heap = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : 0));
    const stateBytes = await page.evaluate(() => (window.CuyHome && window.CuyHome.api ? JSON.stringify(window.CuyHome.api.getState()).length : -1));
    samples.push({ t, nodes: dom.nodes, live, listeners: dom.jsEventListeners, raf, stateBytes, heapMB: +(heap / 1048576).toFixed(1) });
  };

  // Dev test tools (btnDevTest, test-btn, rc-btn) are left out: they add pigs and rooms on purpose.
  const CLICK_SEL = 'button:visible:not(#btnDevTest):not(.test-btn):not(.rc-btn), [role=button]:visible, .tab:visible';
  // Seeded random clicks (same sequence each run). Escape now and then closes open panels.
  let seed = 4242, clicks = 0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const t0 = Date.now();
  let nextSample = 0;
  while (Date.now() - t0 < SECS * 1000) {
    const now = Date.now() - t0;
    if (now >= nextSample) { await sample(Math.round(now / 1000)); nextSample += SAMPLE_MS; }
    // Locators, not page.$$: element handles from $$ stay alive in the page and would count as DOM leaks of this harness.
    const candidates = page.locator(CLICK_SEL);
    const n = await candidates.count();
    if (n) {
      const el = candidates.nth(Math.floor(rnd() * n));
      const label = await el.evaluate((x) => (x.id || x.className || x.tagName) + ' ' + (x.textContent || '').trim().slice(0, 20)).catch(() => '?');
      try { await el.click({ timeout: 500 }); clicks++; clickLog.push(label); } catch (e) { /* covered or detached */ }
    }
    if (rnd() < 0.05) await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(30);
  }
  await sample(Math.round((Date.now() - t0) / 1000));
  // Diagnosis for a failure: listener types on window, document and body (CDP), duplicate ids, common tag.class pairs.
  const listenerTypes = {};
  for (const expr of ['window', 'document', 'document.body']) {
    const res = await cdp.send('Runtime.evaluate', { expression: expr }).catch(() => null);
    if (!res || !res.result || !res.result.objectId) continue;
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: res.result.objectId, depth: 0 }).catch(() => ({ listeners: [] }));
    for (const l of listeners) listenerTypes[expr + ':' + l.type] = (listenerTypes[expr + ':' + l.type] || 0) + 1;
  }
  // Diagnosis for a failure: duplicate ids (a screen mounted twice) and the most common tag.class pairs.
  const diag = await page.evaluate(() => {
    const ids = {}, kinds = {};
    document.querySelectorAll('*').forEach((n) => {
      if (n.id) ids[n.id] = (ids[n.id] || 0) + 1;
      const k = n.tagName + '.' + (typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : '');
      kinds[k] = (kinds[k] || 0) + 1;
    });
    return {
      duplicateIds: Object.entries(ids).filter(([, c]) => c > 1).slice(0, 8),
      topKinds: Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  });

  // Growth is judged on the floor (minimum after forced GC) of the second half after warm-up against the first half.
  // Screens mount on their first visit, so growth during warm-up is reported but not judged.
  const warm = samples.filter((s) => s.t >= WARMUP_SECS);
  const half = Math.floor(warm.length / 2);
  const floor = (arr, key) => Math.min(...arr.map((x) => x[key]));
  const A = warm.slice(0, half), B = warm.slice(half);
  const first = samples[0], last = samples[samples.length - 1];
  const failures = [];
  const grow = (name, key, pct, abs) => {
    const a = floor(A, key), bb = floor(B, key), d = bb - a;
    if (d > abs && d > a * pct / 100) failures.push(`${name} floor grew ${a} -> ${bb} (+${d}) in the second half`);
    return { floorFirstHalf: a, floorSecondHalf: bb };
  };
  // Game state (serialized size of CuyHome.api.getState()) can grow legitimately: each purchase or placement adds data
  // and DOM. Node/listener growth is a failure only when the state floor did not grow in the same half. If it did,
  // the growth is recorded in `notes` as state growth, not a leak. Missing state (-1) cannot explain growth, so it still fails.
  const stateA = floor(A, 'stateBytes'), stateB = floor(B, 'stateBytes');
  const stateGrew = stateA >= 0 && (stateB - stateA) > stateA * LIMIT.nodesPct / 100;
  const notes = [];
  const judgeWithState = (name, key, pct, abs) => {
    const before = failures.length;
    const r = grow(name, key, pct, abs);
    if (failures.length > before && stateGrew) {
      notes.push(`${failures.pop()} -- explained by game state growth ${stateA} -> ${stateB} bytes (not judged a leak)`);
    }
    return r;
  };
  const nodes = judgeWithState('DOM nodes', 'nodes', LIMIT.nodesPct, LIMIT.nodesAbs);
  const listeners = judgeWithState('JS listeners', 'listeners', LIMIT.listenersPct, LIMIT.listenersAbs);
  const raf = grow('pending rAF', 'raf', 0, LIMIT.rafAbs);
  if (errors.length) failures.push(`${errors.length} page error(s)`);
  if (badResponses.length) failures.push('unexpected 4xx/5xx: ' + [...new Set(badResponses)].slice(0, 5).join(', '));

  const summary = {
    seconds: SECS, warmupSeconds: WARMUP_SECS, clicks,
    nodes: { start: first.nodes, end: last.nodes, ...nodes },
    listeners: { start: first.listeners, end: last.listeners, ...listeners },
    rafPending: { start: first.raf, end: last.raf, ...raf },
    heapMB: { warm: first.heapMB, end: last.heapMB },
    gameState: { bytesFirstHalf: stateA, bytesSecondHalf: stateB, grew: stateGrew },
    notes,
    errors: [...new Set(errors)].slice(0, 10),
    failures,
    series: samples.map((x) => x.t + 's cdp' + x.nodes + ' live' + x.live + ' l' + x.listeners + ' st' + x.stateBytes),
    lastClicks: clickLog.slice(-12),
    diag: { ...diag, listenerTypes },
  };
  console.log(JSON.stringify(summary, null, 1));
  await b.close();
  server.close();
  if (failures.length) { console.error('perf-soak: FAIL'); process.exit(1); }
  console.log('perf-soak: OK');
})().catch((e) => { console.error('perf-soak crashed: ' + (e && e.stack || e)); process.exit(1); });
