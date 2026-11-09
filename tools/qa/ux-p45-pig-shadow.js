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

  // Wrap ctx.ellipse to count calls
  await page.evaluate(() => {
    window.__ellipseCalls = 0;
    const origEllipse = CanvasRenderingContext2D.prototype.ellipse;
    CanvasRenderingContext2D.prototype.ellipse = function(...args) {
      window.__ellipseCalls = (window.__ellipseCalls || 0) + 1;
      return origEllipse.apply(this, args);
    };
  });

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

  // PS1: no ellipse call is made with a pig present in 10 s
  await testScenario('PS1 no-ellipse-call-with-pig-present-in-10s', async () => {
    await page.evaluate((scenes) => {
      window.__ellipseCalls = 0;
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.setExitsEnabled(false);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

        // 10 s simulated walk & render (200 steps of 50 ms)
        let rem = 10000;
        while (rem > 0) {
          const dt = 50;
          inst.update(dt);
          inst.render();
          rem -= dt;
        }
      }
      if (window.__ellipseCalls > 0) {
        throw new Error(`ctx.ellipse was called ${window.__ellipseCalls} times with pig present`);
      }
    }, SCENE_IDS);
  });

  // PS2: exactly 1 shadow draw per frame
  await testScenario('PS2 exactly-1-shadow-draw-per-frame', async () => {
    await page.evaluate(async (scenes) => {
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

        // Ensure shadow sprite image is loaded
        const key = (window.CanvasPig.PIG_SHADOW_BY_STAGE && window.CanvasPig.PIG_SHADOW_BY_STAGE[inst.stageKey]) || 'adult';
        const img = inst.pigShadowImage(key);
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }

        const pStart = inst.pigDraws || 0;
        const sStart = inst.shadowDraws || 0;

        for (let i = 0; i < 20; i++) {
          inst.update(50);
          inst.render();
        }

        const pDelta = (inst.pigDraws || 0) - pStart;
        const sDelta = (inst.shadowDraws || 0) - sStart;

        if (pDelta !== 20) {
          throw new Error(`[${sceneId}] Expected 20 pig draws, got ${pDelta}`);
        }
        if (sDelta !== pDelta) {
          throw new Error(`[${sceneId}] Shadow draws ${sDelta} does not match pig draws ${pDelta}`);
        }
      }
    }, SCENE_IDS);
  });

  // PS3: the shadow centre is within 1 px of the feet x
  await testScenario('PS3 shadow-centre-within-1px-of-feet-x', async () => {
    await page.evaluate((scenes) => {
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        const xMin = def.walk[0];
        const xMax = def.walk[2];
        const yTop = def.walk[1];

        inst.pigY = yTop;
        for (let x = xMin; x <= xMax; x += 10) {
          inst.pigX = x;
          inst.render();
          const dbg = window.CanvasPig.debug();
          if (!dbg.shadow) {
            throw new Error(`[${sceneId}] No shadow in debug()`);
          }
          const centerX = dbg.shadow.centerX;
          const feetX = dbg.pig.x;
          const diff = Math.abs(centerX - feetX);
          if (diff > 1.0) {
            throw new Error(`[${sceneId}] Shadow centre ${centerX} diff from feetX ${feetX} is ${diff} > 1px`);
          }
        }
      }
    }, SCENE_IDS);
  });

  // PS4: shadow width is an integer
  await testScenario('PS4 shadow-width-is-an-integer', async () => {
    await page.evaluate((scenes) => {
      for (const sceneId of scenes) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        const yTop = def.walk[1];
        const yBot = def.walk[3];

        for (let y = yTop; y <= yBot; y++) {
          inst.pigY = y;
          inst.render();
          const dbg = window.CanvasPig.debug();
          const w = dbg.shadow ? dbg.shadow.width : null;
          if (typeof w !== 'number' || !Number.isInteger(w)) {
            throw new Error(`[${sceneId}] Shadow width ${w} is not an integer at y=${y}`);
          }
        }
      }
    }, SCENE_IDS);
  });

  // PS5: baby, junior and adult stage pigs each draw their own shadow_pig_<stage>.png
  await testScenario('PS5 stage-specific-shadow-sprites', async () => {
    const stages = ['baby', 'junior', 'adult'];
    for (const st of stages) {
      await page.waitForFunction(async (stage) => {
        window.CanvasPig.setStage(stage);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        const img = inst.pigShadowImage(stage);
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        inst.render();
        const dbg = window.CanvasPig.debug();
        const url = (dbg.shadow && dbg.shadow.url) || '';
        return url.includes(`shadow_pig_${stage}.png`);
      }, st, { timeout: 10000 });

      const check = await page.evaluate((stage) => {
        const dbg = window.CanvasPig.debug();
        const list = dbg.loadedImageUrls || [];
        const hasUrl = list.some(u => u.includes(`shadow_pig_${stage}.png`));
        const shadowUrl = (dbg.shadow && dbg.shadow.url) || '';
        return {
          hasUrl,
          shadowUrlMatches: shadowUrl.includes(`shadow_pig_${stage}.png`),
          draws: dbg.shadowDraws
        };
      }, st);

      if (!check.shadowUrlMatches) {
        throw new Error(`Stage ${st} shadow url did not match shadow_pig_${st}.png`);
      }
      if (!check.hasUrl) {
        throw new Error(`Stage ${st} shadow_pig_${st}.png not found in debug().loadedImageUrls`);
      }
      if (check.draws <= 0) {
        throw new Error(`Stage ${st} shadowDraws is ${check.draws}, expected > 0`);
      }
    }
  });

  await browser.close();
  await server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

