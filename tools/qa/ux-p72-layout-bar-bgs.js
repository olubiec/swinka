'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');
const STRICT = process.env.STRICT === '1';

const defects = [];
function defect(id, msg) {
  const line = `DEFECT ${id}: ${msg}`;
  defects.push(line);
  console.log(line);
}
function pass(id, msg) {
  console.log(`PASS ${id}: ${msg}`);
}

async function getCanvasMetrics(page) {
  return page.evaluate(() => {
    const vp = document.querySelector('.stage-viewport');
    const canvas = document.getElementById('pigCanvas');
    const titleEl = document.getElementById('placesBarTitle');
    const dbg = window.CanvasPig && typeof window.CanvasPig.debug === 'function'
      ? window.CanvasPig.debug()
      : null;
    const vpRect = vp ? vp.getBoundingClientRect() : null;
    const cRect = canvas ? canvas.getBoundingClientRect() : null;
    return {
      vpW: vpRect ? vpRect.width : 0,
      vpH: vpRect ? vpRect.height : 0,
      cW: cRect ? cRect.width : 0,
      cH: cRect ? cRect.height : 0,
      title: titleEl ? titleEl.textContent.trim() : '',
      dbg
    };
  });
}

async function readPngPixelsInBrowser(page, relUrl) {
  return page.evaluate(async (url) => {
    const resp = await fetch(url);
    if (!resp.ok) return { error: `HTTP ${resp.status}` };
    const blob = await resp.blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const data = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    return { width: bmp.width, height: bmp.height, data: Array.from(data) };
  }, relUrl);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    if (!/Executable doesn't exist/i.test(err.message)) throw err;
    for (const channel of ['msedge', 'chrome']) {
      try {
        return await chromium.launch({ headless: true, channel });
      } catch (_) {}
    }
    throw err;
  }
}

