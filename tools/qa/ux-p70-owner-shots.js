'use strict';
const path = require('path');
const fs = require('fs');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const ROOT = path.resolve(__dirname, '../..');
const SHOTS_DIR = path.join(ROOT, 'docs/qa/shots');

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    return await chromium.launch({ channel: 'msedge', headless: true });
  }
}

async function waitFrames(page, count = 4) {
  await page.evaluate(n => new Promise(resolve => {
    let i = 0;
    const step = () => (++i >= n ? resolve() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  }), count);
}

async function goScene(page, sceneId) {
  await page.evaluate((id) => {
    if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
      window.CuyPlaces.openPlace(id);
    } else if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
      window.CuyPlaces.setCurrentPlace(id);
    }
  }, sceneId);
  await page.waitForTimeout(250);
  await waitFrames(page, 6);
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const srv = await ux.startServer();
  const browser = await launchBrowser();
  try {
    const page = await ux.openHome(browser, { base: srv.base });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      if (window.CuyScenesMock && window.bridge && window.bridge.currentState) {
        const st = window.CuyScenesMock.state('seven');
        window.bridge.currentState.places = st.places;
        if (st.rooms) window.bridge.currentState.rooms = st.rooms;
        window.bridge.broadcastState();
      }
    });
    await page.waitForTimeout(300);
    await waitFrames(page, 6);

    const scenes = ['salon', 'garden', 'park', 'farm', 'market'];
    for (const sc of scenes) {
      await goScene(page, sc);
      const outPath = path.join(SHOTS_DIR, `owner-${sc}.png`);
      await page.screenshot({ path: outPath });
      console.log('SAVED ' + path.relative(ROOT, outPath));
    }

    // Edit drawer in garden
    await goScene(page, 'garden');
    await page.evaluate(() => {
      if (window.CuyEdit && typeof window.CuyEdit.open === 'function') window.CuyEdit.open();
      else {
        const btn = document.getElementById('placesEditBtn');
        if (btn) btn.click();
      }
    });
    await page.waitForTimeout(250);
    await waitFrames(page, 6);
    const editPath = path.join(SHOTS_DIR, 'owner-edit-drawer.png');
    await page.screenshot({ path: editPath });
    console.log('SAVED ' + path.relative(ROOT, editPath));

    // Close edit drawer
    await page.evaluate(() => {
      if (window.CuyEdit && typeof window.CuyEdit.close === 'function') window.CuyEdit.close();
    });
    await waitFrames(page, 4);

    // Night + lamp in salon
    await page.evaluate(() => {
      window.__cuyNow = '23:00';
      const st = window.bridge && window.bridge.currentState;
      if (st && st.rooms && st.rooms.layouts && st.rooms.layouts.salon) {
        st.rooms.layouts.salon.items = [
          { uid: 'lamp_1', itemId: 'lamp_floor', x: 5, y: 3, flip: false, variant: 0 }
        ];
      }
      if (window.CuyPlaces && typeof window.CuyPlaces.setLampToggle === 'function') {
        window.CuyPlaces.setLampToggle('lamp_1', true);
      }
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    });
    await goScene(page, 'salon');
    const nightPath = path.join(SHOTS_DIR, 'owner-night-lamp.png');
    await page.screenshot({ path: nightPath });
    console.log('SAVED ' + path.relative(ROOT, nightPath));

    // Two pigs in salon
    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      const st = window.bridge && window.bridge.currentState;
      if (st && st.places && Array.isArray(st.places.pigLocations)) {
        st.places.pigLocations = [
          { pigId: 'pig_1', scene: 'salon', pinned: false },
          { pigId: 'kuki', scene: 'salon', pinned: false }
        ];
      }
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    });
    await goScene(page, 'salon');
    const twoPigsPath = path.join(SHOTS_DIR, 'owner-two-pigs.png');
    await page.screenshot({ path: twoPigsPath });
    console.log('SAVED ' + path.relative(ROOT, twoPigsPath));

    console.log('OWNER_SHOTS OK (8/8)');
  } finally {
    await browser.close();
    srv.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
