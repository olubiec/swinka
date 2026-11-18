'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, openHome, openMore, closeModal } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');

const NEW_SCRIPTS = [
  'lib/hotspots.js',
  'lib/scene-pigs.js',
  'lib/weather.js',
  'lib/play-targets.js',
  'features/places/edit-filters.js',
  'features/places/edit-templates.js',
  'features/places/edit-skins.js'
];

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

function runV9FeaturesIndexValid() {
  const indexPath = path.join(ROOT, 'web', 'home', 'features', 'index.json');
  const raw = fs.readFileSync(indexPath, 'utf8');
  const list = JSON.parse(raw);
  assert(Array.isArray(list), 'V9 features/index.json must be an array');
  assert.strictEqual(new Set(list).size, list.length, 'V9 features/index.json must not contain duplicates');
  assert(!list.includes('places/edit-panel'), 'V9 features/index.json must not contain places/edit-panel');
  for (const id of list) {
    const featPath = path.join(ROOT, 'web', 'home', 'features', id, 'feature.js');
    assert(fs.existsSync(featPath), `V9 missing feature.js for "${id}"`);
  }
  console.log('V9 features-index-valid OK');
}

(async () => {
  runV9FeaturesIndexValid();

  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const page = await openHome(browser, { base: server.base });
    await page.setViewportSize({ width: 420, height: 640 });

    // Push mock 'seven' state
    await page.evaluate(() => {
      if (window.CuyScenesMock && window.bridge && window.bridge.currentState) {
        const st = window.CuyScenesMock.state('seven');
        window.bridge.currentState.places = st.places;
        if (st.rooms) window.bridge.currentState.rooms = st.rooms;
        window.bridge.broadcastState();
      }
    });
    await page.waitForTimeout(200);

    // V1: all-globals-defined
    const globalsStatus = await page.evaluate(() => {
      const names = [
        'CuyHotspots',
        'CuyScenePigs',
        'CuyWeather',
        'CuyPlayTargets',
        'EditFilters',
        'EditTemplates',
        'EditSkins'
      ];
      const missing = names.filter(n => typeof window[n] === 'undefined');
      return { missing };
    });
    assert.deepStrictEqual(globalsStatus.missing, [], `V1 missing globals: ${globalsStatus.missing.join(', ')}`);
    console.log('V1 all-globals-defined OK');

    // V2: no-console-errors
    assert.deepStrictEqual(page.__errors, [], `V2 console/page errors: ${page.__errors.join('; ')}`);
    console.log('V2 no-console-errors OK');

    // V4: no-farm-market-tile & V8: more-grid-count
    await openMore(page);
    const moreInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#modalBody button[data-open-feature]'));
      const ids = buttons.map(b => b.dataset.openFeature);
      const titles = buttons.map(b => (b.textContent || '').trim().toLowerCase());
      const allNonRoomGarden = window.CuyHome.features
        .filter(f => f && f.id !== 'rooms' && f.id !== 'garden')
        .map(f => f.id);
      return { ids, titles, allNonRoomGarden };
    });
    assert(!moreInfo.ids.includes('farm'), 'V4 farm tile must not appear in More');
    assert(!moreInfo.ids.includes('market'), 'V4 market tile must not appear in More');
    assert(!moreInfo.titles.includes('farm'), 'V4 Farm title must not appear in More');
    assert(!moreInfo.titles.includes('market'), 'V4 Market title must not appear in More');
    console.log('V4 no-farm-market-tile OK');

    // V8: more-grid-count (2 fewer than allNonRoomGarden + album, all others preserved)
    const expectedIds = ['album', ...moreInfo.allNonRoomGarden.filter(id => id !== 'farm' && id !== 'market')];
    assert.strictEqual(
      moreInfo.ids.length,
      moreInfo.allNonRoomGarden.length + 1 - 2,
      `V8 expected ${moreInfo.allNonRoomGarden.length - 1} tiles, got ${moreInfo.ids.length}`
    );
    for (const id of expectedIds) {
      assert(moreInfo.ids.includes(id), `V8 missing expected tile: ${id}`);
    }
    console.log('V8 more-grid-count OK');

    // V5: no-window-anywhere (iterate all More tiles + places bar scenes)
    for (const id of moreInfo.ids) {
      if (id === 'album') continue;
      await page.click(`#modalBody button[data-open-feature="${id}"]`);
      await page.waitForTimeout(100);
      const modalTitle = (await page.locator('#modalTitle').innerText().catch(() => '')).trim().toLowerCase();
      assert(modalTitle !== 'farm' && modalTitle !== 'market', `V5 unexpected modal for ${id}: ${modalTitle}`);
      const backBtn = page.locator('#modalBackBtn');
      if (await backBtn.count() && await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForTimeout(100);
      } else {
        await closeModal(page);
        await openMore(page);
      }
    }
    await closeModal(page);

    for (let i = 0; i < 8; i++) {
      await page.click('#placesNextBtn');
      await page.waitForTimeout(80);
      const modalActive = await page.isVisible('#modalBackdrop.active');
      assert(!modalActive, `V5 places bar navigation opened a modal on step ${i}`);
    }
    console.log('V5 no-window-anywhere OK');

    // V6: deeplink-farm-opens-scene
    await page.evaluate(() => {
      window.CuyHome.openFeature('farm');
    });
    await page.waitForTimeout(150);
    const afterFarm = await page.evaluate(() => ({
      modalActive: document.getElementById('modalBackdrop')?.classList.contains('active'),
      place: window.CuyPlaces && window.CuyPlaces.getCurrentPlace ? window.CuyPlaces.getCurrentPlace() : null,
      title: (document.getElementById('placesBarTitle')?.textContent || '').trim().toLowerCase()
    }));
    assert(!afterFarm.modalActive, 'V6 openFeature("farm") must not open a modal');
    assert(afterFarm.place === 'farm' || afterFarm.title === 'farm', `V6 expected farm scene, got ${JSON.stringify(afterFarm)}`);

    await page.evaluate(() => {
      window.CuyHome.openFeature('market');
    });
    await page.waitForTimeout(150);
    const afterMarket = await page.evaluate(() => ({
      modalActive: document.getElementById('modalBackdrop')?.classList.contains('active'),
      place: window.CuyPlaces && window.CuyPlaces.getCurrentPlace ? window.CuyPlaces.getCurrentPlace() : null,
      title: (document.getElementById('placesBarTitle')?.textContent || '').trim().toLowerCase()
    }));
    assert(!afterMarket.modalActive, 'V6 openFeature("market") must not open a modal');
    assert(afterMarket.place === 'market' || afterMarket.title === 'market', `V6 expected market scene, got ${JSON.stringify(afterMarket)}`);
    console.log('V6 deeplink-farm-opens-scene OK');

    // V7: locked-farm-unlock-path
    await page.evaluate(() => {
      const cur = window.bridge.currentState;
      const st = window.CuyScenesMock.state('seven');
      cur.places = st.places;
      const farmEntry = cur.places.order.find(s => s.id === 'farm');
      if (farmEntry) {
        farmEntry.locked = true;
        farmEntry.unlockCost = farmEntry.unlockCost || 35;
        farmEntry.unlockHint = farmEntry.unlockHint || 'Unlock Farm';
      }
      window.bridge.broadcastState();
      window.CuyHome.openFeature('farm');
    });
    await page.waitForTimeout(150);
    const lockedOverlayVisible = await page.evaluate(() => {
      const hint = document.getElementById('placesLockedHint');
      return !!hint && !hint.hidden;
    });
    assert(lockedOverlayVisible, 'V7 locked farm must show #placesLockedHint');

    await page.click('#placesEditBtn');
    await page.waitForTimeout(150);
    const unlockRowVisible = await page.evaluate(() => {
      const drawer = document.getElementById('editDrawer');
      const btn = document.getElementById('editDrawerUnlockBtn');
      return !!drawer && !drawer.hidden && !!btn && !btn.hidden;
    });
    assert(unlockRowVisible, 'V7 locked farm edit drawer must show #editDrawerUnlockBtn');
    await page.click('#placesEditBtn');
    await page.waitForTimeout(100);
    console.log('V7 locked-farm-unlock-path OK');

    // V3: each-module-loads-alone (removing one script tag in a copy of index.html does not break the rest)
    const origHtml = fs.readFileSync(path.join(ROOT, 'web', 'home', 'index.html'), 'utf8');
    for (const scriptSrc of NEW_SCRIPTS) {
      const tagRegex = new RegExp(`\\s*<script src="${scriptSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"></script>`);
      assert(tagRegex.test(origHtml), `V3 script tag not found in index.html: ${scriptSrc}`);
      const patchedHtml = origHtml.replace(tagRegex, '');
      const testPage = await browser.newPage({ viewport: { width: 420, height: 640 } });
      const errs = [];
      testPage.on('pageerror', e => errs.push('pageerror: ' + e.message));
      testPage.on('console', m => {
        if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
          errs.push('console: ' + m.text());
        }
      });
      await testPage.route('**/web/home/index.html*', route => {
        route.fulfill({ status: 200, contentType: 'text/html', body: patchedHtml });
      });
      await testPage.goto(`${server.base}/web/home/index.html`);
      await testPage.waitForFunction(
        () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 10,
        { timeout: 10000 }
      );
      await testPage.waitForTimeout(200);
      assert.deepStrictEqual(errs, [], `V3 removing ${scriptSrc} caused errors: ${errs.join('; ')}`);
      await testPage.close();
    }
    console.log('V3 each-module-loads-alone OK');
  } finally {
    await browser.close();
    server.close();
  }
})();
