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

const SCENES = [
  { name: 'room', placeId: 'pig:pig_1', aliases: ['room', 'pig_1'] },
  { name: 'salon', placeId: 'salon', aliases: ['salon'] },
  { name: 'garden', placeId: 'garden', aliases: ['garden'] },
  { name: 'park', placeId: 'park', aliases: ['park'] },
  { name: 'farm', placeId: 'farm', aliases: ['farm'] },
  { name: 'market', placeId: 'market', aliases: ['market'] }
];

async function run() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const server = await ux.startServer();
  const browser = await chromium.launch(getLaunchOptions());
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  await page.setViewportSize({ width: 420, height: 720 });
  page.setDefaultTimeout(15000);

  // Wait for core places and canvas components
  await page.waitForFunction(() => window.CanvasPig && window.CuyScenes && window.CuyPlaces && window.bridge, { timeout: 10000 });

  // Setup mock seven with all scenes unlocked
  await page.evaluate(() => {
    const st = window.bridge.currentState || window.bridge.getState();
    if (window.CuyScenesMock) {
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
    }
    if (st.places && st.places.order) {
      for (const p of st.places.order) {
        p.locked = false;
      }
    }
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon' }];
    window.bridge.broadcastState();
  });
  await page.waitForTimeout(150);

  for (const scene of SCENES) {
    for (const pos of ['top', 'bottom']) {
      await page.evaluate(({ placeId, position }) => {
        if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
          window.CuyPlaces.openPlace(placeId);
        }
        const inst = window.CuyPig.mainInstance || (window.CanvasPig && window.CanvasPig.instance);
        if (!inst) return;

        const tod = (window.CuyScenes && typeof window.CuyScenes.timeOfDay === 'function')
          ? window.CuyScenes.timeOfDay()
          : 'day';
        const def = (window.CuyScenes && typeof window.CuyScenes.def === 'function')
          ? window.CuyScenes.def(placeId, tod)
          : (inst.scene || { walk: [10, 80, 230, 125] });

        const walk = (def && def.walk) || (inst.scene && inst.scene.walk) || [10, 80, 230, 125];
        const xMid = Math.round((walk[0] + walk[2]) / 2);
        const y = (position === 'top') ? walk[1] : walk[3];

        inst.pigX = xMid;
        inst.pigY = y;
        inst.targetX = null;
        inst.targetY = null;
        inst.path = [];
        inst.isWalking = false;
        inst.idleTimer = 999999;

        if (window.CanvasPig && typeof window.CanvasPig.setPigVisible === 'function') {
          window.CanvasPig.setPigVisible(true);
        }
        if (typeof inst.render === 'function') {
          inst.render();
        }
      }, { placeId: scene.placeId, position: pos });

      await page.waitForTimeout(150);

      const shotPath = path.join(SHOTS_DIR, `p45-${scene.name}-${pos}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`Saved screenshot: p45-${scene.name}-${pos}.png`);

      if (pos === 'bottom') {
        const baseShotPath = path.join(SHOTS_DIR, `p45-${scene.name}.png`);
        fs.copyFileSync(shotPath, baseShotPath);
        console.log(`Saved screenshot: p45-${scene.name}.png`);
      }
      if (scene.aliases) {
        for (const alias of scene.aliases) {
          if (alias !== scene.name) {
            fs.copyFileSync(shotPath, path.join(SHOTS_DIR, `p45-${alias}-${pos}.png`));
            if (pos === 'bottom') {
              fs.copyFileSync(shotPath, path.join(SHOTS_DIR, `p45-${alias}.png`));
            }
          }
        }
      }
    }
  }

  await browser.close();
  server.close();
  console.log('PASS ux-p45-shots: captured all scene screenshots');
}

run().catch((err) => {
  console.error('FAIL ux-p45-shots:', err);
  process.exit(1);
});
