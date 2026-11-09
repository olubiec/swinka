'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');
const { renderOverlay, DEFAULT_LAYERS } = require('./scene-overlay.js');

function getLaunchOptions() {
  if (process.env.CHROMIUM_PATH) {
    return { executablePath: process.env.CHROMIUM_PATH };
  }
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return { executablePath: c };
    }
  }
  return {};
}

async function measurePigHeightsInColumn(page, outPath, bandCenterX, wy0) {
  const buf = fs.readFileSync(outPath);
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  const targetCol = Math.round(bandCenterX * 4);
  const splitY = Math.round(wy0 * 4);

  return await page.evaluate(async ({ dataUrl, targetCol, splitY }) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    // rose1 is #d98a86 => r=217, g=138, b=134
    function isRose(x, y) {
      const idx = (y * img.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      return a > 0 && Math.abs(r - 217) <= 2 && Math.abs(g - 138) <= 2 && Math.abs(b - 134) <= 2;
    }

    const matchingRows = [];
    for (let y = 0; y < img.height; y++) {
      if (isRose(targetCol, y)) {
        matchingRows.push(y);
      }
    }

    const topRows = matchingRows.filter(y => y <= splitY);
    const botRows = matchingRows.filter(y => y > splitY);

    const topHeight = topRows.length > 0 ? (topRows[topRows.length - 1] - topRows[0] + 1) : 0;
    const botHeight = botRows.length > 0 ? (botRows[botRows.length - 1] - botRows[0] + 1) : 0;

    return { topHeight, botHeight, rowsCount: matchingRows.length };
  }, { dataUrl, targetCol, splitY });
}

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuy-ux-p45-pig-'));
  let server = null;
  let browser = null;

  try {
    server = await ux.startServer();
    browser = await chromium.launch(getLaunchOptions());
    const page = await ux.openHome(browser);

    // OP1: crop run differs from no-crop run for park (window narrower), identical for garden (fits whole)
    console.log('Testing OP1: crop run vs no-crop run (park differs, garden identical)...');
    const parkCrop = path.join(tmpDir, 'park_crop.png');
    const parkNoCrop = path.join(tmpDir, 'park_nocrop.png');
    await renderOverlay('park', parkCrop, { page, layers: ['crop'] });
    await renderOverlay('park', parkNoCrop, { page, layers: [] });
    const bufParkCrop = fs.readFileSync(parkCrop);
    const bufParkNoCrop = fs.readFileSync(parkNoCrop);
    assert(!bufParkCrop.equals(bufParkNoCrop), 'OP1 FAIL: Expected park crop run to differ from no-crop run');

    const gardenCrop = path.join(tmpDir, 'garden_crop.png');
    const gardenNoCrop = path.join(tmpDir, 'garden_nocrop.png');
    await renderOverlay('garden', gardenCrop, { page, layers: ['crop'] });
    await renderOverlay('garden', gardenNoCrop, { page, layers: [] });
    const bufGardenCrop = fs.readFileSync(gardenCrop);
    const bufGardenNoCrop = fs.readFileSync(gardenNoCrop);
    assert(bufGardenCrop.equals(bufGardenNoCrop), 'OP1 FAIL: Expected garden crop run to be identical to no-crop run');
    console.log('OP1 PASS: park crop differs, garden crop is identical to no-crop');

    // OP2: pig rectangle height in PNG equals round(29*s)*4 at both band edges
    console.log('Testing OP2: pig rectangle height at top and bottom band edges...');
    const sceneDefs = await page.evaluate(async () => {
      if (window.CuyScenes && window.CuyScenes.load) {
        await window.CuyScenes.load();
      }
      return {
        garden: window.CuyScenes.def('garden', 'day'),
        park: window.CuyScenes.def('park', 'day')
      };
    });

    for (const sceneId of ['garden', 'park']) {
      const def = sceneDefs[sceneId];
      const outPath = path.join(tmpDir, `${sceneId}_pig.png`);
      await renderOverlay(sceneId, outPath, { page, layers: ['pig'] });

      const [wx0, wy0, wx1, wy1] = def.walk;
      const bandCenterX = (wx0 + wx1) / 2;
      const sTop = Math.round(def.depthScale[0] * 16) / 16;
      const sBot = Math.round(def.depthScale[1] * 16) / 16;
      const expectedTopH = Math.round(29 * sTop) * 4;
      const expectedBotH = Math.round(29 * sBot) * 4;

      const { topHeight, botHeight } = await measurePigHeightsInColumn(page, outPath, bandCenterX, wy0);
      assert.strictEqual(
        topHeight,
        expectedTopH,
        `OP2 FAIL [${sceneId}]: top edge height mismatch: got ${topHeight}, expected ${expectedTopH}`
      );
      assert.strictEqual(
        botHeight,
        expectedBotH,
        `OP2 FAIL [${sceneId}]: bottom edge height mismatch: got ${botHeight}, expected ${expectedBotH}`
      );
    }
    console.log('OP2 PASS: pig rectangle height in PNG matches round(29*s)*4 at both band edges');

    // OP3: byte-identical on re-run
    console.log('Testing OP3: byte-identical on re-run...');
    const gardenRunA = path.join(tmpDir, 'garden_run_a.png');
    const gardenRunB = path.join(tmpDir, 'garden_run_b.png');
    await renderOverlay('garden', gardenRunA, { page });
    await renderOverlay('garden', gardenRunB, { page });
    const bufGardenA = fs.readFileSync(gardenRunA);
    const bufGardenB = fs.readFileSync(gardenRunB);
    assert(bufGardenA.equals(bufGardenB), 'OP3 FAIL: garden re-runs are not byte-identical');

    const parkRunA = path.join(tmpDir, 'park_run_a.png');
    const parkRunB = path.join(tmpDir, 'park_run_b.png');
    await renderOverlay('park', parkRunA, { page });
    await renderOverlay('park', parkRunB, { page });
    const bufParkA = fs.readFileSync(parkRunA);
    const bufParkB = fs.readFileSync(parkRunB);
    assert(bufParkA.equals(bufParkB), 'OP3 FAIL: park re-runs are not byte-identical');
    console.log('OP3 PASS: re-runs are byte-identical');

    console.log('\nALL OVERLAY PIG CHECKS PASS (OP1-OP3)');
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

run().catch((err) => {
  console.error('UX P45 OVERLAY PIG TEST FAILED:', err);
  process.exit(1);
});
