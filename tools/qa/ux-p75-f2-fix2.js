'use strict';

const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const STRICT = process.env.STRICT === '1';

async function launchBrowser() {
  for (const opts of [
    { headless: true },
    { channel: 'msedge', headless: true },
    { channel: 'chrome', headless: true }
  ]) {
    try {
      return await chromium.launch(opts);
    } catch (_) {}
  }
  return await chromium.launch({ headless: true });
}

async function main() {
  const server = await startServer();
  const browser = await launchBrowser();
  const defects = [];

  function pass(id, detail) {
    console.log(`PASS ${id}: ${detail}`);
  }

  function defect(id, detail) {
    console.log(`DEFECT ${id}: ${detail}`);
    defects.push({ id, detail });
  }

  try {
    const page = await openHome(browser, { query: 'mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForFunction(
      () => window.CanvasPig && window.CanvasPig.instance && typeof window.CanvasPig.debug === 'function' && window.CanvasPig.debug().pigs && window.CanvasPig.debug().pigs.length > 0,
      { timeout: 10000 }
    );
    await page.evaluate(async () => {
      if (window.CuyScenes && typeof window.CuyScenes.load === 'function') {
        await window.CuyScenes.load();
      }
      const st = window.bridge.currentState || window.bridge.getState();
      if (st && window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function') {
        const m = window.CuyScenesMock.state('all_unlocked');
        st.places = st.places || {};
        st.places.order = m.places.order;
        st.rooms = st.rooms || { layouts: {}, owned: {}, catalog: [] };
        st.rooms.layouts = Object.assign({}, st.rooms.layouts || {}, m.rooms.layouts);
        if (typeof window.bridge.broadcastState === 'function') {
          window.bridge.broadcastState();
        }
      }
    });
    await page.waitForTimeout(250);

    // T1: No brown side bars in .stage-viewport and no bottom clipping / scrollbar at 420x640
    const t1 = await page.evaluate(() => {
      const vp = document.querySelector('.stage-viewport').getBoundingClientRect();
      const cv = document.getElementById('pigCanvas').getBoundingClientRect();
      const more = document.getElementById('btnMore').getBoundingClientRect();
      const scrollH = document.documentElement.scrollHeight;
      return {
        vpW: vp.width,
        vpH: vp.height,
        cvW: cv.width,
        cvH: cv.height,
        moreBottom: more.bottom,
        scrollH
      };
    });
    if (Math.abs(t1.vpW - t1.cvW) <= 2 && t1.moreBottom <= 640 && t1.scrollH <= 640) {
      pass('T1-no-side-bars-no-bottom-clip', `cv=${t1.cvW.toFixed(1)}x${t1.cvH.toFixed(1)} in vp=${t1.vpW.toFixed(1)}x${t1.vpH.toFixed(1)}, btnMore.bottom=${t1.moreBottom.toFixed(1)}<=640, scrollH=${t1.scrollH}`);
    } else {
      defect('T1', `Side bars or bottom clip detected: ${JSON.stringify(t1)}`);
    }

    // T2: Full-height #stageEdgeLeft / #stageEdgeRight arrows switch places on click and highlight on edgeHold
    const t2 = await page.evaluate(async () => {
      const leftBtn = document.getElementById('stageEdgeLeft');
      const rightBtn = document.getElementById('stageEdgeRight');
      const inst = window.CanvasPig.instance;
      if (!leftBtn || !rightBtn || !inst) return { ok: false, reason: 'missing edge buttons or instance' };
      const lr = leftBtn.getBoundingClientRect();
      const rr = rightBtn.getBoundingClientRect();
      const beforeScene = window.CanvasPig.debug().sceneId;
      rightBtn.click();
      await new Promise(r => setTimeout(r, 80));
      const afterRight = window.CanvasPig.debug().sceneId;
      leftBtn.click();
      await new Promise(r => setTimeout(r, 80));
      const afterLeft = window.CanvasPig.debug().sceneId;

      inst.edgeHold = { side: 'right', startTime: performance.now(), progress: 0.5, fired: false };
      if (typeof inst.syncEdgeArrowDom === 'function') inst.syncEdgeArrowDom();
      const activeRight = rightBtn.classList.contains('edge-active');
      inst.clearEdgeHold();
      const clearedRight = !rightBtn.classList.contains('edge-active');
      return {
        ok: lr.height >= 120 && rr.height >= 120 && beforeScene !== afterRight && afterLeft === beforeScene && activeRight && clearedRight,
        leftH: lr.height,
        rightH: rr.height,
        beforeScene,
        afterRight,
        afterLeft,
        activeRight,
        clearedRight
      };
    });
    if (t2.ok) {
      pass('T2-full-height-edge-arrows', `leftH=${t2.leftH.toFixed(0)}px, rightH=${t2.rightH.toFixed(0)}px, ${t2.beforeScene}->${t2.afterRight}->${t2.afterLeft}, edge-active=true->false`);
    } else {
      defect('T2', `Edge arrows check failed: ${JSON.stringify(t2)}`);
    }

    // T3: Room window elevated above baseboard & not clipped at top
    const t3 = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const roomKeys = Object.keys((st && st.rooms && st.rooms.layouts) || {});
      let win = null;
      let usedRoom = null;
      for (const rk of ['pig:pig_1', 'salon'].concat(roomKeys)) {
        const things = window.CuyScenes.placedThings(st, rk);
        const found = (things || []).find(t => t && (t.layer === 'wall' || String(t.itemId).startsWith('window_')));
        if (found) {
          win = found;
          usedRoom = rk;
          break;
        }
      }
      if (!win) {
        // Test directly with a wall window item in pig:pig_1
        usedRoom = 'pig:pig_1';
        st.rooms.layouts[usedRoom] = st.rooms.layouts[usedRoom] || { cols: 10, rows: 6, wallRows: 2, items: [] };
        st.rooms.layouts[usedRoom].items.push({ uid: 'test_win', itemId: 'window_sun', x: 4, y: 0 });
        const things = window.CuyScenes.placedThings(st, usedRoom);
        win = (things || []).find(t => t && String(t.itemId).startsWith('window_'));
      }
      if (!win) return { ok: false, reason: 'no window item found' };
      const layout = st.rooms && st.rooms.layouts && st.rooms.layouts[usedRoom];
      const cols = (layout && layout.cols) || 12;
      const rows = (layout && layout.rows) || 7;
      const off = window.CuyRoomGeometry.stageOffset(cols, rows);
      const geom = window.CuyRoomGeometry.geometry(layout || { cols, rows, wallRows: 2 });
      const wallTopY = (off.x > 0 || off.y > 0) ? Math.max(0, off.y - 8) : 0;
      const wallBottomY = off.y + ((geom && geom.wallH) || 32);
      const topY = off.y + (win.y - win.anchorY);
      const bottomY = topY + win.sh;
      return {
        ok: topY >= Math.max(2, wallTopY) && bottomY <= wallBottomY - 6,
        usedRoom,
        topY,
        bottomY,
        wallTopY,
        wallBottomY
      };
    });
    if (t3.ok) {
      pass('T3-room-window-height', `${t3.usedRoom}: window topY=${t3.topY} (>=2), bottomY=${t3.bottomY} (<= wallBottomY-6=${t3.wallBottomY - 6})`);
    } else {
      defect('T3', `Room window height check failed: ${JSON.stringify(t3)}`);
    }

    // T4: Park trees and gazebo do not sit on the water stream (y = 52..68 px)
    const t4 = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const things = window.CuyScenes.placedThings(st, 'park');
      const offenders = [];
      for (const t of things) {
        if (!t) continue;
        if (t.itemId === 'tree_big' || t.itemId === 'gazebo') {
          if (t.y > 48 && t.y < 80) {
            offenders.push({ id: t.id, itemId: t.itemId, y: t.y });
          }
        }
      }
      return { count: things.length, offenders };
    });
    if (t4.count >= 10 && t4.offenders.length === 0) {
      pass('T4-park-trees-gazebo-clear-of-stream', `park items=${t4.count}, stream offenders=0`);
    } else {
      defect('T4', `Park stream overlap: ${JSON.stringify(t4)}`);
    }

    // T5: Pig depthScale differs across park, garden, market, and 10x6 vs 14x8 rooms
    const t5 = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      const st = window.bridge.currentState || window.bridge.getState();
      const prevScene = window.CanvasPig.debug().sceneId;
      inst.setScene(window.CuyScenes.def('park', null, st));
      const parkDs = (inst.depthScale || []).slice();
      inst.setScene(window.CuyScenes.def('garden', null, st));
      const gardenDs = (inst.depthScale || []).slice();
      inst.setScene(window.CuyScenes.def('market', null, st));
      const marketDs = (inst.depthScale || []).slice();
      const s10 = window.CuyRoomGeometry.pigScaleForRoom(10, 6);
      const s14 = window.CuyRoomGeometry.pigScaleForRoom(14, 8);
      inst.setScene(window.CuyScenes.def(prevScene, null, st));
      return {
        parkDs,
        gardenDs,
        marketDs,
        s10,
        s14,
        ok: parkDs[0] < gardenDs[0] && gardenDs[0] < marketDs[0] && s10[0] < s14[0]
      };
    });
    if (t5.ok) {
      pass('T5-per-scene-and-room-pig-scale', `park=[${t5.parkDs}], garden=[${t5.gardenDs}], market=[${t5.marketDs}], room10x6=[${t5.s10}], room14x8=[${t5.s14}]`);
    } else {
      defect('T5', `Scale differentiation failed: ${JSON.stringify(t5)}`);
    }

    // T6: Walking and dragging obey obstacle collisions
    const t6 = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      const st = window.bridge.currentState || window.bridge.getState();
      if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
        window.CuyPlaces.setCurrentPlace('park');
      } else {
        inst.setScene(window.CuyScenes.def('park', null, st));
        inst.setThings(window.CuyScenes.placedThings(st, 'park'));
      }
      const fps = inst.standingFootprints || [];
      if (fps.length === 0) return { ok: false, reason: 'no standingFootprints in park' };
      const box = fps.find(f => f[1] >= 66 && f[3] <= 135) || fps[0];
      const midX = (box[0] + box[2]) * 0.5;
      const midY = Math.max(70, Math.min(130, (box[1] + box[3]) * 0.5));
      const insideFree = inst.isFree(midX, midY);
      const startPt = inst.snapToFreeCell(box[0] - 8, midY);
      const clamped = inst.clampDragToFree(startPt.x, startPt.y, midX, midY);
      const clampedFree = inst.isFree(clamped.x, clamped.y);

      let walkViolations = 0;
      for (let i = 0; i < 30; i++) {
        inst.update(32);
        const entries = inst.getPigEntries();
        for (const p of entries) {
          if (!inst.isFree(p.x, p.y)) walkViolations++;
        }
      }
      return {
        ok: !insideFree && clampedFree && walkViolations === 0,
        insideFree,
        clampedFree,
        walkViolations
      };
    });
    if (t6.ok) {
      pass('T6-walk-and-drag-collisions', `insideObstacleFree=${t6.insideFree}, dragClampedFree=${t6.clampedFree}, walkViolations=${t6.walkViolations}`);
    } else {
      defect('T6', `Collision check failed: ${JSON.stringify(t6)}`);
    }

    // T7: Drag lifts pig (held anim + pigAirY > 0) and fast release triggers TossPhysics (fall -> bounce/land)
    const t7 = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
        window.CuyPlaces.setCurrentPlace('salon');
      }
      inst.pigVisible = true;
      const [x0, y0, x1, y1] = inst.walk || [10, 96, 230, 126];
      const startFree = inst.snapToFreeCell(Math.round((x0 + x1) * 0.35), Math.round((y0 + y1) * 0.6));
      inst.pigX = startFree.x;
      inst.pigY = startFree.y;
      inst.pigAirY = 0;

      const c0 = inst.toClient(inst.pigX, inst.pigY - 8);
      inst.canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: c0.clientX, clientY: c0.clientY, pointerId: 1, bubbles: true }));
      const c1 = inst.toClient(inst.pigX + 25, inst.pigY - 22);
      inst.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: c1.clientX, clientY: c1.clientY, pointerId: 1, bubbles: true }));

      const heldAnim = inst.currentAnim;
      const heldAirY = inst.pigAirY;

      // Feed two timed samples to trigger DragVelocity throw
      const now = performance.now();
      inst._dragSamples = [
        { x: inst.pigX, y: inst.pigY - 10, t: now - 30 },
        { x: inst.pigX + 24, y: inst.pigY - 26, t: now }
      ];
      inst.canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: c1.clientX, clientY: c1.clientY, pointerId: 1, bubbles: true }));

      const tossActive = !!inst._toss;
      const fallAnim = inst.currentAnim;
      const xAtRelease = inst.pigX;

      let sawLand = false;
      for (let i = 0; i < 45; i++) {
        inst.update(25);
        if (inst.currentAnim === 'land') sawLand = true;
      }
      const xAfterToss = inst.pigX;
      return {
        ok: heldAnim === 'held' && heldAirY >= 10 && tossActive && fallAnim === 'fall' && sawLand && Math.abs(xAfterToss - xAtRelease) > 5,
        heldAnim,
        heldAirY,
        tossActive,
        fallAnim,
        sawLand,
        dxToss: +(xAfterToss - xAtRelease).toFixed(1)
      };
    });
    if (t7.ok) {
      pass('T7-drag-lift-and-toss-physics', `heldAnim=${t7.heldAnim}, airY=${t7.heldAirY}, toss=${t7.tossActive}, fallAnim=${t7.fallAnim}, sawLand=${t7.sawLand}, dxToss=${t7.dxToss}px`);
    } else {
      defect('T7', `Toss physics check failed: ${JSON.stringify(t7)}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`SUMMARY: defects=${defects.length}`);
  if (STRICT && defects.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
