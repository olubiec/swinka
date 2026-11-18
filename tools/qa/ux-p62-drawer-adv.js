'use strict';
const path = require('path');
const fs = require('fs');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const ROOT = path.resolve(__dirname, '..', '..');
const EditFilters = require(path.join(ROOT, 'web/home/features/places/edit-filters.js'));
const EditTemplates = require(path.join(ROOT, 'web/home/features/places/edit-templates.js'));
const EditSkins = require(path.join(ROOT, 'web/home/features/places/edit-skins.js'));
const worldItemsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/world_items.json'), 'utf8'));

const defects = [];
const skips = [];
const defectDetails = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push(id);
    defectDetails.push({ id, msg });
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push(id);
  console.log('SKIP ' + id + ': ' + reason);
}

const LISTENER_TRACKER_INIT = `
(function () {
  var active = new Set();
  var origAdd = EventTarget.prototype.addEventListener;
  var origRem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (fn) active.add({ target: this, type: type, fn: fn });
    return origAdd.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    if (fn) {
      active.forEach(function (entry) {
        if (entry.target === this && entry.type === type && entry.fn === fn) {
          active.delete(entry);
        }
      }, this);
    }
    return origRem.call(this, type, fn, opts);
  };
  window.__connectedListenerCount = function () {
    var count = 0;
    active.forEach(function (entry) {
      var t = entry.target;
      if (t === window || t === document) {
        count++;
      } else if (t && typeof t.isConnected === 'boolean') {
        if (t.isConnected) count++;
      }
    });
    return count;
  };
})();
`;

