'use strict';
const path = require('path');
const assert = require('assert');

let playwright = null;
try {
  playwright = require('playwright');
} catch (e) {
  // Playwright not installed in environment, will fall back to direct Node tests
}

function runScenarioChecks(CanvasPig, CuyScenes, inst, isNode = false) {
  const salonDef = CuyScenes.def('salon');
  const gardenDef = CuyScenes.def('garden');

  function simulate(ms, stepMs = 50, onStep = null) {
    let rem = ms;
    while (rem > 0) {
      const dt = Math.min(stepMs, rem);
      inst.update(dt);
      rem -= dt;
      if (onStep) onStep();
    }
  }

  // W1 walks-2d: in a 12 s observation the pig's y changes by at least 12 px and its x covers at least 50% of the band width (garden and salon).
  function testW1() {
    for (const def of [salonDef, gardenDef]) {
      CanvasPig.setScene(def);
      CanvasPig.setPigVisible(true);
      CanvasPig.setExitsEnabled(false);

      const band = def.walk;
      const bandW = band[2] - band[0];

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      simulate(12000, 100, () => {
        const dbg = CanvasPig.debug();
        const { x, y } = dbg.pig;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });

      const xSpan = maxX - minX;
      const ySpan = maxY - minY;

      assert(xSpan >= bandW * 0.5,
        `[${def.id}] Expected pig x to cover >= 50% of band width (${bandW * 0.5}), got span ${xSpan} (min=${minX}, max=${maxX}, band=[${band}])`);
      assert(ySpan >= 12,
        `[${def.id}] Expected pig y to change by >= 12 px, got span ${ySpan} (min=${minY}, max=${maxY}, band=[${band}])`);
    }
  }

  // W2 stays-in-band: sampled every 200 ms the feet are always inside the band.
  function testW2() {
    for (const def of [salonDef, gardenDef]) {
      CanvasPig.setScene(def);
      CanvasPig.setPigVisible(true);
      CanvasPig.setExitsEnabled(false);
      const band = def.walk;

      simulate(6000, 200, () => {
        const dbg = CanvasPig.debug();
        const { x, y } = dbg.pig;
        assert(x >= band[0] && x <= band[2],
          `[${def.id}] Pig x (${x}) out of band [${band[0]}, ${band[2]}]`);
        assert(y >= band[1] && y <= band[3],
          `[${def.id}] Pig y (${y}) out of band [${band[1]}, ${band[3]}]`);
      });
    }
  }

  // W3 depth-scale: at the top of the band the scale equals depthScale[0] (+-1/8), at the bottom depthScale[1]; a larger y never gives a smaller scale.
  function testW3() {
    for (const def of [salonDef, gardenDef]) {
      CanvasPig.setScene(def);
      const band = def.walk;
      const ds = def.depthScale || [0.88, 1.0];

      inst.pigY = band[1];
      const sTop = CanvasPig.debug().pig.scale;
      assert(Math.abs(sTop - ds[0]) <= 0.125 + 1e-4,
        `[${def.id}] Scale at top of band (${sTop}) should match ds[0]=${ds[0]} within +-1/8`);

      inst.pigY = band[3];
      const sBot = CanvasPig.debug().pig.scale;
      assert(Math.abs(sBot - ds[1]) <= 0.125 + 1e-4,
        `[${def.id}] Scale at bottom of band (${sBot}) should match ds[1]=${ds[1]} within +-1/8`);

      let lastScale = -Infinity;
      for (let y = band[1]; y <= band[3]; y += 1) {
        inst.pigY = y;
        const s = CanvasPig.debug().pig.scale;
        assert(s >= lastScale - 1e-6,
          `[${def.id}] Larger y (${y}) gave smaller scale (${s} < ${lastScale})`);
        lastScale = s;
      }
    }
  }

  // W4 hidden-behind: with a prop whose bottom is lower on screen than the pig, the prop is drawn after the pig (sort order in debug list) and the reverse for a higher prop.
  function testW4() {
    CanvasPig.setScene(salonDef);
    CanvasPig.setPigVisible(true);
    inst.pigY = 110;

    // Prop lower on screen (y = 120 > pigY = 110): pig behind prop -> pig drawn first, prop drawn after
    CanvasPig.setThings([
      { id: 'prop_lower', y: 120, flat: false }
    ]);
    let dbg = CanvasPig.debug();
    let order = dbg.renderOrder;
    assert(order.indexOf('pig') !== -1, 'Render order must contain pig');
    assert(order.indexOf('prop_lower') !== -1, 'Render order must contain prop_lower');
    assert(order.indexOf('prop_lower') > order.indexOf('pig'),
      `Prop lower on screen (y=120) must be drawn after pig (y=110), order: ${JSON.stringify(order)}`);

    // Prop higher on screen (y = 100 < pigY = 110): prop behind pig -> prop drawn first, pig drawn after
    CanvasPig.setThings([
      { id: 'prop_higher', y: 100, flat: false }
    ]);
    dbg = CanvasPig.debug();
    order = dbg.renderOrder;
    assert(order.indexOf('pig') !== -1, 'Render order must contain pig');
    assert(order.indexOf('prop_higher') !== -1, 'Render order must contain prop_higher');
    assert(order.indexOf('prop_higher') < order.indexOf('pig'),
      `Prop higher on screen (y=100) must be drawn before pig (y=110), order: ${JSON.stringify(order)}`);
  }

  // W5 exit-once: with exits enabled and a forced target at the right edge, onPigExit fires exactly once with to:'right' and the pig is no longer drawn.
  function testW5() {
    CanvasPig.setScene(gardenDef);
    CanvasPig.setPigVisible(true);
    CanvasPig.setExitsEnabled(true);

    const rightX = (gardenDef.exits && gardenDef.exits.right) ? gardenDef.exits.right.x : gardenDef.walk[2];
    let exitEvents = [];
    CanvasPig.onPigExit = (ev) => {
      exitEvents.push(ev);
    };

    CanvasPig.setTarget(rightX, inst.pigY);
    simulate(6000, 50);

    assert.strictEqual(exitEvents.length, 1, `Expected onPigExit to fire exactly once, fired ${exitEvents.length} times`);
    assert.strictEqual(exitEvents[0].to, 'right', `Expected exit event to:'right', got ${exitEvents[0].to}`);
    assert.strictEqual(CanvasPig.debug().pigVisible, false, 'Expected pigVisible === false after exit');

    // Simulate more time, should not fire again
    simulate(4000, 50);
    assert.strictEqual(exitEvents.length, 1, `onPigExit should remain 1 call, got ${exitEvents.length}`);
  }

  // W6 enter-from-edge: after enterFrom('left') the pig appears with x within 6 px of the left edge and ends 20+ px inside.
  function testW6() {
    CanvasPig.setScene(gardenDef);
    const leftEdge = (gardenDef.exits && gardenDef.exits.left) ? gardenDef.exits.left.x : gardenDef.walk[0];

    CanvasPig.enterFrom('left');
    const startDbg = CanvasPig.debug();
    assert(Math.abs(startDbg.pig.x - leftEdge) <= 6,
      `After enterFrom('left'), pig x (${startDbg.pig.x}) should be within 6px of left edge (${leftEdge})`);

    // Let the pig walk inwards
    simulate(2000, 50);
    const endDbg = CanvasPig.debug();
    assert(endDbg.pig.x >= leftEdge + 20,
      `After inward walk, pig x (${endDbg.pig.x}) should be 20+ px inside left edge (${leftEdge})`);
  }

  // W7 never-exits-by-default: 20 s with exits disabled: zero exit events.
  function testW7() {
    CanvasPig.setScene(gardenDef);
    CanvasPig.setPigVisible(true);
    CanvasPig.setExitsEnabled(false);

    let exitCount = 0;
    CanvasPig.onPigExit = () => { exitCount++; };

    simulate(20000, 100);

    assert.strictEqual(exitCount, 0, `Expected 0 exit events with exits disabled, got ${exitCount}`);
    assert.strictEqual(CanvasPig.debug().pigVisible, true, 'Pig should remain visible when exits are disabled');
  }

  // W8 drag-still-works: drag-pick-up and drop keeps the pig in the band; dragging out of the scene still fires the old leave-Home path.
  function testW8() {
    CanvasPig.setScene(salonDef);
    CanvasPig.setPigVisible(true);
    const band = salonDef.walk;

    let takeOutSent = false;
    const oldBridge = global.bridge || (typeof window !== 'undefined' ? window.bridge : null);
    const mockBridge = {
      send: (msg) => {
        if (msg && msg.type === 'take_out') takeOutSent = true;
      }
    };
    if (typeof window !== 'undefined') window.bridge = mockBridge;
    if (typeof global !== 'undefined') global.bridge = mockBridge;

    // 1. Drag pickup and drop inside band
    inst.pigX = 120;
    inst.pigY = 110;
    inst.drag = { startX: 100, startY: 100, moved: true };
    inst.pigX = 180;
    inst.pigY = 125;
    // Release inside
    inst.canvas.dispatchEvent(new Event('pointerup'));
    const dbgDrop = CanvasPig.debug();
    assert(dbgDrop.pig.x >= band[0] && dbgDrop.pig.x <= band[2],
      `Dropped pig x (${dbgDrop.pig.x}) must be in band`);
    assert(dbgDrop.pig.y >= band[1] && dbgDrop.pig.y <= band[3],
      `Dropped pig y (${dbgDrop.pig.y}) must be in band`);

    // 2. Drag out of the scene
    inst.drag = { startX: 100, startY: 100, moved: true };
    const rect = inst.canvas.getBoundingClientRect();
    const moveOutEvent = new Event('pointermove');
    moveOutEvent.clientX = rect.left - 50; // out on the left
    moveOutEvent.clientY = rect.top + 20;
    moveOutEvent.pointerId = 1;
    inst.canvas.dispatchEvent(moveOutEvent);

    assert.strictEqual(takeOutSent, true, 'Dragging out of scene must fire bridge take_out message');

    if (typeof window !== 'undefined') window.bridge = oldBridge;
    if (typeof global !== 'undefined') global.bridge = oldBridge;
  }

  return { testW1, testW2, testW3, testW4, testW5, testW6, testW7, testW8 };
}

