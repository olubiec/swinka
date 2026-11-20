'use strict';

const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const defects = [];
const results = [];

function recordPass(id, detail) {
  results.push({ id, ok: true, detail });
  console.log(`PASS ${id}: ${detail}`);
}

function recordDefect(id, desc) {
  defects.push({ id, desc });
  results.push({ id, ok: false, detail: desc });
  console.log(`DEFECT ${id}: ${desc}`);
}

async function setPlace(page, placeId) {
  await page.evaluate((id) => {
    if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
      window.CuyPlaces.setCurrentPlace(id);
    }
  }, placeId);
  await page.waitForTimeout(350);
}

async function getPlace(page) {
  return page.evaluate(() => {
    if (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function') {
      return window.CuyPlaces.getCurrentPlace();
    }
    return null;
  });
}

async function getHotspots(page) {
  return page.evaluate(() => {
    const cp = window.CanvasPig;
    if (cp && typeof cp.getHotspots === 'function') return cp.getHotspots() || [];
    if (cp && Array.isArray(cp.hotspots)) return cp.hotspots;
    return [];
  });
}

async function clickSceneRect(page, rect) {
  const pt = await page.evaluate((r) => {
    const canvas = document.querySelector('#pigCanvas');
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    const cx = ((r[0] + r[2]) / 2) / 256;
    const cy = ((r[1] + r[3]) / 2) / 144;
    return { x: box.left + cx * box.width, y: box.top + cy * box.height };
  }, rect);
  if (!pt) throw new Error('#pigCanvas not found');
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(180);
}

async function clickCanvasBg(page, offsetX = 20, offsetY = 20) {
  const pt = await page.evaluate(({ ox, oy }) => {
    const canvas = document.querySelector('#pigCanvas');
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    return { x: box.left + ox, y: box.top + oy };
  }, { ox: offsetX, oy: offsetY });
  if (!pt) throw new Error('#pigCanvas not found');
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(180);
}

function findStallHotspot(hotspots, aliases) {
  return hotspots.find((h) => {
    const id = String(h.id || '').toLowerCase();
    const uid = String(h.uid || '').toLowerCase();
    return aliases.some((a) => id === a || uid === a || id.includes(a));
  });
}

async function sampleCanopyColors(page, rects) {
  return page.evaluate((stallRects) => {
    const canvas = document.querySelector('#pigCanvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const sx = canvas.width / 256;
    const sy = canvas.height / 144;
    return stallRects.map((r) => {
      const x0 = Math.max(0, Math.floor(r[0] * sx));
      const x1 = Math.min(canvas.width, Math.ceil(r[2] * sx));
      const y0 = Math.max(0, Math.floor((r[1] - 8) * sy));
      const y1 = Math.min(canvas.height, Math.ceil((r[1] + (r[3] - r[1]) * 0.55) * sy));
      const w = Math.max(1, x1 - x0);
      const h = Math.max(1, y1 - y0);
      const data = ctx.getImageData(x0, y0, w, h).data;
      const counts = new Map();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([k, v]) => `${k}:${v}`);
      return { uniqueColors: counts.size, signature: top.join('|') };
    });
  }, rects);
}

