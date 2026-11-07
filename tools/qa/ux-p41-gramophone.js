'use strict';
const path = require('path');
const fs = require('fs');
process.env.NODE_PATH = path.resolve(__dirname, 'node_modules');
require('module').Module._initPaths();

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const ROOT = path.resolve(__dirname, '..', '..');
  const worldItemsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'world_items.json'), 'utf8'));
  const gramophoneDef = (worldItemsData.items || []).find((i) => i.id === 'gramophone');

  if (!gramophoneDef) {
    throw new Error('Item "gramophone" not found in assets/data/world_items.json');
  }

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

  async function seedRoomWithGramophone(page) {
    await page.evaluate((def) => {
      const bridge = window.bridge;
      const s = bridge.currentState;
      if (!s.rooms) s.rooms = { catalog: [], layouts: {} };
      if (!s.rooms.catalog) s.rooms.catalog = [];
      if (!s.rooms.catalog.some((c) => c.id === 'gramophone')) {
        s.rooms.catalog.push({
          id: def.id,
          name: def.name,
          places: ['salon'],
          w: def.w || 1,
          h: def.h || 1,
          layer: def.layer || 'floor',
          price: def.price || 0,
          comfort: def.comfort || 0,
          repeatable: true,
          owned: 1,
          placed: 1
        });
      }
      if (!s.rooms.layouts) s.rooms.layouts = {};
      if (!s.rooms.layouts.salon) s.rooms.layouts.salon = { cols: 12, rows: 7, wallRows: 2, items: [] };
      if (!s.rooms.layouts.salon.items.some((i) => i.itemId === 'gramophone')) {
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
    }, gramophoneDef);
    await page.waitForTimeout(100);
  }

  // Q1: free-in-shop (shop lists the gramophone at price 0 / unlocked)
  await testScenario('free-in-shop', async (page) => {
    if (gramophoneDef.price !== 0) {
      throw new Error(`Expected gramophone price in world_items.json to be 0, got ${gramophoneDef.price}`);
    }
    if ((gramophoneDef.unlock_level || 1) !== 1) {
      throw new Error(`Expected gramophone unlock_level in world_items.json to be 1, got ${gramophoneDef.unlock_level}`);
    }

    await page.evaluate((def) => {
      const bridge = window.bridge;
      const s = bridge.currentState;
      if (!s.shop) s.shop = { items: [], categories: ['food', 'toy', 'decor', 'care'] };
      if (!s.shop.items) s.shop.items = [];
      if (!s.shop.items.some((i) => i.id === def.id)) {
        s.shop.items.push({
          id: def.id,
          name: def.name,
          category: 'decor',
          price: def.price,
          unlockLevel: def.unlock_level || 1,
          unlocked: (def.unlock_level || 1) <= 1,
          icon: 'icon-' + (def.icon || 'gramophone'),
          description: 'Gramophone player'
        });
      }
      bridge.broadcastState();
    }, gramophoneDef);

    await page.evaluate(() => window.CuyHome.openFeature('shop'));
    await page.waitForSelector('.feature-shop-tab[data-tab="decor"]', { timeout: 3000 });
    await page.click('.feature-shop-tab[data-tab="decor"]');
    await page.waitForSelector('.feature-shop-item', { timeout: 3000 });

    const info = await page.evaluate((id) => {
      const items = Array.from(document.querySelectorAll('.feature-shop-item'));
      for (const item of items) {
        const btn = item.querySelector(`button[data-buy="${id}"]`);
        if (btn) {
          const priceEl = item.querySelector('.feature-shop-price');
          return {
            found: true,
            priceText: priceEl ? priceEl.textContent.trim() : '',
            disabled: btn.hasAttribute('disabled'),
            btnText: btn.textContent.trim()
          };
        }
      }
      return { found: false };
    }, gramophoneDef.id);

    if (!info.found) {
      throw new Error('Gramophone was not listed in shop decor tab');
    }
    if (!info.priceText.includes('0')) {
      throw new Error(`Gramophone price in shop is not 0: "${info.priceText}"`);
    }
    if (info.disabled) {
      throw new Error('Gramophone buy button is disabled, expected unlocked/affordable');
    }
  });

  // Q2: placed-click-shows-player
  await testScenario('placed-click-shows-player', async (page) => {
    await seedRoomWithGramophone(page);
    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    const trigger = page.locator('.room-gramophone-trigger, [aria-label*="Gramophone"]');
    if ((await trigger.count()) > 0) {
      await trigger.first().click();
    } else {
      await page.click('.room-canvas', { position: { x: 4 * 16 + 8, y: 3 * 16 + 8 } });
    }

    await page.waitForFunction(() => {
      const p = document.querySelector('.mp_panel');
      return p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0;
    }, { timeout: 1000 });
  });

  // Q3: click-aside-hides
  await testScenario('click-aside-hides', async (page) => {
    await seedRoomWithGramophone(page);
    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    const trigger = page.locator('.room-gramophone-trigger, [aria-label*="Gramophone"]').first();
    await trigger.click();

    await page.waitForFunction(() => {
      const p = document.querySelector('.mp_panel');
      return p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0;
    }, { timeout: 1000 });

    // Click outside the player panel (on .room-head)
    await page.click('.room-head');
    await page.waitForTimeout(200);

    const isHidden = await page.evaluate(() => {
      const p = document.querySelector('.mp_panel');
      return !p || p.classList.contains('hidden') || p.getBoundingClientRect().width === 0;
    });

    if (!isHidden) {
      throw new Error('Click aside did not hide the music player panel');
    }
  });

  // Q4: music-continues-after-hide
  await testScenario('music-continues-after-hide', async (page) => {
    await seedRoomWithGramophone(page);
    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    const trigger = page.locator('.room-gramophone-trigger, [aria-label*="Gramophone"]').first();
    await trigger.click();

    await page.waitForFunction(() => {
      const p = document.querySelector('.mp_panel');
      return p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0;
    }, { timeout: 1000 });

    // Ensure music starts playing
    const playBtn = page.locator('.mp_panel .mp_btn').first();
    await playBtn.click();
    await page.waitForTimeout(200);

    const statusPlaying = await page.evaluate(() => {
      const engine = window.CuyMusicPlayer.autoEngine();
      return engine ? engine.getState().status : null;
    });

    if (statusPlaying !== 'playing') {
      throw new Error(`Engine status is ${statusPlaying}, expected 'playing'`);
    }

    // Hide panel via Esc key or click outside
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const isHidden = await page.evaluate(() => {
      const p = document.querySelector('.mp_panel');
      return !p || p.classList.contains('hidden') || p.getBoundingClientRect().width === 0;
    });
    if (!isHidden) {
      throw new Error('Escape did not hide the music player panel');
    }

    // Check that engine is still playing
    const statusAfterHide = await page.evaluate(() => {
      const engine = window.CuyMusicPlayer.autoEngine();
      return engine ? engine.getState().status : null;
    });

    if (statusAfterHide !== 'playing') {
      throw new Error(`Engine stopped playing after hide: status is ${statusAfterHide}`);
    }
  });

  // Q5: no-gramophone-no-panel
  await testScenario('no-gramophone-no-panel', async (page) => {
    await page.evaluate(() => {
      const bridge = window.bridge;
      const s = bridge.currentState;
      if (s.rooms && s.rooms.catalog) {
        s.rooms.catalog = s.rooms.catalog.filter((c) => c.id !== 'gramophone' && c.id !== 'player_gramophone');
      }
      if (s.rooms && s.rooms.layouts) {
        for (const k of Object.keys(s.rooms.layouts)) {
          if (s.rooms.layouts[k].items) {
            s.rooms.layouts[k].items = s.rooms.layouts[k].items.filter((i) => i.itemId !== 'gramophone' && i.itemId !== 'player_gramophone');
          }
        }
      }
      if (s.rooms && s.rooms.storage) {
        s.rooms.storage = s.rooms.storage.filter((i) => i.itemId !== 'gramophone' && i.itemId !== 'player_gramophone');
      }
      if (s.shop && s.shop.items) {
        s.shop.items = s.shop.items.filter((i) => i.id !== 'gramophone' && i.id !== 'player_gramophone');
      }
      if (s.inventory) {
        delete s.inventory.gramophone;
        delete s.inventory.player_gramophone;
      }
      if (s.music) {
        s.music.playerOwned = [];
        s.music.playerPlaced = {};
      }
      bridge.broadcastState();
    });

    await page.evaluate(() => window.CuyHome.openFeature('rooms'));
    await page.waitForSelector('.room-canvas', { timeout: 3000 });

    const triggerCount = await page.locator('.room-gramophone-trigger').count();
    if (triggerCount > 0) {
      throw new Error('Gramophone trigger rendered when no gramophone owned/placed');
    }

    const shown = await page.evaluate(() => {
      if (window.CuyMusicPlayer && typeof window.CuyMusicPlayer.show === 'function') {
        return window.CuyMusicPlayer.show();
      }
      return false;
    });
    if (shown) {
      throw new Error('CuyMusicPlayer.show() succeeded when no gramophone owned');
    }

    const isVisible = await page.evaluate(() => {
      const p = document.querySelector('.mp_panel');
      return !!(p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0);
    });
    if (isVisible) {
      throw new Error('Panel opened without an owned or placed gramophone');
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.error('UX P41 GRAMOPHONE TESTS FAILED');
    process.exit(1);
  } else {
    console.log('ALL UX P41 GRAMOPHONE TESTS PASSED');
  }
}

run().catch((err) => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
