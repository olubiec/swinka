'use strict';

const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { startServer, openHome, pushState } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');
const EditHistory = require(path.join(ROOT, 'web', 'home', 'features', 'places', 'edit-history.js'));
const DrawBudget = require(path.join(ROOT, 'web', 'home', 'lib', 'draw-budget.js'));
const WorldSounds = require(path.join(ROOT, 'web', 'home', 'lib', 'world-sounds.js'));
const drawLimitsJson = require(path.join(ROOT, 'assets', 'data', 'draw_limits.json'));

const defects = [];
const skips = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push(id);
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push(id);
  console.log('SKIP ' + id + ': ' + reason);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

function applyMsgsToSimLayout(layout, msgs, nextUidRef) {
  for (const m of msgs) {
    if (m.type === 'room_place') {
      const uid = 'u_' + (++nextUidRef.n);
      layout.push({ uid, itemId: m.itemId, x: m.x, y: m.y, flip: false });
      return uid;
    }
    if (m.type === 'room_remove') {
      const idx = layout.findIndex((x) => x.uid === m.uid);
      if (idx >= 0) layout.splice(idx, 1);
    }
    if (m.type === 'room_move') {
      const it = layout.find((x) => x.uid === m.uid);
      if (it) { it.x = m.x; it.y = m.y; }
    }
    if (m.type === 'room_flip') {
      const it = layout.find((x) => x.uid === m.uid);
      if (it) it.flip = !it.flip;
    }
  }
  return null;
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await launchBrowser();
    const page = await openHome(browser, { base: server.base });
    await page.setViewportSize({ width: 420, height: 640 });

    await page.evaluate(() => {
      window.__zzfxCalls = 0;
      const origZzfx = window.zzfx;
      if (typeof origZzfx === 'function') {
        window.zzfx = function (...args) {
          window.__zzfxCalls++;
          return origZzfx(...args);
        };
      }
      // Ensure we have plenty of owned items in mock state for placement tests
      const st = window.bridge.currentState;
      st.clovers = 500;
      if (st.rooms && st.rooms.catalog) {
        st.rooms.catalog.forEach((c) => {
          if (c && c.owned !== undefined && c.owned < 2) c.owned = 5;
        });
      }
      if (!st.inventory) st.inventory = {};
      st.inventory.hay_rack = 5;
      st.inventory.cushion_big = 5;
      st.inventory.water_bottle = 5;
      st.inventory.food_bowl = 5;
    });
    await pushState(page);

    // Open Edit mode
    await page.click('#placesEditBtn');
    await page.waitForSelector('#editDrawer:not([hidden])', { timeout: 4000 });
    await page.waitForTimeout(200);

    // 1. ED-undo-chain-20 & 2. ED-redo-chain
    {
      // Pure EditHistory 20-op simulation (place, move, flip, remove on distinct uids)
      const hist = EditHistory.create();
      const layout = [
        { uid: 'seed_1', itemId: 'cushion_big', x: 4, y: 2, flip: false },
        { uid: 'seed_2', itemId: 'hay_rack', x: 8, y: 2, flip: false }
      ];
      const uidRef = { n: 0 };
      const snap0 = JSON.stringify(layout);

      for (let i = 0; i < 20; i++) {
        const mod = i % 4;
        if (mod === 0) {
          const uid = 'u_' + (++uidRef.n);
          const x = 1 + (i % 6);
          layout.push({ uid, itemId: 'hay_rack', x, y: 3, flip: false });
          hist.push({ kind: 'place', place: 'salon', itemId: 'hay_rack', x, y: 3 });
          hist.resolvePlacedUid('salon', 'hay_rack', x, 3, uid);
        } else if (mod === 1) {
          const it = layout[0];
          const prevX = it.x;
          const prevY = it.y;
          it.x = prevX + 1;
          hist.push({ kind: 'move', place: 'salon', uid: it.uid, prevX, prevY, x: it.x, y: prevY });
        } else if (mod === 2) {
          const it = layout[0];
          it.flip = !it.flip;
          hist.push({ kind: 'flip', place: 'salon', uid: it.uid });
        } else {
          const removed = layout.pop();
          hist.push({ kind: 'remove', place: 'salon', uid: removed.uid, itemId: removed.itemId, x: removed.x, y: removed.y, flip: removed.flip });
        }
      }
      const snap20 = JSON.stringify(layout);

      for (let i = 0; i < 20; i++) {
        const msgs = hist.undo();
        const placedUid = applyMsgsToSimLayout(layout, msgs, uidRef);
        if (placedUid && msgs[0]) {
          const follow = hist.resolvePlacedUid(msgs[0].place, msgs[0].itemId, msgs[0].x, msgs[0].y, placedUid);
          if (follow && follow.length) applyMsgsToSimLayout(layout, follow, uidRef);
        }
        hist.acknowledge();
      }
      const normalize = (arr) => arr.map((x) => ({ itemId: x.itemId, x: x.x, y: x.y, flip: !!x.flip }));
      const afterUndo20 = JSON.stringify(normalize(layout));

      for (let i = 0; i < 20; i++) {
        const msgs = hist.redo();
        const placedUid = applyMsgsToSimLayout(layout, msgs, uidRef);
        if (placedUid && msgs[0]) {
          hist.resolvePlacedUid(msgs[0].place, msgs[0].itemId, msgs[0].x, msgs[0].y, placedUid);
        }
        hist.acknowledge();
      }
      const afterRedo20 = JSON.stringify(normalize(layout));
      const snap0Norm = JSON.stringify(normalize(JSON.parse(snap0)));
      const snap20Norm = JSON.stringify(normalize(JSON.parse(snap20)));

      // Live browser 20-op chain (place 1 owned item via real drag onto a valid cell, then 19 flips via real toolbar click)
      await page.evaluate(() => {
        window.CuyEdit.clearHistory();
      });

      const liveInitSnap = await page.evaluate(() => {
        const items = window.bridge.currentState.rooms.layouts.salon.items || [];
        return JSON.stringify(items.map((it) => ({ itemId: it.itemId, x: it.x, y: it.y, flip: !!it.flip })));
      });

      const dragTargets = await page.evaluate(() => {
        const card = document.querySelector('#editDrawerContent .edit-card:not(.is-dimmed)');
        const canvas = document.getElementById('pigCanvas');
        const inst = window.PigCanvas && window.PigCanvas.instance;
        if (!card || !canvas || !inst) return null;
        const itemId = card.getAttribute('data-id');
        const cr = card.getBoundingClientRect();
        const cv = canvas.getBoundingClientRect();
        // Find a valid floor cell using inst.cellValid
        let targetScenePt = { x: inst.sceneWidth * 0.65, y: inst.sceneHeight * 0.72 };
        if (typeof inst.cellValid === 'function') {
          outer: for (let sy = 56; sy <= inst.sceneHeight - 16; sy += 16) {
            for (let sx = 24; sx <= inst.sceneWidth - 24; sx += 16) {
              if (inst.cellValid(itemId, sx, sy)) {
                targetScenePt = { x: sx, y: sy };
                break outer;
              }
            }
          }
        }
        return {
          itemId,
          from: { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 },
          to: {
            x: cv.left + targetScenePt.x * (cv.width / inst.sceneWidth),
            y: cv.top + targetScenePt.y * (cv.height / inst.sceneHeight)
          }
        };
      });

      let liveUndoOk = false;
      let liveRedoOk = false;
      let liveAfter20Snap = '';
      let liveAfterUndoSnap = '';
      let liveAfterRedoSnap = '';
      let liveCountsAfterOps = null;

      if (dragTargets) {
        await page.mouse.move(dragTargets.from.x, dragTargets.from.y);
        await page.mouse.down();
        await page.mouse.move(dragTargets.to.x, dragTargets.to.y, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(150);

        const placedUid = await page.evaluate((itemId) => {
          const items = window.bridge.currentState.rooms.layouts.salon.items || [];
          const found = items.slice().reverse().find((it) => it.itemId === itemId);
          return found ? (found.uid || found.id) : null;
        }, dragTargets.itemId);

        if (placedUid) {
          await page.evaluate((uid) => { window.CuyEdit.setSelection(uid); }, placedUid);
          for (let i = 0; i < 19; i++) {
            await page.click('#editItemFlipBtn');
            await page.waitForTimeout(20);
          }
          await page.waitForTimeout(100);
          liveCountsAfterOps = await page.evaluate(() => window.CuyEdit.getHistoryCounts());
          liveAfter20Snap = await page.evaluate(() => {
            const items = window.bridge.currentState.rooms.layouts.salon.items || [];
            return JSON.stringify(items.map((it) => ({ itemId: it.itemId, x: it.x, y: it.y, flip: !!it.flip })));
          });

          for (let i = 0; i < 20; i++) {
            await page.click('#editUndoBtn');
            await page.waitForTimeout(20);
          }
          await page.waitForTimeout(120);
          liveAfterUndoSnap = await page.evaluate(() => {
            const items = window.bridge.currentState.rooms.layouts.salon.items || [];
            return JSON.stringify(items.map((it) => ({ itemId: it.itemId, x: it.x, y: it.y, flip: !!it.flip })));
          });
          liveUndoOk = (liveAfterUndoSnap === liveInitSnap);

          for (let i = 0; i < 20; i++) {
            await page.click('#editRedoBtn');
            await page.waitForTimeout(20);
          }
          await page.waitForTimeout(120);
          liveAfterRedoSnap = await page.evaluate(() => {
            const items = window.bridge.currentState.rooms.layouts.salon.items || [];
            return JSON.stringify(items.map((it) => ({ itemId: it.itemId, x: it.x, y: it.y, flip: !!it.flip })));
          });
          liveRedoOk = (liveAfterRedoSnap === liveAfter20Snap);
        }
      }

      check(
        'ED-undo-chain-20',
        afterUndo20 === snap0Norm && liveCountsAfterOps && liveCountsAfterOps.undo === 20 && liveUndoOk,
        'pureUndoMatch=' + (afterUndo20 === snap0Norm) +
          ', liveCounts=' + JSON.stringify(liveCountsAfterOps) +
          ', liveUndoOk=' + liveUndoOk
      );

      check(
        'ED-redo-chain',
        afterRedo20 === snap20Norm && liveRedoOk,
        'pureRedoMatch=' + (afterRedo20 === snap20Norm) +
          ', liveRedoOk=' + liveRedoOk
      );
    }

    // 3. ED-undo-after-core-reject
    {
      const h = EditHistory.create();
      h.push({ kind: 'place', place: 'salon', itemId: 'hay_rack', x: 2, y: 2, uid: 'u1' });
      const u1 = h.undo();
      const rolledBack = h.rollbackPending();
      const countsAfterRollback = h.counts();

      // Live UI: push an undoable flip, then intercept bridge.send so Core rejects the undo with a toast
      const liveReject = await page.evaluate(() => {
        window.CuyEdit.clearHistory();
        const items = window.bridge.currentState.rooms.layouts.salon.items || [];
        const target = items[0];
        if (!target) return { ok: false, reason: 'no item in salon' };
        const uid = target.uid || target.id;
        window.CuyEdit.setSelection(uid);
        document.getElementById('editItemFlipBtn').click();
        const beforeUndoCounts = window.CuyEdit.getHistoryCounts();

        const origSend = window.bridge.send.bind(window.bridge);
        window.bridge.send = function () {
          // Simulate Core rejecting the undo without changing layout
          const cbs = window.bridge.messageListeners && window.bridge.messageListeners.get('toast');
          if (cbs) {
            cbs.forEach((cb) => cb({ type: 'toast', text: 'Cannot move: no room' }));
          }
        };
        try {
          window.CuyEdit.undo();
        } finally {
          window.bridge.send = origSend;
        }
        const afterRejectCounts = window.CuyEdit.getHistoryCounts();
        return {
          ok: true,
          beforeUndoCounts,
          afterRejectCounts
        };
      });

      check(
        'ED-undo-after-core-reject',
        u1.length === 1 && rolledBack && countsAfterRollback.undo === 1 && countsAfterRollback.redo === 0 &&
          liveReject.ok &&
          liveReject.beforeUndoCounts.undo === 1 &&
          liveReject.afterRejectCounts.undo === 1 &&
          liveReject.afterRejectCounts.redo === 0,
        'pure=(' + rolledBack + ',' + JSON.stringify(countsAfterRollback) + '), live=' + JSON.stringify(liveReject)
      );
    }

    // 4. ED-limit-50
    {
      const h = EditHistory.create();
      for (let i = 0; i < 55; i++) {
        h.push({ kind: 'flip', place: 'salon', uid: 'u_' + i });
      }
      const c55 = h.counts();
      let undoSteps = 0;
      while (h.undo().length > 0) {
        undoSteps++;
        h.acknowledge();
      }
      check(
        'ED-limit-50',
        EditHistory.MAX_HISTORY === 50 && c55.undo === 50 && undoSteps === 50 && h.counts().undo === 0,
        'MAX_HISTORY=' + EditHistory.MAX_HISTORY + ', c55=' + JSON.stringify(c55) + ', undoSteps=' + undoSteps
      );
    }

    // 5. ED-scene-switch-clears
    {
      await page.evaluate(() => {
        window.CuyEdit.clearHistory();
        const items = window.bridge.currentState.rooms.layouts.salon.items || [];
        if (items[0]) {
          window.CuyEdit.setSelection(items[0].uid || items[0].id);
          document.getElementById('editItemFlipBtn').click();
        }
      });
      await page.waitForTimeout(100);
      const beforeSwitch = await page.evaluate(() => window.CuyEdit.getHistoryCounts());
      await page.click('#placesNextBtn');
      await page.waitForTimeout(200);
      const afterSwitch = await page.evaluate(() => ({
        counts: window.CuyEdit.getHistoryCounts(),
        undoDisabled: document.getElementById('editUndoBtn').disabled,
        redoDisabled: document.getElementById('editRedoBtn').disabled
      }));
      // Switch back to salon
      await page.click('#placesPrevBtn');
      await page.waitForTimeout(200);

      check(
        'ED-scene-switch-clears',
        beforeSwitch.undo >= 1 &&
          afterSwitch.counts.undo === 0 &&
          afterSwitch.counts.redo === 0 &&
          afterSwitch.undoDisabled &&
          afterSwitch.redoDisabled,
        'before=' + JSON.stringify(beforeSwitch) + ', after=' + JSON.stringify(afterSwitch)
      );
    }

    // 6. ED-ctrl-z-in-text-input-ignored
    {
      await page.evaluate(() => {
        window.CuyEdit.clearHistory();
        const items = window.bridge.currentState.rooms.layouts.salon.items || [];
        if (items[0]) {
          window.CuyEdit.setSelection(items[0].uid || items[0].id);
          document.getElementById('editItemFlipBtn').click();
        }
      });
      await page.waitForTimeout(80);
      const beforeInput = await page.evaluate(() => window.CuyEdit.getHistoryCounts());
      const searchExists = await page.isVisible('#editDrawerSearch');
      let afterCtrlZ = beforeInput;
      if (searchExists) {
        await page.focus('#editDrawerSearch');
        await page.keyboard.type('hay');
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(80);
        afterCtrlZ = await page.evaluate(() => window.CuyEdit.getHistoryCounts());
      }
      check(
        'ED-ctrl-z-in-text-input-ignored',
        searchExists && beforeInput.undo === 1 && afterCtrlZ.undo === 1 && afterCtrlZ.redo === 0,
        'searchExists=' + searchExists + ', before=' + JSON.stringify(beforeInput) + ', after=' + JSON.stringify(afterCtrlZ)
      );
    }

    // 7. ED-snap-edges
    {
      const metrics = { cellSize: 16, floorY0: 32, x0: 0, cols: 16 };
      const sWallNeg = EditHistory.snapCell('indoor', { layer: 'wall', cells: [2, 1] }, -20, -15, metrics);
      const sWallMax = EditHistory.snapCell('indoor', { layer: 'wall', cells: [2, 1] }, 999, 999, metrics);
      const sFloorNeg = EditHistory.snapCell('indoor', { layer: 'floor', cells: [1, 1] }, -10, -10, metrics);
      const sOutNeg = EditHistory.snapCell('outdoor', { layer: 'ground', cells: [1, 1] }, -10, -10, metrics);

      const wallClampedOk =
        sWallNeg.cx === 0 && sWallNeg.cy === 0 && sWallNeg.x >= 0 && sWallNeg.y >= 0 &&
        sWallMax.cx === 14 && sWallMax.y <= metrics.floorY0;
      const floorClampedOk = sFloorNeg.cx >= 0 && sFloorNeg.cy >= 0 && sFloorNeg.x >= 0 && sFloorNeg.y >= 0;
      const outdoorClampedOk = sOutNeg.cx >= 0 && sOutNeg.cy >= 0 && sOutNeg.x >= 0 && sOutNeg.y >= 0;

      check(
        'ED-snap-edges',
        wallClampedOk && floorClampedOk && outdoorClampedOk,
        'wallNeg=' + JSON.stringify(sWallNeg) +
          ', wallMax=' + JSON.stringify(sWallMax) +
          ', floorNeg=' + JSON.stringify(sFloorNeg) +
          ', outNeg=' + JSON.stringify(sOutNeg)
      );
    }

    // 8. ED-comfort-0-and-full
    {
      const c0 = EditHistory.computeComfortDisplay({}, 'salon');
      const c42 = EditHistory.computeComfortDisplay({ comfort: { salon: { score: 42, cap: 100, moodFactor: 0.94 } } }, 'salon');
      const cFull = EditHistory.computeComfortDisplay({ comfort: { salon: { score: 150, cap: 100, moodFactor: 0.8 } } }, 'salon');
      const unitOk =
        c0.text === 'Comfort 0/100 - mood drops 0% slower' &&
        c42.text === 'Comfort 42/100 - mood drops 6% slower' &&
        cFull.score === 100 && cFull.ratio === 1 && cFull.text === 'Comfort 100/100 - mood drops 20% slower';

      await page.evaluate(() => {
        window.bridge.currentState.rooms.comfort = { salon: { score: 0, cap: 100, moodFactor: 1 } };
      });
      await pushState(page);
      const uiZero = await page.textContent('#editComfortMeter .edit-comfort-label');

      await page.evaluate(() => {
        window.bridge.currentState.rooms.comfort = { salon: { score: 100, cap: 100, moodFactor: 0.75 } };
      });
      await pushState(page);
      const uiFull = await page.textContent('#editComfortMeter .edit-comfort-label');

      check(
        'ED-comfort-0-and-full',
        unitOk &&
          uiZero === 'Comfort 0/100 - mood drops 0% slower' &&
          uiFull === 'Comfort 100/100 - mood drops 25% slower',
        'unitOk=' + unitOk + ', uiZero=' + JSON.stringify(uiZero) + ', uiFull=' + JSON.stringify(uiFull)
      );
    }

    // 9. ED-budget-200-things
    {
      const items200 = [];
      for (let i = 0; i < 196; i++) {
        items200.push({ id: 'decor_' + i, x: 20 + (i % 12) * 16, y: 40 + Math.floor(i / 12) * 8, w: 16, h: 16, layer: 'decor', animated: i < 40, frames: i < 40 ? 4 : 1 });
      }
      items200.push({ id: 'pig_main', isPig: true, x: 128, y: 100, w: 32, h: 24 });
      items200.push({ id: 'inter_1', interactive: true, x: 220, y: 130, w: 16, h: 16, layer: 'floor' });
      items200.push({ id: 'fix_1', isFixture: true, x: 230, y: 135, w: 16, h: 16, layer: 'fixture' });
      items200.push({ id: 'offscreen_1', x: 900, y: 900, w: 16, h: 16, layer: 'decor' });

      const vp = { x: 0, y: 0, width: 256, height: 144 };
      const focus = { x: 128, y: 100 };
      const selected = DrawBudget.selectItems(items200, vp, focus, drawLimitsJson);
      const animSet = DrawBudget.capAnimated(selected, focus, drawLimitsJson);
      const parts = DrawBudget.capParticles(new Array(60).fill({ x: 0, y: 0 }), drawLimitsJson);
      const lights = DrawBudget.capLights(new Array(20).fill(0).map((_, i) => ({ x: i * 10, y: 50, on: true })), focus, drawLimitsJson);
      const hiddenSkip = DrawBudget.shouldDrawFrame(1010, 1000, true, drawLimitsJson);
      const hiddenDraw = DrawBudget.shouldDrawFrame(1040, 1000, true, drawLimitsJson);

      const pureOk =
        selected.length <= 48 &&
        selected.some((x) => x.id === 'pig_main') &&
        selected.some((x) => x.id === 'inter_1') &&
        selected.some((x) => x.id === 'fix_1') &&
        !selected.some((x) => x.id === 'offscreen_1') &&
        animSet.size <= 24 &&
        parts.length === 32 &&
        lights.length === 8 &&
        !hiddenSkip.draw &&
        hiddenDraw.draw;

      // Live canvasPig.render() with 200 items + interactive + offscreen
      const liveRender = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        const origThings = (inst.things || []).slice();
        const origDrawThing = inst.drawThing;
        const drawnIds = [];
        inst.drawThing = function (ctx, t) {
          if (t && t.id) drawnIds.push(t.id);
          return origDrawThing.apply(this, arguments);
        };
        const big = [];
        for (let i = 0; i < 197; i++) {
          big.push({ id: 'd_' + i, itemId: 'cushion_big', x: 120 + (i % 5), y: 95 + (i % 3), w: 16, h: 16, layer: 'decor' });
        }
        big.push({ id: 'live_interactive', itemId: 'hay_rack', interactive: true, layer: 'fixture', x: 10, y: 40, w: 16, h: 16 });
        big.push({ id: 'live_fixture', itemId: 'water_bottle', isFixture: true, layer: 'fixture', x: 15, y: 40, w: 16, h: 16 });
        big.push({ id: 'live_offscreen', itemId: 'cushion_big', layer: 'decor', x: 128, y: 96, w: 16, h: 16 });
        big[big.length - 1].x = 950;
        big[big.length - 1].y = 950;

        let threw = null;
        try {
          inst.things = big;
          inst.render();
        } catch (err) {
          threw = err.message;
        } finally {
          inst.drawThing = origDrawThing;
          inst.things = origThings;
        }
        return {
          threw,
          drawnCount: drawnIds.length,
          hasInteractive: drawnIds.includes('live_interactive'),
          hasFixture: drawnIds.includes('live_fixture'),
          hasOffscreen: drawnIds.includes('live_offscreen'),
          pigRendered: inst.getPigEntries().length > 0
        };
      });

      check(
        'ED-budget-200-things',
        pureOk &&
          !liveRender.threw &&
          liveRender.pigRendered &&
          liveRender.drawnCount <= 48 &&
          liveRender.hasInteractive &&
          liveRender.hasFixture &&
          !liveRender.hasOffscreen,
        'pureOk=' + pureOk + ', liveRender=' + JSON.stringify(liveRender) +
          ' (canvas-pig.js passes viewport w/h instead of width/height and drops interactive/fixture flags on DrawBudget proxies)'
      );
    }

    // 10. ED-sounds-muted
    {
      WorldSounds.resetThrottle();
      const t1 = WorldSounds.play('walk_grass', { nowMs: 1000, settings: { volume: 1 }, sound: { isMuted: false, play: () => true } });
      const t2 = WorldSounds.play('walk_grass', { nowMs: 1100, settings: { volume: 1 }, sound: { isMuted: false, play: () => true } });
      const t3 = WorldSounds.play('walk_grass', { nowMs: 1400, settings: { volume: 1 }, sound: { isMuted: false, play: () => true } });
      const m1 = WorldSounds.play('room_place', { nowMs: 2000, sound: { isMuted: true, play: () => true } });
      const m2 = WorldSounds.play('room_place', { nowMs: 2500, settings: { soundSuppressed: true }, sound: { isMuted: false, play: () => true } });
      const m3 = WorldSounds.play('room_place', { nowMs: 3000, settings: { volume: 0 }, sound: { isMuted: false, play: () => true } });

      const pureOk = t1.played && !t2.played && t2.reason === 'throttled' && t3.played && !m1.played && !m2.played && !m3.played;

      // Live browser muted edit actions
      const liveMuted = await page.evaluate(() => {
        window.Sound.isMuted = true;
        window.__zzfxCalls = 0;
        window.WorldSounds.resetThrottle();
        const r = window.WorldSounds.play('room_place');
        const items = window.bridge.currentState.rooms.layouts.salon.items || [];
        if (items[0]) {
          window.CuyEdit.setSelection(items[0].uid || items[0].id);
          document.getElementById('editItemFlipBtn').click();
        }
        window.CuyEdit.undo();
        window.Sound.isMuted = false;
        return { wsRes: r, zzfxCalls: window.__zzfxCalls };
      });

      check(
        'ED-sounds-muted',
        pureOk && !liveMuted.wsRes.played && liveMuted.zzfxCalls === 0,
        'pureOk=' + pureOk + ', liveMuted=' + JSON.stringify(liveMuted)
      );
    }

    // 11. ED-drawer-420x640
    {
      await page.setViewportSize({ width: 420, height: 640 });
      await page.waitForTimeout(150);
      const layoutMetrics = await page.evaluate(() => {
        const drawer = document.getElementById('editDrawer');
        const canvas = document.getElementById('pigCanvas');
        const undo = document.getElementById('editUndoBtn');
        const redo = document.getElementById('editRedoBtn');
        const res = document.getElementById('editResidentsBtn');
        const comfort = document.getElementById('editComfortMeter');
        const dr = drawer ? drawer.getBoundingClientRect() : null;
        const cr = canvas ? canvas.getBoundingClientRect() : null;
        return {
          docScrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          innerH: window.innerHeight,
          drawerVisible: Boolean(drawer && !drawer.hidden && dr && dr.height > 40),
          drawerRect: dr ? { top: Math.round(dr.top), bottom: Math.round(dr.bottom), left: Math.round(dr.left), right: Math.round(dr.right) } : null,
          canvasBottom: cr ? Math.round(cr.bottom) : null,
          undoVis: Boolean(undo && undo.getBoundingClientRect().width > 0 && undo.getBoundingClientRect().right <= 420),
          redoVis: Boolean(redo && redo.getBoundingClientRect().width > 0 && redo.getBoundingClientRect().right <= 420),
          resVis: Boolean(res && res.getBoundingClientRect().width > 0 && res.getBoundingClientRect().right <= 420),
          comfortVis: Boolean(comfort && comfort.getBoundingClientRect().width > 0)
        };
      });

      const drawerOk =
        layoutMetrics.docScrollW <= 420 &&
        layoutMetrics.drawerVisible &&
        layoutMetrics.drawerRect.right <= 420 &&
        layoutMetrics.drawerRect.bottom <= 640 &&
        layoutMetrics.drawerRect.top >= layoutMetrics.canvasBottom - 6 &&
        layoutMetrics.undoVis &&
        layoutMetrics.redoVis &&
        layoutMetrics.resVis &&
        layoutMetrics.comfortVis;

      check(
        'ED-drawer-420x640',
        drawerOk,
        'metrics=' + JSON.stringify(layoutMetrics)
      );
    }

    // Close edit mode cleanly
    await page.click('#placesEditBtn');
    await page.waitForTimeout(100);

    // 12. ED-console-clean
    check(
      'ED-console-clean',
      page.__errors.length === 0,
      'console/page errors: ' + JSON.stringify(page.__errors)
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
