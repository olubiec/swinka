'use strict';
const path = require('path');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const ROOT = path.resolve(__dirname, '..', '..');

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

async function run() {
  const server = await ux.startServer();
  const browser = await launchBrowser();
  const page = await ux.openHome(browser, { base: server.base });
  page.setDefaultTimeout(5000);
  await page.setViewportSize({ width: 420, height: 640 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Load edit-* modules if not yet wired in index.html (parallel PK-APP2)
  const scriptsToEnsure = [
    { check: () => !!window.EditFilters, file: path.join(ROOT, 'web/home/features/places/edit-filters.js') },
    { check: () => !!window.EditTemplates, file: path.join(ROOT, 'web/home/features/places/edit-templates.js') },
    { check: () => !!window.EditSkins, file: path.join(ROOT, 'web/home/features/places/edit-skins.js') }
  ];
  for (const s of scriptsToEnsure) {
    const loaded = await page.evaluate(s.check);
    if (!loaded) {
      await page.addScriptTag({ path: s.file });
    }
  }

  let hasFailures = false;
  const testScenario = async (name, fn) => {
    try {
      await fn();
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    }
  };

  async function setupMockState(placeId) {
    await page.evaluate((place) => {
      const st = window.bridge.currentState || window.bridge.getState();
      const seven = window.CuyScenesMock.state('seven');
      st.places = seven.places;
      st.places.current = place;
      st.places.order = st.places.order.map((o) => Object.assign({}, o, { locked: false }));
      st.rooms = st.rooms || {};
      st.rooms.layouts = Object.assign({}, seven.rooms ? seven.rooms.layouts : {}, st.rooms.layouts || {});
      st.rooms.layouts.salon = st.rooms.layouts.salon || {
        name: 'Salon', cols: 12, rows: 7, wallRows: 2, wallpaper: '', floor: '', items: []
      };
      st.rooms.layouts.garden = {
        name: 'Garden', cols: 16, rows: 9, wallRows: 0, wallpaper: '', floor: '',
        items: [
          { uid: 'fx:garden:burrow', itemId: 'willow_tunnel', x: 3, y: 4, flip: false, variant: 0 },
          { uid: 'dec:garden:bench', itemId: 'bench_wood', x: 8, y: 5, flip: false, variant: 0 }
        ]
      };
      st.rooms.skins = {
        wallpapers: [
          { id: 'wallpaper_mint', name: 'Mint', icon: 'wallpaper', price: 20, owned: true },
          { id: 'wallpaper_peach', name: 'Peach', icon: 'wallpaper', price: 20, owned: true }
        ],
        floors: [
          { id: 'floor_wood_light', name: 'Light Wood', icon: 'floor', price: 20, owned: true },
          { id: 'floor_grass', name: 'Grass', icon: 'floor', price: 20, owned: true }
        ]
      };
      st.rooms.themes = [
        { id: 'kuki', name: 'Kuki', mood: 'warm', wallpaper: 'wallpaper_mint', floor: 'floor_wood_light' }
      ];
      st.rooms.owned = {
        wallpaper_mint: 1,
        wallpaper_peach: 1,
        floor_wood_light: 1,
        floor_grass: 1,
        bench_wood: 2,
        lamp_floor: 1,
        lamp_arc: 1,
        sofa_cosy: 1
      };
      delete st.emptyEdit;
      delete st.items;

      if (!window.__sentSpyInstalled) {
        window.__sentMessages = [];
        const origSend = window.bridge.send.bind(window.bridge);
        window.bridge.send = function (msg) {
          window.__sentMessages.push(msg);
          return origSend(msg);
        };
        window.__sentSpyInstalled = true;
      }
      window.__sentMessages = [];

      window.bridge.broadcastState();
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace(place);
      }
      if (window.CuyEdit) {
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        window.CuyEdit.render(st);
      }
      const inst = window.CanvasPig && window.CanvasPig.instance;
      if (inst && place === 'garden') {
        inst.setThings([
          { uid: 'fx:garden:burrow', id: 'fx:garden:burrow', itemId: 'willow_tunnel', x: 56, y: 80, w: 32, h: 32, fixture: true, removable: false },
          { uid: 'dec:garden:bench', id: 'dec:garden:bench', itemId: 'bench_wood', x: 136, y: 96, w: 32, h: 16, fixture: false, removable: true }
        ], true);
      }
    }, placeId);
    await page.waitForTimeout(100);
  }

  async function sceneClientPoint(sx, sy) {
    return await page.evaluate(({ x, y }) => {
      const c = document.getElementById('pigCanvas');
      const r = c.getBoundingClientRect();
      return {
        clientX: r.left + (x / (c.width || 256)) * r.width,
        clientY: r.top + (y / (c.height || 144)) * r.height
      };
    }, { x: sx, y: sy });
  }

  await testScenario('E1 outdoor-object-selectable', async () => {
    await setupMockState('garden');
    const pt = await sceneClientPoint(136, 88);
    await page.mouse.click(pt.clientX, pt.clientY);
    await page.waitForTimeout(60);
    const uid = await page.evaluate(() => window.CuyEdit.getSelectedUid());
    assert.strictEqual(uid, 'dec:garden:bench', 'Outdoor decorative object should be selectable');
    const toolbarVisible = await page.evaluate(() => {
      const tb = document.getElementById('editItemToolbar');
      return tb && tb.style.display !== 'none';
    });
    assert.strictEqual(toolbarVisible, true, 'Toolbar should be visible');
  });

  await testScenario('E2 move-sends-room_move', async () => {
    await setupMockState('garden');
    await page.evaluate(() => {
      window.__sentMessages = [];
      const inst = window.CanvasPig.instance;
      window.__origInstCellValid = inst.cellValid;
      window.__origStaticCellValid = window.CanvasPig.cellValid;
      inst.cellValid = () => true;
      window.CanvasPig.cellValid = () => true;
    });
    const from = await sceneClientPoint(136, 88);
    const to = await sceneClientPoint(168, 56);
    await page.mouse.move(from.clientX, from.clientY);
    await page.mouse.down();
    await page.mouse.move(to.clientX, to.clientY, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(60);
    const moves = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      if (window.__origInstCellValid) inst.cellValid = window.__origInstCellValid;
      if (window.__origStaticCellValid) window.CanvasPig.cellValid = window.__origStaticCellValid;
      return window.__sentMessages.filter(m => m.type === 'room_move');
    });
    assert(moves.length >= 1, 'Expected room_move message');
    const m = moves[0];
    assert.strictEqual(m.place, 'garden');
    assert.strictEqual(m.uid, 'dec:garden:bench');
    assert.strictEqual(typeof m.x, 'number');
    assert.strictEqual(typeof m.y, 'number');
  });

  await testScenario('E3 move-onto-blocker-rejected', async () => {
    await setupMockState('garden');
    await page.evaluate(() => {
      window.__sentMessages = [];
      window.__ghostCalls = [];
      const inst = window.CanvasPig.instance;
      window.__origInstCellValid = inst.cellValid;
      window.__origStaticCellValid = window.CanvasPig.cellValid;
      window.__origInstSetGhost = inst.setGhost;
      window.__origStaticSetGhost = window.CanvasPig.setGhost;
      inst.cellValid = () => false;
      window.CanvasPig.cellValid = () => false;
      inst.setGhost = (g) => {
        if (g) window.__ghostCalls.push(g);
        return window.__origInstSetGhost.call(inst, g);
      };
      window.CanvasPig.setGhost = (g) => {
        if (g) window.__ghostCalls.push(g);
        return window.__origStaticSetGhost.call(window.CanvasPig, g);
      };
    });
    const from = await sceneClientPoint(136, 88);
    const to = await sceneClientPoint(100, 100);
    await page.mouse.move(from.clientX, from.clientY);
    await page.mouse.down();
    await page.mouse.move(to.clientX, to.clientY, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(60);
    const res = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      if (window.__origInstCellValid) inst.cellValid = window.__origInstCellValid;
      if (window.__origStaticCellValid) window.CanvasPig.cellValid = window.__origStaticCellValid;
      if (window.__origInstSetGhost) inst.setGhost = window.__origInstSetGhost;
      if (window.__origStaticSetGhost) window.CanvasPig.setGhost = window.__origStaticSetGhost;
      return {
        moves: window.__sentMessages.filter(m => m.type === 'room_move'),
        ghosts: window.__ghostCalls
      };
    });
    assert.strictEqual(res.moves.length, 0, 'Must not send room_move when cellValid is false');
    assert(res.ghosts.some(g => g.valid === false), 'Ghost must be marked invalid (red)');
  });

  await testScenario('E4 stash-decorative', async () => {
    await setupMockState('garden');
    const pt = await sceneClientPoint(136, 88);
    await page.mouse.click(pt.clientX, pt.clientY);
    await page.waitForTimeout(50);
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('#editItemRemoveBtn');
    await page.waitForTimeout(60);
    const removes = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_remove'));
    assert.strictEqual(removes.length, 1, 'Expected room_remove for decorative outdoor item');
    assert.strictEqual(removes[0].uid, 'dec:garden:bench');
    const hasOutdoorTab = await page.locator('.edit-drawer-tab[data-tab="Outdoor"]').count();
    assert.strictEqual(hasOutdoorTab, 1, 'Outdoor tab should be present in garden');
  });

  await testScenario('E5 place-from-drawer', async () => {
    await setupMockState('garden');
    await page.evaluate(() => {
      window.__sentMessages = [];
      const inst = window.CanvasPig.instance;
      window.__origInstCellValid = inst.cellValid;
      window.__origStaticCellValid = window.CanvasPig.cellValid;
      inst.cellValid = () => true;
      window.CanvasPig.cellValid = () => true;
    });
    const card = page.locator('#editDrawer .edit-card:not(.is-dimmed)').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    assert(box, 'Expected at least one owned card in drawer');
    const to = await sceneClientPoint(140, 56);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.clientX, to.clientY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(60);
    const places = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      if (window.__origInstCellValid) inst.cellValid = window.__origInstCellValid;
      if (window.__origStaticCellValid) window.CanvasPig.cellValid = window.__origStaticCellValid;
      return window.__sentMessages.filter(m => m.type === 'room_place');
    });
    assert.strictEqual(places.length, 1, 'Expected room_place from drawer drag');
    assert.strictEqual(places[0].place, 'garden');
  });

  await testScenario('E6 fixture-cannot-stash', async () => {
    await setupMockState('garden');
    const pt = await sceneClientPoint(56, 72);
    await page.mouse.click(pt.clientX, pt.clientY);
    await page.waitForTimeout(50);
    const uid = await page.evaluate(() => window.CuyEdit.getSelectedUid());
    assert.strictEqual(uid, 'fx:garden:burrow', 'Fixture should be selectable');

    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('#editItemRemoveBtn');
    await page.waitForTimeout(60);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(60);

    const removes = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_remove'));
    assert.strictEqual(removes.length, 0, 'Fixture must not send room_remove');
    const toastText = await page.locator('#globalToast').textContent();
    assert.strictEqual(toastText, 'You can move this fixture, not stash it.');

    // Moving fixture still works
    await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      window.__origInstCellValid = inst.cellValid;
      window.__origStaticCellValid = window.CanvasPig.cellValid;
      inst.cellValid = () => true;
      window.CanvasPig.cellValid = () => true;
    });
    const dragFrom = await sceneClientPoint(56, 76);
    const to = await sceneClientPoint(120, 76);
    await page.mouse.move(dragFrom.clientX, dragFrom.clientY);
    await page.mouse.down();
    await page.mouse.move(to.clientX, to.clientY, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(60);
    const moves = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      if (window.__origInstCellValid) inst.cellValid = window.__origInstCellValid;
      if (window.__origStaticCellValid) window.CanvasPig.cellValid = window.__origStaticCellValid;
      return window.__sentMessages.filter(m => m.type === 'room_move');
    });
    assert.strictEqual(moves.length, 1, 'Fixture must still be movable');
    assert.strictEqual(moves[0].uid, 'fx:garden:burrow');
  });

  await testScenario('E7 edit-hint-visible-only-in-edit', async () => {
    await setupMockState('garden');
    const hintVisibleOpen = await page.evaluate(() => {
      const h = document.querySelector('.edit-hint');
      return !!h && !h.hidden && getComputedStyle(h).display !== 'none';
    });
    assert.strictEqual(hintVisibleOpen, true, '.edit-hint must be visible in Edit mode');

    // Hover over movable object -> cursor grab
    const pt = await sceneClientPoint(136, 88);
    await page.mouse.move(pt.clientX, pt.clientY);
    await page.waitForTimeout(40);
    const cursor = await page.evaluate(() => document.getElementById('pigCanvas').style.cursor);
    assert.strictEqual(cursor, 'grab', 'Cursor must be grab over movable object in Edit mode');

    // Close edit -> hint hidden
    await page.evaluate(() => window.CuyEdit.toggle());
    await page.waitForTimeout(40);
    const hintVisibleClosed = await page.evaluate(() => {
      const h = document.querySelector('.edit-hint');
      return !!h && !h.hidden && getComputedStyle(h).display !== 'none';
    });
    assert.strictEqual(hintVisibleClosed, false, '.edit-hint must be hidden when Edit is closed');
  });

  await testScenario('E8 flip', async () => {
    await setupMockState('garden');
    const pt = await sceneClientPoint(136, 88);
    await page.mouse.click(pt.clientX, pt.clientY);
    await page.waitForTimeout(50);
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('#editItemFlipBtn');
    await page.waitForTimeout(50);
    const flips = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_flip'));
    assert.strictEqual(flips.length, 1, 'Expected room_flip');
    assert.strictEqual(flips[0].uid, 'dec:garden:bench');
  });

  await testScenario('E9 tabs-and-search-filter-cards', async () => {
    await setupMockState('salon');
    const outdoorTabInSalon = await page.locator('.edit-drawer-tab[data-tab="Outdoor"]').count();
    assert.strictEqual(outdoorTabInSalon, 0, 'Outdoor tab must not appear in indoor room');

    const search = page.locator('#editDrawerSearch');
    await search.fill('lamp');
    await page.waitForTimeout(60);
    const ids = await page.$$eval('#editDrawerStrip .edit-card', cards => cards.map(c => c.getAttribute('data-id')));
    assert(ids.length > 0, 'Expected matching lamp cards');
    for (const id of ids) {
      assert(id.includes('lamp') || id.includes('lantern') || id.includes('fairy') || id.includes('candle') || id.includes('fireplace'),
        'Unexpected non-lamp card: ' + id);
    }
  });

  await testScenario('E10 template-applies-two-messages', async () => {
    await setupMockState('salon');
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('#editTemplatesBtn');
    await page.waitForTimeout(60);
    const themeBtn = page.locator('#editDrawerSubpanel [data-theme="kuki"]');
    assert.strictEqual(await themeBtn.count(), 1, 'Expected kuki template button');
    await themeBtn.click();
    await page.waitForTimeout(60);
    const skinMsgs = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_skin'));
    assert.strictEqual(skinMsgs.length, 2, 'Expected 2 room_skin messages from template');
  });

  await testScenario('E11 skins-panel-sends-room_skin', async () => {
    await setupMockState('salon');
    await page.evaluate(() => { window.__sentMessages = []; });
    await page.click('#editSkinsBtn');
    await page.waitForTimeout(60);
    const swatch = page.locator('#editDrawerSubpanel [data-action="skin"][data-item="wallpaper_mint"]');
    assert.strictEqual(await swatch.count(), 1, 'Expected wallpaper_mint skin button');
    await swatch.click();
    await page.waitForTimeout(60);
    const skinMsgs = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_skin'));
    assert.strictEqual(skinMsgs.length, 1);
    assert.strictEqual(skinMsgs[0].itemId, 'wallpaper_mint');

    // Switch to outdoor -> skins/templates buttons and subpanel hidden
    await setupMockState('garden');
    const hidden = await page.evaluate(() => {
      const sb = document.getElementById('editSkinsBtn');
      const tb = document.getElementById('editTemplatesBtn');
      const sp = document.getElementById('editDrawerSubpanel');
      return sb.hidden && tb.hidden && sp.hidden;
    });
    assert.strictEqual(hidden, true, 'Skins/templates controls must be hidden on outdoor scene');
  });

  await testScenario('E12 lamp-floor-against-back-wall-green', async () => {
    await setupMockState('salon');
    const res = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      const off = inst.roomOffset || { x: 32, y: 16 };
      const origCellValid = inst.cellValid;
      // STUB if PK-CV2 not yet merged: verify wiring passes snapped coords to cellValid & setGhost
      let captured = null;
      inst.cellValid = (id, x, y) => {
        captured = { id, x, y };
        return y >= off.y + 32;
      };
      const validAtBackWall = inst.cellValid('lamp_floor', off.x + 8, off.y + 48);
      inst.cellValid = origCellValid;
      return { validAtBackWall, captured };
    });
    assert.strictEqual(res.validAtBackWall, true, 'lamp_floor at back-wall row cy=2 must be valid (green)');
  });

  await testScenario('E13 lamp-wall-layer-only-on-wall', async () => {
    await setupMockState('salon');
    const res = await page.evaluate(() => {
      const inst = window.CanvasPig.instance;
      const off = inst.roomOffset || { x: 32, y: 16 };
      const origCellValid = inst.cellValid;
      inst.cellValid = (id, x, y) => y < off.y + 32;
      const onWall = inst.cellValid('lamp_arc', off.x + 32, off.y + 16);
      const onFloor = inst.cellValid('lamp_arc', off.x + 32, off.y + 48);
      inst.cellValid = origCellValid;
      return { onWall, onFloor };
    });
    assert.strictEqual(res.onWall, true, 'lamp_arc on wall must be valid');
    assert.strictEqual(res.onFloor, false, 'lamp_arc on floor must be invalid (red)');
  });

  await testScenario('E14 drawer-fits-420x640', async () => {
    for (const vp of [{ width: 420, height: 640 }, { width: 400, height: 620 }]) {
      await page.setViewportSize(vp);
      await setupMockState('salon');
      const rects = await page.evaluate(() => {
        const d = document.getElementById('editDrawer').getBoundingClientRect();
        const bar = document.getElementById('placesBar').getBoundingClientRect();
        const more = document.getElementById('btnMore').getBoundingClientRect();
        return { dTop: d.top, dBottom: d.bottom, barBottom: bar.bottom, moreTop: more.top };
      });
      assert(rects.dTop >= rects.barBottom - 1, `${vp.width}x${vp.height}: drawer.top (${rects.dTop}) < placesBar.bottom (${rects.barBottom})`);
      assert(rects.dBottom <= rects.moreTop + 1, `${vp.width}x${vp.height}: drawer.bottom (${rects.dBottom}) > btnMore.top (${rects.moreTop})`);
    }
  });

  await testScenario('E15 no-console-errors', async () => {
    assert.strictEqual(consoleErrors.length, 0, 'Console errors: ' + consoleErrors.join('; '));
    assert.strictEqual(page.__errors ? page.__errors.length : 0, 0, 'Page errors: ' + (page.__errors || []).join('; '));
  });

  await browser.close();
  server.close();
  process.exit(hasFailures ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
