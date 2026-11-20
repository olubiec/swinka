'use strict';

const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const STRICT = process.env.STRICT === '1';

async function launchBrowser() {
  for (const opts of [
    { headless: true },
    { channel: 'msedge', headless: true },
    { channel: 'chrome', headless: true }
  ]) {
    try {
      return await chromium.launch(opts);
    } catch (_) {}
  }
  return await chromium.launch({ headless: true });
}

async function main() {
  const server = await startServer();
  const browser = await launchBrowser();
  const defects = [];
  const results = [];

  function pass(id, detail) {
    console.log(`PASS ${id}: ${detail}`);
    results.push({ id, ok: true, detail });
  }

  function defect(id, detail) {
    console.log(`DEFECT ${id}: ${detail}`);
    defects.push({ id, detail });
    results.push({ id, ok: false, detail });
  }

  try {
    const page = await openHome(browser, { query: 'mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });

    // Install RAF timing hook for L5 via evaluate? No, addInitScript must run before goto.
    // Let's re-open with addInitScript on a context or attach init script on page?
    // Actually page.addInitScript works before reload; let's add it and reload once cleanly,
    // or create a fresh page with addInitScript? Wait: openHome creates its own page.
    // We can just wrap requestAnimationFrame on the context? No, openHome uses browser.newPage().
    // We can call page.addInitScript(...) and reload, OR even simpler:
    // In L5 we can measure both RAF callback time (if we reload) or we can use context.
    // Let's check: openHome is fast (~800ms). If we use page.addInitScript + page.reload() right after openHome,
    // wait: openHome also adds 'webview-mode' and closes modal. Let's check if we need reload.
    // Wait: why not just use page.addInitScript on browser.newContext()? No, prompt says:
    // "Playwright, `openHome`, mock `seven`, okno `420x640`"
    // Let's keep using `openHome` directly! For L5, we can hook `requestAnimationFrame` if needed,
    // OR even better: we can wrap `PigCanvas`? No, `addInitScript` + `reload` isn't needed if we just
    // measure `requestAnimationFrame` + `broadcastState` or if we wrap `window.requestAnimationFrame`?
    // Wait: if `PigCanvas` already has an active RAF loop, `window.requestAnimationFrame` IS called on every frame
    // by `PigCanvas` to schedule the NEXT frame!
    // Think about it: `PigCanvas.loop` does `...render(); requestAnimationFrame(this._boundLoop);`!
    // So wrapping `window.requestAnimationFrame` on a live page intercepts the VERY NEXT frame's callback!
    await page.evaluate(() => {
      const origRAF = window.requestAnimationFrame;
      window.__frameTimes = [];
      window.__recordFrames = false;
      window.requestAnimationFrame = function (cb) {
        return origRAF.call(window, function (ts) {
          if (window.__recordFrames) {
            const t0 = performance.now();
            const res = cb(ts);
            window.__frameTimes.push(performance.now() - t0);
            return res;
          }
          return cb(ts);
        });
      };
    });

    await page.waitForFunction(
      () => window.CanvasPig && typeof window.CanvasPig.debug === 'function' && window.CanvasPig.debug().pigs && window.CanvasPig.debug().pigs.length > 0,
      { timeout: 10000 }
    );
    await page.waitForTimeout(300);

    // L1 & L2: 10 identical state pushes every 50 ms
    await page.evaluate(() => {
      window.__l1SetThingsCalls = 0;
      window.__l2SetLightCalls = 0;
      const cp = window.CanvasPig;
      const origSetThings = cp.setThings.bind(cp);
      const origSetLight = cp.setLightScene.bind(cp);
      cp.__origSetThings = origSetThings;
      cp.__origSetLight = origSetLight;
      cp.setThings = function (...args) {
        window.__l1SetThingsCalls++;
        return origSetThings(...args);
      };
      cp.setLightScene = function (...args) {
        window.__l2SetLightCalls++;
        return origSetLight(...args);
      };
    });

    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        if (window.bridge && typeof window.bridge.broadcastState === 'function') {
          window.bridge.broadcastState();
        }
      });
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(100);

    const l1l2 = await page.evaluate(() => {
      const cp = window.CanvasPig;
      if (cp.__origSetThings) cp.setThings = cp.__origSetThings;
      if (cp.__origSetLight) cp.setLightScene = cp.__origSetLight;
      return {
        setThings: window.__l1SetThingsCalls,
        setLightScene: window.__l2SetLightCalls
      };
    });

    if (l1l2.setThings === 0) {
      pass('L1-no-setThings-spam', 'setThings called 0 times across 10 identical state pushes');
    } else {
      defect('L1', `CanvasPig.setThings called ${l1l2.setThings} times across 10 identical state pushes (expected 0)`);
    }

    if (l1l2.setLightScene === 0) {
      pass('L2-setLightScene-no-double-render', 'setLightScene called 0 times across 10 identical state pushes');
    } else {
      defect('L2', `CanvasPig.setLightScene called ${l1l2.setLightScene} times across 10 identical state pushes (expected 0)`);
    }

    // L3: litFrame cache efficiency in night scene with lamp over 30 RAF frames
    const l3Count = await page.evaluate(async () => {
      // Stop pig walking if possible by waiting or checking; set night scene with lamp
      window.CanvasPig.setLightScene({
        timeOfDay: 'night',
        tod: 'night',
        ambient: [0.22, 0.25, 0.40],
        tint: '#101428',
        sources: [{ x: 128, y: 72, radius: 90, intensity: 1.0, color: '#ffcc77' }]
      });

      let calls = 0;
      const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        calls++;
        return origGetImageData.apply(this, args);
      };

      try {
        await new Promise((resolve) => {
          let frames = 0;
          function step() {
            frames++;
            if (frames >= 30) resolve();
            else requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      } finally {
        CanvasRenderingContext2D.prototype.getImageData = origGetImageData;
      }
      return calls;
    });

    if (l3Count <= 6) {
      pass('L3-litFrame-cache-efficiency', `getImageData called ${l3Count} times over 30 night+lamp frames (<= 6)`);
    } else {
      defect('L3', `getImageData called ${l3Count} times over 30 night+lamp frames (expected <= 6)`);
    }

    // L4: drag survives state push
    const canvasBox = await page.locator('#pigCanvas').boundingBox();
    const beforeDrag = await page.evaluate(() => {
      const d = window.CanvasPig.debug();
      return {
        x: d.pigs[0].x,
        y: d.pigs[0].y,
        sceneW: (d.sceneSize && d.sceneSize[0]) || 256,
        sceneH: (d.sceneSize && d.sceneSize[1]) || 144
      };
    });

    // Aim at pig body (slightly above anchor y)
    const startX = canvasBox.x + (beforeDrag.x / beforeDrag.sceneW) * canvasBox.width;
    const startY = canvasBox.y + ((beforeDrag.y - 12) / beforeDrag.sceneH) * canvasBox.height;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 45, startY - 20, { steps: 6 });
    await page.waitForTimeout(80);

    const midDrag = await page.evaluate(() => {
      const cp = window.CanvasPig;
      const d = cp.debug();
      return {
        isDragging: typeof cp.isDragging === 'function' ? cp.isDragging() : null,
        x: d.pigs[0].x,
        y: d.pigs[0].y
      };
    });

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        if (window.bridge && typeof window.bridge.broadcastState === 'function') {
          window.bridge.broadcastState();
        }
      });
      await page.waitForTimeout(60);
    }

    const afterPushDrag = await page.evaluate(() => {
      const cp = window.CanvasPig;
      const d = cp.debug();
      return {
        isDragging: typeof cp.isDragging === 'function' ? cp.isDragging() : null,
        x: d.pigs[0].x,
        y: d.pigs[0].y
      };
    });

    await page.mouse.up();
    await page.waitForTimeout(80);

    const movedDelta = midDrag.x - beforeDrag.x;
    const survivedDelta = afterPushDrag.x - beforeDrag.x;
    const snappedBack = afterPushDrag.x < midDrag.x - 5 || Math.abs(afterPushDrag.x - beforeDrag.x) < 10;

    if (midDrag.isDragging !== true) {
      defect('L4', `CanvasPig.isDragging() returned ${midDrag.isDragging} during drag (expected true)`);
    } else if (movedDelta < 30) {
      defect('L4', `debug().pigs[0].x moved only ${movedDelta.toFixed(1)} px during +45px drag (expected >= 30)`);
    } else if (snappedBack || survivedDelta < 30) {
      defect('L4', `debug().pigs[0].x snapped back after 3 state pushes (before=${beforeDrag.x.toFixed(1)}, mid=${midDrag.x.toFixed(1)}, after=${afterPushDrag.x.toFixed(1)})`);
    } else {
      pass('L4-drag-survives-state-push', `isDragging=true, moved +${movedDelta.toFixed(1)}px, survived 3 state pushes at +${survivedDelta.toFixed(1)}px`);
    }

    // L5: average frame time < 8 ms over 60 frames during 5 state pushes
    const l5Stats = await page.evaluate(async () => {
      window.__frameTimes = [];
      window.__recordFrames = true;
      await new Promise((resolve) => {
        let frames = 0;
        function step() {
          frames++;
          if (frames % 12 === 0 && frames <= 60) {
            if (window.bridge && typeof window.bridge.broadcastState === 'function') {
              window.bridge.broadcastState();
            }
          }
          if (frames >= 60) {
            window.__recordFrames = false;
            resolve();
          } else {
            requestAnimationFrame(step);
          }
        }
        requestAnimationFrame(step);
      });
      const times = window.__frameTimes;
      const sum = times.reduce((a, b) => a + b, 0);
      const avg = times.length ? sum / times.length : 999;
      const max = times.length ? Math.max(...times) : 999;
      return { count: times.length, avg, max };
    });

    if (l5Stats.count > 0 && l5Stats.avg < 8) {
      pass('L5-frame-time-budget', `avg=${l5Stats.avg.toFixed(2)}ms, max=${l5Stats.max.toFixed(2)}ms over ${l5Stats.count} frames (< 8ms)`);
    } else {
      defect('L5', `average frame time ${l5Stats.avg.toFixed(2)}ms over ${l5Stats.count} frames (max=${l5Stats.max.toFixed(2)}ms, expected < 8ms)`);
    }

    // L6: no console errors
    const errors = page.__errors || [];
    if (errors.length === 0) {
      pass('L6-no-console-errors', '0 console/page errors');
    } else {
      defect('L6', `${errors.length} console/page error(s): ${errors.join(' | ')}`);
    }

    console.log(`SUMMARY: ${results.filter(r => r.ok).length}/${results.length} passed, ${defects.length} defects`);
  } finally {
    await browser.close();
    server.close();
  }

  if (STRICT && defects.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
