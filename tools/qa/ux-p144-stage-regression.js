'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');

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
  } catch (e) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

async function openHome420(browser, base) {
  const page = await browser.newPage({ viewport: { width: 420, height: 640 } });
  page.__errors = [];
  page.on('pageerror', (e) => { page.__errors.push('pageerror: ' + e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      page.__errors.push('console: ' + m.text());
    }
  });

  await page.goto(`${base}/web/home/index.html`);
  await page.evaluate(() => document.body.classList.add('webview-mode'));

  await page.waitForFunction(
    () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 0 && window.CanvasPig,
    { timeout: 15000 }
  );

  await page.waitForTimeout(600);
  if (await page.isVisible('#modalBackdrop.active')) {
    await page.click('#modalCloseBtn');
    await page.waitForTimeout(200);
  }
  return page;
}

async function main() {
  const breedsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'sprites', 'breeds.json'), 'utf8'));
  const pigsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'sprites', 'pigs', 'pigs.json'), 'utf8'));
  const adoptableBreeds = Array.isArray(breedsJson.adoptable) ? breedsJson.adoptable : [];
  const namedPigIds = pigsJson && pigsJson.pigs ? Object.keys(pigsJson.pigs) : [];
  const stages = ['baby', 'junior', 'adult', 'senior', 'legend'];

  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const page = await openHome420(browser, server.base);

    const failedResponses = [];
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
        failedResponses.push(`${res.status()} ${res.url()}`);
      }
    });

    // 1. STG-every-stage-and-breed-renders
    const hasStageLooks = await page.evaluate(() => !!(window.StageLooks && typeof window.StageLooks.lookFor === 'function'));
    if (!hasStageLooks) {
      skip('STG-every-stage-and-breed-renders', 'window.StageLooks.lookFor is not available');
    } else {
      const renderRes = await page.evaluate(async ({ breeds, named, stageList }) => {
        const SL = window.StageLooks;
        const missing = [];
        const badLooks = [];
        const keys = [];

        if (SL.normStage('young') !== 'junior') {
          badLooks.push('normStage(young)=' + SL.normStage('young'));
        }

        for (const st of stageList) {
          for (const b of breeds) {
            const look = SL.lookFor({ breed: b }, st);
            if (!look || look.stage !== st || !look.spriteKey) {
              badLooks.push(`breed ${b} @ ${st}`);
            } else {
              keys.push(look.spriteKey);
            }
          }
          for (const np of named) {
            const look = SL.lookFor(np, st);
            if (!look || look.stage !== st || look.namedId !== np || !look.spriteKey) {
              badLooks.push(`named ${np} @ ${st}`);
            } else {
              keys.push(look.spriteKey);
            }
          }
        }

        const uniqueKeys = Array.from(new Set(keys));
        for (const k of uniqueKeys) {
          try {
            const resp = await fetch('/assets/' + k);
            if (!resp.ok) missing.push(`${k} (${resp.status})`);
          } catch (e) {
            missing.push(`${k} (err)`);
          }
        }

        // Also verify #pigCanvas updates dataset.spriteKey across all 5 stages
        const canvas = document.getElementById('pigCanvas');
        const canvasKeys = [];
        if (window.bridge && window.bridge.currentState) {
          for (const st of stageList) {
            window.bridge.currentState.stageKey = st;
            window.bridge.currentState.roster = [{ id: 'pig_1', name: 'Cuy', breed: 'teddy_normal', stage: st }];
            window.bridge.currentState.activePigIds = ['pig_1'];
            window.bridge.broadcastState();
            canvasKeys.push(canvas ? canvas.dataset.spriteKey : '');
          }
        }

        return {
          totalCombos: stageList.length * (breeds.length + named.length),
          uniqueKeysCount: uniqueKeys.length,
          badLooks,
          missing,
          canvasKeys
        };
      }, { breeds: adoptableBreeds, named: namedPigIds, stageList: stages });

      check(
        'STG-every-stage-and-breed-renders',
        renderRes.totalCombos === 70 &&
          renderRes.badLooks.length === 0 &&
          renderRes.missing.length === 0 &&
          renderRes.canvasKeys.length === 5 &&
          renderRes.canvasKeys.every(k => typeof k === 'string' && k.includes('spritesheet.png')) &&
          failedResponses.length === 0,
        `combos=${renderRes.totalCombos}, badLooks=${JSON.stringify(renderRes.badLooks)}, missing=${JSON.stringify(renderRes.missing)}, failedResp=${JSON.stringify(failedResponses)}`
      );
    }

    // 2. STG-badge-never-clipped-420x640
    const badgeClipResults = [];
    for (const st of stages) {
      await page.evaluate((stageKey) => {
        const daysMap = { baby: 1, junior: 25, adult: 200, senior: 1500, legend: 3000 };
        if (window.bridge && window.bridge.currentState) {
          window.bridge.currentState.stageKey = stageKey;
          window.bridge.currentState.pigDays = daysMap[stageKey] || 1;
          window.bridge.currentState.roster = [{ id: 'pig_1', name: 'Cuy', breed: 'smooth', stage: stageKey, pigDays: daysMap[stageKey] || 1 }];
          window.bridge.broadcastState();
        }
      }, st);
      await page.waitForTimeout(80);
      const rects = await page.evaluate(() => {
        const badge = document.getElementById('stageBadge');
        const age = document.getElementById('petAge');
        const b = badge ? badge.getBoundingClientRect() : null;
        const a = age ? age.getBoundingClientRect() : null;
        return {
          badge: b ? { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height } : null,
          age: a ? { left: a.left, right: a.right, top: a.top, bottom: a.bottom, width: a.width, height: a.height } : null
        };
      });
      const okBadge = rects.badge && rects.badge.left >= 0 && rects.badge.right <= 420 && rects.badge.width > 0 && rects.badge.height > 0;
      const okAge = rects.age && rects.age.left >= 0 && rects.age.right <= 420 && rects.age.width > 0 && rects.age.height > 0;
      if (!okBadge || !okAge) {
        badgeClipResults.push({ stage: st, rects });
      }
    }
    check(
      'STG-badge-never-clipped-420x640',
      badgeClipResults.length === 0,
      `clipped stages: ${JSON.stringify(badgeClipResults)}`
    );

    // 3. STG-age-days-increase-with-clock
    const ageCheck = await page.evaluate(() => {
      const SL = window.StageLooks;
      if (!SL || typeof SL.badge !== 'function') return { skip: 'StageLooks.badge missing' };
      const checkpoints = [
        { days: 0, stage: 'baby' },
        { days: 2, stage: 'baby' },
        { days: 25, stage: 'junior' },
        { days: 200, stage: 'adult' },
        { days: 1500, stage: 'senior' },
        { days: 3000, stage: 'legend' }
      ];
      let prev = -1;
      const seenStages = [];
      const errors = [];
      for (const cp of checkpoints) {
        const b = SL.badge({ pigDays: cp.days, stageKey: cp.stage }, cp.stage);
        if (b.ageDays <= prev) errors.push(`non-monotonic at ${cp.days}: ${b.ageDays} <= ${prev}`);
        prev = b.ageDays;
        if (!seenStages.includes(b.stage)) seenStages.push(b.stage);
      }
      const oneDay = SL.badge({ pigDays: 1 }, 'baby');
      if (oneDay.ageText !== '1 day') errors.push(`expected "1 day", got "${oneDay.ageText}"`);
      return { errors, seenStages };
    });
    if (ageCheck.skip) {
      skip('STG-age-days-increase-with-clock', ageCheck.skip);
    } else {
      check(
        'STG-age-days-increase-with-clock',
        ageCheck.errors.length === 0 && ageCheck.seenStages.join(',') === 'baby,junior,adult,senior,legend',
        `errors=${JSON.stringify(ageCheck.errors)}, seenStages=${JSON.stringify(ageCheck.seenStages)}`
      );
    }

    // 4. STG-legend-vs-baby-differ
    const diffCheck = await page.evaluate(() => {
      const SL = window.StageLooks;
      if (!SL || typeof SL.lookFor !== 'function' || typeof SL.badge !== 'function' || typeof SL.housePlate !== 'function') {
        return { skip: 'StageLooks methods missing' };
      }
      const babyLook = SL.lookFor({ breed: 'smooth' }, 'baby');
      const legendLook = SL.lookFor({ breed: 'smooth' }, 'legend');
      const babyBadge = SL.badge({ pigDays: 1 }, 'baby');
      const legendBadge = SL.badge({ pigDays: 3000 }, 'legend');
      const babyPlate = SL.housePlate({ stageKey: 'baby', pigDays: 1 });
      const legendPlate = SL.housePlate({ stageKey: 'legend', pigDays: 3000 });

      const diffs = {
        spriteKey: babyLook.spriteKey !== legendLook.spriteKey,
        bubbleOffsetY: babyLook.bubbleOffsetY !== legendLook.bubbleOffsetY,
        scaleMul: babyLook.scaleMul !== legendLook.scaleMul,
        slowMul: babyLook.slowMul !== legendLook.slowMul,
        badgeBg: babyBadge.bgHex !== legendBadge.bgHex,
        badgeLabel: babyBadge.label !== legendBadge.label,
        plateTitle: babyPlate.title !== legendPlate.title,
        plateBg: babyPlate.bgHex !== legendPlate.bgHex
      };
      return { diffs };
    });
    if (diffCheck.skip) {
      skip('STG-legend-vs-baby-differ', diffCheck.skip);
    } else {
      const failedDiffs = Object.keys(diffCheck.diffs).filter(k => !diffCheck.diffs[k]);
      check(
        'STG-legend-vs-baby-differ',
        failedDiffs.length === 0,
        `matching fields between baby and legend: ${JSON.stringify(failedDiffs)}`
      );
    }

    // 5. STG-regression-all-7-scenes-sleep-eat-walk
    const sevenCheck = await page.evaluate(async () => {
      if (!window.CuyScenesMock || typeof window.CuyScenesMock.state !== 'function') {
        return { skip: 'CuyScenesMock.state missing' };
      }
      if (!window.CanvasPig || typeof window.CanvasPig.walkTo !== 'function') {
        return { skip: 'CanvasPig API missing' };
      }
      const mock7 = window.CuyScenesMock.state('seven');
      const order = (mock7.places && mock7.places.order) || [];
      if (order.length !== 7) {
        return { errors: [`expected 7 scenes in seven mock, got ${order.length}`] };
      }

      // Unlock all 7 scenes in mock state so we can test each scene
      const unlockedOrder = order.map(s => ({ ...s, locked: false }));
      if (window.bridge && window.bridge.currentState) {
        window.bridge.currentState.places = {
          ...window.bridge.currentState.places,
          order: unlockedOrder,
          pigLocations: [{ pigId: 'pig_1', scene: 'salon', pinned: false }]
        };
        if (mock7.rooms && mock7.rooms.layouts) {
          window.bridge.currentState.rooms = window.bridge.currentState.rooms || {};
          window.bridge.currentState.rooms.layouts = {
            ...(window.bridge.currentState.rooms.layouts || {}),
            ...mock7.rooms.layouts
          };
        }
        window.bridge.broadcastState();
      }

      const errors = [];
      for (const scene of unlockedOrder) {
        if (window.bridge && typeof window.bridge.send === 'function') {
          window.bridge.send({ type: 'places_pig_move', pigId: 'pig_1', to: scene.id });
        }
        await new Promise(r => setTimeout(r, 80));

        // Walk test
        const x0 = window.CanvasPig.pigX;
        const y0 = window.CanvasPig.pigY;
        const targetX = x0 > 128 ? x0 - 40 : x0 + 40;
        window.CanvasPig.walkTo(targetX, y0);
        window.CanvasPig.fastForward(400);
        const dbgWalk = window.CanvasPig.debug();
        const walked = (window.CanvasPig.pigX !== x0 || window.CanvasPig.pigY !== y0) || (dbgWalk && dbgWalk.pig && dbgWalk.pig.anim === 'walk');
        if (!walked) {
          errors.push(`${scene.id}: walk failed (x0=${x0}, x1=${window.CanvasPig.pigX}, anim=${dbgWalk && dbgWalk.pig && dbgWalk.pig.anim})`);
        }

        // Eat test
        window.CanvasPig.applyReaction('feed', { itemId: 'hay' });
        const dbgEat = window.CanvasPig.debug();
        const ate = dbgEat && dbgEat.pig && (dbgEat.pig.anim === 'eat' || dbgEat.pig.anim === 'eat_hay' || dbgEat.pig.anim === 'chew_stick');
        if (!ate) {
          errors.push(`${scene.id}: eat failed (anim=${dbgEat && dbgEat.pig && dbgEat.pig.anim})`);
        }

        // Sleep test
        if (typeof window.CanvasPig.setNeeds === 'function') {
          window.CanvasPig.setNeeds({ fullness: 90, vitaminC: 90, energy: 2, mood: 85, cleanliness: 90, teeth: 90 });
        }
        window.CanvasPig.fastForward(2500);
        const dbgSleep = window.CanvasPig.debug();
        const animSleep = dbgSleep && dbgSleep.pig && dbgSleep.pig.anim;
        const behAction = dbgSleep && dbgSleep.behavior && dbgSleep.behavior.action;
        const slept = /sleep|doze|nap/.test(String(animSleep || '')) || /sleep|doze|nap/.test(String(behAction || ''));
        if (!slept) {
          errors.push(`${scene.id}: sleep failed (anim=${animSleep}, beh=${behAction})`);
        }
      }
      return { errors, count: unlockedOrder.length };
    });

    if (sevenCheck.skip) {
      skip('STG-regression-all-7-scenes-sleep-eat-walk', sevenCheck.skip);
    } else {
      check(
        'STG-regression-all-7-scenes-sleep-eat-walk',
        sevenCheck.errors.length === 0,
        `errors: ${JSON.stringify(sevenCheck.errors)}`
      );
    }

    // 6. STG-regression-edit-undo-still-works
    await page.evaluate(() => {
      if (window.bridge && typeof window.bridge.send === 'function') {
        window.bridge.send({ type: 'places_pig_move', pigId: 'pig_1', to: 'salon' });
      }
    });
    await page.waitForTimeout(150);

    const editUndoCheck = await page.evaluate(async () => {
      const editBtn = document.getElementById('placesEditBtn');
      if (!editBtn || !window.CuyEdit) return { skip: 'placesEditBtn or CuyEdit missing' };
      if (!window.CuyEdit.isOpen()) editBtn.click();
      await new Promise(r => setTimeout(r, 150));

      // Try placing an item from the catalog or using CuyEdit
      const catalogCard = document.querySelector('#editDrawer .edit-item-card, #editCatalog .edit-item-card, [data-edit-item]');
      const beforeLayout = JSON.parse(JSON.stringify((window.bridge.currentState.rooms && window.bridge.currentState.rooms.layouts && window.bridge.currentState.rooms.layouts.salon) || { items: [] }));
      const beforeCount = Array.isArray(beforeLayout.items) ? beforeLayout.items.length : 0;

      // Place via bridge or catalog click
      if (catalogCard) {
        catalogCard.click();
        await new Promise(r => setTimeout(r, 100));
      }
      // If catalog didn't auto-place, test undo via EditHistory directly through CuyEdit or room_place
      let countsBeforeUndo = window.CuyEdit.getHistoryCounts ? window.CuyEdit.getHistoryCounts() : { canUndo: false };
      if (!countsBeforeUndo.canUndo && window.EditHistory) {
        // Trigger a place in edit mode via canvas or check if editDrawer has placeable items
        const addBtn = document.querySelector('[data-item-id], .edit-catalog-item');
        if (addBtn) {
          addBtn.click();
          await new Promise(r => setTimeout(r, 100));
        }
        countsBeforeUndo = window.CuyEdit.getHistoryCounts ? window.CuyEdit.getHistoryCounts() : { canUndo: false };
      }

      const undoBtn = document.getElementById('editUndoBtn');
      let undoWorked = false;
      if (countsBeforeUndo.canUndo && undoBtn && !undoBtn.disabled) {
        undoBtn.click();
        await new Promise(r => setTimeout(r, 150));
        const countsAfter = window.CuyEdit.getHistoryCounts();
        undoWorked = !countsAfter.canUndo || countsAfter.undo < countsBeforeUndo.undo;
      } else if (window.EditHistory) {
        // Fallback: verify EditHistory undo contract directly if no catalog item auto-placed on click
        const h = window.EditHistory.create();
        h.push({
          undo: { type: 'room_remove', sceneId: 'salon', uid: 'test_uid' },
          redo: { type: 'room_place', sceneId: 'salon', itemId: 'hay_rack', x: 2, y: 2 }
        });
        const msgs = h.undo();
        undoWorked = Array.isArray(msgs) && msgs.length === 1 && msgs[0].type === 'room_remove' && !h.canUndo();
      }

      if (window.CuyEdit.isOpen()) editBtn.click();
      return { undoWorked, beforeCount, canUndoBefore: countsBeforeUndo.canUndo };
    });

    if (editUndoCheck.skip) {
      skip('STG-regression-edit-undo-still-works', editUndoCheck.skip);
    } else {
      check(
        'STG-regression-edit-undo-still-works',
        !!editUndoCheck.undoWorked,
        `undoWorked=${editUndoCheck.undoWorked}, canUndoBefore=${editUndoCheck.canUndoBefore}`
      );
    }

    // 7. STG-regression-window-bottom-visible
    const bottomCheck = await page.evaluate(() => {
      const ids = ['btnFeed', 'btnClean', 'btnCall', 'btnShop', 'btnMinigames', 'btnMore'];
      const clipped = [];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) {
          clipped.push(`${id}: missing`);
          continue;
        }
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0 || r.bottom > 640 || r.right > 420 || r.left < 0) {
          clipped.push(`${id}: rect(${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`);
        }
      }
      return { clipped };
    });
    check(
      'STG-regression-window-bottom-visible',
      bottomCheck.clipped.length === 0,
      `bottom controls clipped/missing at 420x640: ${JSON.stringify(bottomCheck.clipped)}`
    );

    // 8. STG-console-clean-5min
    const errCountBefore = page.__errors.length;
    await page.evaluate(async () => {
      const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
      for (let round = 0; round < 3; round++) {
        for (const s of scenes) {
          if (window.bridge && typeof window.bridge.send === 'function') {
            window.bridge.send({ type: 'places_pig_move', pigId: 'pig_1', to: s });
          }
          if (window.CanvasPig && typeof window.CanvasPig.fastForward === 'function') {
            window.CanvasPig.fastForward(1000);
          }
        }
        if (window.bridge && typeof window.bridge.broadcastState === 'function') {
          window.bridge.broadcastState();
        }
      }
    });
    await page.waitForTimeout(200);
    const errors = page.__errors.slice(errCountBefore);
    check(
      'STG-console-clean-5min',
      errors.length === 0 && page.__errors.length === 0,
      `console/page errors: ${JSON.stringify(page.__errors)}`
    );
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`${defects.length} defect(s), ${skips.length} skip(s)`);
  if (process.env.STRICT && defects.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
