'use strict';

const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const STRICT = process.env.STRICT === '1';

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (e) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

async function run() {
  const defects = [];
  function pass(id, detail) {
    console.log(`PASS ${id}${detail ? ': ' + detail : ''}`);
  }
  function defect(id, detail) {
    console.log(`DEFECT ${id}: ${detail}`);
    defects.push({ id, detail });
  }

  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const page = await openHome(browser, { base: server.base, query: 'mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForTimeout(400);

    await page.waitForFunction(
      () => window.CuyPlaces && window.CuyScenes && window.CuyHotspots && window.CanvasPig && window.Lights && window.bridge,
      { timeout: 10000 }
    );

    await page.evaluate(async () => {
      window.__cuyNow = '22:00';
      if (window.CuyScenes && typeof window.CuyScenes.load === 'function') {
        await window.CuyScenes.load();
      }
      const st = window.bridge.currentState || window.bridge.getState();
      if (st) {
        if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function') {
          const m = window.CuyScenesMock.state('all_unlocked');
          st.places = st.places || {};
          st.places.order = m.places.order;
          if (!st.places.pigLocations) st.places.pigLocations = m.places.pigLocations;
          st.rooms = st.rooms || { layouts: {}, owned: {}, catalog: [] };
          st.rooms.layouts = Object.assign({}, st.rooms.layouts || {}, m.rooms.layouts);
        }
        if (st.places && Array.isArray(st.places.places)) {
          st.places.places.forEach(p => { p.unlocked = true; });
        }
        if (st.places && Array.isArray(st.places.order)) {
          st.places.order.forEach(p => { p.locked = false; });
        }
        if (!st.rooms) st.rooms = {};
        if (!st.rooms.layouts) st.rooms.layouts = {};
        if (!st.rooms.layouts.salon) {
          st.rooms.layouts.salon = { name: 'Salon', cols: 12, rows: 7, wallRows: 2, wallpaper: '', floor: '', items: [] };
        }
        if (!Array.isArray(st.rooms.layouts.salon.items)) {
          st.rooms.layouts.salon.items = [];
        }
        if (!st.rooms.layouts.salon.items.some(it => it && it.itemId === 'lamp_floor')) {
          st.rooms.layouts.salon.items.push({ uid: 'u_lamp_salon', itemId: 'lamp_floor', x: 5, y: 3, flip: false, variant: 0 });
        }
        if (st.rooms.layouts.garden && Array.isArray(st.rooms.layouts.garden.items)) {
          if (!st.rooms.layouts.garden.items.some(it => it && (it.itemId === 'lantern_garden' || it.itemId === 'lamp_post'))) {
            st.rooms.layouts.garden.items.push({ uid: 'fx:garden:lantern_1', itemId: 'lantern_garden', x: 7, y: 6, flip: false, variant: 0 });
          }
        }
        if (typeof window.bridge.broadcastState === 'function') {
          window.bridge.broadcastState();
        }
      }
    });
    await page.waitForTimeout(200);

    async function goToScene(sceneId, opts = {}) {
      await page.evaluate(({ sid, pigHere }) => {
        const st = window.bridge && (window.bridge.currentState || (window.bridge.getState && window.bridge.getState()));
        if (st && st.places) {
          if (Array.isArray(st.places.order)) {
            st.places.order.forEach(p => { p.locked = false; });
          }
          if (Array.isArray(st.places.places)) {
            st.places.places.forEach(p => { p.unlocked = true; });
          }
          if (pigHere !== undefined) {
            const targetScene = pigHere ? sid : 'dorm';
            if (Array.isArray(st.places.pigLocations)) {
              st.places.pigLocations.forEach(p => {
                p.scene = targetScene;
                if (p.sceneId !== undefined) p.sceneId = targetScene;
                if (p.Scene !== undefined) p.Scene = targetScene;
              });
            } else {
              st.places.pigLocations = [{ pigId: 'pig_1', scene: targetScene, pinned: false }];
            }
          }
        }
        if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
          window.CuyPlaces.setCurrentPlace(sid);
        } else if (window.CanvasPig && typeof window.CanvasPig.setScene === 'function') {
          window.CanvasPig.setScene(sid);
        }
      }, { sid: sceneId, pigHere: opts.pigHere });
      await page.waitForTimeout(250);
    }

    // C1: footprint full pixel width (room w:2,h:2 -> 32px; market w:3,h:2 -> 48px)
    await goToScene('salon');
    const c1 = await page.evaluate(() => {
      const cp = window.CanvasPig;
      if (!cp || typeof cp.isFree !== 'function') return { error: 'CanvasPig.isFree missing' };
      if (typeof cp.setThings !== 'function') return { error: 'CanvasPig.setThings missing' };

      cp.setThings([
        { id: 'test_desk', x: 120, y: 114, w: 2, h: 2, anchorX: 16, anchorY: 32, _stageOffsetApplied: true }
      ]);
      const roomBlocked = [];
      for (let px = 104; px < 136; px++) {
        roomBlocked.push(cp.isFree(px, 112));
      }
      const roomFalse = roomBlocked.filter(v => v === false).length;

      cp.setThings([
        { id: 'test_stall', x: 120, y: 114, w: 3, h: 2, anchorX: 24, anchorY: 32, _stageOffsetApplied: true }
      ]);
      const stallBlocked = [];
      for (let px = 96; px < 144; px++) {
        stallBlocked.push(cp.isFree(px, 112));
      }
      const stallFalse = stallBlocked.filter(v => v === false).length;

      return {
        roomFalse,
        stallFalse,
        thingsCount: (cp.debug().things || []).length,
        roomWalkableAt112: cp.isFree(60, 112)
      };
    });

    if (c1.error) {
      defect('C1-footprint-full-pixel-width', c1.error);
    } else if (c1.roomFalse < 32 || c1.stallFalse < 48) {
      defect('C1-footprint-full-pixel-width',
        `room blocked ${c1.roomFalse}/32 px, stall blocked ${c1.stallFalse}/48 px (things=${c1.thingsCount}, walkableAt112=${c1.roomWalkableAt112})`);
    } else {
      pass('C1-footprint-full-pixel-width', `room ${c1.roomFalse}/32 px, stall ${c1.stallFalse}/48 px blocked`);
    }

    // C2: pigs never walk through items in salon, garden, market, park (150 steps)
    const scenesForWalk = ['salon', 'garden', 'market', 'park'];
    const c2Violations = [];
    for (const sid of scenesForWalk) {
      await goToScene(sid, { pigHere: true });
      const res = await page.evaluate((sceneId) => {
        const cp = window.CanvasPig;
        if (!cp || typeof cp.isFree !== 'function' || typeof cp.debug !== 'function') {
          return { error: 'CanvasPig.isFree or debug missing' };
        }
        const violations = [];
        for (let step = 0; step < 150; step++) {
          if (typeof cp.fastForward === 'function') {
            cp.fastForward(100);
          } else if (typeof cp.step === 'function') {
            cp.step(100);
          }
          const inst = (window.CuyPig && window.CuyPig.mainInstance) || cp.instance;
          const dbg = cp.debug();
          const pigs = (inst && inst.scenePigs && typeof inst.scenePigs.entries === 'function')
            ? inst.scenePigs.entries()
            : ((dbg && dbg.pigs) ? dbg.pigs : []);
          for (const p of pigs) {
            if (!cp.isFree(p.x, p.y)) {
              violations.push({ sceneId, step, id: p.id, x: p.x, y: p.y });
              if (violations.length >= 3) break;
            }
          }
          if (violations.length >= 3) break;
        }
        return { violations };
      }, sid);

      if (res.error) {
        c2Violations.push({ sceneId: sid, error: res.error });
      } else if (res.violations.length > 0) {
        c2Violations.push(...res.violations);
      }
    }
    if (c2Violations.length > 0) {
      defect('C2-pigs-never-walk-through-items', JSON.stringify(c2Violations.slice(0, 4)));
    } else {
      pass('C2-pigs-never-walk-through-items', '150 steps x 4 scenes clean');
    }

    // C3: lamp hotspots pixel sized (w >= 14, h >= 14) in salon, garden, park
    const lampScenes = ['salon', 'garden', 'park'];
    const c3Failures = [];
    for (const sid of lampScenes) {
      await goToScene(sid);
      const res = await page.evaluate(() => {
        const cp = window.CanvasPig;
        const hotspots = (cp && typeof cp.getHotspots === 'function') ? cp.getHotspots() : ((cp && cp.debug && cp.debug().hotspots) || []);
        const lamps = (hotspots || []).filter(h => h && (h.kind === 'lamp' || h.id === 'lamp_toggle' || h.type === 'lamp_toggle'));
        const bad = lamps.filter(h => {
          const r = h.rect || [0, 0, 0, 0];
          return (r[2] - r[0]) < 14 || (r[3] - r[1]) < 14;
        });
        return { count: lamps.length, bad, totalHotspots: (hotspots || []).length };
      });
      if (res.count === 0) {
        c3Failures.push(`${sid}: 0 lamp hotspots found (total=${res.totalHotspots})`);
      } else if (res.bad.length > 0) {
        c3Failures.push(`${sid}: small lamp hotspot(s) ${JSON.stringify(res.bad)}`);
      }
    }
    if (c3Failures.length > 0) {
      defect('C3-lamp-hotspots-pixel-sized', c3Failures.join('; '));
    } else {
      pass('C3-lamp-hotspots-pixel-sized', 'all lamp hotspots >= 14x14 px in salon, garden, park');
    }

    // Helper to click hotspot center on #pigCanvas
    async function clickHotspotCenter(rect) {
      const box = await page.evaluate((r) => {
        const cp = window.CanvasPig;
        const cx = (r[0] + r[2]) / 2;
        const cy = (r[1] + r[3]) / 2;
        if (cp && typeof cp.toClient === 'function') {
          const pt = cp.toClient(cx, cy);
          if (pt && Number.isFinite(pt.clientX) && Number.isFinite(pt.clientY)) {
            return { clientX: pt.clientX, clientY: pt.clientY };
          }
          if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
            return { clientX: pt.x, clientY: pt.y };
          }
        }
        const canvas = document.getElementById('pigCanvas');
        if (!canvas) return null;
        const cr = canvas.getBoundingClientRect();
        const cw = canvas.width || 256;
        const ch = canvas.height || 144;
        return {
          clientX: cr.left + (cx / cw) * cr.width,
          clientY: cr.top + (cy / ch) * cr.height
        };
      }, rect);
      if (!box) throw new Error('#pigCanvas not found');
      await page.mouse.click(box.clientX, box.clientY);
      await page.waitForTimeout(150);
    }

    function getLampStateScript(uid) {
      const dbg = window.CanvasPig.debug();
      const ls = dbg.lightScene || {};
      const sources = Array.isArray(ls.sources)
        ? ls.sources.filter(s => s && s.on !== false).length
        : (Array.isArray(ls.lights) ? ls.lights.filter(s => s && s.on !== false).length : null);
      return {
        hasCuyLights: !!window.CuyLights,
        isOff: window.CuyLights && typeof window.CuyLights.isOff === 'function' ? window.CuyLights.isOff(uid) : null,
        sources,
        lightScene: ls
      };
    }

    // C4: indoor lamp click toggles off and on in salon
    await goToScene('salon', { pigHere: false });
    const roomLamp = await page.evaluate(() => {
      const cp = window.CanvasPig;
      const hotspots = (cp && typeof cp.getHotspots === 'function') ? cp.getHotspots() : [];
      const lamps = hotspots.filter(h => h && (h.kind === 'lamp' || h.id === 'lamp_toggle'));
      if (lamps.length === 0) return null;
      const lamp = lamps[0];
      return { uid: lamp.uid, rect: lamp.rect };
    });

    if (!roomLamp || !roomLamp.uid) {
      defect('C4-indoor-lamp-click-toggles-off-and-on', 'No lamp hotspot with uid found in salon');
    } else {
      const before = await page.evaluate(getLampStateScript, roomLamp.uid);
      await clickHotspotCenter(roomLamp.rect);
      const afterFirst = await page.evaluate(getLampStateScript, roomLamp.uid);
      await clickHotspotCenter(roomLamp.rect);
      const afterSecond = await page.evaluate(getLampStateScript, roomLamp.uid);

      const offOk = before.hasCuyLights ? (afterFirst.isOff === true && afterSecond.isOff === false) : true;
      const srcOk = (typeof before.sources === 'number')
        ? (afterFirst.sources < before.sources && afterSecond.sources === before.sources)
        : (JSON.stringify(afterFirst.lightScene) !== JSON.stringify(before.lightScene) &&
           JSON.stringify(afterSecond.lightScene) === JSON.stringify(before.lightScene));

      if (!offOk || !srcOk) {
        defect('C4-indoor-lamp-click-toggles-off-and-on',
          `before=${JSON.stringify(before)}, after1=${JSON.stringify(afterFirst)}, after2=${JSON.stringify(afterSecond)}`);
      } else {
        pass('C4-indoor-lamp-click-toggles-off-and-on', `uid=${roomLamp.uid} toggled off and back on`);
      }
    }

    // C5: outdoor lantern click toggles in garden and park
    const c5Failures = [];
    for (const sid of ['garden', 'park']) {
      await goToScene(sid, { pigHere: false });
      const lantern = await page.evaluate(() => {
        const cp = window.CanvasPig;
        const hotspots = (cp && typeof cp.getHotspots === 'function') ? cp.getHotspots() : [];
        const lamps = hotspots.filter(h => h && (h.kind === 'lamp' || h.id === 'lamp_toggle'));
        const target = lamps.find(h => /garden_lantern|lantern_post/.test(h.uid || h.label || '')) || lamps[0];
        if (!target) return null;
        return { uid: target.uid, rect: target.rect };
      });
      if (!lantern || !lantern.uid) {
        c5Failures.push(`${sid}: no lantern hotspot found`);
        continue;
      }
      const before = await page.evaluate(getLampStateScript, lantern.uid);
      await clickHotspotCenter(lantern.rect);
      const after1 = await page.evaluate(getLampStateScript, lantern.uid);
      await clickHotspotCenter(lantern.rect);
      const after2 = await page.evaluate(getLampStateScript, lantern.uid);

      const toggled = before.hasCuyLights
        ? (after1.isOff !== before.isOff && after2.isOff === before.isOff)
        : (JSON.stringify(after1.lightScene) !== JSON.stringify(before.lightScene) &&
           JSON.stringify(after2.lightScene) === JSON.stringify(before.lightScene));
      if (!toggled) {
        c5Failures.push(`${sid} (${lantern.uid}): before=${JSON.stringify(before)}, after1=${JSON.stringify(after1)}, after2=${JSON.stringify(after2)}`);
      }
    }
    if (c5Failures.length > 0) {
      defect('C5-outdoor-lantern-click-toggles', c5Failures.join('; '));
    } else {
      pass('C5-outdoor-lantern-click-toggles', 'garden and park lanterns toggled off and back on');
    }

    // C6: no console errors
    if (page.__errors.length > 0) {
      defect('C6-no-console-errors', page.__errors.join(' | '));
    } else {
      pass('C6-no-console-errors');
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (STRICT && defects.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
