'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Ensure module resolution finds node_modules under tools/qa
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

let playwright = null;
try {
  playwright = require('playwright');
} catch (e) {}

const ux = require('./lib/ux.js');

const SCENE_IDS = ['salon', 'garden', 'park', 'farm', 'market'];

async function runBrowserTests() {
  const server = await ux.startServer();
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const execPath = process.env.CHROMIUM_PATH || (process.platform === 'win32' && fs.existsSync(edgePath) ? edgePath : undefined);
  const browser = await playwright.chromium.launch(execPath ? { executablePath: execPath } : {});
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  page.setDefaultTimeout(15000);

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
    }
  };

  await page.waitForFunction(() => window.CanvasPig && window.CuyScenes && window.CuyScenesMock, { timeout: 10000 });

  // Setup mock seven with all scenes unlocked
  await page.evaluate(() => {
    const st = window.bridge.currentState || window.bridge.getState();
    const m = window.CuyScenesMock.state('seven');
    st.places = m.places;
    for (const p of st.places.order) {
      p.locked = false;
    }
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon' }];
    window.bridge.broadcastState();
  });
  await page.waitForTimeout(100);

  // PD1: at 20 sampled depths pig.scale*16 is an integer and 64*pig.scale is an integer
  await testScenario('PD1 whole-pixel-grid-quantisation', async () => {
    await page.evaluate((scenes) => {
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        const yTop = def.walk[1];
        const yBot = def.walk[3];

        for (let i = 0; i < 20; i++) {
          const y = yTop + (yBot - yTop) * (i / 19);
          inst.pigY = y;
          const scale = inst.getDrawScale();
          const dbg = window.CanvasPig.debug();

          if (Math.abs(dbg.pig.scale - scale) > 1e-6) {
            throw new Error(`[${sceneId}] debug().pig.scale (${dbg.pig.scale}) != getDrawScale (${scale})`);
          }

          const s16 = scale * 16;
          if (Math.abs(s16 - Math.round(s16)) > 1e-5) {
            throw new Error(`[${sceneId}] scale*16 is not integer at y=${y}: scale=${scale}, s16=${s16}`);
          }

          const s64 = 64 * scale;
          if (Math.abs(s64 - Math.round(s64)) > 1e-5) {
            throw new Error(`[${sceneId}] 64*scale is not integer at y=${y}: scale=${scale}, 64*scale=${s64}`);
          }
        }
      }
    }, SCENE_IDS);
  });

  // PD2: scale is monotonic non-decreasing with y
  await testScenario('PD2 monotonic-scale', async () => {
    await page.evaluate((scenes) => {
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        const yTop = def.walk[1];
        const yBot = def.walk[3];

        let lastScale = -Infinity;
        for (let y = yTop; y <= yBot; y++) {
          inst.pigY = y;
          const s = inst.getDrawScale();
          if (s < lastScale - 1e-6) {
            throw new Error(`[${sceneId}] Scale decreased at y=${y}: ${s} < ${lastScale}`);
          }
          lastScale = s;
        }
      }
    }, SCENE_IDS);
  });

  // PD3: scale at the top of the band equals depthScale[0] and at the bottom depthScale[1] (within 1/32)
  await testScenario('PD3 band-extremes-match-depthScale', async () => {
    await page.evaluate((scenes) => {
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        const yTop = def.walk[1];
        const yBot = def.walk[3];

        inst.pigY = yTop;
        const sTop = inst.getDrawScale();
        inst.pigY = yBot;
        const sBot = inst.getDrawScale();

        const ds = def.depthScale;
        if (!ds || ds.length < 2) {
          throw new Error(`[${sceneId}] missing depthScale`);
        }

        const maxDiff = 1 / 32 + 1e-5;
        if (Math.abs(sTop - ds[0]) > maxDiff) {
          throw new Error(`[${sceneId}] Top scale ${sTop} vs ds[0]=${ds[0]} diff ${Math.abs(sTop - ds[0])} > 1/32`);
        }
        if (Math.abs(sBot - ds[1]) > maxDiff) {
          throw new Error(`[${sceneId}] Bottom scale ${sBot} vs ds[1]=${ds[1]} diff ${Math.abs(sBot - ds[1])} > 1/32`);
        }
      }
    }, SCENE_IDS);
  });

  // PD4: the fallback counter in debug() stays 0 during a 10 s walk
  await testScenario('PD4 fallback-counter-zero-during-walk', async () => {
    await page.evaluate((scenes) => {
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.setExitsEnabled(false);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

        // Reset fallback counter if any
        inst.scaleFallbackCount = 0;

        // Simulate 10 s walk (10000 ms in 50 ms steps)
        let rem = 10000;
        while (rem > 0) {
          const dt = 50;
          inst.update(dt);
          inst.render();
          rem -= dt;
        }

        const dbg = window.CanvasPig.debug();
        const count = dbg.scaleFallbackCount || (dbg.pig && dbg.pig.scaleFallbackCount) || 0;
        if (count !== 0) {
          throw new Error(`[${sceneId}] scaleFallbackCount after 10s walk is ${count}, expected 0`);
        }
      }
    }, ['salon', 'garden', 'park']);
  });

  await browser.close();
  await server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

