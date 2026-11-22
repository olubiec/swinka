'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const SHOTS_DIR = path.resolve(__dirname, '..', '..', 'docs', 'qa', 'shots');

async function launchBrowser() {
  for (const opts of [
    { headless: true },
    { channel: 'msedge', headless: true },
    { channel: 'chrome', headless: true }
  ]) {
    try {
      return await chromium.launch(opts);
    } catch (_) { }
  }
  return await chromium.launch({ headless: true });
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
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
    const page = await openHome(browser, { base: server.base, query: 'mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForFunction(
      () => window.CanvasPig && window.CanvasPig.instance && window.CuyPlaces && window.CuyScenes && window.Lights && window.bridge,
      { timeout: 10000 }
    );

    await page.evaluate(async () => {
      if (window.CuyScenes && typeof window.CuyScenes.load === 'function') {
        await window.CuyScenes.load();
      }
      if (window.Lights && typeof window.Lights.load === 'function') {
        await window.Lights.load();
      }
      window.__qaWaitImages = async function () {
        const inst = window.CanvasPig.instance;
        for (let iter = 0; iter < 50; iter++) {
          let pending = false;
          if (inst && inst.imageCache) {
            for (const img of Object.values(inst.imageCache)) {
              if (img && !img.complete && !img.failed) pending = true;
            }
          }
          if (!pending) break;
          await new Promise(r => setTimeout(r, 20));
        }
      };
    });
    await page.waitForTimeout(200);

    // 1. Lamp light source gx, gy matches placed lamp's stage coordinates (not center 128)
    const f1 = await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = st.places || {};
      st.places.order = m.places.order;
      st.places.order.forEach(p => { p.locked = false; });
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
      st.rooms = st.rooms || { layouts: {} };
      st.rooms.layouts = Object.assign({}, st.rooms.layouts || {}, m.rooms && m.rooms.layouts ? m.rooms.layouts : {});
      if (!st.rooms.layouts.salon) {
        st.rooms.layouts.salon = { name: 'Salon', cols: 12, rows: 7, wallRows: 2, wallpaper: '', floor: '', items: [] };
      }
      st.rooms.layouts.salon.items = (st.rooms.layouts.salon.items || []).filter(it => it && !String(it.itemId || '').startsWith('lamp'));
      st.rooms.layouts.salon.items.push({ uid: 'qa_lamp_left', itemId: 'lamp_floor', x: 1, y: 4, flip: false, variant: 0, on: true });
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();

      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      const light = window.CuyLight.build('salon');
      const src = (light && light.sources || []).find(s => s.uid === 'qa_lamp_left' || s.id === 'qa_lamp_left' || s.itemId === 'lamp_floor');
      const thing = (inst.things || []).find(t => t && (t.uid === 'qa_lamp_left' || t.itemId === 'lamp_floor'));
      return { src, thing: thing ? { x: thing.x, y: thing.y, itemId: thing.itemId } : null };
    });

    if (f1.src && f1.thing && Number.isFinite(f1.src.x) && Number.isFinite(f1.src.y) &&
        f1.src.x !== 128 && Math.abs(f1.src.x - f1.thing.x) <= 8 && Math.abs(f1.src.y - f1.thing.y) <= 24) {
      pass('F6-1-lamp-coords', `src=(${f1.src.x},${f1.src.y}), thing=(${f1.thing.x},${f1.thing.y})`);
    } else {
      defect('F6-1-lamp-coords', `Failed: ${JSON.stringify(f1)}`);
    }

    // 2. Pig room walk bounds reach [4, ..., 252, ...]
    const f2 = await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'pig:pig_1', pinned: false }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('pig:pig_1');
      await window.__qaWaitImages();
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      return inst && inst.walk ? inst.walk.slice() : null;
    });

    if (Array.isArray(f2) && f2[0] <= 4 && f2[2] >= 252) {
      pass('F6-2-pig-walk-bounds', `walk=${JSON.stringify(f2)}`);
    } else {
      defect('F6-2-pig-walk-bounds', `Failed: walk=${JSON.stringify(f2)}`);
    }

    // 3. Locked/missing neighbor edge shows .edge-blocked red bar
    await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      const unlocked = new Set(['salon', 'pig:pig_1', 'market']);
      st.places.order.forEach(p => { p.locked = !unlocked.has(p.id); });
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('pig:pig_1');
      await window.__qaWaitImages();
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      window.CanvasPig.pigX = 128;
      window.CanvasPig.pigY = 115;
      window.CanvasPig.setPigVisible(true);
      if (typeof window.CanvasPig.clearEdgeHold === 'function') window.CanvasPig.clearEdgeHold();
      if (inst.pigs && inst.pigs[0]) { inst.pigs[0].x = 128; inst.pigs[0].y = 115; }
      inst.render();
    });

    const edgeCoords = await page.evaluate(() => {
      const p0 = window.CanvasPig.toClient(128, 105);
      const p1 = window.CanvasPig.toClient(253, 105);
      return { p0: { x: p0.clientX, y: p0.clientY }, p1: { x: p1.clientX, y: p1.clientY } };
    });

    await page.mouse.move(edgeCoords.p0.x, edgeCoords.p0.y);
    await page.mouse.down();
    await page.mouse.move(edgeCoords.p1.x, edgeCoords.p1.y, { steps: 5 });
    await page.waitForTimeout(100);

    const f3 = await page.evaluate(() => {
      const r = document.getElementById('stageEdgeRight');
      const cs = r ? getComputedStyle(r) : null;
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      return {
        hasBlocked: r ? r.classList.contains('edge-blocked') : false,
        hasActive: r ? r.classList.contains('edge-active') : false,
        bg: cs ? cs.backgroundColor : null,
        sceneId: inst ? inst.sceneId : null
      };
    });
    await page.mouse.up();

    if (f3.hasBlocked && !f3.hasActive && f3.sceneId === 'pig:pig_1') {
      pass('F6-3-edge-blocked', `hasBlocked=true, bg=${f3.bg}, scene=${f3.sceneId}`);
    } else {
      defect('F6-3-edge-blocked', `Failed: ${JSON.stringify(f3)}`);
    }

    // 4. Market stall y <= 84 and signboard sy < 84 (on stall front, above pig walk)
    const f4 = await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'market', pinned: false }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('market');
      await window.__qaWaitImages();

      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      const stalls = (inst.things || []).filter(t => t && String(t.itemId || '').includes('stall'));
      const cv = document.getElementById('pigCanvas');
      const ctx = cv.getContext('2d');
      const drawn = window.CuyScenes.drawMarketSignboards(ctx, st, { things: inst.things });
      return {
        stallYs: stalls.map(s => s.y),
        signYs: Array.isArray(drawn) ? drawn.map(d => d.sy) : []
      };
    });

    if (f4.stallYs.length === 3 && f4.stallYs.every(y => y <= 84) &&
        f4.signYs.length === 3 && f4.signYs.every(sy => sy < 84)) {
      pass('F6-4-market-stalls', `stallYs=${JSON.stringify(f4.stallYs)}, signYs=${JSON.stringify(f4.signYs)}`);
    } else {
      defect('F6-4-market-stalls', `Failed: ${JSON.stringify(f4)}`);
    }

    // 5. Edit Mode shows places_edit_grid layer, hides .needs-section/.actions-section when expanded,
    //    and snaps strictly to 16x16 cells with red highlight on invalid cells
    await page.evaluate(async () => {
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();
      if (window.CuyEdit && !window.CuyEdit.isOpen()) {
        window.CuyEdit.toggle();
      }
    });
    await page.waitForTimeout(150);

    const f5Open = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      const needs = document.querySelector('.needs-section');
      const actions = document.querySelector('.actions-section');
      const gridRects = [];
      const origStroke = CanvasRenderingContext2D.prototype.strokeRect;
      CanvasRenderingContext2D.prototype.strokeRect = function (x, y, w, h) {
        if (w === 15 && h === 15) gridRects.push({ x, y, w, h });
        return origStroke.apply(this, arguments);
      };
      inst.render();
      CanvasRenderingContext2D.prototype.strokeRect = origStroke;
      return {
        bodyHas: document.body.classList.contains('cuy-edit-open'),
        needsDisplay: needs ? getComputedStyle(needs).display : null,
        actionsDisplay: actions ? getComputedStyle(actions).display : null,
        gridRectCount: gridRects.length,
        hasCard: !!document.querySelector('#editDrawer .edit-card')
      };
    });

    // Drag the placed lamp on the canvas onto an invalid wall/ceiling cell (y=8) to verify 16x16 red highlight
    let f5Red = { redFills: [], redStrokes: [] };
    const dragPts = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      const lamp = (inst.things || []).find(t => t && (t.uid === 'qa_lamp_left' || t.itemId === 'lamp_floor'));
      if (!lamp) return null;
      const p0 = window.CanvasPig.toClient(lamp.x, lamp.y - 10);
      const p1 = window.CanvasPig.toClient(128, 8);
      return {
        start: { x: p0.clientX, y: p0.clientY },
        inv: { x: p1.clientX, y: p1.clientY }
      };
    });
    if (dragPts) {
      await page.evaluate(() => {
        window.__qaRedFills = [];
        window.__qaRedStrokes = [];
        const origFill = CanvasRenderingContext2D.prototype.fillRect;
        const origStroke = CanvasRenderingContext2D.prototype.strokeRect;
        window.__qaOrigFill = origFill;
        window.__qaOrigStroke = origStroke;
        CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
          if (typeof this.fillStyle === 'string' && this.fillStyle.includes('210, 48, 48')) {
            window.__qaRedFills.push({ x, y, w, h });
          }
          return origFill.apply(this, arguments);
        };
        CanvasRenderingContext2D.prototype.strokeRect = function (x, y, w, h) {
          if (typeof this.strokeStyle === 'string' && this.strokeStyle.includes('255, 80, 80')) {
            window.__qaRedStrokes.push({ x, y, w, h });
          }
          return origStroke.apply(this, arguments);
        };
      });

      await page.mouse.move(dragPts.start.x, dragPts.start.y);
      await page.mouse.down();
      await page.mouse.move(dragPts.inv.x, dragPts.inv.y, { steps: 6 });
      await page.waitForTimeout(80);

      f5Red = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
        inst.render();
        const res = {
          redFills: (window.__qaRedFills || []).slice(),
          redStrokes: (window.__qaRedStrokes || []).slice()
        };
        if (window.__qaOrigFill) CanvasRenderingContext2D.prototype.fillRect = window.__qaOrigFill;
        if (window.__qaOrigStroke) CanvasRenderingContext2D.prototype.strokeRect = window.__qaOrigStroke;
        return res;
      });
      await page.mouse.up();
    }

    const f5Ok =
      f5Open.bodyHas &&
      f5Open.needsDisplay === 'none' &&
      f5Open.actionsDisplay === 'none' &&
      f5Open.gridRectCount > 0 &&
      f5Red.redFills.length > 0 &&
      f5Red.redFills.some(r => r.h === 14 && (r.w % 16 === 14));

    if (f5Ok) {
      pass('F6-5-edit-grid-snap', `needs=none, actions=none, gridRects=${f5Open.gridRectCount}, redFills=${JSON.stringify(f5Red.redFills[0])}`);
    } else {
      defect('F6-5-edit-grid-snap', `Failed: open=${JSON.stringify(f5Open)} red=${JSON.stringify(f5Red)}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\nSummary: ${defects.length} defect(s)`);
  if (defects.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
