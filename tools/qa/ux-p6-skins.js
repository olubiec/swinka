'use strict';
const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_PATH = path.join(ROOT, 'web', 'home', 'features', 'places', 'edit-skins.js');

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

function makeState(overrides) {
  const base = {
    rooms: {
      layouts: {
        salon: {
          name: 'Living room',
          cols: 12,
          rows: 7,
          wallRows: 2,
          wallpaper: 'wallpaper_mint',
          floor: 'floor_wood_light',
          items: []
        },
        'pig:11111111-2222-3333-4444-555555555555': {
          name: 'Kuki room',
          cols: 12,
          rows: 7,
          wallRows: 2,
          wallpaper: '',
          floor: '',
          items: []
        },
        garden: {
          name: 'Garden',
          cols: 16,
          rows: 8,
          wallRows: 0,
          wallpaper: '',
          floor: '',
          items: []
        }
      },
      skins: {
        wallpapers: [
          { id: 'wallpaper_mint', name: 'Mint', icon: 'wallpaper', price: 20, owned: true },
          { id: 'wallpaper_peach', name: 'Peach', icon: 'wallpaper', price: 25, owned: false },
          { id: 'wallpaper_sky', name: 'Sky', icon: 'wallpaper', price: 30, owned: true }
        ],
        floors: [
          { id: 'floor_wood_light', name: 'Light wood', icon: 'floor', price: 20, owned: true },
          { id: 'floor_grass', name: 'Grass', icon: 'floor', price: 25, owned: false },
          { id: 'floor_carpet_red', name: 'Red carpet', icon: 'floor', price: 35, owned: true }
        ]
      },
      owned: {}
    }
  };
  return Object.assign({}, base, overrides || {});
}

