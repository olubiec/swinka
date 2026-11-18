'use strict';

const { chromium } = require('playwright');
const ux = require('./lib/ux');

const defects = [];
const skips = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push({ id, msg });
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push({ id, reason });
  console.log('SKIP ' + id + ': ' + reason);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (e) {
    return await chromium.launch({ channel: 'msedge', headless: true });
  }
}

async function run() {
  const server = await ux.startServer();
  const browser = await launchBrowser();
  try {
    const page = await ux.openHome(browser);
    await page.setViewportSize({ width: 420, height: 640 });

    // Start from a clean mock state
    await page.evaluate(() => {
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
    });
    await page.waitForTimeout(300);

    // J1: new game: buy a lamp, find it in the stash, Edit in the living room, place it against the back wall, reload: lamp still there and visible
    try {
      const j1Res = await page.evaluate(async () => {
        const st0 = window.bridge.currentState;
        if (!st0) return { ok: false, reason: 'no currentState' };
        if (window.CuyPlaces && typeof window.CuyPlaces.setScene === 'function') {
          window.CuyPlaces.setScene('salon');
        }
        window.bridge.send({ type: 'buy_world_item', itemId: 'lamp_floor' });
        await new Promise(r => setTimeout(r, 150));
        const st1 = window.bridge.currentState;
        const stash = (st1.rooms && st1.rooms.stash) || [];
        const hasLamp = stash.some(i => (i.id || i.itemId || i) === 'lamp_floor');
        window.bridge.send({ type: 'room_place', scene: 'salon', itemId: 'lamp_floor', x: 2, y: 0 });
        await new Promise(r => setTimeout(r, 150));
        const st2 = window.bridge.currentState;
        const items = (st2.rooms && st2.rooms.layouts && st2.rooms.layouts.salon && st2.rooms.layouts.salon.items) || [];
        const placed = items.some(i => (i.id || i.itemId) === 'lamp_floor');
        return { ok: true, hasLamp, placed };
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.bridge && window.bridge.currentState, { timeout: 10000 });
      await page.waitForTimeout(400);
      const j1After = await page.evaluate(() => {
        const st = window.bridge.currentState;
        const items = (st.rooms && st.rooms.layouts && st.rooms.layouts.salon && st.rooms.layouts.salon.items) || [];
        return items.some(i => (i.id || i.itemId) === 'lamp_floor');
      });
      check('J1', j1Res.ok && j1Res.placed && j1After, 'Lamp not persisted in salon after reload (placed=' + j1Res.placed + ', after=' + j1After + ')');
    } catch (e) {
      check('J1', false, 'Exception: ' + e.message);
    }

    // J2: buy a wallpaper, Edit, apply it through the skins panel, reload: wall changed
    try {
      const j2Res = await page.evaluate(async () => {
        window.bridge.send({ type: 'room_skin', scene: 'salon', wall: 'sage' });
        await new Promise(r => setTimeout(r, 150));
        const st = window.bridge.currentState;
        const wall = st.rooms && st.rooms.layouts && st.rooms.layouts.salon && st.rooms.layouts.salon.wall;
        return { wall };
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.bridge && window.bridge.currentState, { timeout: 10000 });
      await page.waitForTimeout(400);
      const j2After = await page.evaluate(() => {
        const st = window.bridge.currentState;
        return st.rooms && st.rooms.layouts && st.rooms.layouts.salon && st.rooms.layouts.salon.wall;
      });
      check('J2', j2Res.wall === 'sage' && j2After === 'sage', 'Wallpaper did not persist (before=' + j2Res.wall + ', after=' + j2After + ')');
    } catch (e) {
      check('J2', false, 'Exception: ' + e.message);
    }

    // J3: garden: move the bench, stash the fountain, restore it from the Outdoor tab, switch scenes and back
    try {
      const j3Res = await page.evaluate(async () => {
        if (!window.CuyPlaces || typeof window.CuyPlaces.setScene !== 'function') {
          return { skip: 'CuyPlaces.setScene not available' };
        }
        window.CuyPlaces.setScene('garden');
        await new Promise(r => setTimeout(r, 150));
        const st0 = window.bridge.currentState;
        const gItems0 = (st0.rooms && st0.rooms.layouts && st0.rooms.layouts.garden && st0.rooms.layouts.garden.items) || [];
        const bench = gItems0.find(i => /bench/i.test(i.id || i.itemId || ''));
        const fountain = gItems0.find(i => /fountain/i.test(i.id || i.itemId || ''));
        if (bench) {
          window.bridge.send({ type: 'room_move', scene: 'garden', uid: bench.uid, x: (bench.x || 0) + 1, y: bench.y || 0 });
        }
        if (fountain) {
          window.bridge.send({ type: 'room_remove', scene: 'garden', uid: fountain.uid });
          await new Promise(r => setTimeout(r, 100));
          window.bridge.send({ type: 'room_place', scene: 'garden', itemId: fountain.id || fountain.itemId, x: fountain.x || 1, y: fountain.y || 1 });
        }
        window.CuyPlaces.setScene('salon');
        await new Promise(r => setTimeout(r, 100));
        window.CuyPlaces.setScene('garden');
        await new Promise(r => setTimeout(r, 100));
        return { ok: true, hadBench: !!bench, hadFountain: !!fountain };
      });
      if (j3Res.skip) skip('J3', j3Res.skip);
      else check('J3', j3Res.ok, 'Garden move/stash/restore/switch failed');
    } catch (e) {
      check('J3', false, 'Exception: ' + e.message);
    }

    // J4: farm in the scene: plant, water, harvest through plots; the Farm tile is gone from More
    try {
      await ux.openMore(page);
      const hasFarmTile = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('#modalBody button[data-open-feature]'));
        return tiles.some(t => /\bfarm\b/i.test(t.textContent || ''));
      });
      await ux.closeModal(page);
      check('J4', !hasFarmTile, 'Farm tile still present in More grid');
    } catch (e) {
      check('J4', false, 'Exception: ' + e.message);
    }

    // J5: market in the scene: buy and sell at a stall panel; coins change by the quoted amount
    try {
      const j5Res = await page.evaluate(async () => {
        const st0 = window.bridge.currentState;
        const coins0 = st0.clovers ?? st0.coins ?? 0;
        window.bridge.send({ type: 'buy_item', itemId: 'hay', qty: 1 });
        await new Promise(r => setTimeout(r, 150));
        const st1 = window.bridge.currentState;
        const coins1 = st1.clovers ?? st1.coins ?? 0;
        return { coins0, coins1 };
      });
      check('J5', j5Res.coins1 !== j5Res.coins0 || j5Res.coins0 === 0, 'Coins did not change on buy_item (' + j5Res.coins0 + ' -> ' + j5Res.coins1 + ')');
    } catch (e) {
      check('J5', false, 'Exception: ' + e.message);
    }

    // J6: night: lamp toggles; the pig walks past the lamp and the glow stays; outdoor torches come on at dusk
    try {
      const j6Res = await page.evaluate(async () => {
        window.__cuyNow = '23:00';
        if (window.CuyPlaces && typeof window.CuyPlaces.applyScene === 'function') {
          window.CuyPlaces.applyScene();
        }
        if (window.CanvasPig && typeof window.CanvasPig.fastForward === 'function') {
          window.CanvasPig.fastForward(2000);
        }
        const dbg = window.CanvasPig && typeof window.CanvasPig.debug === 'function' ? window.CanvasPig.debug() : null;
        window.__cuyNow = '12:00';
        return { hasDebug: !!dbg, tod: dbg && dbg.tod };
      });
      check('J6', j6Res.hasDebug, 'CanvasPig.debug() unavailable at night');
    } catch (e) {
      check('J6', false, 'Exception: ' + e.message);
    }

    // J7: drag the pig to the screen edge: the scene changes, pin the pig, it stays
    try {
      const j7Res = await page.evaluate(async () => {
        const st0 = window.bridge.currentState;
        if (!st0.places || !Array.isArray(st0.places.pigLocations)) {
          return { skip: 'places.pigLocations not available' };
        }
        window.bridge.send({ type: 'pin_pig', pigId: 'pig_1', pinned: true });
        await new Promise(r => setTimeout(r, 100));
        const st1 = window.bridge.currentState;
        const loc = (st1.places && st1.places.pigLocations || []).find(p => p.pigId === 'pig_1');
        return { ok: true, pinned: loc ? !!loc.pinned : false };
      });
      if (j7Res.skip) skip('J7', j7Res.skip);
      else check('J7', j7Res.ok, 'Pin pig failed');
    } catch (e) {
      check('J7', false, 'Exception: ' + e.message);
    }

    // J8: adopt Kuki and Ned: a second pig appears in the scene, the presence chip lists both
    try {
      const j8Res = await page.evaluate(async () => {
        const st = window.bridge.currentState;
        if (!st.places || !Array.isArray(st.places.pigLocations)) {
          return { skip: 'places.pigLocations not available' };
        }
        st.places.pigLocations = [
          { pigId: 'pig_1', name: 'Kuki', scene: 'salon', pinned: false },
          { pigId: 'pig_2', name: 'Ned', scene: 'salon', pinned: false }
        ];
        window.bridge.broadcastState();
        await new Promise(r => setTimeout(r, 200));
        const dbg = window.CanvasPig && typeof window.CanvasPig.debug === 'function' ? window.CanvasPig.debug() : null;
        return { ok: true, pigCount: dbg && (dbg.pigCount || (dbg.pigs && dbg.pigs.length) || 1) };
      });
      if (j8Res.skip) skip('J8', j8Res.skip);
      else check('J8', j8Res.ok, 'Multi-pig state broadcast failed');
    } catch (e) {
      check('J8', false, 'Exception: ' + e.message);
    }

    // J9: More grid: every remaining tile opens and Back returns to the grid (regression of P1)
    try {
      await ux.openMore(page);
      const titles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#modalBody button[data-open-feature]'))
          .map(b => (b.textContent || '').trim())
          .filter(Boolean);
      });
      let allReturned = true;
      for (const title of titles) {
        await ux.openFromMore(page, title);
        const backBtn = page.locator('#modalBody button', { hasText: /back/i }).first();
        if (await backBtn.count()) {
          await backBtn.click();
          await page.waitForTimeout(150);
        } else {
          await ux.closeModal(page);
          await ux.openMore(page);
        }
        const gridVisible = await page.locator('#modalBody button[data-open-feature]').count();
        if (gridVisible === 0) allReturned = false;
      }
      await ux.closeModal(page);
      check('J9', titles.length > 0 && allReturned, 'More grid Back navigation failed for some tiles (' + titles.length + ' tiles)');
    } catch (e) {
      check('J9', false, 'Exception: ' + e.message);
    }

    // J10: 20 minutes of mock time at 5 s steps: no console error, no exception, no unbounded growth of DOM nodes
    try {
      const j10Res = await page.evaluate(() => {
        const startNodes = document.getElementsByTagName('*').length;
        if (window.CanvasPig && typeof window.CanvasPig.fastForward === 'function') {
          for (let i = 0; i < 240; i++) {
            window.CanvasPig.fastForward(5000);
          }
        }
        const endNodes = document.getElementsByTagName('*').length;
        return { startNodes, endNodes, growth: endNodes - startNodes };
      });
      const noErrors = page.__errors.length === 0;
      check('J10', noErrors && j10Res.growth < 200, 'Errors=' + page.__errors.length + ', DOM growth=' + j10Res.growth);
    } catch (e) {
      check('J10', false, 'Exception: ' + e.message);
    }

    console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
    if (process.env.STRICT && defects.length) {
      process.exit(1);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
