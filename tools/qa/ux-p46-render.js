'use strict';
const fs = require('fs');
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, 'node_modules');
require('module').Module._initPaths();

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const ROOT = path.resolve(__dirname, '../..');

async function run() {
  const placeScenesJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'assets/data/place_scenes.json'), 'utf8')
  );

  const server = await ux.startServer();
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  // Wait for scenes.js and atlas to finish loading
  await page.waitForFunction(
    () => window.CuyScenes && window.CuyScenes.getAtlas && window.CuyScenes.getAtlas(),
    { timeout: 5000 }
  );

  let hasFailures = false;
  const failedScenarios = [];
  const allErrors = [];

  const testScenario = async (name, fn) => {
    const startErrCount = page.__errors ? page.__errors.length : 0;
    try {
      await fn();
      if (page.__errors && page.__errors.length > startErrCount) {
        const newErrs = page.__errors.slice(startErrCount);
        allErrors.push(...newErrs);
        throw new Error('page errors: ' + newErrs.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      failedScenarios.push(name + ': ' + err.message);
      console.log('FAIL ' + name + ': ' + err.message);
    }
  };

  // Seed seven-variant outdoor layouts into bridge.currentState
  async function seedOutdoorLayouts() {
    await page.evaluate(() => {
      const mock = window.CuyScenesMock && window.CuyScenesMock.state('seven');
      const st = window.bridge.currentState;
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      if (mock && mock.rooms && mock.rooms.layouts) {
        Object.keys(mock.rooms.layouts).forEach(k => {
          st.rooms.layouts[k] = JSON.parse(JSON.stringify(mock.rooms.layouts[k]));
        });
      }
      if (!st.places) st.places = {};
      if (mock && mock.places && mock.places.order) {
        st.places.order = mock.places.order.map(o => Object.assign({}, o, { locked: false }));
      }
      window.bridge.broadcastState();
    });
    await page.waitForTimeout(100);
  }

  // D1: clean-scene-draws-instances
  await testScenario('D1 clean-scene-draws-instances', async () => {
    await seedOutdoorLayouts();
    const res = await page.evaluate(() => {
      window.CuyScenes.setBgClean('garden', true);
      const st = window.bridge.currentState;
      const def = window.CuyScenes.def('garden', 'day', st);
      window.CanvasPig.setScene(def);
      const things = window.CuyScenes.placedThings(st, 'garden');
      window.CanvasPig.setThings(things);
      const dbg = window.CanvasPig.debug();
      const instDbg = window.CuyScenes.debugInstances('garden', st);
      const benchDbg = (dbg.things || []).find(t => t.id === 'fx:garden:bench');
      const benchInst = (instDbg.placedThings || []).find(t => t.id === 'fx:garden:bench');
      return {
        benchDbg,
        benchInst,
        thingsCount: (dbg.things || []).length,
        instBgClean: instDbg.bg_clean,
        behindLine: def.behindLine,
        blockerBehindLines: (def.blockers || []).map(b => b.behindLine)
      };
    });
    if (!res.benchDbg || !res.benchInst) {
      throw new Error('fx:garden:bench not drawn in CanvasPig.debug().things');
    }
    // bench_wood at grid (9, 6) with 2x1 cells -> px x = 9*16 + 16 = 160, y = (6+1)*16 = 112
    if (res.benchInst.x !== 160 || res.benchInst.y !== 112 || res.benchDbg.y !== 112) {
      throw new Error(`Expected bench at (160, 112), got inst=(${res.benchInst.x}, ${res.benchInst.y}) dbgY=${res.benchDbg.y}`);
    }
    if (!res.instBgClean || res.behindLine !== -9999) {
      throw new Error(`Expected bg_clean=true and behindLine=-9999, got ${res.instBgClean}, ${res.behindLine}`);
    }
    if (res.blockerBehindLines.some(bl => bl !== -9999)) {
      throw new Error('Expected all derived blockers to have behindLine === -9999');
    }
  });

  // D2: unclean-scene-unchanged
  await testScenario('D2 unclean-scene-unchanged', async () => {
    await seedOutdoorLayouts();
    const res = await page.evaluate(() => {
      window.CuyScenes.setBgClean('park', false);
      const st = window.bridge.currentState;
      const def = window.CuyScenes.def('park', 'day', st);
      const things = window.CuyScenes.placedThings(st, 'park');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings(things);
      const dbg = window.CanvasPig.debug();
      return {
        thingsCount: things.length,
        dbgThingsCount: (dbg.things || []).length,
        blockerIds: (def.blockers || []).map(b => b.id),
        behindLine: def.behindLine
      };
    });
    if (res.thingsCount !== 0 || res.dbgThingsCount !== 0) {
      throw new Error(`Expected 0 instances for bg_clean:false park, got ${res.thingsCount}`);
    }
    if (!res.blockerIds.includes('river_bank_left')) {
      throw new Error(`Expected static blockers (e.g. river_bank_left) for park, got [${res.blockerIds.join(', ')}]`);
    }
    if (res.behindLine === -9999) {
      throw new Error('Unclean park should keep its static behindLine, not -9999');
    }
  });

  // D3: ysort
  await testScenario('D3 ysort', async () => {
    await seedOutdoorLayouts();
    const res = await page.evaluate(() => {
      window.CuyScenes.setBgClean('garden', true);
      const st = window.bridge.currentState;
      const def = window.CuyScenes.def('garden', 'day', st);
      window.CanvasPig.setScene(def);
      const things = window.CuyScenes.placedThings(st, 'garden');
      window.CanvasPig.setThings(things);
      const inst = window.CuyPig && window.CuyPig.mainInstance;
      if (inst) {
        inst.pigX = 128;
        inst.pigY = 96; // between hedge (y=80) and bench (y=112)
      }
      const dbg = window.CanvasPig.debug();
      const order = (dbg.renderList || []).map(r => r.id);
      return {
        order,
        hedgeIdx: order.indexOf('fx:garden:hedge'),
        pigIdx: order.indexOf('pig'),
        benchIdx: order.indexOf('fx:garden:bench')
      };
    });
    if (res.hedgeIdx === -1 || res.pigIdx === -1 || res.benchIdx === -1) {
      throw new Error(`Missing items in renderList: ${JSON.stringify(res)}`);
    }
    if (!(res.hedgeIdx < res.pigIdx && res.pigIdx < res.benchIdx)) {
      throw new Error(`Expected hedge < pig < bench in renderList, got ${res.order.join(' -> ')}`);
    }
  });

  // D4: blocker-follows-instance
  await testScenario('D4 blocker-follows-instance', async () => {
    await seedOutdoorLayouts();
    const res = await page.evaluate(() => {
      window.CuyScenes.setBgClean('garden', true);
      const st = window.bridge.currentState;
      let def = window.CuyScenes.def('garden', 'day', st);
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings(window.CuyScenes.placedThings(st, 'garden'));
      // Bench initially at (9, 6) -> px [144, 96, 176, 112], center (160, 104)
      const oldFreeBefore = window.CanvasPig.isFree(160, 104);
      const newFreeBefore = window.CanvasPig.isFree(96, 104);

      // Move bench to (5, 6) -> px [80, 96, 112, 112], center (96, 104)
      const bench = st.rooms.layouts.garden.items.find(i => i.uid === 'fx:garden:bench');
      bench.x = 5;
      bench.y = 6;

      def = window.CuyScenes.def('garden', 'day', st);
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings(window.CuyScenes.placedThings(st, 'garden'));

      const oldFreeAfter = window.CanvasPig.isFree(160, 104);
      const newFreeAfter = window.CanvasPig.isFree(96, 104);
      return { oldFreeBefore, newFreeBefore, oldFreeAfter, newFreeAfter };
    });
    if (res.oldFreeBefore !== false || res.newFreeBefore !== true) {
      throw new Error(`Unexpected initial state: ${JSON.stringify(res)}`);
    }
    if (res.oldFreeAfter !== true || res.newFreeAfter !== false) {
      throw new Error(`Blocker did not follow moved bench: ${JSON.stringify(res)}`);
    }
  });

  // D5: pig-walks-around
  await testScenario('D5 pig-walks-around', async () => {
    await seedOutdoorLayouts();
    const res = await page.evaluate(() => {
      window.CuyScenes.setBgClean('garden', true);
      const st = window.bridge.currentState;
      // Place fountain (1x1) at (6, 6) -> px [96, 96, 112, 112]
      const fountain = st.rooms.layouts.garden.items.find(i => i.uid === 'fx:garden:fountain');
      fountain.x = 6;
      fountain.y = 6;
      const def = window.CuyScenes.def('garden', 'day', st);
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings(window.CuyScenes.placedThings(st, 'garden'));

      const inst = window.CuyPig && window.CuyPig.mainInstance;
      // Start left of fountain (88, 104), target behind fountain (124, 104)
      const pathPts = inst.findPath(88, 104, 124, 104);
      const hitsFountain = (pathPts || []).some(
        p => p.x >= 96 && p.x <= 112 && p.y >= 96 && p.y <= 112
      );
      return {
        hasPath: Array.isArray(pathPts) && pathPts.length > 0,
        pathLen: pathPts ? pathPts.length : 0,
        hitsFountain,
        fountainBlocked: !window.CanvasPig.isFree(104, 104)
      };
    });
    if (!res.fountainBlocked) {
      throw new Error('Expected fountain footprint (104, 104) to be blocked');
    }
    if (!res.hasPath) {
      throw new Error('Expected findPath to return a valid detour around fountain');
    }
    if (res.hitsFountain) {
      throw new Error('Path passed through fountain footprint');
    }
  });

  // D6: missing-art-skipped
  await testScenario('D6 missing-art-skipped', async () => {
    await seedOutdoorLayouts();
    const res = await page.evaluate(() => {
      window.CuyScenes.setBgClean('garden', true);
      const st = window.bridge.currentState;
      st.rooms.layouts.garden.items.push({
        uid: 'fx:garden:ghost_missing',
        itemId: 'nonexistent_item_xyz_999',
        x: 7,
        y: 6,
        flip: false,
        variant: 0
      });
      const def = window.CuyScenes.def('garden', 'day', st);
      const things = window.CuyScenes.placedThings(st, 'garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings(things);
      const dbg = window.CanvasPig.debug();
      return {
        inThings: things.some(t => t.id === 'fx:garden:ghost_missing'),
        inDbg: (dbg.things || []).some(t => t.id === 'fx:garden:ghost_missing'),
        inBlockers: (def.blockers || []).some(b => b.id === 'fx:garden:ghost_missing')
      };
    });
    if (res.inThings || res.inDbg || res.inBlockers) {
      throw new Error(`Missing-art item should be skipped, got ${JSON.stringify(res)}`);
    }
  });

  // D7: canvas-size-unchanged
  await testScenario('D7 canvas-size-unchanged', async () => {
    await seedOutdoorLayouts();
    const expected = {};
    for (const id of ['room', 'garden', 'park', 'farm', 'market']) {
      expected[id] = placeScenesJson.scenes[id].size;
    }
    const actual = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const out = {};
      for (const id of ['salon', 'garden', 'park', 'farm', 'market']) {
        const def = window.CuyScenes.def(id, 'day', st);
        window.CanvasPig.setScene(def);
        const dbg = window.CanvasPig.debug();
        out[id] = dbg.sceneSize;
      }
      return out;
    });
    const map = { salon: 'room', garden: 'garden', park: 'park', farm: 'farm', market: 'market' };
    for (const [id, jsonKey] of Object.entries(map)) {
      const exp = expected[jsonKey];
      const act = actual[id];
      if (!act || act[0] !== exp[0] || act[1] !== exp[1]) {
        throw new Error(`Scene ${id} size ${JSON.stringify(act)} !== expected ${JSON.stringify(exp)}`);
      }
    }
  });

  // D8: no-console-errors
  await testScenario('D8 no-console-errors', async () => {
    if (allErrors.length > 0 || (page.__errors && page.__errors.length > 0)) {
      throw new Error('Console/page errors detected: ' + [...allErrors, ...(page.__errors || [])].join('; '));
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.error('\nFAILED SCENARIOS:\n' + failedScenarios.join('\n'));
    process.exit(1);
  }
  console.log('\nALL ux-p46-render CHECKS PASSED');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