function runNodeTests() {
  const mockContext = {
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    ellipse: () => {},
    fill: () => {},
    stroke: () => {},
    scale: () => {},
    translate: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => {},
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    imageSmoothingEnabled: false
  };
  const mockCanvas = {
    getContext: () => mockContext,
    width: 240,
    height: 130,
    style: {}
  };
  global.window = global;
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return mockCanvas;
      return { appendChild: () => {}, style: {} };
    },
    querySelector: () => null,
    getElementById: () => null,
    body: { appendChild: () => {} },
    addEventListener: () => {}
  };
  global.Image = class Image {
    constructor() {
      this.naturalWidth = 64;
      this.naturalHeight = 64;
      this.width = 64;
      this.height = 64;
      this.complete = true;
    }
  };

  require('../../web/home/canvas-pig.js');
  require('../../web/home/features/places/scenes.js');

  const CanvasPig = global.CanvasPig;
  const CuyScenes = global.CuyScenes;
  const inst = new global.PigCanvas(mockCanvas);

  let hasFailures = false;
  const testScenario = (name, fn) => {
    try {
      fn();
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    }
  };

  // PD1
  testScenario('PD1 whole-pixel-grid-quantisation', () => {
    for (const sceneId of SCENE_IDS) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      inst.setPigVisible(true);
      const yTop = def.walk[1];
      const yBot = def.walk[3];

      for (let i = 0; i < 20; i++) {
        const y = yTop + (yBot - yTop) * (i / 19);
        inst.pigY = y;
        const scale = inst.getDrawScale();
        const dbg = inst.debug();

        assert.strictEqual(dbg.pig.scale, scale);

        const s16 = scale * 16;
        assert(Math.abs(s16 - Math.round(s16)) < 1e-5, `[${sceneId}] scale*16 not int: ${s16}`);
        const s64 = 64 * scale;
        assert(Math.abs(s64 - Math.round(s64)) < 1e-5, `[${sceneId}] 64*scale not int: ${s64}`);
      }
    }
  });

  // PD2
  testScenario('PD2 monotonic-scale', () => {
    for (const sceneId of SCENE_IDS) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      const yTop = def.walk[1];
      const yBot = def.walk[3];

      let lastScale = -Infinity;
      for (let y = yTop; y <= yBot; y++) {
        inst.pigY = y;
        const s = inst.getDrawScale();
        assert(s >= lastScale - 1e-6, `[${sceneId}] Scale decreased at y=${y}: ${s} < ${lastScale}`);
        lastScale = s;
      }
    }
  });

  // PD3
  testScenario('PD3 band-extremes-match-depthScale', () => {
    for (const sceneId of SCENE_IDS) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      const yTop = def.walk[1];
      const yBot = def.walk[3];

      inst.pigY = yTop;
      const sTop = inst.getDrawScale();
      inst.pigY = yBot;
      const sBot = inst.getDrawScale();

      const ds = def.depthScale;
      const maxDiff = 1 / 32 + 1e-5;
      assert(Math.abs(sTop - ds[0]) <= maxDiff, `[${sceneId}] Top scale ${sTop} vs ds[0]=${ds[0]} diff > 1/32`);
      assert(Math.abs(sBot - ds[1]) <= maxDiff, `[${sceneId}] Bottom scale ${sBot} vs ds[1]=${ds[1]} diff > 1/32`);
    }
  });

  // PD4
  testScenario('PD4 fallback-counter-zero-during-walk', () => {
    for (const sceneId of ['salon', 'garden', 'park']) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      inst.setPigVisible(true);
      inst.setExitsEnabled(false);
      inst.scaleFallbackCount = 0;

      let rem = 10000;
      while (rem > 0) {
        const dt = 50;
        inst.update(dt);
        inst.render();
        rem -= dt;
      }

      const dbg = inst.debug();
      const count = dbg.scaleFallbackCount || 0;
      assert.strictEqual(count, 0, `[${sceneId}] scaleFallbackCount is ${count}, expected 0`);
    }
  });

  inst.stopped = true;
  process.exit(hasFailures ? 1 : 0);
}

async function main() {
  if (playwright) {
    try {
      await runBrowserTests();
      return;
    } catch (err) {
      console.warn('Browser test runner encountered error, falling back to direct tests:', err.message);
    }
  }
  runNodeTests();
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