function runNodeTests() {
  let ellipseCalls = 0;
  const mockContext = {
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    ellipse: () => { ellipseCalls++; },
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
      this.src = '';
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

  // PS1
  testScenario('PS1 no-ellipse-call-with-pig-present-in-10s', () => {
    ellipseCalls = 0;
    for (const sceneId of SCENE_IDS) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      inst.setPigVisible(true);
      inst.setExitsEnabled(false);

      let rem = 10000;
      while (rem > 0) {
        const dt = 50;
        inst.update(dt);
        inst.render();
        rem -= dt;
      }
    }
    assert.strictEqual(ellipseCalls, 0, `ctx.ellipse was called ${ellipseCalls} times`);
  });

  // PS2
  testScenario('PS2 exactly-1-shadow-draw-per-frame', () => {
    for (const sceneId of SCENE_IDS) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      inst.setPigVisible(true);

      const pStart = inst.pigDraws || 0;
      const sStart = inst.shadowDraws || 0;

      for (let i = 0; i < 20; i++) {
        inst.update(50);
        inst.render();
      }

      const pDelta = (inst.pigDraws || 0) - pStart;
      const sDelta = (inst.shadowDraws || 0) - sStart;
      assert.strictEqual(pDelta, 20);
      assert.strictEqual(sDelta, pDelta);
    }
  });

  // PS3
  testScenario('PS3 shadow-centre-within-1px-of-feet-x', () => {
    for (const sceneId of SCENE_IDS) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      inst.setPigVisible(true);
      const xMin = def.walk[0];
      const xMax = def.walk[2];
      const yTop = def.walk[1];

      inst.pigY = yTop;
      for (let x = xMin; x <= xMax; x += 10) {
        inst.pigX = x;
        inst.render();
        const dbg = inst.debug();
        assert(dbg.shadow, 'Shadow must be in debug()');
        const centerX = dbg.shadow.centerX;
        const feetX = dbg.pig.x;
        const diff = Math.abs(centerX - feetX);
        assert(diff <= 1.0, `diff ${diff} > 1.0`);
      }
    }
  });

  // PS4
  testScenario('PS4 shadow-width-is-an-integer', () => {
    for (const sceneId of SCENE_IDS) {
      const def = CuyScenes.def(sceneId);
      inst.setScene(def);
      inst.setPigVisible(true);
      const yTop = def.walk[1];
      const yBot = def.walk[3];

      for (let y = yTop; y <= yBot; y++) {
        inst.pigY = y;
        inst.render();
        const dbg = inst.debug();
        assert(Number.isInteger(dbg.shadow.width), `Shadow width ${dbg.shadow.width} is not integer`);
      }
    }
  });

  // PS5
  testScenario('PS5 stage-specific-shadow-sprites', () => {
    const stages = ['baby', 'junior', 'adult'];
    for (const st of stages) {
      inst.setStage(st);
      inst.render();
      const dbg = inst.debug();
      assert(dbg.shadow.url.includes(`shadow_pig_${st}.png`), `Shadow URL ${dbg.shadow.url} must include shadow_pig_${st}.png`);
      assert(dbg.loadedImageUrls.some(u => u.includes(`shadow_pig_${st}.png`)), `loadedImageUrls must include shadow_pig_${st}.png`);
      assert(dbg.shadowDraws > 0, `shadowDraws is ${dbg.shadowDraws}`);
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

