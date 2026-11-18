'use strict';
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  let hasFailures = false;

  const testCase = async (id, name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log(`PASS ${id} ${name}`);
    } catch (err) {
      hasFailures = true;
      console.log(`FAIL ${id} ${name}: ${err.message}`);
    }
  };

  console.log('STUB onHotspot');

  await page.evaluate(() => {
    window.__testSent = [];
    const origSend = window.bridge && window.bridge.send ? window.bridge.send.bind(window.bridge) : null;
    if (window.bridge) {
      window.bridge.send = function (msg) {
        window.__testSent.push(msg);
        if (origSend) return origSend(msg);
      };
    }

    window.__hotspotHandlers = [];
    window.__layers = {};
    window.__mockHotspots = [
      { id: 'plot:0', uid: 'fx:farm:plot:0', kind: 'plot', rect: [20, 80, 52, 112], label: 'Plot 1' },
      { id: 'plot:1', uid: 'fx:farm:plot:1', kind: 'plot', rect: [60, 80, 92, 112], label: 'Plot 2' },
      { id: 'plot:2', uid: 'fx:farm:plot:2', kind: 'plot', rect: [100, 80, 132, 112], label: 'Plot 3' },
      { id: 'plot:3', uid: 'fx:farm:plot:3', kind: 'plot', rect: [140, 80, 172, 112], label: 'Plot 4' },
      { id: 'orchard', kind: 'orchard', rect: [12, 24, 96, 62], label: 'Orchard' },
      { id: 'shop', kind: 'shop', rect: [170, 32, 242, 76], label: 'Farm shop' }
    ];

    window.CanvasPig = window.CanvasPig || {};
    window.CanvasPig.onHotspot = function (fn) {
      if (typeof fn === 'function' && window.__hotspotHandlers.indexOf(fn) === -1) {
        window.__hotspotHandlers.push(fn);
      }
    };
    window.CanvasPig.getHotspots = function () {
      return window.__mockHotspots;
    };
    window.CanvasPig.addLayer = function (name, z, drawFn) {
      window.__layers[name] = { name, z, drawFn };
    };
    window.__fireHotspot = function (hs) {
      window.__hotspotHandlers.forEach((h) => h(hs));
    };

    const st = window.bridge.currentState || window.bridge.getState();
    st.clovers = 1000;
    st.places = {
      places: [
        { id: 'house', name: 'House', unlocked: true, level: 1 },
        { id: 'garden', name: 'Garden', unlocked: true, unlockCost: 400 },
        { id: 'park', name: 'Park', unlocked: true, unlockCost: 1200 },
        { id: 'farm', name: 'Farm', unlocked: true, unlockCost: 600 },
        { id: 'market', name: 'Market', unlocked: true, level: 1 }
      ]
    };
    st.farmMock = {
      plotsOwned: 4,
      plots: [
        { cropId: null, plantedAt: 0, readyAt: 0, watered: false },
        { cropId: 'parsley', plantedAt: Date.now() - 10000, readyAt: Date.now() + 30000, watered: false },
        { cropId: 'parsley', plantedAt: Date.now() - 50000, readyAt: Date.now() - 1000, watered: false },
        { cropId: 'parsley', plantedAt: Date.now() - 15000, readyAt: Date.now() + 25000, watered: true }
      ],
      orchardSlots: 2,
      orchard: [
        { cropId: null, plantedAt: 0, stock: 0, nextAt: 0 },
        { cropId: 'apple', plantedAt: Date.now() - 120000, stock: 2, nextAt: Date.now() + 45000 }
      ],
      canLevel: 1,
      sprinkler: false,
      packCount: 0,
      harvests: 2
    };
    if (!st.inventory) st.inventory = {};
    st.inventory.seed_parsley = 3;
    st.inventory.sapling_apple = 1;
    st.farm = {
      unlocked: true,
      plots: [
        { index: 0, cropId: null, state: 'empty', watered: false, secondsLeft: 0, yield: 0 },
        { index: 1, cropId: 'parsley', state: 'growing', watered: false, secondsLeft: 30, yield: 2 },
        { index: 2, cropId: 'parsley', state: 'ripe', watered: false, secondsLeft: 0, yield: 2 },
        { index: 3, cropId: 'parsley', state: 'growing', watered: true, secondsLeft: 25, yield: 2 }
      ],
      orchard: [
        { slot: 0, cropId: null, stock: 0, secondsToNext: 0 },
        { slot: 1, cropId: 'apple', stock: 2, secondsToNext: 45 }
      ],
      crops: [
        { id: 'parsley', name: 'Parsley', icon: 'icon-crop-parsley', kind: 'vegetable', unlocked: true, seedItem: 'seed_parsley', seedOwned: 3, growMinutes: 0.7, yield: 2, sellPrice: 6, unlockHarvests: 0 },
        { id: 'carrot', name: 'Carrot', icon: 'icon-crop-carrot', kind: 'vegetable', unlocked: false, seedItem: 'seed_carrot', seedOwned: 0, growMinutes: 1, yield: 3, sellPrice: 9, unlockHarvests: 5 }
      ],
      tools: { canId: 'can_1', plotsPerWater: 1, sprinkler: false },
      upgrades: { nextPackCost: 150, nextOrchardCost: 200, nextCanCost: 120, sprinklerCost: 500 },
      harvests: 2
    };

    if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
      window.CuyPlaces.setCurrentPlace('farm');
    }
    if (window.bridge && typeof window.bridge.broadcastState === 'function') {
      window.bridge.broadcastState();
    }
  });
  await page.waitForTimeout(150);

  await testCase('F1', 'empty-plot-menu-plants', async () => {
    await page.evaluate(() => {
      window.__testSent = [];
      window.__fireHotspot({ id: 'plot:0', uid: 'fx:farm:plot:0', kind: 'plot', rect: [20, 80, 52, 112] });
    });
    await page.waitForSelector('.farm-scene-panel [data-plant="parsley"]', { timeout: 2000 });
    await page.click('.farm-scene-panel [data-plant="parsley"]');
    const sent = await page.evaluate(() => window.__testSent.slice());
    const plantMsg = sent.find((m) => m && m.type === 'farm_plant');
    if (!plantMsg || plantMsg.plot !== 0 || plantMsg.cropId !== 'parsley') {
      throw new Error('Expected farm_plant {plot:0, cropId:parsley}, got: ' + JSON.stringify(sent));
    }
  });

  await testCase('F2', 'dry-plot-click-waters', async () => {
    await page.evaluate(() => {
      window.__testSent = [];
      window.__fireHotspot({ id: 'plot:1', uid: 'fx:farm:plot:1', kind: 'plot', rect: [60, 80, 92, 112] });
    });
    const sent = await page.evaluate(() => window.__testSent.slice());
    const waterMsg = sent.find((m) => m && m.type === 'farm_water');
    if (!waterMsg || waterMsg.plot !== 1) {
      throw new Error('Expected farm_water {plot:1}, got: ' + JSON.stringify(sent));
    }
  });

  await testCase('F3', 'ready-plot-click-harvests', async () => {
    await page.evaluate(() => {
      window.__testSent = [];
      window.__fireHotspot({ id: 'plot:2', uid: 'fx:farm:plot:2', kind: 'plot', rect: [100, 80, 132, 112] });
    });
    const sent = await page.evaluate(() => window.__testSent.slice());
    const harvestMsg = sent.find((m) => m && m.type === 'farm_harvest');
    if (!harvestMsg || harvestMsg.plot !== 2) {
      throw new Error('Expected farm_harvest {plot:2}, got: ' + JSON.stringify(sent));
    }
  });

  await testCase('F4', 'growing-tooltip', async () => {
    await page.evaluate(() => {
      window.__fireHotspot({ id: 'plot:3', uid: 'fx:farm:plot:3', kind: 'plot', rect: [140, 80, 172, 112] });
    });
    await page.waitForSelector('.farm-scene-tooltip', { timeout: 2000 });
    const text = await page.textContent('.farm-scene-tooltip');
    if (!text || !/\d+:\d{2}/.test(text)) {
      throw new Error('Expected countdown time in tooltip, got: ' + JSON.stringify(text));
    }
  });

  await testCase('F5', 'markers-follow-state', async () => {
    const res = await page.evaluate(() => {
      const layer = window.__layers && window.__layers.farm_markers;
      if (!layer || typeof layer.drawFn !== 'function' || layer.z !== 60) {
        return { ok: false, reason: 'farm_markers layer (z=60) not registered: ' + JSON.stringify(Object.keys(window.__layers || {})) };
      }
      // Reset farmMock to exact 4 plots (empty, dry growing, ripe, watered growing)
      const st = window.bridge.currentState || window.bridge.getState();
      st.farmMock.plots = [
        { cropId: null, plantedAt: 0, readyAt: 0, watered: false },
        { cropId: 'parsley', plantedAt: Date.now() - 10000, readyAt: Date.now() + 30000, watered: false },
        { cropId: 'parsley', plantedAt: Date.now() - 50000, readyAt: Date.now() - 1000, watered: false },
        { cropId: 'parsley', plantedAt: Date.now() - 15000, readyAt: Date.now() + 25000, watered: true }
      ];
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }

      const draws = [];
      const mockCtx = {
        fillStyle: '',
        imageSmoothingEnabled: true,
        save() {},
        restore() {},
        fillRect(x, y, w, h) { draws.push({ op: 'fillRect', x, y, w, h }); },
        drawImage() {
          const args = Array.from(arguments);
          const dx = args.length >= 9 ? args[5] : args[1];
          const dy = args.length >= 9 ? args[6] : args[2];
          draws.push({ op: 'drawImage', x: dx, y: dy });
        }
      };

      layer.drawFn(mockCtx, { id: 'farm', size: [256, 144] });
      const salonDraws = [];
      const salonCtx = {
        ...mockCtx,
        fillRect(x, y, w, h) { salonDraws.push({ op: 'fillRect', x, y, w, h }); },
        drawImage() { salonDraws.push({ op: 'drawImage' }); }
      };
      layer.drawFn(salonCtx, { id: 'salon', size: [256, 144] });

      const inPlot = (rect) => draws.filter((d) => d.x >= rect[0] - 8 && d.x <= rect[2] + 8);
      return {
        ok: true,
        p0: inPlot([20, 80, 52, 112]).length,
        p1: inPlot([60, 80, 92, 112]).length,
        p2: inPlot([100, 80, 132, 112]).length,
        p3: inPlot([140, 80, 172, 112]).length,
        salonCount: salonDraws.length
      };
    });
    if (!res.ok) throw new Error(res.reason);
    if (res.p0 !== 0 || res.p1 === 0 || res.p2 === 0 || res.p3 !== 0 || res.salonCount !== 0) {
      throw new Error('Unexpected marker counts: ' + JSON.stringify(res));
    }
  });

  await testCase('F6', 'harvest-all-and-water-all', async () => {
    const visibleOnFarm = await page.isVisible('#farmSceneStrip');
    if (!visibleOnFarm) throw new Error('#farmSceneStrip not visible on farm');
    await page.evaluate(() => { window.__testSent = []; });
    await page.click('#farmSceneStrip [data-scene-harvest-all]');
    await page.click('#farmSceneStrip [data-scene-water-all]');
    const sent = await page.evaluate(() => window.__testSent.slice());
    if (!sent.some((m) => m && m.type === 'farm_harvest_all')) {
      throw new Error('Expected farm_harvest_all, got: ' + JSON.stringify(sent));
    }
    if (!sent.some((m) => m && m.type === 'farm_water')) {
      throw new Error('Expected farm_water from water all, got: ' + JSON.stringify(sent));
    }
    await page.evaluate(() => {
      if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
        window.CuyPlaces.setCurrentPlace('salon');
      }
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    });
    await page.waitForTimeout(100);
    const visibleOnSalon = await page.isVisible('#farmSceneStrip');
    if (visibleOnSalon) throw new Error('#farmSceneStrip should be hidden outside farm');
    await page.evaluate(() => {
      if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
        window.CuyPlaces.setCurrentPlace('farm');
      }
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    });
    await page.waitForTimeout(100);
  });

  await testCase('F7', 'orchard-slot-actions', async () => {
    await page.evaluate(() => {
      window.__testSent = [];
      window.__fireHotspot({ id: 'orchard', kind: 'orchard', rect: [12, 24, 96, 62] });
    });
    await page.waitForSelector('.farm-scene-panel [data-orchard-plant="0"]', { timeout: 2000 });
    await page.click('.farm-scene-panel [data-orchard-plant="0"]');
    await page.click('.farm-scene-panel [data-orchard-harvest="1"]');
    const sent = await page.evaluate(() => window.__testSent.slice());
    if (!sent.some((m) => m && m.type === 'orchard_plant' && m.slot === 0)) {
      throw new Error('Expected orchard_plant slot 0, got: ' + JSON.stringify(sent));
    }
    if (!sent.some((m) => m && m.type === 'orchard_harvest' && m.slot === 1)) {
      throw new Error('Expected orchard_harvest slot 1, got: ' + JSON.stringify(sent));
    }
  });

  await testCase('F8', 'shop-buy', async () => {
    await page.evaluate(() => {
      window.__testSent = [];
      window.__fireHotspot({ id: 'shop', kind: 'shop', rect: [170, 32, 242, 76] });
    });
    await page.waitForSelector('.farm-scene-panel [data-buy="pack"]', { timeout: 2000 });
    await page.click('.farm-scene-panel [data-buy="pack"]');
    const sent = await page.evaluate(() => window.__testSent.slice());
    if (!sent.some((m) => m && m.type === 'farm_buy' && m.what === 'pack')) {
      throw new Error('Expected farm_buy {what:pack}, got: ' + JSON.stringify(sent));
    }
  });

  await testCase('F9', 'panels-inside-window', async () => {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.farmMock.plots[0] = { cropId: null, plantedAt: 0, readyAt: 0, watered: false };
      st.farmMock.plots[3] = { cropId: 'parsley', plantedAt: Date.now() - 15000, readyAt: Date.now() + 25000, watered: true };
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    });
    const cases = [
      { id: 'plot:0', uid: 'fx:farm:plot:0', kind: 'plot', rect: [220, 110, 254, 142] },
      { id: 'plot:3', uid: 'fx:farm:plot:3', kind: 'plot', rect: [220, 115, 254, 142] },
      { id: 'orchard', kind: 'orchard', rect: [210, 100, 254, 140] },
      { id: 'shop', kind: 'shop', rect: [200, 105, 254, 140] }
    ];
    for (const hs of cases) {
      const box = await page.evaluate((h) => {
        window.__fireHotspot(h);
        const el = document.querySelector('.farm-scene-panel, .farm-scene-tooltip');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          vw: window.innerWidth,
          vh: window.innerHeight
        };
      }, hs);
      if (!box) throw new Error('Panel did not open for ' + hs.id);
      if (box.left < 0 || box.top < 0 || box.right > box.vw || box.bottom > box.vh) {
        throw new Error(`Panel out of window for ${hs.id}: ${JSON.stringify(box)}`);
      }
    }
  });

  await browser.close();
  server.close();
  if (hasFailures) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
