'use strict';

const fs = require('fs');
const path = require('path');

const qaNodeModules = path.join(__dirname, 'node_modules');
if (fs.existsSync(qaNodeModules) && !module.paths.includes(qaNodeModules)) {
  module.paths.unshift(qaNodeModules);
}

const { chromium } = require('playwright');
const ux = require('./lib/ux');

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

(async () => {
  // V10: Static check on HomeWindow.cs (no build)
  try {
    const hwPath = path.join(ROOT, 'src', 'Cuy', 'dotNet', 'HomeWindow.cs');
    if (!fs.existsSync(hwPath)) {
      skip('V10', 'src/Cuy/dotNet/HomeWindow.cs not found');
    } else {
      const src = fs.readFileSync(hwPath, 'utf8');
      const hasSize = /this\.Size\s*=\s*new\s+Size\(\s*420\s*,\s*640\s*\)/.test(src);
      const hasClientSize = /this\.ClientSize\s*=\s*new\s+Size\(\s*420\s*,\s*640\s*\)/.test(src);
      const hasDpiFit = /Math\.Min\(\s*1f\s*,/.test(src);
      check(
        'V10',
        hasSize && hasClientSize && hasDpiFit,
        `HomeWindow.cs static check failed (Size=420x640:${hasSize}, ClientSize=420x640:${hasClientSize}, Math.Min(1f,...):${hasDpiFit})`
      );
    }
  } catch (err) {
    check('V10', false, 'Exception reading HomeWindow.cs: ' + err.message);
  }

  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const allErrors = [];

  try {
    const page = await ux.openHome(browser);
    await page.setViewportSize({ width: 420, height: 640 });

    // Clean start state with 'seven' mock state
    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
      if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function' && window.bridge) {
        const m = window.CuyScenesMock.state('seven');
        const st = window.bridge.currentState || {};
        st.places = m.places;
        if (!st.rooms) st.rooms = {};
        if (!st.rooms.layouts) st.rooms.layouts = {};
        Object.assign(st.rooms.layouts, m.rooms.layouts);
        if (!st.rooms.layouts.salon) {
          st.rooms.layouts.salon = { cols: 12, rows: 7, wallRows: 2, items: [] };
        }
        if (!st.rooms.layouts['pig:pig_1']) {
          st.rooms.layouts['pig:pig_1'] = { cols: 10, rows: 6, wallRows: 2, items: [] };
        }
        if (!st.rooms.layouts.dorm) {
          st.rooms.layouts.dorm = { cols: 14, rows: 8, wallRows: 2, items: [] };
        }
        window.bridge.broadcastState();
      }
      if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
        window.CanvasPig.setExitsEnabled(false);
      }
      document.body.classList.add('webview-mode');
    });
    await page.waitForTimeout(200);

    // -------------------------------------------------------------------------
    // V1: Matrix: window 420x640, 400x620, 420x600, 360x560 x 7 scenes x (normal, Edit, Edit with drawer open)
    // -------------------------------------------------------------------------
    const viewports = [
      { width: 420, height: 640 },
      { width: 400, height: 620 },
      { width: 420, height: 600 },
      { width: 360, height: 560 }
    ];
    const scenes7 = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
    const modes = ['normal', 'edit', 'edit_drawer_subpanel'];
    const v1Failures = [];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(50);

      for (const sceneId of scenes7) {
        await page.evaluate((sId) => {
          document.body.classList.add('webview-mode');
          if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
            window.CuyPlaces.openPlace(sId);
          }
        }, sceneId);

        for (const mode of modes) {
          await page.evaluate((m) => {
            if (!window.CuyEdit) return;
            const open = typeof window.CuyEdit.isOpen === 'function' && window.CuyEdit.isOpen();
            if (m === 'normal') {
              if (open) window.CuyEdit.toggle();
            } else {
              if (!open) window.CuyEdit.toggle();
              if (m === 'edit_drawer_subpanel') {
                const skinsBtn = document.getElementById('editSkinsBtn');
                if (skinsBtn) skinsBtn.click();
              } else {
                const sub = document.getElementById('editDrawerSubpanel');
                if (sub && !sub.hidden) {
                  const skinsBtn = document.getElementById('editSkinsBtn');
                  if (skinsBtn) skinsBtn.click();
                }
              }
            }
          }, mode);

          const mRes = await page.evaluate(() => {
            const vh = window.innerHeight;
            const btnMore = document.getElementById('btnMore');
            const placesBar = document.getElementById('placesBar');
            const gameDevice = document.getElementById('gameDevice');
            const moreRect = btnMore ? btnMore.getBoundingClientRect() : null;
            const barRect = placesBar ? placesBar.getBoundingClientRect() : null;
            const devRect = gameDevice ? gameDevice.getBoundingClientRect() : null;
            const docScrollH = document.documentElement.scrollHeight;
            const bodyScrollH = document.body.scrollHeight;
            return {
              vh,
              moreBottom: moreRect ? moreRect.bottom : 9999,
              barBottom: barRect ? barRect.bottom : 9999,
              devBottom: devRect ? devRect.bottom : vh,
              docScrollH,
              bodyScrollH
            };
          });

          const tag = `${vp.width}x${vp.height}/${sceneId}/${mode}`;
          if (mRes.moreBottom > mRes.vh + 0.5) {
            v1Failures.push(`${tag}: #btnMore.bottom=${mRes.moreBottom.toFixed(1)} > vh=${mRes.vh}`);
          } else if (mRes.moreBottom > mRes.devBottom - 3.5) {
            v1Failures.push(`${tag}: #btnMore.bottom=${mRes.moreBottom.toFixed(1)} > gameDevice.bottom-4=${(mRes.devBottom - 4).toFixed(1)}`);
          }
          if (mRes.barBottom > mRes.vh + 0.5) {
            v1Failures.push(`${tag}: #placesBar.bottom=${mRes.barBottom.toFixed(1)} > vh=${mRes.vh}`);
          }
          if (mRes.docScrollH > mRes.vh + 1 || mRes.bodyScrollH > mRes.vh + 1) {
            v1Failures.push(`${tag}: scrollHeight(doc=${mRes.docScrollH},body=${mRes.bodyScrollH}) > vh=${mRes.vh}`);
          }
        }
      }
    }

    // Close edit mode before next checks
    await page.evaluate(() => {
      if (window.CuyEdit && window.CuyEdit.isOpen()) window.CuyEdit.toggle();
    });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForTimeout(100);

    check(
      'V1',
      v1Failures.length === 0,
      `Viewport matrix had ${v1Failures.length} failure(s); first: ${v1Failures.slice(0, 4).join(' | ')}`
    );

    // -------------------------------------------------------------------------
    // V2: Canvas size is exactly 256x144 (logical) in every scene and upgrade level, same CSS size across scenes
    // -------------------------------------------------------------------------
    const v2Res = await page.evaluate(() => {
      // Unlock all 7 scenes so #placesLockedHint doesn't alter available stage height across scenes
      const st = window.bridge.currentState;
      if (st && st.places && Array.isArray(st.places.order)) {
        st.places.order.forEach(p => { p.locked = false; });
        window.bridge.broadcastState();
      }

      const fails = [];
      const cssSizes = [];
      const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];

      for (const sId of scenes) {
        window.CuyPlaces.openPlace(sId);
        const c = document.getElementById('pigCanvas');
        const dbg = window.CanvasPig.debug();
        const r = c.getBoundingClientRect();
        if (c.width !== 256 || c.height !== 144) {
          fails.push(`${sId}: canvas=${c.width}x${c.height}`);
        }
        if (!dbg || !dbg.sceneSize || dbg.sceneSize[0] !== 256 || dbg.sceneSize[1] !== 144) {
          fails.push(`${sId}: debug().sceneSize=${JSON.stringify(dbg && dbg.sceneSize)}`);
        }
        cssSizes.push({ sId, w: r.width, h: r.height });
      }

      const refW = cssSizes[0].w;
      const refH = cssSizes[0].h;
      for (const cs of cssSizes) {
        if (Math.abs(cs.w - refW) > 1 || Math.abs(cs.h - refH) > 1) {
          fails.push(`CSS size mismatch on ${cs.sId}: ${cs.w.toFixed(1)}x${cs.h.toFixed(1)} vs ${refW.toFixed(1)}x${refH.toFixed(1)}`);
        }
      }

      // Check every room upgrade level: 10x6, 12x7, 14x8, 16x8, 20x9
      const levels = [
        [10, 6],
        [12, 7],
        [14, 8],
        [16, 8],
        [20, 9]
      ];
      for (const [cols, rows] of levels) {
        st.rooms.layouts.salon.cols = cols;
        st.rooms.layouts.salon.rows = rows;
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace('salon');
        const c = document.getElementById('pigCanvas');
        const dbg = window.CanvasPig.debug();
        const r = c.getBoundingClientRect();
        if (c.width !== 256 || c.height !== 144) {
          fails.push(`salon ${cols}x${rows}: canvas=${c.width}x${c.height}`);
        }
        if (!dbg || dbg.sceneSize[0] !== 256 || dbg.sceneSize[1] !== 144) {
          fails.push(`salon ${cols}x${rows}: debug.sceneSize=${JSON.stringify(dbg && dbg.sceneSize)}`);
        }
        if (Math.abs(r.width - refW) > 1 || Math.abs(r.height - refH) > 1) {
          fails.push(`salon ${cols}x${rows} CSS size: ${r.width.toFixed(1)}x${r.height.toFixed(1)} vs ${refW.toFixed(1)}x${refH.toFixed(1)}`);
        }
      }

      // Restore salon 12x7
      st.rooms.layouts.salon.cols = 12;
      st.rooms.layouts.salon.rows = 7;
      window.bridge.broadcastState();
      return { fails };
    });

    check(
      'V2',
      v2Res.fails.length === 0,
      'Canvas size 256x144 / CSS size check failed: ' + v2Res.fails.join('; ')
    );

    // -------------------------------------------------------------------------
    // V3: Room upgrade 12x7 -> 16x8 -> 20x9 and pig rooms 10x6 -> 12x7 -> 14x8:
    // pig height in px relative to 16 px cell is constant within 1 px, furniture cell size constant
    // -------------------------------------------------------------------------
    const v3Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const fails = [];

      function measureUpgradeSequence(sceneId, seq) {
        const measurements = [];
        for (const [cols, rows] of seq) {
          if (!st.rooms.layouts[sceneId]) {
            st.rooms.layouts[sceneId] = { cols, rows, wallRows: 2, items: [] };
          } else {
            st.rooms.layouts[sceneId].cols = cols;
            st.rooms.layouts[sceneId].rows = rows;
          }
          window.bridge.broadcastState();
          window.CuyPlaces.openPlace(sceneId);
          if (window.CuyPlaces && typeof window.CuyPlaces.applyScene === 'function') {
            window.CuyPlaces.applyScene();
          }
          // Place pig at bottom walk y1 so depth interpolation t = 1 is identical across sizes
          const inst = window.CanvasPig.instance || window.PigCanvas.instance;
          const walk = (inst && inst.walk) || [40, 56, 216, 126];
          window.CanvasPig.pigX = Math.round((walk[0] + walk[2]) / 2);
          window.CanvasPig.pigY = walk[3];

          const dbg = window.CanvasPig.debug();
          const c = document.getElementById('pigCanvas');
          const rect = c.getBoundingClientRect();
          const screenCellPx = 16 * (rect.width / c.width);
          const pigScale = dbg && dbg.pig ? dbg.pig.scale : 0;
          const pigFrameH = dbg && dbg.pig ? dbg.pig.frameHeight : 0;
          const pigBodyH = 24 * pigScale;
          measurements.push({
            cols,
            rows,
            pigScale,
            pigFrameH,
            pigBodyH,
            screenCellPx
          });
        }

        const base = measurements[0];
        for (const m of measurements) {
          if (m.pigScale < 0.75 || m.pigScale > 0.875) {
            fails.push(`${sceneId} ${m.cols}x${m.rows}: pig.scale=${m.pigScale} outside [0.75, 0.875]`);
          }
          if (Math.abs(m.pigFrameH - base.pigFrameH) > 1) {
            fails.push(`${sceneId} ${m.cols}x${m.rows}: frameHeight=${m.pigFrameH} vs base=${base.pigFrameH}`);
          }
          if (Math.abs(m.pigBodyH - base.pigBodyH) > 1) {
            fails.push(`${sceneId} ${m.cols}x${m.rows}: bodyH=${m.pigBodyH} vs base=${base.pigBodyH}`);
          }
          if (Math.abs(m.screenCellPx - base.screenCellPx) > 0.5) {
            fails.push(`${sceneId} ${m.cols}x${m.rows}: screenCellPx=${m.screenCellPx.toFixed(2)} vs base=${base.screenCellPx.toFixed(2)}`);
          }
        }
      }

      measureUpgradeSequence('salon', [[12, 7], [16, 8], [20, 9]]);
      measureUpgradeSequence('pig:pig_1', [[10, 6], [12, 7], [14, 8]]);

      // Restore defaults
      st.rooms.layouts.salon.cols = 12;
      st.rooms.layouts.salon.rows = 7;
      st.rooms.layouts['pig:pig_1'].cols = 10;
      st.rooms.layouts['pig:pig_1'].rows = 6;
      window.bridge.broadcastState();

      return { fails };
    });

    check(
      'V3',
      v3Res.fails.length === 0,
      'Room upgrade pig/cell scale constancy failed: ' + v3Res.fails.join('; ')
    );

    // -------------------------------------------------------------------------
    // V4: Pig scale per life stage baby..legend within the R28 range
    // -------------------------------------------------------------------------
    const v4Res = await page.evaluate(() => {
      const stages = ['baby', 'junior', 'adult', 'senior', 'legend'];
      const fails = [];
      window.CuyPlaces.openPlace('salon');
      const inst = window.CanvasPig.instance || window.PigCanvas.instance;
      if (inst) inst.scaleFallbackCount = 0;

      for (const stg of stages) {
        window.CanvasPig.setStage(stg);
        const walk = (inst && inst.walk) || [40, 56, 216, 126];
        for (const y of [walk[1], Math.round((walk[1] + walk[3]) / 2), walk[3]]) {
          window.CanvasPig.pigY = y;
          const s = window.CanvasPig.scaleAt(y);
          const drawn = window.CanvasPig.getDrawnSize(s);
          const dbg = window.CanvasPig.debug();
          if (s < 0.75 || s > 0.875) {
            fails.push(`stage=${stg} y=${y}: scaleAt=${s} not in [0.75, 0.875]`);
          }
          if (!Number.isInteger(drawn)) {
            fails.push(`stage=${stg} y=${y}: getDrawnSize=${drawn} not integer`);
          }
          if (!dbg || !dbg.pig || !Number.isInteger(dbg.pig.frameWidth) || !Number.isInteger(dbg.pig.frameHeight)) {
            fails.push(`stage=${stg} y=${y}: non-integer frameWidth/frameHeight`);
          }
          if (dbg && dbg.pig && dbg.pig.scaleFallbackCount > 0) {
            fails.push(`stage=${stg} y=${y}: scaleFallbackCount=${dbg.pig.scaleFallbackCount}`);
          }
        }
      }
      window.CanvasPig.setStage('adult');
      return { fails };
    });

    check(
      'V4',
      v4Res.fails.length === 0,
      'Pig scale across life stages failed: ' + v4Res.fails.join('; ')
    );

    // -------------------------------------------------------------------------
    // V5: Saved item coordinates (cells) unchanged after an upgrade and draw at the same cell
    // -------------------------------------------------------------------------
    const v5Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const fails = [];
      st.rooms.layouts.salon = {
        cols: 12,
        rows: 7,
        wallRows: 2,
        items: [
          { uid: 'v5_test_item', itemId: 'lamp_floor', x: 3, y: 2, flip: false, variant: 0 }
        ]
      };
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      if (window.CuyPlaces.applyScene) window.CuyPlaces.applyScene();

      const inst = window.CanvasPig.instance || window.PigCanvas.instance;
      const off12 = window.CuyRoomGeometry.stageOffset(12, 7);
      const t12 = (inst && inst.things || []).find(t => (t.uid || t.id) === 'v5_test_item');
      if (!t12) {
        fails.push('Item v5_test_item not found in inst.things at 12x7');
      }

      // Upgrade salon 12x7 -> 16x8
      st.rooms.layouts.salon.cols = 16;
      st.rooms.layouts.salon.rows = 8;
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      if (window.CuyPlaces.applyScene) window.CuyPlaces.applyScene();

      const savedItem = st.rooms.layouts.salon.items.find(i => i.uid === 'v5_test_item');
      if (!savedItem || savedItem.x !== 3 || savedItem.y !== 2) {
        fails.push(`Saved coordinates mutated after upgrade: ${JSON.stringify(savedItem)}`);
      }

      const off16 = window.CuyRoomGeometry.stageOffset(16, 8);
      const t16 = (inst && inst.things || []).find(t => (t.uid || t.id) === 'v5_test_item');
      if (!t16) {
        fails.push('Item v5_test_item not found in inst.things at 16x8');
      } else if (t12) {
        const expectedDx = off16.x - off12.x; // 0 - 32 = -32
        const expectedDy = off16.y - off12.y; // 8 - 16 = -8
        const actualDx = t16.x - t12.x;
        const actualDy = t16.y - t12.y;
        if (actualDx !== expectedDx || actualDy !== expectedDy) {
          fails.push(`Canvas shift mismatch: got (${actualDx},${actualDy}), expected (${expectedDx},${expectedDy})`);
        }
        // Check local cell coordinate via pxToCell
        const cell16 = window.CuyRoomGeometry.pxToCell(
          st.rooms.layouts.salon,
          t16.x - off16.x - 1,
          t16.y - off16.y
        );
        if (!cell16) {
          fails.push('pxToCell returned null');
        }
      }

      // Restore 12x7
      st.rooms.layouts.salon.cols = 12;
      st.rooms.layouts.salon.rows = 7;
      window.bridge.broadcastState();
      return { fails };
    });

    check(
      'V5',
      v5Res.fails.length === 0,
      'Saved item coordinates / canvas offset after upgrade failed: ' + v5Res.fails.join('; ')
    );

    // -------------------------------------------------------------------------
    // V6: Click in cell (0,0) and (cols-1,rows-1) hits that cell at every room size (room offset in the frame)
    // -------------------------------------------------------------------------
    const v6Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const fails = [];
      const sizes = [
        [10, 6],
        [12, 7],
        [14, 8],
        [16, 8],
        [20, 9]
      ];

      for (const [cols, rows] of sizes) {
        st.rooms.layouts.salon.cols = cols;
        st.rooms.layouts.salon.rows = rows;
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace('salon');

        const off = window.CuyRoomGeometry.stageOffset(cols, rows);
        const dbg = window.CanvasPig.debug();
        if (!dbg || !dbg.roomOffset || dbg.roomOffset.x !== off.x || dbg.roomOffset.y !== off.y) {
          fails.push(`${cols}x${rows}: debug.roomOffset=${JSON.stringify(dbg && dbg.roomOffset)} vs stageOffset=${JSON.stringify(off)}`);
        }

        // For 10x6..16x8 test (0,0) and (cols-1,rows-1); for 20x9 (320px > 256px) test visible boundary cells inside 0..255
        const targetCells = (cols * 16 <= 256)
          ? [[0, 0], [cols - 1, rows - 1]]
          : [[2, 0], [cols - 3, rows - 1]];

        for (const [cx, cy] of targetCells) {
          const sx = off.x + cx * 16 + 8;
          const sy = off.y + (cy + 1) * 16; // bottom of cell (pxToCell uses Math.round(py / 16 - 1))
          const clientPt = window.CanvasPig.toClient(sx, sy);
          const roundTrip = window.CanvasPig.toScene(clientPt);
          if (Math.abs(roundTrip.x - sx) > 1 || Math.abs(roundTrip.y - sy) > 1) {
            fails.push(`${cols}x${rows} cell(${cx},${cy}): toClient->toScene got (${roundTrip.x},${roundTrip.y}) vs (${sx},${sy})`);
          }
          const hitCell = window.CuyRoomGeometry.pxToCell(
            { cols, rows },
            roundTrip.x - off.x,
            roundTrip.y - off.y
          );
          if (hitCell.cx !== cx || hitCell.cy !== cy) {
            fails.push(`${cols}x${rows} cell(${cx},${cy}): pxToCell got (${hitCell.cx},${hitCell.cy})`);
          }
        }
      }

      st.rooms.layouts.salon.cols = 12;
      st.rooms.layouts.salon.rows = 7;
      window.bridge.broadcastState();
      return { fails };
    });

    check(
      'V6',
      v6Res.fails.length === 0,
      'Cell hit mapping across room sizes failed: ' + v6Res.fails.join('; ')
    );

    // -------------------------------------------------------------------------
    // V7: Drag ghost aligns with the cursor cell at every room size
    // -------------------------------------------------------------------------
    const v7Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const fails = [];
      const sizes = [
        [10, 6],
        [12, 7],
        [14, 8],
        [16, 8],
        [20, 9]
      ];

      // Ensure an owned item is available in the edit drawer strip
      if (!st.rooms.owned) st.rooms.owned = {};
      st.rooms.owned.lamp_floor = 3;
      st.rooms.owned.hay_rack = 3;
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');

      if (!window.CuyEdit.isOpen()) {
        window.CuyEdit.toggle();
      }

      const card = document.querySelector('#editDrawerStrip .edit-card:not(.is-dimmed)');
      if (!card) {
        fails.push('No placeable .edit-card found in #editDrawerStrip');
        return { fails };
      }

      for (const [cols, rows] of sizes) {
        st.rooms.layouts.salon.cols = cols;
        st.rooms.layouts.salon.rows = rows;
        st.rooms.layouts.salon.items = [];
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace('salon');

        const activeCard = document.querySelector('#editDrawerStrip .edit-card:not(.is-dimmed)');
        if (!activeCard) {
          fails.push(`${cols}x${rows}: no active .edit-card`);
          continue;
        }
        const itemId = activeCard.getAttribute('data-id');
        const cardRect = activeCard.getBoundingClientRect();

        // Start drag on card
        activeCard.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: cardRect.left + 10,
          clientY: cardRect.top + 10
        }));

        // Target cell center inside floor area
        const off = window.CuyRoomGeometry.stageOffset(cols, rows);
        const testCol = Math.floor(cols / 2);
        const testRow = Math.min(rows - 1, 4);
        const targetSceneX = off.x + testCol * 16 + 8;
        const targetSceneY = off.y + (testRow + 1) * 16;
        const clientPt = window.CanvasPig.toClient(targetSceneX, targetSceneY);

        document.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: clientPt.clientX,
          clientY: clientPt.clientY
        }));

        const dbg = window.CanvasPig.debug();
        const expectedSnapX = Math.round(targetSceneX / 4) * 4;
        const expectedSnapY = Math.round(targetSceneY / 4) * 4;

        if (!dbg || !dbg.ghost) {
          fails.push(`${cols}x${rows}: ghost is null during pointermove over canvas`);
        } else {
          if (dbg.ghost.itemId !== itemId) {
            fails.push(`${cols}x${rows}: ghost.itemId=${dbg.ghost.itemId} vs ${itemId}`);
          }
          if (Math.abs(dbg.ghost.x - expectedSnapX) > 4 || Math.abs(dbg.ghost.y - expectedSnapY) > 4) {
            fails.push(`${cols}x${rows}: ghost=(${dbg.ghost.x},${dbg.ghost.y}) vs cursorSnap=(${expectedSnapX},${expectedSnapY})`);
          }
        }

        // Release pointer outside canvas to cancel placement cleanly
        document.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          clientX: 5,
          clientY: 5
        }));
      }

      if (window.CuyEdit.isOpen()) {
        window.CuyEdit.toggle();
      }
      st.rooms.layouts.salon.cols = 12;
      st.rooms.layouts.salon.rows = 7;
      window.bridge.broadcastState();
      return { fails };
    });

    check(
      'V7',
      v7Res.fails.length === 0,
      'Drag ghost alignment across room sizes failed: ' + v7Res.fails.join('; ')
    );

    // -------------------------------------------------------------------------
    // V8: Longest place name stays inside the title plate
    // -------------------------------------------------------------------------
    const v8Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const fails = [];
      const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];

      // Also test an adversarial extra-long custom pig room name (24 chars + " Room")
      const checkTitleFits = (label) => {
        const plate = document.querySelector('.places-bar-plate');
        const title = document.getElementById('placesBarTitle');
        const bar = document.getElementById('placesBar');
        if (!plate || !title || !bar) {
          fails.push(`${label}: missing title plate DOM elements`);
          return;
        }
        const pr = plate.getBoundingClientRect();
        const tr = title.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        const cs = window.getComputedStyle(title);

        if (tr.left < pr.left - 1 || tr.right > pr.right + 1 || tr.top < pr.top - 1 || tr.bottom > pr.bottom + 1) {
          fails.push(`${label}: title rect (${tr.left.toFixed(1)}..${tr.right.toFixed(1)}) overflows plate (${pr.left.toFixed(1)}..${pr.right.toFixed(1)})`);
        }
        if (pr.left < br.left || pr.right > br.right || pr.height > br.height) {
          fails.push(`${label}: plate overflows placesBar`);
        }
        if (cs.overflow !== 'hidden' || cs.whiteSpace !== 'nowrap') {
          fails.push(`${label}: title missing overflow:hidden or white-space:nowrap`);
        }
      };

      for (const sId of scenes) {
        window.CuyPlaces.openPlace(sId);
        checkTitleFits(sId);
      }

      // Adversarial long room name
      const origName = st.rooms.layouts['pig:pig_1'].name;
      st.rooms.layouts['pig:pig_1'].name = 'Sir Fluffington McSqueak III Memorial Suite';
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('pig:pig_1');
      checkTitleFits('adversarial_long_name');
      st.rooms.layouts['pig:pig_1'].name = origName || '';
      window.bridge.broadcastState();

      return { fails };
    });

    check(
      'V8',
      v8Res.fails.length === 0,
      'Title plate containment check failed: ' + v8Res.fails.join('; ')
    );

    allErrors.push(...(page.__errors || []));
    await page.close();

    // -------------------------------------------------------------------------
    // V9: deviceScaleFactor 1, 1.25, 1.5, 2: same CSS layout and no blurry non-integer scaling flagged by image-rendering
    // -------------------------------------------------------------------------
    const scales = [1, 1.25, 1.5, 2];
    const v9Layouts = [];
    const v9Fails = [];

    for (const dsf of scales) {
      const ctx = await browser.newContext({
        viewport: { width: 420, height: 640 },
        deviceScaleFactor: dsf
      });
      const dsfPage = await ctx.newPage();
      dsfPage.on('pageerror', (e) => allErrors.push(`pageerror(dsf=${dsf}): ` + e.message));
      dsfPage.on('console', (m) => {
        if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
          allErrors.push(`console(dsf=${dsf}): ` + m.text());
        }
      });

      await dsfPage.goto(`${server.base}/web/home/index.html`);
      await dsfPage.evaluate(() => document.body.classList.add('webview-mode'));
      await dsfPage.waitForFunction(
        () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 10,
        { timeout: 10000 }
      );
      await dsfPage.waitForTimeout(300);

      const probe = await dsfPage.evaluate(() => {
        const c = document.getElementById('pigCanvas');
        const btnMore = document.getElementById('btnMore');
        const placesBar = document.getElementById('placesBar');
        const cr = c.getBoundingClientRect();
        const mr = btnMore.getBoundingClientRect();
        const br = placesBar.getBoundingClientRect();
        const csCanvas = window.getComputedStyle(c);
        const csBar = window.getComputedStyle(placesBar);
        const dbg = window.CanvasPig && window.CanvasPig.debug ? window.CanvasPig.debug() : null;
        return {
          dpr: window.devicePixelRatio,
          logicalW: c.width,
          logicalH: c.height,
          canvasW: cr.width,
          canvasH: cr.height,
          moreBottom: mr.bottom,
          barBottom: br.bottom,
          canvasImgRender: csCanvas.imageRendering,
          barImgRender: csBar.imageRendering,
          smoothing: dbg ? dbg.smoothing : false
        };
      });

      if (probe.logicalW !== 256 || probe.logicalH !== 144) {
        v9Fails.push(`dsf=${dsf}: canvas logical=${probe.logicalW}x${probe.logicalH}`);
      }
      if (!/pixelated|crisp-edges/.test(probe.canvasImgRender)) {
        v9Fails.push(`dsf=${dsf}: #pigCanvas image-rendering=${probe.canvasImgRender}`);
      }
      if (!/pixelated|crisp-edges/.test(probe.barImgRender)) {
        v9Fails.push(`dsf=${dsf}: #placesBar image-rendering=${probe.barImgRender}`);
      }
      if (probe.smoothing !== false) {
        v9Fails.push(`dsf=${dsf}: ctx.imageSmoothingEnabled=${probe.smoothing}`);
      }
      if (probe.moreBottom > 640.5) {
        v9Fails.push(`dsf=${dsf}: #btnMore.bottom=${probe.moreBottom.toFixed(1)} > 640`);
      }
      v9Layouts.push({ dsf, ...probe });

      await ctx.close();
    }

    const baseLayout = v9Layouts[0];
    for (const l of v9Layouts) {
      if (Math.abs(l.canvasW - baseLayout.canvasW) > 1.5 || Math.abs(l.canvasH - baseLayout.canvasH) > 1.5) {
        v9Fails.push(`dsf=${l.dsf}: canvas CSS (${l.canvasW.toFixed(1)}x${l.canvasH.toFixed(1)}) differs from dsf=1 (${baseLayout.canvasW.toFixed(1)}x${baseLayout.canvasH.toFixed(1)})`);
      }
      if (Math.abs(l.moreBottom - baseLayout.moreBottom) > 1.5) {
        v9Fails.push(`dsf=${l.dsf}: btnMore.bottom=${l.moreBottom.toFixed(1)} differs from dsf=1 (${baseLayout.moreBottom.toFixed(1)})`);
      }
    }

    check(
      'V9',
      v9Fails.length === 0,
      'deviceScaleFactor layout / image-rendering check failed: ' + v9Fails.join('; ')
    );

    // -------------------------------------------------------------------------
    // V11: No console errors
    // -------------------------------------------------------------------------
    check(
      'V11',
      allErrors.length === 0,
      'Console / page errors detected: ' + allErrors.join(' | ')
    );
  } finally {
    await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) {
    process.exit(1);
  }
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
