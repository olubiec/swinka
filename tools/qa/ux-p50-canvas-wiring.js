'use strict';
const path = require('path');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const ROOT = path.resolve(__dirname, '../..');

async function launchBrowser() {
  if (process.env.CHROMIUM_PATH) {
    return chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  }
  try {
    return await chromium.launch();
  } catch (e) {
    return chromium.launch({ channel: 'msedge', headless: true });
  }
}

async function run() {
  const server = await ux.startServer();
  const browser = await launchBrowser();
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  page.setDefaultTimeout(10000);

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(String(err));
  });

  // Load F2-2 modules explicitly until PK-APP2 wires them in index.html
  await page.addScriptTag({ path: path.join(ROOT, 'web/home/lib/scene-pigs.js') });
  await page.addScriptTag({ path: path.join(ROOT, 'web/home/lib/play-targets.js') });
  await page.addScriptTag({ path: path.join(ROOT, 'web/home/lib/hotspots.js') });

  // Ensure scene_hotspots.json and scenes are loaded
  await page.evaluate(async () => {
    if (window.CuyScenes && window.CuyScenes.load) await window.CuyScenes.load();
    if (window.CuyScenes && window.CuyScenes.loadAtlas) await window.CuyScenes.loadAtlas();
  });

  let hasFailures = false;
  const testScenario = async (name, fn) => {
    try {
      await fn();
      console.log(`PASS: ${name}`);
    } catch (err) {
      hasFailures = true;
      console.error(`FAIL: ${name}:`, err && err.stack ? err.stack : err);
    }
  };

  // C1: two-pigs-drawn
  await testScenario('C1 two-pigs-drawn', async () => {
    const res = await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([], true);
      window.CanvasPig.setPresentPigs([
        { id: 'pig_1', look: { breed: 'smooth', coat: 'tricolor' }, pinned: true, stage: 'adult', x: 70, y: 105 },
        { id: 'pig_2', look: { breed: 'abyssinian', coat: 'golden' }, pinned: true, stage: 'adult', x: 160, y: 115 }
      ]);
      window.CanvasPig.fastForward(50);
      return window.CanvasPig.debug();
    });
    assert.ok(Array.isArray(res.pigs), 'debug().pigs should be an array');
    assert.strictEqual(res.pigs.length, 2, 'Expected 2 pigs in debug().pigs');
    assert.notDeepStrictEqual(res.pigs[0].look, res.pigs[1].look, 'Pigs should have different looks');
  });

  // C2: pig-sort-with-things
  await testScenario('C2 pig-sort-with-things', async () => {
    const res = await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([
        { id: 'bench_mid', itemId: 'bench_wood', x: 120, y: 110, w: 32, h: 16, flat: false }
      ], true);
      window.CanvasPig.setPresentPigs([
        { id: 'pig_top', look: { breed: 'smooth', coat: 'tricolor' }, pinned: true, stage: 'adult', x: 80, y: 95 },
        { id: 'pig_bot', look: { breed: 'abyssinian', coat: 'golden' }, pinned: true, stage: 'adult', x: 160, y: 125 }
      ]);
      window.CanvasPig.fastForward(50);
      return window.CanvasPig.debug().renderList;
    });
    const ids = res.map(r => r.id);
    const idxTop = ids.indexOf('pig_top');
    const idxBench = ids.indexOf('bench_mid');
    const idxBot = ids.indexOf('pig_bot');
    assert.ok(idxTop !== -1 && idxBench !== -1 && idxBot !== -1, `Missing entries in renderList: ${JSON.stringify(ids)}`);
    assert.ok(idxTop < idxBench, `pig_top (y=95) should be drawn before bench_mid (y=110): ${JSON.stringify(ids)}`);
    assert.ok(idxBench < idxBot, `bench_mid (y=110) should be drawn before pig_bot (y=125): ${JSON.stringify(ids)}`);
  });

  // C3: pig-absent-other-scene
  await testScenario('C3 pig-absent-other-scene', async () => {
    const res = await page.evaluate(() => {
      window.CanvasPig.setPresentPigs([
        { id: 'pig_1', look: { breed: 'smooth', coat: 'tricolor' }, pinned: true, stage: 'adult', x: 100, y: 110 }
      ]);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.fastForward(50);
      return window.CanvasPig.debug();
    });
    assert.strictEqual(res.pigs.length, 0, 'Expected 0 pigs when none present in scene');
    assert.strictEqual(res.pigVisible, false, 'Expected pigVisible === false');
  });

  // C4: play-target-reachable-only
  await testScenario('C4 play-target-reachable-only', async () => {
    const res = await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.pigX = 60;
      window.CanvasPig.pigY = 110;

      // Put a wall of benches blocking x=150 across the entire walk band y=76..144 (4px steps, no gaps), and a ball behind it at (210, 115)
      const blockers = [];
      for (let by = 76; by <= 144; by += 4) {
        blockers.push({ id: 'wall_' + by, itemId: 'bench_wood', x: 150, y: by, w: 32, h: 16, flat: false });
      }
      const blockedBall = { id: 'ball_blocked', uid: 'ball_blocked', itemId: 'prop_ball', x: 210, y: 115, w: 16, h: 16, flat: false };
      window.CanvasPig.setThings(blockers.concat([blockedBall]), true);

      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const origRand = Math.random;
      Math.random = () => 0.05; // Force play target branch (< 0.25)
      let pickedBlocked = false;
      try {
        for (let i = 0; i < 10; i++) {
          inst.pickRandomWalkTarget();
          if (inst.pendingPlay && inst.pendingPlay.thingUid === 'ball_blocked') {
            pickedBlocked = true;
          }
        }
      } finally {
        Math.random = origRand;
      }

      // Now add a reachable ball at (100, 110)
      const freeBall = { id: 'ball_free', uid: 'ball_free', itemId: 'prop_ball', x: 100, y: 110, w: 16, h: 16, flat: false };
      window.CanvasPig.setThings(blockers.concat([blockedBall, freeBall]), true);
      Math.random = () => 0.05;
      let pickedFree = null;
      try {
        inst.pickRandomWalkTarget();
        pickedFree = inst.pendingPlay ? inst.pendingPlay.thingUid : null;
      } finally {
        Math.random = origRand;
      }
      return { pickedBlocked, pickedFree };
    });
    assert.strictEqual(res.pickedBlocked, false, 'Blocked toy behind furniture must never be chosen');
    assert.strictEqual(res.pickedFree, 'ball_free', 'Reachable toy should be chosen');
  });

  // C5: single-toy-drawn-during-play
  await testScenario('C5 single-toy-drawn-during-play', async () => {
    const res = await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.pigX = 80;
      window.CanvasPig.pigY = 110;
      const ball = { id: 'ball_1', uid: 'ball_1', itemId: 'prop_ball', x: 120, y: 110, w: 16, h: 16, flat: false };
      window.CanvasPig.setThings([ball], true);

      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const origRand = Math.random;
      Math.random = () => 0.05;
      try {
        inst.pickRandomWalkTarget();
      } finally {
        Math.random = origRand;
      }
      const hadPending = !!inst.pendingPlay;
      // Fast forward until pig reaches spot and starts activePlay
      for (let i = 0; i < 40 && !inst.activePlay; i++) {
        window.CanvasPig.fastForward(100);
      }
      const duringPlay = {
        active: !!inst.activePlay,
        suppressDraw: !!ball.suppressDraw,
        scale: window.CanvasPig.scaleAt(inst.pigY),
        drawScale: inst.getDrawScale()
      };
      // Fast forward until play finishes
      for (let i = 0; i < 60 && inst.activePlay; i++) {
        window.CanvasPig.fastForward(100);
      }
      const afterPlay = {
        active: !!inst.activePlay,
        suppressDraw: !!ball.suppressDraw
      };
      return { hadPending, duringPlay, afterPlay };
    });
    assert.ok(res.hadPending, 'Expected pendingPlay to be set');
    assert.ok(res.duringPlay.active, 'Expected activePlay after reaching spot');
    assert.strictEqual(res.duringPlay.suppressDraw, true, 'Toy suppressDraw must be true during play (single copy drawn)');
    assert.strictEqual(res.duringPlay.drawScale, res.duringPlay.scale, 'Pig+toy drawn at scaleAt(pigY)');
    assert.strictEqual(res.afterPlay.active, false, 'activePlay should clear after animation');
    assert.strictEqual(res.afterPlay.suppressDraw, false, 'Toy suppressDraw should reset after play');
  });

  // C6: strip-frame-advances
  await testScenario('C6 strip-frame-advances', async () => {
    const res = await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPigVisible(false);

      // Create an offscreen 64x16 strip canvas as fake loaded image for brazier_on (4 frames of 16x16)
      const strip = document.createElement('canvas');
      strip.width = 64;
      strip.height = 16;
      const sctx = strip.getContext('2d');
      sctx.fillStyle = '#ff6600';
      sctx.fillRect(0, 0, 64, 16);

      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const onUrl = inst.getAssetUrl('world/garden/brazier_on.png');
      inst.imageCache[onUrl] = strip;

      const brazier = { id: 'fx:garden:brazier', uid: 'fx:garden:brazier', itemId: 'brazier', x: 100, y: 110, w: 16, h: 16, img: strip };
      window.CanvasPig.setThings([brazier], true);
      inst.setLightScene({
        ambient: { color: [1, 1, 1], level: 1 },
        sources: [
          { id: 'fx:garden:brazier', item: 'brazier', on: true, on_file: 'garden/brazier_on.png', frames: 4, fps: 8, x: 100, y: 110 }
        ]
      });

      const origNow = Date.now;
      const origPerfNow = performance.now.bind(performance);
      const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      const calls = [];
      CanvasRenderingContext2D.prototype.drawImage = function (img, sx, sy, sw, sh) {
        if (img === strip && arguments.length >= 9) {
          calls.push({ sx, sy, sw, sh });
        }
        return origDrawImage.apply(this, arguments);
      };

      try {
        Date.now = () => 0;
        performance.now = () => 0;
        inst.render();
        const at0 = calls.slice();
        calls.length = 0;

        Date.now = () => 250; // at 8 fps, 250ms = frame 2
        performance.now = () => 250;
        inst.render();
        const at250 = calls.slice();
        return { at0, at250 };
      } finally {
        CanvasRenderingContext2D.prototype.drawImage = origDrawImage;
        Date.now = origNow;
        performance.now = origPerfNow;
        inst.setLightScene(null);
      }
    });
    assert.ok(res.at0.length > 0, 'Expected strip drawImage call at t=0');
    assert.ok(res.at250.length > 0, 'Expected strip drawImage call at t=250ms');
    assert.strictEqual(res.at0[0].sw, 16, 'Frame width must be stripWidth / frames (64 / 4 = 16)');
    assert.strictEqual(res.at250[0].sw, 16, 'Frame width must be 16 at t=250ms');
    assert.notStrictEqual(res.at0[0].sx, res.at250[0].sx, 'Strip frame sx must advance over time');
  });

  // C7: hotspot-hover-and-click
  await testScenario('C7 hotspot-hover-and-click', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([], true);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.pigX = 210;
      window.CanvasPig.pigY = 120;
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      inst.targetX = null; inst.targetY = null; inst.path = []; inst.idleTimer = 5000;
      window.CanvasPig.setHotspots([
        { id: 'stall:seeds', kind: 'stall', rect: [20, 40, 68, 88], label: 'Seeds' }
      ]);
      window._c7Calls = [];
      if (window._c7Unsub) window._c7Unsub();
      window._c7Unsub = window.CanvasPig.onHotspot(h => window._c7Calls.push(h.id));
    });
    const pt = await page.evaluate(() => window.CanvasPig.toClient(44, 64));
    await page.mouse.move(pt.clientX, pt.clientY);
    const cursor = await page.evaluate(() => document.getElementById('pigCanvas').style.cursor);
    assert.strictEqual(cursor, 'pointer', 'Cursor over hotspot should be pointer');
    await page.mouse.click(pt.clientX, pt.clientY);
    const diag = await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      return { calls: window._c7Calls, hotspots: window.CanvasPig.getHotspots().length, suppressClick: inst.suppressClick, editMode: inst.isEditMode(), pigX: inst.pigX, pigY: inst.pigY };
    });
    assert.deepStrictEqual(diag.calls, ['stall:seeds'], `onHotspot should be called once, diag=${JSON.stringify(diag)}`);
  });

  // C8: pig-wins-over-hotspot
  await testScenario('C8 pig-wins-over-hotspot', async () => {
    await page.evaluate(() => {
      window.CanvasPig.pigX = 44;
      window.CanvasPig.pigY = 64;
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      inst.targetX = null; inst.targetY = null; inst.path = []; inst.idleTimer = 5000;
      window._c7Calls = [];
    });
    const pt = await page.evaluate(() => window.CanvasPig.toClient(44, 54));
    await page.mouse.move(pt.clientX, pt.clientY);
    const cursor = await page.evaluate(() => document.getElementById('pigCanvas').style.cursor);
    assert.strictEqual(cursor, 'grab', 'Cursor over pig+hotspot must be grab');
    await page.mouse.click(pt.clientX, pt.clientY);
    const calls = await page.evaluate(() => window._c7Calls);
    assert.strictEqual(calls.length, 0, 'Pig must win over hotspot on click');
  });

  // C9: edit-disables-hotspots
  await testScenario('C9 edit-disables-hotspots', async () => {
    await page.evaluate(() => {
      window.CanvasPig.pigX = 210;
      window.CanvasPig.pigY = 120;
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      inst.targetX = null; inst.targetY = null; inst.path = []; inst.idleTimer = 5000;
      window._c7Calls = [];
      window._origCuyEdit = window.CuyEdit;
      window.CuyEdit = { isOpen: () => true };
    });
    const pt = await page.evaluate(() => window.CanvasPig.toClient(44, 64));
    await page.mouse.move(pt.clientX, pt.clientY);
    const cursor = await page.evaluate(() => document.getElementById('pigCanvas').style.cursor);
    assert.strictEqual(cursor, 'default', 'Cursor in edit mode must not be pointer');
    await page.mouse.click(pt.clientX, pt.clientY);
    const calls = await page.evaluate(() => {
      window.CuyEdit = window._origCuyEdit;
      return window._c7Calls;
    });
    assert.strictEqual(calls.length, 0, 'Hotspot must not fire when edit mode is open');
  });

  // C10: drag-never-fires
  await testScenario('C10 drag-never-fires', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([], true);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPigVisible(true);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      inst.pigX = 100;
      inst.pigY = 100;
      inst.targetX = null; inst.targetY = null; inst.path = []; inst.idleTimer = 5000;
      inst.render();
      window.CanvasPig.setHotspots([
        { id: 'stall:seeds', kind: 'stall', rect: [20, 40, 120, 120], label: 'Seeds' }
      ]);
      window._c7Calls = [];
    });
    const startPt = await page.evaluate(() => window.CanvasPig.toClient(100, 90));
    const endPt = await page.evaluate(() => window.CanvasPig.toClient(40, 90));
    await page.mouse.move(startPt.clientX, startPt.clientY);
    await page.mouse.down();
    await page.mouse.move(endPt.clientX, endPt.clientY, { steps: 5 });
    await page.mouse.up();
    const diag = await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      return { calls: window._c7Calls, pigX: inst.pigX, pigY: inst.pigY, suppressClick: inst.suppressClick };
    });
    assert.strictEqual(diag.calls.length, 0, `Dragging pig must never fire onHotspot, diag=${JSON.stringify(diag)}`);
  });

  // C11: hotspotsFor-from-instances
  await testScenario('C11 hotspotsFor-from-instances', async () => {
    const res = await page.evaluate(() => {
      const mkState = (cx, cy) => ({
        rooms: {
          layouts: {
            market: {
              cols: 16,
              rows: 9,
              wallRows: 2,
              items: [
                { uid: 'fx:market:stall_seeds', itemId: 'stall_big', x: cx, y: cy, flip: false }
              ]
            }
          }
        }
      });
      const h1 = window.CuyScenes.hotspotsFor('market', mkState(2, 4));
      const h2 = window.CuyScenes.hotspotsFor('market', mkState(8, 4));
      return { h1, h2 };
    });
    const s1 = res.h1.find(h => h.uid === 'fx:market:stall_seeds');
    const s2 = res.h2.find(h => h.uid === 'fx:market:stall_seeds');
    assert.ok(s1 && s2, 'Expected stall_seeds hotspot in both states');
    assert.strictEqual(s2.rect[0] - s1.rect[0], 96, 'Moving instance +6 cells must shift hotspot rect by +96 px');
    assert.strictEqual(s2.rect[2] - s1.rect[2], 96, 'Moving instance +6 cells must shift hotspot x1 by +96 px');
  });

  // Perf check: 3 pigs vs 1 pig baseline (<= 1.5x drawImage & frame time)
  await testScenario('Perf 3-pigs <= 1.5x baseline', async () => {
    const perf = await page.evaluate(async () => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([], true);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

      const measure = async (pigs) => {
        window.CanvasPig.setPresentPigs(pigs);
        let drawCalls = 0;
        const origDraw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function () {
          drawCalls++;
          return origDraw.apply(this, arguments);
        };
        try {
          inst.render();
        } finally {
          CanvasRenderingContext2D.prototype.drawImage = origDraw;
        }
        const times = [];
        for (let i = 0; i < 30; i++) {
          const t0 = performance.now();
          inst.update(16);
          inst.render();
          times.push(performance.now() - t0);
        }
        times.sort((a, b) => a - b);
        const p95 = times[Math.floor(times.length * 0.95)];
        return { drawCalls, p95 };
      };

      const base = await measure([
        { id: 'p1', look: { breed: 'smooth', coat: 'tricolor' }, pinned: false, stage: 'adult', x: 70, y: 105 }
      ]);
      const three = await measure([
        { id: 'p1', look: { breed: 'smooth', coat: 'tricolor' }, pinned: false, stage: 'adult', x: 70, y: 105 },
        { id: 'p2', look: { breed: 'abyssinian', coat: 'golden' }, pinned: false, stage: 'adult', x: 120, y: 112 },
        { id: 'p3', look: { breed: 'silkie', coat: 'black' }, pinned: false, stage: 'adult', x: 170, y: 120 }
      ]);
      return { base, three };
    });
    console.log(`PERF: 1-pig drawImage=${perf.base.drawCalls} p95=${perf.base.p95.toFixed(2)}ms | 3-pigs drawImage=${perf.three.drawCalls} p95=${perf.three.p95.toFixed(2)}ms`);
    assert.ok(perf.three.drawCalls <= Math.ceil(perf.base.drawCalls * 1.5) + 4,
      `3-pigs drawImage (${perf.three.drawCalls}) exceeds 1.5x baseline (${perf.base.drawCalls})`);
  });

  // C12: no-console-errors
  await testScenario('C12 no-console-errors', async () => {
    assert.strictEqual(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
  });

  await browser.close();
  await server.close();
  process.exit(hasFailures ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
