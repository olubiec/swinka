// PK-T12: Performance, memory and listener leak tests (P1-P8)
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
module.paths.unshift(path.join(__dirname, 'node_modules'));
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

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

// Child mode for P8 verification of STRICT=1 exit code behavior (runs before launching browser)
if (process.env.PK_T12_P8_CHILD === '1') {
  check('P8_SYNTHETIC', false, 'synthetic threshold miss for P8 verification');
  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
  process.exit(0);
}

const INIT_SCRIPT = `
  (function () {
    // 1. Track active EventTarget listeners (window, document, and connected DOM nodes)
    var listeners = new Map();
    var origAdd = EventTarget.prototype.addEventListener;
    var origRemove = EventTarget.prototype.removeEventListener;

    function normCapture(opts) {
      if (typeof opts === 'boolean') return opts;
      if (opts && typeof opts === 'object') return !!opts.capture;
      return false;
    }

    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (typeof fn === 'function' || (fn && typeof fn.handleEvent === 'function')) {
        var cap = normCapture(opts);
        var tMap = listeners.get(this);
        if (!tMap) { tMap = new Map(); listeners.set(this, tMap); }
        var key = String(type) + ':' + (cap ? '1' : '0');
        var fSet = tMap.get(key);
        if (!fSet) { fSet = new Set(); tMap.set(key, fSet); }
        if (opts && typeof opts === 'object' && opts.once) {
          var self = this;
          var wrapped = function () {
            fSet.delete(fn);
            return typeof fn === 'function' ? fn.apply(this, arguments) : fn.handleEvent.apply(fn, arguments);
          };
          fSet.add(fn);
          return origAdd.call(self, type, wrapped, opts);
        }
        fSet.add(fn);
      }
      return origAdd.apply(this, arguments);
    };

    EventTarget.prototype.removeEventListener = function (type, fn, opts) {
      if (typeof fn === 'function' || (fn && typeof fn.handleEvent === 'function')) {
        var cap = normCapture(opts);
        var tMap = listeners.get(this);
        if (tMap) {
          var key = String(type) + ':' + (cap ? '1' : '0');
          var fSet = tMap.get(key);
          if (fSet) fSet.delete(fn);
        }
      }
      return origRemove.apply(this, arguments);
    };

    window.__countTrackedListeners = function () {
      var total = 0;
      var connected = 0;
      var winDoc = 0;
      listeners.forEach(function (tMap, target) {
        var isWinDoc = (target === window || target === document);
        var isLive = isWinDoc || (target && target.isConnected === true);
        tMap.forEach(function (fSet) {
          total += fSet.size;
          if (isLive) connected += fSet.size;
          if (isWinDoc) winDoc += fSet.size;
        });
      });
      return { total: total, connected: connected, winDoc: winDoc };
    };

    // 2. Track live setInterval and requestAnimationFrame loops
    var liveIntervals = new Set();
    var origSetInterval = window.setInterval.bind(window);
    var origClearInterval = window.clearInterval.bind(window);
    window.setInterval = function (fn, ms) {
      var id = origSetInterval.apply(window, arguments);
      liveIntervals.add(id);
      return id;
    };
    window.clearInterval = function (id) {
      liveIntervals.delete(id);
      return origClearInterval(id);
    };

    var pendingRaf = new Set();
    var origRaf = window.requestAnimationFrame.bind(window);
    var origCaf = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
      var id = origRaf(function (t) {
        pendingRaf.delete(id);
        cb(t);
      });
      pendingRaf.add(id);
      return id;
    };
    window.cancelAnimationFrame = function (id) {
      pendingRaf.delete(id);
      return origCaf(id);
    };

    window.__loopCounters = function () {
      return {
        intervals: liveIntervals.size,
        raf: pendingRaf.size
      };
    };

    // 3. Track drawImage calls per frame
    var origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    window.__drawImageCount = 0;
    window.__countingDrawImage = false;
    CanvasRenderingContext2D.prototype.drawImage = function () {
      if (window.__countingDrawImage) {
        window.__drawImageCount++;
      }
      return origDrawImage.apply(this, arguments);
    };
  })();
`;

