'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');
const ACTIONS_PATH = path.join(ROOT, 'assets', 'data', 'actions.json');
const HOME_BEHAVIOR_PATH = path.join(ROOT, 'assets', 'data', 'home_behavior.json');

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

async function setupMockSeven(page) {
  await page.evaluate(() => {
    if (!window.CuyScenesMock || typeof window.CuyScenesMock.state !== 'function') return;
    const seven = window.CuyScenesMock.state('seven');
    const st = (window.bridge && typeof window.bridge.getMockState === 'function')
      ? window.bridge.getMockState()
      : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.lastState);
    if (st) {
      st.places = seven.places;
      st.rooms = Object.assign({}, st.rooms || {}, seven.rooms || {});
      st.inventory = Object.assign({}, st.inventory || {}, {
        water_bottle: 1,
        chew_stick: 1
      });
      st.hayRack = { value: 100, max: 100 };
      if (!st.vet) st.vet = { isSick: false };
      else st.vet.isSick = false;
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    }
  });
  await page.waitForTimeout(200);
}

async function runPhaseOnCanvas(page, opts) {
  return await page.evaluate((o) => {
    const inst = window.CanvasPig && window.CanvasPig.instance;
    if (!inst) throw new Error('CanvasPig.instance missing');

    if (o.resetBehavior && window._actionsData && window._homeBehaviorData) {
      inst.setBehaviorData(window._actionsData, window._homeBehaviorData);
      inst.currentAnim = 'idle';
      inst.animTimer = 0;
      inst.targetX = null;
      inst.targetY = null;
      inst.pendingSpot = null;
      inst.path = [];
    }

    if (o.stage) {
      window.CanvasPig.setStage(o.stage);
    }

    if (o.things) {
      window.CanvasPig.setThings(o.things);
    }

    if (o.presentPigs) {
      window.CanvasPig.setPresentPigs(o.presentPigs);
    } else if (o.singlePig) {
      window.CanvasPig.setPigVisible(true);
    }

    if (o.statePatch && inst.lastState) {
      const st = inst.lastState;
      if (o.statePatch.inventory) st.inventory = Object.assign({}, o.statePatch.inventory);
      if (o.statePatch.hayRack) st.hayRack = Object.assign({}, o.statePatch.hayRack);
      if (o.statePatch.weather !== undefined) st.weather = o.statePatch.weather;
      if (o.statePatch.vet) st.vet = Object.assign({}, o.statePatch.vet);
    }

    if (o.sceneContext) {
      window.CanvasPig.setSceneContext(o.sceneContext);
    }

    if (o.needs) {
      window.CanvasPig.setNeeds(o.needs);
    }

    if (o.waitIdleFirst && inst.behavior) {
      for (let w = 0; w < 600000; w += 500) {
        const cur = inst.behavior.current();
        if (!cur || cur.remainingMs <= 500) break;
        window.CanvasPig.fastForward(Math.min(500, cur.remainingMs));
      }
      inst.behavior.interrupt('test_phase');
      inst.currentAnim = 'idle';
      inst.animTimer = 0;
      inst.targetX = null;
      inst.targetY = null;
      inst.pendingSpot = null;
      inst.path = [];
      const dec = inst.behavior.resume(inst._buildBehaviorCtx());
      if (dec) inst._applyBehaviorDecision(dec);
    } else if (o.interruptCurrent && inst.behavior) {
      inst.behavior.interrupt('test_phase');
      inst.currentAnim = 'idle';
      inst.animTimer = 0;
      inst.targetX = null;
      inst.targetY = null;
      inst.pendingSpot = null;
      inst.path = [];
      const dec = inst.behavior.resume(inst._buildBehaviorCtx());
      if (dec) inst._applyBehaviorDecision(dec);
    }

    const anims = {};
    const actionIds = {};
    const stepMs = o.stepMs || 250;
    const totalMs = o.durationMs || 60000;
    const stopWhenAnims = o.stopWhenAnims || null;
    const stopWhenActions = o.stopWhenActions || null;

    let elapsed = 0;
    const maxActionRunMs = {};
    let curTrackId = null;
    let curTrackMs = 0;
    let curWasWalkingToSpot = false;
    let prevSimMs = (inst.behavior && inst.behavior.debug().simMs) || 0;

    const recordState = () => {
      const d = window.CanvasPig.debug();
      const anim = d && d.pig ? d.pig.anim : null;
      const actId = d && d.behavior ? d.behavior.lastActionId : null;
      const simMs = (d && d.behavior && typeof d.behavior.simMs === 'number') ? d.behavior.simMs : prevSimMs;
      const simDelta = Math.max(0, simMs - prevSimMs);
      prevSimMs = simMs;
      if (anim) anims[anim] = (anims[anim] || 0) + 1;
      if (actId && simDelta >= 0) actionIds[actId] = (actionIds[actId] || 0) + 1;

      if (actId && simDelta > 0) {
        if (actId === curTrackId) {
          curTrackMs += simDelta;
          if (d.pendingSpot) curWasWalkingToSpot = true;
        } else {
          curTrackId = actId;
          curTrackMs = simDelta;
          curWasWalkingToSpot = !!d.pendingSpot;
        }
        if (!curWasWalkingToSpot) {
          maxActionRunMs[actId] = Math.max(maxActionRunMs[actId] || 0, curTrackMs);
        }
      }
    };

    recordState();
    while (elapsed < totalMs) {
      window.CanvasPig.fastForward(stepMs);
      elapsed += stepMs;
      recordState();

      if (stopWhenAnims && stopWhenAnims.every((a) => anims[a] > 0)) break;
      if (stopWhenActions && stopWhenActions.every((a) => actionIds[a] > 0)) break;
    }

    return { anims, actionIds, maxActionRunMs, elapsed, finalDebug: window.CanvasPig.debug() };
  }, opts);
}

