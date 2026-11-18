'use strict';
const assert = require('assert');
const { chromium } = require('playwright');
const ux = require('./lib/ux');

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
  const server = await ux.startServer();
  const browser = await launchBrowser();
  try {
    const page = await ux.openHome(browser, { base: server.base, query: 'mock=seven' });
    await page.setViewportSize({ width: 420, height: 640 });

    // Seed 3+ non-memorial pigs and initial pigLocations in seven mock
    await page.evaluate(() => {
      const m = window.CuyScenesMock && window.CuyScenesMock.state('seven');
      if (m) {
        m.adoptionGateOpen = true;
        window.bridge.currentState = m;
        window.bridge.normalizeState(m);
        window.bridge.broadcastState();
      }
      const st = window.bridge.currentState;
      st.adoptionGateOpen = true;
      if (window.bridge.mockStates && window.bridge.mockStates.has('pigs')) {
        window.bridge.mockStates.get('pigs')(st);
      }
      st.activePigIds = [st.roster[0].id];
      st.places = st.places || {};
      st.places.pigLocations = st.roster.filter(p => !p.memorial).map(p => ({
        pigId: p.id,
        scene: 'salon',
        pinned: false
      }));
      window.bridge.normalizeState(st);
      window.bridge.broadcastState();

      window.__sentActions = [];
      window.__toasts = [];
      window.bridge.onAction(a => window.__sentActions.push(a));
      window.bridge.onMessage('toast', t => window.__toasts.push(t.text || ''));
    });

    await ux.openMore(page);
    await ux.openFromMore(page, 'My Pigs');
    await page.waitForSelector('.pigs-grid .pig-card', { timeout: 5000 });

    // P1: pin-button-per-pig
    const pigInfo = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.pigs-grid .pig-card:not(.pig-memorial)'));
      return cards.map(c => ({
        id: c.dataset.pigId,
        pinCount: c.querySelectorAll('.btn-pin-toggle').length,
        chkCount: c.querySelectorAll('.chk-desktop-pet').length,
        pinText: (c.querySelector('.btn-pin-toggle')?.textContent || '').trim(),
        pinned: c.querySelector('.btn-pin-toggle')?.dataset.pinned
      }));
    });
    assert(pigInfo.length >= 3, `P1 expected >= 3 non-memorial pig cards, got ${pigInfo.length}`);
    for (const info of pigInfo) {
      assert.strictEqual(info.pinCount, 1, `P1 pig ${info.id} must have 1 .btn-pin-toggle`);
      assert.strictEqual(info.chkCount, 1, `P1 pig ${info.id} must have 1 .chk-desktop-pet`);
      assert.strictEqual(info.pinText, 'Stay in this room', `P1 pig ${info.id} initial pin text`);
      assert.strictEqual(info.pinned, '0', `P1 pig ${info.id} initial data-pinned`);
    }
    console.log('P1 OK');

    const firstPigId = pigInfo[0].id;
    const secondPigId = pigInfo[1].id;
    const thirdPigId = pigInfo[2].id;

    // P2: click-sends-pigPin (exact shape)
    await page.evaluate(() => { window.__sentActions.length = 0; });
    await page.click(`.pig-card[data-pig-id="${firstPigId}"] .btn-pin-toggle`);
    await page.waitForTimeout(100);
    const pinActions = await page.evaluate(() => window.__sentActions.filter(a => a.type === 'places.pigPin'));
    assert.strictEqual(pinActions.length, 1, 'P2 must send 1 places.pigPin action');
    assert.deepStrictEqual(pinActions[0], { type: 'places.pigPin', pigId: firstPigId, pinned: true }, 'P2 exact message shape');
    console.log('P2 OK');

    // P3: button-text-toggles-after-state
    const afterPin = await page.evaluate((id) => {
      const btn = document.querySelector(`.pig-card[data-pig-id="${id}"] .btn-pin-toggle`);
      return { text: (btn.textContent || '').trim(), pinned: btn.dataset.pinned };
    }, firstPigId);
    assert.strictEqual(afterPin.text, 'Roam freely', 'P3 button text must toggle to Roam freely');
    assert.strictEqual(afterPin.pinned, '1', 'P3 data-pinned must be 1');

    // P4: mock-handler-updates-loc
    const locAfterPin = await page.evaluate((id) => {
      const locs = window.bridge.currentState.places.pigLocations;
      return locs.find(l => l.pigId === id);
    }, firstPigId);
    assert(locAfterPin && locAfterPin.pinned === true, 'P4 mock handler must set loc.pinned = true');

    // Toggle back to unpinned
    await page.click(`.pig-card[data-pig-id="${firstPigId}"] .btn-pin-toggle`);
    await page.waitForTimeout(100);
    const afterUnpin = await page.evaluate((id) => {
      const btn = document.querySelector(`.pig-card[data-pig-id="${id}"] .btn-pin-toggle`);
      const locs = window.bridge.currentState.places.pigLocations;
      const loc = locs.find(l => l.pigId === id);
      return { text: (btn.textContent || '').trim(), pinned: btn.dataset.pinned, locPinned: loc && loc.pinned };
    }, firstPigId);
    assert.strictEqual(afterUnpin.text, 'Stay in this room', 'P3 button text must toggle back');
    assert.strictEqual(afterUnpin.pinned, '0', 'P3 data-pinned must be 0');
    assert.strictEqual(afterUnpin.locPinned, false, 'P4 mock handler must set loc.pinned = false');
    console.log('P3, P4 OK');

    // P5 & P6: desktop-switch-max-2 and desktop-message-shape
    await page.evaluate(() => { window.__sentActions.length = 0; window.__toasts.length = 0; });
    await page.click(`.pig-card[data-pig-id="${secondPigId}"] .chk-desktop-pet`);
    await page.waitForTimeout(100);

    const deskActions2 = await page.evaluate(() => window.__sentActions.filter(a => a.type === 'pigs.desktopPet'));
    assert.strictEqual(deskActions2.length, 1, 'P6 must send 1 pigs.desktopPet action');
    assert.deepStrictEqual(deskActions2[0], { type: 'pigs.desktopPet', pigId: secondPigId, on: true }, 'P6 exact message shape');

    const activeAfter2 = await page.evaluate(() => window.bridge.currentState.activePigIds);
    assert.strictEqual(activeAfter2.length, 2, 'P5 activePigIds should now have 2 pigs');

    // Now try 3rd pig -> must be refused with toast
    await page.evaluate(() => { window.__sentActions.length = 0; window.__toasts.length = 0; });
    await page.click(`.pig-card[data-pig-id="${thirdPigId}"] .chk-desktop-pet`);
    await page.waitForTimeout(100);

    const thirdState = await page.evaluate((id) => ({
      active: window.bridge.currentState.activePigIds,
      toasts: window.__toasts.slice(),
      checked: document.querySelector(`.pig-card[data-pig-id="${id}"] .chk-desktop-pet`)?.checked
    }), thirdPigId);
    assert.strictEqual(thirdState.active.length, 2, 'P5 3rd pig must not be added to activePigIds');
    assert(!thirdState.active.includes(thirdPigId), 'P5 3rd pig id must not be in activePigIds');
    assert.strictEqual(thirdState.checked, false, 'P5 3rd pig checkbox must remain unchecked');
    assert(thirdState.toasts.some(t => /max 2/i.test(t)), `P5 expected max 2 toast, got: ${JSON.stringify(thirdState.toasts)}`);

    // Uncheck 2nd pig -> sends on: false
    await page.evaluate(() => { window.__sentActions.length = 0; });
    await page.click(`.pig-card[data-pig-id="${secondPigId}"] .chk-desktop-pet`);
    await page.waitForTimeout(100);
    const deskActionsOff = await page.evaluate(() => window.__sentActions.filter(a => a.type === 'pigs.desktopPet'));
    assert.deepStrictEqual(deskActionsOff[0], { type: 'pigs.desktopPet', pigId: secondPigId, on: false }, 'P6 uncheck exact message shape');
    console.log('P5, P6 OK');

    // P7: locked-or-single-pig (1 pig in roster, pin & desktop switch work without error)
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      const one = st.roster[0];
      st._singlePigTest = true;
      st.roster = [one];
      st.activePigIds = [one.id];
      st.places.pigLocations = [{ pigId: one.id, scene: 'salon', pinned: false }];
      window.bridge.broadcastState();
    });
    await page.waitForTimeout(100);
    await page.click(`.pig-card[data-pig-id="${firstPigId}"] .btn-pin-toggle`);
    await page.waitForTimeout(100);
    await page.click(`.pig-card[data-pig-id="${firstPigId}"] .chk-desktop-pet`);
    await page.waitForTimeout(100);
    const singleState = await page.evaluate((id) => ({
      cards: document.querySelectorAll('.pigs-grid .pig-card').length,
      active: window.bridge.currentState.activePigIds,
      pinned: window.bridge.currentState.places.pigLocations.find(l => l.pigId === id)?.pinned
    }), firstPigId);
    assert.strictEqual(singleState.cards, 1, 'P7 single pig card rendered');
    assert.strictEqual(singleState.pinned, true, 'P7 pin toggle works on single pig');
    assert.strictEqual(singleState.active.length, 1, 'P7 at least 1 pig stays active on desktop');
    console.log('P7 OK');

    // P8: no-console-errors
    assert.strictEqual(page.__errors.length, 0, `P8 console/page errors: ${page.__errors.join('; ')}`);
    console.log('P8 OK');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
