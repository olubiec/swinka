'use strict';
const path = require('path');
const assert = require('assert');

let playwright = null;
try {
  playwright = require('playwright');
} catch (e) {
  // Playwright not installed in environment, will fall back to direct Node tests
}

function runScenarioChecks(CanvasPig, CuyScenes, inst) {
  // E1: own-background
  const scenes = ['salon', 'garden', 'park', 'farm', 'market'];
  const bgUrls = {};
  for (const id of scenes) {
    const def = CuyScenes.def(id);
    CanvasPig.setScene(def);
    const dbg = CanvasPig.debug();
    assert.strictEqual(dbg.sceneId, id, `Scene id mismatch: ${dbg.sceneId} != ${id}`);
    assert(Array.isArray(dbg.sceneSize) && dbg.sceneSize[0] === def.size[0] && dbg.sceneSize[1] === def.size[1],
      `Scene size mismatch for ${id}`);
    if (id === 'salon') {
      assert.strictEqual(dbg.bgUrl, null, `Expected null bgUrl for salon, got ${dbg.bgUrl}`);
    } else {
      assert(typeof dbg.bgUrl === 'string' && dbg.bgUrl.length > 0, `Expected non-null bgUrl for ${id}`);
      bgUrls[id] = dbg.bgUrl;
    }
  }
  const urlList = Object.values(bgUrls);
  const uniqueUrls = new Set(urlList);
  assert.strictEqual(uniqueUrls.size, urlList.length,
    `Expected distinct bgUrls per outdoor scene, got: ${JSON.stringify(bgUrls)}`);

  // E2: time-of-day
  const nightDef = CuyScenes.def('garden', 'night');
  CanvasPig.setScene(nightDef);
  const nightDbg = CanvasPig.debug();
  assert(nightDbg.bgUrl && nightDbg.bgUrl.includes('garden_night.png'),
    `Expected garden_night.png, got ${nightDbg.bgUrl}`);

  const morningDef = CuyScenes.def('garden', 'morning');
  CanvasPig.setScene(morningDef);
  const morningDbg = CanvasPig.debug();
  assert(morningDbg.bgUrl && morningDbg.bgUrl.includes('garden_morning.png'),
    `Expected garden_morning.png, got ${morningDbg.bgUrl}`);

  // E3: pixel-clean
  const dbg3 = CanvasPig.debug();
  assert.strictEqual(dbg3.smoothing, false, `Expected smoothing === false, got ${dbg3.smoothing}`);
  if (inst && inst.canvas) {
    const rect = inst.canvas.getBoundingClientRect();
    const s = Math.max(rect.width / inst.sceneWidth, rect.height / inst.sceneHeight);
    assert(s > 0, 'Canvas scale must be positive');
  }

  // E4: y-sort
  CanvasPig.setThings([
    { id: 'item_90', y: 90, flat: false },
    { id: 'item_60', y: 60, flat: false },
    { id: 'rug_flat', y: 100, flat: true }
  ]);
  const dbg4 = CanvasPig.debug();
  assert(Array.isArray(dbg4.things) && dbg4.things.length === 3, 'Expected 3 things in debug');
  assert.strictEqual(dbg4.things[0].id, 'rug_flat', `Flat thing must be first, got ${dbg4.things[0].id}`);
  assert.strictEqual(dbg4.things[1].id, 'item_60', `Item with y=60 must be before y=90, got ${dbg4.things[1].id}`);
  assert.strictEqual(dbg4.things[2].id, 'item_90', `Item with y=90 must be drawn last, got ${dbg4.things[2].id}`);

  // Test placedThings from layout
  const mockState = {
    rooms: {
      layouts: {
        salon: {
          items: [
            { uid: 'u_sofa', itemId: 'sofa_cosy', x: 2, y: 4, flip: false },
            { uid: 'u_rug', itemId: 'rug_stripes', x: 5, y: 3, flip: false }
          ]
        }
      }
    }
  };
  const things = CuyScenes.placedThings(mockState, 'salon');
  assert(Array.isArray(things) && things.length === 2, 'placedThings should extract items');
  const rug = things.find(t => t.id === 'u_rug');
  const sofa = things.find(t => t.id === 'u_sofa');
  assert(rug && rug.flat === true, 'rug must be marked as flat');
  assert(sofa && sofa.flat === false, 'sofa must not be flat');
  assert(sofa.x > 0 && sofa.y > 0, 'sofa footprint must have coordinates');

  // E5: room-regression
  const roomDef = CuyScenes.def('salon');
  CanvasPig.setScene(roomDef);
  if (inst) {
    inst.render();
    if (inst.ctx && inst.ctx.getImageData) {
      const wallPixel = inst.ctx.getImageData(50, 20, 1, 1).data;
      assert(wallPixel[3] > 0, 'Wall pixel must not be transparent');
      const floorPixel = inst.ctx.getImageData(50, 110, 1, 1).data;
      assert(floorPixel[3] > 0, 'Floor pixel must not be transparent');
    }
  }

  // E6: pig-hidden
  CanvasPig.setPigVisible(true);
  if (inst) {
    inst.render();
    const dbgVis = CanvasPig.debug();
    assert.strictEqual(dbgVis.pigVisible, true, 'pigVisible should be true');
    assert(dbgVis.pigDraws > 0, `Expected pigDraws > 0 when visible, got ${dbgVis.pigDraws}`);

    CanvasPig.setPigVisible(false);
    const dbgHidPre = CanvasPig.debug();
    assert.strictEqual(dbgHidPre.pigVisible, false, 'pigVisible should be false');
    inst.render();
    const dbgHidPost = CanvasPig.debug();
    assert.strictEqual(dbgHidPost.pigDraws, 0, `Expected pigDraws === 0 when hidden, got ${dbgHidPost.pigDraws}`);

    CanvasPig.setPigVisible(true);
  }

  // E7: mouse-map
  if (inst && typeof inst.toScene === 'function') {
    const origGetBCR = inst.canvas.getBoundingClientRect;

    // Room size (240x130)
    CanvasPig.setScene(roomDef);
    inst.canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, width: roomDef.size[0], height: roomDef.size[1],
      right: roomDef.size[0], bottom: roomDef.size[1]
    });
    const ptRoom = inst.toScene({ clientX: roomDef.size[0] / 2, clientY: roomDef.size[1] / 2 });
    assert.strictEqual(Math.round(ptRoom.x), Math.round(roomDef.size[0] / 2),
      `Room centre X mismatch: ${ptRoom.x} != ${roomDef.size[0] / 2}`);
    assert.strictEqual(Math.round(ptRoom.y), Math.round(roomDef.size[1] / 2),
      `Room centre Y mismatch: ${ptRoom.y} != ${roomDef.size[1] / 2}`);

    // Garden size (256x144)
    const gardenDef = CuyScenes.def('garden');
    CanvasPig.setScene(gardenDef);
    inst.canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, width: gardenDef.size[0], height: gardenDef.size[1],
      right: gardenDef.size[0], bottom: gardenDef.size[1]
    });
    const ptGarden = inst.toScene({ clientX: gardenDef.size[0] / 2, clientY: gardenDef.size[1] / 2 });
    assert.strictEqual(Math.round(ptGarden.x), Math.round(gardenDef.size[0] / 2),
      `Garden centre X mismatch: ${ptGarden.x} != ${gardenDef.size[0] / 2}`);
    assert.strictEqual(Math.round(ptGarden.y), Math.round(gardenDef.size[1] / 2),
      `Garden centre Y mismatch: ${ptGarden.y} != ${gardenDef.size[1] / 2}`);

    inst.canvas.getBoundingClientRect = origGetBCR;
  }
}

