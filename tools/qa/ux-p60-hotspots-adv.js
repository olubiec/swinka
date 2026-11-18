'use strict';

const path = require('path');
const nm = path.join(__dirname, 'node_modules');
if (!module.paths.includes(nm)) module.paths.unshift(nm);

const { chromium } = require('playwright');
const ux = require('./lib/ux');

const defects = [];
const skips = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push({ id, msg });
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push({ id, reason });
  console.log('SKIP ' + id + ': ' + reason);
}

async function clickScene(page, sx, sy) {
  const pt = await page.evaluate(([x, y]) => {
    return window.CanvasPig.toClient(x, y);
  }, [sx, sy]);
  await page.mouse.click(pt.clientX, pt.clientY);
}

async function setupUnlockedState(page) {
  await page.evaluate(() => {
    window.__cuyNow = '12:00';
    if (window.bridge && typeof window.bridge.mockReset === 'function') {
      window.bridge.mockReset();
    }
    const st = window.bridge.currentState;
    if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function') {
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = st.places || {};
      st.places.order = m.places.order;
      st.places.pigLocations = m.places.pigLocations;
      st.rooms = st.rooms || { layouts: {}, owned: {}, catalog: [] };
      st.rooms.layouts = Object.assign({}, st.rooms.layouts, m.rooms.layouts);
    }
    if (st.places && Array.isArray(st.places.places)) {
      st.places.places.forEach(p => { p.unlocked = true; });
    }
    if (st.places && Array.isArray(st.places.order)) {
      st.places.order.forEach(p => { p.locked = false; });
    }
    // Ensure market has all 4 stalls (seeds, pantry, decor, own) on 16x9 grid
    if (st.rooms && st.rooms.layouts && st.rooms.layouts.market) {
      st.rooms.layouts.market.items = [
        { uid: 'fx:market:stall_seeds',  itemId: 'stall_basic', x: 1,  y: 4, flip: false, variant: 0 },
        { uid: 'fx:market:stall_pantry', itemId: 'stall_big',   x: 5,  y: 4, flip: false, variant: 0 },
        { uid: 'fx:market:stall_decor',  itemId: 'stall_basic', x: 10, y: 4, flip: false, variant: 0 },
        { uid: 'fx:market:stall_own',    itemId: 'stall_basic', x: 13, y: 4, flip: false, variant: 0 },
        { uid: 'fx:market:notice_board', itemId: 'order_board', x: 4,  y: 6, flip: false, variant: 0 },
        { uid: 'fx:market:sign_right',   itemId: 'signpost',    x: 15, y: 6, flip: false, variant: 0 }
      ];
    }
    // Ensure farm has plot instances fx:farm:plot:0..3 in layout
    if (st.rooms && st.rooms.layouts && st.rooms.layouts.farm) {
      const hasPlots = st.rooms.layouts.farm.items.some(i => i.uid && i.uid.indexOf('fx:farm:plot:') === 0);
      if (!hasPlots) {
        st.rooms.layouts.farm.items.push(
          { uid: 'fx:farm:plot:0', itemId: 'plot_empty', x: 2, y: 6, flip: false, variant: 0 },
          { uid: 'fx:farm:plot:1', itemId: 'plot_empty', x: 5, y: 6, flip: false, variant: 0 },
          { uid: 'fx:farm:plot:2', itemId: 'plot_empty', x: 8, y: 6, flip: false, variant: 0 },
          { uid: 'fx:farm:plot:3', itemId: 'plot_empty', x: 11, y: 6, flip: false, variant: 0 }
        );
      }
    }
    if (st.farm) st.farm.unlocked = true;
    st.clovers = 5000;
    st.inventory = st.inventory || {};
    st.inventory.parsley = 5;
    st.inventory.seed_parsley = 5;
    st.inventory.sapling_apple = 2;
    window.bridge.broadcastState();
    if (window.CanvasPig && typeof window.CanvasPig.setExitsEnabled === 'function') {
      window.CanvasPig.setExitsEnabled(false);
    }
  });
  await page.waitForTimeout(150);
}

async function movePigAway(page) {
  await page.evaluate(() => {
    const st = window.bridge.currentState;
    if (st && st.places && Array.isArray(st.places.pigLocations)) {
      st.places.pigLocations.forEach(p => { p.scene = 'dorm'; });
    }
    if (window.CanvasPig) {
      if (typeof window.CanvasPig.setPresentPigs === 'function') window.CanvasPig.setPresentPigs([]);
      if (typeof window.CanvasPig.setPigVisible === 'function') window.CanvasPig.setPigVisible(false);
    }
  });
}

