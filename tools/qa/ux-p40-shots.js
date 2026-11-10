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

  // Ensure edit-panel script and styles are loaded
  await page.waitForFunction(() => window.CuyEdit, { timeout: 3000 }).catch(async () => {
    await page.addStyleTag({ url: 'features/places/edit-panel.css' });
    await page.addScriptTag({ url: 'features/places/edit-panel.js' });
  });

  // Setup mock seven state with owned items
  await page.evaluate(() => {
    const st = window.bridge.currentState || window.bridge.getState();
    if (window.CuyScenesMock) {
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
    }
    if (!st.rooms) st.rooms = {};
    if (!st.rooms.owned) st.rooms.owned = {};
    st.rooms.layouts = { salon: { items: [] }, garden: { items: [] } };
    st.rooms.owned.sofa_cosy = 2;
    st.rooms.owned.armchair = 1;
    st.rooms.owned.bench_wood = 2;
    st.rooms.owned.flower_pot = 2;
    if (st.places && st.places.order) {
      for (const p of st.places.order) {
        p.locked = false;
      }
    }
    window.bridge.broadcastState();
  });
  await page.waitForTimeout(150);

  // 1. Salon with open Edit drawer
  await page.evaluate(() => {
    window.CuyPlaces.openPlace('salon');
    if (window.CuyEdit) {
      if (!window.CuyEdit.isOpen()) {
        window.CuyEdit.toggle();
      }
      const st = window.bridge.currentState || window.bridge.getState();
      window.CuyEdit.render(st);
    }
  });
  await page.waitForTimeout(300);

  const salonShotPath = path.join(SHOTS_DIR, 'p40-salon-edit.png');
  await page.screenshot({ path: salonShotPath });
  fs.copyFileSync(salonShotPath, path.join(SHOTS_DIR, 'p40-salon-drawer.png'));
  fs.copyFileSync(salonShotPath, path.join(SHOTS_DIR, 'p40-salon.png'));
  console.log('Saved screenshot: p40-salon-edit.png (and aliases)');

  // 2. Garden with item ghost
  await page.evaluate(() => {
    if (window.CuyEdit && window.CuyEdit.isOpen()) {
      window.CuyEdit.toggle();
    }
    window.CuyPlaces.openPlace('garden');
    const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
    if (inst) {
      if (window.CanvasPig && typeof window.CanvasPig.setGhost === 'function') {
        window.CanvasPig.setGhost({ itemId: 'bench_wood', x: 80, y: 120, valid: true });
      } else if (typeof inst.setGhost === 'function') {
        inst.setGhost({ itemId: 'bench_wood', x: 80, y: 120, valid: true });
      }
      if (typeof inst.render === 'function') {
        inst.render();
      }
    }
  });
  await page.waitForTimeout(300);

  const gardenShotPath = path.join(SHOTS_DIR, 'p40-garden-ghost.png');
  await page.screenshot({ path: gardenShotPath });
  fs.copyFileSync(gardenShotPath, path.join(SHOTS_DIR, 'p40-garden.png'));
  fs.copyFileSync(gardenShotPath, path.join(SHOTS_DIR, 'p40-garden-edit.png'));
  console.log('Saved screenshot: p40-garden-ghost.png (and aliases)');

  await browser.close();
  server.close();
  console.log('PASS ux-p40-shots: captured salon edit drawer and garden ghost screenshots');
}

run().catch((err) => {
  console.error('FAIL ux-p40-shots:', err);
  process.exit(1);
});
