'use strict';
const path = require('path');

let playwright = null;
try {
  playwright = require('playwright');
} catch (e) {
  // Playwright not installed in environment, will fall back to direct Node tests
}

function runScenarioChecks(CuyScenes, CuyScenesMock) {
  // S1: order
  const mockState = CuyScenesMock.state('garden_unlocked');
  const order = CuyScenes.order(mockState);
  if (!Array.isArray(order) || order.length !== mockState.places.order.length) {
    throw new Error('Order length mismatch');
  }
  for (let i = 0; i < order.length; i++) {
    const item = order[i];
    const expected = mockState.places.order[i];
    if (item.id !== expected.id) throw new Error(`Id mismatch at ${i}: ${item.id} != ${expected.id}`);
    if (item.title !== expected.title) throw new Error(`Title mismatch at ${i}`);
    if (item.locked !== expected.locked) throw new Error(`Locked flag mismatch at ${i}`);
  }
  const fallback = CuyScenes.order(null);
  if (!Array.isArray(fallback) || fallback.length !== 5) {
    throw new Error('Fallback order expected 5 scenes');
  }
  const expectedIds = ['salon', 'garden', 'park', 'farm', 'market'];
  for (let i = 0; i < 5; i++) {
    if (fallback[i].id !== expectedIds[i]) throw new Error(`Fallback id mismatch at ${i}`);
    if (fallback[i].locked !== false) throw new Error(`Fallback locked flag at ${i} should be false`);
  }

  // S2: ring
  const st7 = CuyScenesMock.state('seven');
  const order7 = CuyScenes.order(st7);
  if (order7.length !== 7) {
    throw new Error(`Expected 7 scenes in seven variant, got ${order7.length}`);
  }
  const rightFromMarket = CuyScenes.neighbor('market', 1, st7);
  if (rightFromMarket !== 'salon') {
    throw new Error(`Expected right from market to be salon, got ${rightFromMarket}`);
  }
  const leftFromSalon = CuyScenes.neighbor('salon', -1, st7);
  if (leftFromSalon !== 'market') {
    throw new Error(`Expected left from salon to be market, got ${leftFromSalon}`);
  }
  let curr = 'salon';
  for (let i = 0; i < 14; i++) {
    curr = CuyScenes.neighbor(curr, 1, st7);
  }
  if (curr !== 'salon') {
    throw new Error(`Expected 14 steps right to return to salon, got ${curr}`);
  }
  curr = 'salon';
  for (let i = 0; i < 14; i++) {
    curr = CuyScenes.neighbor(curr, -1, st7);
  }
  if (curr !== 'salon') {
    throw new Error(`Expected 14 steps left to return to salon, got ${curr}`);
  }

  // S3: bg-by-time
  const times = ['morning', 'day', 'evening', 'night'];
  const gardenUrls = times.map(t => CuyScenes.def('garden', t).bgUrl);
  const uniqueGarden = new Set(gardenUrls);
  if (uniqueGarden.size !== 4) {
    throw new Error(`Garden should have 4 different files, got ${uniqueGarden.size}: ${gardenUrls.join(', ')}`);
  }
  const farmUrls = times.map(t => CuyScenes.def('farm', t).bgUrl);
  const uniqueFarm = new Set(farmUrls);
  if (uniqueFarm.size !== 1) {
    throw new Error(`Farm should have same file for all times, got ${uniqueFarm.size}`);
  }
  const marketUrls = times.map(t => CuyScenes.def('market', t).bgUrl);
  const uniqueMarket = new Set(marketUrls);
  if (uniqueMarket.size !== 1) {
    throw new Error(`Market should have same file for all times, got ${uniqueMarket.size}`);
  }
  const roomIds = ['room', 'salon', 'pig:pig_1', 'pig:pig_2', 'dorm'];
  for (const roomId of roomIds) {
    for (const t of times) {
      const d = CuyScenes.def(roomId, t);
      if (d.bgUrl !== null) {
        throw new Error(`Room ${roomId} bgUrl should be null, got ${d.bgUrl}`);
      }
    }
  }

  // S4: band
  const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
  for (const id of scenes) {
    const def = CuyScenes.def(id, 'day');
    if (!Array.isArray(def.size) || def.size.length !== 2) {
      throw new Error(`${id} size invalid`);
    }
    if (!Array.isArray(def.walk) || def.walk.length !== 4) {
      throw new Error(`${id} walk invalid`);
    }
    if (!Array.isArray(def.depthScale) || def.depthScale.length !== 2) {
      throw new Error(`${id} depthScale invalid`);
    }
    const [w, h] = def.size;
    const [x0, y0, x1, y1] = def.walk;
    const [far, near] = def.depthScale;
    if (x0 < 0 || y0 < 0 || x1 > w || y1 > h || x0 >= x1 || y0 >= y1) {
      throw new Error(`${id} walk bounds invalid: walk=${def.walk}, size=${def.size}`);
    }
    if (far > near) {
      throw new Error(`${id} depthScale far > near: [${far}, ${near}]`);
    }
  }

  // S5: unknown
  const unk = CuyScenes.def('completely_unknown_place_123', 'day');
  const room = CuyScenes.def('room', 'day');
  if (unk.kind !== 'room') {
    throw new Error(`Unknown scene kind expected 'room', got '${unk.kind}'`);
  }
  if (unk.size[0] !== room.size[0] || unk.size[1] !== room.size[1]) {
    throw new Error('Unknown scene size does not match room template');
  }
  if (unk.walk[0] !== room.walk[0] || unk.walk[2] !== room.walk[2]) {
    throw new Error('Unknown scene walk does not match room template');
  }
  if (unk.depthScale[0] !== room.depthScale[0] || unk.depthScale[1] !== room.depthScale[1]) {
    throw new Error('Unknown scene depthScale does not match room template');
  }
  if (unk.bgUrl !== null) {
    throw new Error('Unknown scene bgUrl should be null');
  }
  const nullDef = CuyScenes.def(null);
  if (nullDef.kind !== 'room') {
    throw new Error('Null id expected room template');
  }

  // S6: pig-scene
  if (CuyScenes.pigScene(null, 'pig_1') !== 'salon') {
    throw new Error('Expected default salon for null state');
  }
  if (CuyScenes.pigScene({}, 'pig_1') !== 'salon') {
    throw new Error('Expected default salon for empty state');
  }
  const st = CuyScenesMock.state();
  if (CuyScenes.pigScene(st, 'pig_1') !== 'salon') {
    throw new Error('Expected salon from mock initial location');
  }
  st.places.pigLocations = [
    { pigId: 'pig_1', scene: 'garden', pinned: false }
  ];
  if (CuyScenes.pigScene(st, 'pig_1') !== 'garden') {
    throw new Error('Expected garden after moving pig location');
  }
  st.places.pigLocations = [
    { pigId: 'pig_1', scene: 'market', pinned: true }
  ];
  if (CuyScenes.pigScene(st, 'pig_1') !== 'market') {
    throw new Error('Expected market after moving pig location');
  }
  if (CuyScenes.pigScene(st, 'unknown_pig') !== 'salon') {
    throw new Error('Expected salon for unknown pigId');
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

  await page.waitForFunction(() => window.CuyScenesMock, { timeout: 10000 }).catch(async () => {
    await page.addScriptTag({ url: 'features/places/mock.js' });
  });
  await page.waitForFunction(() => window.CuyScenes, { timeout: 10000 }).catch(async () => {
    await page.addScriptTag({ url: 'features/places/scenes.js' });
  });
  await page.evaluate(async () => {
    if (window.CuyScenes && window.CuyScenes.load) {
      await window.CuyScenes.load();
    }
  });

  const scenarioFnStr = `(${runScenarioChecks.toString()})(window.CuyScenes, window.CuyScenesMock)`;

  await testScenario('S1 order', async () => {
    await page.evaluate(`(() => {
      const CuyScenes = window.CuyScenes;
      const CuyScenesMock = window.CuyScenesMock;
      const mockState = CuyScenesMock.state('garden_unlocked');
      const order = CuyScenes.order(mockState);
      if (!Array.isArray(order) || order.length !== mockState.places.order.length) {
        throw new Error('Order length mismatch');
      }
      for (let i = 0; i < order.length; i++) {
        const item = order[i];
        const expected = mockState.places.order[i];
        if (item.id !== expected.id) throw new Error('Id mismatch');
        if (item.title !== expected.title) throw new Error('Title mismatch');
        if (item.locked !== expected.locked) throw new Error('Locked flag mismatch');
      }
      const fallback = CuyScenes.order(null);
      if (!Array.isArray(fallback) || fallback.length !== 5) throw new Error('Fallback order mismatch');
      if (fallback.some(s => s.locked)) throw new Error('Fallback locked mismatch');
    })()`);
  });

  await testScenario('S2 ring', async () => {
    await page.evaluate(`(() => {
      const CuyScenes = window.CuyScenes;
      const CuyScenesMock = window.CuyScenesMock;
      const st7 = CuyScenesMock.state('seven');
      if (CuyScenes.neighbor('market', 1, st7) !== 'salon') throw new Error('Right from market != salon');
      if (CuyScenes.neighbor('salon', -1, st7) !== 'market') throw new Error('Left from salon != market');
      let curr = 'salon';
      for (let i = 0; i < 14; i++) curr = CuyScenes.neighbor(curr, 1, st7);
      if (curr !== 'salon') throw new Error('14 steps right != salon');
    })()`);
  });

  await testScenario('S3 bg-by-time', async () => {
    await page.evaluate(`(() => {
      const CuyScenes = window.CuyScenes;
      const times = ['morning', 'day', 'evening', 'night'];
      const gardenUrls = times.map(t => CuyScenes.def('garden', t).bgUrl);
      if (new Set(gardenUrls).size !== 4) throw new Error('Garden backgrounds count != 4');
      const farmUrls = times.map(t => CuyScenes.def('farm', t).bgUrl);
      if (new Set(farmUrls).size !== 1) throw new Error('Farm backgrounds count != 1');
      const marketUrls = times.map(t => CuyScenes.def('market', t).bgUrl);
      if (new Set(marketUrls).size !== 1) throw new Error('Market backgrounds count != 1');
      for (const r of ['room', 'salon', 'pig:pig_1', 'dorm']) {
        for (const t of times) {
          if (CuyScenes.def(r, t).bgUrl !== null) throw new Error('Room bgUrl != null');
        }
      }
    })()`);
  });

  await testScenario('S4 band', async () => {
    await page.evaluate(`(() => {
      const CuyScenes = window.CuyScenes;
      const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
      for (const id of scenes) {
        const def = CuyScenes.def(id, 'day');
        const [w, h] = def.size;
        const [x0, y0, x1, y1] = def.walk;
        const [far, near] = def.depthScale;
        if (x0 < 0 || y0 < 0 || x1 > w || y1 > h || x0 >= x1 || y0 >= y1) throw new Error(id + ' walk bounds invalid');
        if (far > near) throw new Error(id + ' depthScale far > near');
      }
    })()`);
  });

  await testScenario('S5 unknown', async () => {
    await page.evaluate(`(() => {
      const CuyScenes = window.CuyScenes;
      const unk = CuyScenes.def('unknown_123', 'day');
      const room = CuyScenes.def('room', 'day');
      if (unk.kind !== 'room') throw new Error('unk.kind != room');
      if (unk.size[0] !== room.size[0] || unk.size[1] !== room.size[1]) throw new Error('unk.size mismatch');
      if (unk.walk[0] !== room.walk[0] || unk.walk[2] !== room.walk[2]) throw new Error('unk.walk mismatch');
      if (unk.depthScale[0] !== room.depthScale[0]) throw new Error('unk.depthScale mismatch');
      if (unk.bgUrl !== null) throw new Error('unk.bgUrl != null');
    })()`);
  });

  await testScenario('S6 pig-scene', async () => {
    await page.evaluate(`(() => {
      const CuyScenes = window.CuyScenes;
      const CuyScenesMock = window.CuyScenesMock;
      if (CuyScenes.pigScene(null, 'pig_1') !== 'salon') throw new Error('null state != salon');
      const st = CuyScenesMock.state();
      if (CuyScenes.pigScene(st, 'pig_1') !== 'salon') throw new Error('mock initial != salon');
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'garden', pinned: false }];
      if (CuyScenes.pigScene(st, 'pig_1') !== 'garden') throw new Error('moved location != garden');
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'market', pinned: true }];
      if (CuyScenes.pigScene(st, 'pig_1') !== 'market') throw new Error('pinned location != market');
    })()`);
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

async function runNodeTests() {
  const CuyScenes = require('../../web/home/features/places/scenes.js');
  const CuyScenesMock = require('../../web/home/features/places/mock.js');
  await CuyScenes.load();

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

  testScenario('S1 order', () => {
    const mockState = CuyScenesMock.state('garden_unlocked');
    const order = CuyScenes.order(mockState);
    if (!Array.isArray(order) || order.length !== mockState.places.order.length) {
      throw new Error('Order length mismatch');
    }
    for (let i = 0; i < order.length; i++) {
      const item = order[i];
      const expected = mockState.places.order[i];
      if (item.id !== expected.id) throw new Error('Id mismatch');
      if (item.title !== expected.title) throw new Error('Title mismatch');
      if (item.locked !== expected.locked) throw new Error('Locked flag mismatch');
    }
    const fallback = CuyScenes.order(null);
    if (!Array.isArray(fallback) || fallback.length !== 5) throw new Error('Fallback order mismatch');
    if (fallback.some(s => s.locked)) throw new Error('Fallback locked mismatch');
  });

  testScenario('S2 ring', () => {
    const st7 = CuyScenesMock.state('seven');
    if (CuyScenes.neighbor('market', 1, st7) !== 'salon') throw new Error('Right from market != salon');
    if (CuyScenes.neighbor('salon', -1, st7) !== 'market') throw new Error('Left from salon != market');
    let curr = 'salon';
    for (let i = 0; i < 14; i++) curr = CuyScenes.neighbor(curr, 1, st7);
    if (curr !== 'salon') throw new Error('14 steps right != salon');
  });

  testScenario('S3 bg-by-time', () => {
    const times = ['morning', 'day', 'evening', 'night'];
    const gardenUrls = times.map(t => CuyScenes.def('garden', t).bgUrl);
    if (new Set(gardenUrls).size !== 4) throw new Error('Garden backgrounds count != 4');
    const farmUrls = times.map(t => CuyScenes.def('farm', t).bgUrl);
    if (new Set(farmUrls).size !== 1) throw new Error('Farm backgrounds count != 1');
    const marketUrls = times.map(t => CuyScenes.def('market', t).bgUrl);
    if (new Set(marketUrls).size !== 1) throw new Error('Market backgrounds count != 1');
    for (const r of ['room', 'salon', 'pig:pig_1', 'dorm']) {
      for (const t of times) {
        if (CuyScenes.def(r, t).bgUrl !== null) throw new Error('Room bgUrl != null');
      }
    }
  });

  testScenario('S4 band', () => {
    const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
    for (const id of scenes) {
      const def = CuyScenes.def(id, 'day');
      const [w, h] = def.size;
      const [x0, y0, x1, y1] = def.walk;
      const [far, near] = def.depthScale;
      if (x0 < 0 || y0 < 0 || x1 > w || y1 > h || x0 >= x1 || y0 >= y1) throw new Error(id + ' walk bounds invalid');
      if (far > near) throw new Error(id + ' depthScale far > near');
    }
  });

  testScenario('S5 unknown', () => {
    const unk = CuyScenes.def('unknown_123', 'day');
    const room = CuyScenes.def('room', 'day');
    if (unk.kind !== 'room') throw new Error('unk.kind != room');
    if (unk.size[0] !== room.size[0] || unk.size[1] !== room.size[1]) throw new Error('unk.size mismatch');
    if (unk.walk[0] !== room.walk[0] || unk.walk[2] !== room.walk[2]) throw new Error('unk.walk mismatch');
    if (unk.depthScale[0] !== room.depthScale[0]) throw new Error('unk.depthScale mismatch');
    if (unk.bgUrl !== null) throw new Error('unk.bgUrl != null');
  });

  testScenario('S6 pig-scene', () => {
    if (CuyScenes.pigScene(null, 'pig_1') !== 'salon') throw new Error('null state != salon');
    const st = CuyScenesMock.state();
    if (CuyScenes.pigScene(st, 'pig_1') !== 'salon') throw new Error('mock initial != salon');
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'garden', pinned: false }];
    if (CuyScenes.pigScene(st, 'pig_1') !== 'garden') throw new Error('moved location != garden');
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'market', pinned: true }];
    if (CuyScenes.pigScene(st, 'pig_1') !== 'market') throw new Error('pinned location != market');
  });

  if (hasFailures) {
    process.exit(1);
  }
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
  await runNodeTests();
}

main().catch(err => {
  console.error('Fatal error in ux-p32-scenes-data:', err);
  process.exit(1);
});
