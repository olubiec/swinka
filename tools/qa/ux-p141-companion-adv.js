'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..', '..');
const Companion = require(path.join(ROOT, 'web/home/lib/companion.js'));
const companionsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/companions.json'), 'utf8'));
const placeScenesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/place_scenes.json'), 'utf8'));
const ux = require(path.join(ROOT, 'tools/qa/lib/ux.js'));

const STRICT = process.env.STRICT === '1';
const results = [];

function record(status, id, msg) {
  results.push({ status, id, msg });
  console.log(`${status} ${id}: ${msg}`);
}

function runCheck(id, fn) {
  try {
    const res = fn();
    if (res && res.skip) {
      record('SKIP', id, res.skip);
    } else {
      record('PASS', id, typeof res === 'string' ? res : 'ok');
    }
  } catch (err) {
    record('DEFECT', id, err && err.message ? err.message : String(err));
  }
}

async function runAsyncCheck(id, fn) {
  try {
    const res = await fn();
    if (res && res.skip) {
      record('SKIP', id, res.skip);
    } else {
      record('PASS', id, typeof res === 'string' ? res : 'ok');
    }
  } catch (err) {
    record('DEFECT', id, err && err.message ? err.message : String(err));
  }
}

async function launchBrowser() {
  const { chromium } = require('playwright');
  try {
    return await chromium.launch({ headless: true });
  } catch (e) {
    if (process.platform === 'win32') {
      return await chromium.launch({ headless: true, channel: 'msedge' });
    }
    throw e;
  }
}

function getSceneWalk(sceneId) {
  const scenes = placeScenesJson.scenes || placeScenesJson;
  if (scenes && scenes[sceneId] && Array.isArray(scenes[sceneId].walk)) {
    return scenes[sceneId].walk;
  }
  return [8, 80, 248, 138];
}

function getSceneBlockers(sceneId) {
  const scenes = placeScenesJson.scenes || placeScenesJson;
  if (scenes && scenes[sceneId] && Array.isArray(scenes[sceneId].blockers)) {
    return scenes[sceneId].blockers;
  }
  return [];
}

function pointInBlockers(x, y, blockers) {
  for (let i = 0; i < blockers.length; i++) {
    const b = blockers[i];
    if (Array.isArray(b) && b.length >= 4) {
      if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return true;
    } else if (b && typeof b === 'object' && Number.isFinite(b.x0)) {
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true;
    }
  }
  return false;
}

// 1. COM-garden-yes-room-no
runCheck('COM-garden-yes-room-no', () => {
  const inst = Companion.create(companionsJson, { enabled: true, id: 'garden_friend', seed: 101 });
  const allowed = ['garden', 'park'];
  const forbidden = ['salon', 'room', 'farm', 'market', 'pig:kuki'];

  for (const s of allowed) {
    inst.step(50, { sceneId: s, walk: getSceneWalk(s), pigs: [], isFree: () => true });
    const entries = inst.entries();
    assert.strictEqual(entries.length, 1, `Expected 1 entry in '${s}', got ${entries.length}`);
  }

  for (const s of forbidden) {
    inst.step(50, { sceneId: s, walk: getSceneWalk(s), pigs: [], isFree: () => true });
    const entries = inst.entries();
    assert.strictEqual(entries.length, 0, `Expected 0 entries in '${s}', got ${entries.length}`);
  }

  // Re-entering garden after forbidden scenes should spawn cleanly again
  inst.step(50, { sceneId: 'garden', walk: getSceneWalk('garden'), pigs: [], isFree: () => true });
  assert.strictEqual(inst.entries().length, 1, 'Expected 1 entry when returning to garden');
  return 'garden/park=1, salon/room/farm/market/pig:kuki=0';
});

// 2. COM-never-overlaps-3-pigs
runCheck('COM-never-overlaps-3-pigs', () => {
  const spec = companionsJson.companions[0];
  const minPigGap = spec.minPigGap || 20;
  const walk = getSceneWalk('garden');
  const inst = Companion.create(companionsJson, { enabled: true, id: 'garden_friend', seed: 202 });

  const pigs = [
    { x: 60, y: 100 },
    { x: 130, y: 110 },
    { x: 200, y: 120 }
  ];

  let minObserved = Infinity;
  for (let i = 0; i < 600; i++) {
    inst.step(50, { sceneId: 'garden', walk, pigs, isFree: () => true });
    const entries = inst.entries();
    assert.strictEqual(entries.length, 1, `Step ${i}: expected 1 entry`);
    const c = entries[0];
    for (let pIdx = 0; pIdx < pigs.length; pIdx++) {
      const d = Math.hypot(c.x - pigs[pIdx].x, c.y - pigs[pIdx].y);
      if (d < minObserved) minObserved = d;
      assert.ok(
        d >= minPigGap - 2,
        `Step ${i}: companion (${c.x.toFixed(2)}, ${c.y.toFixed(2)}) overlapped pig ${pIdx} (${pigs[pIdx].x}, ${pigs[pIdx].y}), dist=${d.toFixed(2)} < ${minPigGap - 2}`
      );
    }
  }
  return `600 steps with 3 pigs, minDist=${minObserved.toFixed(2)} >= ${minPigGap - 2}`;
});

