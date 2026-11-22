'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, openHome, pushState } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');
const HOME_BEHAVIOR = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets', 'data', 'home_behavior.json'), 'utf8')
);

const ANIM_MAX_MS = (() => {
  const map = {
    idle: Infinity,
    walk: 60000,
    eat_treat: 5000,
    happy: 5000,
    greet: 5000,
    purr_pet: 5000,
    land: 1500
  };
  const acts = HOME_BEHAVIOR.actions || {};
  Object.keys(acts).forEach((k) => {
    const a = acts[k];
    if (a && a.homeAnim) {
      map[a.homeAnim] = Math.max(map[a.homeAnim] || 0, a.maxMs || 5000);
    }
  });
  map.sleep_house = Math.max(map.sleep || 300000, map.doze || 600000);
  return map;
})();

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

async function run() {
  const server = await startServer();
  const browser = await launchBrowser();
  const page = await openHome(browser, { base: server.base });
  await page.setViewportSize({ width: 420, height: 640 });

  // Track longest continuous duration per animation during fastForward simulations
  const stuckTracker = { maxObservedByAnim: {}, violations: [] };

  async function stepSim(totalMs, stepMs) {
    const res = await page.evaluate(({ total, step, animMax }) => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return { ok: false, reason: 'no CanvasPig.instance' };
      const steps = Math.max(1, Math.ceil(total / step));
      const seenAnims = {};
      const seenBehaviors = {};
      let runAnim = inst.currentAnim || 'idle';
      let runMs = 0;
      const maxObs = {};
      const violations = [];

      for (let i = 0; i < steps; i++) {
        const dt = (i === steps - 1) ? (total - step * i) : step;
        if (dt <= 0) continue;
        inst.update(dt);
        const cur = inst.currentAnim || 'idle';
        seenAnims[cur] = (seenAnims[cur] || 0) + 1;
        if (inst.behavior && typeof inst.behavior.current === 'function') {
          const b = inst.behavior.current();
          if (b && b.id) seenBehaviors[b.id] = (seenBehaviors[b.id] || 0) + 1;
        }
        const entries = typeof inst.getPigEntries === 'function' ? inst.getPigEntries() : [];
        for (let j = 0; j < entries.length; j++) {
          if (entries[j] && entries[j].anim) {
            seenAnims[entries[j].anim] = (seenAnims[entries[j].anim] || 0) + 1;
          }
        }
        if (cur === runAnim) {
          runMs += dt;
        } else {
          maxObs[runAnim] = Math.max(maxObs[runAnim] || 0, runMs);
          runAnim = cur;
          runMs = dt;
        }
        const cap = animMax[runAnim];
        if (cap && cap !== Infinity && runMs > cap * 2) {
          violations.push({ anim: runAnim, runMs, limit: cap * 2 });
        }
      }
      maxObs[runAnim] = Math.max(maxObs[runAnim] || 0, runMs);
      return {
        ok: true,
        seenAnims,
        seenBehaviors,
        lastAnim: inst.currentAnim,
        pigCount: typeof inst.getPigEntries === 'function' ? inst.getPigEntries().length : 1,
        maxObs,
        violations
      };
    }, { total: totalMs, step: stepMs, animMax: ANIM_MAX_MS });

    if (res && res.ok) {
      Object.keys(res.maxObs || {}).forEach((k) => {
        stuckTracker.maxObservedByAnim[k] = Math.max(
          stuckTracker.maxObservedByAnim[k] || 0,
          res.maxObs[k]
        );
      });
      if (Array.isArray(res.violations)) {
        res.violations.forEach((v) => stuckTracker.violations.push(v));
      }
    }
    return res;
  }

  try {
    // Seed 2 pigs in salon with house, bed, water bottle, hay, and 7 unlocked scenes
    await page.evaluate(() => {
      const st = window.bridge.getState();
      st.clovers = 500;
      st.roster = [
        { id: 'pig_1', name: 'Pip', look: { breed: 'smooth', paletteId: 'tricolor' }, stageKey: 'adult' },
        { id: 'pig_2', name: 'Pop', look: { breed: 'abyssinian', paletteId: 'ginger_white' }, stageKey: 'adult' }
      ];
      st.activePigIds = ['pig_1'];
      st.inventory = Object.assign({}, st.inventory || {}, {
        hay: 10,
        bell_pepper: 5,
        carrot: 5,
        pellets: 5,
        water_bottle: 1,
        chew_stick: 1
      });
      st.hayRack = { value: 80, max: 100 };
      st.vet = { isSick: false };
      st.weather = { tempC: 21 };
      st.places = st.places || {};
      st.places.order = [
        { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
        { id: 'pig:pig_1', title: 'Pip Room', locked: false, unlockHint: '' },
        { id: 'dorm', title: 'Dormitory', locked: false, unlockHint: '' },
        { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
        { id: 'park', title: 'Park', locked: false, unlockHint: '' },
        { id: 'farm', title: 'Farm', locked: false, unlockHint: '' },
        { id: 'market', title: 'Market', locked: false, unlockHint: '' }
      ];
      st.places.pigLocations = [
        { pigId: 'pig_1', scene: 'salon', pinned: false },
        { pigId: 'pig_2', scene: 'salon', pinned: false }
      ];
      st.rooms = st.rooms || {};
      st.rooms.layouts = Object.assign({}, st.rooms.layouts || {}, {
        salon: {
          name: 'Salon',
          cols: 16,
          rows: 9,
          wallRows: 2,
          wallpaper: '',
          floor: '',
          items: [
            { uid: 'salon_house_1', itemId: 'sig_james_hideout', x: 2, y: 5, flip: false, variant: 0 },
            { uid: 'salon_sofa_1', itemId: 'sofa_cosy', x: 8, y: 5, flip: false, variant: 0 },
            { uid: 'salon_water_1', itemId: 'water_bottle', x: 13, y: 3, flip: false, variant: 0 }
          ]
        }
      });
      window.bridge.handleStateUpdate(st);
      window.bridge.saveMockState();
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('salon');
      }
    });
    await page.waitForTimeout(300);

    // 1. DAY-morning-to-night
    const dayPhases = [
      { name: 'morning', hour: 8, ms: 60000, needs: { fullness: 28, vitamin_c: 55, energy: 88, mood: 85, cleanliness: 80, teeth: 45, health: 90 } },
      { name: 'midday', hour: 13, ms: 60000, needs: { fullness: 60, vitamin_c: 70, energy: 55, mood: 78, cleanliness: 80, teeth: 65, health: 90 } },
      { name: 'evening', hour: 19, ms: 60000, needs: { fullness: 45, vitamin_c: 65, energy: 75, mood: 92, cleanliness: 80, teeth: 60, health: 90 } },
      { name: 'night', hour: 23, ms: 120000, needs: { fullness: 80, vitamin_c: 80, energy: 15, mood: 70, cleanliness: 80, teeth: 75, health: 90 } },
      { name: 'dawn', hour: 7, ms: 40000, needs: { fullness: 50, vitamin_c: 75, energy: 95, mood: 85, cleanliness: 80, teeth: 70, health: 90 } }
    ];

    const phaseResults = {};
    for (const ph of dayPhases) {
      await page.evaluate(({ hour, needs }) => {
        if (window.CanvasPig) {
          window.CanvasPig.setSceneContext({ hour, sceneKind: 'room' });
          window.CanvasPig.setNeeds(needs);
        }
      }, ph);
      phaseResults[ph.name] = await stepSim(ph.ms, 500);
    }

    const allDayAnims = new Set();
    ['morning', 'midday', 'evening'].forEach((k) => {
      Object.keys((phaseResults[k] && phaseResults[k].seenAnims) || {}).forEach((a) => allDayAnims.add(a));
    });
    const nightAnims = Object.keys((phaseResults.night && phaseResults.night.seenAnims) || {});
    const ateInDay = allDayAnims.has('eat') || allDayAnims.has('eat_treat');
    const drankInDay = allDayAnims.has('drink');
    const playedInDay = ['popcorn', 'run', 'dance', 'front_happy', 'dig_hay', 'chew_stick', 'sniff', 'walk']
      .some((a) => allDayAnims.has(a));
    const sleptAtNight = ['sleep', 'sleep_house', 'doze', 'sleep_together'].some((a) => nightAnims.includes(a));
    const dawnLast = phaseResults.dawn && phaseResults.dawn.lastAnim;
    const wokeInMorning = dawnLast && !['sleep', 'sleep_house', 'sleep_together'].includes(dawnLast);

    check(
      'DAY-morning-to-night',
      ateInDay && drankInDay && playedInDay && sleptAtNight && wokeInMorning,
      'eat=' + ateInDay + ', drink=' + drankInDay + ', play=' + playedInDay +
      ', nightSleep=' + sleptAtNight + ', dawnWoke=' + wokeInMorning +
      ' (dayAnims=' + Array.from(allDayAnims).join(',') + '; nightAnims=' + nightAnims.join(',') + '; dawnLast=' + dawnLast + ')'
    );

    // 2. DAY-two-pigs-sleep-together-at-night
    await page.evaluate(() => {
      if (window.CanvasPig) {
        window.CanvasPig.setSceneContext({ hour: 23, sceneKind: 'room' });
        window.CanvasPig.setNeeds({ fullness: 80, vitamin_c: 80, energy: 18, mood: 80, cleanliness: 80, teeth: 80, health: 90 });
      }
    });
    const togetherRes = await stepSim(120000, 500);
    const hasSleepTogether = !!(
      (togetherRes.seenAnims && togetherRes.seenAnims.sleep_together > 0) ||
      (togetherRes.seenBehaviors && togetherRes.seenBehaviors.sleeping_together > 0)
    );
    check(
      'DAY-two-pigs-sleep-together-at-night',
      hasSleepTogether,
      'pigs=' + togetherRes.pigCount + ', seenAnims=' + Object.keys(togetherRes.seenAnims || {}).join(',') +
      ', seenBehaviors=' + Object.keys(togetherRes.seenBehaviors || {}).join(',')
    );

    // 3. DAY-edit-mid-day-moves-house
    const editInfo = await page.evaluate(() => {
      const st = window.bridge.getState();
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return { ok: false, reason: 'no instance' };
      const pigBefore = { x: inst.pigX, y: inst.pigY, anim: inst.currentAnim };
      if (window.CuyEdit && typeof window.CuyEdit.open === 'function') {
        window.CuyEdit.open();
      }
      window.bridge.send({ type: 'room_move', place: 'salon', uid: 'salon_house_1', x: 5, y: 6 });
      const items = (st.rooms && st.rooms.layouts && st.rooms.layouts.salon && st.rooms.layouts.salon.items) || [];
      const moved = items.find((it) => it && it.uid === 'salon_house_1');
      if (moved) {
        moved.x = 5;
        moved.y = 6;
      }
      window.bridge.handleStateUpdate(st);
      window.bridge.saveMockState();
      if (window.CuyEdit && typeof window.CuyEdit.close === 'function') {
        window.CuyEdit.close();
      }
      const entries = typeof inst.getPigEntries === 'function' ? inst.getPigEntries() : [{ x: inst.pigX, y: inst.pigY }];
      const allFree = entries.every((p) => window.CanvasPig.isFree(p.x, p.y));
      return { ok: true, pigBefore, allFree, count: entries.length };
    });
    const afterEditRes = await stepSim(10000, 250);
    const editPostFree = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return false;
      const entries = typeof inst.getPigEntries === 'function' ? inst.getPigEntries() : [{ x: inst.pigX, y: inst.pigY }];
      return entries.every((p) => window.CanvasPig.isFree(p.x, p.y));
    });
    check(
      'DAY-edit-mid-day-moves-house',
      !!(editInfo.ok && editInfo.allFree && editPostFree && afterEditRes.ok),
      'ok=' + editInfo.ok + ', freeImmediate=' + editInfo.allFree + ', freeAfter=' + editPostFree
    );

    // 4. DAY-feed-interrupts-and-resumes
    await page.evaluate(() => {
      const st = window.bridge.getState();
      if (st && st.needs) st.needs.fullness = 40;
      window.bridge.handleStateUpdate(st);
      window.bridge.saveMockState();
      if (window.CanvasPig) {
        window.CanvasPig.setSceneContext({ hour: 12, sceneKind: 'room' });
        window.CanvasPig.setNeeds({ fullness: 40, vitamin_c: 70, energy: 75, mood: 75, cleanliness: 80, teeth: 70, health: 90 });
      }
    });
    await stepSim(5000, 250);
    await page.click('#btnFeed');
    await page.waitForSelector('.food-item-btn[data-food="bell_pepper"]', { timeout: 3000 });
    await page.click('.food-item-btn[data-food="bell_pepper"]');
    await page.waitForTimeout(100);
    const duringFeed = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      return {
        anim: inst ? inst.currentAnim : null,
        animTimer: inst ? inst.animTimer : 0,
        bubble: inst ? inst.bubbleText : null
      };
    });
    await stepSim(8000, 250);
    const afterFeed = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      const dbg = inst && inst.behavior && typeof inst.behavior.debug === 'function' ? inst.behavior.debug() : null;
      return {
        anim: inst ? inst.currentAnim : null,
        animTimer: inst ? inst.animTimer : 0,
        interrupted: dbg ? dbg.interrupted : false
      };
    });
    const feedInterrupted = ['eat', 'eat_treat'].includes(duringFeed.anim);
    const feedResumed = afterFeed.anim !== 'eat_treat' && !afterFeed.interrupted;
    check(
      'DAY-feed-interrupts-and-resumes',
      feedInterrupted && feedResumed,
      'during=' + JSON.stringify(duringFeed) + ', after=' + JSON.stringify(afterFeed)
    );

    // 5. DAY-reload-keeps-state
    await page.evaluate(() => {
      const st = window.bridge.getState();
      st.clovers = 777;
      window.bridge.handleStateUpdate(st);
      window.bridge.saveMockState();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' &&
            window.CuyHome.listFeatures().length > 10 && window.CanvasPig && window.CanvasPig.instance,
      { timeout: 10000 }
    );
    await page.waitForTimeout(500);
    const reloadCheck = await page.evaluate(() => {
      const st = window.bridge.getState();
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (!inst) return { ok: false };
      const fBefore = inst.currentFrame;
      for (let i = 0; i < 40; i++) inst.update(250);
      return {
        ok: true,
        clovers: st ? st.clovers : null,
        hasBehavior: !!inst.behavior,
        stopped: !!inst.stopped,
        frameChanged: inst.currentFrame !== fBefore || inst.currentAnim !== 'idle' || inst.targetX !== null
      };
    });
    check(
      'DAY-reload-keeps-state',
      !!(reloadCheck.ok && reloadCheck.clovers === 777 && !reloadCheck.stopped && (reloadCheck.hasBehavior || reloadCheck.frameChanged)),
      JSON.stringify(reloadCheck)
    );

    // 6. DAY-every-scene-visit (unlock all 7 scenes and visit each for 120s)
    await page.evaluate(() => {
      const st = window.bridge.getState();
      st.places = st.places || {};
      st.places.order = [
        { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
        { id: 'pig:pig_1', title: 'Pip Room', locked: false, unlockHint: '' },
        { id: 'dorm', title: 'Dormitory', locked: false, unlockHint: '' },
        { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
        { id: 'park', title: 'Park', locked: false, unlockHint: '' },
        { id: 'farm', title: 'Farm', locked: false, unlockHint: '' },
        { id: 'market', title: 'Market', locked: false, unlockHint: '' }
      ];
      st.places.pigLocations = [
        { pigId: 'pig_1', scene: 'salon', pinned: false },
        { pigId: 'pig_2', scene: 'salon', pinned: false }
      ];
      window.bridge.handleStateUpdate(st);
      window.bridge.saveMockState();
    });
    await pushState(page);

    const sevenScenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
    const sceneFailures = [];
    for (const scId of sevenScenes) {
      const opened = await page.evaluate((id) => {
        if (!window.CuyPlaces || typeof window.CuyPlaces.openPlace !== 'function') return false;
        window.CuyPlaces.openPlace(id);
        return window.CuyPlaces.getCurrentPlace() === id;
      }, scId);
      await page.waitForTimeout(100);
      await stepSim(120000, 1000);
      const boundsOk = await page.evaluate(() => {
        const inst = window.CanvasPig && window.CanvasPig.instance;
        if (!inst) return false;
        const w = inst.sceneWidth || 256;
        const h = inst.sceneHeight || 144;
        const entries = typeof inst.getPigEntries === 'function' ? inst.getPigEntries() : [{ x: inst.pigX, y: inst.pigY }];
        return entries.every((p) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h);
      });
      if (!opened || !boundsOk) {
        sceneFailures.push(scId + '(opened=' + opened + ',bounds=' + boundsOk + ')');
      }
    }
    check(
      'DAY-every-scene-visit',
      sceneFailures.length === 0,
      'failed scenes: ' + sceneFailures.join(', ')
    );

    // 7. DAY-no-console-errors
    check(
      'DAY-no-console-errors',
      page.__errors.length === 0,
      page.__errors.slice(0, 5).join(' | ')
    );

    // 8. DAY-no-stuck-anim
    check(
      'DAY-no-stuck-anim',
      stuckTracker.violations.length === 0,
      'violations: ' + JSON.stringify(stuckTracker.violations.slice(0, 3))
    );
  } finally {
    await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
