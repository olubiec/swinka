'use strict';
const { chromium } = require('playwright');
const assert = require('assert');
const { startServer, openHome } = require('./lib/ux');

function makeRunState(overrides = {}) {
  return Object.assign({
    available: true,
    valid: true,
    reason: 'ok',
    cells: [[4, 3], [5, 3], [6, 3], [4, 4], [5, 4], [6, 4], [4, 5], [5, 5], [6, 5], [4, 6], [5, 6], [6, 6]],
    capacity: 2,
    out: [],
    candidates: [
      { pigId: 'starter', name: 'Cuy', portrait: null, out: false, memorial: false },
      { pigId: 'kuki', name: 'Kuki', portrait: null, out: false, memorial: false },
      { pigId: 'ned', name: 'Ned', portrait: null, out: false, memorial: false }
    ],
    verdict: { ok: true, code: 'Ok', message: 'Ready for the garden run' }
  }, overrides);
}

async function ensureRunMounted(page, base) {
  const already = await page.evaluate(() => Boolean(window.CuyRun));
  if (!already) {
    await page.addStyleTag({ url: `${base}/web/home/features/run/feature.css` });
    await page.addScriptTag({ url: `${base}/web/home/features/run/mock.js` });
    await page.addScriptTag({ url: `${base}/web/home/features/run/feature.js` });
  }
}

async function setPlaceAndState(page, placeId, runState) {
  await page.evaluate(({ placeId, runState }) => {
    window.__testPlace = placeId;
    if (!window.CuyPlaces) window.CuyPlaces = {};
    window.CuyPlaces.getCurrentPlace = () => window.__testPlace;
    const st = { place: placeId, run: runState };
    if (window.CuyHome && typeof window.CuyHome.dispatchState === 'function') {
      window.CuyHome.dispatchState(st);
    } else if (window.CuyRun && typeof window.CuyRun.onState === 'function') {
      window.CuyRun.onState(st);
    }
  }, { placeId, runState });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await openHome(browser, { base: server.base, query: '?mock=1' });
    await ensureRunMounted(page, server.base);

    // Spy on bridge.send
    await page.evaluate(() => {
      window.__sentMessages = [];
      const origSend = window.bridge.send.bind(window.bridge);
      window.bridge.send = function (msg) {
        window.__sentMessages.push(msg);
        return origSend(msg);
      };
    });

    // V1: entry-visible-in-garden-only
    await setPlaceAndState(page, 'salon', makeRunState());
    assert.strictEqual(await page.locator('#runEntryBtn').isVisible(), false, 'V1: hidden in salon');

    await setPlaceAndState(page, 'park', makeRunState());
    assert.strictEqual(await page.locator('#runEntryBtn').isVisible(), false, 'V1: hidden in park');

    await setPlaceAndState(page, 'garden', makeRunState());
    assert.strictEqual(await page.locator('#runEntryBtn').isVisible(), true, 'V1: visible in garden');

    // Open panel via entry button
    await page.click('#runEntryBtn');
    await page.waitForSelector('.run-panel', { state: 'visible' });

    // V2: assign-pig-sends-message
    const letOutBtns = page.locator('.run-panel .run-assign-btn[data-pig-id="starter"]');
    await letOutBtns.click();
    const sent = await page.evaluate(() => window.__sentMessages);
    const outMsg = sent.find((m) => m && m.type === 'run.out' && m.pigId === 'starter');
    assert.ok(outMsg, 'V2: clicking Let out sends run.out with pigId');

    // V3: capacity-full-disables-assign
    await setPlaceAndState(page, 'garden', makeRunState({
      capacity: 1,
      out: [{ pigId: 'starter', since: '2026-11-21T10:00:00Z', hoursToday: 0.5 }],
      candidates: [
        { pigId: 'starter', name: 'Cuy', portrait: null, out: true, memorial: false },
        { pigId: 'kuki', name: 'Kuki', portrait: null, out: false, memorial: false }
      ]
    }));
    const kukiDisabled = await page.locator('.run-panel .run-assign-btn[data-pig-id="kuki"]').isDisabled();
    assert.strictEqual(kukiDisabled, true, 'V3: full capacity disables Let out for other pigs');

    // V4: unfenced-shows-hint
    await setPlaceAndState(page, 'garden', makeRunState({
      valid: false,
      reason: 'no_gate',
      cells: [],
      capacity: 0
    }));
    const panelText = await page.locator('.run-panel').innerText();
    assert.ok(panelText.includes('Close a fence line with a gate to make a run'), 'V4: unfenced shows hint');
    assert.ok(panelText.includes('no_gate'), 'V4: unfenced shows reason');

    // V5: state-update-redraws
    await setPlaceAndState(page, 'garden', makeRunState({
      valid: true,
      reason: 'ok',
      capacity: 3
    }));
    const updatedText = await page.locator('.run-panel').innerText();
    assert.ok(updatedText.includes('room for 3 pigs'), 'V5: state update redraws panel capacity');

    // V7: keyboard-operable
    await page.locator('.run-panel .run-close-btn').focus();
    await page.keyboard.press('Enter');
    assert.strictEqual(await page.locator('.run-panel').isVisible(), false, 'V7: panel closes via keyboard');
    await page.locator('#runEntryBtn').focus();
    await page.keyboard.press('Enter');
    assert.strictEqual(await page.locator('.run-panel').isVisible(), true, 'V7: entry button opens panel via keyboard');

    // V6: no-console-errors
    assert.deepStrictEqual(page.__errors, [], 'V6: no console or page errors: ' + page.__errors.join('; '));

    console.log('ux-p116-run: ALL PASS (V1..V7)');
  } finally {
    await browser.close();
    server.close();
  }
})();
