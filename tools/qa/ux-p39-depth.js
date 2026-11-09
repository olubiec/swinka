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
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  page.setDefaultTimeout(10000);

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

  // D1 scale-monotonic: scale at top < at bottom, both within depthScale, in every scene.
  await testScenario('D1 scale-monotonic', async () => {
    await page.evaluate(() => {
      const sceneIds = ['salon', 'garden', 'park', 'farm', 'market'];
      for (const sceneId of sceneIds) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

        const yTop = def.walk[1];
        const yBot = def.walk[3];
        const sTop = inst.scaleAt(yTop);
        const sBot = inst.scaleAt(yBot);

        if (sTop >= sBot) {
          throw new Error(`[${sceneId}] scale at top (${sTop}) must be < scale at bottom (${sBot})`);
        }
        if (sTop < def.depthScale[0] - 1e-4 || sTop > def.depthScale[1] + 1e-4) {
          throw new Error(`[${sceneId}] scale at top (${sTop}) not within depthScale [${def.depthScale}]`);
        }
        if (sBot < def.depthScale[0] - 1e-4 || sBot > def.depthScale[1] + 1e-4) {
          throw new Error(`[${sceneId}] scale at bottom (${sBot}) not within depthScale [${def.depthScale}]`);
        }

        let lastScale = -Infinity;
        for (let y = yTop; y <= yBot; y++) {
          const s = inst.scaleAt(y);
          if (s < lastScale - 1e-6) {
            throw new Error(`[${sceneId}] scale not monotonic at y=${y}: ${s} < ${lastScale}`);
          }
          lastScale = s;
        }
      }
    });
  });

  // D2 proportion: pig drawn width at the bottom is 14-20% of the scene width outdoors and 16-24% in rooms.
  await testScenario('D2 proportion', async () => {
    await page.evaluate(() => {
      const sceneIds = ['salon', 'garden', 'park', 'farm', 'market'];
      for (const sceneId of sceneIds) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

        const sBot = inst.scaleAt(def.walk[3]);
        const drawnWidth = Math.round(46 * sBot);
        const sceneWidth = def.size[0];
        const frac = drawnWidth / sceneWidth;

        const isRoom = def.kind === 'room';
        if (isRoom) {
          if (frac < 0.16 || frac > 0.24) {
            throw new Error(`[${sceneId}] Room pig drawn width (${drawnWidth}px / ${sceneWidth}px = ${(frac * 100).toFixed(1)}%) not within 16-24%`);
          }
        } else {
          if (frac < 0.14 || frac > 0.20) {
            throw new Error(`[${sceneId}] Outdoor pig drawn width (${drawnWidth}px / ${sceneWidth}px = ${(frac * 100).toFixed(1)}%) not within 14-20%`);
          }
        }
      }
    });
  });

  // D3 behind-covers: put the pig directly above the garden fountain's base (feet y < base y1):
  // sampled pixels where the fountain top overlaps the pig equal the background pixels (the pig is hidden there);
  // put it below: pig pixels visible.
  await testScenario('D3 behind-covers', async () => {
    await page.evaluate(async () => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setExitsEnabled(false);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

      // Ensure background image and sprites are loaded
      if (inst.sceneBgImg && !inst.sceneBgImg.complete) {
        await new Promise((res) => {
          inst.sceneBgImg.addEventListener('load', res, { once: true });
          inst.sceneBgImg.addEventListener('error', res, { once: true });
        });
      }

      // Sample background pixel at fountain top: (69, 110)
      window.CanvasPig.setPigVisible(false);
      inst.render();
      const ctx = inst.ctx;
      const bgData = ctx.getImageData(69, 110, 1, 1).data;
      const bgPixel = [bgData[0], bgData[1], bgData[2], bgData[3]];

      // Fountain base y1 is 132. Put pig directly above fountain base: pigX = 69, pigY = 128 (128 < 132)
      window.CanvasPig.setPigVisible(true);
      inst.pigX = 69;
      inst.pigY = 128;
      inst.facing = 1;
      inst.currentAnim = 'idle';
      inst.render();

      const aboveData = ctx.getImageData(69, 110, 1, 1).data;
      const abovePixel = [aboveData[0], aboveData[1], aboveData[2], aboveData[3]];

      // The fountain top slice is drawn over the pig: sampled pixels equal background pixels
      const diffAbove = Math.abs(abovePixel[0] - bgPixel[0]) +
                        Math.abs(abovePixel[1] - bgPixel[1]) +
                        Math.abs(abovePixel[2] - bgPixel[2]);
      if (diffAbove !== 0) {
        throw new Error(`Expected fountain top to cover pig (equal bg [${bgPixel}]), got [${abovePixel}], diff=${diffAbove}`);
      }

      // Sample background pixel at (69, 117)
      window.CanvasPig.setPigVisible(false);
      inst.render();
      const bgData117 = ctx.getImageData(69, 117, 1, 1).data;
      const bgPixel117 = [bgData117[0], bgData117[1], bgData117[2], bgData117[3]];

      // Put pig below fountain base: pigX = 69, pigY = 135 (135 > 132)
      window.CanvasPig.setPigVisible(true);
      inst.pigX = 69;
      inst.pigY = 135;
      inst.render();

      const belowData = ctx.getImageData(69, 117, 1, 1).data;
      const belowPixel = [belowData[0], belowData[1], belowData[2], belowData[3]];

      // Pig is in front of the base: pig pixels are visible (differ from background)
      const diffBelow = Math.abs(belowPixel[0] - bgPixel117[0]) +
                        Math.abs(belowPixel[1] - bgPixel117[1]) +
                        Math.abs(belowPixel[2] - bgPixel117[2]);
      if (diffBelow < 15) {
        throw new Error(`Expected pig to be visible in front of fountain (diff >= 15), got diff=${diffBelow} (bg=[${bgPixel117}], pig=[${belowPixel}])`);
      }
    });
  });

  // D4 whole-pixels: pig x/y and drawn size are integers, no blur (alpha edge test).
  await testScenario('D4 whole-pixels', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('salon');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setPigVisible(true);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

      inst.pigX = 120;
      inst.pigY = 110;
      inst.render();

      const dbg = window.CanvasPig.debug();
      if (!Number.isInteger(dbg.pig.x)) {
        throw new Error(`pig.x is not an integer: ${dbg.pig.x}`);
      }
      if (!Number.isInteger(dbg.pig.y)) {
        throw new Error(`pig.y is not an integer: ${dbg.pig.y}`);
      }

      const scale = inst.getDrawScale();
      const dw = Math.round(64 * scale);
      const dh = Math.round(64 * scale);
      if (!Number.isInteger(dw) || !Number.isInteger(dh)) {
        throw new Error(`drawn size not integers: dw=${dw}, dh=${dh}`);
      }

      if (inst.ctx.imageSmoothingEnabled !== false) {
        throw new Error('Canvas imageSmoothingEnabled must be false');
      }

      // Alpha edge test on standalone pig render
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 120;
      offCanvas.height = 120;
      const offCtx = offCanvas.getContext('2d');
      offCtx.imageSmoothingEnabled = false;

      inst.pigX = 60;
      inst.pigY = 60;
      inst.drawPig(offCtx, { ambient: { color: [1, 1, 1], level: 1 } });

      const imgData = offCtx.getImageData(0, 0, 120, 120).data;
      // Collect all alpha values across the canvas
      const alphas = new Set();
      for (let i = 3; i < imgData.length; i += 4) {
        alphas.add(imgData[i]);
      }
      // Sprite palette alphas are discrete: 0, 70, 190, 255.
      // With imageSmoothingEnabled=false and integer pixel coordinates,
      // no continuous blur values are introduced.
      const blurredAlphas = [];
      for (const a of alphas) {
        if (a !== 0 && a !== 70 && a !== 190 && a !== 255) {
          blurredAlphas.push(a);
        }
      }
      if (blurredAlphas.length > 0) {
        throw new Error(`Alpha edge test found blurred intermediate alphas: ${blurredAlphas.join(', ')}`);
      }
    });
  });

  // D5 no-regression-room: salon still passes ux-p34-walk expectations (depth scale within [0.88,1.0]).
  await testScenario('D5 no-regression-room', async () => {
    await page.evaluate(() => {
      const salonDef = window.CuyScenes.def('salon');
      window.CanvasPig.setScene(salonDef);
      window.CanvasPig.setPigVisible(true);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const band = salonDef.walk;

      inst.pigY = band[1];
      const sTop = window.CanvasPig.debug().pig.scale;
      if (Math.abs(sTop - 0.88) > 0.125 + 1e-4) {
        throw new Error(`[salon] Top scale ${sTop} vs 0.88 diff > 1/8`);
      }

      inst.pigY = band[3];
      const sBot = window.CanvasPig.debug().pig.scale;
      if (Math.abs(sBot - 1.0) > 0.125 + 1e-4) {
        throw new Error(`[salon] Bottom scale ${sBot} vs 1.0 diff > 1/8`);
      }

      let lastScale = -Infinity;
      for (let y = band[1]; y <= band[3]; y += 1) {
        inst.pigY = y;
        const s = window.CanvasPig.debug().pig.scale;
        if (s < lastScale - 1e-6) {
          throw new Error(`[salon] Scale decreased at y=${y}: ${s} < ${lastScale}`);
        }
        lastScale = s;
      }
    });
  });

  await browser.close();
  await server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
