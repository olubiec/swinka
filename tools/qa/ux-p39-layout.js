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

const VIEWPORTS = [
  { width: 420, height: 720 },
  { width: 360, height: 640 }
];

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

  // Setup mock seven with all 7 scenes unlocked for layout testing
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

  // Ly1: bar-above-canvas
  // The places bar is in normal flow above the canvas: bar bottom <= canvas top in every scene & viewport
  await testScenario('Ly1 bar-above-canvas', async () => {
    await setupMockSeven();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(60);

      for (const sceneId of SCENES) {
        await page.evaluate((id) => window.CuyPlaces.openPlace(id), sceneId);
        await page.waitForTimeout(60);

        const pos = await page.evaluate(() => {
          const bar = document.querySelector('.places-bar');
          const canvas = document.querySelector('#pigCanvas');
          if (!bar || !canvas) return null;
          const barRect = bar.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          return { barBottom: barRect.bottom, canvasTop: canvasRect.top };
        });

        assert(pos, `Elements .places-bar and #pigCanvas must exist for scene ${sceneId}`);
        assert(
          pos.barBottom <= pos.canvasTop + 0.5,
          `[${vp.width}x${vp.height}][${sceneId}] Bar bottom (${pos.barBottom}) must be <= canvas top (${pos.canvasTop})`
        );
      }
    }
  });

  // Ly2: canvas-inside-window
  // Canvas is fully visible inside the window (viewport) without clipping
  await testScenario('Ly2 canvas-inside-window', async () => {
    await setupMockSeven();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(60);

      for (const sceneId of SCENES) {
        await page.evaluate((id) => window.CuyPlaces.openPlace(id), sceneId);
        await page.waitForTimeout(60);

        const rect = await page.evaluate(() => {
          const canvas = document.querySelector('#pigCanvas');
          if (!canvas) return null;
          const r = canvas.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        });

        assert(rect, `Canvas must exist for scene ${sceneId}`);
        assert(rect.left >= 0, `[${vp.width}x${vp.height}][${sceneId}] Canvas left (${rect.left}) must be >= 0`);
        assert(rect.top >= 0, `[${vp.width}x${vp.height}][${sceneId}] Canvas top (${rect.top}) must be >= 0`);
        assert(
          rect.right <= vp.width + 0.5,
          `[${vp.width}x${vp.height}][${sceneId}] Canvas right (${rect.right}) must be <= window width (${vp.width})`
        );
        assert(
          rect.bottom <= vp.height + 0.5,
          `[${vp.width}x${vp.height}][${sceneId}] Canvas bottom (${rect.bottom}) must be <= window height (${vp.height})`
        );
      }
    }
  });

  // Ly3: aspect-preserved
  // Canvas box aspect equals scene aspect within 1% for every scene & viewport
  await testScenario('Ly3 aspect-preserved', async () => {
    await setupMockSeven();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(60);

      for (const sceneId of SCENES) {
        await page.evaluate((id) => window.CuyPlaces.openPlace(id), sceneId);
        await page.waitForTimeout(60);

        const data = await page.evaluate(() => {
          const canvas = document.querySelector('#pigCanvas');
          if (!canvas) return null;
          const r = canvas.getBoundingClientRect();
          return {
            boxW: r.width,
            boxH: r.height,
            sceneW: canvas.width,
            sceneH: canvas.height
          };
        });

        assert(data, `Canvas must exist for scene ${sceneId}`);
        assert(data.boxH > 0 && data.sceneH > 0, `Height must be > 0 for scene ${sceneId}`);

        const boxAspect = data.boxW / data.boxH;
        const sceneAspect = data.sceneW / data.sceneH;
        const diff = Math.abs(boxAspect - sceneAspect) / sceneAspect;

        assert(
          diff <= 0.01,
          `[${vp.width}x${vp.height}][${sceneId}] Box aspect (${boxAspect.toFixed(4)}) must match scene aspect (${sceneAspect.toFixed(4)}) within 1%, diff: ${(diff * 100).toFixed(2)}%`
        );
      }
    }
  });

  // Ly4: park-fits and farm-fits
  // Park (384x192) and Farm (256x144) scenes must fit fully inside the stage-viewport container
  await testScenario('Ly4 park-fits and farm-fits', async () => {
    await setupMockSeven();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(60);

      for (const sceneId of ['park', 'farm']) {
        await page.evaluate((id) => window.CuyPlaces.openPlace(id), sceneId);
        await page.waitForTimeout(60);

        const check = await page.evaluate((expectedId) => {
          const stage = document.querySelector('.stage-viewport');
          const canvas = document.querySelector('#pigCanvas');
          if (!stage || !canvas) return null;
          const sRect = stage.getBoundingClientRect();
          const cRect = canvas.getBoundingClientRect();
          return {
            canvasW: canvas.width,
            canvasH: canvas.height,
            stageTop: sRect.top,
            stageBottom: sRect.bottom,
            stageLeft: sRect.left,
            stageRight: sRect.right,
            canvasTop: cRect.top,
            canvasBottom: cRect.bottom,
            canvasLeft: cRect.left,
            canvasRight: cRect.right
          };
        }, sceneId);

        assert(check, `Stage and canvas must exist for scene ${sceneId}`);

        if (sceneId === 'park') {
          assert.strictEqual(check.canvasW, 384, 'Park canvas width must be 384');
          assert.strictEqual(check.canvasH, 192, 'Park canvas height must be 192');
        } else if (sceneId === 'farm') {
          assert.strictEqual(check.canvasW, 256, 'Farm canvas width must be 256');
          assert.strictEqual(check.canvasH, 144, 'Farm canvas height must be 144');
        }

        // Canvas must fit completely inside stage-viewport without overflow/crop
        assert(
          check.canvasTop >= check.stageTop - 0.5,
          `[${vp.width}x${vp.height}][${sceneId}] Canvas top (${check.canvasTop}) must be >= stage top (${check.stageTop})`
        );
        assert(
          check.canvasBottom <= check.stageBottom + 0.5,
          `[${vp.width}x${vp.height}][${sceneId}] Canvas bottom (${check.canvasBottom}) must be <= stage bottom (${check.stageBottom})`
        );
        assert(
          check.canvasLeft >= check.stageLeft - 0.5,
          `[${vp.width}x${vp.height}][${sceneId}] Canvas left (${check.canvasLeft}) must be >= stage left (${check.stageLeft})`
        );
        assert(
          check.canvasRight <= check.stageRight + 0.5,
          `[${vp.width}x${vp.height}][${sceneId}] Canvas right (${check.canvasRight}) must be <= stage right (${check.stageRight})`
        );
      }
    }
  });

  // Ly5: pixelated
  // Computed image-rendering is pixelated and --scene-k variable is exposed
  await testScenario('Ly5 pixelated', async () => {
    await setupMockSeven();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(60);

      const info = await page.evaluate(() => {
        const canvas = document.querySelector('#pigCanvas');
        const stage = document.querySelector('.stage-viewport');
        if (!canvas) return null;
        const cs = window.getComputedStyle(canvas);
        const stageCs = window.getComputedStyle(stage || canvas);
        return {
          rendering: cs.imageRendering,
          sceneK: stageCs.getPropertyValue('--scene-k').trim()
        };
      });

      assert(info, 'Canvas must exist');
      assert(
        info.rendering === 'pixelated' || info.rendering === 'crisp-edges',
        `Expected image-rendering to be pixelated or crisp-edges, got: ${info.rendering}`
      );
      assert(
        info.sceneK !== '',
        'CSS variable --scene-k must be exposed on .stage-viewport or :root'
      );
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
