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
    if (window.bridge && window.bridge.send) {
      window.bridge.send({ type: 'places.go', scene: id });
    }
  }, sceneId);
  await waitFrames(page, 6);
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const srv = await ux.startServer();
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 420, height: 640 } });
    const page = await context.newPage();
    await page.goto(`${srv.base}/web/home/index.html?mock=seven`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
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
      const btn = document.querySelector('[data-action="edit"], #btn-edit, .edit-btn');
      if (btn) btn.click();
      else if (window.CuyEdit && window.CuyEdit.open) window.CuyEdit.open();
    });
    await waitFrames(page, 6);
    const editPath = path.join(SHOTS_DIR, 'owner-edit-drawer.png');
    await page.screenshot({ path: editPath });
    console.log('SAVED ' + path.relative(ROOT, editPath));

    // Close edit drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.edit-drawer .close-btn, [data-action="edit-close"]');
      if (closeBtn) closeBtn.click();
      else if (window.CuyEdit && window.CuyEdit.close) window.CuyEdit.close();
    });
    await waitFrames(page, 4);

    // Night + lamp in salon
    await goScene(page, 'salon');
    await page.evaluate(() => {
      if (window.bridge && window.bridge.mockPush) {
        window.bridge.mockPush({
          timeOfDay: 'night',
          hour: 23,
          lampOn: true
        });
      }
    });
    await waitFrames(page, 6);
    const nightPath = path.join(SHOTS_DIR, 'owner-night-lamp.png');
    await page.screenshot({ path: nightPath });
    console.log('SAVED ' + path.relative(ROOT, nightPath));

    // Two pigs in salon
    await page.evaluate(() => {
      if (window.bridge && window.bridge.mockPush) {
        window.bridge.mockPush({
          timeOfDay: 'day',
          hour: 12,
          scenePigs: [
            { id: 'pig_1', name: 'Pigi', scene: 'salon', x: 140, y: 420, stage: 'adult', breed: 'american', color: 'tricolor' },
            { id: 'pig_2', name: 'Kuki', scene: 'salon', x: 260, y: 430, stage: 'junior', breed: 'abyssinian', color: 'cream' }
          ]
        });
      }
    });
    await waitFrames(page, 6);
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