// 3. COM-stays-in-strip-all-scenes
runCheck('COM-stays-in-strip-all-scenes', () => {
  const scenes = ['garden', 'park'];
  for (const sceneId of scenes) {
    const walk = getSceneWalk(sceneId);
    const blockers = getSceneBlockers(sceneId).concat([[110, 95, 138, 118]]);
    const isFree = (x, y) => !pointInBlockers(x, y, blockers);
    const inst = Companion.create(companionsJson, { enabled: true, id: 'garden_friend', seed: 303 });

    for (let i = 0; i < 500; i++) {
      inst.step(50, {
        sceneId,
        walk,
        pigs: [{ x: 40, y: 100 }],
        isFree
      });
      const entries = inst.entries();
      assert.strictEqual(entries.length, 1, `${sceneId} step ${i}: expected 1 entry`);
      const { x, y } = entries[0];
      assert.ok(
        x >= walk[0] && x <= walk[2] && y >= walk[1] && y <= walk[3],
        `${sceneId} step ${i}: (${x}, ${y}) outside walk [${walk.join(', ')}]`
      );
      assert.ok(isFree(x, y), `${sceneId} step ${i}: (${x}, ${y}) entered blocker`);
    }
  }
  return '500 steps in garden & park inside walk strip and free of blockers';
});

// 4. COM-switch-off-removes-instantly
runCheck('COM-switch-off-removes-instantly', () => {
  const inst = Companion.create(companionsJson, { enabled: true, id: 'garden_friend', seed: 404 });
  inst.step(50, { sceneId: 'garden', walk: getSceneWalk('garden'), pigs: [], isFree: () => true });
  assert.strictEqual(inst.entries().length, 1, 'Expected 1 entry before switch off');

  inst.setEnabled(false);
  assert.strictEqual(inst.entries().length, 0, 'Expected 0 entries immediately after setEnabled(false) without step()');

  inst.setEnabled(true);
  inst.step(50, { sceneId: 'garden', walk: getSceneWalk('garden'), pigs: [], isFree: () => true });
  assert.strictEqual(inst.entries().length, 1, 'Expected 1 entry after re-enabling and stepping');
  return 'setEnabled(false) clears entries() immediately without step()';
});

// 6. COM-perf-300-frames
runCheck('COM-perf-300-frames', () => {
  const walk = getSceneWalk('garden');
  const inst = Companion.create(companionsJson, { enabled: true, id: 'garden_friend', seed: 606 });
  const ctx = {
    sceneId: 'garden',
    walk,
    pigs: [{ x: 60, y: 100 }, { x: 180, y: 115 }],
    isFree: () => true
  };

  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 300; i++) {
    inst.step(16, ctx);
    const entries = inst.entries();
    assert.ok(entries.length <= 1, `Frame ${i}: entries length ${entries.length} > 1`);
  }
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(elapsedMs < 50, `300 frames took ${elapsedMs.toFixed(2)} ms (>= 50 ms)`);
  return `300 frames in ${elapsedMs.toFixed(2)} ms (< 50 ms)`;
});

async function openHomePage(browser, base, query) {
  const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
  page.__errors = [];
  page.on('pageerror', (e) => { page.__errors.push('pageerror: ' + e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      page.__errors.push('console: ' + m.text());
    }
  });
  const q = query ? (query.startsWith('?') ? query : '?' + query) : '';
  await page.goto(`${base}/web/home/index.html${q}`);
  await page.evaluate(() => document.body.classList.add('webview-mode'));
  await page.waitForFunction(
    () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length >= 10,
    null,
    { timeout: 10000 }
  );
  await page.waitForTimeout(400);
  if (await page.isVisible('#modalBackdrop.active')) {
    await page.click('#modalCloseBtn');
    await page.waitForTimeout(200);
  }
  return page;
}