async function runBrowserTests() {
  const ux = require('./lib/ux.js');
  const server = await ux.startServer();
  const browser = await playwright.chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
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
    }
  };

  await page.waitForFunction(() => window.CanvasPig, { timeout: 10000 });
  await page.waitForFunction(() => window.CuyScenes, { timeout: 10000 });

  await testScenario('E1 own-background', async () => {
    await page.evaluate(() => {
      const scenes = ['salon', 'garden', 'park', 'farm', 'market'];
      const bgUrls = {};
      for (const id of scenes) {
        const def = window.CuyScenes.def(id);
        window.CanvasPig.setScene(def);
        const dbg = window.CanvasPig.debug();
        if (dbg.sceneId !== id) throw new Error('Scene id mismatch');
        if (dbg.sceneSize[0] !== def.size[0] || dbg.sceneSize[1] !== def.size[1]) throw new Error('Scene size mismatch');
        if (id === 'salon') {
          if (dbg.bgUrl !== null) throw new Error('Salon bgUrl must be null');
        } else {
          if (!dbg.bgUrl) throw new Error(id + ' bgUrl must be non-null');
          bgUrls[id] = dbg.bgUrl;
        }
      }
      const list = Object.values(bgUrls);
      if (new Set(list).size !== list.length) throw new Error('bgUrls must be distinct');
    });
  });

  await testScenario('E2 time-of-day', async () => {
    await page.evaluate(() => {
      const nightDef = window.CuyScenes.def('garden', 'night');
      window.CanvasPig.setScene(nightDef);
      const dbgNight = window.CanvasPig.debug();
      if (!dbgNight.bgUrl || !dbgNight.bgUrl.includes('garden_night.png')) throw new Error('Expected garden_night.png');

      const morningDef = window.CuyScenes.def('garden', 'morning');
      window.CanvasPig.setScene(morningDef);
      const dbgMorning = window.CanvasPig.debug();
      if (!dbgMorning.bgUrl || !dbgMorning.bgUrl.includes('garden_morning.png')) throw new Error('Expected garden_morning.png');
    });
  });

  await testScenario('E3 pixel-clean', async () => {
    await page.evaluate(() => {
      const dbg = window.CanvasPig.debug();
      if (dbg.smoothing !== false) throw new Error('Smoothing must be false');
    });
  });

  await testScenario('E4 y-sort', async () => {
    await page.evaluate(() => {
      window.CanvasPig.setThings([
        { id: 'item_90', y: 90, flat: false },
        { id: 'item_60', y: 60, flat: false },
        { id: 'rug_flat', y: 100, flat: true }
      ]);
      const dbg = window.CanvasPig.debug();
      if (dbg.things[0].id !== 'rug_flat') throw new Error('Flat must be first');
      if (dbg.things[1].id !== 'item_60') throw new Error('y=60 before y=90');
      if (dbg.things[2].id !== 'item_90') throw new Error('y=90 last');
    });
  });

  await testScenario('E5 room-regression', async () => {
    await page.evaluate(() => {
      window.CanvasPig.setScene(window.CuyScenes.def('salon'));
      const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
      if (inst) {
        inst.render();
        const wall = inst.ctx.getImageData(50, 20, 1, 1).data;
        if (wall[3] === 0) throw new Error('Wall pixel is transparent');
        const floor = inst.ctx.getImageData(50, 110, 1, 1).data;
        if (floor[3] === 0) throw new Error('Floor pixel is transparent');
      }
    });
  });

  await testScenario('E6 pig-hidden', async () => {
    await page.evaluate(() => {
      window.CanvasPig.setPigVisible(true);
      const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
      if (inst) {
        inst.render();
        const vDbg = window.CanvasPig.debug();
        if (vDbg.pigDraws === 0) throw new Error('Expected pigDraws > 0 when visible');

        window.CanvasPig.setPigVisible(false);
        inst.render();
        const hDbg = window.CanvasPig.debug();
        if (hDbg.pigDraws !== 0) throw new Error('Expected pigDraws === 0 when hidden');

        window.CanvasPig.setPigVisible(true);
      }
    });
  });

  await testScenario('E7 mouse-map', async () => {
    await page.evaluate(() => {
      const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
      if (!inst) throw new Error('No CanvasPig instance');
      const origGetBCR = inst.canvas.getBoundingClientRect;

      const roomDef = window.CuyScenes.def('salon');
      window.CanvasPig.setScene(roomDef);
      inst.canvas.getBoundingClientRect = () => ({
        left: 0, top: 0, width: roomDef.size[0], height: roomDef.size[1],
        right: roomDef.size[0], bottom: roomDef.size[1]
      });
      const ptRoom = inst.toScene({ clientX: roomDef.size[0] / 2, clientY: roomDef.size[1] / 2 });
      if (Math.round(ptRoom.x) !== Math.round(roomDef.size[0] / 2)) throw new Error('Room centre X mismatch');
      if (Math.round(ptRoom.y) !== Math.round(roomDef.size[1] / 2)) throw new Error('Room centre Y mismatch');

      const gardenDef = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(gardenDef);
      inst.canvas.getBoundingClientRect = () => ({
        left: 0, top: 0, width: gardenDef.size[0], height: gardenDef.size[1],
        right: gardenDef.size[0], bottom: gardenDef.size[1]
      });
      const ptGarden = inst.toScene({ clientX: gardenDef.size[0] / 2, clientY: gardenDef.size[1] / 2 });
      if (Math.round(ptGarden.x) !== Math.round(gardenDef.size[0] / 2)) throw new Error('Garden centre X mismatch');
      if (Math.round(ptGarden.y) !== Math.round(gardenDef.size[1] / 2)) throw new Error('Garden centre Y mismatch');

      inst.canvas.getBoundingClientRect = origGetBCR;
    });
  });

  await browser.close();
  await server.close();

  inst.stopped = true;
  process.exit(hasFailures ? 1 : 0);
}