async function run() {
  // Node require() check (UMD)
  const EditSkinsNode = require(MODULE_PATH);
  assert(typeof EditSkinsNode.isIndoorRoom === 'function', 'isIndoorRoom exported');
  assert(typeof EditSkinsNode.listOwned === 'function', 'listOwned exported');
  assert(typeof EditSkinsNode.build === 'function', 'build exported');

  const nodeRes = EditSkinsNode.listOwned(makeState(), 'salon');
  assert.strictEqual(nodeRes.visible, true);
  assert.deepStrictEqual(nodeRes.wallpapers.map(w => w.id), ['wallpaper_mint', 'wallpaper_sky']);
  assert.deepStrictEqual(nodeRes.floors.map(f => f.id), ['floor_wood_light', 'floor_carpet_red']);

  const browser = await launchBrowser();
  const pageErrors = [];
  const consoleErrors = [];

  try {
    const context = await browser.newContext({ viewport: { width: 420, height: 640 } });
    const page = await context.newPage();
    page.on('pageerror', err => pageErrors.push(String(err)));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setContent('<!DOCTYPE html><html><body><div id="mount"></div></body></html>');
    await page.addScriptTag({ path: MODULE_PATH });

    // K1: lists-only-owned
    const k1 = await page.evaluate((st) => {
      window.__sent = [];
      const el = document.getElementById('mount');
      window.EditSkins.build(el, {
        state: st,
        roomId: 'salon',
        send: msg => window.__sent.push(msg)
      });
      const wallBtns = Array.from(el.querySelectorAll('[data-slot="wallpaper"] [data-action="skin"]')).map(b => b.dataset.item);
      const floorBtns = Array.from(el.querySelectorAll('[data-slot="floor"] [data-action="skin"]')).map(b => b.dataset.item);
      return { wallBtns, floorBtns };
    }, makeState());
    assert.deepStrictEqual(k1.wallBtns, ['', 'wallpaper_mint', 'wallpaper_sky'], 'K1 wallpapers');
    assert.deepStrictEqual(k1.floorBtns, ['', 'floor_wood_light', 'floor_carpet_red'], 'K1 floors');
    console.log('K1 lists-only-owned OK');

    // K2: current-marked
    const k2 = await page.evaluate(() => {
      const el = document.getElementById('mount');
      const currentWalls = Array.from(el.querySelectorAll('[data-slot="wallpaper"] [data-action="skin"].is-current')).map(b => ({
        item: b.dataset.item,
        pressed: b.getAttribute('aria-pressed')
      }));
      const currentFloors = Array.from(el.querySelectorAll('[data-slot="floor"] [data-action="skin"].is-current')).map(b => ({
        item: b.dataset.item,
        pressed: b.getAttribute('aria-pressed')
      }));
      const nonCurrent = el.querySelector('[data-slot="wallpaper"] [data-item="wallpaper_sky"]');
      return {
        currentWalls,
        currentFloors,
        nonCurrentPressed: nonCurrent ? nonCurrent.getAttribute('aria-pressed') : null
      };
    });
    assert.deepStrictEqual(k2.currentWalls, [{ item: 'wallpaper_mint', pressed: 'true' }], 'K2 wall current');
    assert.deepStrictEqual(k2.currentFloors, [{ item: 'floor_wood_light', pressed: 'true' }], 'K2 floor current');
    assert.strictEqual(k2.nonCurrentPressed, 'false', 'K2 non-current aria-pressed');
    console.log('K2 current-marked OK');

    // K3: click-wallpaper-sends-room_skin
    await page.click('[data-slot="wallpaper"] [data-item="wallpaper_sky"]');
    const k3 = await page.evaluate(() => window.__sent.slice(-1)[0]);
    assert.deepStrictEqual(k3, { type: 'room_skin', room: 'salon', slot: 'wallpaper', itemId: 'wallpaper_sky' }, 'K3 message');
    console.log('K3 click-wallpaper-sends-room_skin OK');

    // K4: click-floor-sends-room_skin
    await page.click('[data-slot="floor"] [data-item="floor_carpet_red"]');
    const k4 = await page.evaluate(() => window.__sent.slice(-1)[0]);
    assert.deepStrictEqual(k4, { type: 'room_skin', room: 'salon', slot: 'floor', itemId: 'floor_carpet_red' }, 'K4 message');
    console.log('K4 click-floor-sends-room_skin OK');

    // K5: default-button-empty-itemId
    await page.click('[data-slot="wallpaper"] [data-item=""]');
    const k5Wall = await page.evaluate(() => window.__sent.slice(-1)[0]);
    assert.deepStrictEqual(k5Wall, { type: 'room_skin', room: 'salon', slot: 'wallpaper', itemId: '' }, 'K5 wall default');
    await page.click('[data-slot="floor"] [data-item=""]');
    const k5Floor = await page.evaluate(() => window.__sent.slice(-1)[0]);
    assert.deepStrictEqual(k5Floor, { type: 'room_skin', room: 'salon', slot: 'floor', itemId: '' }, 'K5 floor default');
    console.log('K5 default-button-empty-itemId OK');

    // K6: outdoor-room-hidden
    for (const outId of ['garden', 'park', 'farm', 'market']) {
      const k6 = await page.evaluate(({ st, id }) => {
        const el = document.getElementById('mount');
        window.EditSkins.build(el, { state: st, roomId: id, send: () => {} });
        return { hidden: el.hidden, html: el.innerHTML };
      }, { st: makeState(), id: outId });
      assert.strictEqual(k6.hidden, true, `K6 hidden for ${outId}`);
      assert.strictEqual(k6.html, '', `K6 empty html for ${outId}`);
    }
    console.log('K6 outdoor-room-hidden OK');

    // K7: pig-room-works
    const pigId = 'pig:11111111-2222-3333-4444-555555555555';
    await page.evaluate(({ st, id }) => {
      window.__sent = [];
      const el = document.getElementById('mount');
      window.EditSkins.build(el, {
        state: st,
        roomId: id,
        send: msg => window.__sent.push(msg)
      });
    }, { st: makeState(), id: pigId });
    const k7Hidden = await page.evaluate(() => document.getElementById('mount').hidden);
    assert.strictEqual(k7Hidden, false, 'K7 pig room visible');
    await page.click('[data-slot="wallpaper"] [data-item="wallpaper_mint"]');
    const k7Msg = await page.evaluate(() => window.__sent.slice(-1)[0]);
    assert.deepStrictEqual(k7Msg, { type: 'room_skin', room: pigId, slot: 'wallpaper', itemId: 'wallpaper_mint' }, 'K7 message');
    console.log('K7 pig-room-works OK');

    // K8: no-owned-shows-hint
    const emptyState = makeState({
      rooms: {
        layouts: { salon: { wallpaper: '', floor: '', items: [] } },
        skins: {
          wallpapers: [{ id: 'wallpaper_peach', name: 'Peach', icon: 'wallpaper', price: 25, owned: false }],
          floors: [{ id: 'floor_grass', name: 'Grass', icon: 'floor', price: 25, owned: false }]
        },
        owned: {}
      }
    });
    const k8 = await page.evaluate((st) => {
      const el = document.getElementById('mount');
      window.EditSkins.build(el, { state: st, roomId: 'salon', send: () => {} });
      const hint = el.querySelector('.edit-skins-empty');
      return hint ? hint.textContent.trim() : null;
    }, emptyState);
    assert.strictEqual(k8, 'Buy wallpapers in the shop', 'K8 empty hint');
    console.log('K8 no-owned-shows-hint OK');

    // K9: tile-fallback-colour
    const k9State = makeState({
      rooms: {
        layouts: { salon: { wallpaper: '', floor: '', items: [] } },
        skins: {
          wallpapers: [
            { id: 'wallpaper_mint', name: 'Mint', owned: true },
            { id: 'wallpaper_missing_tile', name: 'Mystery', owned: true }
          ],
          floors: []
        },
        owned: {}
      }
    });
    const k9 = await page.evaluate((st) => {
      const el = document.getElementById('mount');
      window.EditSkins.build(el, { state: st, roomId: 'salon', send: () => {} });
      const mintSwatch = el.querySelector('[data-item="wallpaper_mint"] .edit-skin-swatch');
      const missSwatch = el.querySelector('[data-item="wallpaper_missing_tile"] .edit-skin-swatch');
      return {
        mintBg: mintSwatch ? getComputedStyle(mintSwatch).backgroundColor : '',
        missBg: missSwatch ? getComputedStyle(missSwatch).backgroundColor : ''
      };
    }, k9State);
    assert(k9.mintBg && k9.mintBg !== 'rgba(0, 0, 0, 0)', 'K9 known fallback color set');
    assert(k9.missBg && k9.missBg !== 'rgba(0, 0, 0, 0)', 'K9 unknown fallback color set');
    console.log('K9 tile-fallback-colour OK');

    // K10: no-console-errors
    assert.deepStrictEqual(pageErrors, [], 'K10 no page errors');
    assert.deepStrictEqual(consoleErrors, [], 'K10 no console errors');
    console.log('K10 no-console-errors OK');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