async function run() {
  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  try {
    const page = await ux.openHome(browser);
    await page.addInitScript(LISTENER_TRACKER_INIT);
    await page.reload();
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 10,
      { timeout: 10000 }
    );
    await page.waitForTimeout(400);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(150);
    }

    await page.setViewportSize({ width: 420, height: 640 });

    // Setup clean state with 'seven' all unlocked
    await page.evaluate(async () => {
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
      if (window.CuyEdit && typeof window.CuyEdit.loadWorldItems === 'function') {
        await window.CuyEdit.loadWorldItems();
      }
      if (window.CuyEdit && typeof window.CuyEdit.loadAtlas === 'function') {
        await window.CuyEdit.loadAtlas();
      }
      if (window.CuyEdit && typeof window.CuyEdit.loadPlacesData === 'function') {
        await window.CuyEdit.loadPlacesData();
      }
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
      st.places.order.forEach(p => { p.locked = false; });
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      Object.assign(st.rooms.layouts, m.rooms.layouts);
      if (!st.rooms.layouts.salon) {
        st.rooms.layouts.salon = {
          name: 'Salon',
          cols: 12,
          rows: 7,
          wallRows: 2,
          wallpaper: '',
          floor: '',
          items: [
            { uid: 'item_sofa_1', itemId: 'sofa_cosy', x: 4, y: 4, flip: false, variant: 0 }
          ]
        };
      }
      st.rooms.skins = {
        wallpapers: [
          { id: 'wallpaper_mint', name: 'Mint Wallpaper', icon: 'wallpaper', price: 100, owned: true },
          { id: 'wallpaper_peach', name: 'Peach Wallpaper', icon: 'wallpaper', price: 100, owned: false },
          { id: 'wallpaper_night', name: 'Night Wallpaper', icon: 'wallpaper', price: 120, owned: true }
        ],
        floors: [
          { id: 'floor_wood_light', name: 'Light Wood Floor', icon: 'floor', price: 100, owned: true },
          { id: 'floor_carpet_red', name: 'Red Carpet', icon: 'floor', price: 120, owned: false },
          { id: 'floor_tiles_checker', name: 'Checker Tiles', icon: 'floor', price: 110, owned: true }
        ]
      };
      st.rooms.owned = {
        wallpaper_mint: 1,
        wallpaper_night: 1,
        floor_wood_light: 1,
        floor_tiles_checker: 1,
        sofa_cosy: 2,
        armchair: 1,
        lamp_floor: 2,
        lamp_mushroom: 1,
        plant_fern: 2,
        bench_wood: 2,
        bird_bath: 1,
        flowerbed_tulip: 1
      };
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(200);

    // =========================================================================
    // D1: tab counts add up to All (no item lost or counted twice)
    // =========================================================================
    {
      const allCatalog = worldItemsJson.items || [];
      const edgeItems = [
        ...allCatalog,
        { id: 'unknown_weird_1', name: 'Weird 1', layer: 'floor' },
        { id: 'lamp_custom_99', name: 'Custom Lamp', layer: 'wall' },
        { id: 'plant_cactus_99', name: 'Cactus', layer: 'floor' },
        { id: 'sofa_luxury', name: 'Luxury Sofa', layer: 'wall' }, // wall layer with sofa_ prefix -> should be Decor, not double counted
        { id: '', name: 'Empty ID' },
        { itemId: 'bench_outdoor_test', name: 'Outdoor Bench', layer: 'floor' }
      ];
      const tabRes = EditFilters.tabs(edgeItems);
      const allEntry = tabRes.find(t => t.id === 'All');
      const catSum = tabRes.filter(t => t.id !== 'All').reduce((acc, t) => acc + t.count, 0);

      // Also check DOM tab counts in salon and garden
      const domCountsOk = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        const parseTabs = () => {
          const btns = Array.from(document.querySelectorAll('#editDrawerFilters .edit-drawer-tab'));
          const map = {};
          btns.forEach(b => {
            const tab = b.getAttribute('data-tab');
            const m = (b.textContent || '').match(/\((\d+)\)/);
            map[tab] = m ? parseInt(m[1], 10) : -1;
          });
          return map;
        };
        const salonMap = parseTabs();
        const salonSum = (salonMap.Furniture || 0) + (salonMap.Lights || 0) + (salonMap.Plants || 0) + (salonMap.Decor || 0);
        const salonOk = salonMap.All > 0 && salonSum === salonMap.All;

        window.CuyPlaces.openPlace('garden');
        const gardenMap = parseTabs();
        const gardenSum = (gardenMap.Furniture || 0) + (gardenMap.Lights || 0) + (gardenMap.Plants || 0) + (gardenMap.Decor || 0);
        const gardenOk = gardenMap.All > 0 && gardenSum === gardenMap.All;

        window.CuyPlaces.openPlace('salon');
        return { salonOk, gardenOk, salonMap, gardenMap };
      });

      const d1Cond = allEntry && allEntry.count === edgeItems.length && catSum === allEntry.count && domCountsOk.salonOk && domCountsOk.gardenOk;
      check('D1', d1Cond, `Tab counts mismatch: pure All=${allEntry && allEntry.count} sum=${catSum} len=${edgeItems.length}; DOM=${JSON.stringify(domCountsOk)}`);
    }

    // =========================================================================
    // D2: search is case-insensitive, trims spaces, matches id and name, empty result shows the message, clearing restores the list
    // =========================================================================
    {
      const sample = [
        { id: 'sofa_cosy', name: 'Cosy sofa', layer: 'floor' },
        { id: 'lamp_mushroom', name: 'Mushroom Lamp', layer: 'floor' },
        { id: 'plant_fern', name: 'Lush Fern', layer: 'floor' }
      ];
      const byNameUpper = EditFilters.filterItems(sample, { tab: 'All', query: '  COSY SOFA  ' });
      const byIdMixed = EditFilters.filterItems(sample, { tab: 'All', query: '   LaMp_MuShRoOm ' });
      const emptyPure = EditFilters.filterItems(sample, { tab: 'All', query: '   __nonexistent_xyz__  ' });
      const clearedPure = EditFilters.filterItems(sample, { tab: 'All', query: '   ' });

      const domD2 = await page.evaluate((emptyMsg) => {
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        const strip = document.getElementById('editDrawerStrip');
        const totalCards = strip.querySelectorAll('.edit-card').length;

        const fireQuery = (q) => {
          const inp = document.getElementById('editDrawerSearch');
          inp.focus();
          inp.value = q;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        };

        // Match by name with spaces & uppercase
        fireQuery('  COSY SOFA  ');
        const nameCards = Array.from(strip.querySelectorAll('.edit-card')).map(c => c.getAttribute('data-id'));

        // Match by id with mixed case & spaces
        fireQuery('  SOFA_COSY  ');
        const idCards = Array.from(strip.querySelectorAll('.edit-card')).map(c => c.getAttribute('data-id'));

        // Empty result shows EMPTY_MESSAGE
        fireQuery('___no_such_item_999___');
        const emptyCards = strip.querySelectorAll('.edit-card').length;
        const emptyEl = strip.querySelector('.edit-drawer-empty');
        const emptyText = emptyEl ? emptyEl.textContent.trim() : '';

        // Clearing restores full list
        fireQuery('');
        const restoredCards = strip.querySelectorAll('.edit-card').length;

        return {
          totalCards,
          nameMatch: nameCards.includes('sofa_cosy') && nameCards.length >= 1,
          idMatch: idCards.includes('sofa_cosy') && idCards.length === 1,
          emptyCards,
          emptyText,
          emptyMsgMatches: emptyText === emptyMsg,
          restoredOk: restoredCards === totalCards && totalCards > 0
        };
      }, EditFilters.EMPTY_MESSAGE);

      const d2Cond = byNameUpper.length === 1 && byNameUpper[0].id === 'sofa_cosy' &&
        byIdMixed.length === 1 && byIdMixed[0].id === 'lamp_mushroom' &&
        emptyPure.length === 0 &&
        clearedPure.length === 3 &&
        domD2.nameMatch && domD2.idMatch && domD2.emptyCards === 0 && domD2.emptyMsgMatches && domD2.restoredOk;

      check('D2', d2Cond, `Search check failed: pure=[${byNameUpper.length},${byIdMixed.length},${emptyPure.length},${clearedPure.length}] dom=${JSON.stringify(domD2)}`);
    }

    // =========================================================================
    // D3: tab plus search combined, switching tab keeps the query
    // =========================================================================
    {
      const d3Res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        const strip = document.getElementById('editDrawerStrip');
        const inp = document.getElementById('editDrawerSearch');
        inp.focus();
        inp.value = 'lamp';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.blur();

        // Click Lights tab
        const lightsTab = document.querySelector('#editDrawerFilters .edit-drawer-tab[data-tab="Lights"]');
        lightsTab.click();
        const lightsCards = Array.from(strip.querySelectorAll('.edit-card')).map(c => c.getAttribute('data-id'));
        const queryAfterLights = document.getElementById('editDrawerSearch').value;

        // Switch to Plants tab -> query 'lamp' should remain, and Plants + 'lamp' should yield 0 items
        const plantsTab = document.querySelector('#editDrawerFilters .edit-drawer-tab[data-tab="Plants"]');
        plantsTab.click();
        const plantsCards = strip.querySelectorAll('.edit-card').length;
        const queryAfterPlants = document.getElementById('editDrawerSearch').value;

        // Reset back to All & empty query
        const allTab = document.querySelector('#editDrawerFilters .edit-drawer-tab[data-tab="All"]');
        if (allTab) allTab.click();
        const inp2 = document.getElementById('editDrawerSearch');
        inp2.value = '';
        inp2.dispatchEvent(new Event('input', { bubbles: true }));

        return {
          lightsCount: lightsCards.length,
          allLightsMatchLamp: lightsCards.every(id => id.includes('lamp')),
          queryAfterLights,
          plantsCards,
          queryAfterPlants
        };
      });

      const d3Cond = d3Res.lightsCount > 0 && d3Res.allLightsMatchLamp &&
        d3Res.queryAfterLights === 'lamp' &&
        d3Res.plantsCards === 0 &&
        d3Res.queryAfterPlants === 'lamp';
      check('D3', d3Cond, `Tab + search failed: ${JSON.stringify(d3Res)}`);
    }

    // =========================================================================
    // D4: Outdoor tab only in outdoor scenes and indoor items only in rooms; a house-only item never appears in the garden drawer
    // =========================================================================
    {
      const d4Res = await page.evaluate(() => {
        const indoorScenes = ['salon', 'pig:pig_1', 'dorm'];
        const outdoorScenes = ['garden', 'park', 'farm', 'market'];
        const houseOnlyIds = ['sofa_cosy', 'armchair', 'bookshelf', 'side_table', 'hay_bar_wood'];

        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();

        let outdoorTabInIndoor = false;
        let outdoorItemInIndoor = false;
        for (const s of indoorScenes) {
          window.CuyPlaces.openPlace(s);
          if (document.querySelector('#editDrawerFilters [data-tab="Outdoor"]')) {
            outdoorTabInIndoor = true;
          }
          const items = window.CuyEdit.itemsFor(window.bridge.currentState, s);
          if (items.some(it => it.kind === 'outdoor')) {
            outdoorItemInIndoor = true;
          }
        }

        let missingOutdoorTabInOutdoor = false;
        let indoorItemInOutdoor = false;
        let houseItemInGardenDom = false;
        for (const s of outdoorScenes) {
          window.CuyPlaces.openPlace(s);
          if (!document.querySelector('#editDrawerFilters [data-tab="Outdoor"]')) {
            missingOutdoorTabInOutdoor = true;
          }
          const items = window.CuyEdit.itemsFor(window.bridge.currentState, s);
          if (items.some(it => it.kind === 'indoor' || houseOnlyIds.includes(it.id))) {
            indoorItemInOutdoor = true;
          }
          if (s === 'garden') {
            const cardIds = Array.from(document.querySelectorAll('#editDrawerStrip .edit-card')).map(c => c.getAttribute('data-id'));
            if (cardIds.some(id => houseOnlyIds.includes(id))) {
              houseItemInGardenDom = true;
            }
          }
        }

        window.CuyPlaces.openPlace('salon');
        return {
          outdoorTabInIndoor,
          outdoorItemInIndoor,
          missingOutdoorTabInOutdoor,
          indoorItemInOutdoor,
          houseItemInGardenDom
        };
      });

      const d4Cond = !d4Res.outdoorTabInIndoor && !d4Res.outdoorItemInIndoor &&
        !d4Res.missingOutdoorTabInOutdoor && !d4Res.indoorItemInOutdoor && !d4Res.houseItemInGardenDom;
      check('D4', d4Cond, `Outdoor/Indoor isolation failed: ${JSON.stringify(d4Res)}`);
    }

    // =========================================================================
    // D5: template apply sends exactly two `room_skin` messages and no remove/move; unowned wallpaper blocks with a hint
    // =========================================================================
    {
      const d5Res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();

        const sent = [];
        const origSend = window.bridge.send.bind(window.bridge);
        window.bridge.send = function (msg) {
          sent.push(msg);
          return origSend(msg);
        };

        try {
          const templatesBtn = document.getElementById('editTemplatesBtn');
          if (!templatesBtn) return { err: 'no #editTemplatesBtn' };
          templatesBtn.click();

          const subpanel = document.getElementById('editDrawerSubpanel');
          const kukiBtn = subpanel.querySelector('[data-theme="kuki"]'); // kuki: wallpaper_mint + floor_wood_light (both owned)
          const nedBtn = subpanel.querySelector('[data-theme="ned"]');   // ned: wallpaper_peach (unowned) + floor_carpet_red (unowned)

          if (!kukiBtn || !nedBtn) return { err: 'missing theme buttons' };

          const nedDisabled = nedBtn.disabled;
          const nedHint = nedBtn.title || '';
          // Attempt click on disabled unowned template
          nedBtn.click();
          const sentAfterNed = sent.length;

          // Click owned template 'kuki'
          kukiBtn.click();
          const kukiMsgs = sent.slice();

          // Close templates subpanel
          templatesBtn.click();

          return {
            nedDisabled,
            nedHint,
            sentAfterNed,
            kukiMsgs
          };
        } finally {
          window.bridge.send = origSend;
        }
      });

      const msgs = d5Res.kukiMsgs || [];
      const exactlyTwoRoomSkin = msgs.length === 2 &&
        msgs[0].type === 'room_skin' && msgs[0].room === 'salon' && msgs[0].slot === 'wallpaper' && msgs[0].itemId === 'wallpaper_mint' &&
        msgs[1].type === 'room_skin' && msgs[1].room === 'salon' && msgs[1].slot === 'floor' && msgs[1].itemId === 'floor_wood_light';
      const noRemoveOrMove = !msgs.some(m => m.type === 'room_remove' || m.type === 'room_move');
      const unownedBlockedWithHint = d5Res.nedDisabled === true && d5Res.sentAfterNed === 0 && /buy .* in the shop/i.test(d5Res.nedHint || '');

      const d5Cond = !d5Res.err && exactlyTwoRoomSkin && noRemoveOrMove && unownedBlockedWithHint;
      check('D5', d5Cond, `Template apply check failed: ${JSON.stringify(d5Res)}`);
    }

    // =========================================================================
    // D6: skins panel: owned wallpaper and floor listed, click sends `room_skin`, Default sends empty itemId, hidden outdoors
    // =========================================================================
    {
      const d6Res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();

        const sent = [];
        const origSend = window.bridge.send.bind(window.bridge);
        window.bridge.send = function (msg) {
          sent.push(msg);
          return origSend(msg);
        };

        try {
          const skinsBtn = document.getElementById('editSkinsBtn');
          if (!skinsBtn) return { err: 'no #editSkinsBtn' };
          skinsBtn.click();

          const subpanel = document.getElementById('editDrawerSubpanel');
          const visibleIndoor = !subpanel.hidden && !skinsBtn.hidden;

          const wallBtns = Array.from(subpanel.querySelectorAll('[data-slot="wallpaper"][data-action="skin"]')).map(b => b.getAttribute('data-item'));
          const floorBtns = Array.from(subpanel.querySelectorAll('[data-slot="floor"][data-action="skin"]')).map(b => b.getAttribute('data-item'));

          // Click owned wallpaper
          const mintBtn = subpanel.querySelector('[data-slot="wallpaper"][data-item="wallpaper_mint"]');
          if (mintBtn) mintBtn.click();

          // Click Default wallpaper
          const defWallBtn = subpanel.querySelector('[data-slot="wallpaper"][data-item=""]');
          if (defWallBtn) defWallBtn.click();

          // Click owned floor
          const woodBtn = subpanel.querySelector('[data-slot="floor"][data-item="floor_wood_light"]');
          if (woodBtn) woodBtn.click();

          // Switch to outdoor ('garden') and check if skinsBtn & subpanel are hidden
          window.CuyPlaces.openPlace('garden');
          const hiddenOutdoor = skinsBtn.hidden && subpanel.hidden;

          window.CuyPlaces.openPlace('salon');
          return {
            visibleIndoor,
            wallBtns,
            floorBtns,
            sent,
            hiddenOutdoor
          };
        } finally {
          window.bridge.send = origSend;
        }
      });

      const wallsOk = Array.isArray(d6Res.wallBtns) &&
        d6Res.wallBtns.includes('') &&
        d6Res.wallBtns.includes('wallpaper_mint') &&
        d6Res.wallBtns.includes('wallpaper_night') &&
        !d6Res.wallBtns.includes('wallpaper_peach');
      const floorsOk = Array.isArray(d6Res.floorBtns) &&
        d6Res.floorBtns.includes('') &&
        d6Res.floorBtns.includes('floor_wood_light') &&
        d6Res.floorBtns.includes('floor_tiles_checker') &&
        !d6Res.floorBtns.includes('floor_carpet_red');
      const sentMsgs = d6Res.sent || [];
      const sentOk = sentMsgs.length === 3 &&
        sentMsgs[0].type === 'room_skin' && sentMsgs[0].slot === 'wallpaper' && sentMsgs[0].itemId === 'wallpaper_mint' &&
        sentMsgs[1].type === 'room_skin' && sentMsgs[1].slot === 'wallpaper' && sentMsgs[1].itemId === '' &&
        sentMsgs[2].type === 'room_skin' && sentMsgs[2].slot === 'floor' && sentMsgs[2].itemId === 'floor_wood_light';

      const d6Cond = !d6Res.err && d6Res.visibleIndoor && wallsOk && floorsOk && sentOk && d6Res.hiddenOutdoor;
      check('D6', d6Cond, `Skins panel check failed: ${JSON.stringify(d6Res)}`);
    }

    // =========================================================================
    // D7: fixture (stall, plot) stash disabled with a toast, move works
    // =========================================================================
    {
      const d7Res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('market');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();

        const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
        if (!inst) return { err: 'no CanvasPig instance' };

        // Ensure market has a fixture stall in inst.things
        let fxThing = (inst.things || []).find(t => String(t.uid || t.id || '').startsWith('fx:'));
        if (!fxThing) {
          fxThing = { uid: 'fx:market:stall_left', id: 'fx:market:stall_left', itemId: 'stall_basic', x: 40, y: 90, w: 32, h: 32, fixture: true };
          inst.things = inst.things || [];
          inst.things.push(fxThing);
        }
        const fxUid = fxThing.uid || fxThing.id;

        const sent = [];
        const toasts = [];
        const origSend = window.bridge.send.bind(window.bridge);
        const origDispatch = window.bridge.dispatchMessage ? window.bridge.dispatchMessage.bind(window.bridge) : null;
        window.bridge.send = function (msg) {
          sent.push(msg);
          return origSend(msg);
        };
        if (origDispatch) {
          window.bridge.dispatchMessage = function (msg) {
            if (msg && msg.type === 'toast') toasts.push(msg.text);
            return origDispatch(msg);
          };
        }

        try {
          // Select fixture and click remove button
          window.CuyEdit.setSelection(fxUid);
          const removeBtn = document.getElementById('editItemRemoveBtn');
          if (removeBtn) removeBtn.click();

          // Also press Delete key while fixture is selected
          window.CuyEdit.setSelection(fxUid);
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));

          const domToast = document.getElementById('globalToast');
          const domToastText = domToast ? domToast.textContent : '';
          const removeSentCount = sent.filter(m => m.type === 'room_remove').length;

          // Now test moving the fixture on canvas via pointer events (above the drawer so it doesn't hit drawer stash)
          const canvas = document.getElementById('pigCanvas');
          const cRect = canvas.getBoundingClientRect();
          const origPickAt = window.CanvasPig.pickAt;
          const origCellValid = window.CanvasPig.cellValid;
          window.CanvasPig.pickAt = () => fxThing;
          window.CanvasPig.cellValid = () => true;

          try {
            const startX = Math.round(cRect.left + 60);
            const startY = Math.round(cRect.top + 30);
            const endX = startX + 24;
            const endY = startY;
            canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: startX, clientY: startY, button: 0, bubbles: true }));
            document.dispatchEvent(new PointerEvent('pointermove', { clientX: endX, clientY: endY, button: 0, bubbles: true }));
            document.dispatchEvent(new PointerEvent('pointerup', { clientX: endX, clientY: endY, button: 0, bubbles: true }));
          } finally {
            window.CanvasPig.pickAt = origPickAt;
            window.CanvasPig.cellValid = origCellValid;
          }

          const moveMsgs = sent.filter(m => m.type === 'room_move');
          window.CuyPlaces.openPlace('salon');

          return {
            removeSentCount,
            toasts,
            domToastText,
            moveMsgs
          };
        } finally {
          window.bridge.send = origSend;
          if (origDispatch) window.bridge.dispatchMessage = origDispatch;
        }
      });

      const hasToast = (d7Res.toasts && d7Res.toasts.some(t => /fixture|stash/i.test(t))) || /fixture|stash/i.test(d7Res.domToastText || '');
      const moveWorks = Array.isArray(d7Res.moveMsgs) && d7Res.moveMsgs.length === 1 && d7Res.moveMsgs[0].type === 'room_move';
      const d7Cond = !d7Res.err && d7Res.removeSentCount === 0 && hasToast && moveWorks;
      check('D7', d7Cond, `Fixture stash/move failed: ${JSON.stringify(d7Res)}`);
    }

    // =========================================================================
    // D8: Edit hint visible only in Edit mode, cursor `grab` over objects
    // =========================================================================
    {
      const d8Res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        if (window.CuyEdit.isOpen()) window.CuyEdit.toggle();

        const isVisible = (el) => {
          if (!el || el.hidden) return false;
          const st = window.getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };

        const hintEl = document.getElementById('editHint') || document.querySelector('.edit-hint');
        const visibleWhenClosed = isVisible(hintEl);

        // Open Edit mode
        window.CuyEdit.toggle();
        const hintElOpen = document.getElementById('editHint') || document.querySelector('.edit-hint');
        const visibleWhenOpen = isVisible(hintElOpen);

        // Check cursor 'grab' when hovering over an object on canvas vs empty space
        const canvas = document.getElementById('pigCanvas');
        const rect = canvas.getBoundingClientRect();
        const fakeThing = { uid: 'test_obj_1', itemId: 'sofa_cosy', x: 60, y: 60 };
        const origPickAt = window.CanvasPig.pickAt;

        let cursorOverObj = '';
        let cursorOverEmpty = '';
        try {
          window.CanvasPig.pickAt = () => fakeThing;
          document.dispatchEvent(new PointerEvent('pointermove', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            bubbles: true
          }));
          cursorOverObj = canvas.style.cursor;

          window.CanvasPig.pickAt = () => null;
          document.dispatchEvent(new PointerEvent('pointermove', {
            clientX: rect.left + 5,
            clientY: rect.top + 5,
            bubbles: true
          }));
          cursorOverEmpty = canvas.style.cursor;
        } finally {
          window.CanvasPig.pickAt = origPickAt;
        }

        // Close Edit mode and verify hint hides and cursor resets
        window.CuyEdit.toggle();
        const visibleAfterClose = isVisible(hintElOpen);
        const cursorAfterClose = canvas.style.cursor;

        return {
          visibleWhenClosed,
          visibleWhenOpen,
          cursorOverObj,
          cursorOverEmpty,
          visibleAfterClose,
          cursorAfterClose
        };
      });

      const d8Cond = d8Res.visibleWhenClosed === false &&
        d8Res.visibleWhenOpen === true &&
        d8Res.cursorOverObj === 'grab' &&
        d8Res.cursorOverEmpty === '' &&
        d8Res.visibleAfterClose === false &&
        d8Res.cursorAfterClose === '';
      check('D8', d8Cond, `Edit hint / cursor check failed: ${JSON.stringify(d8Res)}`);
    }

    // =========================================================================
    // D9: drawer state (tab, query) survives a scene switch or is reset consistently as documented in R27
    // =========================================================================
    {
      const d9Res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();

        // Select 'Plants' tab and type 'fern'
        const plantsBtn = document.querySelector('#editDrawerFilters .edit-drawer-tab[data-tab="Plants"]');
        if (plantsBtn) plantsBtn.click();
        const inp = document.getElementById('editDrawerSearch');
        inp.value = 'fern';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.blur();

        // Switch indoor -> indoor ('dorm')
        window.CuyPlaces.openPlace('dorm');
        const activeInDorm = document.querySelector('#editDrawerFilters .edit-drawer-tab[aria-selected="true"]');
        const tabInDorm = activeInDorm ? activeInDorm.getAttribute('data-tab') : null;
        const queryInDorm = document.getElementById('editDrawerSearch').value;

        // Switch to outdoor ('garden'), select 'Outdoor' tab
        window.CuyPlaces.openPlace('garden');
        const outdoorBtn = document.querySelector('#editDrawerFilters .edit-drawer-tab[data-tab="Outdoor"]');
        if (outdoorBtn) outdoorBtn.click();
        const activeInGarden = document.querySelector('#editDrawerFilters .edit-drawer-tab[aria-selected="true"]');
        const tabInGarden = activeInGarden ? activeInGarden.getAttribute('data-tab') : null;

        // Switch back to indoor ('salon') -> 'Outdoor' must reset to 'All', query preserved
        window.CuyPlaces.openPlace('salon');
        const activeInSalon = document.querySelector('#editDrawerFilters .edit-drawer-tab[aria-selected="true"]');
        const tabInSalon = activeInSalon ? activeInSalon.getAttribute('data-tab') : null;
        const queryInSalon = document.getElementById('editDrawerSearch').value;

        // Clean up filter state
        const inpClean = document.getElementById('editDrawerSearch');
        inpClean.value = '';
        inpClean.dispatchEvent(new Event('input', { bubbles: true }));

        return {
          tabInDorm,
          queryInDorm,
          tabInGarden,
          tabInSalon,
          queryInSalon
        };
      });

      const d9Cond = d9Res.tabInDorm === 'Plants' &&
        d9Res.queryInDorm === 'fern' &&
        d9Res.tabInGarden === 'Outdoor' &&
        d9Res.tabInSalon === 'All' &&
        d9Res.queryInSalon === 'fern';
      check('D9', d9Cond, `Drawer state persistence across scenes failed: ${JSON.stringify(d9Res)}`);
    }

    // =========================================================================
    // D10: drawer at 420x640 and 400x620 never covers the places bar or the More button
    // =========================================================================
    {
      const checkViewportLayout = async (width, height) => {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(100);
        return await page.evaluate(() => {
          window.CuyPlaces.openPlace('salon');
          if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
          else window.CuyEdit.render();

          const drawer = document.getElementById('editDrawer');
          const bar = document.getElementById('placesBar');
          const moreBtn = document.getElementById('btnMore');
          const dRect = drawer.getBoundingClientRect();
          const bRect = bar.getBoundingClientRect();
          const mRect = moreBtn.getBoundingClientRect();

          return {
            drawerTop: dRect.top,
            drawerBottom: dRect.bottom,
            barBottom: bRect.bottom,
            moreTop: mRect.top,
            fits: dRect.top >= bRect.bottom && dRect.bottom <= mRect.top && dRect.height > 0
          };
        });
      };

      const v420 = await checkViewportLayout(420, 640);
      const v400 = await checkViewportLayout(400, 620);
      await page.setViewportSize({ width: 420, height: 640 });

      const d10Cond = v420.fits && v400.fits;
      check('D10', d10Cond, `Drawer layout overlap: 420x640=${JSON.stringify(v420)}, 400x620=${JSON.stringify(v400)}`);
    }

    // =========================================================================
    // D11: keyboard: tabs by arrows, Esc closes the drawer
    // =========================================================================
    {
      await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        const allBtn = document.querySelector('#editDrawerFilters .edit-drawer-tab[data-tab="All"]');
        if (allBtn) {
          allBtn.click();
          allBtn.focus();
        }
      });

      await page.keyboard.press('ArrowRight');
      const tabAfterRight = await page.evaluate(() => {
        const el = document.querySelector('#editDrawerFilters .edit-drawer-tab[aria-selected="true"]');
        return el ? el.getAttribute('data-tab') : null;
      });

      await page.keyboard.press('ArrowLeft');
      const tabAfterLeft = await page.evaluate(() => {
        const el = document.querySelector('#editDrawerFilters .edit-drawer-tab[aria-selected="true"]');
        return el ? el.getAttribute('data-tab') : null;
      });

      // Wrap around Left from All -> Decor
      await page.keyboard.press('ArrowLeft');
      const tabAfterWrap = await page.evaluate(() => {
        const el = document.querySelector('#editDrawerFilters .edit-drawer-tab[aria-selected="true"]');
        return el ? el.getAttribute('data-tab') : null;
      });

      // Reset to All
      await page.keyboard.press('ArrowRight');

      // Press Escape to close drawer (when no item is selected)
      await page.evaluate(() => window.CuyEdit.setSelection(null));
      await page.keyboard.press('Escape');
      const closedAfterEsc = await page.evaluate(() => !window.CuyEdit.isOpen() && document.getElementById('editDrawer').hidden);

      const d11Cond = tabAfterRight === 'Furniture' &&
        tabAfterLeft === 'All' &&
        tabAfterWrap === 'Decor' &&
        closedAfterEsc === true;
      check('D11', d11Cond, `Keyboard nav failed: right=${tabAfterRight} left=${tabAfterLeft} wrap=${tabAfterWrap} escClosed=${closedAfterEsc}`);
    }

    // =========================================================================
    // D12: 100 stash items: scrolling and filtering stay under 50 ms per keystroke
    // =========================================================================
    {
      const d12Res = await page.evaluate(() => {
        const st = window.bridge.currentState || window.bridge.getState();
        const hundred = [];
        const cats = ['sofa_item_', 'lamp_item_', 'plant_item_', 'decor_item_'];
        for (let i = 0; i < 100; i++) {
          const prefix = cats[i % cats.length];
          hundred.push({
            id: prefix + i,
            name: 'Stash Item Number ' + i,
            place: ['house'],
            kind: 'indoor',
            layer: (i % 4 === 3) ? 'wall' : 'floor',
            owned: (i % 5) + 1
          });
        }
        st.edit = { items: hundred };
        window.CuyPlaces.openPlace('salon');
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        else window.CuyEdit.render(st);

        const strip = document.getElementById('editDrawerStrip');
        const initialCount = strip.querySelectorAll('.edit-card').length;

        const inp = document.getElementById('editDrawerSearch');
        inp.focus();

        // Warm-up 1 keystroke before timing
        inp.value = 's';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));

        const keystrokes = ['s', 'st', 'sta', 'stas', 'stash', 'stash 9', 'stash 99', 'stash 9', 'stash', ''];
        const times = [];
        for (const q of keystrokes) {
          const t0 = performance.now();
          inp.value = q;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          strip.scrollLeft = 120;
          const dt = performance.now() - t0;
          times.push(dt);
        }
        inp.blur();

        delete st.edit;
        window.CuyEdit.render(st);

        const maxMs = Math.max(...times);
        return { initialCount, maxMs: +maxMs.toFixed(2), times: times.map(t => +t.toFixed(2)) };
      });

      const d12Cond = d12Res.initialCount === 100 && d12Res.maxMs < 50;
      check('D12', d12Cond, `100 items perf failed: count=${d12Res.initialCount} maxMs=${d12Res.maxMs}ms (limit 50ms)`);
    }

    // =========================================================================
    // D13: rapid open/close 30 times leaves no extra DOM nodes or listeners
    // =========================================================================
    {
      const d13Res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        // Warm-up 2 open/close cycles so initial lazy DOM nodes exist
        for (let w = 0; w < 2; w++) {
          window.CuyEdit.toggle();
          window.CuyEdit.toggle();
        }
        if (window.CuyEdit.isOpen()) window.CuyEdit.toggle();

        const nodesBefore = document.getElementsByTagName('*').length;
        const listenersBefore = window.__connectedListenerCount ? window.__connectedListenerCount() : 0;

        // 30 rapid open/close cycles
        for (let i = 0; i < 30; i++) {
          window.CuyEdit.toggle(); // open
          window.CuyEdit.toggle(); // close
        }

        const nodesAfter = document.getElementsByTagName('*').length;
        const listenersAfter = window.__connectedListenerCount ? window.__connectedListenerCount() : 0;

        return {
          nodesBefore,
          nodesAfter,
          nodeDiff: nodesAfter - nodesBefore,
          listenersBefore,
          listenersAfter,
          listenerDiff: listenersAfter - listenersBefore,
          isClosedAtEnd: !window.CuyEdit.isOpen()
        };
      });

      const d13Cond = d13Res.nodeDiff <= 0 && d13Res.listenerDiff <= 0 && d13Res.isClosedAtEnd;
      check('D13', d13Cond, `DOM/listener leak after 30x toggle: ${JSON.stringify(d13Res)}`);
    }

    // =========================================================================
    // D14: no console errors
    // =========================================================================
    {
      const errs = page.__errors || [];
      check('D14', errs.length === 0, `Console/page errors detected: ${errs.join('; ')}`);
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
}

run().catch((err) => {
  console.error('FATAL ux-p62-drawer-adv:', err);
  process.exit(1);
});
