// QA-3 soak: random clicks through web/home for SOAK_SECONDS (default 120). Reports console errors, heap, DOM nodes.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const secs = parseInt(process.env.SOAK_SECONDS || '120', 10);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
  r.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--enable-precise-memory-info'] });
  const page = await b.newPage({ viewport: { width: 420, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const t0 = Date.now();
  await page.goto(base + '/web/home/index.html?world=1');
  const samples = []; let clicks = 0, seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  while (Date.now() - t0 < secs * 1000) {
    const els = await page.$$('button:visible, [role=button]:visible, .tab:visible');
    if (els.length) { try { await els[Math.floor(rnd() * els.length)].click({ timeout: 800 }); clicks++; } catch (e) {} }
    if (rnd() < 0.05) await page.keyboard.press('Escape');
    if (clicks % 25 === 0) samples.push(await page.evaluate(() => ({ heap: performance.memory ? performance.memory.usedJSHeapSize : 0, nodes: document.getElementsByTagName('*').length })));
    await page.waitForTimeout(40);
  }
  const first = samples[0] || {}, last = samples[samples.length - 1] || {};
  const timing = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.loadEventEnd) : -1; });
  console.log(JSON.stringify({ seconds: secs, clicks, loadMs: timing, heapStartMB: +(first.heap / 1048576).toFixed(1), heapEndMB: +(last.heap / 1048576).toFixed(1), nodesStart: first.nodes, nodesEnd: last.nodes, errors: [...new Set(errors)].slice(0, 20), errorCount: errors.length }, null, 1));
  await b.close(); server.close();
})();