async function launchBrowser() {
  for (const opts of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) {
    try {
      return await chromium.launch(opts);
    } catch (err) {
      if (!/Executable doesn't exist/i.test(err.message) || opts.channel === 'chrome') throw err;
    }
  }
}

async function run() {
  const server = await startServer();
  const browser = await launchBrowser();
  let page;

  try {
    page = await openHome(browser, { query: '?mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForTimeout(300);

    // --- MARKET TESTS ---
    await setPlace(page, 'market');
    const marketHotspots = await getHotspots(page);

    const seedStall = findStallHotspot(marketHotspots, ['stall:seeds', 'stall:left', 'fx:market:stall_left']);
    const foodStall = findStallHotspot(marketHotspots, ['stall:food', 'stall:center', 'stall:pantry', 'fx:market:stall_center']);
    const craftStall = findStallHotspot(marketHotspots, ['stall:craft', 'stall:right', 'stall:toys', 'stall:decor', 'fx:market:stall_right']);

    // M1: distinct category, title, and signboard pixels
    if (!seedStall || !foodStall || !craftStall) {
      recordDefect('M1-stalls-missing', `Missing stall hotspots in market: seeds=${!!seedStall}, food=${!!foodStall}, craft=${!!craftStall}`);
    } else {
      const canopySamples = await sampleCanopyColors(page, [seedStall.rect, foodStall.rect, craftStall.rect]);
      const sigs = (canopySamples || []).map((s) => s.signature);
      const distinctSigs = new Set(sigs).size;

      const checks = [
        { name: 'seeds', hs: seedStall, titleRe: /seed/i, cats: ['seeds', 'seed'] },
        { name: 'food', hs: foodStall, titleRe: /food/i, cats: ['food', 'pantry'] },
        { name: 'craft', hs: craftStall, titleRe: /craft/i, cats: ['toys', 'decor', 'craft', 'home'] }
      ];

      const m1Issues = [];
      for (const c of checks) {
        await clickSceneRect(page, c.hs.rect);
        const panelInfo = await page.evaluate(() => {
          const panel = document.querySelector('#marketStallPanel') || document.querySelector('.market-scene-panel');
          if (!panel) return null;
          const title = (panel.querySelector('.market-scene-title')?.textContent || '').trim();
          const activeTab = panel.querySelector('.stall-cat-tab.active, .stall-cat-tab[aria-selected="true"], .market-tab.active, .market-tab[aria-selected="true"]');
          const cat = activeTab ? (activeTab.getAttribute('data-cat') || activeTab.getAttribute('data-panel-tab') || '') : '';
          return { hasId: panel.id === 'marketStallPanel', title, cat };
        });
        if (!panelInfo) {
          m1Issues.push(`${c.name}: panel did not open`);
        } else {
          if (!panelInfo.hasId) m1Issues.push(`${c.name}: missing #marketStallPanel id`);
          if (!c.titleRe.test(panelInfo.title)) m1Issues.push(`${c.name}: title "${panelInfo.title}" does not match ${c.titleRe}`);
          if (!c.cats.includes(panelInfo.cat)) m1Issues.push(`${c.name}: active category "${panelInfo.cat}" not in [${c.cats.join(',')}]`);
        }
        await page.waitForTimeout(120);
        await clickCanvasBg(page, 20, 20);
      }

      if (!canopySamples || distinctSigs < 3) {
        m1Issues.push(`signboard canopy colors not distinct across 3 stalls (distinct=${distinctSigs})`);
      }

      if (m1Issues.length === 0) {
        recordPass('M1-each-stall-has-distinct-category-and-signboard', 'All 3 stalls open with expected title/category and distinct canopy signboard pixels');
      } else {
        recordDefect('M1-each-stall-has-distinct-category-and-signboard', m1Issues.join('; '));
      }
    }

    // M2: order board hotspot opens orders
    const orderHotspot = findStallHotspot(marketHotspots, ['stall:orders', 'order_board', 'fx:market:order_board', 'orders']);
    if (!orderHotspot) {
      recordDefect('M2-order-board-hotspot-opens-orders', 'No stall:orders / order_board hotspot found in market scene');
    } else {
      await clickSceneRect(page, orderHotspot.rect);
      const ordersInfo = await page.evaluate(() => {
        const panel = document.querySelector('#marketStallPanel, .market-scene-panel');
        if (!panel) return { open: false };
        const bodyText = panel.querySelector('.market-scene-body')?.textContent || panel.textContent || '';
        const hasOrdersDom = !!panel.querySelector('[data-fill-order], [data-order-index], .market-orders, .stall-order-card, .order-card');
        const activeMode = panel.querySelector('.stall-mode-tab.active, .stall-mode-tab[aria-selected="true"]')?.getAttribute('data-mode') || '';
        return { open: true, hasOrdersDom, activeMode, hasOrderText: /order/i.test(bodyText) };
      });
      if (ordersInfo.open && (ordersInfo.hasOrdersDom || ordersInfo.activeMode === 'orders' || ordersInfo.hasOrderText)) {
        recordPass('M2-order-board-hotspot-opens-orders', `Order board opened Orders view (mode=${ordersInfo.activeMode || 'orders'})`);
      } else {
        recordDefect('M2-order-board-hotspot-opens-orders', `Order board click did not show orders view: ${JSON.stringify(ordersInfo)}`);
      }
    }

    // M3: market panel closes on background click
    await page.waitForTimeout(120);
    const wasMarketOpen = await page.locator('#marketStallPanel, .market-scene-panel').isVisible().catch(() => false);
    if (!wasMarketOpen && seedStall) {
      await clickSceneRect(page, seedStall.rect);
      await page.waitForTimeout(120);
    }
    await clickCanvasBg(page, 20, 20);
    const isMarketStillOpen = await page.locator('#marketStallPanel, .market-scene-panel').isVisible().catch(() => false);
    if (!isMarketStillOpen) {
      recordPass('M3-market-panel-closes-on-background-click', '#marketStallPanel closed after clicking #pigCanvas background (20, 20)');
    } else {
      recordDefect('M3-market-panel-closes-on-background-click', '#marketStallPanel remained open after clicking #pigCanvas background (20, 20)');
    }

    // --- FARM TESTS ---
    await setPlace(page, 'farm');
    const farmHotspots = await getHotspots(page);
    const plotHotspots = farmHotspots.filter((h) => h.kind === 'plot' || /^plot[:_]/i.test(String(h.id || '')));

    let openedEmptyPlot = null;
    for (const plot of plotHotspots) {
      await clickSceneRect(page, plot.rect);
      const hasSeedBtns = await page.locator('#farmPopover .farm-seed-btn, .farm-scene-panel .farm-seed-btn, .farm-scene-panel [data-plant]').count();
      if (hasSeedBtns > 0) {
        openedEmptyPlot = plot;
        break;
      }
      await page.waitForTimeout(120);
      await clickCanvasBg(page, 20, 20);
    }

    // F1: farm popover shows owned seed counts (In bag:)
    if (!openedEmptyPlot) {
      recordDefect('F1-farm-popover-shows-owned-seed-counts', `Could not open an empty plot planting popover (plots found: ${plotHotspots.length})`);
    } else {
      const f1 = await page.evaluate(() => {
        const pop = document.querySelector('#farmPopover');
        if (!pop) return { hasPopover: false };
        const btns = [...pop.querySelectorAll('.farm-seed-btn')];
        if (btns.length === 0) return { hasPopover: true, btnCount: 0, missingBag: 0 };
        let missingBag = 0;
        for (const btn of btns) {
          const row = btn.closest('.farm-crop, li') || btn;
          if (!/In bag:\s*\d+/i.test(row.textContent || '')) missingBag++;
        }
        return { hasPopover: true, btnCount: btns.length, missingBag };
      });
      if (f1.hasPopover && f1.btnCount > 0 && f1.missingBag === 0) {
        recordPass('F1-farm-popover-shows-owned-seed-counts', `#farmPopover rendered ${f1.btnCount} .farm-seed-btn items, all showing "In bag:" counts`);
      } else {
        recordDefect('F1-farm-popover-shows-owned-seed-counts', `Farm popover seed bag check failed: ${JSON.stringify(f1)}`);
      }
    }

    // F2: farm popover has close × and closes on background click
    if (!openedEmptyPlot) {
      recordDefect('F2-farm-popover-has-close-x-and-closes-on-background-click', 'Skipped because empty plot popover could not be opened');
    } else {
      const closeBtn = page.locator('#farmPopover .farm-popover-close');
      const closeVisible = await closeBtn.isVisible().catch(() => false);
      const closeText = closeVisible ? (await closeBtn.textContent()).trim() : '';
      let closedByX = false;
      if (closeVisible) {
        await closeBtn.click();
        await page.waitForTimeout(150);
        closedByX = !(await page.locator('#farmPopover').isVisible().catch(() => false));
      }

      await clickSceneRect(page, openedEmptyPlot.rect);
      await page.waitForTimeout(120);
      const reopened = await page.locator('#farmPopover').isVisible().catch(() => false);
      await clickCanvasBg(page, 20, 20);
      const closedByBg = !(await page.locator('#farmPopover').isVisible().catch(() => false));

      if (closeVisible && closeText.includes('\u00d7') && closedByX && reopened && closedByBg) {
        recordPass('F2-farm-popover-has-close-x-and-closes-on-background-click', '#farmPopover closed via .farm-popover-close (×) and via #pigCanvas background click');
      } else {
        recordDefect(
          'F2-farm-popover-has-close-x-and-closes-on-background-click',
          `closeVisible=${closeVisible}, closeText="${closeText}", closedByX=${closedByX}, reopened=${reopened}, closedByBg=${closedByBg}`
        );
      }
    }

    // F3: farm goto market button
    if (!openedEmptyPlot) {
      recordDefect('F3-farm-goto-market-button', 'Skipped because empty plot popover could not be opened');
    } else {
      await clickSceneRect(page, openedEmptyPlot.rect);
      await page.waitForTimeout(120);
      const gotoBtn = page.locator('#farmPopover .farm-goto-market-btn');
      const hasExactClass = (await gotoBtn.count()) > 0;
      const fallbackBtn = page.locator('#farmPopover [data-go-market="1"], #farmPopover .farm-market-btn');
      if (hasExactClass) {
        await gotoBtn.first().click();
        await page.waitForTimeout(300);
        const place = await getPlace(page);
        if (place === 'market') {
          recordPass('F3-farm-goto-market-button', 'Clicking .farm-goto-market-btn switched place to market');
        } else {
          recordDefect('F3-farm-goto-market-button', `Place after clicking .farm-goto-market-btn was "${place}", expected "market"`);
        }
      } else if ((await fallbackBtn.count()) > 0) {
        await fallbackBtn.first().click();
        await page.waitForTimeout(300);
        const place = await getPlace(page);
        recordDefect('F3-farm-goto-market-button', `Missing .farm-goto-market-btn class (fallback switched to "${place}")`);
      } else {
        recordDefect('F3-farm-goto-market-button', '.farm-goto-market-btn not found in #farmPopover');
      }
    }

    // F4: no console errors
    if (page.__errors.length === 0) {
      recordPass('F4-no-console-errors', 'Zero console/page errors recorded');
    } else {
      recordDefect('F4-no-console-errors', page.__errors.join(' | '));
    }

    console.log(`\nSummary: ${results.filter((r) => r.ok).length}/${results.length} passed, ${defects.length} defect(s)`);
    if (process.env.STRICT === '1' && defects.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