async function main() {
  const actionsJson = JSON.parse(fs.readFileSync(ACTIONS_PATH, 'utf8'));
  const homeBehaviorJson = JSON.parse(fs.readFileSync(HOME_BEHAVIOR_PATH, 'utf8'));

  const server = await startServer();
  let browser;
  try {
    browser = await launchBrowser();
    const page = await openHome(browser);

    // Cache JSON data on window for phase helpers and ensure behavior is initialized
    await page.evaluate(({ actionsData, homeData }) => {
      window._actionsData = actionsData;
      window._homeBehaviorData = homeData;
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (inst && !inst.behavior && typeof inst.setBehaviorData === 'function') {
        inst.setBehaviorData(actionsData, homeData);
      }
    }, { actionsData: actionsJson, homeData: homeBehaviorJson });

    await setupMockSeven(page);

    // Verify PigBehavior is mounted
    const hasBehavior = await page.evaluate(() => {
      const d = window.CanvasPig && window.CanvasPig.debug && window.CanvasPig.debug();
      return !!(d && d.behavior);
    });

    if (!hasBehavior) {
      check('PAR-behavior-mounted', false, 'CanvasPig.debug().behavior is null; PigBehavior not active on Home canvas');
    }

    // 1. PAR-all-28: Run accelerated day phases covering all triggers on the Home canvas
    const seenAnims = new Set();
    const seenActions = new Set();
    const observedMaxRunMs = {};

    const mergePhase = (res) => {
      Object.keys(res.anims || {}).forEach((k) => seenAnims.add(k));
      Object.keys(res.actionIds || {}).forEach((k) => seenActions.add(k));
      Object.entries(res.maxActionRunMs || {}).forEach(([k, v]) => {
        observedMaxRunMs[k] = Math.max(observedMaxRunMs[k] || 0, v);
      });
    };

    const baseStatePatch = {
      inventory: { water_bottle: 1, chew_stick: 1 },
      hayRack: { value: 100, max: 100 },
      weather: { tempC: 20 },
      vet: { isSick: false }
    };

    // Phase A: Normal daytime with items & hay -> rest, sniffing, walk, eat_hay, drink, chew_stick, dig_hay, chin_marking, scratching
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      things: [{ id: 'bed1', itemId: 'armchair', x: 80, y: 105, w: 2, h: 2, comfort: 4 }],
      statePatch: baseStatePatch,
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 50, vitamin_c: 80, energy: 92, mood: 55, cleanliness: 80, teeth: 40, health: 100 },
      durationMs: 240000,
      stepMs: 250,
      waitIdleFirst: true
    }));

    // Phase A2: Dedicated drink + dig_hay (high fullness/teeth/energy so eat_hay/nap don't dominate)
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { hayRack: { value: 0, max: 100 } }),
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 95, vitamin_c: 95, energy: 95, mood: 45, cleanliness: 80, teeth: 95, health: 100 },
      durationMs: 90000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['drink']
    }));

    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { inventory: {} }),
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 98, vitamin_c: 95, energy: 95, mood: 45, cleanliness: 80, teeth: 98, health: 100 },
      durationMs: 90000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['dig_hay']
    }));

    // Phase B: High mood & energy (adult) -> zoomies, popcorn, dancing, beaming
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 18, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 95, cleanliness: 90, teeth: 90, health: 100 },
      durationMs: 240000,
      stepMs: 250,
      waitIdleFirst: true
    }));

    // Phase C: Baby stage with high mood -> chirping
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'baby',
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 9, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 85, cleanliness: 90, teeth: 90, health: 100 },
      durationMs: 90000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['chirping']
    }));

    // Phase D: Low fullness -> wheeking & eat_hay
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { hayRack: { value: 0, max: 100 } }),
      sceneContext: { hour: 12, sceneKind: 'room' },
      needs: { fullness: 10, vitamin_c: 80, energy: 90, mood: 60, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['wheeking']
    }));

    // Phase E: Low vitamin_c -> begging
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 12, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 10, energy: 90, mood: 60, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['begging']
    }));

    // Phase F: Low mood -> sadness
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 16, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 10, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['sadness']
    }));

    // Phase G: Low health -> sickness
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { vet: { isSick: true } }),
      sceneContext: { hour: 16, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 60, cleanliness: 80, teeth: 80, health: 10 },
      durationMs: 60000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['sickness']
    }));

    // Phase H: Cold & Heat weather
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { weather: { tempC: 2 } }),
      sceneContext: { hour: 14, sceneKind: 'outdoor' },
      needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 60, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['cold']
    }));

    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { weather: { tempC: 33 } }),
      sceneContext: { hour: 14, sceneKind: 'outdoor' },
      needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 60, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['heat']
    }));

    // Phase I: Tired daytime -> yawning & nap
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { hayRack: { value: 0, max: 100 }, inventory: {} }),
      sceneContext: { hour: 13, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 55, mood: 60, cleanliness: 80, teeth: 90, health: 100 },
      durationMs: 180000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['yawning']
    }));

    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { hayRack: { value: 0, max: 100 }, inventory: {} }),
      sceneContext: { hour: 13, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 55, mood: 60, cleanliness: 80, teeth: 90, health: 100 },
      durationMs: 120000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['nap']
    }));

    // Phase J: Night & very low energy -> sleep
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 23, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 15, mood: 60, cleanliness: 80, teeth: 90, health: 100 },
      durationMs: 90000,
      stepMs: 250,
      waitIdleFirst: true,
      stopWhenActions: ['sleep']
    }));

    // Phase K: 2 pigs present on canvas -> rumblestrut, nose_touch, grooming_other, following, sleeping_together
    mergePhase(await runPhaseOnCanvas(page, {
      stage: 'adult',
      presentPigs: [
        { id: 'pig_1', name: 'Pip', stage: 'adult', x: 70, y: 110 },
        { id: 'pig_2', name: 'Pop', stage: 'adult', x: 110, y: 110 }
      ],
      statePatch: baseStatePatch,
      sceneContext: { hour: 23, sceneKind: 'room' },
      needs: { fullness: 80, vitamin_c: 80, energy: 30, mood: 65, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 120000,
      stepMs: 250,
      waitIdleFirst: true
    }));

    // Check which of the 28 actions appeared on canvas
    const missing28 = [];
    for (const act of actionsJson.actions) {
      const h = homeBehaviorJson.actions[act.id] || {};
      const expectedAnim = h.homeAnim || act.animation;
      const animHit = seenAnims.has(expectedAnim) ||
        (act.id === 'sleep' && seenAnims.has('sleep_house')) ||
        (act.id === 'nap' && seenAnims.has('sleep_house'));
      if (!seenActions.has(act.id) && !animHit) {
        missing28.push(act.id + '(' + expectedAnim + ')');
      }
    }
    check('PAR-all-28', missing28.length === 0,
      'Missing ' + missing28.length + ' of 28 actions on Home canvas: ' + missing28.join(', '));

    // Restore single pig for individual checks
    // 2. PAR-sleep-night: hour=23, energy=20 -> sleep/sleep_house within 60s and lasts >= 20s
    const sleepNightRes = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      window.CanvasPig.setPigVisible(true);
      inst.setBehaviorData(window._actionsData, window._homeBehaviorData);
      inst.currentAnim = 'idle';
      inst.animTimer = 0;
      inst.targetX = null;
      inst.targetY = null;
      inst.pendingSpot = null;
      inst.path = [];
      window.CanvasPig.setThings([{ id: 'h1', itemId: 'sig_james_hideout', x: 96, y: 104, w: 2, h: 2, comfort: 4 }]);
      inst.lastState.vet = { isSick: false };
      inst.lastState.weather = { tempC: 20 };
      window.CanvasPig.setSceneContext({ hour: 23, sceneKind: 'room' });
      window.CanvasPig.setNeeds({ fullness: 80, vitamin_c: 80, energy: 20, mood: 70, cleanliness: 80, teeth: 80, health: 100 });

      let enteredAt = null;
      let asleepMs = 0;
      for (let t = 0; t <= 90000; t += 250) {
        const d = window.CanvasPig.debug();
        const a = d.pig.anim;
        if (a === 'sleep' || a === 'sleep_house') {
          if (enteredAt === null) enteredAt = t;
          asleepMs += 250;
        }
        if (asleepMs >= 20000) break;
        window.CanvasPig.fastForward(250);
      }
      return { enteredAt, asleepMs, anim: window.CanvasPig.debug().pig.anim };
    });
    check('PAR-sleep-night',
      sleepNightRes.enteredAt !== null && sleepNightRes.enteredAt <= 60000 && sleepNightRes.asleepMs >= 20000,
      'Expected sleep/sleep_house within 60s lasting >=20s at night, got enteredAt=' + sleepNightRes.enteredAt + ', asleepMs=' + sleepNightRes.asleepMs);

    // 3. PAR-doze-day: hour=13, energy=60 -> doze (nap)
    const dozeRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      things: [{ id: 'bed1', itemId: 'armchair', x: 96, y: 105, w: 2, h: 2, comfort: 4 }],
      statePatch: Object.assign({}, baseStatePatch, { hayRack: { value: 0, max: 100 }, inventory: {} }),
      sceneContext: { hour: 13, sceneKind: 'room' },
      needs: { fullness: 95, vitamin_c: 95, energy: 60, mood: 65, cleanliness: 80, teeth: 95, health: 100 },
      durationMs: 120000,
      stepMs: 250,
      stopWhenAnims: ['doze']
    });
    check('PAR-doze-day', !!(dozeRes.anims.doze || dozeRes.actionIds.nap),
      'Expected doze/nap in daytime when tired (hour=13, energy=60), saw anims=' + Object.keys(dozeRes.anims).join(','));

    // 4. PAR-drink-thirst
    const drinkRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 85, vitamin_c: 85, energy: 85, mood: 50, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 180000,
      stepMs: 250,
      stopWhenActions: ['drink']
    });
    check('PAR-drink-thirst', !!(drinkRes.anims.drink || drinkRes.actionIds.drink),
      'Expected drink action when water_bottle in inventory, saw actions=' + Object.keys(drinkRes.actionIds).join(','));

    // 5. PAR-eat-hunger
    const eatRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 15, vitamin_c: 85, energy: 85, mood: 70, cleanliness: 80, teeth: 70, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      stopWhenActions: ['eat_hay']
    });
    check('PAR-eat-hunger', !!(eatRes.anims.eat || eatRes.actionIds.eat_hay),
      'Expected eat_hay when fullness=15 and hayRack=100, saw actions=' + Object.keys(eatRes.actionIds).join(','));

    // 6. PAR-scratch-occurs (effects={} in actions.json:220; triggers via base_weight/grooming budget)
    const scratchRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { hayRack: { value: 0, max: 100 }, inventory: {} }),
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 90, mood: 60, cleanliness: 30, teeth: 90, health: 100 },
      durationMs: 240000,
      stepMs: 250,
      stopWhenActions: ['scratching']
    });
    check('PAR-scratch-occurs', !!(scratchRes.anims.scratch || scratchRes.actionIds.scratching),
      'Expected scratching to occur during grooming/idle cycle, saw actions=' + Object.keys(scratchRes.actionIds).join(','));

    // 7. PAR-needs-drive: low fullness -> eat/wheek, low vitC -> beg, low mood -> sad, low health -> sick
    const wheekRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { hayRack: { value: 0, max: 100 } }),
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 10, vitamin_c: 85, energy: 85, mood: 60, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      stopWhenAnims: ['wheek']
    });
    const begRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 85, vitamin_c: 10, energy: 85, mood: 60, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      stopWhenAnims: ['beg']
    });
    const sadRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 85, vitamin_c: 85, energy: 85, mood: 10, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 60000,
      stepMs: 250,
      stopWhenAnims: ['sad']
    });
    const sickRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { vet: { isSick: true } }),
      sceneContext: { hour: 10, sceneKind: 'room' },
      needs: { fullness: 85, vitamin_c: 85, energy: 85, mood: 60, cleanliness: 80, teeth: 80, health: 10 },
      durationMs: 60000,
      stepMs: 250,
      stopWhenAnims: ['sick']
    });
    check('PAR-needs-drive',
      !!(wheekRes.anims.wheek && begRes.anims.beg && sadRes.anims.sad && sickRes.anims.sick),
      'Needs drive missing: wheek=' + !!wheekRes.anims.wheek + ', beg=' + !!begRes.anims.beg +
      ', sad=' + !!sadRes.anims.sad + ', sick=' + !!sickRes.anims.sick);

    // 8. PAR-run-zoomies: run triggers and is faster than walk
    const zoomiesCheck = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      window.CanvasPig.setPigVisible(true);
      inst.setBehaviorData(window._actionsData, window._homeBehaviorData);
      inst.lastState.vet = { isSick: false };
      inst.lastState.weather = { tempC: 20 };
      window.CanvasPig.setSceneContext({ hour: 18, sceneKind: 'room' });
      window.CanvasPig.setNeeds({ fullness: 90, vitamin_c: 90, energy: 90, mood: 95, cleanliness: 90, teeth: 90, health: 100 });

      let walkDistPerSec = 0;
      let runDistPerSec = 0;
      let sawRun = false;
      for (let t = 0; t < 180000; t += 100) {
        const prevX = inst.pigX;
        const prevY = inst.pigY;
        window.CanvasPig.fastForward(100);
        const anim = inst.currentAnim;
        const moved = Math.hypot(inst.pigX - prevX, inst.pigY - prevY) * 10;
        if (anim === 'walk' && moved > walkDistPerSec) walkDistPerSec = moved;
        if (anim === 'run') {
          sawRun = true;
          if (moved > runDistPerSec) runDistPerSec = moved;
        }
        if (sawRun && walkDistPerSec > 0 && runDistPerSec > walkDistPerSec) break;
      }
      const pmRun = window.PigMotion ? window.PigMotion.speed('run', inst.stageKey, inst.motionCfg) : 0;
      const pmWalk = window.PigMotion ? window.PigMotion.speed('walk', inst.stageKey, inst.motionCfg) : 0;
      return { sawRun, runDistPerSec, walkDistPerSec, pmRun, pmWalk };
    });
    check('PAR-run-zoomies',
      zoomiesCheck.sawRun && zoomiesCheck.pmRun > zoomiesCheck.pmWalk && zoomiesCheck.runDistPerSec > zoomiesCheck.walkDistPerSec,
      'Zoomies run check failed: ' + JSON.stringify(zoomiesCheck));

    // 9. PAR-dance-high-mood & PAR-dance-music
    const danceRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: baseStatePatch,
      sceneContext: { hour: 18, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 80, mood: 92, cleanliness: 90, teeth: 90, health: 100 },
      durationMs: 180000,
      stepMs: 250,
      stopWhenAnims: ['dance']
    });
    check('PAR-dance-high-mood', !!(danceRes.anims.dance || danceRes.actionIds.dancing),
      'Expected dance when mood=92 and energy=80, saw actions=' + Object.keys(danceRes.actionIds).join(','));

    const musicState = await page.evaluate(async () => {
      if (!window.CuyMusic || typeof window.CuyMusic.play !== 'function') return { supported: false };
      try {
        await window.CuyMusic.play('home_day', { loop: true, volume: 0.1 });
      } catch (e) {}
      await new Promise(r => setTimeout(r, 150));
      return {
        supported: true,
        isPlaying: typeof window.CuyMusic.isPlaying === 'function' ? window.CuyMusic.isPlaying() : false
      };
    });
    if (!musicState.supported || !musicState.isPlaying) {
      skip('PAR-dance-music', 'Mock/headless environment has no active playing music track (CuyMusic.isPlaying()=' + musicState.isPlaying + ')');
    } else {
      const danceMusicRes = await runPhaseOnCanvas(page, {
        resetBehavior: true,
        singlePig: true,
        statePatch: baseStatePatch,
        sceneContext: { hour: 18, sceneKind: 'room' },
        needs: { fullness: 90, vitamin_c: 90, energy: 80, mood: 88, cleanliness: 90, teeth: 90, health: 100 },
        durationMs: 120000,
        stepMs: 250,
        stopWhenAnims: ['dance']
      });
      check('PAR-dance-music', !!(danceMusicRes.anims.dance || danceMusicRes.actionIds.dancing),
        'Expected dance when musicPlaying=true and mood=88');
    }

    // 10. PAR-no-sleep-in-drag: pointer drag interrupts sleep and blocks new sleep
    const dragPrep = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      window.CanvasPig.setPigVisible(true);
      inst.setBehaviorData(window._actionsData, window._homeBehaviorData);
      window.CanvasPig.setThings([]);
      window.CanvasPig.setSceneContext({ hour: 23, sceneKind: 'room' });
      window.CanvasPig.setNeeds({ fullness: 85, vitamin_c: 85, energy: 15, mood: 70, cleanliness: 80, teeth: 80, health: 100 });
      for (let t = 0; t < 60000; t += 250) {
        window.CanvasPig.fastForward(250);
        if (inst.currentAnim === 'sleep' || inst.currentAnim === 'sleep_house') break;
      }
      const pt = window.CanvasPig.toClient(inst.pigX, inst.pigY - 6);
      return {
        animBefore: inst.currentAnim,
        clientX: pt.clientX,
        clientY: pt.clientY
      };
    });

    await page.mouse.move(dragPrep.clientX, dragPrep.clientY);
    await page.mouse.down();
    await page.mouse.move(dragPrep.clientX + 12, dragPrep.clientY - 12);
    await page.waitForTimeout(100);

    const duringDrag = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      const draggingNow = window.CanvasPig.isDragging();
      const animRightAfter = inst.currentAnim;
      window.CanvasPig.fastForward(5000);
      const animAfterFastForward = inst.currentAnim;
      const behCur = inst.behavior && inst.behavior.current();
      return { draggingNow, animRightAfter, animAfterFastForward, behCur };
    });

    await page.mouse.up();
    await page.waitForTimeout(100);

    const sleepInterrupted = (dragPrep.animBefore === 'sleep' || dragPrep.animBefore === 'sleep_house') &&
      duringDrag.draggingNow &&
      duringDrag.animAfterFastForward !== 'sleep' &&
      duringDrag.animAfterFastForward !== 'sleep_house' &&
      (!duringDrag.behCur || (duringDrag.behCur.id !== 'sleep' && duringDrag.behCur.id !== 'nap'));
    check('PAR-no-sleep-in-drag', sleepInterrupted,
      'Drag did not interrupt/block sleep: before=' + dragPrep.animBefore + ', during=' + JSON.stringify(duringDrag));

    // 11. PAR-sick-no-run: sick=true prevents zoomies/run, popcorn, dancing
    const sickNoRunRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      singlePig: true,
      statePatch: Object.assign({}, baseStatePatch, { vet: { isSick: true } }),
      sceneContext: { hour: 18, sceneKind: 'room' },
      needs: { fullness: 90, vitamin_c: 90, energy: 95, mood: 98, cleanliness: 90, teeth: 90, health: 20 },
      durationMs: 600000,
      stepMs: 250
    });
    const forbiddenWhileSick = ['run', 'popcorn', 'dance'].filter((a) => sickNoRunRes.anims[a] > 0);
    check('PAR-sick-no-run', forbiddenWhileSick.length === 0,
      'Forbidden animations occurred while sick: ' + forbiddenWhileSick.join(', '));

    // 12. PAR-two-pigs-sleep-together
    const twoPigsRes = await runPhaseOnCanvas(page, {
      resetBehavior: true,
      presentPigs: [
        { id: 'pig_1', name: 'Pip', stage: 'adult', x: 80, y: 110 },
        { id: 'pig_2', name: 'Pop', stage: 'adult', x: 120, y: 110 }
      ],
      things: [{ id: 'sofa1', itemId: 'sofa_cosy', x: 100, y: 106, w: 3, h: 2, comfort: 6 }],
      statePatch: baseStatePatch,
      sceneContext: { hour: 23, sceneKind: 'room' },
      needs: { fullness: 85, vitamin_c: 85, energy: 25, mood: 70, cleanliness: 80, teeth: 80, health: 100 },
      durationMs: 120000,
      stepMs: 250,
      stopWhenAnims: ['sleep_together']
    });
    check('PAR-two-pigs-sleep-together',
      !!(twoPigsRes.anims.sleep_together || twoPigsRes.actionIds.sleeping_together),
      'Two pigs did not trigger sleep_together on Home canvas (saw anims=' + Object.keys(twoPigsRes.anims).join(',') + ')');

    // 13. PAR-actions-not-stuck: verify no action exceeded maxMs in home_behavior.json
    const stuckActions = [];
    for (const [actId, runMs] of Object.entries(observedMaxRunMs)) {
      const h = homeBehaviorJson.actions[actId];
      if (!h || !h.maxMs) continue;
      // Allow 1 step (250ms) boundary tolerance
      if (runMs > h.maxMs + 250) {
        stuckActions.push(actId + '(' + runMs + 'ms > maxMs ' + h.maxMs + 'ms)');
      }
    }
    check('PAR-actions-not-stuck', stuckActions.length === 0,
      'Actions ran longer than maxMs: ' + stuckActions.join(', '));

    // 14. PAR-deterministic: fixed rng seed yields identical action sequence
    const detMatch = await page.evaluate(() => {
      if (!window.PigBehavior || typeof window.PigBehavior.create !== 'function') return false;
      function makeRng(seed) {
        let s = seed >>> 0;
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 4294967296;
        };
      }
      function runSeq() {
        const pb = window.PigBehavior.create({
          data: window._actionsData,
          homeData: window._homeBehaviorData,
          rng: makeRng(42),
          stage: 'adult'
        });
        const seq = [];
        const ctx = {
          needs: { fullness: 60, vitamin_c: 70, energy: 60, mood: 70, cleanliness: 80, teeth: 60, health: 100 },
          hour: 14,
          sceneKind: 'room',
          hasSpot: () => true,
          hayInRack: 80,
          items: { water_bottle: 1, chew_stick: 1 }
        };
        for (let i = 0; i < 600; i++) {
          const d = pb.tick(1000, ctx);
          if (d) seq.push(d.id + ':' + d.durationMs);
        }
        return seq;
      }
      const a = runSeq();
      const b = runSeq();
      return a.length > 5 && JSON.stringify(a) === JSON.stringify(b);
    });
    check('PAR-deterministic', detMatch, 'Deterministic rng produced different sequences across identical runs');

    // 15. PAR-no-console-errors: 10 min simulation without console/page errors
    await page.evaluate(() => {
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.fastForward(600000);
    });
    check('PAR-no-console-errors', page.__errors.length === 0,
      'Errors during 10 min simulation: ' + page.__errors.join(' | '));

    // 16. PAR-all-scenes: unlock all 7 scenes and run basic check in each
    const sceneReport = await page.evaluate(() => {
      const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
      const st = window.CanvasPig.instance.lastState;
      if (st && st.places && Array.isArray(st.places.order)) {
        st.places.order.forEach((s) => { s.locked = false; });
      }
      const results = [];
      for (const id of scenes) {
        if (window.CuyScenes && typeof window.CuyScenes.def === 'function') {
          const def = window.CuyScenes.def(id, st);
          window.CanvasPig.setScene(def);
          window.CanvasPig.setSceneContext({ hour: 12, sceneKind: def.kind || 'room' });
          window.CanvasPig.fastForward(5000);
          const d = window.CanvasPig.debug();
          const w = def.walk || [0, 0, d.sceneSize[0], d.sceneSize[1]];
          const inWalk = d.pig.x >= w[0] && d.pig.x <= w[2] && d.pig.y >= w[1] && d.pig.y <= w[3];
          const free = window.CanvasPig.isFree(d.pig.x, d.pig.y);
          results.push({ id, sceneId: d.sceneId, x: d.pig.x, y: d.pig.y, inWalk, free });
        }
      }
      return results;
    });
    const badScenes = sceneReport.filter((r) => r.sceneId !== r.id || !r.inWalk || !r.free);
    check('PAR-all-scenes', sceneReport.length === 7 && badScenes.length === 0 && page.__errors.length === 0,
      'count=' + sceneReport.length + ' issues=' + JSON.stringify(badScenes) + (page.__errors.length ? ' errors=' + page.__errors.join(';') : ''));

    console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
    if (process.env.STRICT && defects.length) process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