(async () => {
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const page = await openHome(browser, { query: 'mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForTimeout(300);

    // B1-classic-bar-edit-text
    {
      const b1 = await page.evaluate(() => {
        const bar = document.getElementById('placesBar');
        const btn = document.getElementById('placesEditBtn');
        if (!bar || !btn) return { ok: false, reason: 'missing #placesBar or #placesEditBtn' };
        const btnStyle = getComputedStyle(btn);
        const btnRect = btn.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        const visible = btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden' && btnRect.width > 0 && btnRect.height > 0;
        return {
          ok: true,
          visible,
          text: btn.textContent.trim(),
          barH: Math.round(barRect.height * 100) / 100
        };
      });
      if (!b1.ok) {
        defect('B1-classic-bar-edit-text', b1.reason);
      } else {
        const issues = [];
        if (!b1.visible) issues.push('#placesEditBtn not visible');
        if (!b1.text.includes('Edit')) issues.push(`#placesEditBtn text="${b1.text}" does not contain "Edit"`);
        if (b1.barH < 22 || b1.barH > 30) issues.push(`#placesBar height=${b1.barH}px outside 22..30px`);
        if (issues.length) defect('B1-classic-bar-edit-text', issues.join('; '));
        else pass('B1-classic-bar-edit-text', `text="${b1.text}", barHeight=${b1.barH}px`);
      }
    }

    // B3-bottom-bar-fits (normal + edit drawer open)
    {
      const normalBottom = await page.evaluate(() => {
        const btn = document.getElementById('btnMore');
        return btn ? { bottom: btn.getBoundingClientRect().bottom, innerH: window.innerHeight } : null;
      });
      await page.click('#placesEditBtn');
      await page.waitForTimeout(250);
      const editState = await page.evaluate(() => {
        const btn = document.getElementById('btnMore');
        const drawer = document.getElementById('editDrawer');
        return {
          bottom: btn ? btn.getBoundingClientRect().bottom : 9999,
          innerH: window.innerHeight,
          drawerOpen: drawer ? !drawer.hidden && getComputedStyle(drawer).display !== 'none' : false
        };
      });
      // Close edit drawer before scene cycling
      await page.click('#placesEditBtn');
      await page.waitForTimeout(200);

      const issues = [];
      if (!normalBottom) issues.push('#btnMore missing');
      else if (normalBottom.bottom > normalBottom.innerH) {
        issues.push(`normal mode #btnMore bottom=${normalBottom.bottom.toFixed(1)} > innerHeight=${normalBottom.innerH}`);
      }
      if (!editState.drawerOpen) issues.push('#editDrawer did not open');
      if (editState.bottom > editState.innerH) {
        issues.push(`edit-open #btnMore bottom=${editState.bottom.toFixed(1)} > innerHeight=${editState.innerH}`);
      }
      if (issues.length) defect('B3-bottom-bar-fits', issues.join('; '));
      else pass('B3-bottom-bar-fits', `normal=${normalBottom.bottom.toFixed(1)}px, editOpen=${editState.bottom.toFixed(1)}px <= ${editState.innerH}px`);
    }

    // B2-no-huge-brown-frames + collect park state for B5
    const targetScenes = ['room_1', 'garden', 'farm', 'market', 'park'];
    const visited = new Map();
    let parkDebug = null;

    for (let step = 0; step < 12 && visited.size < targetScenes.length; step++) {
      const m = await getCanvasMetrics(page);
      const sceneId = (m.dbg && (m.dbg.placeId || m.dbg.sceneId || m.dbg.scene || m.dbg.place)) || m.title;
      if (sceneId && !visited.has(sceneId)) {
        visited.set(sceneId, m);
      }
      if (sceneId === 'park' || /park/i.test(m.title)) {
        parkDebug = m.dbg;
      }
      if (visited.size >= targetScenes.length && parkDebug) break;
      await page.click('#placesNextBtn');
      await page.waitForTimeout(250);
    }

    {
      const b2Issues = [];
      for (const s of targetScenes) {
        const m = visited.get(s);
        if (!m) {
          b2Issues.push(`scene "${s}" not reached (visited: ${Array.from(visited.keys()).join(', ')})`);
          continue;
        }
        const diffH = Math.abs(m.vpH - m.cH);
        if (m.cW < 380) b2Issues.push(`${s}: #pigCanvas width=${m.cW.toFixed(1)}px < 380px`);
        if (diffH > 8) b2Issues.push(`${s}: |.stage-viewport(${m.vpH.toFixed(1)}) - #pigCanvas(${m.cH.toFixed(1)})| = ${diffH.toFixed(1)}px > 8px`);
      }
      if (b2Issues.length) defect('B2-no-huge-brown-frames', b2Issues.join('; '));
      else {
        const summary = targetScenes.map((s) => {
          const m = visited.get(s);
          return `${s}:${Math.round(m.cW)}x${Math.round(m.cH)}(vpH=${Math.round(m.vpH)})`;
        }).join(', ');
        pass('B2-no-huge-brown-frames', summary);
      }
    }

    // B4-outdoor-bgs-restored
    {
      const b4Issues = [];
      const b4Notes = [];

      // 1) market_night.png: bright/warm string lights in upper portion (y < 76)
      const marketImg = await readPngPixelsInBrowser(page, '/assets/world/bg/market_night.png');
      if (marketImg.error) {
        b4Issues.push(`market_night.png load failed: ${marketImg.error}`);
      } else {
        let bulbPixels = 0;
        const { width, data } = marketImg;
        for (let y = 40; y < 78; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            if (r >= 190 && g >= 140 && (r + g + b) >= 420) bulbPixels++;
          }
        }
        if (bulbPixels < 15) b4Issues.push(`market_night.png missing bright string-light pixels in y=40..77 (found ${bulbPixels})`);
        else b4Notes.push(`market_night bulbs=${bulbPixels}px`);
      }

      // 2) farm_day.png: horizon wooden fence (y=46..58, x=0..170)
      const farmImg = await readPngPixelsInBrowser(page, '/assets/world/bg/farm_day.png');
      if (farmImg.error) {
        b4Issues.push(`farm_day.png load failed: ${farmImg.error}`);
      } else {
        let woodPixels = 0;
        const { width, data } = farmImg;
        for (let y = 46; y <= 58; y++) {
          for (let x = 0; x < 170; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            if (r > g && g > b && (r - b) >= 25 && r >= 80 && r <= 200) woodPixels++;
          }
        }
        if (woodPixels < 80) b4Issues.push(`farm_day.png missing horizon wooden fence pixels in x=0..170,y=46..58 (found ${woodPixels})`);
        else b4Notes.push(`farm_day fence=${woodPixels}px`);
      }

      // 3) garden_day.png: gate in center path gap (x=114..142, y=52..72 differs from side picket fence)
      const gardenImg = await readPngPixelsInBrowser(page, '/assets/world/bg/garden_day.png');
      if (gardenImg.error) {
        b4Issues.push(`garden_day.png load failed: ${gardenImg.error}`);
      } else {
        const { width, data } = gardenImg;
        let centerDiff = 0;
        let centerPixels = 0;
        for (let y = 52; y <= 72; y++) {
          for (let dx = 0; dx < 24; dx++) {
            const cx = 116 + dx;
            const rx = 20 + dx;
            const ci = (y * width + cx) * 4;
            const ri = (y * width + rx) * 4;
            const diff = Math.abs(data[ci] - data[ri]) + Math.abs(data[ci + 1] - data[ri + 1]) + Math.abs(data[ci + 2] - data[ri + 2]);
            if (diff > 45) centerDiff++;
            centerPixels++;
          }
        }
        if (centerDiff < Math.floor(centerPixels * 0.25)) {
          b4Issues.push(`garden_day.png center gate region (x=116..139) too similar to side fence (${centerDiff}/${centerPixels} diff px)`);
        } else {
          b4Notes.push(`garden_day gateDiff=${centerDiff}/${centerPixels}px`);
        }
      }

      // 4) park_day.png: restored horizon foliage/stream (RF3: gazebo & bridge are placed instances, not baked in bg)
      const parkImg = await readPngPixelsInBrowser(page, '/assets/world/bg/park_day.png');
      if (parkImg.error) {
        b4Issues.push(`park_day.png load failed: ${parkImg.error}`);
      } else {
        const { width, data } = parkImg;
        let horizonFoliage = 0;
        for (let y = 24; y < 46; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            if (g > r + 10 && g > b + 5 && g >= 60) horizonFoliage++;
          }
        }
        if (horizonFoliage < 150) {
          b4Issues.push(`park_day.png missing restored horizon foliage in y=24..45 (found ${horizonFoliage}px)`);
        } else {
          b4Notes.push(`park_day foliage=${horizonFoliage}px`);
        }
      }

      if (b4Issues.length) defect('B4-outdoor-bgs-restored', b4Issues.join('; '));
      else pass('B4-outdoor-bgs-restored', b4Notes.join(', '));
    }

    // B5-park-all-10-items-in-bounds
    {
      const defaultsPath = path.join(ROOT, 'assets', 'data', 'outdoor_defaults.json');
      const itemsWorldPath = path.join(ROOT, 'assets', 'data', 'items_world.json');
      const defaultsJson = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
      const itemsWorldJson = fs.existsSync(itemsWorldPath) ? JSON.parse(fs.readFileSync(itemsWorldPath, 'utf8')) : {};
      const itemsMap = itemsWorldJson.items || itemsWorldJson;

      const parkEntries = (defaultsJson.scenes && defaultsJson.scenes.park) || defaultsJson.park || [];
      const b5Issues = [];

      if (parkEntries.length < 10) {
        b5Issues.push(`outdoor_defaults.json park has ${parkEntries.length} items (expected >= 10)`);
      }

      const expectedIds = [];
      for (const entry of parkEntries) {
        const id = entry.id || entry.uid || entry.itemId || entry.item;
        const itemId = entry.itemId || entry.item || id;
        const meta = (Array.isArray(itemsMap) ? itemsMap.find((it) => it.id === itemId) : itemsMap[itemId]) || {};
        const w = entry.w || meta.w || 1;
        const h = entry.h || meta.h || 1;
        const x = entry.x;
        const y = entry.y;
        expectedIds.push(id);
        if (x < 0 || x + w > 16 || y < 0 || y + h > 9) {
          b5Issues.push(`defaults park "${id}" (${itemId}) at (${x},${y},${w}x${h}) out of 16x9 bounds`);
        }
      }

      const liveThings = (parkDebug && Array.isArray(parkDebug.things)) ? parkDebug.things : null;
      if (!liveThings) {
        b5Issues.push('CanvasPig.debug().things missing in park scene');
      } else {
        if (liveThings.length < parkEntries.length) {
          b5Issues.push(`live park things count=${liveThings.length} < defaults=${parkEntries.length}`);
        }
        for (const entry of parkEntries) {
          const id = entry.id || entry.uid;
          const itemId = entry.itemId || entry.item;
          const found = liveThings.find((t) =>
            (id && (t.id === id || t.uid === `fx:park:${id}` || t.uid === id)) ||
            (itemId && t.itemId === itemId && t.x === entry.x && t.y === entry.y)
          );
          if (!found) {
            b5Issues.push(`live park missing default item "${id || itemId}"`);
          } else {
            const w = found.w || 1;
            const h = found.h || 1;
            if (found.x < 0 || found.x + w > 16 || found.y < 0 || found.y + h > 9) {
              b5Issues.push(`live park "${id || found.id}" at (${found.x},${found.y},${w}x${h}) out of 16x9 bounds`);
            }
          }
        }
      }

      if (b5Issues.length) defect('B5-park-all-10-items-in-bounds', b5Issues.join('; '));
      else pass('B5-park-all-10-items-in-bounds', `defaults=${parkEntries.length}, liveThings=${liveThings.length}, all x+w<=16 & y+h<=9`);
    }

    // B6-no-console-errors
    if (page.__errors && page.__errors.length > 0) {
      defect('B6-no-console-errors', page.__errors.join(' | '));
    } else {
      pass('B6-no-console-errors', '0 console/page errors');
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`SUMMARY: defects=${defects.length}`);
  if (STRICT && defects.length > 0) process.exit(1);
})();
