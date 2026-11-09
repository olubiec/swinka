'use strict';
const path = require('path');
const fs = require('fs');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const SHOTS_DIR = path.resolve(__dirname, '..', '..', 'docs', 'qa', 'shots');

const SCENES = [
  { id: 'salon', names: ['salon'] },
  { id: 'pig:pig_1', names: ['room', 'pig_1'] },
  { id: 'dorm', names: ['dorm'] },
  { id: 'garden', names: ['garden'] },
  { id: 'park', names: ['park'] },
  { id: 'farm', names: ['farm'] },
  { id: 'market', names: ['market'] }
];

async function run() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
  await page.setViewportSize({ width: 420, height: 720 });
  page.setDefaultTimeout(5000);

  // Setup mock seven with all 7 scenes unlocked
  await page.evaluate(() => {
    const st = window.bridge.currentState || window.bridge.getState();
    const m = window.CuyScenesMock.state('seven');
    st.places = m.places;
    for (const p of st.places.order) {
      p.locked = false;
    }
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon' }];
    window.bridge.broadcastState();
    window.CuyPlaces.openPlace('salon');
  });
  await page.waitForTimeout(150);

  for (const scene of SCENES) {
    await page.evaluate((id) => window.CuyPlaces.openPlace(id), scene.id);
    await page.waitForTimeout(200);
    const primaryPath = path.join(SHOTS_DIR, `p39-${scene.names[0]}.png`);
    await page.screenshot({ path: primaryPath });
    for (let i = 1; i < scene.names.length; i++) {
      fs.copyFileSync(primaryPath, path.join(SHOTS_DIR, `p39-${scene.names[i]}.png`));
    }
    console.log(`Saved screenshot for ${scene.id} -> ${scene.names.map(n => `p39-${n}.png`).join(', ')}`);
  }

  await browser.close();
  server.close();
  console.log('PASS ux-p39-shots: all 7 scene screenshots captured');
}

run().catch((err) => {
  console.error('FAIL ux-p39-shots:', err);
  process.exit(1);
});
