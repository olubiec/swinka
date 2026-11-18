'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');

function runT1AssetsAndCss() {
  const uiDir = path.join(ROOT, 'assets', 'ui');
  const requiredFiles = [
    'nav_bar_frame.png',
    'nav_bar_frame.json',
    'nav_title_plate.png',
    'nav_title_plate.json',
    'nav_btn_arrow_left.png',
    'nav_btn_arrow_left_hover.png',
    'nav_btn_arrow_left_pressed.png',
    'nav_btn_arrow_right.png',
    'nav_btn_arrow_right_hover.png',
    'nav_btn_arrow_right_pressed.png',
    'nav_btn_edit.png',
    'nav_btn_edit_hover.png',
    'nav_btn_edit_active.png'
  ];
  for (const f of requiredFiles) {
    assert(fs.existsSync(path.join(uiDir, f)), `T1 missing asset: ${f}`);
  }

  const css = fs.readFileSync(path.join(ROOT, 'web', 'home', 'features', 'places', 'feature.css'), 'utf8');
  const expectedRefs = [
    'nav_bar_frame.png',
    'nav_title_plate.png',
    'nav_btn_edit.png',
    'nav_btn_edit_hover.png',
    'nav_btn_edit_active.png',
    'nav_btn_arrow_left.png',
    'nav_btn_arrow_left_hover.png',
    'nav_btn_arrow_left_pressed.png',
    'nav_btn_arrow_right.png',
    'nav_btn_arrow_right_hover.png',
    'nav_btn_arrow_right_pressed.png'
  ];
  for (const ref of expectedRefs) {
    assert(css.includes(ref), `T1 feature.css missing reference: ${ref}`);
  }
  console.log('T1 OK');
}

