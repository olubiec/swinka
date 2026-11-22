'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');
const DRAW_LIMITS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets', 'data', 'draw_limits.json'), 'utf8')
);
const HOME_BEHAVIOR = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets', 'data', 'home_behavior.json'), 'utf8')
);

const defects = [];
const skips = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push(id);
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push(id);
  console.log('SKIP ' + id + ': ' + reason);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

async function run() {
  const server = await startServer();
  const browser = await launchBrowser();
  const page = await openHome(browser, { base: server.base });
  await page.setViewportSize({ width: 420, height: 640 });

  const frameBudgetMs = 1000 / (DRAW_LIMITS.activeFps || 60);
  const particleCap = (HOME_BEHAVIOR.motion && HOME_BEHAVIOR.motion.particles && HOME_BEHAVIOR.motion.particles.maxActive) || DRAW_LIMITS.maxParticles || 24;

  try {
    // Prepare state with 3 pigs and all 7 scenes unlocked
    await page.evaluate(() => {
      const st = window.bridge.getState();
      st.roster = [
        { id: 'pig_1', name: 'Pip', look: { breed: 'smooth', paletteId: 'tricolor' }, stageKey: 'adult' },
        { id: 'pig_2', name: 'Pop', look: { breed: 'abyssinian', paletteId: 'ginger_white' }, stageKey: 'adult' },
        { id: 'pig_3', name: 'Pua', look: { breed: 'peruvian', paletteId: 'cream' }, stageKey: 'junior' }
      ];
      st.activePigIds = ['pig_1'];
      st.places = st.places || {};
      st.places.order = [
        { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
        { id: 'pig:pig_1', title: 'Pip Room', locked: false, unlockHint: '' },
        { id: 'dorm', title: 'Dormitory', locked: false, unlockHint: '' },
        { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
        { id: 'park', title: 'Park', locked: false, unlockHint: '' },
        { id: 'farm', title: 'Farm', locked: false, unlockHint: '' },
        { id: 'market', title: 'Market', locked: false, unlockHint: '' }
      ];
      st.places.pigLocations = [
        { pigId: 'pig_1', scene: 'salon', pinned: false },
        { pigId: 'pig_2', scene: 'salon', pinned: false },
        { pigId: 'pig_3', scene: 'salon', pinned: false }
      ];
      st.rooms = st.rooms || {};
      st.rooms.layouts = Object.assign({}, st.rooms.layouts || {}, {
        salon: {
          name: 'Salon',
          cols: 16,
          rows: 9,
          wallRows: 2,
          wallpaper: '',
          floor: '',
          items: [
            { uid: 's1', itemId: 'sig_james_hideout', x: 1, y: 5, flip: false, variant: 0 },
            { uid: 's2', itemId: 'sofa_cosy', x: 5, y: 5, flip: false, variant: 0 },
            { uid: 's3', itemId: 'armchair', x: 9, y: 5, flip: false, variant: 0 },
            { uid: 's4', itemId: 'cushion_big', x: 12, y: 6, flip: false, variant: 0 },
            { uid: 's5', itemId: 'pouf_boucle', x: 14, y: 6, flip: false, variant: 0 },
            { uid: 's6', itemId: 'lamp_mushroom', x: 0, y: 3, flip: false, variant: 0 },
            { uid: 's7', itemId: 'lamp_arc', x: 7, y: 0, flip: false, variant: 0 },
            { uid: 's8', itemId: 'water_bottle', x: 15, y: 3, flip: false, variant: 0 }
          ]
        }
      });
      window.bridge.handleStateUpdate(st);
      window.bridge.saveMockState();
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('salon');
      }
    });
    await page.waitForTimeout(300);

    // 1. PERF-frame-time-3-pigs
    const perf3 = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return { ok: false, reason: 'no instance' };
      const pigCount = typeof inst.getPigEntries === 'function' ? inst.getPigEntries().length : 1;
      for (let i = 0; i < 30; i++) {
        inst.update(16.67);
        inst.render();
      }
      const t0 = performance.now();
      for (let i = 0; i < 600; i++) {
        inst.update(16.67);
        inst.render();
      }
      const elapsed = performance.now() - t0;
      return { ok: true, pigCount, totalMs: elapsed, avgMs: elapsed / 600 };
    });
    check(
      'PERF-frame-time-3-pigs',
      !!(perf3.ok && perf3.pigCount >= 3 && perf3.avgMs < frameBudgetMs),
      'pigs=' + perf3.pigCount + ', avgMs=' + (perf3.avgMs ? perf3.avgMs.toFixed(3) : 'N/A') +
      ', budgetMs=' + frameBudgetMs.toFixed(3)
    );

    // 2. PERF-200-things
    const perf200 = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return { ok: false, reason: 'no instance' };
      const things = [];
      for (let i = 0; i < 200; i++) {
        const offscreen = i >= 60;
        things.push({
          id: 't_' + i,
          uid: 'u_' + i,
          itemId: (i % 2 === 0) ? 'cushion_big' : 'pouf_boucle',
          x: offscreen ? (400 + (i % 20) * 16) : ((i % 15) * 16 + 8),
          y: offscreen ? (240 + Math.floor(i / 20) * 16) : (80 + (i % 4) * 14),
          w: 16,
          h: 16
        });
      }
      inst.setThings(things, true);
      for (let i = 0; i < 10; i++) {
        inst.update(16.67);
        inst.render();
      }
      const t0 = performance.now();
      for (let i = 0; i < 120; i++) {
        inst.update(16.67);
        inst.render();
      }
      const elapsed = performance.now() - t0;
      const db = window.DrawBudget;
      const selected = (db && typeof db.selectItems === 'function')
        ? db.selectItems(things.map((t) => ({ x: t.x, y: t.y, w: t.w, h: t.h, anchorX: 0.5, anchorY: 1 })), { x: 0, y: 0, w: 256, h: 144 }, { x: inst.pigX, y: inst.pigY })
        : things;
      return { ok: true, count: inst.things.length, selectedCount: selected.length, avgMs: elapsed / 120 };
    });
    check(
      'PERF-200-things',
      !!(perf200.ok && perf200.count === 200 && perf200.selectedCount <= (DRAW_LIMITS.maxItems || 48) && perf200.avgMs < frameBudgetMs),
      'things=' + perf200.count + ', selected=' + perf200.selectedCount +
      ', avgMs=' + (perf200.avgMs ? perf200.avgMs.toFixed(3) : 'N/A') +
      ', budgetMs=' + frameBudgetMs.toFixed(3)
    );

    // Restore clean salon items before switch tests
    await page.evaluate(() => {
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('salon');
      }
    });
    await page.waitForTimeout(150);

    // 3 & 4. PERF-heap-growth-switch-100 + PERF-listener-leak
    // Warm up 14 switches (2 full cycles of 7 scenes) before measuring steady-state heap & listeners
    await page.evaluate(() => {
      const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        for (let i = 0; i < 14; i++) {
          window.CuyPlaces.openPlace(scenes[i % scenes.length]);
          if (inst) inst.render();
        }
      }
    });
    await page.waitForTimeout(200);

    const switchStats = await page.evaluate(() => {
      const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
      if (!window.CuyPlaces || typeof window.CuyPlaces.openPlace !== 'function') {
        return { ok: false, reason: 'no CuyPlaces.openPlace' };
      }

      // Instrument addEventListener / removeEventListener on window and document
      const origWinAdd = window.addEventListener.bind(window);
      const origWinRem = window.removeEventListener.bind(window);
      const origDocAdd = document.addEventListener.bind(document);
      const origDocRem = document.removeEventListener.bind(document);

      let winAdded = 0;
      let winRemoved = 0;
      let docAdded = 0;
      let docRemoved = 0;

      window.addEventListener = function (type, fn, opts) {
        winAdded++;
        return origWinAdd(type, fn, opts);
      };
      window.removeEventListener = function (type, fn, opts) {
        winRemoved++;
        return origWinRem(type, fn, opts);
      };
      document.addEventListener = function (type, fn, opts) {
        docAdded++;
        return origDocAdd(type, fn, opts);
      };
      document.removeEventListener = function (type, fn, opts) {
        docRemoved++;
        return origDocRem(type, fn, opts);
      };

      const hasMem = !!(performance && performance.memory && typeof performance.memory.usedJSHeapSize === 'number' && performance.memory.usedJSHeapSize > 0);
      const heapBefore = hasMem ? performance.memory.usedJSHeapSize : null;
      const inst = window.CanvasPig && window.CanvasPig.instance;

      try {
        for (let i = 0; i < 100; i++) {
          window.CuyPlaces.openPlace(scenes[i % scenes.length]);
          if (inst) inst.render();
        }
      } finally {
        window.addEventListener = origWinAdd;
        window.removeEventListener = origWinRem;
        document.addEventListener = origDocAdd;
        document.removeEventListener = origDocRem;
      }

      const heapAfter = hasMem ? performance.memory.usedJSHeapSize : null;
      return {
        ok: true,
        hasMem,
        heapBefore,
        heapAfter,
        winAdded,
        winRemoved,
        winNet: winAdded - winRemoved,
        docAdded,
        docRemoved,
        docNet: docAdded - docRemoved
      };
    });

    if (!switchStats.ok || !switchStats.hasMem) {
      skip('PERF-heap-growth-switch-100', switchStats.ok ? 'performance.memory unavailable' : switchStats.reason);
    } else {
      const growth = (switchStats.heapAfter - switchStats.heapBefore) / switchStats.heapBefore;
      check(
        'PERF-heap-growth-switch-100',
        growth < 0.15,
        'heapBefore=' + switchStats.heapBefore + ', heapAfter=' + switchStats.heapAfter + ', growth=' + (growth * 100).toFixed(2) + '%'
      );
    }

    check(
      'PERF-listener-leak',
      !!(switchStats.ok && switchStats.winNet === 0 && switchStats.docNet === 0),
      'winAdded=' + switchStats.winAdded + ', winRemoved=' + switchStats.winRemoved + ', winNet=' + switchStats.winNet +
      ', docAdded=' + switchStats.docAdded + ', docRemoved=' + switchStats.docRemoved + ', docNet=' + switchStats.docNet
    );

    // 5. PERF-particles-cap-long-sleep (simulate 5 minutes of sleep in salon where pig is present)
    await page.evaluate(() => {
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('salon');
      }
    });
    await page.waitForTimeout(100);
    const particleRes = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return { ok: false, reason: 'no instance' };
      inst.setPigVisible(true);
      inst._multiPigActive = false;
      inst.behavior = null;
      inst.targetX = null;
      inst.targetY = null;
      inst.pendingSpot = null;
      inst.drag = null;
      inst._toss = null;
      inst.particles = [];
      inst.playAnim('sleep', 300000);
      let maxParticles = 0;
      let sawZzz = false;
      for (let i = 0; i < 1200; i++) {
        inst.update(250);
        if (inst.particles.length > maxParticles) maxParticles = inst.particles.length;
        if (inst.particles.some((p) => p && p.type === 'zzz')) sawZzz = true;
      }
      return { ok: true, maxParticles, sawZzz, finalCount: inst.particles.length, endAnim: inst.currentAnim };
    });
    check(
      'PERF-particles-cap-long-sleep',
      !!(particleRes.ok && particleRes.sawZzz && particleRes.maxParticles <= particleCap),
      'sawZzz=' + particleRes.sawZzz + ', maxParticles=' + particleRes.maxParticles + ', cap=' + particleCap
    );

    // 6. PERF-visual-clip (no drawing outside 256x144)
    const clipRes = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst || !inst.canvas || !inst.ctx) return { ok: false, reason: 'no canvas' };
      const c = inst.canvas;
      inst.pigX = 254;
      inst.pigY = 142;
      inst.showBubble('Long speech bubble near edge!', 2000);
      inst.render();
      const w = c.width;
      const h = c.height;
      let outsideNonZero = 0;
      if (w > 256 || h > 144) {
        const img = inst.ctx.getImageData(0, 0, w, h).data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (x >= 256 || y >= 144) {
              if (img[(y * w + x) * 4 + 3] > 0) outsideNonZero++;
            }
          }
        }
      }
      return {
        ok: true,
        canvasW: w,
        canvasH: h,
        sceneW: inst.sceneWidth,
        sceneH: inst.sceneHeight,
        outsideNonZero
      };
    });
    check(
      'PERF-visual-clip',
      !!(clipRes.ok && clipRes.sceneW === 256 && clipRes.sceneH === 144 && clipRes.canvasW <= 256 && clipRes.canvasH <= 144 && clipRes.outsideNonZero === 0),
      JSON.stringify(clipRes)
    );

    // 7. PERF-timers-stop-on-destroy
    await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return;
      window.__perfTicksAfterDestroy = 0;
      const origUpdate = inst.update.bind(inst);
      const origRender = inst.render.bind(inst);
      inst.update = function (dt) {
        if (inst.stopped) window.__perfTicksAfterDestroy++;
        return origUpdate(dt);
      };
      inst.render = function () {
        if (inst.stopped) window.__perfTicksAfterDestroy++;
        return origRender();
      };
      inst.destroy();
    });
    await page.waitForTimeout(300);
    const destroyRes = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      return {
        stopped: !!(inst && inst.stopped),
        ticksAfterDestroy: window.__perfTicksAfterDestroy || 0
      };
    });
    check(
      'PERF-timers-stop-on-destroy',
      destroyRes.stopped && destroyRes.ticksAfterDestroy === 0,
      JSON.stringify(destroyRes)
    );
  } finally {
    await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
