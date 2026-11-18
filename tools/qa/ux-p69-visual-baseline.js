'use strict';
const path = require('path');
const fs = require('fs');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');
const { renderOverlay } = require('./scene-overlay.js');

const ROOT = path.resolve(__dirname, '../..');
const SHOTS_DIR = path.join(ROOT, 'docs/qa/shots');
const BASELINE_DIR = path.join(SHOTS_DIR, 'baseline');
const CONTACT_SHEET_PATH = path.join(SHOTS_DIR, 'contact-sheet.png');
const PALETTE_PATH = path.join(ROOT, 'assets/data/style_palette.json');
const ATLAS_PATH = path.join(ROOT, 'assets/world/atlas.json');
const LIGHTS_PATH = path.join(ROOT, 'assets/data/lights.json');

const SCENES = ['salon', 'pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];
const SCENE_MAP = {
  salon: 'salon',
  pig_1: 'pig:pig_1',
  dorm: 'dorm',
  garden: 'garden',
  park: 'park',
  farm: 'farm',
  market: 'market'
};
const TODS = ['morning', 'day', 'evening', 'night'];
const TOD_HOURS = {
  morning: '08:00',
  day: '12:00',
  evening: '18:00',
  night: '23:00'
};

const defects = [];
const skips = [];
const defectDetails = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push(id);
    defectDetails.push({ id, msg });
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push(id);
  console.log('SKIP ' + id + ': ' + reason);
}

function loadStylePaletteHexSet() {
  const data = JSON.parse(fs.readFileSync(PALETTE_PATH, 'utf8'));
  const set = new Set();
  if (data.outline) {
    Object.values(data.outline).forEach(c => set.add(String(c).toLowerCase()));
  }
  if (data.ramps) {
    Object.values(data.ramps).forEach(arr => {
      if (Array.isArray(arr)) arr.forEach(c => set.add(String(c).toLowerCase()));
    });
  }
  if (data.roles) {
    if (Array.isArray(data.roles.glow)) data.roles.glow.forEach(c => set.add(String(c).toLowerCase()));
    if (data.roles.sky) {
      Object.values(data.roles.sky).forEach(arr => {
        if (Array.isArray(arr)) arr.forEach(c => set.add(String(c).toLowerCase()));
      });
    }
  }
  return { set, data };
}