// Browser tests: COM-draw-order-with-furniture & COM-console-clean
(async () => {
  let server;
  let browser;
  try {
    server = await ux.startServer();
    browser = await launchBrowser();
  } catch (err) {
    record('SKIP', 'COM-draw-order-with-furniture', `Playwright unavailable: ${err.message}`);
    record('SKIP', 'COM-console-clean', `Playwright unavailable: ${err.message}`);
    finalize();
    return;
  }

  let page;
  try {
    // 7. COM-console-clean
    await runAsyncCheck('COM-console-clean', async () => {
      page = await openHomePage(browser, server.base, 'mock=1');
      await page.evaluate(() => {
        if (window.bridge && typeof window.bridge.send === 'function') {
          window.bridge.send({ type: 'place_enter', id: 'garden' });
        }
        if (window.CanvasPig && typeof window.CanvasPig.setCompanion === 'function') {
          window.CanvasPig.setCompanion({ enabled: true, id: 'garden_friend' });
        }
      });
      await page.waitForTimeout(400);
      assert.strictEqual(
        page.__errors.length,
        0,
        `Console/page errors detected: ${page.__errors.join(' | ')}`
      );
      return 'Home mock in garden emitted 0 console/page errors';
    });

    // 5. COM-draw-order-with-furniture
    await runAsyncCheck('COM-draw-order-with-furniture', async () => {
      if (!page) {
        page = await openHomePage(browser, server.base, 'mock=1');
      }
      const hasApi = await page.evaluate(() => {
        return !!(window.CanvasPig && typeof window.CanvasPig.setCompanion === 'function');
      });
      if (!hasApi) {
        return { skip: 'CanvasPig.setCompanion is not wired' };
      }

      const drawOrder = await page.evaluate(() => {
        const cp = window.CanvasPig;
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || cp.instance || (window.PigCanvas && window.PigCanvas.instance);
        if (!inst || typeof inst.drawThing !== 'function' || typeof inst.drawCompanionEntry !== 'function' || typeof inst.render !== 'function') {
          return { skip: 'PigCanvas instance drawThing/drawCompanionEntry/render not accessible' };
        }

        if (window.CuyScenes && typeof window.CuyScenes.getSceneDef === 'function' && typeof cp.setScene === 'function') {
          const gardenDef = window.CuyScenes.getSceneDef('garden');
          if (gardenDef) cp.setScene(gardenDef);
        }
        cp.setCompanion({ enabled: true, id: 'garden_friend' });
        if (typeof cp.fastForward === 'function') {
          cp.fastForward(100);
        } else if (typeof inst.update === 'function') {
          inst.update(50);
        }

        const dbg = cp.debug ? cp.debug() : null;
        const compList = dbg && Array.isArray(dbg.companion) ? dbg.companion : [];
        if (compList.length === 0) {
          return { error: 'Companion did not spawn in garden after setCompanion({ enabled: true })' };
        }
        const compY = compList[0].y;

        // Place two synthetic standing things: one behind (y < compY) and one in front (y > compY)
        const behindY = Math.max(80, Math.round(compY - 12));
        const frontY = Math.min(138, Math.round(compY + 12));
        const prevThings = Array.isArray(inst.things) ? inst.things.slice() : [];

        inst.things = [
          { id: 'test_behind', itemId: 'pellets_bowl', x: 50, y: behindY, w: 16, h: 16, flat: false },
          { id: 'test_front', itemId: 'pellets_bowl', x: 50, y: frontY, w: 16, h: 16, flat: false }
        ];

        const log = [];
        const origDrawThing = inst.drawThing;
        const origDrawComp = inst.drawCompanionEntry;
        inst.drawThing = function (ctx, thing) {
          if (thing && (thing.id === 'test_behind' || thing.id === 'test_front')) {
            log.push({ kind: 'thing', id: thing.id, y: thing.y });
          }
          return origDrawThing.apply(this, arguments);
        };
        inst.drawCompanionEntry = function (ctx, entry) {
          if (entry) {
            log.push({ kind: 'companion', id: entry.id, y: entry.y });
          }
          return origDrawComp.apply(this, arguments);
        };

        try {
          inst.render();
        } finally {
          inst.drawThing = origDrawThing;
          inst.drawCompanionEntry = origDrawComp;
          inst.things = prevThings;
        }

        return { compY, behindY, frontY, log };
      });

      if (drawOrder.skip) return { skip: drawOrder.skip };
      if (drawOrder.error) throw new Error(drawOrder.error);

      const { log, behindY, compY, frontY } = drawOrder;
      assert.strictEqual(log.length, 3, `Expected 3 draw calls (2 furniture + 1 companion), got ${log.length}: ${JSON.stringify(log)}`);
      for (let i = 1; i < log.length; i++) {
        assert.ok(
          log[i - 1].y <= log[i].y,
          `Draw order not Y-sorted: ${JSON.stringify(log)}`
        );
      }
      if (behindY < compY && compY < frontY) {
        assert.strictEqual(log[0].id, 'test_behind', `Expected test_behind first, got ${JSON.stringify(log)}`);
        assert.strictEqual(log[1].kind, 'companion', `Expected companion second, got ${JSON.stringify(log)}`);
        assert.strictEqual(log[2].id, 'test_front', `Expected test_front last, got ${JSON.stringify(log)}`);
      }
      return `Y-sorted draw order verified: ${log.map(e => `${e.kind}(y=${e.y.toFixed(1)})`).join(' -> ')}`;
    });
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    finalize();
  }
})();

function finalize() {
  const defects = results.filter(r => r.status === 'DEFECT');
  const skips = results.filter(r => r.status === 'SKIP');
  const passes = results.filter(r => r.status === 'PASS');
  console.log(`SUMMARY: PASS=${passes.length} DEFECT=${defects.length} SKIP=${skips.length}`);
  if (STRICT && defects.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}
