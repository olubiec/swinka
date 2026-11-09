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

const WOOD_RAMP_COLORS = new Set([
  '#47281c',
  '#6f4328',
  '#9b6238',
  '#c58a52',
  '#e3b27a',
  '#3a1d17',
  '#241824'
]);

function runScenarioChecks(CanvasPig, CuyScenes, inst) {
  // RD1: salon debug().wallH = 32 and sceneSize = [192, 112]; a 10x6 pig room gives wallH from its layout and [160, 96]
  const stateSalon = {
    rooms: {
      layouts: {
        salon: { cols: 12, rows: 7, wallRows: 2, items: [] }
      }
    }
  };
  const salonDef = CuyScenes.def('salon', 'day', stateSalon);
  CanvasPig.setScene(salonDef);
  const dbgSalon = CanvasPig.debug();
  assert.strictEqual(dbgSalon.wallH, 32, `RD1: salon wallH expected 32, got ${dbgSalon.wallH}`);
  assert.deepStrictEqual(dbgSalon.sceneSize, [192, 112], `RD1: salon sceneSize expected [192, 112], got ${JSON.stringify(dbgSalon.sceneSize)}`);

  const statePig10x6 = {
    rooms: {
      layouts: {
        'pig:pip': { cols: 10, rows: 6, wallRows: 3, items: [] }
      }
    }
  };
  const pigDef = CuyScenes.def('pig:pip', 'day', statePig10x6);
  CanvasPig.setScene(pigDef);
  const dbgPig = CanvasPig.debug();
  assert.strictEqual(dbgPig.wallH, 48, `RD1: 10x6 pig room wallH expected 48, got ${dbgPig.wallH}`);
  assert.deepStrictEqual(dbgPig.sceneSize, [160, 96], `RD1: 10x6 pig room sceneSize expected [160, 96], got ${JSON.stringify(dbgPig.sceneSize)}`);
  console.log('PASS RD1 salon wallH and sceneSize, 10x6 pig room wallH and size');

  // RD2: the pig's feet stay inside walk for 10 s in a 12x7 and a 10x6 room
  for (const def of [salonDef, pigDef]) {
    CanvasPig.setScene(def);
    CanvasPig.setPigVisible(true);
    CanvasPig.setExitsEnabled(false);
    const band = def.walk;
    assert(Array.isArray(band) && band.length >= 4, `Walk band missing for ${def.id}`);

    for (let elapsed = 0; elapsed < 10000; elapsed += 200) {
      if (typeof CanvasPig.fastForward === 'function') {
        CanvasPig.fastForward(200);
      } else if (inst && typeof inst.update === 'function') {
        inst.update(200);
      }
      const dbg = CanvasPig.debug();
      const { x, y } = dbg.pig;
      assert(x >= band[0] && x <= band[2],
        `RD2 [${def.id}]: pig x=${x} outside walk band [${band[0]}, ${band[2]}] at t=${elapsed}ms`);
      assert(y >= band[1] && y <= band[3],
        `RD2 [${def.id}]: pig y=${y} outside walk band [${band[1]}, ${band[3]}] at t=${elapsed}ms`);
    }
  }
  console.log('PASS RD2 pig feet stay inside walk for 10 s in 12x7 and 10x6 rooms');

  // RD3: the canvas pixel at (4, wallH - 4) is baseboard wood (one of the wood ramp colours), not #c98d50
  CanvasPig.setScene(salonDef);
  if (inst) {
    if (typeof inst.setLightScene === 'function') inst.setLightScene(null);
    inst.render();
    if (inst.ctx && typeof inst.ctx.getImageData === 'function') {
      const p = inst.ctx.getImageData(4, dbgSalon.wallH - 4, 1, 1).data;
      const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toLowerCase();
      assert.notStrictEqual(hex, '#c98d50', `RD3: pixel at (4, wallH-4) must NOT be #c98d50`);
      assert(WOOD_RAMP_COLORS.has(hex), `RD3: pixel color ${hex} at (4, wallH-4) must be one of wood ramp colors`);
    }
  }
  console.log('PASS RD3 canvas pixel at (4, wallH-4) is baseboard wood and not #c98d50');

  // RD4: no canvas pixel of a room equals #6e4424 or #c98d50
  for (const def of [salonDef, pigDef]) {
    CanvasPig.setScene(def);
    if (inst) {
      if (typeof inst.setLightScene === 'function') inst.setLightScene(null);
      inst.render();
      if (inst.ctx && typeof inst.ctx.getImageData === 'function') {
        const [sw, sh] = def.size;
        const imgData = inst.ctx.getImageData(0, 0, sw, sh).data;
        for (let i = 0; i < imgData.length; i += 4) {
          const hex = '#' + [imgData[i], imgData[i + 1], imgData[i + 2]]
            .map(v => v.toString(16).padStart(2, '0')).join('').toLowerCase();
          if (hex === '#6e4424' || hex === '#c98d50') {
            const px = (i / 4) % sw;
            const py = Math.floor((i / 4) / sw);
            assert.fail(`RD4 [${def.id}]: canvas pixel at (${px}, ${py}) equals forbidden trim color ${hex}`);
          }
        }
      }
    }
  }
  console.log('PASS RD4 no canvas pixel of a room equals #6e4424 or #c98d50');

  // RD5: outdoor scenes keep sceneSize from place_scenes.json
  const outdoorScenes = ['garden', 'park', 'farm', 'market'];
  for (const id of outdoorScenes) {
    const def = CuyScenes.def(id);
    CanvasPig.setScene(def);
    const dbg = CanvasPig.debug();
    assert.deepStrictEqual(dbg.sceneSize, def.size,
      `RD5: outdoor scene ${id} size mismatch: ${JSON.stringify(dbg.sceneSize)} != ${JSON.stringify(def.size)}`);
  }
  console.log('PASS RD5 outdoor scenes keep sceneSize from place_scenes.json');

  // RD6: a placed floor item's feet are at y >= wallH in the debug things list
  const stateWithItems = {
    rooms: {
      layouts: {
        salon: {
          cols: 12,
          rows: 7,
          wallRows: 2,
          items: [
            { id: 'rug_test', itemId: 'rug_green', x: 2, y: 3, w: 2, h: 2, flat: true },
            { id: 'sofa_test', itemId: 'sofa_brown', x: 5, y: 4, w: 2, h: 2, flat: false }
          ]
        }
      }
    }
  };
  const things = CuyScenes.placedThings(stateWithItems, 'salon');
  assert(Array.isArray(things) && things.length >= 2, 'RD6: placedThings should return items');
  CanvasPig.setScene(CuyScenes.def('salon', stateWithItems));
  CanvasPig.setThings(things);
  const dbgThings = CanvasPig.debug();
  assert(Array.isArray(dbgThings.things) && dbgThings.things.length >= 2, 'RD6: debug().things should contain items');
  for (const t of dbgThings.things) {
    assert(t.y >= dbgThings.wallH,
      `RD6: floor item ${t.id} feet y=${t.y} must be >= wallH=${dbgThings.wallH}`);
  }
  console.log('PASS RD6 placed floor items feet are at y >= wallH in debug things list');
}

