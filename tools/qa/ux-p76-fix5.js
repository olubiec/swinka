'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const STRICT = process.env.STRICT === '1';
const SHOTS_DIR = path.resolve(__dirname, '..', '..', 'docs', 'qa', 'shots');

async function launchBrowser() {
  for (const opts of [
    { headless: true },
    { channel: 'msedge', headless: true },
    { channel: 'chrome', headless: true }
  ]) {
    try {
      return await chromium.launch(opts);
    } catch (_) { }
  }
  return await chromium.launch({ headless: true });
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const server = await startServer();
  const browser = await launchBrowser();
  const defects = [];

  function pass(id, detail) {
    console.log(`PASS ${id}: ${detail}`);
  }

  function defect(id, detail) {
    console.log(`DEFECT ${id}: ${detail}`);
    defects.push({ id, detail });
  }

  async function saveShot(page, name) {
    const outPath = path.join(SHOTS_DIR, name);
    await page.screenshot({ path: outPath });
    return outPath;
  }

  try {
    const page = await openHome(browser, { base: server.base, query: 'mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForFunction(
      () => window.CanvasPig && window.CanvasPig.instance && window.CuyPlaces && window.CuyScenes && window.Lights && window.bridge,
      { timeout: 10000 }
    );

    await page.evaluate(async () => {
      if (window.CuyScenes && typeof window.CuyScenes.load === 'function') {
        await window.CuyScenes.load();
      }
      if (window.Lights && typeof window.Lights.load === 'function') {
        await window.Lights.load();
      }
      window.__qaWaitImages = async function () {
        const inst = window.CanvasPig.instance;
        for (let iter = 0; iter < 50; iter++) {
          let pending = false;
          if (inst && inst.imageCache) {
            for (const img of Object.values(inst.imageCache)) {
              if (img && !img.complete && !img.failed) pending = true;
            }
          }
          if (inst && inst.pigShadows) {
            for (const img of Object.values(inst.pigShadows)) {
              if (img && !img.complete) pending = true;
            }
          }
          if (!pending) break;
          await new Promise(r => setTimeout(r, 20));
        }
      };
    });
    await page.waitForTimeout(250);

    // =========================================================================
    // 1. Pig light (night dark, lamp never burns, off lamp & window ignored)
    // =========================================================================
    const r1Unit = await page.evaluate(async () => {
      const pigLightAt = window.CanvasPig.pigLightAt;
      const resp = await fetch('../../assets/data/lights.json');
      const lightsData = await resp.json();
      const dayAmb = window.Lights.ambientFor(lightsData, 'day');
      const nightAmb = window.Lights.ambientFor(lightsData, 'night');
      const dayRgb = [dayAmb.color[0] * dayAmb.level, dayAmb.color[1] * dayAmb.level, dayAmb.color[2] * dayAmb.level];
      const nightRgb = [nightAmb.color[0] * nightAmb.level, nightAmb.color[1] * nightAmb.level, nightAmb.color[2] * nightAmb.level];

      const close = (a, b, eps = 0.01) => a.every((v, i) => Math.abs(v - b[i]) <= eps);

      const resDay = pigLightAt(dayRgb, [], 100, 100);
      const resNight = pigLightAt(nightRgb, [], 100, 100);
      const resOff = pigLightAt(nightRgb, [{ x: 100, y: 100, on: false, radius: 60, intensity: 1, color: [1, 0.72, 0.38] }], 100, 100);
      const resWin = pigLightAt(nightRgb, [{ x: 100, y: 100, on: true, color: 'ambient', itemId: 'window', radius: 60, intensity: 1 }], 100, 100);
      const resLamp = pigLightAt(nightRgb, [{ x: 100, y: 100, on: true, radius: 60, intensity: 1, color: [1, 0.72, 0.38] }], 100, 100);

      return {
        dayRgb, nightRgb, resDay, resNight, resOff, resWin, resLamp,
        dayOk: close(resDay, dayRgb),
        nightOk: close(resNight, nightRgb),
        offOk: close(resOff, nightRgb),
        winOk: close(resWin, nightRgb),
        lampOk: resLamp.every(v => v <= 0.78 + 1e-6)
      };
    });

    if (r1Unit.dayOk && r1Unit.nightOk && r1Unit.offOk && r1Unit.winOk && r1Unit.lampOk) {
      pass('R1-unit', `pigLightAt day=${JSON.stringify(r1Unit.resDay.map(v => +v.toFixed(3)))} night=${JSON.stringify(r1Unit.resNight.map(v => +v.toFixed(3)))} lamp=${JSON.stringify(r1Unit.resLamp.map(v => +v.toFixed(3)))}`);
    } else {
      defect('R1-unit', `pigLightAt failed: ${JSON.stringify(r1Unit)}`);
    }

    // Rendered canvas check in salon
    await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = st.places || {};
      st.places.order = m.places.order;
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
      st.rooms = st.rooms || { layouts: {} };
      st.rooms.layouts = Object.assign({}, st.rooms.layouts || {}, m.rooms && m.rooms.layouts ? m.rooms.layouts : {});
      if (!st.rooms.layouts.salon) {
        st.rooms.layouts.salon = { name: 'Salon', cols: 12, rows: 7, wallRows: 2, wallpaper: '', floor: '', items: [] };
      }
      // Remove any lamps from salon for baseline day/night-dark check
      st.rooms.layouts.salon.items = (st.rooms.layouts.salon.items || []).filter(it => it && !String(it.itemId || '').startsWith('lamp'));
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();
    });

    const measurePigLuma = async (nowStr) => {
      return await page.evaluate(async (now) => {
        window.__cuyNow = now;
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
        if (window.CuyLight && typeof window.CuyLight.build === 'function') {
          inst.setLightScene(window.CuyLight.build('salon'));
        }
        const pig = (inst.pigs && inst.pigs[0]) || { id: 'pig_1', x: 128, y: 104, airY: 0, stage: 'adult', variant: 'default' };
        pig.x = 128;
        pig.y = 104;
        pig.airY = 0;
        inst.pigX = 128;
        inst.pigY = 104;
        inst.pigAirY = 0;
        inst.render();
        await window.__qaWaitImages();
        inst.render();

        // Build opaque pig pixel mask using an offscreen 256x144 canvas
        const off = document.createElement('canvas');
        off.width = 256;
        off.height = 144;
        const octx = off.getContext('2d');
        octx.imageSmoothingEnabled = false;
        inst.drawPigFor(octx, pig, null);
        const maskData = octx.getImageData(0, 0, 256, 144).data;

        const cv = document.getElementById('pigCanvas');
        const ctx = cv.getContext('2d');
        const imgData = ctx.getImageData(0, 0, 256, 144).data;

        let count = 0;
        let lumaSum = 0;
        for (let i = 0; i < maskData.length; i += 4) {
          if (maskData[i + 3] > 200) {
            const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
            lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
            count++;
          }
        }
        return { count, luma: count > 0 ? lumaSum / count : 0 };
      }, nowStr);
    };

    const dayMeasure = await measurePigLuma('12:00');
    await saveShot(page, 'fix5-day.png');

    const nightDarkMeasure = await measurePigLuma('22:00');
    await saveShot(page, 'fix5-night-dark.png');

    // Add active lamp_floor right next to the pig
    await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.rooms.layouts.salon.items.push({ uid: 'qa_lamp_floor', itemId: 'lamp_floor', x: 6, y: 4, flip: false, variant: 0, on: true });
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();
    });
    const nightLampMeasure = await measurePigLuma('22:00');
    await saveShot(page, 'fix5-night-lamp.png');

    if (dayMeasure.count > 0 && nightDarkMeasure.luma < 0.55 * dayMeasure.luma && nightLampMeasure.luma <= dayMeasure.luma) {
      pass('R1-canvas', `day=${dayMeasure.luma.toFixed(1)}, nightDark=${nightDarkMeasure.luma.toFixed(1)} (<${(0.55 * dayMeasure.luma).toFixed(1)}), nightLamp=${nightLampMeasure.luma.toFixed(1)} (<=${dayMeasure.luma.toFixed(1)})`);
    } else {
      defect('R1-canvas', `Luminance check failed: day=${JSON.stringify(dayMeasure)}, nightDark=${JSON.stringify(nightDarkMeasure)}, nightLamp=${JSON.stringify(nightLampMeasure)}`);
    }

    // =========================================================================
    // 2. Carrying in depth, collisions, and reaching the window frame in every room
    // =========================================================================
    await page.evaluate(async () => {
      window.__cuyNow = '12:00';
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = st.places || {};
      st.places.order = m.places.order;
      st.places.order.forEach(p => { p.locked = false; });
      st.rooms.layouts = Object.assign({}, st.rooms.layouts || {}, m.rooms && m.rooms.layouts ? m.rooms.layouts : {});
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();
    });

    const walkSalon = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      return inst && inst.walk ? inst.walk.slice() : null;
    });

    // Drag pig 25 scene px up in salon using real mouse events
    const dragCoords = await page.evaluate(() => {
      const startX = 128;
      const startY = 125;
      window.CanvasPig.pigX = startX;
      window.CanvasPig.pigY = startY;
      window.CanvasPig.setPigVisible(true);
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      if (inst.pigs && inst.pigs[0]) {
        inst.pigs[0].x = startX;
        inst.pigs[0].y = startY;
        inst.pigs[0].airY = 0;
      }
      inst.render();
      const p0 = window.CanvasPig.toClient(startX, startY - 10);
      const p1 = window.CanvasPig.toClient(startX, startY - 10 - 25);
      return {
        p0: { x: p0.clientX, y: p0.clientY },
        p1: { x: p1.clientX, y: p1.clientY },
        yBefore: inst.pigY,
        scaleBefore: window.CanvasPig.scaleAt(inst.pigY)
      };
    });

    await page.mouse.move(dragCoords.p0.x, dragCoords.p0.y);
    await page.mouse.down();
    await page.mouse.move(dragCoords.p1.x, dragCoords.p1.y, { steps: 5 });
    await page.waitForTimeout(50);

    const dragDepth = await page.evaluate((before) => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      inst.render();
      return {
        yBefore: before.yBefore,
        yAfter: inst.pigY,
        airAfter: inst.pigAirY,
        scaleBefore: before.scaleBefore,
        scaleAfter: window.CanvasPig.scaleAt(inst.pigY),
        freeAfter: inst.isFree(inst.pigX, inst.pigY)
      };
    }, dragCoords);

    await saveShot(page, 'fix5-drag-back.png');
    await page.mouse.up();

    // Check pig:pig_1 walk bounds & reaching left/right window frame
    await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'pig:pig_1', pinned: false }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('pig:pig_1');
      await window.__qaWaitImages();
    });

    const pigRoomCoords = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      window.CanvasPig.pigX = 128;
      window.CanvasPig.pigY = 115;
      window.CanvasPig.setPigVisible(true);
      if (inst.pigs && inst.pigs[0]) { inst.pigs[0].x = 128; inst.pigs[0].y = 115; }
      inst.render();
      const pStart = window.CanvasPig.toClient(128, 105);
      const pLeft = window.CanvasPig.toClient(4, 105);
      const pRight = window.CanvasPig.toClient(252, 105);
      return {
        walkPigRoom: inst && inst.walk ? inst.walk.slice() : null,
        pStart: { x: pStart.clientX, y: pStart.clientY },
        pLeft: { x: pLeft.clientX, y: pLeft.clientY },
        pRight: { x: pRight.clientX, y: pRight.clientY }
      };
    });

    await page.mouse.move(pigRoomCoords.pStart.x, pigRoomCoords.pStart.y);
    await page.mouse.down();
    await page.mouse.move(pigRoomCoords.pLeft.x, pigRoomCoords.pLeft.y, { steps: 5 });
    const leftX = await page.evaluate(() => ((window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance).pigX);
    await page.mouse.move(pigRoomCoords.pRight.x, pigRoomCoords.pRight.y, { steps: 8 });
    const rightX = await page.evaluate(() => ((window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance).pigX);
    await page.mouse.up();
    const pigRoomRes = { walkPigRoom: pigRoomCoords.walkPigRoom, leftX, rightX };

    const r2Ok =
      walkSalon[0] <= 8 && walkSalon[2] >= 248 &&
      pigRoomRes.walkPigRoom[0] <= 8 && pigRoomRes.walkPigRoom[2] >= 248 &&
      dragDepth.yAfter < dragDepth.yBefore &&
      dragDepth.scaleAfter < dragDepth.scaleBefore &&
      dragDepth.airAfter <= 12 &&
      dragDepth.freeAfter === true &&
      pigRoomRes.leftX <= 12 &&
      pigRoomRes.rightX >= 244;

    if (r2Ok) {
      pass('R2-depth-bounds', `salon.walk=${JSON.stringify(walkSalon)} pig_1.walk=${JSON.stringify(pigRoomRes.walkPigRoom)} dragY=${dragDepth.yBefore}->${dragDepth.yAfter} scale=${dragDepth.scaleBefore.toFixed(3)}->${dragDepth.scaleAfter.toFixed(3)} airY=${dragDepth.airAfter} leftX=${pigRoomRes.leftX} rightX=${pigRoomRes.rightX}`);
    } else {
      defect('R2-depth-bounds', `Failed: walkSalon=${JSON.stringify(walkSalon)} pigRoom=${JSON.stringify(pigRoomRes)} dragDepth=${JSON.stringify(dragDepth)}`);
    }

    // =========================================================================
    // 3. Edge bars without arrows & room switching in every room in every direction
    // =========================================================================
    await page.evaluate(async () => {
      // Set starter unlock state: salon, pig:pig_1, market unlocked; garden, park, farm locked
      const st = window.bridge.currentState || window.bridge.getState();
      const unlocked = new Set(['salon', 'pig:pig_1', 'market']);
      st.places.order.forEach(p => {
        p.locked = !unlocked.has(p.id);
      });
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('pig:pig_1');
      await window.__qaWaitImages();

      // Spy on ctx.drawImage for ui/arrow_*.png
      window.__qaArrowDrawn = [];
      const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      window.__qaOrigDrawImage = origDrawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (img) {
        if (img && img.src && /ui\/arrow_.*\.png/i.test(img.src)) {
          window.__qaArrowDrawn.push(img.src);
        }
        return origDrawImage.apply(this, arguments);
      };
    });

    const dragToEdgeAndHold = async (side) => {
      const coords = await page.evaluate((s) => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
        window.CanvasPig.pigX = 128;
        window.CanvasPig.pigY = 115;
        window.CanvasPig.setPigVisible(true);
        if (typeof window.CanvasPig.clearEdgeHold === 'function') window.CanvasPig.clearEdgeHold();
        if (inst.pigs && inst.pigs[0]) { inst.pigs[0].x = 128; inst.pigs[0].y = 115; }
        inst.render();
        const targetX = s === 'right' ? 253 : 3;
        const p0 = window.CanvasPig.toClient(128, 105);
        const p1 = window.CanvasPig.toClient(targetX, 105);
        return { p0: { x: p0.clientX, y: p0.clientY }, p1: { x: p1.clientX, y: p1.clientY } };
      }, side);

      await page.mouse.move(coords.p0.x, coords.p0.y);
      await page.mouse.down();
      await page.mouse.move(coords.p1.x, coords.p1.y, { steps: 5 });

      await page.waitForTimeout(80);
      const midHold = await page.evaluate(() => {
        const r = document.getElementById('stageEdgeRight');
        const cs = r ? getComputedStyle(r) : null;
        return {
          rightActive: r ? r.classList.contains('edge-active') : false,
          color: cs ? cs.color : null,
          fontSize: cs ? cs.fontSize : null
        };
      });

      await page.waitForTimeout(320);
      await page.mouse.up();
      await page.waitForTimeout(80);

      const currentScene = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
        return inst.sceneId;
      });
      return { midHold, currentScene };
    };

    // pig:pig_1 -> right -> market (skipping locked garden/park/farm)
    const sw1 = await dragToEdgeAndHold('right');
    // market -> left -> pig:pig_1
    const sw2 = await dragToEdgeAndHold('left');
    // salon -> left -> market
    await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();
    });
    const sw3 = await dragToEdgeAndHold('left');
    // salon -> right -> pig:pig_1
    await page.evaluate(async () => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();
    });
    const sw4 = await dragToEdgeAndHold('right');

    const arrowDrawn = await page.evaluate(() => {
      if (window.__qaOrigDrawImage) {
        CanvasRenderingContext2D.prototype.drawImage = window.__qaOrigDrawImage;
      }
      return window.__qaArrowDrawn || [];
    });

    const edgeStyleOk =
      sw1.midHold.rightActive === true &&
      (sw1.midHold.color === 'rgba(0, 0, 0, 0)' || sw1.midHold.color === 'transparent' || sw1.midHold.fontSize === '0px') &&
      arrowDrawn.length === 0;
    const switchesOk =
      sw1.currentScene === 'market' &&
      sw2.currentScene === 'pig:pig_1' &&
      sw3.currentScene === 'market' &&
      sw4.currentScene === 'pig:pig_1';

    if (edgeStyleOk && switchesOk) {
      pass('R3-edges', `pig_1->R=${sw1.currentScene}, market->L=${sw2.currentScene}, salon->L=${sw3.currentScene}, salon->R=${sw4.currentScene}, edgeActive=${sw1.midHold.rightActive}, fontSize=${sw1.midHold.fontSize}, arrowsDrawn=0`);
    } else {
      defect('R3-edges', `Failed: sw1=${JSON.stringify(sw1)} sw2=${JSON.stringify(sw2)} sw3=${JSON.stringify(sw3)} sw4=${JSON.stringify(sw4)} arrowDrawn=${JSON.stringify(arrowDrawn)}`);
    }

    // =========================================================================
    // 4. Market shop signboards on bottom counter & behind the carried pig
    // =========================================================================
    await page.evaluate(async () => {
      window.__cuyNow = '12:00';
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'market', pinned: false }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('market');
      await window.__qaWaitImages();
    });

    const r4 = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      const st = window.bridge.currentState || window.bridge.getState();
      const cv = document.getElementById('pigCanvas');
      const ctx = cv.getContext('2d');
      const drawn = window.CuyScenes.drawMarketSignboards(ctx, st, { things: inst.things });

      const signboardsOk = Array.isArray(drawn) && drawn.length === 3 && drawn.every((d) => {
        const stall = (inst.things || []).find(t => t && (t.uid === d.uid || (t.itemId || '').includes(d.role)));
        const sh = stall ? ((Number.isFinite(stall.sh) && stall.sh > 0) ? stall.sh : (stall.h || 32)) : 40;
        const ay = stall ? (Number.isFinite(stall.anchorY) ? stall.anchorY : sh) : sh;
        const top = stall ? Math.round((stall.y || 0) - ay) : (d.sy - (sh - 18));
        return d.sy >= top + sh - 18;
      });

      // Carry the pig so its drawn body overlaps the center stall's signboard
      const centerBoard = drawn[1] || drawn[0];
      const order = [];
      const origDrawPigFor = inst.drawPigFor.bind(inst);
      const origDrawBoards = window.CuyScenes.drawMarketSignboards;

      inst.drawPigFor = function () {
        order.push('drawPigFor');
        return origDrawPigFor.apply(this, arguments);
      };
      window.CuyScenes.drawMarketSignboards = function () {
        order.push('drawMarketSignboards');
        return origDrawBoards.apply(this, arguments);
      };

      const targetX = centerBoard.sx + 7;
      const targetY = centerBoard.sy + 14;
      inst.isDragging = true;
      inst.pigX = targetX;
      inst.pigY = targetY;
      inst.pigAirY = 6;
      if (inst.pigs && inst.pigs[0]) {
        inst.pigs[0].x = targetX;
        inst.pigs[0].y = targetY;
        inst.pigs[0].airY = 6;
      }
      inst.render();
      inst.isDragging = false;

      inst.drawPigFor = origDrawPigFor;
      window.CuyScenes.drawMarketSignboards = origDrawBoards;

      const idxBoards = order.indexOf('drawMarketSignboards');
      const idxPig = order.indexOf('drawPigFor');
      return { drawn, signboardsOk, order, orderOk: idxBoards !== -1 && idxPig !== -1 && idxPig > idxBoards };
    });

    await saveShot(page, 'fix5-market-labels.png');

    if (r4.signboardsOk && r4.orderOk) {
      pass('R4-market-signboards', `3 signboards on counter front (sy=${r4.drawn.map(d => d.sy).join(',')}), order=${r4.order.join(' -> ')}`);
    } else {
      defect('R4-market-signboards', `Failed: ${JSON.stringify(r4)}`);
    }

    // =========================================================================
    // 5. Edit drawer at 420x640 replaces menu and collapses
    // =========================================================================
    await page.evaluate(async () => {
      window.CuyPlaces.openPlace('salon');
      await window.__qaWaitImages();
      if (window.CuyEdit && window.CuyEdit.isOpen()) {
        window.CuyEdit.toggle();
      }
    });
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      window.CuyEdit.toggle();
    });
    await page.waitForTimeout(150);

    const r5Open = await page.evaluate(() => {
      const bodyHas = document.body.classList.contains('cuy-edit-open');
      const grid = document.querySelector('.actions-grid');
      const gridDisplay = grid ? getComputedStyle(grid).display : null;
      const drawer = document.getElementById('editDrawer');
      const canvas = document.getElementById('pigCanvas');
      const dRect = drawer ? drawer.getBoundingClientRect() : null;
      const cRect = canvas ? canvas.getBoundingClientRect() : null;
      return {
        bodyHas,
        gridDisplay,
        drawerTop: dRect ? dRect.top : null,
        canvasBottom: cRect ? cRect.bottom : null,
        drawerHidden: drawer ? drawer.hidden : true
      };
    });
    await saveShot(page, 'fix5-edit-drawer.png');

    await page.click('#editDrawerCollapse');
    await page.waitForTimeout(150);

    const r5Collapsed = await page.evaluate(() => {
      const drawer = document.getElementById('editDrawer');
      const rect = drawer ? drawer.getBoundingClientRect() : null;
      return {
        isCollapsed: drawer ? drawer.classList.contains('is-collapsed') : false,
        height: rect ? rect.height : null,
        bodyHas: document.body.classList.contains('cuy-edit-open'),
        editIsOpen: window.CuyEdit ? window.CuyEdit.isOpen() : false
      };
    });
    await saveShot(page, 'fix5-edit-drawer-collapsed.png');

    await page.click('#editDrawerCollapse');
    await page.waitForTimeout(150);

    const r5Expanded = await page.evaluate(() => {
      const drawer = document.getElementById('editDrawer');
      const rect = drawer ? drawer.getBoundingClientRect() : null;
      return {
        isCollapsed: drawer ? drawer.classList.contains('is-collapsed') : true,
        height: rect ? rect.height : null
      };
    });

    await page.evaluate(() => {
      if (window.CuyEdit && window.CuyEdit.isOpen()) window.CuyEdit.toggle();
    });
    await page.waitForTimeout(150);

    const r5Closed = await page.evaluate(() => {
      const grid = document.querySelector('.actions-grid');
      return {
        bodyHas: document.body.classList.contains('cuy-edit-open'),
        gridDisplay: grid ? getComputedStyle(grid).display : null
      };
    });

    const r5Ok =
      r5Open.bodyHas && r5Open.gridDisplay === 'none' && !r5Open.drawerHidden &&
      r5Open.drawerTop >= r5Open.canvasBottom - 1 &&
      r5Collapsed.isCollapsed && r5Collapsed.height <= 40 && r5Collapsed.bodyHas && r5Collapsed.editIsOpen &&
      !r5Expanded.isCollapsed && r5Expanded.height > 40 &&
      !r5Closed.bodyHas && r5Closed.gridDisplay !== 'none';

    if (r5Ok) {
      pass('R5-edit-drawer', `open(top=${r5Open.drawerTop.toFixed(1)}>=cvBot=${r5Open.canvasBottom.toFixed(1)}, grid=none) -> collapsed(h=${r5Collapsed.height.toFixed(1)}<=40) -> expanded(h=${r5Expanded.height.toFixed(1)}) -> closed(grid=${r5Closed.gridDisplay})`);
    } else {
      defect('R5-edit-drawer', `Failed: open=${JSON.stringify(r5Open)} collapsed=${JSON.stringify(r5Collapsed)} expanded=${JSON.stringify(r5Expanded)} closed=${JSON.stringify(r5Closed)}`);
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\nSummary: ${defects.length} defect(s)`);
  if (defects.length > 0 && STRICT) {
    process.exitCode = 1;
  } else if (defects.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
