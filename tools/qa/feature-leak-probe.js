// Per-feature leak probe: opens and closes each CuyHome feature N times (default 20) and reports how the
// forced-GC DOM node count and JS listener count change per feature. Isolates screens from game actions;
// use tools/qa/perf-soak.js for the mixed-action soak.
// Usage (repo root): CHROMIUM_PATH=/opt/pw-browsers/chromium CYCLES=20 node tools/qa/feature-leak-probe.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const CYCLES = parseInt(process.env.CYCLES || '20', 10);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg' };

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
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  const page = await (await b.newContext({ viewport: { width: 420, height: 640 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await page.context().newCDPSession(page);
  await page.goto(`http://127.0.0.1:${server.address().port}/web/home/index.html?world=1`);
  await page.waitForTimeout(1200);

  // Forced GC twice, then read the counters (detached nodes that are still alive would otherwise be counted).
  const measure = async () => {
    for (let i = 0; i < 2; i++) { await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); await page.waitForTimeout(80); }
    const d = await cdp.send('Memory.getDOMCounters');
    return { nodes: d.nodes, listeners: d.jsEventListeners };
  };
  const openFeature = (id) => page.evaluate((i) => window.CuyHome.openFeature(i), id).catch(() => {});
  const closeFeature = async () => {
    await page.evaluate(() => { document.getElementById('modalCloseBtn')?.click(); });
    await page.waitForTimeout(120);
  };

  const ids = await page.evaluate(() => window.CuyHome.listFeatures().map((f) => f.id));
  // Warm-up: each screen mounts once, so the first visit is not counted as growth.
  for (const id of ids) { await openFeature(id); await page.waitForTimeout(150); await closeFeature(); }
  const baseline = await measure();

  const rows = [];
  for (const id of ids) {
    const before = await measure();
    for (let k = 0; k < CYCLES; k++) { await openFeature(id); await page.waitForTimeout(150); await closeFeature(); }
    const after = await measure();
    rows.push({
      id,
      nodesDelta: after.nodes - before.nodes,
      listenersDelta: after.listeners - before.listeners,
      nodesPerCycle: +((after.nodes - before.nodes) / CYCLES).toFixed(2),
      nodesAfter: after.nodes,
      listenersAfter: after.listeners,
    });
  }
  console.log(JSON.stringify({ cycles: CYCLES, baseline, rows, errors: [...new Set(errors)].slice(0, 5) }, null, 1));
  await b.close();
  server.close();
  if (errors.length) { console.error('feature-leak-probe: page errors'); process.exit(1); }
  console.log('feature-leak-probe: DONE (per-feature deltas are reported, not judged)');
})().catch((e) => { console.error('feature-leak-probe crashed: ' + (e && e.stack || e)); process.exit(1); });
