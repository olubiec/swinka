'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function makeMockCanvas() {
  const ctx = {
    imageSmoothingEnabled: false,
    fillStyle: '#000',
    strokeStyle: '#000',
    font: '10px monospace',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    drawImage() {},
    fillText() {},
    measureText(t) { return { width: (t ? t.length : 0) * 6 }; },
    createPattern() { return {}; },
    getImageData() { return { data: new Uint8ClampedArray(64 * 64 * 4) }; },
    putImageData() {}
  };
  return {
    width: 256,
    height: 144,
    dataset: {},
    style: {},
    _listeners: {},
    getContext() { return ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 256, bottom: 144, width: 256, height: 144 }; },
    addEventListener(ev, fn) {
      this._listeners[ev] = this._listeners[ev] || [];
      this._listeners[ev].push(fn);
    },
    setPointerCapture() {},
    hasPointerCapture() { return false; },
    releasePointerCapture() {}
  };
}

function setupNodeEnv() {
  if (!global.window) global.window = global;
  if (!global.document) {
    global.document = {
      hidden: false,
      readyState: 'complete',
      body: { classList: { contains: () => false } },
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      dispatchEvent: () => true,
      createElement: (tag) => (tag === 'canvas' ? makeMockCanvas() : { style: {} })
    };
  }
  if (!global.CustomEvent) {
    global.CustomEvent = function (type, init) {
      this.type = type;
      this.detail = init && init.detail;
    };
  }
  if (!global.Image) {
    global.Image = function () {
      this.naturalWidth = 64;
      this.naturalHeight = 64;
      this.width = 64;
      this.height = 64;
      this.complete = true;
    };
  }

  // STUB index.html / app.js: load pure modules and JSON data directly
  console.log('STUB index.html/app.js: loading web/home/lib/*.js & assets/data/*.json');
  require(path.join(ROOT, 'web/home/lib/pig-behavior.js'));
  require(path.join(ROOT, 'web/home/lib/rest-spots.js'));
  require(path.join(ROOT, 'web/home/lib/pig-motion.js'));
  require(path.join(ROOT, 'web/home/lib/pig-reactions.js'));
  require(path.join(ROOT, 'web/home/lib/draw-budget.js'));
  require(path.join(ROOT, 'web/home/features/places/scenes.js'));
  require(path.join(ROOT, 'web/home/canvas-pig.js'));

  const actionsData = loadJson('assets/data/actions.json');
  const homeBehaviorData = loadJson('assets/data/home_behavior.json');
  const limitsData = loadJson('assets/data/draw_limits.json');
  if (global.DrawBudget && typeof global.DrawBudget.setLimits === 'function') {
    global.DrawBudget.setLimits(limitsData);
  }

  const canvas = makeMockCanvas();
  const inst = new global.PigCanvas(canvas);
  inst.stopped = true;
  global.CanvasPig.instance = inst;
  global.PigCanvas.instance = inst;
  global.CuyPig = global.CuyPig || {};
  global.CuyPig.mainInstance = inst;

  return { inst, actionsData, homeBehaviorData };
}

function simulate(inst, totalMs, stepMs, onStep) {
  let rem = totalMs;
  while (rem > 0) {
    const dt = Math.min(stepMs, rem);
    inst.update(dt);
    if (onStep) onStep(dt);
    rem -= dt;
  }
}

