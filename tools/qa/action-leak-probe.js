// Per-action leak probe: repeats one game action class (market stepper, market buy, market tabs, sell tab, place bar,
// farm plots, farm water/harvest, shop buy) or a seeded mix of them, and prints the forced-GC DOM node count,
// JS listener count and game-state size every 10 actions. A growing node or listener series that does not follow
// the game state points at a retained screen or subscription. Screens alone are checked by feature-leak-probe.js.
// Usage (repo root): CHROMIUM_PATH=/opt/pw-browsers/chromium ACTION=mix REPS=200 node tools/qa/action-leak-probe.js
// ACTION: one of the names in ACTIONS below, or "mix" (MIX=comma list of names, default: place-open,farm-plot,market-buy,market-step,shop-buy).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const ACTION = process.env.ACTION || 'mix';
const REPS = parseInt(process.env.REPS || '60', 10);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg' };

// Each action runs one step inside the page (opening the screen first when needed) and clicks through the DOM.
const ACTIONS = {
  'market-step': (i) => {
    if (!document.querySelector('.feature-market .market-step')) window.CuyHome.openFeature('market');
    const b = [...document.querySelectorAll('.market-step')]; if (b.length) b[(i * 7) % b.length].click();
  },
  'market-buy': (i) => {
    if (!document.querySelector('.feature-market')) window.CuyHome.openFeature('market');
    const cur = window.bridge.getState(); cur.clovers = 100000; window.bridge.currentState = cur; window.bridge.broadcastState();
    const b = [...document.querySelectorAll('.market-btn[data-buy]')]; if (b.length) b[i % b.length].click();
  },
  'market-tab': (i) => {
    if (!document.querySelector('.feature-market')) window.CuyHome.openFeature('market');
    const b = [...document.querySelectorAll('.market-tab')]; if (b.length) b[i % b.length].click();
  },
  'market-sell-step': (i) => {
    if (!document.querySelector('.feature-market')) window.CuyHome.openFeature('market');
    const t = document.querySelector('.market-tab[data-tab="sell"]'); if (t && !t.classList.contains('is-current')) t.click();
    const b = [...document.querySelectorAll('.market-step')]; if (b.length) b[i % b.length].click();
  },
  'place-open': (i) => {
    const b = [...document.querySelectorAll('.place-btn:not(.is-locked)')]; if (b.length) b[i % b.length].click();
    document.getElementById('modalCloseBtn')?.click();
  },
  'farm-plot': (i) => {
    if (!document.querySelector('.feature-farm')) window.CuyHome.openFeature('farm');
    const cur = window.bridge.getState(); if (cur.clovers !== undefined) { cur.clovers = 100000; window.bridge.currentState = cur; window.bridge.broadcastState(); }
    const ps = [...document.querySelectorAll('.farm-plot')]; if (ps.length) ps[i % ps.length].click();
    const pl = [...document.querySelectorAll('[data-plant]:not([disabled])')]; if (pl.length) pl[0].click();
  },
  'farm-water': (i) => {
    if (!document.querySelector('.feature-farm')) window.CuyHome.openFeature('farm');
    const ws = [...document.querySelectorAll('[data-water-all]:not([disabled]), [data-harvest-all]:not([disabled])')]; if (ws.length) ws[i % ws.length].click();
  },
  'shop-buy': (i) => {
    if (!document.querySelector('.feature-shop')) window.CuyHome.openFeature('shop');
    const b = [...document.querySelectorAll('.feature-shop button')].filter((x) => !x.disabled && x.offsetParent); if (b.length) b[i % b.length].click();
  },
  'open-close': () => { window.CuyHome.openFeature('market'); document.getElementById('modalCloseBtn')?.click(); },
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
  const pool = ACTION === 'mix' ? (process.env.MIX || 'place-open,farm-plot,market-buy,market-step,shop-buy').split(',') : [ACTION];
  if (pool.some((n) => !ACTIONS[n])) throw new Error('unknown action in: ' + pool.join(','));
  const server = await serve();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--enable-precise-memory-info'] });
  const page = await (await b.newContext({ viewport: { width: 420, height: 640 } })).newPage();
  const cdp = await page.context().newCDPSession(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/web/home/index.html?world=1`);
  await page.waitForTimeout(1000);
  // Forced GC twice, then the counters: detached nodes that are still alive would otherwise be counted.
  const measure = async () => {
    for (let k = 0; k < 2; k++) { await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); await page.waitForTimeout(60); }
    const d = await cdp.send('Memory.getDOMCounters');
    const st = await page.evaluate(() => JSON.stringify(window.bridge.getState()).length);
    return { nodes: d.nodes, listeners: d.jsEventListeners, state: st };
  };
  const run = (i) => page.evaluate(([name, n]) => ACTIONS_IN_PAGE[name](n), [pool[i % pool.length], i]);
  // Actions are run inside the page via the same function bodies, so they are serialized here once.
  await page.evaluate((src) => { window.ACTIONS_IN_PAGE = {}; for (const [k, v] of Object.entries(src)) window.ACTIONS_IN_PAGE[k] = eval('(' + v + ')'); },
    Object.fromEntries(Object.entries(ACTIONS).map(([k, f]) => [k, f.toString()])));
  for (let i = 0; i < 5; i++) await run(i);
  const rows = [];
  rows.push({ rep: 0, ...(await measure()) });
  for (let i = 1; i <= REPS; i++) {
    await run(i);
    await page.waitForTimeout(40);
    if (i % 10 === 0) rows.push({ rep: i, ...(await measure()) });
  }
  console.log(JSON.stringify({ action: ACTION, pool, reps: REPS, rows, errors: [...new Set(errors)].slice(0, 5) }));
  await b.close();
  server.close();
  if (errors.length) { console.error('action-leak-probe: page errors'); process.exit(1); }
  console.log('action-leak-probe: DONE (series are reported, not judged)');
})().catch((e) => { console.error('action-leak-probe crashed: ' + (e && e.stack || e)); process.exit(1); });
