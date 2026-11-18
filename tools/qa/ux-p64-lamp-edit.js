'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const ROOT = path.resolve(__dirname, '..', '..');
const PARITY_PATH = path.join(ROOT, 'tests', 'Cuy.Core.Tests', 'TestResults', 'lamp-parity.json');
const IS_STRICT = process.env.STRICT === '1';

async function run() {
  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const page = await ux.openHome(browser);
  await page.setViewportSize({ width: 420, height: 640 });
  page.setDefaultTimeout(5000);

  const defects = [];
  const passes = [];
  const skips = [];

  function recordPass(id, desc) {
    passes.push(id);
    console.log(`PASS ${id}: ${desc}`);
  }

  function recordDefect(id, desc) {
    defects.push({ id, desc });
    console.log(`DEFECT ${id}: ${desc}`);
  }

  function recordSkip(id, reason) {
    skips.push({ id, reason });
    console.log(`SKIP ${id}: ${reason}`);
  }

  // Ensure CuyEdit is ready and hook bridge.send to record outgoing messages
  await page.waitForFunction(() => window.CuyEdit && window.CanvasPig && window.CuyPlaces, { timeout: 5000 });
  await page.evaluate(() => {
    window.__sentMessages = [];
    if (window.bridge && typeof window.bridge.send === 'function' && !window.bridge.__hookedForT7) {
      const origSend = window.bridge.send.bind(window.bridge);
      window.bridge.send = function (msg) {
        window.__sentMessages.push(JSON.parse(JSON.stringify(msg)));
        return origSend(msg);
      };
      window.bridge.__hookedForT7 = true;
    }
  });

  async function setupSalonScene(placedItems = []) {
    await page.evaluate((items) => {
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
      st.places.order.forEach(p => { p.locked = false; });
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      st.rooms.layouts.salon = {
        name: 'Salon',
        cols: 12,
        rows: 7,
        wallRows: 2,
        wallpaper: '',
        floor: '',
        items: items
      };
      st.rooms.owned = {
        lamp_mushroom: 5,
        lamp_floor: 5,
        lamp_salt: 5,
        lamp_arc: 5,
        fairy_lights: 5,
        lamp_post: 5,
        lamp_oil: 5,
        sofa_cosy: 3,
        side_table: 3,
        picture_pig: 3,
        memory_frame: 3
      };
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      if (window.CuyEdit) {
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        window.CuyEdit.render(st);
      }
      window.__sentMessages = [];
    }, placedItems);
    await page.waitForTimeout(100);
  }

  // J-parity (C1 JS side): Compare Core lamp-parity.json against editor cellValid
  if (!fs.existsSync(PARITY_PATH)) {
    recordSkip('J-parity', `Missing ${PARITY_PATH}; run LampPlacementAdversarialTests first`);
  } else {
    const parityData = JSON.parse(fs.readFileSync(PARITY_PATH, 'utf8'));
    await setupSalonScene([]);

    const parityCheck = await page.evaluate((data) => {
      const mismatches = [];
      const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
      const off = (inst && inst.roomOffset) || { x: 32, y: 16 };
      const lamps = data.lamps || {};

      for (const lampId of Object.keys(lamps)) {
        const lampInfo = lamps[lampId];
        const footW = lampInfo.footW || 1;
        const footH = lampInfo.footH || 1;
        const cells = lampInfo.cells || [];

        for (let cy = 0; cy < cells.length; cy++) {
          const row = cells[cy];
          for (let cx = 0; cx < row.length; cx++) {
            const cellEntry = row[cx];
            const localX = Math.round((cx + footW / 2) * 16);
            const localY = Math.round((cy + footH) * 16);
            const sceneX = off.x + localX;
            const sceneY = off.y + localY;
            const jsValid = !!window.CanvasPig.cellValid(lampId, sceneX, sceneY);
            if (jsValid !== cellEntry.ok) {
              mismatches.push({
                lampId,
                cx,
                cy,
                localX,
                localY,
                sceneX,
                sceneY,
                coreVerdict: cellEntry.verdict,
                coreOk: cellEntry.ok,
                jsValid
              });
            }
          }
        }
      }

      // Also check R25 Section 6 cases
      const r25Mismatches = [];
      const r25Cases = data.r25Cases || [];
      for (const tc of r25Cases) {
        if (tc.place === 'garden') {
          window.CuyPlaces.openPlace('garden');
          const gValid = !!window.CanvasPig.cellValid(tc.itemId, tc.px, tc.py);
          if (gValid !== tc.ok) {
            r25Mismatches.push({ id: tc.id, itemId: tc.itemId, px: tc.px, py: tc.py, coreOk: tc.ok, jsValid: gValid });
          }
          window.CuyPlaces.openPlace('salon');
        } else {
          const st = window.bridge.currentState || window.bridge.getState();
          if (tc.id === 'T13') {
            st.rooms.layouts.salon.items = [{ uid: 'u_lf', itemId: 'lamp_floor', x: 3, y: 2 }];
          } else if (tc.id === 'T14') {
            st.rooms.layouts.salon.items = [{ uid: 'u_st', itemId: 'side_table', x: 3, y: 2 }];
          } else if (tc.id === 'T15') {
            st.rooms.layouts.salon.items = [{ uid: 'u_sf', itemId: 'sofa_cosy', x: 1, y: 2 }];
          } else {
            st.rooms.layouts.salon.items = [];
          }
          window.CuyPlaces.openPlace('salon');
          const curInst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
          const curOff = (curInst && curInst.roomOffset) || { x: 32, y: 16 };
          const sValid = !!window.CanvasPig.cellValid(tc.itemId, curOff.x + tc.px, curOff.y + tc.py);
          if (sValid !== tc.ok) {
            r25Mismatches.push({ id: tc.id, itemId: tc.itemId, px: tc.px, py: tc.py, coreOk: tc.ok, jsValid: sValid });
          }
        }
      }

      return { mismatches, r25Mismatches };
    }, parityData);

    if (parityCheck.mismatches.length > 0 || parityCheck.r25Mismatches.length > 0) {
      const sampleGrid = parityCheck.mismatches.slice(0, 6).map(m => `${m.lampId}@(${m.cx},${m.cy})[core=${m.coreOk},js=${m.jsValid}]`).join(', ');
      const sampleR25 = parityCheck.r25Mismatches.map(m => `${m.id}(${m.itemId})[core=${m.coreOk},js=${m.jsValid}]`).join(', ');
      recordDefect(
        'C1-PARITY',
        `Core CanPlace vs JS cellValid mismatch (${parityCheck.mismatches.length} grid cells, ${parityCheck.r25Mismatches.length} R25 cases): grid=[${sampleGrid}] r25=[${sampleR25}]`
      );
    } else {
      recordPass('C1-PARITY', 'All 7 lamps x 84 cells and R25 table cases match between Core CanPlace and JS cellValid');
    }
  }

  // Helper to simulate pointer drag from an edit card to a scene coordinate (sx, sy)
  async function dragCardToScene(itemId, sx, sy, drop = true) {
    return await page.evaluate(({ id, targetX, targetY, doDrop }) => {
      window.__sentMessages = [];
      const card = document.querySelector(`#editDrawer .edit-card[data-id="${id}"]`);
      if (!card) return { error: `Card not found for ${id}` };
      const cRect = card.getBoundingClientRect();
      const startClientX = cRect.left + cRect.width / 2;
      const startClientY = cRect.top + cRect.height / 2;

      const pt = window.CanvasPig.toClient(targetX, targetY);

      card.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: startClientX,
        clientY: startClientY
      }));

      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: pt.clientX,
        clientY: pt.clientY
      }));

      const dbgDuring = window.CanvasPig.debug();
      const ghostDuring = dbgDuring ? dbgDuring.ghost : null;

      if (doDrop) {
        document.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: pt.clientX,
          clientY: pt.clientY
        }));
      }

      return {
        ghost: ghostDuring,
        sent: window.__sentMessages.slice()
      };
    }, { id: itemId, targetX: sx, targetY: sy, doDrop: drop });
  }

  // J1: dragging a floor lamp to the top floor row (cy=2, local y=48) shows the green ghost and sends one room_place / room_move
  await setupSalonScene([{ uid: 'existing_fl', itemId: 'lamp_floor', x: 5, y: 4 }]);
  {
    const off = await page.evaluate(() => window.CanvasPig.debug().roomOffset || { x: 32, y: 16 });
    // Top floor row cy=2: foot_h=1 -> local (8, 48) for cx=0, cy=2
    const targetSceneX = off.x + 8;
    const targetSceneY = off.y + 48;

    const placeRes = await dragCardToScene('lamp_mushroom', targetSceneX, targetSceneY, true);
    const placeMsgs = (placeRes.sent || []).filter(m => m.type === 'room_place');

    // Also test moving existing lamp_floor to top floor row cy=2 (cx=5, cy=2 -> local 88, 48)
    const moveRes = await page.evaluate(({ offX, offY }) => {
      window.__sentMessages = [];
      // Pick existing lamp_floor at (5, 4) -> local (88, 80)
      const fromPt = window.CanvasPig.toClient(offX + 88, offY + 72);
      const toPt = window.CanvasPig.toClient(offX + 88, offY + 48);
      const canvas = document.getElementById('pigCanvas');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, button: 0, clientX: fromPt.clientX, clientY: fromPt.clientY
      }));
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, button: 0, clientX: toPt.clientX, clientY: toPt.clientY
      }));
      const ghostMove = window.CanvasPig.debug().ghost;
      document.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true, button: 0, clientX: toPt.clientX, clientY: toPt.clientY
      }));
      return { ghost: ghostMove, sent: window.__sentMessages.slice() };
    }, { offX: off.x, offY: off.y });

    const moveMsgs = (moveRes.sent || []).filter(m => m.type === 'room_move');

    if (!placeRes.ghost || !placeRes.ghost.valid || placeMsgs.length !== 1 || !moveRes.ghost || !moveRes.ghost.valid || moveMsgs.length !== 1) {
      recordDefect(
        'J1',
        `Expected green ghost (valid=true) and 1 room_place + 1 room_move at top floor row cy=2; got placeGhost=${JSON.stringify(placeRes.ghost)} placeMsgs=${placeMsgs.length} moveGhost=${JSON.stringify(moveRes.ghost)} moveMsgs=${moveMsgs.length}`
      );
    } else {
      recordPass('J1', 'Dragging floor lamp to top floor row (cy=2) shows green ghost and sends 1 room_place / 1 room_move');
    }
  }

  // J2: dragging a wall lamp to the floor shows the red ghost and sends nothing
  await setupSalonScene([]);
  {
    const off = await page.evaluate(() => window.CanvasPig.debug().roomOffset || { x: 32, y: 16 });
    // Floor position cy=4 -> local (48, 80)
    const floorSceneX = off.x + 48;
    const floorSceneY = off.y + 80;

    const arcRes = await dragCardToScene('lamp_arc', floorSceneX, floorSceneY, true);
    const fairyRes = await dragCardToScene('fairy_lights', floorSceneX, floorSceneY, true);

    const arcRed = arcRes.ghost && arcRes.ghost.valid === false && arcRes.sent.length === 0;
    const fairyRed = fairyRes.ghost && fairyRes.ghost.valid === false && fairyRes.sent.length === 0;

    if (!arcRed || !fairyRed) {
      recordDefect(
        'J2',
        `Wall lamp on floor must show red ghost (valid=false) and send 0 messages; got lamp_arc=(ghost:${JSON.stringify(arcRes.ghost)},sent:${arcRes.sent.length}) fairy_lights=(ghost:${JSON.stringify(fairyRes.ghost)},sent:${fairyRes.sent.length})`
      );
    } else {
      recordPass('J2', 'Dragging wall lamps (lamp_arc, fairy_lights) to floor shows red ghost and sends 0 messages');
    }
  }

  // J3: snapping to the 16 px grid at the room offset of the fixed 256x144 viewport
  await setupSalonScene([]);
  {
    const snapCheck = await page.evaluate(() => {
      const dbg = window.CanvasPig.debug();
      const off = dbg.roomOffset || { x: 32, y: 16 };
      const sceneSize = dbg.sceneSize;
      return { off, sceneSize };
    });

    // Drag lamp_mushroom to an unaligned sub-cell point inside cell (cx=3, cy=2):
    // Cell (3, 2) spans local x=[48..64], y=[32..48]; center-bottom of 1x1 foot is local (56, 48).
    // Let's drop at local (51, 45) -> scene (32+51, 16+45) = (83, 61)
    const rawSceneX = snapCheck.off.x + 51;
    const rawSceneY = snapCheck.off.y + 45;
    const dropRes = await dragCardToScene('lamp_mushroom', rawSceneX, rawSceneY, true);
    const msg = (dropRes.sent || []).find(m => m.type === 'room_place');

    // Check if ghost and message snapped to 16 px grid at roomOffset
    // Note: R25 section 1 item 3 & section 5 PK-PE2 says snapping should align to the 16 px grid/foot
    const ghostLocalX = dropRes.ghost ? dropRes.ghost.x - snapCheck.off.x : -1;
    const ghostLocalY = dropRes.ghost ? dropRes.ghost.y - snapCheck.off.y : -1;
    const is16GridSnapped = (ghostLocalY % 16 === 0) && (ghostLocalX % 8 === 0) && msg && (msg.y % 16 === 0 || msg.y < 7);

    if (snapCheck.sceneSize[0] !== 256 || snapCheck.sceneSize[1] !== 144 || snapCheck.off.x !== 32 || snapCheck.off.y !== 16 || !is16GridSnapped) {
      recordDefect(
        'J3',
        `Expected 16px grid snapping at roomOffset (32,16) in 256x144 viewport (input local 51,45 -> snapped local 56,48); got ghostLocal=(${ghostLocalX},${ghostLocalY}), msg=${JSON.stringify(msg)}`
      );
    } else {
      recordPass('J3', 'Snaps to 16px grid at roomOffset (32,16) of fixed 256x144 viewport');
    }
  }

  // J4: rapid repeated drops send exactly one message per drop
  await setupSalonScene([]);
  {
    const off = await page.evaluate(() => window.CanvasPig.debug().roomOffset || { x: 32, y: 16 });
    const dropsCount = 5;
    const rapidRes = await page.evaluate(({ offX, offY, n }) => {
      window.__sentMessages = [];
      for (let i = 0; i < n; i++) {
        // Re-query card on each iteration because room_place triggers a state broadcast & drawer re-render
        const card = document.querySelector('#editDrawer .edit-card[data-id="lamp_salt"]');
        if (!card) return { error: `lamp_salt card not found at step ${i}` };
        const cRect = card.getBoundingClientRect();
        const sx = cRect.left + cRect.width / 2;
        const sy = cRect.top + cRect.height / 2;

        const targetPt = window.CanvasPig.toClient(offX + 8 + i * 16, offY + 64);
        card.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, button: 0, clientX: sx, clientY: sy
        }));
        document.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, cancelable: true, button: 0, clientX: targetPt.clientX, clientY: targetPt.clientY
        }));
        document.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true, cancelable: true, button: 0, clientX: targetPt.clientX, clientY: targetPt.clientY
        }));
        // Stray extra pointerup without pointerdown should not send duplicate
        document.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true, cancelable: true, button: 0, clientX: targetPt.clientX, clientY: targetPt.clientY
        }));
      }
      return { sent: window.__sentMessages.filter(m => m.type === 'room_place') };
    }, { offX: off.x, offY: off.y, n: dropsCount });

    if (rapidRes.error || !rapidRes.sent || rapidRes.sent.length !== dropsCount) {
      recordDefect(
        'J4',
        `Expected ${dropsCount} room_place messages for ${dropsCount} rapid drops; got ${rapidRes.error || (rapidRes.sent && rapidRes.sent.length)}`
      );
    } else {
      recordPass('J4', `${dropsCount} rapid repeated drops sent exactly ${dropsCount} messages (1 per drop)`);
    }
  }

  // J5: no console errors
  if (page.__errors && page.__errors.length > 0) {
    recordDefect('J5', `Console/page errors detected: ${page.__errors.join('; ')}`);
  } else {
    recordPass('J5', 'No console or page errors');
  }

  await browser.close();
  server.close();

  console.log(`SUMMARY ux-p64-lamp-edit: PASS=${passes.length} DEFECT=${defects.length} SKIP=${skips.length}`);
  if (IS_STRICT && defects.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error in ux-p64-lamp-edit:', err);
  process.exit(1);
});