async function run() {
  const errors = [];
  const origConsoleError = console.error;
  console.error = (...args) => {
    errors.push(args.join(' '));
    origConsoleError.apply(console, args);
  };

  const { inst, actionsData, homeBehaviorData } = setupNodeEnv();
  const CanvasPig = global.CanvasPig;
  const CuyScenes = global.CuyScenes;
  const salonDef = CuyScenes.def('salon');

  const results = [];
  function check(name, fn) {
    try {
      fn();
      console.log('PASS ' + name);
      results.push({ name, ok: true });
    } catch (err) {
      console.log('FAIL ' + name + ': ' + err.message);
      results.push({ name, ok: false, err });
    }
  }

  // C10 first (before setBehaviorData) to verify legacy idle/sniff/popcorn/walk still works
  check('C10 old-idle-sniff-popcorn-still-possible', () => {
    CanvasPig.setScene(salonDef);
    CanvasPig.setPigVisible(true);
    CanvasPig.setExitsEnabled(false);
    const seen = new Set();
    simulate(inst, 45000, 100, () => {
      seen.add(inst.currentAnim);
    });
    assert(seen.has('walk') || seen.has('sniff') || seen.has('popcorn'),
      'Expected legacy walk/sniff/popcorn, saw: ' + Array.from(seen).join(','));
  });

  // Wire behavior data for C1-C8
  CanvasPig.setBehaviorData(actionsData, homeBehaviorData);

  // C1: sleeps-at-night-low-energy
  check('C1 sleeps-at-night-low-energy', () => {
    CanvasPig.setScene(salonDef);
    inst.targetX = null;
    inst.targetY = null;
    inst.animTimer = 0;
    inst.currentAnim = 'idle';
    CanvasPig.setThings([{ id: 'pigloo_garden', uid: 'h1', x: 100, y: 105, w: 2, h: 2 }]);
    CanvasPig.setSceneContext({ hour: 23, sceneKind: 'room' });
    CanvasPig.setNeeds({ fullness: 80, energy: 5, mood: 60, vitamin_c: 80, cleanliness: 80, teeth: 80 });
    const seen = new Set();
    let slept = false;
    simulate(inst, 60000, 100, () => {
      seen.add(inst.currentAnim);
      if (inst.currentAnim === 'sleep' || inst.currentAnim === 'sleep_house') slept = true;
    });
    assert(slept, 'Expected pig to play sleep/sleep_house within 60 s at night with low energy; saw: ' + Array.from(seen).join(','));
  });

  // C2: popcorn-hops
  check('C2 popcorn-hops', () => {
    CanvasPig.setScene(salonDef);
    inst.drag = null;
    inst._toss = null;
    inst.playAnim('popcorn', 1000);
    let maxOffset = 0;
    simulate(inst, 900, 50, () => {
      const dbg = CanvasPig.debug();
      if (dbg.pig.hopOffsetY > maxOffset) maxOffset = dbg.pig.hopOffsetY;
    });
    assert(maxOffset > 0, 'Expected hopOffsetY > 0 during popcorn, got ' + maxOffset);
  });

  // C3: drink-and-scratch-occur
  check('C3 drink-and-scratch-occur', () => {
    CanvasPig.setScene(salonDef);
    inst.lastState = Object.assign({}, inst.lastState || {}, { inventory: ['water_bottle'] });
    CanvasPig.setSceneContext({ hour: 14, sceneKind: 'room' });
    CanvasPig.setNeeds({ fullness: 75, energy: 75, mood: 75, vitamin_c: 75, cleanliness: 75, teeth: 75 });
    const seen = new Set();
    simulate(inst, 600000, 200, () => {
      seen.add(inst.currentAnim);
    });
    assert(seen.has('drink'), 'Expected drink within 10 min simulation, saw: ' + Array.from(seen).join(','));
    assert(seen.has('scratch'), 'Expected scratch within 10 min simulation, saw: ' + Array.from(seen).join(','));
  });

  // C4: drag-interrupts-behavior
  check('C4 drag-interrupts-behavior', () => {
    CanvasPig.setScene(salonDef);
    CanvasPig.setSceneContext({ hour: 23, sceneKind: 'room' });
    CanvasPig.setNeeds({ fullness: 80, energy: 5, mood: 80, vitamin_c: 80, cleanliness: 80, teeth: 80 });
    simulate(inst, 10000, 100);
    inst.playAnim('sleep', 15000);
    inst.continueDrag(salonDef);
    assert(inst.pendingSpot === null, 'Expected pendingSpot cleared on drag');
    const bDbg = CanvasPig.debug().behavior;
    assert(bDbg && bDbg.interrupted === true, 'Expected behavior.interrupted === true on drag');
    inst.drag = null;
  });

  // C5: feed-click-reacts
  check('C5 feed-click-reacts', () => {
    CanvasPig.setScene(salonDef);
    inst._lastReactionAtMs = -Infinity;
    inst._reactionPriority = 0;
    CanvasPig.setNeeds({ fullness: 40, energy: 80, mood: 80, vitamin_c: 80, cleanliness: 80, teeth: 80 });
    const res = CanvasPig.applyReaction({ type: 'feed', item: 'bell_pepper' });
    assert(res && (res.anim === 'eat_treat' || res.anim === 'eat'), 'Expected eat_treat/eat on feed, got ' + (res && res.anim));
  });

  // C6: pet-click-reacts
  check('C6 pet-click-reacts', () => {
    CanvasPig.setScene(salonDef);
    inst._lastReactionAtMs = -Infinity;
    inst._reactionPriority = 0;
    inst._pokeTimes = [];
    inst._sulkUntilMs = 0;
    const res = inst.pet();
    assert(res && (res.anim === 'purr_pet' || res.anim === 'wake_up'), 'Expected purr_pet/wake_up on pet, got ' + (res && res.anim));
  });

  // C7: pig-stays-inside-scene (all 7 scenes, 120 s)
  check('C7 pig-stays-inside-scene', () => {
    const sceneIds = ['salon', 'kitchen', 'bedroom', 'garden', 'balcony', 'park', 'market'];
    for (const sid of sceneIds) {
      const def = CuyScenes.def(sid);
      assert(def, 'Missing scene def: ' + sid);
      CanvasPig.setScene(def);
      CanvasPig.setThings([]);
      CanvasPig.setExitsEnabled(false);
      const band = inst.walk || def.walk;
      inst.pigX = Math.round((band[0] + band[2]) / 2);
      inst.pigY = Math.round((band[1] + band[3]) / 2);
      inst.targetX = null;
      inst.targetY = null;
      CanvasPig.setSceneContext({ hour: 12, sceneKind: def.kind || 'room' });
      simulate(inst, 120000, 50, () => {
        const { x, y } = CanvasPig.debug().pig;
        assert(x >= band[0] - 1 && x <= band[2] + 1, `[${sid}] x=${x} out of [${band[0]}, ${band[2]}]`);
        assert(y >= band[1] - 1 && y <= band[3] + 1, `[${sid}] y=${y} out of [${band[1]}, ${band[3]}]`);
      });
    }
  });

  // C8: rest-spot-not-blocked
  check('C8 rest-spot-not-blocked', () => {
    CanvasPig.setScene(salonDef);
    const things = [{ id: 'sofa_cosy', uid: 's1', x: 110, y: 105, w: 2, h: 2 }];
    CanvasPig.setThings(things);
    const spot = global.RestSpots.pick({
      kind: 'sleep',
      scene: { id: salonDef.id, kind: 'room', walk: inst.walk, isFree: (x, y) => inst.isFree(x, y) },
      things: inst.things,
      pigPos: { x: inst.pigX, y: inst.pigY },
      taken: []
    });
    assert(spot, 'Expected a rest spot');
    assert(inst.isFree(spot.gx, spot.gy) === true, `Expected rest spot (${spot.gx},${spot.gy}) to be free`);
  });

  // C9: no-console-errors
  check('C9 no-console-errors', () => {
    assert.strictEqual(errors.length, 0, 'Unexpected console errors: ' + errors.join('; '));
  });

  console.error = origConsoleError;
  const failed = results.filter(r => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