(async () => {
  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  try {
    const page = await ux.openHome(browser);
    await setupUnlockedState(page);

    // =========================================================================
    // H1: stall click opens its panel anchored at the stall and fully inside the
    // window at 420x640 and 400x620 (all 3 stalls and the own stall)
    // =========================================================================
    {
      await movePigAway(page);
      await page.evaluate(() => window.CuyPlaces.openPlace('market'));
      await page.waitForTimeout(150);

      // Check default mock market stalls before our custom 4-stall check AND with all 4 stalls
      const defaultMockStallCount = await page.evaluate(() => {
        const m = window.CuyScenesMock && window.CuyScenesMock.state ? window.CuyScenesMock.state('all_unlocked') : null;
        const items = (m && m.rooms && m.rooms.layouts && m.rooms.layouts.market && m.rooms.layouts.market.items) || [];
        return items.filter(i => i.itemId && i.itemId.indexOf('stall') === 0).length;
      });

      const viewports = [
        { width: 420, height: 640 },
        { width: 400, height: 620 }
      ];
      let h1Ok = true;
      const h1Notes = [];

      if (defaultMockStallCount < 4) {
        h1Ok = false;
        h1Notes.push(`default market layout in places/mock.js only seeds ${defaultMockStallCount} stalls (stall_left/center/right) instead of 4 (seeds/pantry/decor/own)`);
      }

      const stallTargets = [
        { uid: 'fx:market:stall_seeds',  expectedTitle: 'Seeds & tools' },
        { uid: 'fx:market:stall_pantry', expectedTitle: 'Pantry' },
        { uid: 'fx:market:stall_decor',  expectedTitle: 'Home & garden' },
        { uid: 'fx:market:stall_own',    expectedTitle: 'My stall' }
      ];

      for (const vp of viewports) {
        await page.setViewportSize(vp);
        await page.waitForTimeout(80);
        for (const stTarget of stallTargets) {
          await page.evaluate(() => { if (window.CuyMarket) window.CuyMarket.closePanel(); });
          const hs = await page.evaluate((uid) => {
            const list = window.CanvasPig.getHotspots() || [];
            return list.find(h => h.uid === uid || h.id === uid) || null;
          }, stTarget.uid);

          if (!hs) {
            h1Ok = false;
            h1Notes.push(`missing hotspot for ${stTarget.uid} at ${vp.width}x${vp.height}`);
            continue;
          }
          const cx = Math.round((hs.rect[0] + hs.rect[2]) / 2);
          const cy = Math.round((hs.rect[1] + hs.rect[3]) / 2);
          await clickScene(page, cx, cy);
          await page.waitForTimeout(80);

          const panelInfo = await page.evaluate(([vw, vh]) => {
            const el = document.querySelector('.market-scene-panel');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const titleEl = el.querySelector('.market-scene-title');
            return {
              title: titleEl ? titleEl.textContent.trim() : '',
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom,
              inside: r.left >= 0 && r.top >= 0 && r.right <= vw && r.bottom <= vh && r.width > 0 && r.height > 0
            };
          }, [vp.width, vp.height]);

          if (!panelInfo) {
            h1Ok = false;
            h1Notes.push(`panel did not open for ${stTarget.uid} at ${vp.width}x${vp.height}`);
          } else {
            if (panelInfo.title !== stTarget.expectedTitle) {
              h1Ok = false;
              h1Notes.push(`${stTarget.uid} opened '${panelInfo.title}' instead of '${stTarget.expectedTitle}'`);
            }
            if (!panelInfo.inside) {
              h1Ok = false;
              h1Notes.push(`${stTarget.uid} panel rect [${Math.round(panelInfo.left)},${Math.round(panelInfo.top)},${Math.round(panelInfo.right)},${Math.round(panelInfo.bottom)}] overflows ${vp.width}x${vp.height}`);
            }
          }
        }
      }
      await page.evaluate(() => { if (window.CuyMarket) window.CuyMarket.closePanel(); });
      await page.setViewportSize({ width: 420, height: 640 });
      check('H1', h1Ok, h1Notes.join('; ') || 'stall click panel check failed');
    }

    // =========================================================================
    // H2: buy then sell sends exact market_buy/market_sell {itemId,count},
    // count 1, 5 and a count above stock (no message or a clear refusal)
    // =========================================================================
    {
      let h2Ok = true;
      const h2Notes = [];

      await page.evaluate(() => {
        const st = window.bridge.currentState;
        st.clovers = 5000;
        st.inventory.parsley = 3; // stock = 3
        st.market.capLeft = 300;
        window.__h2Actions = [];
        window.__h2Toasts = [];
        if (!window.__h2Hooked) {
          window.__h2Hooked = true;
          window.bridge.onAction(a => {
            if (a && (a.type === 'market_buy' || a.type === 'market_sell')) {
              window.__h2Actions.push(JSON.parse(JSON.stringify(a)));
            }
          });
          if (window.CuyHome && window.CuyHome.api && window.CuyHome.api.onMessage) {
            window.CuyHome.api.onMessage('toast', m => {
              if (m && m.text) window.__h2Toasts.push(m.text);
            });
          }
        }
        window.bridge.broadcastState();
        window.CuyMarket.openPanel('stall:seeds', [16, 40, 64, 80]);
      });
      await page.waitForTimeout(80);

      // Buy count 1
      await page.click('.market-scene-panel [data-buy="seed_parsley"]');
      await page.waitForTimeout(50);

      // Step up to 5 (+4 clicks)
      for (let i = 0; i < 4; i++) {
        await page.click('.market-scene-panel .market-step[data-step="1"][data-id="seed_parsley"]');
      }
      await page.click('.market-scene-panel [data-buy="seed_parsley"]');
      await page.waitForTimeout(50);

      // Switch to sell panel (own stall) where parsley stock = 3
      await page.evaluate(() => {
        const st = window.bridge.currentState;
        st.inventory.parsley = 3;
        st.market.capLeft = 300;
        window.bridge.broadcastState();
        window.CuyMarket.openPanel('stall:own', [180, 40, 228, 80]);
      });
      await page.waitForTimeout(80);

      // Sell count 1
      await page.click('.market-scene-panel [data-sell="parsley"]');
      await page.waitForTimeout(50);

      // Set parsley owned = 6, sell count = 5
      await page.evaluate(() => {
        const st = window.bridge.currentState;
        st.inventory.parsley = 6;
        st.market.capLeft = 300;
        window.bridge.broadcastState();
      });
      await page.waitForTimeout(50);
      for (let i = 0; i < 4; i++) {
        await page.click('.market-scene-panel .market-step[data-step="1"][data-id="parsley"]');
      }
      await page.click('.market-scene-panel [data-sell="parsley"]');
      await page.waitForTimeout(50);

      // Now parsley owned = 1 (6 - 5 = 1), stepper is still at 5 (above stock = 1!).
      // Click sell when count (5) > stock (1): must either send no message (stepper clamped/disabled) or refuse clearly.
      const beforeAboveStock = await page.evaluate(() => ({
        actionsLen: window.__h2Actions.length,
        toastsLen: window.__h2Toasts.length,
        owned: window.bridge.currentState.inventory.parsley
      }));
      await page.click('.market-scene-panel [data-sell="parsley"]');
      await page.waitForTimeout(50);

      const h2Res = await page.evaluate(() => ({
        actions: window.__h2Actions,
        toasts: window.__h2Toasts,
        ownedAfter: window.bridge.currentState.inventory.parsley
      }));

      const buy1 = h2Res.actions[0];
      const buy5 = h2Res.actions[1];
      const sell1 = h2Res.actions[2];
      const sell5 = h2Res.actions[3];
      const sellAbove = h2Res.actions[4];

      if (!buy1 || buy1.type !== 'market_buy' || buy1.itemId !== 'seed_parsley' || buy1.count !== 1) {
        h2Ok = false;
        h2Notes.push('buy count 1 mismatch: ' + JSON.stringify(buy1));
      }
      if (!buy5 || buy5.type !== 'market_buy' || buy5.itemId !== 'seed_parsley' || buy5.count !== 5) {
        h2Ok = false;
        h2Notes.push('buy count 5 mismatch: ' + JSON.stringify(buy5));
      }
      if (!sell1 || sell1.type !== 'market_sell' || sell1.itemId !== 'parsley' || sell1.count !== 1) {
        h2Ok = false;
        h2Notes.push('sell count 1 mismatch: ' + JSON.stringify(sell1));
      }
      if (!sell5 || sell5.type !== 'market_sell' || sell5.itemId !== 'parsley' || sell5.count !== 5) {
        h2Ok = false;
        h2Notes.push('sell count 5 mismatch: ' + JSON.stringify(sell5));
      }
      if (sellAbove && sellAbove.count > beforeAboveStock.owned && h2Res.toasts.length === beforeAboveStock.toastsLen) {
        h2Ok = false;
        h2Notes.push(`sell count above stock sent market_sell {count:${sellAbove.count}} when owned=${beforeAboveStock.owned} without refusal/clamping`);
      }

      await page.evaluate(() => window.CuyMarket.closePanel());
      check('H2', h2Ok, h2Notes.join('; ') || 'market buy/sell count check failed');
    }

    // =========================================================================
    // H3: click on empty ground and on the background sends nothing
    // =========================================================================
    {
      await page.evaluate(() => {
        if (window.CuyMarket) window.CuyMarket.closePanel();
        window.__h3Actions = [];
        window.__h3Hotspots = [];
        if (!window.__h3Hooked) {
          window.__h3Hooked = true;
          window.bridge.onAction(a => window.__h3Actions.push(a));
          window.CanvasPig.onHotspot(h => window.__h3Hotspots.push(h));
        }
      });
      // Click top sky/background (10, 10) and empty walkable ground (128, 135)
      await clickScene(page, 10, 10);
      await clickScene(page, 128, 135);
      await page.waitForTimeout(80);

      const h3Res = await page.evaluate(() => ({
        actions: window.__h3Actions.length,
        hotspots: window.__h3Hotspots.length,
        panelOpen: !!document.querySelector('.market-scene-panel, .farm-scene-panel')
      }));
      check('H3', h3Res.actions === 0 && h3Res.hotspots === 0 && !h3Res.panelOpen,
        `expected 0 messages/hotspots on empty ground/bg, got actions=${h3Res.actions}, hotspots=${h3Res.hotspots}, panelOpen=${h3Res.panelOpen}`);
    }

    // =========================================================================
    // H4: hover label of the left-most and right-most hotspot stays inside 256x144
    // =========================================================================
    {
      const h4Res = await page.evaluate(() => {
        const hs = window.CuyHotspots;
        if (!hs || typeof hs.clampLabelRect !== 'function') return { missing: true };
        const leftMost = [0, 2, 16, 18];
        const rightMost = [242, 130, 256, 144];
        const l1 = hs.clampLabelRect(leftMost, 64, 14, 256, 144);
        const l2 = hs.clampLabelRect(rightMost, 64, 14, 256, 144);
        const inBounds = (r) => r.x >= 0 && r.y >= 0 && (r.x + r.w) <= 256 && (r.y + r.h) <= 144;
        // Also check whether hovering a hotspot on canvas renders an in-scene hover label or title
        const list = window.CanvasPig.getHotspots() || [];
        let allClamped = inBounds(l1) && inBounds(l2);
        for (const h of list) {
          const lr = hs.clampLabelRect(h.rect, 60, 14, 256, 144);
          if (!inBounds(lr)) allClamped = false;
        }
        return { missing: false, allClamped, l1, l2 };
      });
      if (h4Res.missing) {
        skip('H4', 'CuyHotspots.clampLabelRect is not exposed');
      } else {
        check('H4', h4Res.allClamped, `clampLabelRect out of 256x144 bounds: l1=${JSON.stringify(h4Res.l1)}, l2=${JSON.stringify(h4Res.l2)}`);
      }
    }

    // =========================================================================
    // H5: pig standing on a hotspot: click hits the pig first, no panel
    // =========================================================================
    {
      await page.evaluate(() => {
        if (window.CuyMarket) window.CuyMarket.closePanel();
        window.CuyPlaces.openPlace('market');
      });
      await page.waitForTimeout(100);

      const stallPt = await page.evaluate(() => {
        const list = window.CanvasPig.getHotspots() || [];
        const h = list.find(x => x.kind === 'stall') || list[0];
        const cx = Math.round((h.rect[0] + h.rect[2]) / 2);
        const cy = Math.round((h.rect[1] + h.rect[3]) / 2);
        // Place the pig right over the hotspot center
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.pigX = cx;
        window.CanvasPig.pigY = cy + 6;
        window.__h5Actions = [];
        window.__h5Hotspots = [];
        if (!window.__h5Hooked) {
          window.__h5Hooked = true;
          window.bridge.onAction(a => window.__h5Actions.push(a.type));
          window.CanvasPig.onHotspot(hs => window.__h5Hotspots.push(hs.id));
        }
        return { cx, cy };
      });

      await clickScene(page, stallPt.cx, stallPt.cy);
      await page.waitForTimeout(80);

      const h5Res = await page.evaluate(() => ({
        petSent: window.__h5Actions.includes('pet'),
        hotspotsFired: window.__h5Hotspots.length,
        panelOpen: !!document.querySelector('.market-scene-panel')
      }));
      check('H5', h5Res.petSent && h5Res.hotspotsFired === 0 && !h5Res.panelOpen,
        `expected pig hit first (petSent=true, hotspots=0, panel=false), got ${JSON.stringify(h5Res)}`);
    }

    // =========================================================================
    // H6: dragging the pig across a hotspot never fires it
    // =========================================================================
    {
      const dragCoords = await page.evaluate(() => {
        if (window.CuyMarket) window.CuyMarket.closePanel();
        const list = window.CanvasPig.getHotspots() || [];
        const h = list.find(x => x.kind === 'stall') || list[0];
        const hx = Math.round((h.rect[0] + h.rect[2]) / 2);
        const hy = Math.round((h.rect[1] + h.rect[3]) / 2);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.pigX = 30;
        window.CanvasPig.pigY = 128;
        window.__h6Hotspots = [];
        if (!window.__h6Hooked) {
          window.__h6Hooked = true;
          window.CanvasPig.onHotspot(hs => window.__h6Hotspots.push(hs.id));
        }
        return {
          start: window.CanvasPig.toClient(30, 120),
          mid: window.CanvasPig.toClient(hx, hy),
          end: window.CanvasPig.toClient(hx, hy)
        };
      });

      await page.mouse.move(dragCoords.start.clientX, dragCoords.start.clientY);
      await page.mouse.down();
      await page.mouse.move(dragCoords.mid.clientX, dragCoords.mid.clientY, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(100);

      const h6Res = await page.evaluate(() => ({
        hotspotsFired: window.__h6Hotspots.length,
        panelOpen: !!document.querySelector('.market-scene-panel')
      }));
      check('H6', h6Res.hotspotsFired === 0 && !h6Res.panelOpen,
        `dragging pig across hotspot fired hotspot=${h6Res.hotspotsFired}, panelOpen=${h6Res.panelOpen}`);
      await movePigAway(page);
    }

    // =========================================================================
    // H7: Edit mode: hotspots inactive; leaving Edit re-activates them
    // =========================================================================
    {
      await page.evaluate(() => {
        if (window.CuyMarket) window.CuyMarket.closePanel();
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
      });
      await page.waitForTimeout(80);

      const stallCenter = await page.evaluate(() => {
        const list = window.CanvasPig.getHotspots() || [];
        const h = list.find(x => x.kind === 'stall') || list[0];
        return {
          cx: Math.round((h.rect[0] + h.rect[2]) / 2),
          cy: Math.round((h.rect[1] + h.rect[3]) / 2),
          editOpen: window.CuyEdit.isOpen()
        };
      });

      await clickScene(page, stallCenter.cx, stallCenter.cy);
      await page.waitForTimeout(80);
      const panelInEdit = await page.evaluate(() => !!document.querySelector('.market-scene-panel'));

      // Leave Edit mode
      await page.evaluate(() => {
        if (window.CuyEdit.isOpen()) window.CuyEdit.toggle();
      });
      await page.waitForTimeout(80);

      await clickScene(page, stallCenter.cx, stallCenter.cy);
      await page.waitForTimeout(80);
      const panelAfterEdit = await page.evaluate(() => !!document.querySelector('.market-scene-panel'));
      await page.evaluate(() => { if (window.CuyMarket) window.CuyMarket.closePanel(); });

      check('H7', stallCenter.editOpen && !panelInEdit && panelAfterEdit,
        `Edit mode arbitration failed: editOpen=${stallCenter.editOpen}, panelInEdit=${panelInEdit}, panelAfterEdit=${panelAfterEdit}`);
    }

    // =========================================================================
    // H8: moving a stall instance in Edit moves its hotspot (click at the old
    // point does nothing, at the new point opens the panel)
    // =========================================================================
    {
      const h8Before = await page.evaluate(() => {
        if (window.CuyMarket) window.CuyMarket.closePanel();
        const list = window.CanvasPig.getHotspots() || [];
        const h = list.find(x => x.uid === 'fx:market:stall_seeds' || x.id === 'stall:seeds');
        return h ? { rect: h.rect.slice(), uid: h.uid } : null;
      });

      // Move stall_seeds from x=1, y=4 to x=1, y=8 via room_move (and verify mock updates layout + hotspots)
      await page.evaluate((uid) => {
        window.bridge.send({ type: 'room_move', place: 'market', uid: uid, x: 1, y: 8 });
      }, h8Before ? h8Before.uid : 'fx:market:stall_seeds');
      await page.waitForTimeout(100);

      const h8After = await page.evaluate((uid) => {
        const st = window.bridge.currentState;
        const item = st.rooms.layouts.market.items.find(i => i.uid === uid);
        const list = window.CanvasPig.getHotspots() || [];
        const h = list.find(x => x.uid === uid || x.id === 'stall:seeds');
        return {
          itemY: item ? item.y : null,
          rect: h ? h.rect.slice() : null
        };
      }, h8Before ? h8Before.uid : 'fx:market:stall_seeds');

      // Click at old point (top of old rect, outside new rect)
      const oldClickX = h8Before ? Math.round((h8Before.rect[0] + h8Before.rect[2]) / 2) : 40;
      const oldClickY = h8Before ? h8Before.rect[1] + 4 : 30;
      await clickScene(page, oldClickX, oldClickY);
      await page.waitForTimeout(60);
      const openedAtOld = await page.evaluate(() => !!document.querySelector('.market-scene-panel'));

      // Click at new point
      const newClickX = h8After && h8After.rect ? Math.round((h8After.rect[0] + h8After.rect[2]) / 2) : 40;
      const newClickY = h8After && h8After.rect ? h8After.rect[3] - 4 : 132;
      await clickScene(page, newClickX, newClickY);
      await page.waitForTimeout(60);
      const openedAtNew = await page.evaluate(() => !!document.querySelector('.market-scene-panel'));
      await page.evaluate(() => { if (window.CuyMarket) window.CuyMarket.closePanel(); });

      const movedRect = h8Before && h8After && h8After.rect &&
        (h8Before.rect[1] !== h8After.rect[1] || h8Before.rect[3] !== h8After.rect[3]);

      check('H8', !!(movedRect && !openedAtOld && openedAtNew),
        `moving stall in Edit did not move hotspot: itemY=${h8After.itemY}, oldRect=${JSON.stringify(h8Before && h8Before.rect)}, newRect=${JSON.stringify(h8After && h8After.rect)}, openedAtOld=${openedAtOld}, openedAtNew=${openedAtNew}`);
    }

    // =========================================================================
    // H9: farm plot click: plant, water, harvest send the right message for each
    // plot state; an unbought plot shows a hint and sends nothing
    // =========================================================================
    {
      await page.evaluate(() => {
        window.CuyPlaces.openPlace('farm');
        const st = window.bridge.currentState;
        st.farm.unlocked = true;
        st.inventory.seed_parsley = 5;
        // Set up 4 owned plots in empty, growing (unwatered), ripe states, plus 1 unbought plot hotspot (plot:4)
        if (st.farmMock) {
          const now = Date.now();
          st.farmMock.plotsOwned = 4;
          st.farmMock.plots = [
            { cropId: null, plantedAt: 0, readyAt: 0, watered: false },
            { cropId: 'parsley', plantedAt: now - 5000, readyAt: now + 35000, watered: false },
            { cropId: 'parsley', plantedAt: now - 50000, readyAt: now - 1000, watered: true },
            { cropId: 'parsley', plantedAt: now - 5000, readyAt: now + 30000, watered: true }
          ];
        }
        // Add an unbought plot instance fx:farm:plot:4 to layout
        const items = st.rooms.layouts.farm.items;
        if (!items.some(i => i.uid === 'fx:farm:plot:4')) {
          items.push({ uid: 'fx:farm:plot:4', itemId: 'plot_lawn', x: 14, y: 6, flip: false, variant: 0 });
        }
        window.__h9Actions = [];
        window.__h9Toasts = [];
        if (!window.__h9Hooked) {
          window.__h9Hooked = true;
          window.bridge.onAction(a => {
            if (a && /^farm_|^orchard_/.test(a.type)) window.__h9Actions.push(JSON.parse(JSON.stringify(a)));
          });
          if (window.CuyHome && window.CuyHome.api && window.CuyHome.api.onMessage) {
            window.CuyHome.api.onMessage('toast', m => { if (m && m.text) window.__h9Toasts.push(m.text); });
          }
        }
        window.bridge.broadcastState();
      });
      await page.waitForTimeout(100);
      await movePigAway(page);

      const plotHotspots = await page.evaluate(() => {
        const list = window.CanvasPig.getHotspots() || [];
        return list.filter(h => h.kind === 'plot');
      });

      let h9Ok = true;
      const h9Notes = [];

      const findPlotHs = (idx) => plotHotspots.find(h => h.id === 'plot:' + idx || h.uid === 'fx:farm:plot:' + idx);

      // 1) Empty plot (plot:0) -> opens plant menu -> click Plant -> sends farm_plant
      const hs0 = findPlotHs(0);
      if (!hs0) {
        h9Ok = false;
        h9Notes.push('missing hotspot for plot:0');
      } else {
        await clickScene(page, Math.round((hs0.rect[0] + hs0.rect[2]) / 2), Math.round((hs0.rect[1] + hs0.rect[3]) / 2));
        await page.waitForTimeout(60);
        const plantBtnVisible = await page.isVisible('.farm-scene-panel [data-plant="parsley"]');
        if (!plantBtnVisible) {
          h9Ok = false;
          h9Notes.push('clicking empty plot:0 did not open plant menu');
        } else {
          await page.click('.farm-scene-panel [data-plant="parsley"]');
          await page.waitForTimeout(60);
        }
      }

      // 2) Growing unwatered plot (plot:1) -> click sends farm_water {plot:1}
      const hs1 = findPlotHs(1);
      if (hs1) {
        await clickScene(page, Math.round((hs1.rect[0] + hs1.rect[2]) / 2), Math.round((hs1.rect[1] + hs1.rect[3]) / 2));
        await page.waitForTimeout(60);
      }

      // 3) Ripe plot (plot:2) -> click sends farm_harvest {plot:2}
      const hs2 = findPlotHs(2);
      if (hs2) {
        await clickScene(page, Math.round((hs2.rect[0] + hs2.rect[2]) / 2), Math.round((hs2.rect[1] + hs2.rect[3]) / 2));
        await page.waitForTimeout(60);
      }

      // 4) Unbought plot (plot:4, index >= plots.length) -> shows hint and sends nothing
      const beforeUnbought = await page.evaluate(() => ({
        actionsLen: window.__h9Actions.length,
        toastsLen: window.__h9Toasts.length
      }));
      const hs4 = findPlotHs(4);
      if (hs4) {
        await clickScene(page, Math.round((hs4.rect[0] + hs4.rect[2]) / 2), Math.round((hs4.rect[1] + hs4.rect[3]) / 2));
        await page.waitForTimeout(60);
      }
      const afterUnbought = await page.evaluate(() => ({
        actions: window.__h9Actions,
        toasts: window.__h9Toasts,
        tooltipVisible: !!document.querySelector('.farm-scene-tooltip, .farm-scene-panel'),
        toastText: (document.getElementById('globalToast') && document.getElementById('globalToast').textContent) || ''
      }));

      const hasPlant = afterUnbought.actions.some(a => a.type === 'farm_plant' && a.plot === 0 && a.cropId === 'parsley');
      const hasWater = afterUnbought.actions.some(a => a.type === 'farm_water' && a.plot === 1);
      const hasHarvest = afterUnbought.actions.some(a => a.type === 'farm_harvest' && a.plot === 2);
      const unboughtSentNothing = afterUnbought.actions.length === beforeUnbought.actionsLen;
      const unboughtShowedHint = afterUnbought.toasts.length > beforeUnbought.toastsLen || afterUnbought.tooltipVisible;

      if (!hasPlant) { h9Ok = false; h9Notes.push('missing farm_plant on plot 0'); }
      if (!hasWater) { h9Ok = false; h9Notes.push('missing farm_water on plot 1'); }
      if (!hasHarvest) { h9Ok = false; h9Notes.push('missing farm_harvest on plot 2'); }
      if (!unboughtSentNothing) { h9Ok = false; h9Notes.push('unbought plot:4 sent a message'); }
      if (!unboughtShowedHint) { h9Ok = false; h9Notes.push('clicking unbought plot:4 sent nothing but showed no hint/tooltip/toast'); }

      check('H9', h9Ok, h9Notes.join('; ') || 'farm plot click check failed');
    }

    // =========================================================================
    // H10: all plots and orchard slots clickable exactly once, ids unique
    // =========================================================================
    {
      // Also check default farm layout in places/mock.js for plot instances
      const h10Data = await page.evaluate(() => {
        const defaultMock = window.CuyScenesMock && window.CuyScenesMock.state ? window.CuyScenesMock.state('all_unlocked') : null;
        const defaultFarmItems = (defaultMock && defaultMock.rooms && defaultMock.rooms.layouts && defaultMock.rooms.layouts.farm && defaultMock.rooms.layouts.farm.items) || [];
        const defaultPlotCount = defaultFarmItems.filter(i => i.uid && i.uid.indexOf('fx:farm:plot:') === 0).length;

        const list = window.CanvasPig.getHotspots() || [];
        const ids = list.map(h => h.id);
        const uniqueIds = new Set(ids);
        // Check that the center of each hotspot hits that exact hotspot via CuyHotspots.hit
        const hitResults = list.map(h => {
          const cx = Math.round((h.rect[0] + h.rect[2]) / 2);
          const cy = Math.round((h.rect[1] + h.rect[3]) / 2);
          const hit = window.CuyHotspots.hit(list, cx, cy);
          return { id: h.id, hitId: hit ? hit.id : null };
        });
        return {
          defaultPlotCount,
          total: list.length,
          uniqueCount: uniqueIds.size,
          hasOrchard: list.some(h => h.kind === 'orchard'),
          plotCount: list.filter(h => h.kind === 'plot').length,
          mismatches: hitResults.filter(r => r.id !== r.hitId)
        };
      });

      let h10Ok = h10Data.total === h10Data.uniqueCount &&
                  h10Data.hasOrchard &&
                  h10Data.plotCount >= 4 &&
                  h10Data.mismatches.length === 0 &&
                  h10Data.defaultPlotCount >= 4;
      const h10Notes = [];
      if (h10Data.defaultPlotCount < 4) {
        h10Notes.push(`default farm layout in places/mock.js seeds ${h10Data.defaultPlotCount} plot instances (expected >= 4 fx:farm:plot:0..3)`);
      }
      if (h10Data.total !== h10Data.uniqueCount) {
        h10Notes.push(`duplicate hotspot ids (${h10Data.uniqueCount}/${h10Data.total})`);
      }
      if (h10Data.mismatches.length > 0) {
        h10Notes.push('center hit mismatch: ' + JSON.stringify(h10Data.mismatches));
      }
      check('H10', h10Ok, h10Notes.join('; ') || 'farm plots & orchard uniqueness check failed');
    }

    // =========================================================================
    // H11: switching scene while a panel is open closes it; reopening works
    // =========================================================================
    {
      let h11Ok = true;
      const h11Notes = [];

      // 1) Farm panel open -> switch to market -> farm panel must close
      await page.evaluate(() => {
        window.CuyPlaces.openPlace('farm');
      });
      await page.waitForTimeout(80);
      const orchardHs = await page.evaluate(() => {
        const list = window.CanvasPig.getHotspots() || [];
        return list.find(h => h.kind === 'orchard');
      });
      if (orchardHs) {
        await clickScene(page, Math.round((orchardHs.rect[0] + orchardHs.rect[2]) / 2), Math.round((orchardHs.rect[1] + orchardHs.rect[3]) / 2));
        await page.waitForTimeout(60);
      }
      const farmOpenBefore = await page.evaluate(() => !!document.querySelector('.farm-scene-panel'));
      await page.click('#placesNextBtn');
      await page.waitForTimeout(80);
      const farmOpenAfterSwitch = await page.evaluate(() => !!document.querySelector('.farm-scene-panel'));
      if (!farmOpenBefore || farmOpenAfterSwitch) {
        h11Ok = false;
        h11Notes.push(`farm panel before=${farmOpenBefore}, after scene switch=${farmOpenAfterSwitch}`);
      }

      // 2) Market panel open -> switch scene -> market panel must close -> switch back & reopen works
      await page.evaluate(() => window.CuyPlaces.openPlace('market'));
      await page.waitForTimeout(80);
      const stallHs = await page.evaluate(() => {
        const list = window.CanvasPig.getHotspots() || [];
        return list.find(h => h.kind === 'stall');
      });
      if (stallHs) {
        await clickScene(page, Math.round((stallHs.rect[0] + stallHs.rect[2]) / 2), Math.round((stallHs.rect[1] + stallHs.rect[3]) / 2));
        await page.waitForTimeout(60);
      }
      const marketOpenBefore = await page.evaluate(() => !!document.querySelector('.market-scene-panel'));
      await page.click('#placesPrevBtn');
      await page.waitForTimeout(80);
      const marketOpenAfterSwitch = await page.evaluate(() => !!document.querySelector('.market-scene-panel'));
      if (!marketOpenBefore || marketOpenAfterSwitch) {
        h11Ok = false;
        h11Notes.push(`market panel remained open after switching scene (before=${marketOpenBefore}, after=${marketOpenAfterSwitch})`);
      }

      // Reopen on market
      await page.evaluate(() => window.CuyPlaces.openPlace('market'));
      await page.waitForTimeout(80);
      if (stallHs) {
        await clickScene(page, Math.round((stallHs.rect[0] + stallHs.rect[2]) / 2), Math.round((stallHs.rect[1] + stallHs.rect[3]) / 2));
        await page.waitForTimeout(60);
      }
      const marketReopened = await page.evaluate(() => !!document.querySelector('.market-scene-panel'));
      if (!marketReopened) {
        h11Ok = false;
        h11Notes.push('market panel failed to reopen after returning to market');
      }
      await page.evaluate(() => { if (window.CuyMarket) window.CuyMarket.closePanel(); });

      check('H11', h11Ok, h11Notes.join('; ') || 'scene switch panel close check failed');
    }

    // =========================================================================
    // H12: keyboard: Tab order follows reading order, Enter activates, Esc closes
    // =========================================================================
    {
      const h12Sort = await page.evaluate(() => {
        const hs = window.CuyHotspots;
        if (!hs || typeof hs.sortKeyboard !== 'function') return { missingSort: true };
        const sample = [
          { id: 'b', rect: [100, 50, 120, 70] },
          { id: 'a', rect: [20, 50, 40, 70] },
          { id: 'c', rect: [80, 10, 100, 30] }
        ];
        const sorted = hs.sortKeyboard(sample).map(x => x.id);
        // Check if scene hotspots have DOM tabstops or keyboard handler on #pigCanvas
        const canvas = document.getElementById('pigCanvas');
        const hasTabIndex = canvas && canvas.hasAttribute('tabindex');
        const domHotspots = document.querySelectorAll('[data-hotspot], .scene-hotspot').length;
        return {
          missingSort: false,
          sortedOrder: sorted.join(','),
          hasTabIndex,
          domHotspots
        };
      });

      // Test Esc closing open market panel
      await page.evaluate(() => window.CuyMarket.openPanel('stall:seeds', [16, 40, 64, 80]));
      await page.waitForTimeout(50);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      const marketClosedOnEsc = await page.evaluate(() => !document.querySelector('.market-scene-panel'));

      // Test Esc closing open farm panel
      await page.evaluate(() => window.CuyPlaces.openPlace('farm'));
      await page.waitForTimeout(80);
      const orchardHs = await page.evaluate(() => (window.CanvasPig.getHotspots() || []).find(h => h.kind === 'orchard'));
      if (orchardHs) {
        await clickScene(page, Math.round((orchardHs.rect[0] + orchardHs.rect[2]) / 2), Math.round((orchardHs.rect[1] + orchardHs.rect[3]) / 2));
        await page.waitForTimeout(50);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      const farmClosedOnEsc = await page.evaluate(() => !document.querySelector('.farm-scene-panel'));
      await page.evaluate(() => { if (window.CuyFarm) window.CuyFarm.closePanel(); });

      let h12Ok = !h12Sort.missingSort &&
                  h12Sort.sortedOrder === 'c,a,b' &&
                  (h12Sort.hasTabIndex || h12Sort.domHotspots > 0) &&
                  marketClosedOnEsc &&
                  farmClosedOnEsc;
      const h12Notes = [];
      if (h12Sort.sortedOrder !== 'c,a,b') h12Notes.push(`sortKeyboard returned ${h12Sort.sortedOrder}`);
      if (!h12Sort.hasTabIndex && h12Sort.domHotspots === 0) h12Notes.push('canvas hotspots have no DOM tabstops or keyboard Tab/Enter navigation wired');
      if (!marketClosedOnEsc) h12Notes.push('Esc did not close market stall panel');
      if (!farmClosedOnEsc) h12Notes.push('Esc did not close farm scene panel');

      check('H12', h12Ok, h12Notes.join('; ') || 'keyboard Tab/Enter/Esc check failed');
    }

    // =========================================================================
    // H13: double-click and 10 rapid clicks send exactly one message per action window
    // =========================================================================
    {
      await page.evaluate(() => {
        window.CuyPlaces.openPlace('farm');
        const st = window.bridge.currentState;
        const now = Date.now();
        if (st.farmMock) {
          st.farmMock.plots[1] = { cropId: 'parsley', plantedAt: now - 5000, readyAt: now + 35000, watered: false };
        }
        window.bridge.broadcastState();
      });
      await page.waitForTimeout(80);
      await movePigAway(page);

      // Test rapid 10 synchronous/fast clicks on hotspot in canvas
      const rapidRes = await page.evaluate(() => {
        const list = window.CanvasPig.getHotspots() || [];
        const h = list.find(x => x.id === 'plot:1') || list[0];
        const cx = Math.round((h.rect[0] + h.rect[2]) / 2);
        const cy = Math.round((h.rect[1] + h.rect[3]) / 2);
        const pt = window.CanvasPig.toClient(cx, cy);
        let hotspotFireCount = 0;
        const unsub = window.CanvasPig.onHotspot(() => { hotspotFireCount++; });
        const canvas = document.getElementById('pigCanvas');
        for (let i = 0; i < 10; i++) {
          canvas.dispatchEvent(new MouseEvent('click', { clientX: pt.clientX, clientY: pt.clientY, bubbles: true }));
        }
        unsub();
        return { hotspotFireCount };
      });

      check('H13', rapidRes.hotspotFireCount === 1,
        `10 rapid clicks in same action window fired onHotspot ${rapidRes.hotspotFireCount} times (expected 1 via 250ms cooldown tracker)`);
    }

    // =========================================================================
    // H14: hotspots survive a state refresh pushed by the bridge (panel stays, no duplicate)
    // =========================================================================
    {
      await page.evaluate(() => window.CuyPlaces.openPlace('market'));
      await page.waitForTimeout(80);
      await movePigAway(page);

      const stallHs = await page.evaluate(() => (window.CanvasPig.getHotspots() || []).find(h => h.kind === 'stall'));
      if (stallHs) {
        await clickScene(page, Math.round((stallHs.rect[0] + stallHs.rect[2]) / 2), Math.round((stallHs.rect[1] + stallHs.rect[3]) / 2));
        await page.waitForTimeout(60);
      }

      // Push 3 state refreshes via bridge
      await page.evaluate(() => {
        window.bridge.broadcastState();
        window.bridge.broadcastState();
        window.bridge.broadcastState();
      });
      await page.waitForTimeout(80);

      const h14Res = await page.evaluate(() => ({
        panelCount: document.querySelectorAll('.market-scene-panel').length,
        hotspotsCount: (window.CanvasPig.getHotspots() || []).length
      }));
      await page.evaluate(() => { if (window.CuyMarket) window.CuyMarket.closePanel(); });

      check('H14', h14Res.panelCount === 1 && h14Res.hotspotsCount > 0,
        `after state refresh expected 1 panel and >0 hotspots, got panelCount=${h14Res.panelCount}, hotspotsCount=${h14Res.hotspotsCount}`);
    }

    // =========================================================================
    // H15: lamp click toggles the light, window click does not
    // =========================================================================
    {
      await page.evaluate(() => {
        window.__cuyNow = '23:00';
        const st = window.bridge.currentState;
        st.rooms = st.rooms || { layouts: {} };
        st.rooms.layouts = st.rooms.layouts || {};
        st.rooms.layouts.salon = st.rooms.layouts.salon || { cols: 12, rows: 7, wallRows: 2, wallpaper: 'wallpaper_cream', floor: 'floor_wood', items: [] };
        st.rooms.layouts.salon.items = [
          { uid: 'lamp_u1', itemId: 'lamp_floor', x: 3, y: 4, flip: false, variant: 0 },
          { uid: 'win_u1',  itemId: 'window_sun', x: 6, y: 0, flip: false, variant: 0 }
        ];
        window.CuyPlaces.openPlace('salon');
        window.bridge.broadcastState();
      });
      await page.waitForTimeout(100);
      await movePigAway(page);

      const beforeLamp = await page.evaluate(() => {
        const dbg = window.CanvasPig.debug();
        const sources = (dbg && dbg.lightScene && dbg.lightScene.sources) || [];
        const lamp = sources.find(s => s.id === 'lamp_u1' || s.itemId === 'lamp_floor');
        const win = sources.find(s => s.id === 'win_u1' || s.itemId === 'window' || s.itemId === 'window_sun');
        const hs = (window.CanvasPig.getHotspots() || []).find(h => h.uid === 'lamp_u1' || h.id === 'lamp_u1');
        const things = (window.CanvasPig.instance && window.CanvasPig.instance.things) || [];
        const lampThing = things.find(t => t.uid === 'lamp_u1' || t.id === 'lamp_u1');
        const winThing = things.find(t => t.uid === 'win_u1' || t.id === 'win_u1');
        return {
          lampOn: lamp ? lamp.on : null,
          winOn: win ? win.on : null,
          hsRect: hs ? hs.rect : null,
          lampPos: lampThing ? { x: lampThing.x, y: lampThing.y, ax: lampThing.anchorX, ay: lampThing.anchorY, w: lampThing.w, h: lampThing.h } : null,
          winPos: winThing ? { x: winThing.x, y: winThing.y, ax: winThing.anchorX, ay: winThing.anchorY, w: winThing.w, h: winThing.h } : null
        };
      });

      // Click on the lamp's actual drawn position on canvas
      if (beforeLamp.lampPos) {
        const lx = Math.round(beforeLamp.lampPos.x);
        const ly = Math.round(beforeLamp.lampPos.y - beforeLamp.lampPos.ay / 2);
        await clickScene(page, lx, ly);
        await page.waitForTimeout(80);
      }

      // Click on the window's actual drawn position on canvas
      if (beforeLamp.winPos) {
        const wx = Math.round(beforeLamp.winPos.x);
        const wy = Math.round(beforeLamp.winPos.y - beforeLamp.winPos.ay / 2);
        await clickScene(page, wx, wy);
        await page.waitForTimeout(80);
      }

      const afterLamp = await page.evaluate(() => {
        const dbg = window.CanvasPig.debug();
        const sources = (dbg && dbg.lightScene && dbg.lightScene.sources) || [];
        const lamp = sources.find(s => s.id === 'lamp_u1' || s.itemId === 'lamp_floor');
        const win = sources.find(s => s.id === 'win_u1' || s.itemId === 'window' || s.itemId === 'window_sun');
        return {
          lampOn: lamp ? lamp.on : null,
          winOn: win ? win.on : null
        };
      });

      const lampToggled = beforeLamp.lampOn !== null && afterLamp.lampOn === !beforeLamp.lampOn;
      const winUnchanged = beforeLamp.winOn !== null && afterLamp.winOn === beforeLamp.winOn;
      check('H15', lampToggled && winUnchanged,
        `lamp click toggle failed: before(lamp=${beforeLamp.lampOn}, win=${beforeLamp.winOn}, hsRect=${JSON.stringify(beforeLamp.hsRect)}, drawnPos=${JSON.stringify(beforeLamp.lampPos)}), after(lamp=${afterLamp.lampOn}, win=${afterLamp.winOn})`);
    }

    // =========================================================================
    // H16: no console errors across the whole run
    // =========================================================================
    {
      check('H16', page.__errors.length === 0, 'console/page errors: ' + page.__errors.join('; '));
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
