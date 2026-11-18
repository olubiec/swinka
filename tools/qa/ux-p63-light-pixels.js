'use strict';
const path = require('path');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const defects = [];
const skips = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push({ id, msg });
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push({ id, reason });
  console.log('SKIP ' + id + ': ' + reason);
}

async function run() {
  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  try {
    const page = await ux.openHome(browser);
    await page.setViewportSize({ width: 420, height: 640 });

    await page.waitForFunction(
      () => window.CuyPlaces && window.CuyLight && window.CanvasPig && window.CuyScenes && window.Lights,
      { timeout: 10000 }
    );

    // Helper inside page for pixel sampling and waiting for images
    await page.evaluate(() => {
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
      window.__qaWaitImages = async function () {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
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

      window.__qaSampleRect = function (rx, ry, rw, rh) {
        const c = document.getElementById('pigCanvas');
        const ctx = c.getContext('2d');
        const img = ctx.getImageData(rx, ry, rw, rh).data;
        let rSum = 0, gSum = 0, bSum = 0, lumaSum = 0;
        const n = rw * rh;
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i], g = img[i + 1], b = img[i + 2];
          rSum += r;
          gSum += g;
          bSum += b;
          lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
        }
        return {
          r: rSum / n,
          g: gSum / n,
          b: bSum / n,
          luma: lumaSum / n
        };
      };

      window.__qaSetupSeven = function () {
        const st = window.bridge.currentState || window.bridge.getState();
        const m = window.CuyScenesMock.state('seven');
        st.places = m.places;
        st.places.order.forEach(p => { p.locked = false; });
        st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
        if (!st.rooms) st.rooms = {};
        if (!st.rooms.layouts) st.rooms.layouts = {};
        Object.assign(st.rooms.layouts, m.rooms.layouts);
        window.bridge.broadcastState();
      };
    });

    // =========================================================================
    // L1: night: mean colour of the lamp rectangle (lamp_mushroom, lamp_floor, lamp_oil)
    // with the pig far and with the pig adjacent differs by at most the tolerance from R26 section 6
    // =========================================================================
    {
      const l1Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        const lamps = [
          { itemId: 'lamp_mushroom', sceneId: 'salon', x: 80, y: 95, sample: [76, 68, 8, 16] },
          { itemId: 'lamp_floor', sceneId: 'salon', x: 80, y: 95, sample: [76, 68, 8, 16] },
          { itemId: 'lamp_oil', sceneId: 'garden', x: 80, y: 95, sample: [76, 82, 8, 10] }
        ];
        const results = [];

        for (const l of lamps) {
          if (l.sceneId === 'garden' && window.CuyScenes && typeof window.CuyScenes.setBgClean === 'function') {
            window.CuyScenes.setBgClean('garden', true);
          }
          const st = window.bridge.currentState || window.bridge.getState();
          st.places.pigLocations = [{ pigId: 'pig_1', scene: l.sceneId, pinned: true }];

          // Day reference
          window.__cuyNow = 12;
          window.CuyPlaces.openPlace(l.sceneId);
          inst.setExitsEnabled(false);
          inst.setPigVisible(true);
          const offX = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.x || 0) : 0;
          const offY = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.y || 0) : 0;
          const rawX = l.x - offX;
          const rawY = l.y - offY;

          const placedList = [{
            id: 'test_' + l.itemId,
            uid: 'test_' + l.itemId,
            itemId: l.itemId,
            url: '../../assets/world/' + (l.sceneId === 'garden' ? 'garden/' : 'house/') + l.itemId + '.png',
            x: rawX,
            y: rawY,
            w: 16,
            h: l.itemId === 'lamp_oil' ? 16 : 32,
            anchorX: 8,
            anchorY: l.itemId === 'lamp_oil' ? 16 : 32,
            flat: false,
            layer: 'floor',
            isPixel: true
          }];
          inst.setThings(placedList.map(x => Object.assign({}, x)), true);
          await window.__qaWaitImages();

          inst.setLightScene(null);
          inst.pigX = 160;
          inst.pigY = 115;
          window.CanvasPig.pigX = 160;
          window.CanvasPig.pigY = 115;
          inst.render();
          const daySample = window.__qaSampleRect(...l.sample);

          // Night measurements
          window.__cuyNow = 23;
          const lightBuilt = window.CuyLight.build(l.sceneId, [{
            id: 'test_' + l.itemId,
            uid: 'test_' + l.itemId,
            itemId: l.itemId,
            x: l.x,
            y: l.y,
            anchorX: 8,
            anchorY: l.itemId === 'lamp_oil' ? 16 : 32,
            isPixel: true
          }]);
          inst.setLightScene(lightBuilt);
          await window.__qaWaitImages();

          // Positions: pig far below (160,115), far equal (160,95), far above (160,75), adjacent right-above (110, 88), adjacent right-below (110, 102)
          const positions = [
            { name: 'far_below', x: 160, y: 115 },
            { name: 'far_equal', x: 160, y: 95 },
            { name: 'far_above', x: 160, y: 75 },
            { name: 'adj_above', x: 112, y: 88 },
            { name: 'adj_below', x: 112, y: 102 }
          ];
          const samples = [];
          for (const pos of positions) {
            inst.pigX = pos.x;
            inst.pigY = pos.y;
            window.CanvasPig.pigX = pos.x;
            window.CanvasPig.pigY = pos.y;
            inst.render();
            samples.push({ pos: pos.name, s: window.__qaSampleRect(...l.sample) });
          }

          let maxDiffLuma = 0, maxDiffR = 0, maxDiffG = 0, maxDiffB = 0;
          for (let i = 0; i < samples.length; i++) {
            for (let j = i + 1; j < samples.length; j++) {
              maxDiffLuma = Math.max(maxDiffLuma, Math.abs(samples[i].s.luma - samples[j].s.luma));
              maxDiffR = Math.max(maxDiffR, Math.abs(samples[i].s.r - samples[j].s.r));
              maxDiffG = Math.max(maxDiffG, Math.abs(samples[i].s.g - samples[j].s.g));
              maxDiffB = Math.max(maxDiffB, Math.abs(samples[i].s.b - samples[j].s.b));
            }
          }

          results.push({
            itemId: l.itemId,
            dayLuma: daySample.luma,
            nightLuma: samples[0].s.luma,
            maxDiffLuma,
            maxDiffR,
            maxDiffG,
            maxDiffB,
            samples
          });
        }
        return results;
      });

      const badL1 = l1Res.filter(r =>
        r.maxDiffLuma > 2.0 || r.maxDiffR > 2.0 || r.maxDiffG > 2.0 || r.maxDiffB > 2.0 ||
        !(r.nightLuma < r.dayLuma - 15)
      );
      check('L1', badL1.length === 0,
        badL1.map(r => `${r.itemId}: maxDiff(L=${r.maxDiffLuma.toFixed(2)},R=${r.maxDiffR.toFixed(2)},G=${r.maxDiffG.toFixed(2)},B=${r.maxDiffB.toFixed(2)}), dayL=${r.dayLuma.toFixed(1)}, nightL=${r.nightLuma.toFixed(1)}`).join('; ') || 'ok'
      );
    }

    // =========================================================================
    // L2: pig crosses the lamp: sample the lamp rectangle at 20 pig x positions,
    // no sample deviates beyond tolerance
    // =========================================================================
    {
      const l2Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        window.__cuyNow = 23;
        window.CuyPlaces.openPlace('salon');
        inst.setExitsEnabled(false);
        inst.setPigVisible(true);

        const offX = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.x || 0) : 0;
        const offY = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.y || 0) : 0;
        // Place lamp_mushroom at stage (80, 95), sample top of mushroom cap (76, 66, 8, 8)
        // Pig walks across at y = 118 so pig sprite (drawn above 118 with height ~50 -> y 68..118) or pig walks behind/below without overlapping top cap, or let's place lamp at y=95 and pig crosses 20 x positions at y=88 and y=118 (sampling upper cap 76, 65, 8, 6 where pig at y=118 does not occlude, and 20 positions outside pig body when pig is at y=88).
        // Let's sample 20 pig x positions across the room [40..216] at pigY = 122 (below lamp at y=85, sample lamp cap 76, 55, 8, 12 which is y=55..67, pig top at y=122 is 122 - 45 = 77, so 0 overlap!) AND also test pigY crossing above/below lamp y=85 at x positions outside silhouette.
        const lampX = 80, lampY = 85;
        inst.setThings([{
          id: 'test_lamp_m',
          uid: 'test_lamp_m',
          itemId: 'lamp_mushroom',
          url: '../../assets/world/house/lamp_mushroom.png',
          x: lampX - offX,
          y: lampY - offY,
          w: 16,
          h: 32,
          anchorX: 8,
          anchorY: 32,
          flat: false,
          layer: 'floor',
          isPixel: true
        }], true);
        const lightBuilt = window.CuyLight.build('salon', [{
          id: 'test_lamp_m',
          uid: 'test_lamp_m',
          itemId: 'lamp_mushroom',
          x: lampX,
          y: lampY,
          anchorX: 8,
          anchorY: 32,
          isPixel: true
        }]);
        inst.setLightScene(lightBuilt);
        await window.__qaWaitImages();

        const samples = [];
        for (let i = 0; i < 20; i++) {
          const px = Math.round(40 + (i * (210 - 40)) / 19);
          // Alternate pigY above (80) and below (122) when not overlapping silhouette, or use y=122 across all x
          const py = (Math.abs(px - lampX) > 32 && i % 2 === 0) ? 78 : 122;
          inst.pigX = px;
          inst.pigY = py;
          window.CanvasPig.pigX = px;
          window.CanvasPig.pigY = py;
          inst.render();
          samples.push({ px, py, s: window.__qaSampleRect(76, 56, 8, 12) });
        }

        const ref = samples[0].s;
        let maxDev = 0;
        let worst = null;
        for (const item of samples) {
          const dev = Math.max(
            Math.abs(item.s.luma - ref.luma),
            Math.abs(item.s.r - ref.r),
            Math.abs(item.s.g - ref.g),
            Math.abs(item.s.b - ref.b)
          );
          if (dev > maxDev) {
            maxDev = dev;
            worst = item;
          }
        }
        return { maxDev, worst, ref };
      });

      check('L2', l2Res.maxDev <= 2.0,
        `max deviation across 20 pig x positions = ${l2Res.maxDev.toFixed(2)} (worst at x=${l2Res.worst && l2Res.worst.px}, y=${l2Res.worst && l2Res.worst.py})`
      );
    }

    // =========================================================================
    // L3: clicking a window never changes the light (toggle:false)
    // =========================================================================
    {
      const l3Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        window.__cuyNow = '23:00';
        const st = window.bridge.currentState || window.bridge.getState();
        st.rooms.layouts.salon = {
          cols: 12,
          rows: 7,
          wallRows: 2,
          items: [
            { uid: 'win_1', id: 'win_1', itemId: 'window_sun', x: 4, y: 0 }
          ]
        };
        st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: true }];
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace('salon');
        await window.__qaWaitImages();

        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setExitsEnabled(false);
        inst.pigX = 180;
        inst.pigY = 115;
        window.CanvasPig.pigX = 180;
        window.CanvasPig.pigY = 115;
        inst.render();

        const winThing = (inst.things || []).find(t => t.itemId === 'window_sun' || t.id === 'win_1');
        const wx = winThing ? Math.round(winThing.x) : 112;
        const wy = winThing ? Math.round(winThing.y - 16) : 32;
        const rect = [Math.max(0, wx - 8), Math.max(0, wy - 8), 16, 16];

        const before = window.__qaSampleRect(...rect);
        const srcBefore = (inst.lightScene && inst.lightScene.sources || []).find(s => s.itemId === 'window' || s.id === 'win_1');

        // 1. Try toggleLamp and setLampToggle directly
        window.CuyPlaces.toggleLamp('win_1');
        window.CuyPlaces.toggleLamp('window');
        window.CuyPlaces.toggleLamp('window_sun');
        window.CuyPlaces.setLampToggle('win_1', false);
        window.CuyPlaces.setLampToggle('window', false);
        window.CuyPlaces.setLampToggle('window_sun', false);
        inst.pigX = 180;
        inst.pigY = 115;
        window.CanvasPig.pigX = 180;
        window.CanvasPig.pigY = 115;
        inst.render();
        const afterApi = window.__qaSampleRect(...rect);
        const srcAfterApi = (inst.lightScene && inst.lightScene.sources || []).find(s => s.itemId === 'window' || s.id === 'win_1');

        // 2. Also test Lights.activeSources with manual override on toggle:false
        const directBuilt = window.CuyLight.build('salon', null, { win_1: false, window: false, window_sun: false });
        const directSrc = (directBuilt && directBuilt.sources || []).find(s => s.itemId === 'window' || s.id === 'win_1');

        const clientPt = window.CanvasPig.toClient(wx, wy);
        return {
          wx, wy, rect,
          before,
          afterApi,
          srcBeforeOn: srcBefore ? srcBefore.on : null,
          srcBeforeToggle: srcBefore ? srcBefore.toggle : null,
          srcAfterApiOn: srcAfterApi ? srcAfterApi.on : null,
          directSrcOn: directSrc ? directSrc.on : null,
          clientPt
        };
      });

      // Click on the window on canvas
      await page.mouse.click(l3Res.clientPt.clientX, l3Res.clientPt.clientY);
      const afterClick = await page.evaluate((rect) => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.pigX = 180;
        inst.pigY = 115;
        window.CanvasPig.pigX = 180;
        window.CanvasPig.pigY = 115;
        inst.render();
        const s = window.__qaSampleRect(...rect);
        const src = (inst.lightScene && inst.lightScene.sources || []).find(x => x.itemId === 'window' || x.id === 'win_1');
        return { s, on: src ? src.on : null };
      }, l3Res.rect);

      const diffApi = Math.abs(l3Res.before.luma - l3Res.afterApi.luma);
      const diffClick = Math.abs(l3Res.before.luma - afterClick.s.luma);
      check('L3',
        l3Res.srcBeforeToggle === false &&
        l3Res.srcBeforeOn === true &&
        l3Res.srcAfterApiOn === true &&
        l3Res.directSrcOn === true &&
        afterClick.on === true &&
        diffApi <= 1.0 &&
        diffClick <= 1.0,
        `toggle=${l3Res.srcBeforeToggle}, on(before=${l3Res.srcBeforeOn}, api=${l3Res.srcAfterApiOn}, direct=${l3Res.directSrcOn}, click=${afterClick.on}), diffApi=${diffApi.toFixed(2)}, diffClick=${diffClick.toFixed(2)}`
      );
    }

    // =========================================================================
    // L4: clicking a lamp toggles its glow on and off, state survives a scene switch
    // =========================================================================
    {
      const l4Setup = await page.evaluate(async () => {
        window.__qaSetupSeven();
        window.__cuyNow = '23:00';
        const st = window.bridge.currentState || window.bridge.getState();
        st.rooms.layouts.salon = {
          cols: 12,
          rows: 7,
          wallRows: 2,
          items: [
            { uid: 'lamp_l4', id: 'lamp_l4', itemId: 'lamp_floor', x: 5, y: 3 }
          ]
        };
        st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: true }];
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace('salon');
        await window.__qaWaitImages();

        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setExitsEnabled(false);
        inst.setPigVisible(false);
        inst.render();

        const hsList = window.CanvasPig.getHotspots();
        const lampHs = hsList.find(h => h.id === 'lamp_l4' || h.uid === 'lamp_l4' || h.kind === 'lamp');
        const src = (inst.lightScene && inst.lightScene.sources || []).find(s => s.id === 'lamp_l4' || s.uid === 'lamp_l4');
        const gx = src ? Math.round(src.x) : 120;
        const gy = src ? Math.round(src.y) : 74;
        const sampleRect = [Math.max(0, gx - 10), Math.max(0, gy - 10), 20, 20];
        const lumaOn = window.__qaSampleRect(...sampleRect).luma;

        // Compute click coordinates inside lamp hotspot
        const cx = lampHs ? Math.round((lampHs.rect[0] + lampHs.rect[2]) / 2) : gx;
        const cy = lampHs ? Math.round((lampHs.rect[1] + lampHs.rect[3]) / 2) : gy;
        const clientPt = window.CanvasPig.toClient(cx, cy);

        return {
          hasHotspot: !!lampHs,
          initialOn: src ? src.on : null,
          lumaOn,
          sampleRect,
          clientPt
        };
      });

      // Click 1: toggle OFF
      await page.mouse.click(l4Setup.clientPt.clientX, l4Setup.clientPt.clientY);
      const afterOff = await page.evaluate(async (sampleRect) => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setPigVisible(false);
        inst.render();
        const src = (inst.lightScene && inst.lightScene.sources || []).find(s => s.id === 'lamp_l4' || s.uid === 'lamp_l4');
        const lumaOff = window.__qaSampleRect(...sampleRect).luma;

        // Switch scene to garden and back to salon
        window.CuyPlaces.openPlace('garden');
        await window.__qaWaitImages();
        window.CuyPlaces.openPlace('salon');
        await window.__qaWaitImages();
        inst.setExitsEnabled(false);
        inst.setPigVisible(false);
        inst.render();

        const srcAfterSwitch = (inst.lightScene && inst.lightScene.sources || []).find(s => s.id === 'lamp_l4' || s.uid === 'lamp_l4');
        const lumaAfterSwitch = window.__qaSampleRect(...sampleRect).luma;
        return {
          onAfterClick1: src ? src.on : null,
          lumaOff,
          onAfterSwitch: srcAfterSwitch ? srcAfterSwitch.on : null,
          lumaAfterSwitch
        };
      }, l4Setup.sampleRect);

      // Click 2: toggle back ON
      await page.mouse.click(l4Setup.clientPt.clientX, l4Setup.clientPt.clientY);
      const afterOnAgain = await page.evaluate(async (sampleRect) => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setPigVisible(false);
        inst.render();
        const src = (inst.lightScene && inst.lightScene.sources || []).find(s => s.id === 'lamp_l4' || s.uid === 'lamp_l4');
        const lumaOn2 = window.__qaSampleRect(...sampleRect).luma;

        // Switch scene and back while ON
        window.CuyPlaces.openPlace('garden');
        await window.__qaWaitImages();
        window.CuyPlaces.openPlace('salon');
        await window.__qaWaitImages();
        inst.setPigVisible(false);
        inst.render();
        const srcAfterSwitch2 = (inst.lightScene && inst.lightScene.sources || []).find(s => s.id === 'lamp_l4' || s.uid === 'lamp_l4');

        return {
          onAfterClick2: src ? src.on : null,
          lumaOn2,
          onAfterSwitch2: srcAfterSwitch2 ? srcAfterSwitch2.on : null
        };
      }, l4Setup.sampleRect);

      check('L4',
        l4Setup.hasHotspot &&
        l4Setup.initialOn === true &&
        afterOff.onAfterClick1 === false &&
        afterOff.onAfterSwitch === false &&
        afterOff.lumaOff < l4Setup.lumaOn - 5 &&
        Math.abs(afterOff.lumaAfterSwitch - afterOff.lumaOff) <= 2.0 &&
        afterOnAgain.onAfterClick2 === true &&
        afterOnAgain.onAfterSwitch2 === true &&
        afterOnAgain.lumaOn2 > afterOff.lumaOff + 5,
        `hotspot=${l4Setup.hasHotspot}, initOn=${l4Setup.initialOn}, click1On=${afterOff.onAfterClick1}, switchOff=${afterOff.onAfterSwitch}, click2On=${afterOnAgain.onAfterClick2}, switchOn=${afterOnAgain.onAfterSwitch2}, luma(on=${l4Setup.lumaOn.toFixed(1)}, off=${afterOff.lumaOff.toFixed(1)}, on2=${afterOnAgain.lumaOn2.toFixed(1)})`
      );
    }

    // =========================================================================
    // L5: phantom light: with no lamps and windows the luminance around (120,65)
    // equals neighbours within tolerance
    // =========================================================================
    {
      const l5Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        window.__cuyNow = '23:00';
        const st = window.bridge.currentState || window.bridge.getState();
        // Empty layout AND a corrupted layout item with missing x/y to attack the (120,65) fallback!
        st.rooms.layouts.salon = {
          cols: 12,
          rows: 7,
          wallRows: 2,
          wallpaper: 'wallpaper_cream',
          floor: 'floor_wood_light',
          items: [
            { uid: 'corrupt_lamp_no_coords', itemId: 'lamp_mushroom' },
            { uid: 'corrupt_lamp_null_coords', itemId: 'lamp_floor', x: null, y: null }
          ]
        };
        st.places.pigLocations = [];
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace('salon');
        await window.__qaWaitImages();

        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setPigVisible(false);
        const builtWithCorrupt = window.CuyLight.build('salon', [
          { uid: 'corrupt_1', itemId: 'lamp_mushroom' },
          { uid: 'corrupt_2', itemId: 'lamp_floor', x: null, y: null }
        ]);
        inst.setLightScene(builtWithCorrupt);
        inst.render();

        // Sample (112, 57, 16, 16) centered at (120, 65) and horizontal neighbours at same y band (72, 57, 16, 16) and (152, 57, 16, 16)
        const center = window.__qaSampleRect(112, 57, 16, 16);
        const left = window.__qaSampleRect(72, 57, 16, 16);
        const right = window.__qaSampleRect(152, 57, 16, 16);

        // Also compare with completely empty items
        const builtEmpty = window.CuyLight.build('salon', []);
        inst.setLightScene(builtEmpty);
        inst.render();
        const emptyCenter = window.__qaSampleRect(112, 57, 16, 16);

        return {
          sourcesCount: (builtWithCorrupt && builtWithCorrupt.sources) ? builtWithCorrupt.sources.length : -1,
          centerLuma: center.luma,
          leftLuma: left.luma,
          rightLuma: right.luma,
          emptyCenterLuma: emptyCenter.luma,
          diffLeft: Math.abs(center.luma - left.luma),
          diffRight: Math.abs(center.luma - right.luma),
          diffEmpty: Math.abs(center.luma - emptyCenter.luma)
        };
      });

      check('L5',
        l5Res.sourcesCount === 0 &&
        l5Res.diffLeft <= 2.0 &&
        l5Res.diffRight <= 2.0 &&
        l5Res.diffEmpty <= 2.0,
        `sources=${l5Res.sourcesCount}, center=${l5Res.centerLuma.toFixed(2)}, left=${l5Res.leftLuma.toFixed(2)}, right=${l5Res.rightLuma.toFixed(2)}, diffLeft=${l5Res.diffLeft.toFixed(2)}, diffRight=${l5Res.diffRight.toFixed(2)}, diffEmpty=${l5Res.diffEmpty.toFixed(2)}`
      );
    }

    // =========================================================================
    // L6: day: pixels just below the footprint of standing furniture are darker
    // than the floor by the R26 minimum; none under flat or wall items
    // =========================================================================
    {
      const l6Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        window.__cuyNow = 12;
        const st = window.bridge.currentState || window.bridge.getState();
        st.rooms.layouts.salon = {
          cols: 12,
          rows: 7,
          wallRows: 2,
          wallpaper: 'wallpaper_cream',
          floor: 'floor_wood_light',
          items: []
        };
        st.places.pigLocations = [];
        window.bridge.broadcastState();
        window.CuyPlaces.openPlace('salon');
        await window.__qaWaitImages();

        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setPigVisible(false);

        const offX = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.x || 0) : 0;
        const offY = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.y || 0) : 0;

        // First render empty floor and sample reference at (116, 94, 8, 3) and neighbour (140, 94, 8, 3)
        inst.setThings([], true);
        inst.render();
        const emptyAt120 = window.__qaSampleRect(116, 94, 8, 3);
        const emptyAt140 = window.__qaSampleRect(140, 94, 8, 3);

        // 1. Standing floor furniture at stage (120, 95). Use anchorY=34 so sprite draws 2px higher and leaves shadow (116, 94, 8, 3) exposed, AND also test via st.rooms.layouts with placedThings!
        // Wait: let's also check what placedThings produces from scenes.js!
        st.rooms.layouts.salon.items = [
          { uid: 'floor_item', itemId: 'side_table', x: 5, y: 4, isPixel: false }
        ];
        const fromScenes = window.CuyScenes.placedThings(st, 'salon');
        const hasLayerFromScenes = fromScenes.length > 0 ? fromScenes[0].layer : null;

        // Test standing floor item at (120, 95) with transparent bottom or shifted anchorY=18 so we read pure shadow vs floor
        inst.setThings([{
          id: 'stand_1',
          uid: 'stand_1',
          itemId: 'side_table',
          url: '../../assets/world/house/side_table.png',
          x: 120 - offX,
          y: 95 - offY,
          w: 16,
          h: 16,
          anchorX: 8,
          anchorY: 20,
          flat: false,
          layer: 'floor',
          isPixel: true
        }], true);
        await window.__qaWaitImages();
        inst.render();
        const standSample = window.__qaSampleRect(116, 94, 8, 3);
        const standNeighbour = window.__qaSampleRect(140, 94, 8, 3);
        const standDropVsEmpty = emptyAt120.luma - standSample.luma;
        const standDropVsNeighbour = standNeighbour.luma - standSample.luma;

        // 2. Flat item (rug_round_pink, flat: true) at (120, 95) with anchorY=20 (so sprite is above y=94, testing whether a shadow is drawn at y=94)
        inst.setThings([{
          id: 'flat_1',
          uid: 'flat_1',
          itemId: 'rug_round_pink',
          url: '../../assets/world/house/rug_round_pink.png',
          x: 120 - offX,
          y: 95 - offY,
          w: 32,
          h: 16,
          anchorX: 16,
          anchorY: 20,
          flat: true,
          layer: 'floor',
          isPixel: true
        }], true);
        await window.__qaWaitImages();
        inst.render();
        const flatSample = window.__qaSampleRect(116, 94, 8, 3);
        const flatDiff = Math.abs(emptyAt120.luma - flatSample.luma);

        // 3. Wall item (window_sun, layer: 'wall') via placedThings from scenes.js!
        // Notice: R26 section 4.1 requires `scenes.js:placedThings` to pass `layer: (entry && entry.layer) || it.layer || 'floor'`.
        // Let's test both: direct thing with layer: 'wall' AND thing built by CuyScenes.placedThings for a wall item (`window_sun` or `wall_clock`)!
        st.rooms.layouts.salon.items = [
          { uid: 'wall_from_scenes', itemId: 'wall_clock', x: 120 - offX, y: 95 - offY, isPixel: true, layer: 'wall' }
        ];
        const wallThingsFromScenes = window.CuyScenes.placedThings(st, 'salon');
        if (wallThingsFromScenes.length > 0) {
          wallThingsFromScenes[0].anchorY = 20; // shift sprite up by 4px so y=94..96 is below the sprite
        }
        inst.setThings(wallThingsFromScenes, true);
        await window.__qaWaitImages();
        inst.render();
        const wallScenesSample = window.__qaSampleRect(116, 94, 8, 3);
        const wallScenesDiff = Math.abs(emptyAt120.luma - wallScenesSample.luma);

        // Also direct wall item with layer: 'wall'
        inst.setThings([{
          id: 'wall_direct',
          uid: 'wall_direct',
          itemId: 'window_sun',
          url: '../../assets/world/house/window_sun.png',
          x: 120 - offX,
          y: 95 - offY,
          w: 32,
          h: 32,
          anchorX: 16,
          anchorY: 36,
          flat: false,
          layer: 'wall',
          isPixel: true
        }], true);
        await window.__qaWaitImages();
        inst.render();
        const wallDirectSample = window.__qaSampleRect(116, 94, 8, 3);
        const wallDirectDiff = Math.abs(emptyAt120.luma - wallDirectSample.luma);

        return {
          emptyLuma: emptyAt120.luma,
          neighbourLuma: emptyAt140.luma,
          standLuma: standSample.luma,
          standDropVsEmpty,
          standDropVsNeighbour,
          flatDiff,
          wallDirectDiff,
          wallScenesDiff,
          wallThingLayerInPlacedThings: wallThingsFromScenes[0] ? wallThingsFromScenes[0].layer : null,
          hasLayerFromScenes
        };
      });

      check('L6',
        l6Res.standDropVsEmpty >= 8.0 &&
        l6Res.standDropVsNeighbour >= 8.0 &&
        l6Res.flatDiff <= 1.0 &&
        l6Res.wallDirectDiff <= 1.0 &&
        l6Res.wallScenesDiff <= 1.0,
        `standDrop(vsEmpty=${l6Res.standDropVsEmpty.toFixed(2)}, vsNeighbour=${l6Res.standDropVsNeighbour.toFixed(2)}), flatDiff=${l6Res.flatDiff.toFixed(2)}, wallDirectDiff=${l6Res.wallDirectDiff.toFixed(2)}, wallScenesDiff=${l6Res.wallScenesDiff.toFixed(2)} (placedThings.layer=${l6Res.wallThingLayerInPlacedThings})`
      );
    }

    // =========================================================================
    // L7: shadow width scales with item width (1x1 vs 2x2 item)
    // =========================================================================
    {
      const l7Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        window.__cuyNow = 12;
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        window.CuyPlaces.openPlace('salon');
        inst.setPigVisible(false);
        const offX = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.x || 0) : 0;
        const offY = (inst.sceneKind === 'room' && inst.roomOffset) ? (inst.roomOffset.y || 0) : 0;

        // Baseline empty floor row at y=94, x=90..150
        inst.setThings([], true);
        inst.render();
        const c = document.getElementById('pigCanvas');
        const ctx = c.getContext('2d');
        const baseRow = ctx.getImageData(90, 94, 60, 1).data;

        function measureShadowWidth(itemId, w, h, file) {
          inst.setThings([{
            id: 'test_w',
            uid: 'test_w',
            itemId,
            url: '../../assets/world/house/' + file,
            x: 120 - offX,
            y: 95 - offY,
            w,
            h,
            anchorX: Math.round(w / 2),
            anchorY: h + 4, // keep sprite above y=94 so full shadow width at y=94 is unobstructed
            flat: false,
            layer: 'floor',
            isPixel: true
          }], true);
          inst.render();
          const row = ctx.getImageData(90, 94, 60, 1).data;
          let count = 0;
          let minX = 999, maxX = -1;
          for (let x = 0; x < 60; x++) {
            const i = x * 4;
            const baseL = 0.299 * baseRow[i] + 0.587 * baseRow[i + 1] + 0.114 * baseRow[i + 2];
            const curL = 0.299 * row[i] + 0.587 * row[i + 1] + 0.114 * row[i + 2];
            if (baseL - curL >= 5.0) {
              count++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
          return { count, span: maxX >= minX ? (maxX - minX + 1) : 0 };
        }

        await window.__qaWaitImages();
        const w1x1 = measureShadowWidth('side_table', 16, 16, 'side_table.png');
        const w2x2 = measureShadowWidth('armchair', 32, 32, 'armchair.png');
        return { w1x1, w2x2 };
      });

      check('L7',
        l7Res.w1x1.span >= 8 &&
        l7Res.w2x2.span >= l7Res.w1x1.span * 1.5,
        `1x1 span=${l7Res.w1x1.span}px (count=${l7Res.w1x1.count}), 2x2 span=${l7Res.w2x2.span}px (count=${l7Res.w2x2.count})`
      );
    }

    // =========================================================================
    // L8: four times of day x all scenes: the pig sprite never renders black or NaN
    // (no pixel block fully (0,0,0))
    // =========================================================================
    {
      const l8Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
        const tods = ['08:00', '12:00', '18:30', '23:00'];
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        const failures = [];

        for (const sId of scenes) {
          for (const tod of tods) {
            window.__cuyNow = tod;
            const st = window.bridge.currentState || window.bridge.getState();
            st.places.pigLocations = [{ pigId: 'pig_1', scene: sId, pinned: true }];
            window.CuyPlaces.openPlace(sId);
            await window.__qaWaitImages();

            inst.setExitsEnabled(false);
            inst.setPigVisible(true);
            inst.pigX = 128;
            inst.pigY = 112;
            window.CanvasPig.pigX = 128;
            window.CanvasPig.pigY = 112;
            inst.render();

            const dbg = window.CanvasPig.debug();
            if (!dbg || !dbg.pig || Number.isNaN(dbg.pig.x) || Number.isNaN(dbg.pig.y) || Number.isNaN(dbg.pig.scale)) {
              failures.push(`${sId}@${tod}: NaN in debug().pig`);
              continue;
            }

            // Check litFrame directly and also canvas region around pig
            const sheet = inst.usableSheet();
            const litC = sheet ? inst.litFrame(sheet, 0, 0, inst.lightScene || { ambient: { color: [1, 1, 1], level: 1 }, sources: [] }) : null;
            if (!litC) {
              failures.push(`${sId}@${tod}: litFrame returned null`);
              continue;
            }
            const lctx = litC.getContext('2d');
            const ldata = lctx.getImageData(0, 0, litC.width, litC.height).data;
            let opaqueCount = 0;
            let blackOpaqueCount = 0;
            for (let i = 0; i < ldata.length; i += 4) {
              if (ldata[i + 3] > 0) {
                opaqueCount++;
                if (ldata[i] === 0 && ldata[i + 1] === 0 && ldata[i + 2] === 0) {
                  blackOpaqueCount++;
                }
              }
            }
            if (opaqueCount === 0 || blackOpaqueCount > 0) {
              failures.push(`${sId}@${tod}: opaque=${opaqueCount}, blackOpaque=${blackOpaqueCount}`);
            }

            // Also check 16x12 block on main canvas over pig body center (pigX - 8, pigY - 18, 16, 12)
            const bodySample = window.__qaSampleRect(Math.round(inst.pigX - 8), Math.round(inst.pigY - 18), 16, 12);
            if (!Number.isFinite(bodySample.luma) || bodySample.luma < 10) {
              failures.push(`${sId}@${tod}: canvas body luma=${bodySample.luma}`);
            }
          }
        }
        return failures;
      });

      check('L8', l8Res.length === 0, l8Res.join('; ') || 'ok');
    }

    // =========================================================================
    // L9: outdoor dusk: torch, lantern, oil lamp, campfire lit without clicking;
    // indoor lamps not auto-lit
    // =========================================================================
    {
      const l9Res = await page.evaluate(() => {
        window.__qaSetupSeven();
        // Wait: check both dusk/evening ('18:30') and daytime/morning for indoor vs outdoor autoOn behavior!
        // Let's inspect what CuyLight.build produces at evening ('18:30') and morning ('08:00') / day ('12:00').
        window.__cuyNow = '18:30'; // dusk / evening
        const outdoorPlaced = [
          { uid: 'o_torch', id: 'o_torch', itemId: 'torch', x: 2, y: 5 },
          { uid: 'o_lantern', id: 'o_lantern', itemId: 'lantern_garden', x: 4, y: 5 },
          { uid: 'o_oil', id: 'o_oil', itemId: 'lamp_oil', x: 6, y: 5 },
          { uid: 'o_camp', id: 'o_camp', itemId: 'campfire', x: 8, y: 5 }
        ];
        const outLight = window.CuyLight.build('garden', outdoorPlaced, {});
        const outSources = (outLight && outLight.sources) || [];

        const indoorPlaced = [
          { uid: 'i_mush', id: 'i_mush', itemId: 'lamp_mushroom', x: 2, y: 4 },
          { uid: 'i_floor', id: 'i_floor', itemId: 'lamp_floor', x: 4, y: 4 },
          { uid: 'i_salt', id: 'i_salt', itemId: 'lamp_salt', x: 6, y: 4 },
          { uid: 'i_arc', id: 'i_arc', itemId: 'lamp_arc', x: 8, y: 2 }
        ];
        const inLightEvening = window.CuyLight.build('salon', indoorPlaced, {});
        const inSourcesEvening = (inLightEvening && inLightEvening.sources) || [];

        return {
          outPeriod: outLight ? outLight.period : null,
          outStates: outSources.map(s => ({ id: s.id, itemId: s.itemId, on: s.on })),
          inStatesEvening: inSourcesEvening.map(s => ({ id: s.id, itemId: s.itemId, on: s.on }))
        };
      });

      const allOutdoorLit = l9Res.outStates.length === 4 && l9Res.outStates.every(s => s.on === true);
      const anyIndoorAutoLitAtDusk = l9Res.inStatesEvening.some(s => s.on === true);

      check('L9',
        allOutdoorLit && !anyIndoorAutoLitAtDusk,
        `outdoor@dusk=${JSON.stringify(l9Res.outStates)}, indoor@dusk=${JSON.stringify(l9Res.inStatesEvening)}`
      );
    }

    // =========================================================================
    // L10: animated strip advances (frame index changes within 1 s)
    // and never draws the whole strip side by side
    // =========================================================================
    {
      const l10Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        window.__cuyNow = '23:00';
        if (window.CuyScenes && typeof window.CuyScenes.setBgClean === 'function') {
          window.CuyScenes.setBgClean('garden', true);
        }
        window.CuyPlaces.openPlace('garden');
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setPigVisible(false);

        // Place torch (16x32 single frame, torch_on.png is 64x32 = 4 frames @ 8 fps) and campfire (campfire_flame.png is 6 frames @ 8 fps)
        const things = [
          {
            id: 'anim_torch',
            uid: 'anim_torch',
            itemId: 'torch',
            url: '../../assets/world/garden/torch.png',
            x: 80,
            y: 96,
            w: 16,
            h: 32,
            anchorX: 8,
            anchorY: 32,
            flat: false,
            layer: 'floor',
            isPixel: true
          },
          {
            id: 'anim_camp',
            uid: 'anim_camp',
            itemId: 'campfire',
            url: '../../assets/world/garden/campfire_base.png',
            x: 160,
            y: 96,
            w: 32,
            h: 24,
            anchorX: 16,
            anchorY: 24,
            flat: false,
            layer: 'floor',
            isPixel: true
          }
        ];
        inst.setThings(things, true);
        const lightScene = window.CuyLight.build('garden', things, {});
        inst.setLightScene(lightScene);

        // Preload on_file images as well
        for (const s of (lightScene && lightScene.sources || [])) {
          if (s.on_file) inst.loadCachedImage(inst.getAssetUrl('world/' + s.on_file));
        }
        await window.__qaWaitImages();
        inst.render();
        await window.__qaWaitImages();

        // Intercept ctx.drawImage during render at t=0, t=150ms, t=300ms, t=450ms
        const c = document.getElementById('pigCanvas');
        const ctx = c.getContext('2d');
        const origDrawImage = ctx.drawImage;
        const callsByStep = [];

        const origPerfNow = performance.now.bind(performance);
        const baseNow = origPerfNow();

        for (let step = 0; step < 6; step++) {
          const fakeNow = baseNow + step * 160; // 0..800ms (within 1s)
          performance.now = () => fakeNow;
          const stepCalls = [];
          ctx.drawImage = function (img, ...args) {
            const src = (img && img.src) || '';
            if (src.includes('torch_on') || src.includes('campfire_flame')) {
              stepCalls.push({
                src: src.split('/').pop(),
                naturalW: img.naturalWidth,
                args: args.slice()
              });
            }
            return origDrawImage.apply(this, [img, ...args]);
          };
          inst.render();
          ctx.drawImage = origDrawImage;
          callsByStep.push(stepCalls);
        }
        performance.now = origPerfNow;

        // Analyze torch_on and campfire_flame drawImage calls:
        // 9-arg drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) -> args = [sx, sy, sw, sh, dx, dy, dw, dh]
        const torchSxSet = new Set();
        const campSxSet = new Set();
        let wholeStripDrawn = false;

        for (const stepCalls of callsByStep) {
          for (const call of stepCalls) {
            if (call.args.length < 8) {
              // 3-arg or 5-arg drawImage draws the whole strip!
              wholeStripDrawn = true;
            } else {
              const sx = call.args[0];
              const sw = call.args[2];
              const dw = call.args[6];
              if (sw >= call.naturalW || dw >= call.naturalW) {
                wholeStripDrawn = true;
              }
              if (call.src.includes('torch_on')) torchSxSet.add(sx);
              if (call.src.includes('campfire_flame')) campSxSet.add(sx);
            }
          }
        }

        return {
          torchFramesSeen: Array.from(torchSxSet),
          campFramesSeen: Array.from(campSxSet),
          wholeStripDrawn
        };
      });

      check('L10',
        !l10Res.wholeStripDrawn &&
        l10Res.torchFramesSeen.length >= 2 &&
        l10Res.campFramesSeen.length >= 2,
        `wholeStripDrawn=${l10Res.wholeStripDrawn}, torchSx=${JSON.stringify(l10Res.torchFramesSeen)}, campSx=${JSON.stringify(l10Res.campFramesSeen)}`
      );
    }

    // =========================================================================
    // L11: frame time with 4 light sources within 1.5x of no lights
    // =========================================================================
    {
      const l11Res = await page.evaluate(async () => {
        window.__qaSetupSeven();
        window.__cuyNow = '23:00';
        window.CuyPlaces.openPlace('salon');
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
        inst.setExitsEnabled(false);
        inst.setPigVisible(true);
        inst.pigX = 128;
        inst.pigY = 110;

        const fourLamps = [
          { id: 'l1', uid: 'l1', itemId: 'lamp_mushroom', url: '../../assets/world/house/lamp_mushroom.png', x: 32, y: 80, w: 16, h: 32, anchorX: 8, anchorY: 32, flat: false, layer: 'floor', isPixel: true },
          { id: 'l2', uid: 'l2', itemId: 'lamp_floor', url: '../../assets/world/house/lamp_floor.png', x: 80, y: 80, w: 16, h: 32, anchorX: 8, anchorY: 32, flat: false, layer: 'floor', isPixel: true },
          { id: 'l3', uid: 'l3', itemId: 'lamp_salt', url: '../../assets/world/house/lamp_salt.png', x: 144, y: 80, w: 16, h: 16, anchorX: 8, anchorY: 16, flat: false, layer: 'floor', isPixel: true },
          { id: 'l4', uid: 'l4', itemId: 'fireplace', url: '../../assets/world/house/fireplace.png', x: 192, y: 80, w: 48, h: 48, anchorX: 24, anchorY: 48, flat: false, layer: 'floor', isPixel: true }
        ];
        inst.setThings(fourLamps, true);
        const litScene4 = window.CuyLight.build('salon', fourLamps, {});
        const litScene0 = { ambient: { color: [1, 1, 1], level: 1 }, sources: [], dust: null, period: 'day', kind: 'indoor' };
        await window.__qaWaitImages();

        // Warm-up both paths
        inst.setLightScene(litScene0);
        for (let i = 0; i < 30; i++) inst.render();
        inst.setLightScene(litScene4);
        for (let i = 0; i < 30; i++) inst.render();

        // Interleaved benchmark rounds to eliminate JIT/OS scheduling noise
        const N = 80;
        const times0 = [];
        const times4 = [];
        for (let r = 0; r < 5; r++) {
          inst.lightScene = litScene0;
          const t0 = performance.now();
          for (let i = 0; i < N; i++) inst.render();
          times0.push((performance.now() - t0) / N);

          inst.lightScene = litScene4;
          const t1 = performance.now();
          for (let i = 0; i < N; i++) inst.render();
          times4.push((performance.now() - t1) / N);
        }
        times0.sort((a, b) => a - b);
        times4.sort((a, b) => a - b);
        const med0 = times0[Math.floor(times0.length / 2)];
        const med4 = times4[Math.floor(times4.length / 2)];
        // Add 0.05ms floor to denominator so sub-0.1ms canvas ops don't divide by near-zero
        const ratio = med4 / Math.max(0.05, med0);
        return { med0, med4, ratio, sourcesCount: litScene4.sources.filter(s => s.on).length };
      });

      check('L11',
        l11Res.sourcesCount === 4 && l11Res.ratio <= 1.5,
        `4-sources median=${l11Res.med4.toFixed(3)}ms vs 0-sources median=${l11Res.med0.toFixed(3)}ms (ratio=${l11Res.ratio.toFixed(2)}x)`
      );
    }

    // =========================================================================
    // L12: no console errors
    // =========================================================================
    {
      const errs = page.__errors || [];
      check('L12', errs.length === 0, errs.join('; ') || 'ok');
    }

  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
