'use strict';
const path = require('path');
const fs = require('fs');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

let playwright = null;
try {
  playwright = require('playwright');
} catch (e) {}

const { chromium } = playwright || require('playwright');
const ux = require('./lib/ux.js');

const SHOTS_DIR = path.resolve(__dirname, '..', '..', 'docs', 'qa', 'shots');

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

async function run() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const server = await ux.startServer();
  const browser = await chromium.launch(getLaunchOptions());
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  await page.setViewportSize({ width: 420, height: 720 });
  page.setDefaultTimeout(15000);

  await page.waitForFunction(() => window.CanvasPig && window.CuyPlaces && window.bridge, { timeout: 10000 });

  // Setup mock seven state with unlocked scenes
  await page.evaluate(() => {
    const st = window.bridge.currentState || window.bridge.getState();
    const m = window.CuyScenesMock ? window.CuyScenesMock.state('seven') : null;
    if (m && m.places) {
      st.places = JSON.parse(JSON.stringify(m.places));
    }
    if (st.places && st.places.order) {
      st.places.order.forEach(s => { s.locked = false; });
    }
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
    if (window.bridge && typeof window.bridge.broadcastState === 'function') {
      window.bridge.broadcastState();
    }
    if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
      window.CuyPlaces.openPlace('salon');
    }
    if (window.CanvasPig) {
      window.CanvasPig.pigX = 120;
      window.CanvasPig.pigY = 110;
      window.CanvasPig.setPigVisible(true);
      if (typeof window.CanvasPig.clearEdgeHold === 'function') {
        window.CanvasPig.clearEdgeHold();
      }
    }
  });
  await page.waitForTimeout(200);

  // 1. Drag pig to right edge zone (indicator active)
  const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
  const rect = await page.evaluate(() => {
    const c = document.querySelector('#pigCanvas, canvas');
    const r = c.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });

  const edgeX = rect.right - 6;
  const edgeY = start.clientY;

  await page.mouse.move(start.clientX, start.clientY);
  await page.mouse.down();
  await page.mouse.move(edgeX, edgeY, { steps: 5 });
  await page.waitForTimeout(300); // 300ms: indicator visible while holding

  const edgeShotPath = path.join(SHOTS_DIR, 'p44-drag-edge.png');
  await page.screenshot({ path: edgeShotPath });
  console.log('Saved screenshot: p44-drag-edge.png');

  // 2. Wait until 600ms hold completes, scene switches
  await page.waitForTimeout(500);

  const switchShotPath = path.join(SHOTS_DIR, 'p44-drag-switch.png');
  await page.screenshot({ path: switchShotPath });
  console.log('Saved screenshot: p44-drag-switch.png');

  // 3. Move pig inside new scene and drop
  await page.mouse.move(rect.left + 120, edgeY, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  const movedShotPath = path.join(SHOTS_DIR, 'p44-pig-moved.png');
  await page.screenshot({ path: movedShotPath });
  console.log('Saved screenshot: p44-pig-moved.png');

  await browser.close();
  server.close();
  console.log('PASS ux-p44-shots: captured drag edge, switch, and moved screenshots');
}

run().catch((err) => {
  console.error('FAIL ux-p44-shots:', err);
  process.exit(1);
});