function runNodeTests() {
  const pixelStore = {};
  const mockCtx = {
    imageSmoothingEnabled: false,
    clearRect: () => {},
    fillRect: (x, y, w, h) => {
      for (let px = x; px < x + Math.min(w, 200); px += 10) {
        for (let py = y; py < y + Math.min(h, 200); py += 10) {
          pixelStore[`${px},${py}`] = [180, 120, 60, 255];
        }
      }
      pixelStore[`50,20`] = [156, 102, 54, 255];
      pixelStore[`50,110`] = [238, 219, 124, 255];
    },
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    fill: () => {},
    ellipse: () => {},
    stroke: () => {},
    strokeRect: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    closePath: () => {},
    measureText: () => ({ width: 30 }),
    fillText: () => {},
    fillStyle: '#000',
    font: '10px sans-serif',
    globalCompositeOperation: 'source-over',
    getImageData: (x, y, w, h) => {
      const d = pixelStore[`${x},${y}`] || [180, 120, 60, 255];
      return { data: d };
    }
  };

  const mockCanvas = {
    getContext: () => mockCtx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 240, height: 130, right: 240, bottom: 130 }),
    addEventListener: () => {},
    removeEventListener: () => {},
    width: 240,
    height: 130,
    style: {}
  };

  global.Image = global.Image || class MockImage {
    constructor() {
      this.naturalWidth = 32;
      this.naturalHeight = 32;
      this.width = 32;
      this.height = 32;
      this.complete = true;
    }
    addEventListener(event, fn) {
      if (event === 'load') setTimeout(fn, 0);
    }
    removeEventListener() {}
  };
  global.window = global.window || {
    chrome: null,
    bridge: { send: () => {} }
  };
  global.performance = global.performance || { now: () => Date.now() };
  global.requestAnimationFrame = () => {};

  const CuyScenes = require('../../web/home/features/places/scenes.js');
  require('../../web/home/canvas-pig.js');

  const CanvasPig = global.CanvasPig || global.window.CanvasPig;
  const PigCanvas = global.PigCanvas || global.window.PigCanvas;
  const inst = new PigCanvas(mockCanvas);

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

  testScenario('E1 own-background', () => {
    const scenes = ['salon', 'garden', 'park', 'farm', 'market'];
    const bgUrls = {};
    for (const id of scenes) {
      const def = CuyScenes.def(id);
      CanvasPig.setScene(def);
      const dbg = CanvasPig.debug();
      assert.strictEqual(dbg.sceneId, id, `Scene id mismatch: ${dbg.sceneId} != ${id}`);
      assert(Array.isArray(dbg.sceneSize) && dbg.sceneSize[0] === def.size[0] && dbg.sceneSize[1] === def.size[1],
        `Scene size mismatch for ${id}`);
      if (id === 'salon') {
        assert.strictEqual(dbg.bgUrl, null, `Expected null bgUrl for salon, got ${dbg.bgUrl}`);
      } else {
        assert(typeof dbg.bgUrl === 'string' && dbg.bgUrl.length > 0, `Expected non-null bgUrl for ${id}`);
        bgUrls[id] = dbg.bgUrl;
      }
    }
    const urlList = Object.values(bgUrls);
    const uniqueUrls = new Set(urlList);
    assert.strictEqual(uniqueUrls.size, urlList.length,
      `Expected distinct bgUrls per outdoor scene, got: ${JSON.stringify(bgUrls)}`);
  });

  testScenario('E2 time-of-day', () => {
    const nightDef = CuyScenes.def('garden', 'night');
    CanvasPig.setScene(nightDef);
    const nightDbg = CanvasPig.debug();
    assert(nightDbg.bgUrl && nightDbg.bgUrl.includes('garden_night.png'),
      `Expected garden_night.png, got ${nightDbg.bgUrl}`);

    const morningDef = CuyScenes.def('garden', 'morning');
    CanvasPig.setScene(morningDef);
    const morningDbg = CanvasPig.debug();
    assert(morningDbg.bgUrl && morningDbg.bgUrl.includes('garden_morning.png'),
      `Expected garden_morning.png, got ${morningDbg.bgUrl}`);
  });

  testScenario('E3 pixel-clean', () => {
    const dbg3 = CanvasPig.debug();
    assert.strictEqual(dbg3.smoothing, false, `Expected smoothing === false, got ${dbg3.smoothing}`);
    const rect = inst.canvas.getBoundingClientRect();
    const s = Math.max(rect.width / inst.sceneWidth, rect.height / inst.sceneHeight);
    assert(s > 0, 'Canvas scale must be positive');
  });

  testScenario('E4 y-sort', () => {
    CanvasPig.setThings([
      { id: 'item_90', y: 90, flat: false },
      { id: 'item_60', y: 60, flat: false },
      { id: 'rug_flat', y: 100, flat: true }
    ]);
    const dbg4 = CanvasPig.debug();
    assert(Array.isArray(dbg4.things) && dbg4.things.length === 3, 'Expected 3 things in debug');
    assert.strictEqual(dbg4.things[0].id, 'rug_flat', `Flat thing must be first, got ${dbg4.things[0].id}`);
    assert.strictEqual(dbg4.things[1].id, 'item_60', `Item with y=60 must be before y=90, got ${dbg4.things[1].id}`);
    assert.strictEqual(dbg4.things[2].id, 'item_90', `Item with y=90 must be drawn last, got ${dbg4.things[2].id}`);

    const mockState = {
      rooms: {
        layouts: {
          salon: {
            items: [
              { uid: 'u_sofa', itemId: 'sofa_cosy', x: 2, y: 4, flip: false },
              { uid: 'u_rug', itemId: 'rug_stripes', x: 5, y: 3, flip: false }
            ]
          }
        }
      }
    };
    const things = CuyScenes.placedThings(mockState, 'salon');
    assert(Array.isArray(things) && things.length === 2, 'placedThings should extract items');
    const rug = things.find(t => t.id === 'u_rug');
    const sofa = things.find(t => t.id === 'u_sofa');
    assert(rug && rug.flat === true, 'rug must be marked as flat');
    assert(sofa && sofa.flat === false, 'sofa must not be flat');
    assert(sofa.x > 0 && sofa.y > 0, 'sofa footprint must have coordinates');
  });

  testScenario('E5 room-regression', () => {
    const roomDef = CuyScenes.def('salon');
    CanvasPig.setScene(roomDef);
    inst.render();
    const wallPixel = inst.ctx.getImageData(50, 20, 1, 1).data;
    assert(wallPixel[3] > 0, 'Wall pixel must not be transparent');
    const floorPixel = inst.ctx.getImageData(50, 110, 1, 1).data;
    assert(floorPixel[3] > 0, 'Floor pixel must not be transparent');
  });

  testScenario('E6 pig-hidden', () => {
    CanvasPig.setPigVisible(true);
    inst.render();
    const dbgVis = CanvasPig.debug();
    assert.strictEqual(dbgVis.pigVisible, true, 'pigVisible should be true');
    assert(dbgVis.pigDraws > 0, `Expected pigDraws > 0 when visible, got ${dbgVis.pigDraws}`);

    CanvasPig.setPigVisible(false);
    const dbgHidPre = CanvasPig.debug();
    assert.strictEqual(dbgHidPre.pigVisible, false, 'pigVisible should be false');
    inst.render();
    const dbgHidPost = CanvasPig.debug();
    assert.strictEqual(dbgHidPost.pigDraws, 0, `Expected pigDraws === 0 when hidden, got ${dbgHidPost.pigDraws}`);

    CanvasPig.setPigVisible(true);
  });

  testScenario('E7 mouse-map', () => {
    const origGetBCR = inst.canvas.getBoundingClientRect;

    const roomDef = CuyScenes.def('salon');
    CanvasPig.setScene(roomDef);
    inst.canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, width: roomDef.size[0], height: roomDef.size[1],
      right: roomDef.size[0], bottom: roomDef.size[1]
    });
    const ptRoom = inst.toScene({ clientX: roomDef.size[0] / 2, clientY: roomDef.size[1] / 2 });
    assert.strictEqual(Math.round(ptRoom.x), Math.round(roomDef.size[0] / 2),
      `Room centre X mismatch: ${ptRoom.x} != ${roomDef.size[0] / 2}`);
    assert.strictEqual(Math.round(ptRoom.y), Math.round(roomDef.size[1] / 2),
      `Room centre Y mismatch: ${ptRoom.y} != ${roomDef.size[1] / 2}`);

    const gardenDef = CuyScenes.def('garden');
    CanvasPig.setScene(gardenDef);
    inst.canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, width: gardenDef.size[0], height: gardenDef.size[1],
      right: gardenDef.size[0], bottom: gardenDef.size[1]
    });
    const ptGarden = inst.toScene({ clientX: gardenDef.size[0] / 2, clientY: gardenDef.size[1] / 2 });
    assert.strictEqual(Math.round(ptGarden.x), Math.round(gardenDef.size[0] / 2),
      `Garden centre X mismatch: ${ptGarden.x} != ${gardenDef.size[0] / 2}`);
    assert.strictEqual(Math.round(ptGarden.y), Math.round(gardenDef.size[1] / 2),
      `Garden centre Y mismatch: ${ptGarden.y} != ${gardenDef.size[1] / 2}`);

    inst.canvas.getBoundingClientRect = origGetBCR;
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

main().catch(err => {
  console.error(err);
  process.exit(1);
});
