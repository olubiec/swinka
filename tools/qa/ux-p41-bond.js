'use strict';

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function countVisibleModals(page) {
  return await page.evaluate(() => {
    // Select root modal/dialog candidate elements
    const candidates = Array.from(document.querySelectorAll(
      '[role="dialog"], .modal-backdrop, [class*="modal"]:not(.modal-card):not(.modal-header):not(.modal-body):not(.modal-close-btn):not(.modal-back), [class*="overlay"]:not(.stage-overlay-hint)'
    ));

    const visible = candidates.filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const opacity = parseFloat(style.opacity);
      if (isNaN(opacity) || opacity <= 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      return true;
    });

    // Keep only top-level visible elements (remove nested)
    const topLevel = visible.filter(el => !visible.some(other => other !== el && other.contains(el)));
    return topLevel.length;
  });
}

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  let hasFailures = false;

  const testScenario = async (name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    } finally {
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  };

  // 1. Read tiles from More dynamically
  await ux.openMore(page);
  const tiles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#modalBody button[data-open-feature]')).map(b => ({
      id: b.getAttribute('data-open-feature'),
      title: b.querySelector('.shop-name')?.textContent.trim() || b.textContent.trim()
    }));
  });
  await ux.closeModal(page);

  const bondTile = tiles.find(t => /bond/i.test(t.title) || /bond/i.test(t.id) || /trick/i.test(t.title) || t.id === 'tricks');
  if (!bondTile) {
    console.error('FAIL: could not find Bond/Tricks tile in More');
    process.exit(1);
  }

  // B1: bond-single-window
  await testScenario('bond-single-window', async () => {
    await ux.openMore(page);
    await page.waitForSelector(`#modalBody button[data-open-feature="${bondTile.id}"]`, { timeout: 3000 });
    await page.click(`#modalBody button[data-open-feature="${bondTile.id}"]`);
    await page.waitForTimeout(200);

    const count = await countVisibleModals(page);
    if (count !== 1) {
      throw new Error(`Expected exactly 1 visible modal/overlay, got ${count}`);
    }
    await ux.closeModal(page);
  });

  // B2: bond-back
  await testScenario('bond-back', async () => {
    await ux.openMore(page);
    await page.waitForSelector(`#modalBody button[data-open-feature="${bondTile.id}"]`, { timeout: 3000 });
    await page.click(`#modalBody button[data-open-feature="${bondTile.id}"]`);
    await page.waitForTimeout(200);

    await page.waitForSelector('.modal-back', { timeout: 3000 });
    await page.click('.modal-back');
    await page.waitForTimeout(200);

    const isGridVisible = await page.isVisible('.album-grid');
    if (!isGridVisible) {
      throw new Error('More grid (.album-grid) is not visible after Back');
    }

    const count = await countVisibleModals(page);
    if (count !== 1) {
      throw new Error(`Expected exactly 1 modal (More grid only, 0 extra overlays), got ${count}`);
    }
    await ux.closeModal(page);
  });

  // B3: no-carry-over
  await testScenario('no-carry-over', async () => {
    await ux.openMore(page);
    await page.waitForSelector(`#modalBody button[data-open-feature="${bondTile.id}"]`, { timeout: 3000 });
    await page.click(`#modalBody button[data-open-feature="${bondTile.id}"]`);
    await page.waitForTimeout(200);

    await page.waitForSelector('.modal-back', { timeout: 3000 });
    await page.click('.modal-back');
    await page.waitForTimeout(200);

    const otherTiles = tiles.filter(t => t.id !== bondTile.id).slice(0, 6);
    for (const tile of otherTiles) {
      await page.waitForSelector(`#modalBody button[data-open-feature="${tile.id}"]`, { timeout: 3000 });
      await page.click(`#modalBody button[data-open-feature="${tile.id}"]`);
      await page.waitForTimeout(200);
      await ux.pushState(page);

      const count = await countVisibleModals(page);
      if (count !== 1) {
        throw new Error(`Tile "${tile.title}" showed ${count} modals, expected 1`);
      }

      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('Tricks & Talents') || bodyText.includes('Bond level:')) {
        throw new Error(`Bond content leaked into tile "${tile.title}"`);
      }
      if (bondTile.title && bondTile.title.toLowerCase() !== tile.title.toLowerCase()) {
        const titleRegex = new RegExp(`\\b${bondTile.title}\\b`, 'i');
        if (titleRegex.test(bodyText)) {
          throw new Error(`Bond title "${bondTile.title}" found in tile "${tile.title}"`);
        }
      }

      await page.waitForSelector('.modal-back', { timeout: 3000 });
      await page.click('.modal-back');
      await page.waitForTimeout(200);
    }
    await ux.closeModal(page);
  });

  // B4: bond-close-x-esc
  await testScenario('bond-close-x-esc', async () => {
    // 1. Close with X
    await ux.openMore(page);
    await page.waitForSelector(`#modalBody button[data-open-feature="${bondTile.id}"]`, { timeout: 3000 });
    await page.click(`#modalBody button[data-open-feature="${bondTile.id}"]`);
    await page.waitForTimeout(200);

    await page.click('#modalCloseBtn');
    await page.waitForTimeout(200);
    await ux.pushState(page);

    let count = await countVisibleModals(page);
    if (count !== 0) {
      throw new Error(`Expected 0 overlays after X close, got ${count}`);
    }

    // 2. Close with Esc
    await ux.openMore(page);
    await page.waitForSelector(`#modalBody button[data-open-feature="${bondTile.id}"]`, { timeout: 3000 });
    await page.click(`#modalBody button[data-open-feature="${bondTile.id}"]`);
    await page.waitForTimeout(200);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await ux.pushState(page);

    count = await countVisibleModals(page);
    if (count !== 0) {
      throw new Error(`Expected 0 overlays after Esc close, got ${count}`);
    }
  });

  // B5: every-tile
  await testScenario('every-tile', async () => {
    await ux.openMore(page);
    for (const tile of tiles) {
      await page.waitForSelector(`#modalBody button[data-open-feature="${tile.id}"]`, { timeout: 3000 });
      await page.click(`#modalBody button[data-open-feature="${tile.id}"]`);
      await page.waitForTimeout(200);
      await ux.pushState(page);

      const count = await countVisibleModals(page);
      if (count !== 1) {
        throw new Error(`Tile "${tile.title}" opened with ${count} modals, expected 1`);
      }

      await page.waitForSelector('.modal-back', { timeout: 3000 });
      await page.click('.modal-back');
      await page.waitForTimeout(200);

      const isGrid = await page.isVisible('.album-grid');
      if (!isGrid) {
        throw new Error(`More grid not visible after Back from "${tile.title}"`);
      }

      const countBack = await countVisibleModals(page);
      if (countBack !== 1) {
        throw new Error(`Expected 1 modal (grid only) after Back from "${tile.title}", got ${countBack}`);
      }
    }
    await ux.closeModal(page);
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
