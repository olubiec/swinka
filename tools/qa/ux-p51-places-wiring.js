'use strict';
const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');

async function launchBrowser() {
  if (process.env.CHROMIUM_PATH) {
    return await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (_) {
    return await chromium.launch({ channel: 'msedge', headless: true });
  }
}

(async () => {
  const server = await startServer();
  const browser = await launchBrowser();
  const consoleErrors = [];
  try {
    const page = await openHome(browser, { base: server.base });
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForTimeout(200);

    // Load lib/hotspots.js and lib/weather.js if PK-APP2 hasn't wired them in index.html yet
    const hasLibs = await page.evaluate(() => ({
      hotspots: !!window.CuyHotspots,
      weather: !!window.CuyWeather
    }));
    if (!hasLibs.hotspots) {
      await page.addScriptTag({ path: path.join(ROOT, 'web', 'home', 'lib', 'hotspots.js') });
    }
    if (!hasLibs.weather) {
      await page.addScriptTag({ path: path.join(ROOT, 'web', 'home', 'lib', 'weather.js') });
    }

    // Install STUBs for CanvasPig.setPresentPigs, setHotspots, onHotspot (PK-CV2 runs in parallel)
    // and spy on CuyRoom.addLayer / removeLayer
    await page.evaluate(() => {
      window.__p51 = {
        presentCalls: [],
        hotspotCalls: [],
        hotspotHandlers: [],
        weatherAdds: [],
        weatherRemoves: []
      };
      if (window.CanvasPig) {
        if (typeof window.CanvasPig.setPresentPigs !== 'function') {
          window.CanvasPig.setPresentPigs = function(list) {
            window.__p51.presentCalls.push({ scene: window.CuyPlaces.getCurrentPlace(), list: list });
          };
        } else {
          const orig = window.CanvasPig.setPresentPigs;
          window.CanvasPig.setPresentPigs = function(list) {
            window.__p51.presentCalls.push({ scene: window.CuyPlaces.getCurrentPlace(), list: list });
            return orig.apply(this, arguments);
          };
        }
        if (typeof window.CanvasPig.setHotspots !== 'function') {
          window.CanvasPig.setHotspots = function(list) {
            window.__p51.hotspotCalls.push({ scene: window.CuyPlaces.getCurrentPlace(), list: list });
          };
        } else {
          const orig = window.CanvasPig.setHotspots;
          window.CanvasPig.setHotspots = function(list) {
            window.__p51.hotspotCalls.push({ scene: window.CuyPlaces.getCurrentPlace(), list: list });
            return orig.apply(this, arguments);
          };
        }
        if (typeof window.CanvasPig.onHotspot !== 'function') {
          window.CanvasPig.onHotspot = function(fn) {
            window.__p51.hotspotHandlers.push(fn);
          };
        } else {
          const orig = window.CanvasPig.onHotspot;
          window.CanvasPig.onHotspot = function(fn) {
            window.__p51.hotspotHandlers.push(fn);
            return orig.apply(this, arguments);
          };
        }
      }
      if (window.CuyRoom) {
        const origAdd = window.CuyRoom.addLayer;
        window.CuyRoom.addLayer = function(name, z, fn) {
          if (name === 'weather') window.__p51.weatherAdds.push(window.CuyPlaces.getCurrentPlace());
          return origAdd.apply(this, arguments);
        };
        const origRem = window.CuyRoom.removeLayer;
        window.CuyRoom.removeLayer = function(name) {
          if (name === 'weather') window.__p51.weatherRemoves.push(window.CuyPlaces.getCurrentPlace());
          return origRem.apply(this, arguments);
        };
      }
      // Switch to seven mock state with lamps + multi-pig locations
      const st = window.bridge.currentState || window.bridge.getState();
      const seven = window.CuyScenesMock.state('seven');
      st.places = seven.places;
      if (Array.isArray(st.places.order)) {
        st.places.order = st.places.order.map(e => Object.assign({}, e, { locked: false }));
      }
      st.rooms = seven.rooms;
      st.places.pigLocations = [
        { pigId: 'pig_1', scene: 'salon', pinned: false },
        { pigId: 'pig_2', scene: 'garden', pinned: true }
      ];
      if (!Array.isArray(seven.roster) || seven.roster.length < 2) {
        st.roster = [
          { id: 'pig_1', name: 'Pip', stage: 'adult', look: { breed: 'american', coat: 'tricolor' } },
          { id: 'pig_2', name: 'Kuki', stage: 'junior', look: { breed: 'abyssinian', coat: 'calico' } }
        ];
      } else {
        st.roster = seven.roster;
      }
      if (!st.rooms.layouts.salon) st.rooms.layouts.salon = { cols: 12, rows: 7, items: [] };
      st.rooms.layouts.salon.items = [
        { uid: 'lamp_test_1', itemId: 'lamp_mushroom', x: 4, y: 4 },
        { uid: 'window_test_1', itemId: 'window_sun', x: 2, y: 0 }
      ];
      st.rooms.layouts.dorm = { cols: 12, rows: 7, items: [{ uid: 'bad_item', itemId: 'lamp_mushroom' }] };
      window.__cuyNow = new Date(2026, 0, 1, 22, 0, 0).getTime();
      window.bridge.broadcastState();
    });
    await page.waitForTimeout(250);

    // F1: lamp-click-toggles
    const f1 = await page.evaluate(() => {
      const getHandlers = () => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        return (inst && Array.isArray(inst._hotspotListeners) && inst._hotspotListeners.length > 0)
          ? inst._hotspotListeners
          : window.__p51.hotspotHandlers;
      };
      window.CuyPlaces.openPlace('salon');
      const before = window.CuyLight.build('salon').sources.find(s => s.uid === 'lamp_test_1' || s.id === 'lamp_test_1');
      const wasOn = before ? before.on : null;
      getHandlers().forEach(fn => fn({ kind: 'lamp', uid: 'lamp_test_1', id: 'lamp_test_1' }));
      const mid = window.CuyLight.build('salon').sources.find(s => s.uid === 'lamp_test_1' || s.id === 'lamp_test_1');
      const midOn = mid ? mid.on : null;
      getHandlers().forEach(fn => fn({ kind: 'lamp', uid: 'lamp_test_1', id: 'lamp_test_1' }));
      const after = window.CuyLight.build('salon').sources.find(s => s.uid === 'lamp_test_1' || s.id === 'lamp_test_1');
      const afterOn = after ? after.on : null;
      return { wasOn, midOn, afterOn, handlerCount: getHandlers().length };
    });
    assert(f1.handlerCount >= 1, 'F1 onHotspot handler must be registered');
    assert.notStrictEqual(f1.midOn, f1.wasOn, 'F1 lamp hotspot click must toggle lamp on->off or off->on');
    assert.strictEqual(f1.afterOn, f1.wasOn, 'F1 second lamp hotspot click must toggle back');
    console.log('F1 OK');

    // F2: window-click-no-change
    const f2 = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
      const handlers = (inst && Array.isArray(inst._hotspotListeners) && inst._hotspotListeners.length > 0)
        ? inst._hotspotListeners
        : window.__p51.hotspotHandlers;
      const before = window.CuyLight.build('salon').sources.find(s => (s.itemId || s.id) === 'window' || s.uid === 'window_test_1');
      const wasOn = before ? before.on : null;
      handlers.forEach(fn => fn({ kind: 'lamp', uid: 'window_test_1', id: 'window_test_1' }));
      window.CuyPlaces.setLampToggle('window_test_1', !wasOn);
      window.CuyPlaces.setLampToggle('window', !wasOn);
      const after = window.CuyLight.build('salon').sources.find(s => (s.itemId || s.id) === 'window' || s.uid === 'window_test_1');
      const afterOn = after ? after.on : null;
      return { wasOn, afterOn, toggle: before ? before.toggle : null };
    });
    assert.strictEqual(f2.toggle, false, 'F2 window source must have toggle:false');
    assert.strictEqual(f2.afterOn, f2.wasOn, 'F2 window light must ignore manual toggles');
    console.log('F2 OK');

    // F3: no-phantom-light (item without x/y passed to CuyLight.build)
    const f3 = await page.evaluate(() => {
      const built = window.CuyLight.build('dorm', [{ uid: 'bad_item', itemId: 'lamp_mushroom' }]);
      const empty = window.CuyLight.build('dorm', []);
      const has12065 = (built && built.sources || []).some(s => s.x === 120 && s.y === 65);
      return {
        count: built ? built.sources.length : -1,
        emptyCount: empty ? empty.sources.length : -1,
        has12065
      };
    });
    assert.strictEqual(f3.count, 0, 'F3 scene without valid lamps/windows must have 0 sources');
    assert.strictEqual(f3.emptyCount, 0, 'F3 empty scene must have 0 sources');
    assert.strictEqual(f3.has12065, false, 'F3 must not create phantom light at (120,65)');
    console.log('F3 OK');

    // F4: initCanvasLampClick-gone
    const f4 = await page.evaluate(() => {
      const canvas = document.getElementById('pigCanvas');
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
      const getCount = () => (inst && Array.isArray(inst._hotspotListeners) && inst._hotspotListeners.length > 0)
        ? inst._hotspotListeners.length
        : window.__p51.hotspotHandlers.length;
      const countBefore = getCount();
      window.CuyPlaces.openPlace('garden');
      window.CuyPlaces.openPlace('salon');
      const countAfter = getCount();
      return {
        hasLegacyFlag: !!(canvas && canvas._cuyLampClick),
        countBefore,
        countAfter
      };
    });
    assert.strictEqual(f4.hasLegacyFlag, false, 'F4 initCanvasLampClick must be removed');
    assert.strictEqual(f4.countAfter, f4.countBefore, 'F4 repeated openPlace must not add duplicate onHotspot subscriptions');
    console.log('F4 OK');

    // F5 & F6: present-pigs-filtered & scene-switch-updates-pigs
    const f56 = await page.evaluate(() => {
      window.__p51.presentCalls = [];
      window.CuyPlaces.openPlace('salon');
      const salonCall = window.__p51.presentCalls[window.__p51.presentCalls.length - 1];
      window.CuyPlaces.openPlace('garden');
      const gardenCall = window.__p51.presentCalls[window.__p51.presentCalls.length - 1];
      window.CuyPlaces.openPlace('park');
      const parkCall = window.__p51.presentCalls[window.__p51.presentCalls.length - 1];
      return { salonCall, gardenCall, parkCall };
    });
    assert.deepStrictEqual(f56.salonCall.list.map(p => p.id), ['pig_1'], 'F5 salon must only receive pig_1');
    assert.deepStrictEqual(f56.gardenCall.list.map(p => p.id), ['pig_2'], 'F6 garden must only receive pig_2');
    assert.strictEqual(f56.gardenCall.list[0].pinned, true, 'F6 garden pig_2 must preserve pinned:true');
    assert.deepStrictEqual(f56.parkCall.list, [], 'F6 park must receive empty list');
    console.log('F5 & F6 OK');

    // F7: weather-layer-outdoor-only
    const f7 = await page.evaluate(() => {
      window.__p51.weatherAdds = [];
      window.__p51.weatherRemoves = [];
      ['salon', 'dorm', 'garden', 'park', 'farm'].forEach(s => window.CuyPlaces.openPlace(s));
      return { adds: window.__p51.weatherAdds, removes: window.__p51.weatherRemoves };
    });
    assert(f7.adds.includes('garden') && f7.adds.includes('park') && f7.adds.includes('farm'), 'F7 weather layer must be added for outdoor scenes');
    assert(!f7.adds.includes('salon') && !f7.adds.includes('dorm'), 'F7 weather layer must NOT be added for indoor scenes');
    assert(f7.removes.includes('salon') && f7.removes.includes('dorm'), 'F7 weather layer must be removed for indoor scenes');
    console.log('F7 OK');

    // F8: hotspots-set-per-scene
    const f8 = await page.evaluate(() => {
      window.__p51.hotspotCalls = [];
      window.CuyPlaces.openPlace('garden');
      const gardenHs = window.__p51.hotspotCalls[window.__p51.hotspotCalls.length - 1];
      window.CuyPlaces.openPlace('salon');
      const salonHs = window.__p51.hotspotCalls[window.__p51.hotspotCalls.length - 1];
      return { gardenCount: gardenHs ? gardenHs.list.length : -1, salonHs };
    });
    assert(f8.gardenCount >= 0, 'F8 setHotspots must be called for garden');
    assert(f8.salonHs && Array.isArray(f8.salonHs.list), 'F8 setHotspots must be called for salon');
    console.log('F8 OK');

    // F9: night-outdoor-lamps-on
    const f9 = await page.evaluate(() => {
      window.__cuyNow = new Date(2026, 0, 1, 22, 0, 0).getTime();
      const placed = [
        { uid: 't1', itemId: 'torch', x: 3, y: 4 },
        { uid: 'o1', itemId: 'lamp_oil', x: 5, y: 4 },
        { uid: 'c1', itemId: 'campfire', x: 7, y: 5 }
      ];
      const built = window.CuyLight.build('garden', placed);
      return (built && built.sources || []).map(s => ({ id: s.itemId, on: s.on }));
    });
    assert(f9.length === 3 && f9.every(s => s.on === true), 'F9 outdoor lamps/torches/campfire must be auto-on at 22:00');
    console.log('F9 OK');

    // F10: missing-modules-no-crash
    const f10 = await page.evaluate(() => {
      window.CuyWeather = undefined;
      window.CuyHotspots = undefined;
      window.CuyPlaces.openPlace('garden');
      window.CuyPlaces.openPlace('salon');
      return window.CuyPlaces.getCurrentPlace();
    });
    assert.strictEqual(f10, 'salon', 'F10 scene switching must work without CuyWeather/CuyHotspots');
    console.log('F10 OK');

    // F11: no-console-errors
    assert.strictEqual(consoleErrors.length, 0, `F11 console errors: ${consoleErrors.join('; ')}`);
    console.log('F11 OK');
  } finally {
    await browser.close();
    server.close();
  }
})();