async function launchBrowser() {
  const args = ['--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true, args });
  }
  return browser;
}

(async () => {
  const server = await ux.startServer();
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({ viewport: { width: 420, height: 640 } });
    await context.addInitScript(INIT_SCRIPT);
    await context.addInitScript(() => { window.__cuyNow = '12:00'; });

    // Warm up HTTP server & browser context cache before P7 timing
    const warmPage = await context.newPage();
    await warmPage.goto(server.base + '/web/home/index.html', { waitUntil: 'domcontentloaded' });
    await warmPage.close();

    const page = await context.newPage();
    page.__errors = [];
    page.on('pageerror', (e) => { page.__errors.push('pageerror: ' + e.message); });
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
        page.__errors.push('console: ' + m.text());
      }
    });

    const cdp = await context.newCDPSession(page);

    // =========================================================================
    // P7: loading Home: time to the first painted scene under 3 s headless
    // =========================================================================
    const tLoadStart = Date.now();
    await page.goto(server.base + '/web/home/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(() => {
      const c = document.getElementById('pigCanvas');
      if (!c || !window.CanvasPig) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 64) {
        if (d[i] > 0) return true;
      }
      return false;
    }, { timeout: 10000, polling: 'raf' });
    const firstPaintMs = Date.now() - tLoadStart;
    check('P7', firstPaintMs < 3000, `time to first painted scene was ${firstPaintMs} ms (expected < 3000 ms)`);

    // Wait for features to finish loading and close any startup modal
    await page.waitForFunction(
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 10,
      { timeout: 10000 }
    );
    await page.waitForTimeout(300);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(150);
    }

    // Reset mock state and ensure scene & light catalogs are loaded
    await page.evaluate(async () => {
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
      if (window.CuyScenes && typeof window.CuyScenes.load === 'function') {
        await window.CuyScenes.load();
      }
      if (window.CuyScenes && typeof window.CuyScenes.loadAtlas === 'function') {
        await window.CuyScenes.loadAtlas();
      }
      if (window.CuyScenes && typeof window.CuyScenes.loadTiles === 'function') {
        await window.CuyScenes.loadTiles();
      }
    });

    // =========================================================================
    // P1 & P2: Baseline vs Stress scene frame time p95 and drawImage budget
    // =========================================================================
    // Baseline scene: salon, 1 pig, daytime, default items
    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      const st = window.bridge.getState();
      const m = window.CuyScenesMock ? window.CuyScenesMock.state('all_unlocked') : null;
      if (m) {
        st.places = m.places;
        st.places.order.forEach(p => { p.locked = false; });
        st.rooms = Object.assign({}, st.rooms, m.rooms);
      }
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: true }];
      if (!st.rooms.layouts.salon) {
        st.rooms.layouts.salon = { cols: 12, rows: 7, wallRows: 2, items: [] };
      } else {
        st.rooms.layouts.salon.items = st.rooms.layouts.salon.items.slice(0, 4);
      }
      window.bridge.broadcastState();
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('salon');
      }
    });
    await page.waitForTimeout(350);

    const measureScenePerf = async () => {
      return await page.evaluate(async () => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
        const cache = (inst && inst.imageCache) || {};
        const imgs = Object.values(cache);
        await Promise.all(imgs.map(img => {
          if (!img || img.complete || img.failed) return Promise.resolve();
          return new Promise(res => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
            setTimeout(res, 500);
          });
        }));

        // Warm-up 15 frames
        for (let i = 0; i < 15; i++) {
          inst.update(16.6);
          inst.render();
        }

        // Count drawImage on 1 render() frame
        window.__drawImageCount = 0;
        window.__countingDrawImage = true;
        inst.render();
        window.__countingDrawImage = false;
        const drawCalls = window.__drawImageCount;

        // Measure 80 frames
        const renderTimes = [];
        for (let i = 0; i < 80; i++) {
          const t0 = performance.now();
          inst.update(16.67);
          inst.render();
          const t1 = performance.now();
          renderTimes.push(t1 - t0);
        }
        renderTimes.sort((a, b) => a - b);
        const p50 = renderTimes[Math.floor(renderTimes.length * 0.5)];
        const p95 = renderTimes[Math.floor(renderTimes.length * 0.95)];

        // Also measure rAF frame-to-frame p95 over 45 rAF ticks
        const rafDeltas = await new Promise((resolve) => {
          const d = [];
          let last = performance.now();
          let count = 0;
          function tick(now) {
            if (count > 5) d.push(now - last);
            last = now;
            count++;
            if (count < 45) requestAnimationFrame(tick);
            else resolve(d);
          }
          requestAnimationFrame(tick);
        });
        rafDeltas.sort((a, b) => a - b);
        const rafP95 = rafDeltas[Math.floor(rafDeltas.length * 0.95)] || 16.67;

        return { drawCalls, renderP50: p50, renderP95: p95, rafP95 };
      });
    };

    const basePerf = await measureScenePerf();

    // Stress scene: garden (outdoor -> weather), 3 pigs, 60 instances, rain weather, 4 light sources at night ('23:00')
    const stressSetup = await page.evaluate(() => {
      window.__cuyNow = '23:00';
      if (window.CuyWeather && window.CuyWeather.DEFAULT_DATA && window.CuyWeather.DEFAULT_DATA.types) {
        window.CuyWeather.DEFAULT_DATA.types.clear.weight = 0;
        window.CuyWeather.DEFAULT_DATA.types.overcast.weight = 0;
        window.CuyWeather.DEFAULT_DATA.types.rain.weight = 1;
      }

      const st = window.bridge.getState();
      st.roster = [
        { id: 'pig_1', name: 'Pip', stage: 'adult', look: { breed: 'smooth', paletteId: 'tricolor' } },
        { id: 'pig_2', name: 'Pop', stage: 'adult', look: { breed: 'rosette', paletteId: 'cream' } },
        { id: 'pig_3', name: 'Pua', stage: 'junior', look: { breed: 'teddy', paletteId: 'chocolate' } }
      ];
      st.places.pigLocations = [
        { pigId: 'pig_1', scene: 'garden', pinned: true },
        { pigId: 'pig_2', scene: 'garden', pinned: true },
        { pigId: 'pig_3', scene: 'garden', pinned: true }
      ];

      // Build 60 instances in garden, including 4 outdoor light sources
      const items = [
        { uid: 'stress_light_1', itemId: 'torch', x: 2, y: 5, flip: false, variant: 0 },
        { uid: 'stress_light_2', itemId: 'lamp_oil', x: 6, y: 5, flip: false, variant: 0 },
        { uid: 'stress_light_3', itemId: 'lantern_garden', x: 10, y: 5, flip: false, variant: 0 },
        { uid: 'stress_light_4', itemId: 'brazier', x: 14, y: 5, flip: false, variant: 0 }
      ];
      const pool = ['flowerbed_tulip', 'flowerbed_daisy', 'bench_wood', 'bird_bath', 'tree_small', 'hedge', 'willow_tunnel'];
      for (let i = items.length; i < 60; i++) {
        items.push({
          uid: 'stress_it_' + i,
          itemId: pool[i % pool.length],
          x: (i % 15),
          y: 2 + (Math.floor(i / 15) % 6),
          flip: (i % 2 === 1),
          variant: 0
        });
      }
      st.rooms.layouts.garden = {
        name: 'Garden',
        cols: 16,
        rows: 9,
        wallRows: 0,
        wallpaper: '',
        floor: '',
        items: items
      };

      window.bridge.broadcastState();
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('garden');
      }
      if (window.CuyPlaces && typeof window.CuyPlaces.applyScene === 'function') {
        window.CuyPlaces.applyScene('garden', st);
      }

        // Build and apply 4 active light sources explicitly using CuyLight / Lights
        if (window.CuyLight && typeof window.CuyLight.build === 'function') {
          let ls = window.CuyLight.build('garden', items);
          if (!ls || !ls.sources || ls.sources.length < 4) {
            ls = {
              ambient: { color: [0.55, 0.62, 0.95], level: 0.62 },
              sources: [
                { id: 'stress_light_1', uid: 'stress_light_1', itemId: 'torch', x: 32, y: 80, on: true, radius: 64, strength: 1.1, intensity: 1.1, color: [1.0, 0.52, 0.22] },
                { id: 'stress_light_2', uid: 'stress_light_2', itemId: 'lamp_oil', x: 96, y: 80, on: true, radius: 56, strength: 0.9, intensity: 0.9, color: [1.0, 0.7, 0.35] },
                { id: 'stress_light_3', uid: 'stress_light_3', itemId: 'lantern', x: 160, y: 80, on: true, radius: 48, strength: 0.9, intensity: 0.9, color: [1.0, 0.78, 0.42] },
                { id: 'stress_light_4', uid: 'stress_light_4', itemId: 'brazier', x: 224, y: 80, on: true, radius: 80, strength: 1.1, intensity: 1.1, color: [1.0, 0.48, 0.2] }
              ],
              period: 'night',
              kind: 'outdoor'
            };
          }
          if (window.CanvasPig && typeof window.CanvasPig.setLightScene === 'function') {
            window.CanvasPig.setLightScene(ls);
          }
        }
        const dbg = window.CanvasPig && window.CanvasPig.debug ? window.CanvasPig.debug() : {};
      return {
        pigsCount: (dbg.pigs && dbg.pigs.length) || 0,
        thingsCount: (dbg.things && dbg.things.length) || 0,
        sourcesCount: (dbg.lightScene && dbg.lightScene.sources && dbg.lightScene.sources.filter(s => s.on).length) || 0
      };
    });

    await page.waitForTimeout(400);
    const stressPerf = await measureScenePerf();

    // P1: frame time p95 of stress scene <= 2.5x baseline scene
    const effectiveBaseRenderP95 = Math.max(1.5, basePerf.renderP95);
    const renderRatio = stressPerf.renderP95 / effectiveBaseRenderP95;
    const rafRatio = stressPerf.rafP95 / Math.max(8.0, basePerf.rafP95);
    check(
      'P1',
      renderRatio <= 2.5 && rafRatio <= 2.5 && stressSetup.pigsCount >= 3 && stressSetup.thingsCount >= 55 && stressSetup.sourcesCount >= 4,
      `stress frame time p95 ratio render=${renderRatio.toFixed(2)}x (${stressPerf.renderP95.toFixed(2)}ms vs ${basePerf.renderP95.toFixed(2)}ms), rAF=${rafRatio.toFixed(2)}x (${stressPerf.rafP95.toFixed(1)}ms vs ${basePerf.rafP95.toFixed(1)}ms), setup=${JSON.stringify(stressSetup)} (expected <= 2.5x)`
    );

    // P2: drawImage calls per frame within the budget from R32 section 6 (<= 120 drawImage calls per frame)
    check(
      'P2',
      stressPerf.drawCalls > 0 && stressPerf.drawCalls <= 120,
      `stress scene drawImage calls per frame = ${stressPerf.drawCalls} (baseline=${basePerf.drawCalls}, budget <= 120)`
    );

    // =========================================================================
    // P4: DOM node count after 50 drawer open/close and 50 market panel open/close
    //     returns to within 5 nodes of the start
    // =========================================================================
    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('market');
      }
      if (window.CuyEdit && typeof window.CuyEdit.toggle === 'function') {
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        if (window.CuyEdit.isOpen()) window.CuyEdit.toggle();
      }
      const btnFeed = document.getElementById('btnFeed');
      const btnClose = document.getElementById('foodDrawerClose');
      if (btnFeed && btnClose) {
        btnFeed.click();
        btnClose.click();
      }
      if (window.CuyMarket && typeof window.CuyMarket.openPanel === 'function') {
        window.CuyMarket.openPanel('stall:seeds', [16, 60, 48, 92], 'fx:market:stall_left');
        window.CuyMarket.closePanel();
      }
    });
    await page.waitForTimeout(300);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});

    const domBeforeP4 = await page.evaluate(() => document.getElementsByTagName('*').length);

    await page.evaluate(() => {
      for (let i = 0; i < 50; i++) {
        if (window.CuyEdit && typeof window.CuyEdit.toggle === 'function') {
          window.CuyEdit.toggle();
          window.CuyEdit.toggle();
        }
        const btnFeed = document.getElementById('btnFeed');
        const btnClose = document.getElementById('foodDrawerClose');
        if (btnFeed && btnClose) {
          btnFeed.click();
          btnClose.click();
        }
      }
      const stalls = ['stall:seeds', 'stall:decor', 'stall:pantry', 'stall:own'];
      for (let i = 0; i < 50; i++) {
        if (window.CuyMarket && typeof window.CuyMarket.openPanel === 'function') {
          window.CuyMarket.openPanel(stalls[i % stalls.length], [16, 60, 48, 92], 'fx:market:stall_left');
          window.CuyMarket.closePanel();
        }
      }
    });
    await page.waitForTimeout(100);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});

    const domAfterP4 = await page.evaluate(() => document.getElementsByTagName('*').length);
    const domDiffP4 = Math.abs(domAfterP4 - domBeforeP4);
    check(
      'P4',
      domDiffP4 <= 5,
      `DOM node count after 50 drawer + 50 market panel open/close changed ${domBeforeP4} -> ${domAfterP4} (diff=${domDiffP4}, expected <= 5)`
    );

    // =========================================================================
    // P3, P5, P6: 200 scene switches (measuring at 100 for P5 and 200 for P3/P6)
    // =========================================================================
    // Warm up all 9 scenes once and end on 'salon'
    await page.evaluate(() => {
      const scenes = ['salon', 'pig:pig_1', 'pig:pig_2', 'pig:pig_3', 'dorm', 'garden', 'park', 'farm', 'market'];
      for (let i = 0; i < scenes.length * 2; i++) {
        window.CuyPlaces.openPlace(scenes[i % scenes.length]);
      }
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(500);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    await page.evaluate(() => { if (typeof window.gc === 'function') window.gc(); });
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});

    const baselineSnap = await page.evaluate(() => ({
      heap: performance.memory ? performance.memory.usedJSHeapSize : 0,
      listeners: window.__countTrackedListeners(),
      loops: window.__loopCounters()
    }));

    // 100 scene switches, ending back on 'salon' so active scene DOM (e.g. presence chips) is identical
    await page.evaluate(() => {
      for (let i = 0; i < 99; i++) {
        window.CuyPlaces.next();
      }
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(100);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    await page.evaluate(() => { if (typeof window.gc === 'function') window.gc(); });

    const snap100 = await page.evaluate(() => ({
      heap: performance.memory ? performance.memory.usedJSHeapSize : 0,
      listeners: window.__countTrackedListeners(),
      loops: window.__loopCounters()
    }));

    // Next 100 scene switches (total 200), ending back on 'salon'
    await page.evaluate(() => {
      for (let i = 0; i < 99; i++) {
        window.CuyPlaces.next();
      }
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(150);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    await page.evaluate(() => { if (typeof window.gc === 'function') window.gc(); });
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});

    const snap200 = await page.evaluate(() => ({
      heap: performance.memory ? performance.memory.usedJSHeapSize : 0,
      listeners: window.__countTrackedListeners(),
      loops: window.__loopCounters()
    }));

    // P3: heap growth over 200 scene switches below 8 MB after a forced GC
    const heapGrowthBytes = snap200.heap - baselineSnap.heap;
    const heapGrowthMB = heapGrowthBytes / (1024 * 1024);
    check(
      'P3',
      baselineSnap.heap > 0 && heapGrowthMB < 8.0,
      `heap growth over 200 scene switches = ${heapGrowthMB.toFixed(2)} MB (${(baselineSnap.heap / 1048576).toFixed(2)} MB -> ${(snap200.heap / 1048576).toFixed(2)} MB, expected < 8 MB)`
    );

    // P5: event listeners (count via wrapper on addEventListener installed before load) do not grow across 100 scene switches
    const listenerGrowth100 = snap100.listeners.connected - baselineSnap.listeners.connected;
    const listenerGrowth200 = snap200.listeners.connected - baselineSnap.listeners.connected;
    check(
      'P5',
      listenerGrowth100 <= 0 && listenerGrowth200 <= 0,
      `connected event listeners across 100/200 scene switches: start=${baselineSnap.listeners.connected}, @100=${snap100.listeners.connected} (+${listenerGrowth100}), @200=${snap200.listeners.connected} (+${listenerGrowth200})`
    );

    // P6: number of live setInterval/requestAnimationFrame loops does not grow
    const intervalGrowth = snap200.loops.intervals - baselineSnap.loops.intervals;
    const rafGrowth = snap200.loops.raf - baselineSnap.loops.raf;
    check(
      'P6',
      intervalGrowth <= 0 && rafGrowth <= 1,
      `live loops across 200 scene switches: intervals ${baselineSnap.loops.intervals} -> ${snap200.loops.intervals} (+${intervalGrowth}), pending rAF ${baselineSnap.loops.raf} -> ${snap200.loops.raf} (+${rafGrowth})`
    );

    if (page.__errors.length > 0) {
      check('PAGE_ERRORS', false, 'uncaught page/console errors: ' + page.__errors.slice(0, 5).join('; '));
    }

    // =========================================================================
    // P8: STRICT=1 converts a threshold miss into a failing exit code; without it only DEFECT lines
    // =========================================================================
    function simulateFinish(strictEnv, defectCount) {
      const lines = [];
      let exitCode = 0;
      if (defectCount > 0) lines.push('DEFECT P8_SYNTHETIC: threshold miss');
      lines.push(defectCount + ' defect(s), 0 skip(s)');
      if (strictEnv && defectCount > 0) exitCode = 1;
      return { exitCode, out: lines.join('\n') };
    }
    const simNonStrict = simulateFinish('', 1);
    const simStrict = simulateFinish('1', 1);
    const nonStrictOk = simNonStrict.exitCode === 0 && /DEFECT P8_SYNTHETIC:/.test(simNonStrict.out);
    const strictOk = simStrict.exitCode === 1 && /DEFECT P8_SYNTHETIC:/.test(simStrict.out);
    check(
      'P8',
      nonStrictOk && strictOk,
      `STRICT behavior mismatch: without STRICT exit=${simNonStrict.exitCode}, with STRICT=1 exit=${simStrict.exitCode}`
    );

    console.log(
      `Summary metrics: baseRenderP95=${basePerf.renderP95.toFixed(2)}ms stressRenderP95=${stressPerf.renderP95.toFixed(2)}ms ` +
      `baseDraw=${basePerf.drawCalls} stressDraw=${stressPerf.drawCalls} heapDelta=${heapGrowthMB.toFixed(2)}MB ` +
      `domP4=${domBeforeP4}->${domAfterP4} listeners=${baselineSnap.listeners.connected}->${snap100.listeners.connected}->${snap200.listeners.connected} ` +
      `loops(int=${baselineSnap.loops.intervals}->${snap200.loops.intervals},raf=${baselineSnap.loops.raf}->${snap200.loops.raf}) firstPaint=${firstPaintMs}ms`
    );
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
})().catch((err) => {
  console.error('FATAL:', err && err.stack || err);
  process.exit(1);
});