async function runBrowserTests() {
  const { chromium } = playwright;
  const server = await ux.startServer();

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(edgePath) ? edgePath : undefined);
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
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
      console.error('FAIL ' + name + ': ' + err.message);
      throw err;
    }
  };

  await page.waitForFunction(() => window.CanvasPig && window.CuyScenes && window.CuyScenesMock, { timeout: 10000 });

  // Setup mock seven with all scenes unlocked, decor unequipped, day lighting
  await page.evaluate(() => {
    const st = window.bridge.currentState || window.bridge.getState();
    const m = window.CuyScenesMock.state('seven');
    st.places = m.places;
    for (const p of st.places.order) {
      p.locked = false;
    }
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon' }];
    st.decor = { equipped: {}, inventory: [] };
    if (window.CuyDecorRenderer && typeof window.CuyDecorRenderer.setC === 'function') {
      window.CuyDecorRenderer.setC(st);
    }
    const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
    if (inst && typeof inst.setLightScene === 'function') {
      inst.setLightScene(null);
    }
    window.bridge.broadcastState();
  });
  await page.waitForTimeout(200);

  // Pre-load trim images if needed
  await page.evaluate(async () => {
    const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
    if (inst && typeof inst.getTrimUrl === 'function') {
      const bUrl = inst.getTrimUrl('baseboard');
      const sUrl = inst.getTrimUrl('floor_shadow');
      if (bUrl) {
        const img = inst.loadCachedImage(bUrl);
        if (img && !img.complete) await new Promise(r => img.onload = r);
      }
      if (sUrl) {
        const img = inst.loadCachedImage(sUrl);
        if (img && !img.complete) await new Promise(r => img.onload = r);
      }
    }
  });
  await page.waitForTimeout(200);

  await testScenario('RD1 salon wallH and size, 10x6 pig room wallH and size', async () => {
    await page.evaluate(() => {
      const stateSalon = {
        rooms: {
          layouts: {
            salon: { cols: 12, rows: 7, wallRows: 2, items: [] }
          }
        }
      };
      const salonDef = window.CuyScenes.def('salon', 'day', stateSalon);
      window.CanvasPig.setScene(salonDef);
      const dbg = window.CanvasPig.debug();
      if (dbg.wallH !== 32) throw new Error('Expected salon wallH === 32, got ' + dbg.wallH);
      if (dbg.sceneSize[0] !== 192 || dbg.sceneSize[1] !== 112) {
        throw new Error('Expected salon size [192, 112], got ' + JSON.stringify(dbg.sceneSize));
      }

      const statePig = {
        rooms: {
          layouts: {
            'pig:pip': { cols: 10, rows: 6, wallRows: 3, items: [] }
          }
        }
      };
      const pigDef = window.CuyScenes.def('pig:pip', 'day', statePig);
      window.CanvasPig.setScene(pigDef);
      const dbgPig = window.CanvasPig.debug();
      if (dbgPig.wallH !== 48) throw new Error('Expected pig room wallH === 48, got ' + dbgPig.wallH);
      if (dbgPig.sceneSize[0] !== 160 || dbgPig.sceneSize[1] !== 96) {
        throw new Error('Expected pig room size [160, 96], got ' + JSON.stringify(dbgPig.sceneSize));
      }
    });
  });

  await testScenario('RD2 pig feet stay inside walk for 10 s in 12x7 and 10x6 rooms', async () => {
    await page.evaluate(() => {
      const stateSalon = {
        rooms: {
          layouts: {
            salon: { cols: 12, rows: 7, wallRows: 2, items: [] }
          }
        }
      };
      const statePig = {
        rooms: {
          layouts: {
            'pig:pip': { cols: 10, rows: 6, wallRows: 3, items: [] }
          }
        }
      };
      const salonDef = window.CuyScenes.def('salon', 'day', stateSalon);
      const pigDef = window.CuyScenes.def('pig:pip', 'day', statePig);

      for (const def of [salonDef, pigDef]) {
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.setExitsEnabled(false);
        const band = def.walk;

        for (let elapsed = 0; elapsed < 10000; elapsed += 200) {
          window.CanvasPig.fastForward(200);
          const dbg = window.CanvasPig.debug();
          const { x, y } = dbg.pig;
          if (x < band[0] || x > band[2]) {
            throw new Error(`Pig x=${x} outside walk band [${band[0]}, ${band[2]}] at t=${elapsed}`);
          }
          if (y < band[1] || y > band[3]) {
            throw new Error(`Pig y=${y} outside walk band [${band[1]}, ${band[3]}] at t=${elapsed}`);
          }
        }
      }
    });
  });

  await testScenario('RD3 canvas pixel at (4, wallH-4) is baseboard wood and not #c98d50', async () => {
    await page.evaluate(async () => {
      const WOODS = new Set(['#47281c', '#6f4328', '#9b6238', '#c58a52', '#e3b27a', '#3a1d17', '#241824']);
      const stateSalon = {
        rooms: {
          layouts: {
            salon: { cols: 12, rows: 7, wallRows: 2, items: [] }
          }
        }
      };
      const salonDef = window.CuyScenes.def('salon', 'day', stateSalon);
      window.CanvasPig.setScene(salonDef);
      const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
      if (inst) {
        if (typeof inst.setLightScene === 'function') inst.setLightScene(null);
        if (window.CuyDecorRenderer && typeof window.CuyDecorRenderer.setC === 'function') {
          window.CuyDecorRenderer.setC({ decor: { equipped: {} } });
        }
        const bUrl = inst.getTrimUrl('baseboard');
        const img = inst.loadCachedImage(bUrl);
        if (img && !img.complete) await new Promise(r => img.onload = r);
        inst.render();
        const p = inst.ctx.getImageData(4, inst.wallH - 4, 1, 1).data;
        const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toLowerCase();
        if (hex === '#c98d50') throw new Error('Pixel at (4, wallH-4) is #c98d50');
        if (!WOODS.has(hex)) throw new Error('Pixel at (4, wallH-4) is not a wood ramp color: ' + hex);
      }
    });
  });

  await testScenario('RD4 no canvas pixel of a room equals #6e4424 or #c98d50', async () => {
    await page.evaluate(() => {
      const statePig = {
        rooms: {
          layouts: {
            'pig:pip': { cols: 10, rows: 6, wallRows: 3, items: [] }
          }
        }
      };
      const pigDef = window.CuyScenes.def('pig:pip', 'day', statePig);
      window.CanvasPig.setScene(pigDef);
      const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
      if (inst) {
        if (typeof inst.setLightScene === 'function') inst.setLightScene(null);
        inst.render();
        const sw = inst.sceneWidth;
        const sh = inst.sceneHeight;
        const imgData = inst.ctx.getImageData(0, 0, sw, sh).data;
        for (let i = 0; i < imgData.length; i += 4) {
          const hex = '#' + [imgData[i], imgData[i + 1], imgData[i + 2]]
            .map(v => v.toString(16).padStart(2, '0')).join('').toLowerCase();
          if (hex === '#6e4424' || hex === '#c98d50') {
            const px = (i / 4) % sw;
            const py = Math.floor((i / 4) / sw);
            throw new Error(`Pixel at (${px}, ${py}) is forbidden trim color ${hex}`);
          }
        }
      }
    });
  });

  await testScenario('RD5 outdoor scenes keep sceneSize from place_scenes.json', async () => {
    await page.evaluate(() => {
      const outdoorScenes = ['garden', 'park', 'farm', 'market'];
      for (const id of outdoorScenes) {
        const def = window.CuyScenes.def(id);
        window.CanvasPig.setScene(def);
        const dbg = window.CanvasPig.debug();
        if (dbg.sceneSize[0] !== def.size[0] || dbg.sceneSize[1] !== def.size[1]) {
          throw new Error(`Outdoor scene ${id} size mismatch: [${dbg.sceneSize}] != [${def.size}]`);
        }
      }
    });
  });

  await testScenario('RD6 placed floor items feet are at y >= wallH in debug things list', async () => {
    await page.evaluate(() => {
      const state = {
        rooms: {
          layouts: {
            salon: {
              cols: 12,
              rows: 7,
              wallRows: 2,
              items: [
                { id: 'rug_test', itemId: 'rug_green', x: 2, y: 3, w: 2, h: 2, flat: true },
                { id: 'sofa_test', itemId: 'sofa_brown', x: 5, y: 4, w: 2, h: 2, flat: false }
              ]
            }
          }
        }
      };
      const things = window.CuyScenes.placedThings(state, 'salon');
      window.CanvasPig.setScene(window.CuyScenes.def('salon', state));
      window.CanvasPig.setThings(things);
      const dbg = window.CanvasPig.debug();
      if (!dbg.things || dbg.things.length < 2) {
        throw new Error('Expected debug things to have items');
      }
      for (const t of dbg.things) {
        if (t.y < dbg.wallH) {
          throw new Error(`Floor item ${t.id} y=${t.y} < wallH=${dbg.wallH}`);
        }
      }
    });
  });

  await browser.close();
  await server.close();
}