async function launchBrowser() {
  if (process.env.CHROMIUM_PATH) {
    return await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (_) {
    return await chromium.launch({ channel: 'msedge', headless: true });
  }
}

(async () => {
  runT1AssetsAndCss();

  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const page = await openHome(browser, { base: server.base });
    await page.setViewportSize({ width: 420, height: 640 });
    await page.waitForTimeout(150);

    // T2: #placesEditBtn exists and has 3 different background-image states
    const editBtn = page.locator('#placesEditBtn');
    assert.strictEqual(await editBtn.count(), 1, 'T2 #placesEditBtn must exist');
    const bgNormal = await editBtn.evaluate(el => getComputedStyle(el).backgroundImage);
    await editBtn.hover();
    const bgHover = await editBtn.evaluate(el => getComputedStyle(el).backgroundImage);
    assert.notStrictEqual(bgHover, bgNormal, 'T2 hover backgroundImage must differ from normal');
    assert(bgNormal !== 'none' && bgHover !== 'none', 'T2 backgroundImage must not be none');

    // T3: clicking Edit opens drawer and sets aria-pressed="true", clicking again closes it
    await editBtn.click();
    await page.waitForTimeout(150);
    assert.strictEqual(await editBtn.getAttribute('aria-pressed'), 'true', 'T3 aria-pressed should be true when open');
    const bgActive = await editBtn.evaluate(el => getComputedStyle(el).backgroundImage);
    assert.notStrictEqual(bgActive, bgNormal, 'T3 active backgroundImage must differ from normal');
    assert.strictEqual(await page.evaluate(() => !document.getElementById('editDrawer').hidden), true, 'T3 editDrawer should be visible');

    await editBtn.click();
    await page.waitForTimeout(150);
    assert.strictEqual(await editBtn.getAttribute('aria-pressed'), 'false', 'T3 aria-pressed should be false when closed');
    assert.strictEqual(await page.evaluate(() => document.getElementById('editDrawer').hidden), true, 'T3 editDrawer should be hidden');
    console.log('T2 & T3 OK');

    // T4: arrows switch scene and update title on plate
    const initialTitle = await page.locator('#placesBarTitle').innerText();
    await page.click('#placesNextBtn');
    await page.waitForTimeout(150);
    const nextTitle = await page.locator('#placesBarTitle').innerText();
    assert.notStrictEqual(nextTitle, initialTitle, 'T4 next arrow should change title');
    await page.click('#placesPrevBtn');
    await page.waitForTimeout(150);
    const prevTitle = await page.locator('#placesBarTitle').innerText();
    assert.strictEqual(prevTitle, initialTitle, 'T4 prev arrow should return to initial title');
    console.log('T4 OK');

    // T5: longest place name fits inside plate + viewport matrix (420x640, 400x620, 420x600, 360x560 x 7 scenes x normal/edit)
    await page.evaluate(() => {
      if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function' && window.bridge && typeof window.bridge.setState === 'function') {
        window.bridge.setState(window.CuyScenesMock.state('seven'));
      }
    });
    await page.waitForTimeout(150);

    // Check longest place name inside plate
    await page.evaluate(() => {
      const t = document.getElementById('placesBarTitle');
      if (t) t.textContent = 'Dormitory & Garden';
    });
    const plateCheck = await page.evaluate(() => {
      const plate = document.querySelector('.places-bar-plate').getBoundingClientRect();
      const title = document.getElementById('placesBarTitle').getBoundingClientRect();
      return {
        plateWidth: plate.width,
        titleWidth: title.width,
        titleRight: title.right,
        plateRight: plate.right
      };
    });
    assert(plateCheck.titleWidth <= plateCheck.plateWidth + 0.5, `T5 titleWidth (${plateCheck.titleWidth}) > plateWidth (${plateCheck.plateWidth})`);
    assert(plateCheck.titleRight <= plateCheck.plateRight + 0.5, `T5 titleRight (${plateCheck.titleRight}) > plateRight (${plateCheck.plateRight})`);

    const viewports = [
      { width: 420, height: 640 },
      { width: 400, height: 620 },
      { width: 420, height: 600 },
      { width: 360, height: 560 }
    ];
    const scenes = ['salon', 'pig:pig_1', 'dorm', 'garden', 'park', 'farm', 'market'];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      for (const sceneId of scenes) {
        await page.evaluate((id) => {
          if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
            window.CuyPlaces.openPlace(id);
          }
        }, sceneId);

        for (const mode of ['normal', 'edit']) {
          await page.evaluate((m) => {
            if (!window.CuyEdit) return;
            const isOpen = window.CuyEdit.isOpen();
            if (m === 'edit' && !isOpen) window.CuyEdit.toggle();
            if (m === 'normal' && isOpen) window.CuyEdit.toggle();
          }, mode);
          await page.waitForTimeout(50);

          const metrics = await page.evaluate(() => {
            const btnMore = document.getElementById('btnMore').getBoundingClientRect();
            const gameDevice = document.getElementById('gameDevice').getBoundingClientRect();
            const placesBar = document.getElementById('placesBar').getBoundingClientRect();
            return {
              innerH: window.innerHeight,
              moreBottom: btnMore.bottom,
              deviceBottom: gameDevice.bottom,
              barBottom: placesBar.bottom,
              docScrollH: document.documentElement.scrollHeight,
              bodyScrollH: document.body.scrollHeight
            };
          });

          const tag = `${vp.width}x${vp.height} ${sceneId} ${mode}`;
          assert(metrics.moreBottom <= metrics.innerH + 0.5, `T5 [${tag}] #btnMore cut off: ${metrics.moreBottom} > ${metrics.innerH}`);
          assert(metrics.moreBottom <= metrics.deviceBottom - 4 + 0.5, `T5 [${tag}] #btnMore outside #gameDevice: ${metrics.moreBottom} > ${metrics.deviceBottom - 4}`);
          assert(metrics.barBottom <= metrics.innerH + 0.5, `T5 [${tag}] #placesBar cut off: ${metrics.barBottom} > ${metrics.innerH}`);
          assert(metrics.docScrollH <= metrics.innerH, `T5 [${tag}] docScrollH ${metrics.docScrollH} > ${metrics.innerH}`);
          assert(metrics.bodyScrollH <= metrics.innerH, `T5 [${tag}] bodyScrollH ${metrics.bodyScrollH} > ${metrics.innerH}`);
        }
      }
    }
    console.log('T5 OK');

    // T6: no console/page errors
    assert.strictEqual(page.__errors.length, 0, `T6 errors found: ${page.__errors.join('; ')}`);
    console.log('T6 OK');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
