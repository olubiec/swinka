'use strict';
const path = require('path');
const assert = require('assert');

// Ensure module resolution finds node_modules under tools/qa
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  // Create context with window.__cuyNow set before page loads
  const context = await browser.newContext({ viewport: { width: 400, height: 620 } });
  await context.addInitScript(() => {
    window.__cuyNow = '12:00';
  });

  const page = await context.newPage();
  page.__errors = [];
  page.on('pageerror', (e) => { page.__errors.push('pageerror: ' + e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      page.__errors.push('console: ' + m.text());
    }
  });

  await page.goto(`${server.base}/web/home/index.html`);
  await page.evaluate(() => document.body.classList.add('webview-mode'));

  await page.waitForFunction(
    () => window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function' && window.CanvasPig,
    { timeout: 10000 }
  );

  await page.waitForTimeout(400);
  if (await page.isVisible('#modalBackdrop.active')) {
    await page.click('#modalCloseBtn');
    await page.waitForTimeout(200);
  }

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

  // Setup mock seven with all 7 scenes unlocked
  async function setupMockSeven() {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
      for (const p of st.places.order) {
        p.locked = false;
      }
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon' }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(100);
  }

  const SCENES = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];

  // Li1: light-scene-set
  // CanvasPig.debug().lightScene is non-null in every scene
  await testScenario('Li1 light-scene-set', async () => {
    await setupMockSeven();

    for (const sceneId of SCENES) {
      await page.evaluate((id) => window.CuyPlaces.openPlace(id), sceneId);
      await page.waitForTimeout(60);

      const lightScene = await page.evaluate(() => {
        const dbg = window.CanvasPig.debug();
        return dbg ? dbg.lightScene : null;
      });

      assert(lightScene != null, `CanvasPig.debug().lightScene is null in scene "${sceneId}"`);
      assert(lightScene.ambient != null, `lightScene.ambient is null in scene "${sceneId}"`);
      assert(Array.isArray(lightScene.ambient.color), `lightScene.ambient.color is not an array in "${sceneId}"`);
      assert(typeof lightScene.ambient.level === 'number', `lightScene.ambient.level is not a number in "${sceneId}"`);
    }
  });

  // Li2: night-darker
  // Mean luminance of the garden canvas at 23:00 is at least 25% lower than at 12:00
  await testScenario('Li2 night-darker', async () => {
    await setupMockSeven();

    // 1. Garden at 12:00
    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      window.CuyPlaces.openPlace('garden');
    });
    await page.waitForTimeout(150);

    const lumDay = await page.evaluate(() => {
      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = img.data;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return total / (data.length / 4);
    });

    // 2. Garden at 23:00
    await page.evaluate(() => {
      window.__cuyNow = '23:00';
      window.CuyPlaces.openPlace('garden');
    });
    await page.waitForTimeout(150);

    const lumNight = await page.evaluate(() => {
      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = img.data;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return total / (data.length / 4);
    });

    assert(lumDay > 0, `Expected day luminance > 0, got ${lumDay}`);
    const drop = (lumDay - lumNight) / lumDay;
    assert(drop >= 0.25, `Expected night luminance to be at least 25% lower than day. Day=${lumDay.toFixed(2)}, Night=${lumNight.toFixed(2)}, drop=${(drop * 100).toFixed(1)}%`);
  });

  // Li3: period-changes
  // Switching __cuyNow from 12:00 to 18:30 and re-applying changes the ambient colour
  await testScenario('Li3 period-changes', async () => {
    await setupMockSeven();

    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(80);

    const amb12 = await page.evaluate(() => {
      const dbg = window.CanvasPig.debug();
      return dbg && dbg.lightScene ? dbg.lightScene.ambient.color : null;
    });

    await page.evaluate(() => {
      window.__cuyNow = '18:30';
      window.CuyPlaces.applyScene();
    });
    await page.waitForTimeout(80);

    const amb18 = await page.evaluate(() => {
      const dbg = window.CanvasPig.debug();
      return dbg && dbg.lightScene ? dbg.lightScene.ambient.color : null;
    });

    assert(amb12 != null, 'amb12 should not be null');
    assert(amb18 != null, 'amb18 should not be null');
    assert.notDeepStrictEqual(amb18, amb12, `Ambient color should change between 12:00 and 18:30. Got: 12=${JSON.stringify(amb12)}, 18:30=${JSON.stringify(amb18)}`);
  });

  // Li4: lamp-glow
  // A placed lamp in the salon at night: pixels within 20 px of the lamp are brighter than 60 px away; a toggled-off lamp does not glow
  await testScenario('Li4 lamp-glow', async () => {
    await setupMockSeven();

    // Place lamp in the salon at night
    await page.evaluate(() => {
      window.__cuyNow = '23:00';
      const st = window.bridge.currentState || window.bridge.getState();
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      st.rooms.layouts.salon = {
        items: [
          { uid: 'test_lamp', itemId: 'lamp_floor', x: 7, y: 3 }
        ]
      };
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(150);

    // Measure with lamp ON (auto on at night)
    const onResult = await page.evaluate(() => {
      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');
      const dbg = window.CanvasPig.debug();
      const src = dbg && dbg.lightScene && dbg.lightScene.sources && dbg.lightScene.sources.find(s => s.id === 'test_lamp' || s.uid === 'test_lamp' || s.itemId === 'lamp_floor');
      const lx = src ? src.x : 120;
      const ly = src ? src.y : 64;

      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = img.data;

      let nearSum = 0, nearCount = 0;
      let farSum = 0, farCount = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const dist = Math.hypot(x - lx, y - ly);
          const idx = (y * canvas.width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (dist <= 15) {
            nearSum += lum;
            nearCount++;
          } else if (dist >= 55 && dist <= 65) {
            farSum += lum;
            farCount++;
          }
        }
      }

      return {
        near: nearCount > 0 ? nearSum / nearCount : 0,
        far: farCount > 0 ? farSum / farCount : 0,
        isOn: src ? src.on : false
      };
    });

    assert(onResult.isOn, 'Lamp should be on at night by default');
    assert(onResult.near > onResult.far + 8, `Pixels within 20px should be brighter than 60px away when lamp is ON. Near=${onResult.near.toFixed(2)}, Far=${onResult.far.toFixed(2)}`);

    // Toggle lamp OFF
    await page.evaluate(() => {
      if (typeof window.CuyPlaces.toggleLamp === 'function') {
        window.CuyPlaces.toggleLamp('test_lamp');
      } else if (typeof window.CuyPlaces.setLampToggle === 'function') {
        window.CuyPlaces.setLampToggle('test_lamp', false);
      }
    });
    await page.waitForTimeout(150);

    const offResult = await page.evaluate(() => {
      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');
      const dbg = window.CanvasPig.debug();
      const src = dbg && dbg.lightScene && dbg.lightScene.sources && dbg.lightScene.sources.find(s => s.id === 'test_lamp' || s.uid === 'test_lamp' || s.itemId === 'lamp_floor');
      const lx = src ? src.x : 120;
      const ly = src ? src.y : 64;

      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = img.data;

      let nearSum = 0, nearCount = 0;
      let farSum = 0, farCount = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const dist = Math.hypot(x - lx, y - ly);
          const idx = (y * canvas.width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (dist <= 15) {
            nearSum += lum;
            nearCount++;
          } else if (dist >= 55 && dist <= 65) {
            farSum += lum;
            farCount++;
          }
        }
      }

      return {
        near: nearCount > 0 ? nearSum / nearCount : 0,
        far: farCount > 0 ? farSum / farCount : 0,
        isOn: src ? src.on : false
      };
    });

    assert.strictEqual(offResult.isOn, false, 'Lamp should be toggled OFF');
    assert(offResult.near < onResult.near - 5, `Pixels near lamp should darken when lamp is toggled off. On=${onResult.near.toFixed(2)}, Off=${offResult.near.toFixed(2)}`);
    assert(Math.abs(offResult.near - offResult.far) < 15, `Toggled-off lamp should not glow. Near=${offResult.near.toFixed(2)}, Far=${offResult.far.toFixed(2)}`);
  });

  // Li5: missing-lib-safe
  // With lights.json request failing the scene still renders, no console error
  await testScenario('Li5 missing-lib-safe', async () => {
    const safePage = await context.newPage();
    const safeErrors = [];
    safePage.on('pageerror', (e) => safeErrors.push(e.message));
    safePage.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text()) && !/net::ERR_FAILED/.test(m.text())) {
        safeErrors.push(m.text());
      }
    });

    // Abort data/lights.json request
    await safePage.route('**/data/lights.json', route => route.abort());

    await safePage.goto(`${server.base}/web/home/index.html`);
    await safePage.evaluate(() => document.body.classList.add('webview-mode'));

    await safePage.waitForFunction(
      () => window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function' && window.CanvasPig,
      { timeout: 10000 }
    );
    await safePage.waitForTimeout(200);

    await safePage.evaluate(() => window.CuyPlaces.openPlace('salon'));
    await safePage.waitForTimeout(200);

    // Verify canvas rendered something
    const hasPixels = await safePage.evaluate(() => {
      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return img.data.some(channel => channel > 0);
    });
    assert(hasPixels, 'Scene canvas should render even if lights.json failed');

    // Verify no console errors
    const criticalErrors = safeErrors.filter(e => !e.includes('net::ERR_FAILED') && !e.includes('Failed to load resource'));
    assert.strictEqual(criticalErrors.length, 0, 'No console errors expected on missing lights.json: ' + criticalErrors.join('; '));

    await safePage.close();
  });

  await context.close();
  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
