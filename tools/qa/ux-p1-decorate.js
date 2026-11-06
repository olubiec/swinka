'use strict';
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, 'node_modules');
require('module').Module._initPaths();

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  let hasFailures = false;
  const failedScenarios = [];

  const testScenario = async (name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      failedScenarios.push(name + ': ' + err.message);
      console.log('FAIL ' + name + ': ' + err.message);
    } finally {
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  };

  // Helper to ensure mushroom lamp is in inventory and shop
  async function seedMushroomLamp() {
    await page.evaluate(() => {
      const bridge = window.bridge;
      const s = bridge.currentState;
      if (!s.inventory) s.inventory = {};
      s.inventory['lamp_mushroom'] = 1;
      if (!s.shop) s.shop = { items: [] };
      if (!s.shop.items.some(i => i.id === 'lamp_mushroom')) {
        s.shop.items.push({
          id: 'lamp_mushroom',
          name: 'Mushroom lamp',
          category: 'decor',
          price: 140,
          icon: 'lamp',
          one_time: true,
          slot: 'lamp',
          description: 'Warm glow.',
          look: { type: 'mushroom' }
        });
      }
      bridge.broadcastState();
    });
    await page.waitForTimeout(150);
  }

  // D1: decorate-lamp-visible-change
  await testScenario('decorate-lamp-visible-change', async () => {
    await seedMushroomLamp();
    await ux.openMore(page);
    await ux.openFromMore(page, 'Decorate');
    await page.waitForSelector('.decor-panel', { timeout: 3000 });

    const lampBtn = page.locator('.decor-panel button[data-id="lamp_mushroom"]');
    const btnCount = await lampBtn.count();
    if (btnCount === 0) {
      throw new Error('Mushroom lamp button not found in Decorate panel');
    }

    const beforeUrl = await page.$eval('.decor-mini-preview', cvs => cvs.toDataURL()).catch(() => null);

    await lampBtn.click();
    await page.waitForTimeout(400);

    const roomEditorOpen = await page.isVisible('.rooms-editor, .room-panel');
    const afterUrl = await page.$eval('.decor-mini-preview', cvs => cvs.toDataURL()).catch(() => null);

    if (!roomEditorOpen && (!afterUrl || afterUrl === beforeUrl)) {
      throw new Error('Clicking mushroom lamp did not change mini preview canvas and did not open room editor');
    }
    await ux.closeModal(page);
  });

  // D2: decorate-opens-room-editor
  await testScenario('decorate-opens-room-editor', async () => {
    await seedMushroomLamp();
    await ux.openMore(page);
    await ux.openFromMore(page, 'Decorate');
    await page.waitForSelector('.decor-panel', { timeout: 3000 });

    const lampBtn = page.locator('.decor-panel button[data-id="lamp_mushroom"]');
    const text = (await lampBtn.textContent()).trim();
    const ariaLabel = (await lampBtn.getAttribute('aria-label')) || '';
    if (text !== 'Place in room' && ariaLabel !== 'Place in room' && !text.includes('Place in room')) {
      throw new Error(`Owned not yet placed decor button label is "${text}", expected "Place in room"`);
    }

    await lampBtn.click();
    await page.waitForSelector('.rooms-editor, .room-panel', { timeout: 3000 });

    // Verify it is in the pig's room
    const tabSelected = await page.$eval('.room-tab.is-selected', el => el.dataset.room).catch(() => null);
    if (!tabSelected || (!tabSelected.startsWith('pig:') && tabSelected !== 'salon')) {
      throw new Error(`Expected room editor to open for pig's room, got "${tabSelected}"`);
    }

    // Placing item marker
    const placingItem = await page.isVisible('.placing-item, .room-item.is-picked[data-item="lamp_mushroom"]');
    if (!placingItem) {
      throw new Error('Expected placing-item marker or picked lamp_mushroom in room editor');
    }

    // Hint
    const hint = await page.$eval('.room-hint', el => el.textContent.trim());
    if (!hint.includes('Tap the room to place it')) {
      throw new Error(`Expected hint to contain "Tap the room to place it", got "${hint}"`);
    }

    // Back returns to Decorate
    await page.waitForSelector('.modal-back', { timeout: 2000 });
    await page.click('.modal-back');
    await page.waitForSelector('.decor-panel', { timeout: 3000 });
    await ux.closeModal(page);
  });

  // D3: place-and-save
  await testScenario('place-and-save', async () => {
    await seedMushroomLamp();
    await ux.openMore(page);
    await ux.openFromMore(page, 'Decorate');
    await page.waitForSelector('.decor-panel', { timeout: 3000 });

    const lampBtn = page.locator('.decor-panel button[data-id="lamp_mushroom"]');
    await lampBtn.click();
    await page.waitForSelector('.rooms-editor, .room-panel', { timeout: 3000 });

    const canvas = page.locator('.room-canvas');
    await page.waitForSelector('.room-canvas', { timeout: 3000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Room canvas not visible');

    // Click on a free floor cell, e.g. cell (3, 3)
    const scale = await page.evaluate(() => {
      const c = document.querySelector('.room-canvas');
      return c ? c.width / 160 : 1;
    });
    const cellPx = 16 * (scale >= 1 ? scale : 1);

    // Click free cell (3, 3)
    const freshBox1 = await page.locator('.room-canvas').boundingBox();
    await page.mouse.click(freshBox1.x + 3.5 * cellPx, freshBox1.y + 3.5 * cellPx);
    await page.waitForTimeout(300);

    // Verify item is placed in mock state
    const isPlaced = await page.evaluate(() => {
      const st = window.bridge.currentState;
      for (const p of Object.keys(st.rooms?.layouts || {})) {
        if ((st.rooms.layouts[p].items || []).some(i => i.itemId === 'lamp_mushroom')) return true;
      }
      return false;
    });
    if (!isPlaced) {
      throw new Error('lamp_mushroom was not placed in any room layout after clicking free cell');
    }

    // A second click on an occupied cell does not place it (existing rule) and shows a toast
    // Pick an item from drawer to try placing on occupied cell (3, 3)
    await page.evaluate(() => {
      const btn = document.querySelector('.room-item:not([disabled])');
      if (btn) btn.click();
    });
    await page.waitForTimeout(100);

    const freshBox2 = await page.locator('.room-canvas').boundingBox();
    await page.mouse.click(freshBox2.x + 3.5 * cellPx, freshBox2.y + 3.5 * cellPx);
    await page.waitForTimeout(300);

    const toastVisible = await page.evaluate(() => {
      const t = document.getElementById('globalToast');
      return t && t.textContent.trim().length > 0;
    });
    if (!toastVisible) {
      throw new Error('Clicking an occupied cell did not show a toast');
    }

    // Return to Decorate to check item is no longer "not placed" and room preview shows it
    if (await page.isVisible('.modal-back')) {
      await page.click('.modal-back');
      await page.waitForSelector('.decor-panel', { timeout: 3000 });
      const placedBtnText = (await page.locator('.decor-panel button[data-id="lamp_mushroom"]').textContent()).trim();
      if (placedBtnText === 'Place in room') {
        throw new Error('Item button in Decorate still says "Place in room" after being placed');
      }
    }

    await ux.closeModal(page);
  });

  // D4: no-dead-buttons
  await testScenario('no-dead-buttons', async () => {
    await seedMushroomLamp();
    await ux.openMore(page);
    await ux.openFromMore(page, 'Decorate');
    await page.waitForSelector('.decor-panel', { timeout: 3000 });

    const count = await page.locator('.decor-panel button').count();
    for (let i = 0; i < count; i++) {
      const btn = page.locator('.decor-panel button').nth(i);
      const btnInfo = await btn.evaluate(b => ({
        text: b.textContent.trim(),
        slot: b.dataset.slot,
        id: b.dataset.id,
        className: b.className
      }));

      const stateBefore = await page.evaluate(() => JSON.stringify(window.bridge.currentState?.decor));
      const domBefore = await page.$eval('.decor-panel', el => el.innerHTML);
      const canvasBefore = await page.$eval('.decor-mini-preview', cvs => cvs.toDataURL()).catch(() => null);

      await btn.click();
      await page.waitForTimeout(300);

      const stateAfter = await page.evaluate(() => JSON.stringify(window.bridge.currentState?.decor));
      const inRooms = await page.isVisible('.rooms-editor, .room-panel');
      const domAfter = await page.$eval('.decor-panel', el => el.innerHTML).catch(() => null);
      const canvasAfter = await page.$eval('.decor-mini-preview', cvs => cvs.toDataURL()).catch(() => null);

      const changed = inRooms || (stateBefore !== stateAfter) || (domBefore !== domAfter) || (canvasBefore !== canvasAfter);
      if (!changed) {
        throw new Error(`Button "${btnInfo.text}" (slot: ${btnInfo.slot}, id: ${btnInfo.id}) caused no state, canvas or DOM change within 1500ms`);
      }

      if (inRooms) {
        // Return back to decorate
        if (await page.isVisible('.modal-back')) {
          await page.click('.modal-back');
          await page.waitForSelector('.decor-panel', { timeout: 2000 });
        } else {
          await ux.closeModal(page);
          await ux.openMore(page);
          await ux.openFromMore(page, 'Decorate');
          await page.waitForSelector('.decor-panel', { timeout: 2000 });
        }
      }
    }
    await ux.closeModal(page);
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.log('FAILURES SUMMARY:');
    failedScenarios.forEach(s => console.log('  - ' + s));
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
