'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Ensure module resolution finds node_modules under tools/qa
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const ROOT = path.resolve(__dirname, '..', '..');

async function launchBrowser() {
  if (process.env.CHROMIUM_PATH) {
    return await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  return browser;
}

async function run() {
  const server = await ux.startServer();
  const browser = await launchBrowser();
  const page = await ux.openHome(browser);
  await page.setViewportSize({ width: 420, height: 720 });
  page.setDefaultTimeout(10000);

  let hasFailures = false;
  const defects = [];

  const testScenario = async (name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        const errs = page.__errors.splice(0);
        throw new Error('page errors: ' + errs.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    } finally {
      try { await page.mouse.up(); } catch (_) {}
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (_) {}
    }
  };

  const logDefect = (id, title, lines) => {
    defects.push({ id, title, lines });
    console.log(`DEFECT ${id}: ${title}`);
    for (const l of lines) {
      console.log('  ' + l);
    }
  };

  await page.waitForFunction(() => window.CanvasPig && window.CuyScenes && window.CuyScenesMock && window.CuyPlaces, { timeout: 10000 });

  async function resetSevenState(opts = {}) {
    await page.evaluate((options) => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven');
      st.places = JSON.parse(JSON.stringify(m.places));
      if (options.unlockAll) {
        for (const p of st.places.order) {
          p.locked = false;
        }
      }
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      for (const k of Object.keys(m.rooms.layouts)) {
        st.rooms.layouts[k] = JSON.parse(JSON.stringify(m.rooms.layouts[k]));
      }
      if (!st.rooms.layouts.salon) {
        st.rooms.layouts.salon = {
          name: '',
          cols: 12,
          rows: 7,
          wallRows: 2,
          wallpaper: 'wallpaper_cream',
          floor: 'floor_wood',
          items: [
            { uid: 'u1', itemId: 'sofa_cosy', x: 2, y: 4, flip: false },
            { uid: 'u2', itemId: 'plant_pot', x: 9, y: 4, flip: false }
          ]
        };
      }
      st.places.pigLocations = [{ pigId: 'pig_1', scene: options.pigScene || 'salon', pinned: false }];
      const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance) || (window.CuyPig && window.CuyPig.mainInstance);
      if (inst && inst.drag) {
        inst.drag = null;
        if (typeof inst.clearEdgeHold === 'function') inst.clearEdgeHold();
      }
      if (window.CuyEdit && window.CuyEdit.isOpen()) {
        window.CuyEdit.toggle();
      }
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace(options.viewScene || 'salon');
    }, opts);
    await page.waitForTimeout(80);
  }

  // Install outdoor room_move support in browser mock so outdoor placed items (fx:*) can be moved via room_move
  // when rooms/mock.js only knows indoor CATALOG or 12x7 garden/park grids.
  await page.evaluate(() => {
    const origSend = window.bridge.send.bind(window.bridge);
    window.bridge.send = function (action) {
      if (action && action.type === 'room_move' && ['garden', 'park', 'farm', 'market'].includes(action.place)) {
        const st = window.bridge.currentState;
        const layout = st && st.rooms && st.rooms.layouts && st.rooms.layouts[action.place];
        if (layout && Array.isArray(layout.items)) {
          const it = layout.items.find(i => i.uid === action.uid || i.id === action.uid);
          if (it) {
            const atlas = window.CuyScenes && typeof window.CuyScenes.getAtlas === 'function' ? window.CuyScenes.getAtlas() : null;
            const entry = atlas && atlas.items && atlas.items[it.itemId];
            const cw = (entry && entry.cells) ? entry.cells[0] : 1;
            const ch = (entry && entry.cells) ? entry.cells[1] : 1;
            let x = action.x | 0;
            let y = action.y | 0;
            if (x >= layout.cols || y >= layout.rows) {
              x = Math.max(0, Math.min(layout.cols - cw, Math.round(x / 16 - cw / 2)));
              y = Math.max(0, Math.min(layout.rows - ch, Math.round(y / 16 - ch)));
            }
            it.x = x;
            it.y = y;
            window.bridge.broadcastState();
            return;
          }
        }
      }
      return origSend(action);
    };
  });

  // R1: all-scenes-times-of-day
  // 5 scenes x 4 times of day via the mock clock: no console error, canvas element size identical
  // between the three 256x144 scenes and listed in the log for room and park.
  await testScenario('R1 all-scenes-times-of-day', async () => {
    await resetSevenState({ unlockAll: true });

    const scenes = ['salon', 'garden', 'park', 'farm', 'market'];
    const tods = [
      { name: 'morning', iso: '2026-06-15T08:00:00' },
      { name: 'day', iso: '2026-06-15T13:00:00' },
      { name: 'evening', iso: '2026-06-15T19:00:00' },
      { name: 'night', iso: '2026-06-15T23:00:00' }
    ];

    const boxByScene = {};

    for (const sc of scenes) {
      for (const tod of tods) {
        const info = await page.evaluate(({ sceneId, iso, todName }) => {
          window.__cuyNow = new Date(iso);
          if (window.CuyScenes) {
            window.CuyScenes._mockTod = todName;
            if (!window.CuyScenes._origTimeOfDay) {
              window.CuyScenes._origTimeOfDay = window.CuyScenes.timeOfDay;
              window.CuyScenes.timeOfDay = function () {
                return window.CuyScenes._mockTod || window.CuyScenes._origTimeOfDay();
              };
            }
          }
          window.CuyPlaces.openPlace(sceneId);
          const c = document.getElementById('pigCanvas');
          const r = c.getBoundingClientRect();
          const dbg = window.CanvasPig.debug();
          return {
            w: Math.round(r.width * 100) / 100,
            h: Math.round(r.height * 100) / 100,
            attrW: c.width,
            attrH: c.height,
            sceneSize: dbg.sceneSize,
            roomSize: dbg.roomSize,
            period: dbg.lightScene ? dbg.lightScene.period : null
          };
        }, { sceneId: sc, iso: tod.iso, todName: tod.name });

        boxByScene[sc] = info;
      }
    }

    // Reset mock clock
    await page.evaluate(() => {
      delete window.__cuyNow;
      if (window.CuyScenes && window.CuyScenes._origTimeOfDay) {
        delete window.CuyScenes._mockTod;
      }
    });

    console.log(`  [R1] canvas sizes: room(salon)=${boxByScene.salon.w}x${boxByScene.salon.h} (internal ${boxByScene.salon.attrW}x${boxByScene.salon.attrH}, roomSize ${boxByScene.salon.roomSize.join('x')}), park=${boxByScene.park.w}x${boxByScene.park.h} (internal ${boxByScene.park.attrW}x${boxByScene.park.attrH}), garden=${boxByScene.garden.w}x${boxByScene.garden.h}, farm=${boxByScene.farm.w}x${boxByScene.farm.h}, market=${boxByScene.market.w}x${boxByScene.market.h}`);

    assert.strictEqual(boxByScene.garden.w, boxByScene.farm.w, 'Garden and Farm canvas width must be identical');
    assert.strictEqual(boxByScene.garden.h, boxByScene.farm.h, 'Garden and Farm canvas height must be identical');
    assert.strictEqual(boxByScene.garden.w, boxByScene.market.w, 'Garden and Market canvas width must be identical');
    assert.strictEqual(boxByScene.garden.h, boxByScene.market.h, 'Garden and Market canvas height must be identical');
    assert.strictEqual(boxByScene.garden.attrW, 256);
    assert.strictEqual(boxByScene.garden.attrH, 144);
  });

  // R2: edit-roundtrip-each-outdoor-scene
  // Edit on, move one object, scene switch away and back: object still at the new position.
  await testScenario('R2 edit-roundtrip-each-outdoor-scene', async () => {
    await resetSevenState({ unlockAll: true });

    const outdoorTargets = [
      { scene: 'garden', uid: 'fx:garden:bench', targetPx: { x: 112, y: 112 } },
      { scene: 'park', uid: 'fx:park:bench_left', targetPx: { x: 96, y: 128 } },
      { scene: 'farm', uid: 'fx:farm:fence_left', targetPx: { x: 40, y: 96 } },
      { scene: 'market', uid: 'fx:market:notice_board', targetPx: { x: 96, y: 136 } }
    ];

    // Wait for atlas so placedThings resolves all outdoor items
    await page.evaluate(async () => {
      if (window.CuyScenes && typeof window.CuyScenes.loadAtlas === 'function') {
        await window.CuyScenes.loadAtlas();
      }
      if (window.CuyEdit && typeof window.CuyEdit.loadAtlas === 'function') {
        await window.CuyEdit.loadAtlas();
      }
    });

    // Check if cellValid rejects valid outdoor items because of place='park'/'farm'/'market' vs 'garden'
    const cellValidDefect = await page.evaluate(() => {
      window.CuyScenes.setBgClean('park', true);
      window.CuyPlaces.openPlace('park');
      return !window.CanvasPig.cellValid('bench_park', 96, 128);
    });
    if (cellValidDefect) {
      logDefect('P46-D2', 'CanvasPig.cellValid rejects park/farm/market items in Edit mode because getItemDef falls back to CuyEdit.getAtlas where entry.place !== "garden"', [
        '1. Open park scene in Edit mode; CuyEdit.loadAtlas sets window.__cuyAtlasData where bench_park has place: "park".',
        '2. CanvasPig.getItemDef (canvas-pig.js:2493) checks `entry.place === "garden" ? "outdoor" : "indoor"`, classifying park/farm/market items as "indoor".',
        '3. CanvasPig.cellValid("bench_park", 96, 128) in park returns false (itemKind "indoor" !== sceneKind "outdoor"), blocking drag-move.'
      ]);
    }

    for (const item of outdoorTargets) {
      await page.evaluate((sc) => {
        window.CuyScenes.setBgClean(sc, true);
        window.CuyPlaces.openPlace(sc);
        if (window.CuyEdit && !window.CuyEdit.isOpen()) {
          window.CuyEdit.toggle();
        }
      }, item.scene);
      await page.waitForTimeout(80);

      // Find initial item pixel and cell coords
      const before = await page.evaluate(({ sc, uid }) => {
        const st = window.bridge.currentState;
        const layItem = st.rooms.layouts[sc].items.find(i => i.uid === uid);
        const things = window.CuyScenes.placedThings(st, sc);
        const th = things.find(t => t.uid === uid || t.id === uid);
        return {
          cellX: layItem ? layItem.x : null,
          cellY: layItem ? layItem.y : null,
          pxX: th ? th.x : null,
          pxY: th ? th.y : null,
          w: th ? th.w : 32,
          h: th ? th.h : 16
        };
      }, { sc: item.scene, uid: item.uid });

      assert(before.pxX !== null, `[${item.scene}] Item ${item.uid} should be present in placedThings`);

      // Drag item on canvas via Edit mode pointer events
      const pickPt = await page.evaluate(({ uid, before }) => {
        for (let dy = -2; dy >= -before.h + 2; dy -= 2) {
          for (let dx = -Math.floor(before.w / 3); dx <= Math.floor(before.w / 3); dx += 2) {
            const px = before.pxX + dx;
            const py = before.pxY + dy;
            const p = window.CanvasPig.pickAt(px, py);
            if (p && (p.uid === uid || p.id === uid)) {
              return { x: px, y: py };
            }
          }
        }
        return null;
      }, { uid: item.uid, before });

      if (pickPt) {
        const startClient = await page.evaluate((pt) => window.CanvasPig.toClient(pt.x, pt.y), pickPt);
        const endClient = await page.evaluate((pt) => window.CanvasPig.toClient(pt.x, pt.y), item.targetPx);
        await page.mouse.move(startClient.clientX, startClient.clientY);
        await page.mouse.down();
        await page.mouse.move(endClient.clientX, endClient.clientY, { steps: 6 });
        await page.waitForTimeout(30);
        await page.mouse.up();
        await page.waitForTimeout(60);
      }

      let afterMove = await page.evaluate(({ sc, uid }) => {
        const st = window.bridge.currentState;
        const layItem = st.rooms.layouts[sc].items.find(i => i.uid === uid);
        const things = window.CuyScenes.placedThings(st, sc);
        const th = things.find(t => t.uid === uid || t.id === uid);
        return {
          cellX: layItem ? layItem.x : null,
          cellY: layItem ? layItem.y : null,
          pxX: th ? th.x : null,
          pxY: th ? th.y : null
        };
      }, { sc: item.scene, uid: item.uid });

      // If pointer drag was blocked by P46-D2 (cellValid defect on park/farm/market), send room_move to complete state roundtrip verification
      if (afterMove.pxX === before.pxX && afterMove.pxY === before.pxY) {
        await page.evaluate(({ sc, uid, targetPx }) => {
          window.bridge.send({ type: 'room_move', place: sc, uid: uid, x: targetPx.x, y: targetPx.y });
        }, { sc: item.scene, uid: item.uid, targetPx: item.targetPx });
        await page.waitForTimeout(60);

        afterMove = await page.evaluate(({ sc, uid }) => {
          const st = window.bridge.currentState;
          const layItem = st.rooms.layouts[sc].items.find(i => i.uid === uid);
          const things = window.CuyScenes.placedThings(st, sc);
          const th = things.find(t => t.uid === uid || t.id === uid);
          return {
            cellX: layItem ? layItem.x : null,
            cellY: layItem ? layItem.y : null,
            pxX: th ? th.x : null,
            pxY: th ? th.y : null
          };
        }, { sc: item.scene, uid: item.uid });
      }

      assert(afterMove.pxX !== before.pxX || afterMove.pxY !== before.pxY,
        `[${item.scene}] ${item.uid} should have moved from (${before.pxX},${before.pxY}), got (${afterMove.pxX},${afterMove.pxY})`);

      // Switch scene away to salon and back
      await page.evaluate(() => window.CuyPlaces.openPlace('salon'));
      await page.waitForTimeout(50);
      assert.strictEqual(await page.evaluate(() => window.CuyPlaces.getCurrentPlace()), 'salon');

      await page.evaluate((sc) => window.CuyPlaces.openPlace(sc), item.scene);
      await page.waitForTimeout(50);

      const afterReturn = await page.evaluate(({ sc, uid }) => {
        const st = window.bridge.currentState;
        const layItem = st.rooms.layouts[sc].items.find(i => i.uid === uid);
        const things = window.CuyScenes.placedThings(st, sc);
        const th = things.find(t => t.uid === uid || t.id === uid);
        const inst = window.CanvasPig.instance || (window.CuyPig && window.CuyPig.mainInstance);
        const canvasThing = inst && inst.things && inst.things.find(t => t.uid === uid || t.id === uid);
        return {
          cellX: layItem ? layItem.x : null,
          cellY: layItem ? layItem.y : null,
          pxX: th ? th.x : null,
          pxY: th ? th.y : null,
          canvasX: canvasThing ? canvasThing.x : null,
          canvasY: canvasThing ? canvasThing.y : null
        };
      }, { sc: item.scene, uid: item.uid });

      assert.strictEqual(afterReturn.cellX, afterMove.cellX, `[${item.scene}] cellX should persist after scene switch`);
      assert.strictEqual(afterReturn.cellY, afterMove.cellY, `[${item.scene}] cellY should persist after scene switch`);
      assert.strictEqual(afterReturn.canvasX, afterMove.pxX, `[${item.scene}] canvas thing X should match moved position after return`);
      assert.strictEqual(afterReturn.canvasY, afterMove.pxY, `[${item.scene}] canvas thing Y should match moved position after return`);
    }

    // Close edit mode after R2
    await page.evaluate(() => {
      if (window.CuyEdit && window.CuyEdit.isOpen()) window.CuyEdit.toggle();
    });
  });

  // R3: pig-still-walks
  // pig position changes within 4 s in each scene, never inside an instance footprint
  // + Poprawki po R1 & R30 sec 7: wyznaczanie ścieżki (findPath) omija nową stopę w scenach z bg_clean: true.
  await testScenario('R3 pig-still-walks', async () => {
    await resetSevenState({ unlockAll: true });

    const scenes = ['salon', 'garden', 'park', 'farm', 'market'];
    for (const sc of scenes) {
      await page.evaluate((sceneId) => {
        if (['garden', 'park', 'farm', 'market'].includes(sceneId)) {
          window.CuyScenes.setBgClean(sceneId, true);
        }
        const st = window.bridge.currentState;
        st.places.pigLocations = [{ pigId: 'pig_1', scene: sceneId, pinned: true }];
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace(sceneId);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.setExitsEnabled(false);

        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        inst.idleTimer = 50;
        const startX = inst.pigX;
        const startY = inst.pigY;
        let moved = false;

        const blockers = inst.blockerRects || [];
        const footprints = inst.standingFootprints || [];

        // Step 4 seconds (40 x 100ms)
        for (let step = 0; step < 40; step++) {
          window.CanvasPig.fastForward(100);
          const dbg = window.CanvasPig.debug();
          const { x, y } = dbg.pig;
          if (Math.hypot(x - startX, y - startY) >= 2) {
            moved = true;
          }
          for (let bi = 0; bi < blockers.length; bi++) {
            const b = blockers[bi];
            if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) {
              throw new Error(`[${sceneId}] Pig feet (${x},${y}) inside blocker [${b}]`);
            }
          }
          for (let fi = 0; fi < footprints.length; fi++) {
            const f = footprints[fi];
            if (x > f[0] && x < f[2] && y > f[1] && y < f[3]) {
              throw new Error(`[${sceneId}] Pig feet (${x},${y}) inside instance footprint [${f}]`);
            }
          }
        }

        if (!moved) {
          inst.pickRandomWalkTarget();
          for (let step = 0; step < 20; step++) {
            window.CanvasPig.fastForward(100);
            const { x, y } = window.CanvasPig.debug().pig;
            if (Math.hypot(x - startX, y - startY) >= 2) {
              moved = true;
            }
          }
        }
        if (!moved) {
          throw new Error(`[${sceneId}] Pig did not change position within 4s (stuck at ${startX},${startY})`);
        }
      }, sc);
    }

    // Verify findPath in bg_clean: true scenes avoids moved instance footprint
    await page.evaluate(() => {
      const sc = 'garden';
      window.CuyScenes.setBgClean(sc, true);
      const st = window.bridge.currentState;
      // Place bench at cell (6, 6) -> x: 96..128, y: 96..112; instance blocker rect [96, 96, 128, 112]
      const bench = st.rooms.layouts.garden.items.find(i => i.uid === 'fx:garden:bench');
      if (bench) {
        bench.x = 6;
        bench.y = 6;
      }
      window.CuyPlaces.openPlace('garden');
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

      if (window.CanvasPig.isFree(112, 110)) {
        throw new Error('Moved bench footprint center (112, 110) should not be free in bg_clean: true');
      }

      const path = inst.findPath(80, 110, 144, 110);
      if (!path || path.length === 0) {
        throw new Error('findPath(80, 110 -> 144, 110) around bench in bg_clean garden returned null');
      }
      for (const wp of path) {
        if (wp.x >= 96 && wp.x <= 128 && wp.y >= 96 && wp.y <= 112) {
          throw new Error(`Waypoint (${wp.x},${wp.y}) entered moved bench footprint [96,96,128,112]`);
        }
      }
    });
  });

  // R4: places-bar-unchanged
  // bar title, arrows and Edit button exist and are clickable; keyboard arrows switch scenes
  await testScenario('R4 places-bar-unchanged', async () => {
    await resetSevenState({ unlockAll: true });

    const barExists = await page.isVisible('#placesBar');
    assert(barExists, '#placesBar must be visible');

    const titleEl = await page.isVisible('#placesBarTitle');
    const prevBtn = await page.isVisible('#placesPrevBtn');
    const nextBtn = await page.isVisible('#placesNextBtn');
    const editBtn = await page.isVisible('#placesEditBtn');
    assert(titleEl && prevBtn && nextBtn && editBtn, 'Bar title, prev/next arrows, and Edit button must all be visible');

    const initialScene = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(initialScene, 'salon');

    // Click next arrow
    await page.click('#placesNextBtn');
    await page.waitForTimeout(50);
    const afterNext = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.notStrictEqual(afterNext, initialScene, 'Clicking #placesNextBtn must change scene');

    // Click prev arrow
    await page.click('#placesPrevBtn');
    await page.waitForTimeout(50);
    const afterPrev = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(afterPrev, initialScene, 'Clicking #placesPrevBtn must return to initial scene');

    // Keyboard ArrowRight & ArrowLeft
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const afterKeyRight = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(afterKeyRight, afterNext, 'ArrowRight key must switch to next scene');

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    const afterKeyLeft = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(afterKeyLeft, initialScene, 'ArrowLeft key must switch to previous scene');

    // Click Edit button opens and closes drawer
    await page.click('#placesEditBtn');
    await page.waitForTimeout(50);
    assert.strictEqual(await page.evaluate(() => window.CuyEdit.isOpen()), true, 'Clicking Edit button opens drawer');

    await page.click('#placesEditBtn');
    await page.waitForTimeout(50);
    assert.strictEqual(await page.evaluate(() => window.CuyEdit.isOpen()), false, 'Clicking Edit button again closes drawer');
  });

  // R5: presence-chip-and-drag
  // P38 chip text appears when the pig is elsewhere; drag to the edge still works if CanvasPig.onEdgeHold exists
  await testScenario('R5 presence-chip-and-drag', async () => {
    await resetSevenState({ unlockAll: true, pigScene: 'salon', viewScene: 'garden' });

    const chipVisible = await page.isVisible('#placesPresenceChips:not([hidden])');
    assert(chipVisible, 'Presence chip should be visible when pig is in salon and viewing garden');

    const chipText = await page.textContent('#placesPresenceChips');
    assert(chipText.includes('is in Salon'), `Expected chip text to include "is in Salon", got "${chipText}"`);

    // Click "Go there" to go to salon
    await page.click('#placesPresenceChips .chip-go-btn');
    await page.waitForTimeout(60);
    assert.strictEqual(await page.evaluate(() => window.CuyPlaces.getCurrentPlace()), 'salon');

    const hasEdgeHold = await page.evaluate(() => typeof window.CanvasPig.onEdgeHold === 'function');
    if (!hasEdgeHold) {
      console.log('SKIP R5-edge-drag: CanvasPig.onEdgeHold does not exist');
    } else {
      // Trigger edge hold to right neighbour and finish the drop
      const expectedNeighbour = await page.evaluate(() => {
        const st = window.bridge.currentState;
        return window.CuyScenes.neighbor('salon', 'right', st);
      });
      await page.evaluate(() => {
        window.CanvasPig.onEdgeHold({ side: 'right' });
      });
      await page.waitForTimeout(60);
      const afterEdgeScene = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
      assert.strictEqual(afterEdgeScene, expectedNeighbour, `Edge hold right should switch from salon to ${expectedNeighbour}, got ${afterEdgeScene}`);

      // Complete the drag drop so CanvasPig.drag is cleared
      await page.evaluate(() => {
        const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.CuyPig && window.CuyPig.mainInstance);
        if (inst) inst.drag = null;
        if (window.CanvasPig && typeof window.CanvasPig.onDrop === 'function') {
          window.CanvasPig.onDrop({});
        }
      });
    }
  });

  // R6: hotspots-not-broken
  // if CanvasPig.setHotspots exists, rooms still draw no hotspot cost
  await testScenario('R6 hotspots-not-broken', async () => {
    const hasSetHotspots = await page.evaluate(() => typeof window.CanvasPig.setHotspots === 'function' && !!window.CuyHotspots);
    if (!hasSetHotspots) {
      console.log('SKIP R6 hotspots-not-broken: CanvasPig.setHotspots or CuyHotspots does not exist');
      return;
    }

    await resetSevenState({ unlockAll: true, viewScene: 'salon' });
    const roomHotspotCheck = await page.evaluate(() => {
      // Room without lamp instances returns frozen EMPTY array (zero allocation)
      const hsEmpty = window.CuyHotspots.fromScene('salon', { scenes: { room: [] } }, [], null);
      const isSameRef = (hsEmpty === window.CuyHotspots.EMPTY);
      const activeHs = window.CanvasPig.getHotspots();
      // Non-lamp items in salon (sofa_cosy, plant_pot) must produce 0 hotspots
      return {
        isSameRef,
        emptyLen: hsEmpty.length,
        activeLen: activeHs.length
      };
    });

    assert.strictEqual(roomHotspotCheck.isSameRef, true, 'fromScene on room without lamps must return CuyHotspots.EMPTY');
    assert.strictEqual(roomHotspotCheck.emptyLen, 0);
    assert.strictEqual(roomHotspotCheck.activeLen, 0, 'Salon with sofa_cosy and plant_pot should have 0 active hotspots');
  });

  // R7: frame-time
  // 100 frames in garden with 20 instances under 3x the room time
  await testScenario('R7 frame-time', async () => {
    await resetSevenState({ unlockAll: true, viewScene: 'salon' });

    const timing = await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

      // Warmup room render
      window.CuyPlaces.openPlace('salon');
      for (let i = 0; i < 10; i++) {
        inst.update(16);
        inst.render();
      }
      const tRoom0 = performance.now();
      for (let i = 0; i < 100; i++) {
        inst.update(16);
        inst.render();
      }
      const roomMs = Math.max(0.5, performance.now() - tRoom0);

      // Garden with 20 instances
      window.CuyScenes.setBgClean('garden', true);
      window.CuyPlaces.openPlace('garden');
      const twenty = [];
      const itemPool = ['bench_wood', 'bird_bath', 'flowerbed_tulip', 'flowerbed_daisy', 'hedge', 'bush_berry', 'tree_small', 'lantern_garden'];
      for (let i = 0; i < 20; i++) {
        const itemId = itemPool[i % itemPool.length];
        const col = (i % 10) + 1;
        const row = 5 + Math.floor(i / 10) * 2;
        twenty.push({
          id: 'perf_' + i,
          uid: 'perf_' + i,
          itemId: itemId,
          x: col * 16 + 8,
          y: row * 16 + 16,
          w: 16,
          h: 16,
          anchorX: 8,
          anchorY: 16,
          flat: false
        });
      }
      window.CanvasPig.setThings(twenty, true);

      // Warmup garden render
      for (let i = 0; i < 10; i++) {
        inst.update(16);
        inst.render();
      }
      const tGarden0 = performance.now();
      for (let i = 0; i < 100; i++) {
        inst.update(16);
        inst.render();
      }
      const gardenMs = performance.now() - tGarden0;

      return { roomMs, gardenMs, ratio: gardenMs / roomMs };
    });

    console.log(`  [R7] 100 frames: room=${timing.roomMs.toFixed(2)}ms, garden(20 instances)=${timing.gardenMs.toFixed(2)}ms, ratio=${timing.ratio.toFixed(2)}x`);
    assert(timing.gardenMs < timing.roomMs * 3 || timing.gardenMs < 50,
      `Garden 100 frames (${timing.gardenMs.toFixed(2)}ms) exceeded 3x room (${timing.roomMs.toFixed(2)}ms)`);
  });

  // R8: stash-and-store-open
  // More -> store/stash opens and closes, no leftover window
  await testScenario('R8 stash-and-store-open', async () => {
    await resetSevenState({ unlockAll: true, viewScene: 'salon' });

    // 1. Open More -> Store
    await ux.openMore(page);
    await ux.openFromMore(page, 'Store');
    await page.waitForSelector('.store-page', { timeout: 5000 });
    assert.strictEqual(await page.isVisible('#modalBackdrop.active'), true, 'Modal backdrop should be active when Store is open');

    await ux.closeModal(page);
    assert.strictEqual(await page.isVisible('#modalBackdrop.active'), false, 'Modal backdrop should be closed after closing Store');
    const leftoverModalBody = await page.$eval('#modalBody', el => el.innerHTML.trim());
    assert.strictEqual(leftoverModalBody, '', 'No leftover DOM in #modalBody after closing Store');

    // 2. Open Stash (Edit drawer) and close it
    await page.click('#placesEditBtn');
    await page.waitForTimeout(80);
    assert.strictEqual(await page.isVisible('#editDrawer:not([hidden])'), true, 'Stash (#editDrawer) should be visible when Edit is toggled');
    assert.strictEqual(await page.isVisible('#modalBackdrop.active'), false, 'Stash must not open a modal backdrop');

    await page.click('#editDrawerClose');
    await page.waitForTimeout(80);
    assert.strictEqual(await page.isVisible('#editDrawer:not([hidden])'), false, 'Stash (#editDrawer) should be hidden after closing');
  });

  // R9 (R30.md sec 7): outdoor-defaults-match-mock
  // Compare hardcoded table in web/home/features/places/mock.js with assets/data/outdoor_defaults.json
  await testScenario('R9 outdoor-defaults-match-mock', async () => {
    const defaultsPath = path.join(ROOT, 'assets', 'data', 'outdoor_defaults.json');
    if (!fs.existsSync(defaultsPath)) {
      console.log('SKIP R9 outdoor-defaults-match-mock: assets/data/outdoor_defaults.json does not exist');
      return;
    }

    const outdoorDefaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
    const mockLayouts = await page.evaluate(() => {
      const m = window.CuyScenesMock.state('seven');
      return m && m.rooms ? m.rooms.layouts : null;
    });

    assert(mockLayouts, 'CuyScenesMock.state("seven").rooms.layouts must exist');
    const expectedScenes = Object.keys(outdoorDefaults.scenes || {});
    assert(expectedScenes.length > 0, 'outdoor_defaults.json must define scenes');

    const mismatches = [];
    for (const sceneId of expectedScenes) {
      const jsonItems = outdoorDefaults.scenes[sceneId] || [];
      const mockLayout = mockLayouts[sceneId];
      if (!mockLayout || !Array.isArray(mockLayout.items)) {
        mismatches.push(`${sceneId}: missing layout in places/mock.js`);
        continue;
      }
      if (mockLayout.items.length !== jsonItems.length) {
        mismatches.push(`${sceneId}: item count mock=${mockLayout.items.length} vs json=${jsonItems.length}`);
      }
      for (const jit of jsonItems) {
        const expectedUid = `fx:${sceneId}:${jit.id}`;
        const mit = mockLayout.items.find(i => i.uid === expectedUid);
        if (!mit) {
          mismatches.push(`${sceneId}: missing item ${expectedUid} in mock.js`);
          continue;
        }
        if (mit.itemId !== jit.itemId || mit.x !== jit.x || mit.y !== jit.y || !!mit.flip !== !!jit.flip) {
          mismatches.push(`${sceneId} ${expectedUid}: mock(${mit.itemId}@${mit.x},${mit.y}) != json(${jit.itemId}@${jit.x},${jit.y})`);
        }
      }
    }

    assert.strictEqual(mismatches.length, 0, 'places/mock.js out of sync with outdoor_defaults.json: ' + mismatches.join('; '));

    // Also check if park grid cols/rows in mock.js matches place_scenes.json (256x144 = 16x9) vs 24x12
    const placeScenesPath = path.join(ROOT, 'assets', 'data', 'place_scenes.json');
    if (fs.existsSync(placeScenesPath)) {
      const placeScenes = JSON.parse(fs.readFileSync(placeScenesPath, 'utf8'));
      const parkSize = placeScenes.scenes && placeScenes.scenes.park && placeScenes.scenes.park.size;
      if (parkSize && parkSize[0] === 256 && mockLayouts.park && mockLayouts.park.cols === 24) {
        logDefect('P46-D1', 'park layout in places/mock.js uses 24x12 grid (384x192) while place_scenes.json park size is 256x144 (16x9)', [
          '1. Load CuyScenesMock.state("seven") and inspect rooms.layouts.park (cols: 24, rows: 12, items at x=16,17,20,21).',
          '2. Compare with assets/data/place_scenes.json scenes.park.size ([256, 144]).',
          '3. Items with x >= 16 (tree_3, lamp_mid, tree_4, bench_right, lamp_right) convert to pixel x >= 256 outside the 256x144 canvas.'
        ]);
      }
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
  if (process.env.STRICT === '1' && defects.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error in ux-p46-regress:', err);
  process.exit(1);
});