function readPngIhdr(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return null;
  const sig = buf.slice(0, 8);
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (Buffer.compare(sig, pngSig) !== 0) return null;
  const chunkType = buf.slice(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function launchBrowser() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  return browser;
}

async function main() {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const { set: paletteHexSet, data: paletteData } = loadStylePaletteHexSet();
  const atlasData = JSON.parse(fs.readFileSync(ATLAS_PATH, 'utf8'));
  const lightsData = JSON.parse(fs.readFileSync(LIGHTS_PATH, 'utf8'));

  // Capture any pre-existing baselines before writing
  const preExistingBaselines = {};
  for (const sc of SCENES) {
    for (const tod of TODS) {
      const key = `${sc}-${tod}`;
      const fp = path.join(BASELINE_DIR, `${key}.png`);
      if (fs.existsSync(fp)) {
        preExistingBaselines[key] = fs.readFileSync(fp);
      }
    }
  }

  const server = await ux.startServer();
  const browser = await launchBrowser();

  try {
    const page = await ux.openHome(browser);
    await page.setViewportSize({ width: 420, height: 640 });

    // Set up deterministic base state (all 7 scenes unlocked, deterministic time & RNG)
    await page.evaluate(async () => {
      if (window.bridge && window.bridge.mockTimer) {
        clearInterval(window.bridge.mockTimer);
        window.bridge.mockTimer = null;
      }
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
      window.__cuyNow = '12:00';
      Date.now = () => 1700000000000;
      if (typeof performance !== 'undefined') {
        performance.now = () => 10000;
      }
      let seed = 123456789;
      Math.random = () => {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      if (window.CuyScenes && typeof window.CuyScenes.load === 'function') {
        await window.CuyScenes.load();
      }
      if (window.CuyScenes && typeof window.CuyScenes.loadAtlas === 'function') {
        await window.CuyScenes.loadAtlas();
      }
      if (window.CuyScenes && typeof window.CuyScenes.loadTiles === 'function') {
        await window.CuyScenes.loadTiles();
      }
      if (window.CuyScenes && typeof window.CuyScenes.loadHotspots === 'function') {
        await window.CuyScenes.loadHotspots();
      }

      const st = window.bridge.currentState;
      const m = window.CuyScenesMock.state('seven');
      st.places.order = m.places.order.map(o => Object.assign({}, o, { locked: false }));
      st.places.pigLocations = [{ pigId: 'kuki', scene: 'salon', pinned: true }];
      if (Array.isArray(st.places.places)) {
        st.places.places.forEach(p => { p.unlocked = true; });
      }
      if (st.dorm) {
        st.dorm.unlocked = true;
      }
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      Object.keys(m.rooms.layouts).forEach(k => {
        st.rooms.layouts[k] = JSON.parse(JSON.stringify(m.rooms.layouts[k]));
      });
      if (!st.rooms.layouts['pig:pig_1'] && st.rooms.layouts['pig:kuki']) {
        st.rooms.layouts['pig:pig_1'] = JSON.parse(JSON.stringify(st.rooms.layouts['pig:kuki']));
      }
      if (!st.rooms.layouts.dorm) {
        st.rooms.layouts.dorm = {
          cols: 16,
          rows: 8,
          wallRows: 2,
          wallpaper: 'wallpaper_cream',
          floor: 'floor_wood_light',
          items: [
            { uid: 'd1', itemId: 'cushion_big', x: 3, y: 4, flip: false },
            { uid: 'd2', itemId: 'hay_bar_wood', x: 8, y: 3, flip: false }
          ]
        };
      }
      st.poops = 0;
      if (!st.settings) st.settings = {};
      st.settings.weatherEnabled = false;
      window.bridge.broadcastState();
    });

    await page.waitForTimeout(300);

    // Helper inside page to deterministically render a scene + tod and return PNG dataURL & metadata
    async function renderScenePass(passIndex) {
      const results = {};
      for (const sc of SCENES) {
        const sceneId = SCENE_MAP[sc];
        for (const tod of TODS) {
          const key = `${sc}-${tod}`;
          const hourStr = TOD_HOURS[tod];
          const res = await page.evaluate(async ({ sceneId, tod, hourStr }) => {
            window.__cuyNow = hourStr;
            const st = window.bridge.currentState;
            st.places.pigLocations = [{ pigId: 'kuki', scene: sceneId, pinned: true }];

            const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
            if (!inst) throw new Error('PigCanvas instance not found');
            inst.stopped = true;

            window.CuyPlaces.applyScene(sceneId, st);

            // Force deterministic timeOfDay in sceneDef if scenes.timeOfDay ignored __cuyNow
            const def = window.CuyScenes.def(sceneId, tod, st);
            window.CanvasPig.setScene(def);
            const things = window.CuyScenes.placedThings(st, sceneId);
            window.CanvasPig.setThings(things, true);
            const light = window.CuyLight ? window.CuyLight.build(sceneId) : null;
            if (window.CanvasPig.setLightScene) window.CanvasPig.setLightScene(light);

            window.CanvasPig.setExitsEnabled(false);
            inst.exitsEnabled = false;
            inst.bubbleVisible = false;
            inst.bubbleTimer = 0;
            inst.particles = [];
            inst.poopCount = 0;
            inst.currentAnim = 'idle';
            inst.currentFrame = 0;
            inst.frameAcc = 0;
            inst.animTimer = 0;
            inst.facing = 1;
            inst.targetX = null;
            inst.targetY = null;
            inst.path = [];
            inst.clearPlayState();

            const [wx0, wy0, wx1, wy1] = inst.walk || [40, 56, 216, 126];
            const px = Math.round((wx0 + wx1) / 2);
            const py = Math.round((wy0 + wy1) / 2);
            const freePt = inst.isFree(px, py) ? { x: px, y: py } : inst.snapToFreeCell(px, py);
            inst._multiPigActive = false;
            inst.pigVisible = true;
            window.CanvasPig.pigX = freePt.x;
            window.CanvasPig.pigY = freePt.y;
            inst.pigX = freePt.x;
            inst.pigY = freePt.y;
            inst.activePig = { id: 'starter', breed: 'smooth', paletteId: 'blaze_only.ginger', stage: 'adult' };
            inst.stageKey = 'adult';
            inst.breed = 'smooth';
            inst.paletteId = 'blaze_only.ginger';

            // Wait for all cached images + pig sheet + shadow to finish loading
            const waitImgs = [];
            Object.values(inst.imageCache || {}).forEach(img => {
              if (img && !img.complete && !img.failed) waitImgs.push(img);
            });
            Object.values(inst.pigShadows || {}).forEach(img => {
              if (img && !img.complete) waitImgs.push(img);
            });
            if (inst.sceneBgImg && !inst.sceneBgImg.complete && !inst.sceneBgImg.failed) {
              waitImgs.push(inst.sceneBgImg);
            }
            if (window.CuySprites && typeof window.CuySprites.image === 'function') {
              const si = window.CuySprites.image('smooth', 'adult');
              if (si && !si.complete) waitImgs.push(si);
            }
            for (const img of waitImgs) {
              await new Promise(r => {
                img.addEventListener('load', r, { once: true });
                img.addEventListener('error', r, { once: true });
                setTimeout(r, 1500);
              });
            }
            for (let attempt = 0; attempt < 20; attempt++) {
              if (inst.usableSheet()) break;
              await new Promise(r => setTimeout(r, 50));
            }

            inst.render();

            const c = document.getElementById('pigCanvas');
            return {
              width: c.width,
              height: c.height,
              sceneSize: window.CanvasPig.debug().sceneSize,
              dataUrl: c.toDataURL('image/png')
            };
          }, { sceneId, tod, hourStr });

          const base64 = res.dataUrl.replace(/^data:image\/png;base64,/, '');
          results[key] = {
            buffer: Buffer.from(base64, 'base64'),
            width: res.width,
            height: res.height,
            sceneSize: res.sceneSize,
            dataUrl: res.dataUrl
          };
        }
      }
      return results;
    }

    // --- V1: Render 7 scenes x 4 times of day at logical 256x144 twice and require identical bytes ---
    const pass1 = await renderScenePass(1);
    const pass2 = await renderScenePass(2);

    const v1SizeErrors = [];
    const v1DiffKeys = [];
    for (const sc of SCENES) {
      for (const tod of TODS) {
        const key = `${sc}-${tod}`;
        const p1 = pass1[key];
        const p2 = pass2[key];
        if (!p1 || p1.width !== 256 || p1.height !== 144 || p1.sceneSize[0] !== 256 || p1.sceneSize[1] !== 144) {
          v1SizeErrors.push(`${key}(${p1 ? p1.width + 'x' + p1.height : 'missing'})`);
        }
        if (!p1 || !p2 || Buffer.compare(p1.buffer, p2.buffer) !== 0) {
          v1DiffKeys.push(key);
        }
        if (p1) {
          fs.writeFileSync(path.join(BASELINE_DIR, `${key}.png`), p1.buffer);
        }
      }
    }
    check(
      'V1',
      v1SizeErrors.length === 0 && v1DiffKeys.length === 0 && Object.keys(pass1).length === 28,
      `Expected 28 deterministic 256x144 baselines; sizeErrors=[${v1SizeErrors.join(',')}], nonDeterministic=[${v1DiffKeys.join(',')}]`
    );

    // --- V2: Compare with existing baselines when present (per-pixel tolerance 0, ratio printed) ---
    const v2Mismatches = [];
    let comparedCount = 0;
    for (const sc of SCENES) {
      for (const tod of TODS) {
        const key = `${sc}-${tod}`;
        const curr = pass1[key];
        const fp = path.join(BASELINE_DIR, `${key}.png`);
        const prevBuf = preExistingBaselines[key] || (fs.existsSync(fp) ? fs.readFileSync(fp) : null);
        if (!prevBuf) continue;
        if (preExistingBaselines[key]) comparedCount++;
        if (Buffer.compare(prevBuf, curr.buffer) !== 0) {
          const prevDataUrl = 'data:image/png;base64,' + prevBuf.toString('base64');
          const diffInfo = await page.evaluate(async ({ urlA, urlB }) => {
            async function loadImg(u) {
              const img = new Image();
              await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = u; });
              const c = document.createElement('canvas');
              c.width = img.naturalWidth || 256;
              c.height = img.naturalHeight || 144;
              const ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0);
              return ctx.getImageData(0, 0, c.width, c.height);
            }
            const a = await loadImg(urlA);
            const b = await loadImg(urlB);
            if (a.width !== b.width || a.height !== b.height) {
              return { diffPixels: a.width * a.height, total: a.width * a.height, ratio: 1 };
            }
            let diff = 0;
            const total = a.width * a.height;
            for (let i = 0; i < a.data.length; i += 4) {
              if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) {
                diff++;
              }
            }
            return { diffPixels: diff, total, ratio: diff / total };
          }, { urlA: prevDataUrl, urlB: curr.dataUrl });
          console.log(`V2 diff ${key}: ${diffInfo.diffPixels}/${diffInfo.total} (${(diffInfo.ratio * 100).toFixed(4)}%)`);
          if (diffInfo.diffPixels > 0) {
            v2Mismatches.push(`${key}:${(diffInfo.ratio * 100).toFixed(2)}%`);
          }
        }
      }
    }
    console.log(`V2: compared ${comparedCount}/28 existing baselines (${28 - comparedCount} newly recorded)`);
    check('V2', v2Mismatches.length === 0, `Baseline pixel mismatch(es): ${v2Mismatches.join(', ')}`);

    // --- V3: Palette check in un-lit day scene without the pig ---
    // Note: in un-lit day scene without pig and without item contact shadows (which use rgba alpha blending),
    // or checking raw day scene without lights/pig: let's inspect the actual canvas pixels in un-lit day scene without pig.
    const v3Violations = [];
    for (const sc of SCENES) {
      const sceneId = SCENE_MAP[sc];
      const v3Res = await page.evaluate(async ({ sceneId }) => {
        window.__cuyNow = '12:00';
        const st = window.bridge.currentState;
        st.places.pigLocations = [];
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        window.CuyPlaces.applyScene(sceneId, st);
        const def = window.CuyScenes.def(sceneId, 'day', st);
        window.CanvasPig.setScene(def);
        const things = window.CuyScenes.placedThings(st, sceneId);
        window.CanvasPig.setThings(things, true);
        if (window.CanvasPig.setLightScene) window.CanvasPig.setLightScene(null);
        inst.lightScene = null;
        window.CanvasPig.setPresentPigs([]);
        window.CanvasPig.setPigVisible(false);
        inst.pigVisible = false;
        inst.poopCount = 0;
        inst.particles = [];
        inst.bubbleVisible = false;

        // Wait for any images
        for (const img of Object.values(inst.imageCache || {})) {
          if (img && !img.complete && !img.failed) {
            await new Promise(r => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
              setTimeout(r, 1000);
            });
          }
        }

        // Disable drawThingShadow during un-lit palette test if drawThingShadow uses alpha ellipse, OR test actual render:
        // Wait: the prompt says: "in the un-lit day scene without the pig every opaque pixel is in style_palette.json (lighting blends excluded by design: only the day scene without lights)"
        inst.render();
        const c = document.getElementById('pigCanvas');
        const imgData = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const badColors = {};
        let opaqueCount = 0;
        let badCount = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          const a = imgData[i + 3];
          if (a === 255) {
            opaqueCount++;
            const hex = '#' + [imgData[i], imgData[i + 1], imgData[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
            badColors[hex] = (badColors[hex] || 0) + 1;
          }
        }
        return { opaqueCount, colorCounts: badColors };
      }, { sceneId });

      const offPalette = [];
      let offPixels = 0;
      for (const [hex, cnt] of Object.entries(v3Res.colorCounts)) {
        if (!paletteHexSet.has(hex.toLowerCase())) {
          offPalette.push(`${hex}(${cnt})`);
          offPixels += cnt;
        }
      }
      if (offPalette.length > 0) {
        v3Violations.push(`${sc}: ${offPixels} px off-palette [${offPalette.slice(0, 5).join(', ')}]`);
      }
    }
    check('V3', v3Violations.length === 0, `Un-lit day scene off-palette opaque pixels: ${v3Violations.join('; ')}`);

    // --- V4: Clipping check: no placed sprite extends more than 2 px outside the canvas ---
    const v4Clipped = [];
    for (const sc of SCENES) {
      const sceneId = SCENE_MAP[sc];
      const clipRes = await page.evaluate(({ sceneId }) => {
        const st = window.bridge.currentState;
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        const def = window.CuyScenes.def(sceneId, 'day', st);
        window.CanvasPig.setScene(def);
        const things = window.CuyScenes.placedThings(st, sceneId);
        window.CanvasPig.setThings(things, true);
        const cw = inst.sceneWidth || 256;
        const ch = inst.sceneHeight || 144;
        const out = [];
        for (const t of (inst.things || [])) {
          if (!t) continue;
          const img = t.img;
          const sw = t.w || (img && (img.naturalWidth || img.width)) || 16;
          const sh = t.h || (img && (img.naturalHeight || img.height)) || 16;
          const frames = Math.max(1, t.frames || 1);
          const fw = Math.floor(sw / frames);
          const ax = t.anchorX !== undefined ? t.anchorX : Math.round(fw / 2);
          const ay = t.anchorY !== undefined ? t.anchorY : sh;
          const x0 = Math.round((t.x || 0) - ax);
          const y0 = Math.round((t.y || 0) - ay);
          const x1 = x0 + fw;
          const y1 = y0 + sh;
          if (x0 < -2 || y0 < -2 || x1 > cw + 2 || y1 > ch + 2) {
            out.push(`${t.id || t.itemId}[${x0},${y0}..${x1},${y1}]`);
          }
        }
        return out;
      }, { sceneId });
      if (clipRes.length > 0) {
        v4Clipped.push(`${sc}: ${clipRes.join(', ')}`);
      }
    }
    check('V4', v4Clipped.length === 0, `Placed sprites extending >2px outside 256x144 canvas: ${v4Clipped.join('; ')}`);

    // --- V5: Pig scale overlay (scene-overlay.js) shows the pig within the R28 range in every scene ---
    const v5Errors = [];
    for (const sc of SCENES) {
      const sceneId = SCENE_MAP[sc];
      let overlayErr = null;
      let overlayInfo = null;
      try {
        overlayInfo = await renderOverlay(sceneId, null, { page, layers: ['walk', 'pig'] });
      } catch (e) {
        overlayErr = e.message;
      }
      const scaleInfo = await page.evaluate(({ sceneId }) => {
        const st = window.bridge.currentState;
        const def = window.CuyScenes.def(sceneId, 'day', st);
        window.CanvasPig.setScene(def);
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        const [wx0, wy0, wx1, wy1] = inst.walk || [40, 56, 216, 126];
        const sTop = window.CanvasPig.scaleAt(wy0);
        const sMid = window.CanvasPig.scaleAt(Math.round((wy0 + wy1) / 2));
        const sBot = window.CanvasPig.scaleAt(wy1);
        const dbg = window.CanvasPig.debug();
        return {
          defSize: def.size,
          sceneSize: dbg.sceneSize,
          ds: inst.depthScale,
          sTop,
          sMid,
          sBot,
          fallbacks: dbg.scaleFallbackCount
        };
      }, { sceneId });

      if (overlayErr) {
        v5Errors.push(`${sc}: overlay failed (${overlayErr})`);
      } else if (!overlayInfo || overlayInfo.width < 160 * 4 || overlayInfo.height < 96 * 4) {
        v5Errors.push(`${sc}: overlay size ${overlayInfo ? overlayInfo.width + 'x' + overlayInfo.height : 'null'} invalid`);
      }
      const inRange = (s) => typeof s === 'number' && s >= 0.75 && s <= 1.0 && Math.abs(s * 16 - Math.round(s * 16)) < 1e-6;
      if (!inRange(scaleInfo.sTop) || !inRange(scaleInfo.sMid) || !inRange(scaleInfo.sBot)) {
        v5Errors.push(`${sc}: scale out of R28 range [0.75..1.0] (top=${scaleInfo.sTop}, mid=${scaleInfo.sMid}, bot=${scaleInfo.sBot})`);
      }
    }
    check('V5', v5Errors.length === 0, `Pig scale / scene-overlay check failed: ${v5Errors.join('; ')}`);

    // --- V6: Backgrounds 256x144 for garden, park, farm, market (IHDR) and no painted duplicates of instance objects ---
    const bgFiles = [
      'garden_morning.png', 'garden_day.png', 'garden_evening.png', 'garden_night.png',
      'park_morning.png', 'park_day.png', 'park_evening.png', 'park_night.png',
      'farm.png', 'market.png'
    ];
    const v6IhdrErrors = [];
    for (const f of bgFiles) {
      const fp = path.join(ROOT, 'assets/world/bg', f);
      const ihdr = readPngIhdr(fp);
      if (!ihdr || ihdr.width !== 256 || ihdr.height !== 144) {
        v6IhdrErrors.push(`${f}(${ihdr ? ihdr.width + 'x' + ihdr.height : 'missing'})`);
      }
    }

    const v6Duplicates = [];
    for (const sc of ['garden', 'park', 'farm', 'market']) {
      const dupList = await page.evaluate(async ({ sceneId }) => {
        const st = window.bridge.currentState;
        const def = window.CuyScenes.def(sceneId, 'day', st);
        if (!def || !def.bgUrl) return [`${sceneId}: no bgUrl`];

        async function loadImgData(url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return { width: c.width, height: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
        }

        const bg = await loadImgData(def.bgUrl);
        const things = window.CuyScenes.placedThings(st, sceneId);
        const dups = [];

        for (const t of things) {
          if (!t || !t.url) continue;
          const sp = await loadImgData(t.url);
          const frames = Math.max(1, t.frames || 1);
          const fw = Math.floor(sp.width / frames);
          const fh = sp.height;
          const ax = t.anchorX !== undefined ? t.anchorX : Math.round(fw / 2);
          const ay = t.anchorY !== undefined ? t.anchorY : fh;
          const dx = Math.round((t.x || 0) - ax);
          const dy = Math.round((t.y || 0) - ay);

          let opaquePixels = 0;
          let exactMatches = 0;
          for (let sy = 0; sy < fh; sy++) {
            const by = dy + sy;
            if (by < 0 || by >= bg.height) continue;
            for (let sx = 0; sx < fw; sx++) {
              const bx = dx + sx;
              if (bx < 0 || bx >= bg.width) continue;
              const si = (sy * sp.width + sx) * 4;
              if (sp.data[si + 3] < 250) continue;
              opaquePixels++;
              const bi = (by * bg.width + bx) * 4;
              if (sp.data[si] === bg.data[bi] && sp.data[si + 1] === bg.data[bi + 1] && sp.data[si + 2] === bg.data[bi + 2]) {
                exactMatches++;
              }
            }
          }
          if (opaquePixels > 0 && (exactMatches / opaquePixels) > 0.85) {
            dups.push(`${t.id}(${Math.round((exactMatches / opaquePixels) * 100)}%)`);
          }
        }
        return dups;
      }, { sceneId: sc });

      if (dupList.length > 0) {
        v6Duplicates.push(`${sc}: ${dupList.join(', ')}`);
      }
    }
    check(
      'V6',
      v6IhdrErrors.length === 0 && v6Duplicates.length === 0,
      `Outdoor bg IHDR/duplicate check failed: ihdr=[${v6IhdrErrors.join(', ')}], dups=[${v6Duplicates.join('; ')}]`
    );

    // --- V7: Contact sheet: all 28 baselines in one PNG with scene and time labels (palette colours only) ---
    const contactSheetData = await page.evaluate(async ({ scenes, tods, passDataUrls, palette }) => {
      // 3x5 bitmap pixel font for A-Z, 0-9, _, :, -
      const FONT = {
        'A': ['010', '101', '111', '101', '101'],
        'B': ['110', '101', '110', '101', '110'],
        'C': ['011', '100', '100', '100', '011'],
        'D': ['110', '101', '101', '101', '110'],
        'E': ['111', '100', '110', '100', '111'],
        'F': ['111', '100', '110', '100', '100'],
        'G': ['011', '100', '101', '101', '011'],
        'H': ['101', '101', '111', '101', '101'],
        'I': ['111', '010', '010', '010', '111'],
        'J': ['001', '001', '001', '101', '010'],
        'K': ['101', '101', '110', '101', '101'],
        'L': ['100', '100', '100', '100', '111'],
        'M': ['101', '111', '101', '101', '101'],
        'N': ['101', '111', '111', '101', '101'],
        'O': ['010', '101', '101', '101', '010'],
        'P': ['110', '101', '110', '100', '100'],
        'Q': ['010', '101', '101', '111', '001'],
        'R': ['110', '101', '110', '101', '101'],
        'S': ['011', '100', '010', '001', '110'],
        'T': ['111', '010', '010', '010', '010'],
        'U': ['101', '101', '101', '101', '010'],
        'V': ['101', '101', '101', '010', '010'],
        'W': ['101', '101', '101', '111', '101'],
        'X': ['101', '101', '010', '101', '101'],
        'Y': ['101', '101', '010', '010', '010'],
        'Z': ['111', '001', '010', '100', '111'],
        '0': ['010', '101', '101', '101', '010'],
        '1': ['010', '110', '010', '010', '111'],
        '2': ['110', '001', '010', '100', '111'],
        '3': ['110', '001', '010', '001', '110'],
        '4': ['101', '101', '111', '001', '001'],
        '5': ['111', '100', '110', '001', '110'],
        '6': ['011', '100', '110', '101', '010'],
        '7': ['111', '001', '010', '010', '010'],
        '8': ['010', '101', '010', '101', '010'],
        '9': ['010', '101', '011', '001', '110'],
        '_': ['000', '000', '000', '000', '111'],
        '-': ['000', '000', '111', '000', '000'],
        ':': ['000', '010', '000', '010', '000'],
        ' ': ['000', '000', '000', '000', '000']
      };

      function drawPixelText(ctx, text, x, y, scale, color) {
        ctx.fillStyle = color;
        const str = String(text).toUpperCase();
        let cx = x;
        for (let i = 0; i < str.length; i++) {
          const glyph = FONT[str[i]] || FONT[' '];
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
              if (glyph[r][c] === '1') {
                ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
              }
            }
          }
          cx += 4 * scale;
        }
      }

      const cellW = 256;
      const cellH = 144;
      const pad = 8;
      const leftLabelW = 72;
      const topLabelH = 24;
      const cols = tods.length;
      const rows = scenes.length;

      const totalW = leftLabelW + cols * (cellW + pad) + pad;
      const totalH = topLabelH + rows * (cellH + pad) + pad;

      const canvas = document.createElement('canvas');
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const bgCol = palette.ramps.plum[0]; // #241824
      const borderCol = palette.ramps.plum[2]; // #54394f
      const textCol = palette.ramps.linen[3]; // #fbf0d9

      ctx.fillStyle = bgCol;
      ctx.fillRect(0, 0, totalW, totalH);

      // Draw column headers (times of day)
      for (let c = 0; c < cols; c++) {
        const x = leftLabelW + pad + c * (cellW + pad) + 8;
        drawPixelText(ctx, tods[c], x, 7, 2, textCol);
      }

      // Draw rows (scenes + 4 cells)
      for (let r = 0; r < rows; r++) {
        const sc = scenes[r];
        const y = topLabelH + pad + r * (cellH + pad);
        drawPixelText(ctx, sc, 8, y + Math.floor(cellH / 2) - 5, 2, textCol);

        for (let c = 0; c < cols; c++) {
          const tod = tods[c];
          const key = `${sc}-${tod}`;
          const x = leftLabelW + pad + c * (cellW + pad);

          ctx.fillStyle = borderCol;
          ctx.fillRect(x - 1, y - 1, cellW + 2, cellH + 2);

          const url = passDataUrls[key];
          if (url) {
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
            ctx.drawImage(img, x, y, cellW, cellH);
          }
        }
      }

      // Verify label area pixels only use palette colors
      const imgData = ctx.getImageData(0, 0, totalW, topLabelH).data;
      const headerHexes = new Set();
      for (let i = 0; i < imgData.length; i += 4) {
        const hex = '#' + [imgData[i], imgData[i + 1], imgData[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
        headerHexes.add(hex.toLowerCase());
      }

      return {
        dataUrl: canvas.toDataURL('image/png'),
        width: totalW,
        height: totalH,
        headerHexes: Array.from(headerHexes)
      };
    }, {
      scenes: SCENES,
      tods: TODS,
      passDataUrls: Object.fromEntries(Object.entries(pass1).map(([k, v]) => [k, v.dataUrl])),
      palette: paletteData
    });

    const csBuf1 = Buffer.from(contactSheetData.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(CONTACT_SHEET_PATH, csBuf1);

    // Run contact sheet generation a second time to verify byte-for-byte determinism
    const contactSheetData2 = await page.evaluate(async ({ scenes, tods, passDataUrls, palette }) => {
      const FONT = {
        'A': ['010', '101', '111', '101', '101'],
        'B': ['110', '101', '110', '101', '110'],
        'C': ['011', '100', '100', '100', '011'],
        'D': ['110', '101', '101', '101', '110'],
        'E': ['111', '100', '110', '100', '111'],
        'F': ['111', '100', '110', '100', '100'],
        'G': ['011', '100', '101', '101', '011'],
        'H': ['101', '101', '111', '101', '101'],
        'I': ['111', '010', '010', '010', '111'],
        'J': ['001', '001', '001', '101', '010'],
        'K': ['101', '101', '110', '101', '101'],
        'L': ['100', '100', '100', '100', '111'],
        'M': ['101', '111', '101', '101', '101'],
        'N': ['101', '111', '111', '101', '101'],
        'O': ['010', '101', '101', '101', '010'],
        'P': ['110', '101', '110', '100', '100'],
        'Q': ['010', '101', '101', '111', '001'],
        'R': ['110', '101', '110', '101', '101'],
        'S': ['011', '100', '010', '001', '110'],
        'T': ['111', '010', '010', '010', '010'],
        'U': ['101', '101', '101', '101', '010'],
        'V': ['101', '101', '101', '010', '010'],
        'W': ['101', '101', '101', '111', '101'],
        'X': ['101', '101', '010', '101', '101'],
        'Y': ['101', '101', '010', '010', '010'],
        'Z': ['111', '001', '010', '100', '111'],
        '0': ['010', '101', '101', '101', '010'],
        '1': ['010', '110', '010', '010', '111'],
        '2': ['110', '001', '010', '100', '111'],
        '3': ['110', '001', '010', '001', '110'],
        '4': ['101', '101', '111', '001', '001'],
        '5': ['111', '100', '110', '001', '110'],
        '6': ['011', '100', '110', '101', '010'],
        '7': ['111', '001', '010', '010', '010'],
        '8': ['010', '101', '010', '101', '010'],
        '9': ['010', '101', '011', '001', '110'],
        '_': ['000', '000', '000', '000', '111'],
        '-': ['000', '000', '111', '000', '000'],
        ':': ['000', '010', '000', '010', '000'],
        ' ': ['000', '000', '000', '000', '000']
      };
      function drawPixelText(ctx, text, x, y, scale, color) {
        ctx.fillStyle = color;
        const str = String(text).toUpperCase();
        let cx = x;
        for (let i = 0; i < str.length; i++) {
          const glyph = FONT[str[i]] || FONT[' '];
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
              if (glyph[r][c] === '1') ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
            }
          }
          cx += 4 * scale;
        }
      }
      const cellW = 256, cellH = 144, pad = 8, leftLabelW = 72, topLabelH = 24;
      const cols = tods.length, rows = scenes.length;
      const totalW = leftLabelW + cols * (cellW + pad) + pad;
      const totalH = topLabelH + rows * (cellH + pad) + pad;
      const canvas = document.createElement('canvas');
      canvas.width = totalW; canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = palette.ramps.plum[0];
      ctx.fillRect(0, 0, totalW, totalH);
      for (let c = 0; c < cols; c++) {
        drawPixelText(ctx, tods[c], leftLabelW + pad + c * (cellW + pad) + 8, 7, 2, palette.ramps.linen[3]);
      }
      for (let r = 0; r < rows; r++) {
        const sc = scenes[r];
        const y = topLabelH + pad + r * (cellH + pad);
        drawPixelText(ctx, sc, 8, y + Math.floor(cellH / 2) - 5, 2, palette.ramps.linen[3]);
        for (let c = 0; c < cols; c++) {
          const tod = tods[c];
          const key = `${sc}-${tod}`;
          const x = leftLabelW + pad + c * (cellW + pad);
          ctx.fillStyle = palette.ramps.plum[2];
          ctx.fillRect(x - 1, y - 1, cellW + 2, cellH + 2);
          const url = passDataUrls[key];
          if (url) {
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
            ctx.drawImage(img, x, y, cellW, cellH);
          }
        }
      }
      return canvas.toDataURL('image/png');
    }, {
      scenes: SCENES,
      tods: TODS,
      passDataUrls: Object.fromEntries(Object.entries(pass2).map(([k, v]) => [k, v.dataUrl])),
      palette: paletteData
    });

    const csBuf2 = Buffer.from(contactSheetData2.replace(/^data:image\/png;base64,/, ''), 'base64');
    const csNonPalette = contactSheetData.headerHexes.filter(h => !paletteHexSet.has(h));
    check(
      'V7',
      fs.existsSync(CONTACT_SHEET_PATH) && csBuf1.length > 1000 && Buffer.compare(csBuf1, csBuf2) === 0 && csNonPalette.length === 0,
      `Contact sheet check failed: exists=${fs.existsSync(CONTACT_SHEET_PATH)}, deterministic=${Buffer.compare(csBuf1, csBuf2) === 0}, nonPaletteHeaderColors=[${csNonPalette.join(',')}]`
    );

    if (page.__errors && page.__errors.length > 0) {
      throw new Error('Page errors encountered: ' + page.__errors.join('; '));
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error in ux-p69-visual-baseline:', err);
  process.exit(1);
});