async function runBrowserTests() {
  const ux = require('./lib/ux.js');
  const server = await ux.startServer();
  const browser = await playwright.chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(10000);

  let hasFailures = false;
  const testScenario = async (name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    }
  };

  await page.waitForFunction(() => window.CanvasPig && window.CuyScenes, { timeout: 10000 });

  // Expose test helper in page
  await page.evaluate(() => {
    window.__simulate = (ms, stepMs = 50, onStep = null) => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      let rem = ms;
      while (rem > 0) {
        const dt = Math.min(stepMs, rem);
        inst.update(dt);
        rem -= dt;
        if (onStep) onStep();
      }
    };
  });

  await testScenario('W1 walks-2d', async () => {
    await page.evaluate(() => {
      const salonDef = window.CuyScenes.def('salon');
      const gardenDef = window.CuyScenes.def('garden');

      for (const def of [salonDef, gardenDef]) {
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.setExitsEnabled(false);

        const band = def.walk;
        const bandW = band[2] - band[0];

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        window.__simulate(12000, 100, () => {
          const dbg = window.CanvasPig.debug();
          const { x, y } = dbg.pig;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        });

        const xSpan = maxX - minX;
        const ySpan = maxY - minY;

        if (xSpan < bandW * 0.5) {
          throw new Error(`[${def.id}] Pig x span ${xSpan} < 50% of band width ${bandW * 0.5}`);
        }
        if (ySpan < 12) {
          throw new Error(`[${def.id}] Pig y span ${ySpan} < 12px`);
        }
      }
    });
  });

  await testScenario('W2 stays-in-band', async () => {
    await page.evaluate(() => {
      const salonDef = window.CuyScenes.def('salon');
      const gardenDef = window.CuyScenes.def('garden');

      for (const def of [salonDef, gardenDef]) {
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.setExitsEnabled(false);
        const band = def.walk;

        window.__simulate(6000, 200, () => {
          const dbg = window.CanvasPig.debug();
          const { x, y } = dbg.pig;
          if (x < band[0] || x > band[2] || y < band[1] || y > band[3]) {
            throw new Error(`[${def.id}] Pig feet (${x},${y}) out of band [${band}]`);
          }
        });
      }
    });
  });

  await testScenario('W3 depth-scale', async () => {
    await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const salonDef = window.CuyScenes.def('salon');
      const gardenDef = window.CuyScenes.def('garden');

      for (const def of [salonDef, gardenDef]) {
        window.CanvasPig.setScene(def);
        const band = def.walk;
        const ds = def.depthScale || [0.88, 1.0];

        inst.pigY = band[1];
        const sTop = window.CanvasPig.debug().pig.scale;
        if (Math.abs(sTop - ds[0]) > 0.125 + 1e-4) {
          throw new Error(`[${def.id}] Top scale ${sTop} vs ${ds[0]} diff > 1/8`);
        }

        inst.pigY = band[3];
        const sBot = window.CanvasPig.debug().pig.scale;
        if (Math.abs(sBot - ds[1]) > 0.125 + 1e-4) {
          throw new Error(`[${def.id}] Bottom scale ${sBot} vs ${ds[1]} diff > 1/8`);
        }

        let lastScale = -Infinity;
        for (let y = band[1]; y <= band[3]; y += 1) {
          inst.pigY = y;
          const s = window.CanvasPig.debug().pig.scale;
          if (s < lastScale - 1e-6) {
            throw new Error(`[${def.id}] Scale decreased at y=${y}: ${s} < ${lastScale}`);
          }
          lastScale = s;
        }
      }
    });
  });

  await testScenario('W4 hidden-behind', async () => {
    await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const salonDef = window.CuyScenes.def('salon');
      window.CanvasPig.setScene(salonDef);
      window.CanvasPig.setPigVisible(true);
      inst.pigY = 110;

      window.CanvasPig.setThings([
        { id: 'prop_lower', y: 120, flat: false }
      ]);
      let dbg = window.CanvasPig.debug();
      let order = dbg.renderOrder;
      if (order.indexOf('prop_lower') <= order.indexOf('pig')) {
        throw new Error(`prop_lower must be drawn after pig, order=${JSON.stringify(order)}`);
      }

      window.CanvasPig.setThings([
        { id: 'prop_higher', y: 100, flat: false }
      ]);
      dbg = window.CanvasPig.debug();
      order = dbg.renderOrder;
      if (order.indexOf('prop_higher') >= order.indexOf('pig')) {
        throw new Error(`prop_higher must be drawn before pig, order=${JSON.stringify(order)}`);
      }
    });
  });

  await testScenario('W5 exit-once', async () => {
    await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const gardenDef = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(gardenDef);
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.setExitsEnabled(true);

      const rightX = (gardenDef.exits && gardenDef.exits.right) ? gardenDef.exits.right.x : gardenDef.walk[2];
      let exitEvents = [];
      window.CanvasPig.onPigExit = (ev) => {
        exitEvents.push(ev);
      };

      window.CanvasPig.setTarget(rightX, inst.pigY);
      window.__simulate(6000, 50);

      if (exitEvents.length !== 1) {
        throw new Error(`Expected onPigExit 1 call, got ${exitEvents.length}`);
      }
      if (exitEvents[0].to !== 'right') {
        throw new Error(`Expected exit to:'right', got ${exitEvents[0].to}`);
      }
      if (window.CanvasPig.debug().pigVisible !== false) {
        throw new Error('Expected pigVisible to be false after exit');
      }

      window.__simulate(4000, 50);
      if (exitEvents.length !== 1) {
        throw new Error(`onPigExit fired again, total calls: ${exitEvents.length}`);
      }
    });
  });

  await testScenario('W6 enter-from-edge', async () => {
    await page.evaluate(() => {
      const gardenDef = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(gardenDef);
      const leftEdge = (gardenDef.exits && gardenDef.exits.left) ? gardenDef.exits.left.x : gardenDef.walk[0];

      window.CanvasPig.enterFrom('left');
      const startDbg = window.CanvasPig.debug();
      if (Math.abs(startDbg.pig.x - leftEdge) > 6) {
        throw new Error(`Start pig x (${startDbg.pig.x}) not within 6px of leftEdge (${leftEdge})`);
      }

      window.__simulate(2000, 50);
      const endDbg = window.CanvasPig.debug();
      if (endDbg.pig.x < leftEdge + 20) {
        throw new Error(`End pig x (${endDbg.pig.x}) not 20+ px inside leftEdge (${leftEdge})`);
      }
    });
  });

  await testScenario('W7 never-exits-by-default', async () => {
    await page.evaluate(() => {
      const gardenDef = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(gardenDef);
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.setExitsEnabled(false);

      let exitCount = 0;
      window.CanvasPig.onPigExit = () => { exitCount++; };

      window.__simulate(20000, 100);

      if (exitCount !== 0) {
        throw new Error(`Exit count must be 0, got ${exitCount}`);
      }
      if (window.CanvasPig.debug().pigVisible !== true) {
        throw new Error('Pig must remain visible when exits are disabled');
      }
    });
  });

  await testScenario('W8 drag-still-works', async () => {
    await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const salonDef = window.CuyScenes.def('salon');
      window.CanvasPig.setScene(salonDef);
      window.CanvasPig.setPigVisible(true);
      const band = salonDef.walk;

      let takeOutSent = false;
      const oldBridge = window.bridge;
      window.bridge = {
        send: (msg) => {
          if (msg && msg.type === 'take_out') takeOutSent = true;
        }
      };

      inst.pigX = 120;
      inst.pigY = 110;
      inst.drag = { startX: 100, startY: 100, moved: true };
      inst.pigX = 180;
      inst.pigY = 125;
      inst.canvas.dispatchEvent(new Event('pointerup'));

      const dbg = window.CanvasPig.debug();
      if (dbg.pig.x < band[0] || dbg.pig.x > band[2] || dbg.pig.y < band[1] || dbg.pig.y > band[3]) {
        throw new Error(`Dropped pig (${dbg.pig.x},${dbg.pig.y}) out of band`);
      }

      inst.drag = { startX: 100, startY: 100, moved: true };
      const rect = inst.canvas.getBoundingClientRect();
      const moveOutEvent = new Event('pointermove');
      moveOutEvent.clientX = rect.left - 50;
      moveOutEvent.clientY = rect.top + 20;
      moveOutEvent.pointerId = 1;
      inst.canvas.dispatchEvent(moveOutEvent);

      if (!takeOutSent) {
        throw new Error('Dragging out of scene must send take_out');
      }

      window.bridge = oldBridge;
    });
  });

  await browser.close();
  await server.close();

  process.exit(hasFailures ? 1 : 0);
}

