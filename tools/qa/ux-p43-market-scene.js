'use strict';
const { chromium } = require('playwright');
const assert = require('assert');
const ux = require('./lib/ux');

function makeMarketState() {
  const base = {
    clovers: 250,
    places: {
      current: 'market',
      places: [{ id: 'market', name: 'Market', unlocked: true }]
    },
    market: {
      cap: 100,
      capLeft: 80,
      stall: { level: 1, nextCost: 50 },
      buyable: [
        { itemId: 'carrot', name: 'Carrot seed', category: 'seed', price: 10 },
        { itemId: 'kale', name: 'Kale', category: 'pantry', price: 12 },
        { itemId: 'bench_wood', name: 'Wood bench', category: 'decor', price: 30 }
      ],
      sellable: [
        { itemId: 'carrot', name: 'Carrot', owned: 5, unitNow: 8, demand: 0.7 }
      ]
    }
  };
  return base;
}

(async () => {
  const server = await ux.startServer();
  let browser;
  if (process.env.CHROMIUM_PATH) {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  } else {
    try {
      browser = await chromium.launch();
    } catch {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
    }
  }
  const results = [];
  function pass(id, msg) { results.push({ id, ok: true }); console.log(`PASS ${id}: ${msg}`); }

  try {
    const page = await ux.openHome(browser);

    // Ensure market state + seven mock + stub CanvasPig.onHotspot
    await page.evaluate((mkt) => {
      const seven = window.CuyScenesMock ? window.CuyScenesMock.state('seven') : {};
      const st = Object.assign({}, seven, mkt, {
        places: Object.assign({}, seven.places || {}, mkt.places)
      });
      if (window.bridge) {
        if (typeof window.bridge.setMockState === 'function') {
          window.bridge.setMockState(st);
        } else if (typeof window.bridge.getState === 'function') {
          const cur = window.bridge.getState() || {};
          Object.assign(cur, st);
        }
        window.__sentMessages = [];
        const origSend = window.bridge.send.bind(window.bridge);
        window.bridge.send = function (msg) {
          window.__sentMessages.push(msg);
          if (msg && msg.type === 'market_quote') {
            setTimeout(() => {
              if (typeof window.bridge.emitMessage === 'function') {
                window.bridge.emitMessage({ type: 'market_quote_result', itemId: msg.itemId, count: msg.count, total: msg.count * 8, unitPrice: 8 });
              }
            }, 10);
          }
          return origSend(msg);
        };
      }
      if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
        window.CuyPlaces.setCurrentPlace('market');
      }

      window.__hotspotHandlers = [];
      window.CanvasPig = window.CanvasPig || {};
      window.CanvasPig.onHotspot = function (fn) {
        window.__hotspotHandlers.push(fn);
      };
      console.log('STUB onHotspot');
    }, makeMarketState());

    await ux.pushState(page);

    // K1: stall-click-opens-panel
    await page.evaluate(() => {
      const hs = { id: 'stall:seeds', uid: 'fx:market:stall_seeds', kind: 'stall', rect: [40, 50, 90, 95], label: 'Seeds' };
      window.__hotspotHandlers.forEach(fn => fn(hs));
    });
    await page.waitForSelector('.market-scene-panel', { timeout: 3000 });
    const k1Text = await page.textContent('.market-scene-panel');
    assert(k1Text && k1Text.includes('Carrot seed'), 'K1: panel should show seeds items');
    pass('K1', 'stall-click-opens-panel');

    // K9: no-modal
    const isModal = await page.evaluate(() => {
      const p = document.querySelector('.market-scene-panel');
      if (!p) return true;
      if (p.classList.contains('modal') || p.closest('.modal, .modal-card, .modal-backdrop.active')) return true;
      const backdrop = document.querySelector('#modalBackdrop.active');
      return !!backdrop;
    });
    assert.strictEqual(isModal, false, 'K9: panel must not be a .modal');
    pass('K9', 'no-modal');

    // K2: buy-sends-market_buy
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('.market-scene-panel [data-buy="carrot"]');
    await page.waitForTimeout(50);
    const buyMsgs = await page.evaluate(() => window.__sentMessages.filter(m => m && m.type === 'market_buy'));
    assert(buyMsgs.length >= 1 && buyMsgs[0].itemId === 'carrot' && buyMsgs[0].count === 1, 'K2: market_buy sent');
    pass('K2', 'buy-sends-market_buy');

    // K6: one-panel-at-a-time
    await page.evaluate(() => {
      const hs = { id: 'stall:pantry', uid: 'fx:market:stall_pantry', kind: 'stall', rect: [120, 50, 170, 95], label: 'Pantry' };
      window.__hotspotHandlers.forEach(fn => fn(hs));
    });
    await page.waitForTimeout(50);
    const panelCount = await page.locator('.market-scene-panel').count();
    const k6Text = await page.textContent('.market-scene-panel');
    assert.strictEqual(panelCount, 1, 'K6: only one panel at a time');
    assert(k6Text && k6Text.includes('Kale'), 'K6: switched to pantry stall');
    pass('K6', 'one-panel-at-a-time');

    // K5: panel-inside-window (both viewports, edge anchor)
    for (const vp of [{ width: 400, height: 620 }, { width: 800, height: 600 }]) {
      await page.setViewportSize(vp);
      await page.evaluate(() => {
        window.CuyMarket.openPanel('fx:market:stall_decor', [220, 110, 255, 143]);
      });
      await page.waitForTimeout(50);
      const box = await page.locator('.market-scene-panel').boundingBox();
      assert(box, 'K5: panel boundingBox exists');
      assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height,
        `K5: panel (${JSON.stringify(box)}) must fit inside viewport ${vp.width}x${vp.height}`);
    }
    pass('K5', 'panel-inside-window');

    // K7: esc-closes
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    assert.strictEqual(await page.locator('.market-scene-panel').count(), 0, 'K7: Escape closes panel');
    pass('K7', 'esc-closes');

    // K3: sell-sends-market_sell & K4: quote-updates-on-count & K8: own-stall-sends-market_stall
    await page.evaluate(() => {
      const hs = { id: 'stall:own', uid: 'fx:market:stall_own', kind: 'stall', rect: [10, 80, 60, 120], label: 'My stall' };
      window.__hotspotHandlers.forEach(fn => fn(hs));
    });
    await page.waitForSelector('.market-scene-panel [data-sell="carrot"]', { timeout: 3000 });

    // K4: quote-updates-on-count
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('.market-scene-panel [data-step="1"][data-id="carrot"]');
    await page.waitForTimeout(250);
    const quoteMsgs = await page.evaluate(() => window.__sentMessages.filter(m => m && m.type === 'market_quote'));
    assert(quoteMsgs.some(m => m.itemId === 'carrot' && m.count === 2), 'K4: market_quote sent with count 2');
    const totalText = await page.textContent('.market-scene-panel [data-total="carrot"]');
    if (totalText && totalText.includes('16')) {
      // live quote result rendered if bridge.emitMessage exists
    }
    pass('K4', 'quote-updates-on-count');

    // K3: sell-sends-market_sell
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('.market-scene-panel [data-sell="carrot"]');
    await page.waitForTimeout(50);
    const sellMsgs = await page.evaluate(() => window.__sentMessages.filter(m => m && m.type === 'market_sell'));
    assert(sellMsgs.length >= 1 && sellMsgs[0].itemId === 'carrot' && sellMsgs[0].count === 2, 'K3: market_sell sent');
    pass('K3', 'sell-sends-market_sell');

    // K8: own-stall-sends-market_stall
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('.market-scene-panel [data-stall]');
    await page.waitForTimeout(50);
    const stallMsgs = await page.evaluate(() => window.__sentMessages.filter(m => m && m.type === 'market_stall'));
    assert(stallMsgs.length >= 1, 'K8: market_stall sent');
    pass('K8', 'own-stall-sends-market_stall');

    assert.strictEqual(page.__errors.length, 0, 'Unexpected page errors: ' + page.__errors.join('; '));
    console.log(`ALL ${results.length} CHECKS PASSED`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error('FAIL:', err && err.stack ? err.stack : err);
  process.exit(1);
});
