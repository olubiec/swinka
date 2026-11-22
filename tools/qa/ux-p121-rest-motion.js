'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');
const RestSpots = require('../../web/home/lib/rest-spots');
const PigMotion = require('../../web/home/lib/pig-motion');

const ROOT = path.resolve(__dirname, '..', '..');
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

async function main() {
  const homeBehavior = JSON.parse(fs.readFileSync(HOME_BEHAVIOR_PATH, 'utf8'));
  const motionCfg = homeBehavior.motion;

  // --- Pure module checks + Playwright canvas checks ---
  const baseScene = {
    id: 'salon',
    kind: 'room',
    walk: [16, 92, 240, 132],
    tilePx: 16,
    isFree: (x, y) => x >= 16 && x <= 240 && y >= 92 && y <= 132
  };

  // 1. RM-house-nose-only
  const houseThing = { id: 'h1', uid: 'u:h1', itemId: 'sig_james_hideout', x: 96, y: 108, w: 2, h: 2, comfort: 4 };
  const cushionThing = { id: 'c1', uid: 'u:c1', itemId: 'cushion_big', x: 50, y: 112, w: 1, h: 1, comfort: 3 };
  const houseSpot = RestSpots.pick({
    kind: 'sleep',
    scene: baseScene,
    things: [cushionThing, houseThing],
    pigPos: { x: 40, y: 112 }
  });
  const houseInside = houseSpot &&
    Math.abs(houseSpot.gx - houseThing.x) <= 24 &&
    Math.abs(houseSpot.gy - houseThing.y) <= 24;
  check('RM-house-nose-only',
    !!(houseSpot && houseSpot.spotType === 'house' && houseSpot.anim === 'sleep_house' &&
      houseInside && baseScene.isFree(houseSpot.gx, houseSpot.gy)),
    'House spot failed: ' + JSON.stringify(houseSpot));

  // 2. RM-bed-and-cushion
  const bedThing = { id: 'b1', uid: 'u:b1', itemId: 'armchair', x: 140, y: 108, w: 2, h: 2, comfort: 4 };
  const pick1 = RestSpots.pick({
    kind: 'sleep',
    scene: baseScene,
    things: [cushionThing, bedThing],
    pigPos: { x: 50, y: 112 }
  });
  const pick2 = RestSpots.pick({
    kind: 'sleep',
    scene: baseScene,
    things: [cushionThing, bedThing],
    taken: pick1 ? [{ gx: pick1.gx, gy: pick1.gy, thingId: pick1.thingId }] : [],
    pigPos: { x: 50, y: 112 }
  });
  const napPick = RestSpots.pick({
    kind: 'nap',
    scene: baseScene,
    things: [bedThing]
  });
  check('RM-bed-and-cushion',
    !!(pick1 && pick1.spotType === 'bed' && pick1.anim === 'sleep' &&
      pick2 && pick2.spotType === 'cushion' && pick2.anim === 'sleep' &&
      napPick && napPick.anim === 'doze'),
    'Bed/cushion priority failed: pick1=' + JSON.stringify(pick1) + ', pick2=' + JSON.stringify(pick2) + ', nap=' + JSON.stringify(napPick));

  // 3. RM-no-spot-fallback-floor
  const floorPick = RestSpots.pick({
    kind: 'sleep',
    scene: baseScene,
    things: []
  });
  const blockedScene = {
    id: 'blocked',
    kind: 'room',
    walk: [16, 92, 240, 132],
    tilePx: 16,
    isFree: () => false
  };
  const noFreePick = RestSpots.pick({ kind: 'sleep', scene: blockedScene, things: [] });
  const badPick1 = RestSpots.pick(null);
  const badPick2 = RestSpots.pick({ scene: {} });
  check('RM-no-spot-fallback-floor',
    !!(floorPick && floorPick.spotType === 'floor' && floorPick.anim === 'sleep' &&
      baseScene.isFree(floorPick.gx, floorPick.gy) &&
      noFreePick === null && badPick1 === null && badPick2 === null),
    'Floor fallback or null handling failed: floorPick=' + JSON.stringify(floorPick) + ', noFree=' + noFreePick);

  // 4. RM-two-pigs-sleep-together
  const sofaThing = { id: 's1', uid: 'u:s1', itemId: 'sofa_cosy', x: 112, y: 108, w: 3, h: 2, comfort: 6 };
  const pairPick = RestSpots.pick({
    kind: 'sleep_together',
    scene: baseScene,
    things: [sofaThing]
  });
  const pairFloor = RestSpots.pick({
    kind: 'sleep_together',
    scene: baseScene,
    things: []
  });
  const narrowScene = { id: 'narrow', kind: 'room', walk: [10, 96, 20, 120], isFree: () => true };
  const narrowPair = RestSpots.pick({ kind: 'sleep_together', scene: narrowScene, things: [] });
  const pairDist = pairPick && pairPick.pair
    ? Math.hypot(pairPick.pair.gx - pairPick.gx, pairPick.pair.gy - pairPick.gy)
    : 0;
  check('RM-two-pigs-sleep-together',
    !!(pairPick && pairPick.pair && pairDist >= 18 &&
      pairPick.anim === 'sleep_together' && pairPick.pair.anim === 'sleep_together' &&
      pairPick.faceLeft !== pairPick.pair.faceLeft &&
      baseScene.isFree(pairPick.gx, pairPick.gy) &&
      baseScene.isFree(pairPick.pair.gx, pairPick.pair.gy) &&
      pairFloor && pairFloor.pair && pairFloor.spotType === 'floor' &&
      narrowPair === null),
    'sleep_together failed: pairPick=' + JSON.stringify(pairPick) + ', dist=' + pairDist + ', narrow=' + narrowPair);

  // 5. RM-hop-above-and-returns (pure PigMotion)
  const dur = motionCfg.hop.popcornDurationMs;
  const maxH = motionCfg.hop.popcornHeightPx;
  const y0 = PigMotion.offsetY('popcorn', 0, motionCfg);
  const yMid = PigMotion.offsetY('popcorn', dur / 2, motionCfg);
  const yEnd = PigMotion.offsetY('popcorn', dur, motionCfg);
  const yAfter = PigMotion.offsetY('popcorn', dur + 200, motionCfg);
  let anyNeg = false;
  for (let t = -50; t <= dur + 200; t += 17) {
    if (PigMotion.offsetY('popcorn', t, motionCfg) < 0) anyNeg = true;
  }
  const walkY = PigMotion.offsetY('walk', 200, motionCfg);
  check('RM-hop-above-and-returns',
    y0 === 0 && Math.abs(yMid - maxH) < 0.01 && yEnd === 0 && yAfter === 0 && !anyNeg && walkY === 0,
    'Hop curve invalid: y0=' + y0 + ', yMid=' + yMid + ' (exp ' + maxH + '), yEnd=' + yEnd + ', yAfter=' + yAfter + ', anyNeg=' + anyNeg);

  // 6. RM-zzz-only-while-asleep (pure PigMotion)
  const nonSleepZzz = ['walk', 'idle', 'popcorn', 'run', 'eat'].some((anim) => {
    const p = PigMotion.particles(anim, 2000, () => 0.5, motionCfg, 0);
    return p.some((pt) => pt.type === 'zzz');
  });
  const sleepZzz = ['sleep', 'sleep_house', 'doze', 'sleep_together'].every((anim) => {
    const p = PigMotion.particles(anim, motionCfg.particles.zzzIntervalMs + 10, () => 0.5, motionCfg, 0);
    return p.length === 1 && p[0].type === 'zzz';
  });
  const capBlock = PigMotion.particles('sleep', 2000, () => 0.5, motionCfg, motionCfg.particles.maxActive);
  check('RM-zzz-only-while-asleep', !nonSleepZzz && sleepZzz && capBlock.length === 0,
    'Particle rules failed: nonSleepZzz=' + nonSleepZzz + ', sleepZzz=' + sleepZzz + ', capBlockLen=' + capBlock.length);

  // --- Browser / Home Canvas checks ---
  const server = await startServer();
  let browser;
  try {
    browser = await launchBrowser();
    const page = await openHome(browser);

    // Unlock all 7 scenes and apply mock seven
    await page.evaluate(() => {
      if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function') {
        const seven = window.CuyScenesMock.state('seven');
        seven.places.order.forEach((s) => { s.locked = false; });
        const st = (window.bridge && typeof window.bridge.getMockState === 'function')
          ? window.bridge.getMockState()
          : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.lastState);
        if (st) {
          st.places = seven.places;
          st.rooms = Object.assign({}, st.rooms || {}, seven.rooms || {});
          if (window.bridge && typeof window.bridge.broadcastState === 'function') {
            window.bridge.broadcastState();
          }
        }
      }
    });
    await page.waitForTimeout(200);

    // 7. RM-spot-not-on-blocked-cell across all 7 scenes on real CanvasPig
    const sevenSceneIssues = await page.evaluate(() => {
      const sceneIds = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
      const st = window.CanvasPig.instance.lastState;
      const issues = [];
      for (const id of sceneIds) {
        const def = window.CuyScenes.def(id, st);
        window.CanvasPig.setScene(def);
        const inst = window.CanvasPig.instance;
        const things = inst.things || [];
        const scObj = {
          id: id,
          kind: def.kind || 'room',
          walk: inst.walk,
          isFree: (x, y) => window.CanvasPig.isFree(x, y)
        };
        for (const kind of ['sleep', 'nap', 'sleep_together']) {
          const spot = window.RestSpots.pick({ kind, scene: scObj, things, taken: [] });
          if (spot) {
            const w = inst.walk;
            const inW = spot.gx >= w[0] && spot.gx <= w[2] && spot.gy >= w[1] && spot.gy <= w[3];
            const free = window.CanvasPig.isFree(spot.gx, spot.gy);
            if (!inW || !free) {
              issues.push({ id, kind, spot, walk: w, inW, free });
            }
            if (spot.pair) {
              const pInW = spot.pair.gx >= w[0] && spot.pair.gx <= w[2] && spot.pair.gy >= w[1] && spot.pair.gy <= w[3];
              const pFree = window.CanvasPig.isFree(spot.pair.gx, spot.pair.gy);
              if (!pInW || !pFree) {
                issues.push({ id, kind: kind + '_pair', pair: spot.pair, walk: w, pInW, pFree });
              }
            }
            // Pick a second spot with first in taken
            const spot2 = window.RestSpots.pick({
              kind,
              scene: scObj,
              things,
              taken: [{ gx: spot.gx, gy: spot.gy, thingId: spot.thingId }]
            });
            if (spot2 && !window.CanvasPig.isFree(spot2.gx, spot2.gy)) {
              issues.push({ id, kind: kind + '_2nd', spot2 });
            }
          }
        }
      }
      return issues;
    });
    check('RM-spot-not-on-blocked-cell', sevenSceneIssues.length === 0,
      'Blocked/out-of-bounds spots across 7 scenes: ' + JSON.stringify(sevenSceneIssues));

    // Switch back to salon for canvas motion/particle/spot tests
    await page.evaluate(() => {
      const st = window.CanvasPig.instance.lastState;
      const def = window.CuyScenes.def('salon', st);
      window.CanvasPig.setScene(def);
    });

    // 8. RM-hop-inside-scene on canvas at top edge of walk
    const hopCanvasRes = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      const w = inst.walk || [16, 92, 240, 132];
      window.CanvasPig.setPigVisible(true);
      if (!inst._savedBehavior && inst.behavior) inst._savedBehavior = inst.behavior;
      inst.behavior = null; // isolate hop animation on canvas
      inst.targetX = null;
      inst.targetY = null;
      inst.pigX = Math.round((w[0] + w[2]) / 2);
      inst.pigY = w[1]; // top edge of walk
      const startY = inst.pigY;
      inst.playAnim('popcorn', 900);

      let maxHop = 0;
      let minTopY = 9999;
      let minDrawY = 9999;
      for (let t = 0; t <= 950; t += 50) {
        const d = window.CanvasPig.debug();
        const hop = d.pig.hopOffsetY || 0;
        if (hop > maxHop) maxHop = hop;
        const visualFeetY = inst.pigY - hop;
        if (visualFeetY < minTopY) minTopY = visualFeetY;
        const scale = d.pig.scale || 1;
        const drawY = Math.round(inst.pigY - hop - Math.round(59 * scale));
        if (drawY < minDrawY) minDrawY = drawY;
        window.CanvasPig.fastForward(50);
      }
      const endHop = window.CanvasPig.debug().pig.hopOffsetY || 0;
      return { startY, endY: inst.pigY, maxHop, minTopY, minDrawY, endHop };
    });
    check('RM-hop-inside-scene',
      hopCanvasRes.maxHop > 9 && hopCanvasRes.minTopY >= 0 && hopCanvasRes.minDrawY >= 0 &&
      hopCanvasRes.endY === hopCanvasRes.startY && hopCanvasRes.endHop === 0,
      'Canvas hop out of bounds or did not return: ' + JSON.stringify(hopCanvasRes));

    // 9. RM-stage-speed (PigMotion + real CanvasPig walk distances)
    const speedRes = await page.evaluate(() => {
      const pm = window.PigMotion;
      const cfg = window._homeBehaviorData ? window._homeBehaviorData.motion : undefined;
      const pmBaby = pm.speed('walk', 'baby', cfg);
      const pmAdult = pm.speed('walk', 'adult', cfg);
      const pmSenior = pm.speed('walk', 'senior', cfg);
      const pmRun = pm.speed('run', 'adult', cfg);
      const pmFollow = pm.speed('follow', 'adult', cfg);

      const inst = window.CanvasPig.instance;
      inst.behavior = null;
      const w = inst.walk || [16, 92, 240, 132];
      const measureDist = (stage, moveAnim) => {
        window.CanvasPig.setStage(stage);
        inst.pigX = w[0] + 10;
        inst.pigY = Math.round((w[1] + w[3]) / 2);
        inst._moveAnim = moveAnim;
        inst.setTarget(w[2] - 10, inst.pigY);
        const x0 = inst.pigX;
        window.CanvasPig.fastForward(500);
        const dist = Math.abs(inst.pigX - x0);
        inst.targetX = null;
        inst.targetY = null;
        return dist;
      };
      const dBaby = measureDist('baby', 'walk');
      const dAdult = measureDist('adult', 'walk');
      const dSenior = measureDist('senior', 'walk');
      const dRun = measureDist('adult', 'run');
      window.CanvasPig.setStage('adult');
      return { pmBaby, pmAdult, pmSenior, pmRun, pmFollow, dBaby, dAdult, dSenior, dRun };
    });
    check('RM-stage-speed',
      speedRes.pmBaby > speedRes.pmAdult && speedRes.pmAdult > speedRes.pmSenior &&
      speedRes.pmRun > speedRes.pmAdult && speedRes.pmFollow > speedRes.pmAdult &&
      speedRes.dBaby > speedRes.dAdult && speedRes.dAdult > speedRes.dSenior && speedRes.dRun > speedRes.dAdult,
      'Stage/action speed ordering failed: ' + JSON.stringify(speedRes));

    // 10. RM-particles-cap (5 min sleep simulation on canvas)
    const capRes = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      inst.behavior = null;
      inst.particles = [];
      inst._particleAccMs = 0;
      inst.targetX = null;
      inst.targetY = null;
      inst.playAnim('sleep', 310000);
      let maxSeen = 0;
      let sawZzz = false;
      for (let t = 0; t < 300000; t += 200) {
        window.CanvasPig.fastForward(200);
        if (inst.particles.length > maxSeen) maxSeen = inst.particles.length;
        if (inst.particles.some((p) => p.type === 'zzz')) sawZzz = true;
      }
      return { maxSeen, sawZzz, finalCount: inst.particles.length };
    });
    check('RM-particles-cap',
      capRes.sawZzz && capRes.maxSeen > 0 && capRes.maxSeen <= motionCfg.particles.maxActive,
      '5 min sleep particle cap failed: ' + JSON.stringify(capRes));

    // 11. RM-wake-leaves-spot: waking up / removing spot never leaves pig on blocked cell
    const wakeRes = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      window.CanvasPig.setThings([{ id: 'h1', uid: 'u:h1', itemId: 'sig_james_hideout', x: 96, y: 108, w: 2, h: 2, comfort: 4 }]);
      const t = inst.things[0];
      // Force pig onto blocked center of thing, then wake & enforceFreePigs
      inst.pigX = t.x;
      inst.pigY = t.y;
      const blockedBefore = !window.CanvasPig.isFree(inst.pigX, inst.pigY);
      inst.playAnim('idle', 1000);
      inst.enforceFreePigs(true);
      const freeAfter = window.CanvasPig.isFree(inst.pigX, inst.pigY);
      return { blockedBefore, freeAfter, x: inst.pigX, y: inst.pigY };
    });
    check('RM-wake-leaves-spot', wakeRes.freeAfter === true,
      'Pig left on blocked cell after wake/enforceFreePigs: ' + JSON.stringify(wakeRes));

    // 12. RM-edit-moves-house-while-sleeping
    const editMoveRes = await page.evaluate(async () => {
      const inst = window.CanvasPig.instance;
      if (!inst.behavior && inst._savedBehavior) inst.behavior = inst._savedBehavior;
      if (!inst.behavior && typeof inst.setBehaviorData === 'function') {
        const [a, h] = await Promise.all([
          fetch('../../assets/data/actions.json').then(r => r.json()).catch(() => null),
          fetch('../../assets/data/home_behavior.json').then(r => r.json()).catch(() => null)
        ]);
        if (a && h) inst.setBehaviorData(a, h);
      }
      const house1 = { id: 'h1', uid: 'u:h1', itemId: 'sig_james_hideout', x: 96, y: 108, w: 2, h: 2, comfort: 4 };
      window.CanvasPig.setThings([house1]);
      // Start sleeping in house
      inst.pigX = 96;
      inst.pigY = 107;
      inst.playAnim('sleep_house', 60000);
      // Move house in Edit mode (setThings with moved house)
      const houseMoved = { id: 'h1', uid: 'u:h1', itemId: 'sig_james_hideout', x: 160, y: 108, w: 2, h: 2, comfort: 4 };
      window.CanvasPig.setThings([houseMoved]);
      const animAfterMove = inst.currentAnim;
      const freeAfterMove = window.CanvasPig.isFree(inst.pigX, inst.pigY);
      const pendingAfterMove = inst.pendingSpot;

      // Also test removing house completely while sleeping
      inst.playAnim('sleep_house', 60000);
      window.CanvasPig.setThings([]);
      const animAfterRemove = inst.currentAnim;
      const freeAfterRemove = window.CanvasPig.isFree(inst.pigX, inst.pigY);

      return {
        hasBehavior: !!inst.behavior,
        animAfterMove,
        freeAfterMove,
        pendingAfterMove,
        animAfterRemove,
        freeAfterRemove
      };
    });
    check('RM-edit-moves-house-while-sleeping',
      editMoveRes.hasBehavior &&
      editMoveRes.freeAfterMove && editMoveRes.freeAfterRemove &&
      editMoveRes.pendingAfterMove === null &&
      page.__errors.length === 0 &&
      editMoveRes.animAfterRemove !== 'sleep_house',
      'Edit move/remove house while sleeping issue: ' + JSON.stringify(editMoveRes) +
      (page.__errors.length ? ' errors=' + page.__errors.join(';') : ''));

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