function runNodeTests() {
  const mockCtx = {
    imageSmoothingEnabled: false,
    clearRect: () => {},
    fillRect: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    fill: () => {},
    ellipse: () => {},
    stroke: () => {},
    strokeRect: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    closePath: () => {},
    measureText: () => ({ width: 30 })
  };

  const listeners = {};
  const mockCanvas = {
    width: 240,
    height: 130,
    style: {},
    getContext: () => mockCtx,
    addEventListener: (type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener: () => {},
    dispatchEvent: (e) => {
      const fns = listeners[e.type] || [];
      fns.forEach(fn => fn(e));
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 240, height: 130, right: 240, bottom: 130 }),
    setPointerCapture: () => {},
    releasePointerCapture: () => {}
  };

  global.Event = class Event {
    constructor(type) { this.type = type; }
  };
  global.window = global;
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return mockCanvas;
      return { appendChild: () => {}, style: {} };
    },
    querySelector: () => null,
    getElementById: () => null,
    body: { appendChild: () => {} },
    addEventListener: () => {}
  };
  global.Image = class Image {
    constructor() {
      this.naturalWidth = 64;
      this.naturalHeight = 64;
      this.width = 64;
      this.height = 64;
      this.complete = true;
    }
  };

  require('../../web/home/canvas-pig.js');
  require('../../web/home/features/places/scenes.js');

  const CanvasPig = global.CanvasPig;
  const CuyScenes = global.CuyScenes;
  const inst = new global.PigCanvas(mockCanvas);

  const checks = runScenarioChecks(CanvasPig, CuyScenes, inst, true);

  let hasFailures = false;
  const testScenario = (name, fn) => {
    try {
      fn();
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    }
  };

  testScenario('W1 walks-2d', checks.testW1);
  testScenario('W2 stays-in-band', checks.testW2);
  testScenario('W3 depth-scale', checks.testW3);
  testScenario('W4 hidden-behind', checks.testW4);
  testScenario('W5 exit-once', checks.testW5);
  testScenario('W6 enter-from-edge', checks.testW6);
  testScenario('W7 never-exits-by-default', checks.testW7);
  testScenario('W8 drag-still-works', checks.testW8);

  inst.stopped = true;
  process.exit(hasFailures ? 1 : 0);
}

async function main() {
  if (playwright) {
    try {
      await runBrowserTests();
      return;
    } catch (err) {
      console.warn('Browser test runner encountered error, falling back to direct tests:', err.message);
    }
  }
  runNodeTests();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