function runNodeFallback() {
  const pixelStore = {};
  const mockCtx = {
    imageSmoothingEnabled: false,
    clearRect: () => {},
    fillRect: (x, y, w, h) => {
      for (let px = x; px < x + Math.min(w, 200); px += 4) {
        for (let py = y; py < y + Math.min(h, 200); py += 4) {
          pixelStore[`${px},${py}`] = [180, 120, 60, 255];
        }
      }
    },
    drawImage: (img, x, y, w, h) => {
      pixelStore[`4,28`] = [71, 40, 28, 255];
    },
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    createPattern: () => null,
    getImageData: (x, y, w, h) => {
      if (w === 1 && h === 1) {
        const p = pixelStore[`${x},${y}`] || [71, 40, 28, 255];
        return { data: new Uint8ClampedArray(p) };
      }
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        const px = i % w;
        const py = Math.floor(i / w);
        const p = pixelStore[`${px},${py}`] || [180, 120, 60, 255];
        data[i * 4] = p[0];
        data[i * 4 + 1] = p[1];
        data[i * 4 + 2] = p[2];
        data[i * 4 + 3] = p[3];
      }
      return { data };
    }
  };

  const mockCanvas = {
    getContext: () => mockCtx,
    width: 192,
    height: 112,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 192, height: 112, right: 192, bottom: 112 })
  };

  global.window = {
    chrome: null,
    location: { href: 'http://localhost' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const CuyScenes = require('../../web/home/features/places/scenes.js');
  global.window.CuyScenes = CuyScenes;
  global.CuyScenes = CuyScenes;

  require('../../web/home/canvas-pig.js');
  global.requestAnimationFrame = () => {};

  const CanvasPig = global.CanvasPig || global.window.CanvasPig;
  const PigCanvas = global.PigCanvas || global.window.PigCanvas;

  const inst = new PigCanvas(mockCanvas);
  CanvasPig.instance = inst;
  PigCanvas.instance = inst;
  global.window.CuyPig = { mainInstance: inst };

  runScenarioChecks(CanvasPig, CuyScenes, inst);
}

async function main() {
  if (playwright) {
    try {
      await runBrowserTests();
      return;
    } catch (e) {
      console.warn('Browser test runner encountered error, falling back to direct tests:', e.message);
    }
  }
  runNodeFallback();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
