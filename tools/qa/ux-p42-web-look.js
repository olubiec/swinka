#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');
const rootDir = path.resolve(__dirname, '..', '..');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  const failed404Images = [];
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() === 404 && /\.(png|jpe?g|gif|webp)$/i.test(url)) {
      failed404Images.push(url);
    }
  });

  let hasFailures = false;

  async function testStep(name, fn) {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.error('FAIL ' + name + ': ' + err.message);
    } finally {
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  }

  // L1: same-key-everywhere (the sprite key used by the canvas, My pigs list, More tile and pig room tab are equal for each pig)
  await testStep('L1 same-key-everywhere', async () => {
    const pigIds = ['starter', 'kuki', 'ned'];

    for (const pigId of pigIds) {
      // Set active pig in state
      await page.evaluate((id) => {
        const st = window.bridge.currentState || window.bridge.getState();
        st.activePigIds = [id];
        window.bridge.broadcastState();
      }, pigId);
      await page.waitForTimeout(200);

      // Check canvas key
      const canvasKey = await page.evaluate(() => {
        const c = document.getElementById('pigCanvas');
        return c ? c.dataset.spriteKey : null;
      });

      // Check CuyLook.spriteFor(pig) directly
      const expectedKey = await page.evaluate((id) => {
        const st = window.bridge.currentState || window.bridge.getState();
        const pig = (st.roster || []).find(p => p && (p.id === id || p.namedId === id));
        return window.CuyLook.spriteFor(pig);
      }, pigId);

      assert.ok(expectedKey, `Expected key missing for ${pigId}`);
      assert.strictEqual(canvasKey, expectedKey, `Canvas spriteKey (${canvasKey}) !== expectedKey (${expectedKey}) for ${pigId}`);

      // Check My pigs list
      await page.evaluate(() => {
        window.CuyHome.openFeature('pigs');
      });
      await page.waitForSelector('.feature-pigs-container', { timeout: 3000 });

      const cardKey = await page.evaluate((id) => {
        const card = document.querySelector(`.pig-card[data-pig-id="${id}"]`);
        return card ? card.dataset.spriteKey : null;
      }, pigId);

      assert.strictEqual(cardKey, expectedKey, `My pigs card key (${cardKey}) !== expectedKey (${expectedKey}) for ${pigId}`);

      await ux.closeModal(page);
      await page.waitForTimeout(150);

      // Check More tile
      await ux.openMore(page);
      await page.waitForSelector('#modalBody button[data-open-feature="pigs"]', { timeout: 3000 });

      const moreTileKey = await page.evaluate(() => {
        const btn = document.querySelector('#modalBody button[data-open-feature="pigs"]');
        return (btn && btn.dataset && btn.dataset.spriteKey) || (window.CuyLook && window.CuyLook.spriteFor('more'));
      });

      assert.strictEqual(moreTileKey, expectedKey, `More tile key (${moreTileKey}) !== expectedKey (${expectedKey}) for ${pigId}`);

      await ux.closeModal(page);
      await page.waitForTimeout(150);

      // Check pig room tab key
      const roomTabKey = await page.evaluate((id) => {
        const tab = document.querySelector(`.room-tab[data-room="pig:${id}"]`) || document.querySelector(`.room-tab[data-room="${id}"]`);
        return (tab && tab.dataset && tab.dataset.spriteKey) || (window.CuyLook && window.CuyLook.spriteFor('pig:' + id));
      }, pigId);

      assert.strictEqual(roomTabKey, expectedKey, `Pig room tab key (${roomTabKey}) !== expectedKey (${expectedKey}) for ${pigId}`);

      // All 4 equal for this pig
      assert.strictEqual(canvasKey, cardKey);
      assert.strictEqual(cardKey, moreTileKey);
      assert.strictEqual(moreTileKey, roomTabKey);
    }
  });

  // L2: starter-not-kuki
  await testStep('L2 starter-not-kuki', async () => {
    const keys = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const starter = (st.roster || []).find(p => p.id === 'starter' || p.id === 'pig_default') || { id: 'starter', breed: 'smooth' };
      const kuki = (st.roster || []).find(p => p.id === 'kuki' || p.namedId === 'kuki') || { id: 'kuki', namedId: 'kuki' };
      return {
        starterKey: window.CuyLook.spriteFor(starter),
        kukiKey: window.CuyLook.spriteFor(kuki)
      };
    });

    assert.ok(keys.starterKey, 'starterKey is empty');
    assert.ok(keys.kukiKey, 'kukiKey is empty');
    assert.notStrictEqual(keys.starterKey, keys.kukiKey, 'starterKey and kukiKey must not be equal');
    assert.strictEqual(keys.starterKey, 'sprites/adult/spritesheet.png');
    assert.strictEqual(keys.kukiKey, 'sprites/pigs/kuki/adult/spritesheet.png');
  });

  // L3: old-state-fallback (pig without look still draws)
  await testStep('L3 old-state-fallback', async () => {
    const fallbackResult = await page.evaluate(() => {
      const oldPig = {
        id: 'legacy_pig',
        name: 'Legacy',
        breed: 'smooth',
        paletteId: 'tricolor',
        stage: 'adult'
      };

      const key = window.CuyLook.spriteFor(oldPig);
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      let drawn = false;

      if (inst) {
        inst.updateState({
          roster: [oldPig],
          activePigIds: ['legacy_pig'],
          stageKey: 'adult'
        });
        drawn = !!inst.usableSheet();
      }

      const portraitCanvas = window.CuyPig && typeof window.CuyPig.renderPortrait === 'function'
        ? window.CuyPig.renderPortrait(oldPig, 'adult', 32)
        : null;

      return {
        key: key,
        drawn: drawn,
        hasPortrait: !!portraitCanvas
      };
    });

    assert.strictEqual(fallbackResult.key, 'sprites/adult/spritesheet.png', 'Old state fallback should resolve to sprites/adult/spritesheet.png');
    assert.ok(fallbackResult.drawn, 'Canvas should be able to get usableSheet for old pig');
    assert.ok(fallbackResult.hasPortrait, 'Portrait should render for old pig');
  });

  // L4: no-404 (no failed image requests)
  await testStep('L4 no-404', async () => {
    assert.strictEqual(failed404Images.length, 0, `Detected 404 image requests: ${failed404Images.join(', ')}`);

    // Verify all standard sprite keys exist on disk
    const expectedDiskFiles = [
      'assets/sprites/adult/spritesheet.png',
      'assets/sprites/pigs/kuki/adult/spritesheet.png',
      'assets/sprites/pigs/ned/adult/spritesheet.png',
      'assets/sprites/pigs/james/adult/spritesheet.png'
    ];

    for (const rel of expectedDiskFiles) {
      const full = path.join(rootDir, rel);
      assert.ok(fs.existsSync(full), `Expected asset file missing on disk: ${full}`);
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.error('\nFAIL: ux-p42-web-look failed one or more checks');
    process.exit(1);
  } else {
    console.log('\nPASS: ux-p42-web-look passed all checks (L1-L4)');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
