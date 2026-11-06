'use strict';
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, 'node_modules');
require('module').Module._initPaths();

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let hasFailures = false;

  const testScenario = async (name, fn) => {
    let page = null;
    try {
      page = await ux.openHome(browser, { query: 'world=1' });
      page.setDefaultTimeout(7000);
      await fn(page);
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    } finally {
      if (page) {
        try { await page.close(); } catch (e) {}
      }
    }
  };

  // Helper to seed room with gramophone and records
  async function seedRoomWithGramophone(page) {
    await page.evaluate(() => {
      const bridge = window.bridge;
      const s = bridge.currentState;
      if (!s.rooms) s.rooms = { catalog: [], layouts: {} };
      if (!s.rooms.catalog) s.rooms.catalog = [];
      if (!s.rooms.catalog.some(c => c.id === 'gramophone')) {
        s.rooms.catalog.push({
          id: 'gramophone',
          name: 'Gramophone',
          places: ['salon'],
          w: 1,
          h: 1,
          layer: 'floor',
          price: 15,
          comfort: 0,
          repeatable: true,
          owned: 1,
          placed: 1
        });
      }
      if (!s.rooms.layouts) s.rooms.layouts = {};
      if (!s.rooms.layouts.salon) s.rooms.layouts.salon = { cols: 12, rows: 7, wallRows: 2, items: [] };
      if (!s.rooms.layouts.salon.items.some(i => i.itemId === 'gramophone')) {
        s.rooms.layouts.salon.items.push({
          uid: 'gramophone_1',
          itemId: 'gramophone',
          x: 4,
          y: 3
        });
      }
      if (!s.music) s.music = {};
      s.music.records = { rec_s1_poranek: 1 };
      s.music.playerPlaced = { salon: 'player_turntable' };
      bridge.broadcastState();
    });
    await page.waitForTimeout(100);
  }

  // M1: hidden-by-default
  await testScenario('hidden-by-default', async (page) => {
    const isHidden = await page.evaluate(() => {
      const panel = document.querySelector('.mp_panel');
      if (!panel) return true;
      const style = window.getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      return style.display === 'none' || rect.width === 0;
    });
    if (!isHidden) {
      throw new Error('Music player panel is visible on fresh page load');
    }
  });

  // M2: click-gramophone-shows
  await testScenario('click-gramophone-shows', async (page) => {
    await seedRoomWithGramophone(page);
    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    const trigger = page.locator('.room-gramophone-trigger, [aria-label*="Gramophone"]');
    if ((await trigger.count()) > 0) {
      await trigger.first().click();
    } else {
      // Fallback: click canvas cell for (x:4, y:3)
      await page.click('.room-canvas', { position: { x: 4 * 16 + 8, y: 3 * 16 + 8 } });
    }

    // Panel must be visible within 500 ms
    await page.waitForFunction(() => {
      const p = document.querySelector('.mp_panel');
      return p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0;
    }, { timeout: 500 });

    // Play/Pause button works (state toggles in mock engine)
    const initialPlaying = await page.evaluate(() => {
      const engine = window.CuyMusicPlayer.autoEngine();
      return engine ? engine.getState().status : null;
    });

    const playBtn = page.locator('.mp_panel .mp_btn').first();
    await playBtn.click();
    await page.waitForTimeout(200);

    const toggledPlaying = await page.evaluate(() => {
      const engine = window.CuyMusicPlayer.autoEngine();
      return engine ? engine.getState().status : null;
    });

    if (initialPlaying === toggledPlaying) {
      throw new Error(`Engine status did not toggle: was ${initialPlaying}, still ${toggledPlaying}`);
    }
  });

  // M3: hide-paths
  await testScenario('hide-paths', async (page) => {
    await seedRoomWithGramophone(page);
    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    const trigger = page.locator('.room-gramophone-trigger, [aria-label*="Gramophone"]').first();
    const isPanelVisible = () => page.evaluate(() => {
      const p = document.querySelector('.mp_panel');
      return !!(p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0);
    });
    const waitForPanel = () => page.waitForFunction(() => {
      const p = document.querySelector('.mp_panel');
      return !!(p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0);
    }, { timeout: 1000 });

    // 1. Open panel
    await trigger.click();
    await waitForPanel();

    const statusBefore = await page.evaluate(() => window.CuyMusicPlayer.autoEngine().getState().status);

    // Path A: Second click on gramophone hides panel
    await trigger.click();
    await page.waitForTimeout(200);
    if (await isPanelVisible()) throw new Error('Second click on gramophone did not hide panel');
    let statusAfter = await page.evaluate(() => window.CuyMusicPlayer.autoEngine().getState().status);
    if (statusBefore !== statusAfter) throw new Error('Playback state changed when panel was hidden');

    // 2. Open panel again
    await trigger.click();
    await waitForPanel();

    // Path B: Escape key hides panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    if (await isPanelVisible()) throw new Error('Escape key did not hide panel');
    statusAfter = await page.evaluate(() => window.CuyMusicPlayer.autoEngine().getState().status);
    if (statusBefore !== statusAfter) throw new Error('Playback state changed on Escape hide');

    // 3. Open panel again
    await trigger.click();
    await waitForPanel();

    // Path C: Click outside hides panel
    await page.click('.room-head');
    await page.waitForTimeout(200);
    if (await isPanelVisible()) throw new Error('Click outside did not hide panel');
    statusAfter = await page.evaluate(() => window.CuyMusicPlayer.autoEngine().getState().status);
    if (statusBefore !== statusAfter) throw new Error('Playback state changed on click outside hide');
  });

  // M4: no-gramophone-no-panel
  await testScenario('no-gramophone-no-panel', async (page) => {
    // Clear all gramophone items from room and music state
    await page.evaluate(() => {
      const bridge = window.bridge;
      const s = bridge.currentState;
      if (s.rooms && s.rooms.catalog) {
        s.rooms.catalog = s.rooms.catalog.filter(c => c.id !== 'gramophone' && c.id !== 'player_gramophone');
      }
      if (s.rooms && s.rooms.layouts) {
        for (const k of Object.keys(s.rooms.layouts)) {
          if (s.rooms.layouts[k].items) {
            s.rooms.layouts[k].items = s.rooms.layouts[k].items.filter(i => i.itemId !== 'gramophone' && i.itemId !== 'player_gramophone');
          }
        }
      }
      if (s.music) {
        s.music.playerOwned = [];
        s.music.playerPlaced = {};
      }
      bridge.broadcastState();
    });

    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    // Ensure trigger does not exist
    const triggerCount = await page.locator('.room-gramophone-trigger').count();
    if (triggerCount > 0) throw new Error('Gramophone trigger rendered when no gramophone owned/placed');

    // Trying to show panel should fail or keep panel hidden
    await page.evaluate(() => {
      if (window.CuyMusicPlayer && typeof window.CuyMusicPlayer.show === 'function') {
        window.CuyMusicPlayer.show();
      }
    });

    const isVisible = await page.evaluate(() => {
      const p = document.querySelector('.mp_panel');
      return !!(p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0);
    });
    if (isVisible) throw new Error('Panel opened without an owned or placed gramophone');
  });

  // M5: keyboard
  await testScenario('keyboard', async (page) => {
    await seedRoomWithGramophone(page);
    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    const trigger = page.locator('.room-gramophone-trigger, [aria-label*="Gramophone"]').first();
    await trigger.focus();

    const isFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el && (el.classList.contains('room-gramophone-trigger') || el.getAttribute('aria-label')?.includes('Gramophone'));
    });
    if (!isFocused) throw new Error('Gramophone trigger is not focusable');

    // Press Space or Enter to open
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    let isVisible = await page.evaluate(() => {
      const p = document.querySelector('.mp_panel');
      return !!(p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0);
    });
    if (!isVisible) throw new Error('Space key did not toggle panel open');

    // Press Enter to toggle close
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    isVisible = await page.evaluate(() => {
      const p = document.querySelector('.mp_panel');
      return !!(p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0);
    });
    if (isVisible) throw new Error('Enter key did not toggle panel closed');
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.error('UX P2 PLAYER TESTS FAILED');
    process.exit(1);
  } else {
    console.log('ALL UX P2 PLAYER TESTS PASSED');
  }
}

run().catch((err) => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
