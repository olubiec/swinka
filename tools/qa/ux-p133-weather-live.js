'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const ux = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');

async function loadWeatherIntoPage(page) {
  await page.addStyleTag({ path: path.join(ROOT, 'web/home/features/weather/feature.css') });
  await page.addScriptTag({ path: path.join(ROOT, 'web/home/lib/weather-live.js') });
  await page.addScriptTag({ path: path.join(ROOT, 'web/home/features/weather/mock.js') });
  await page.addScriptTag({ path: path.join(ROOT, 'web/home/features/weather/feature.js') });
  await page.evaluate(() => {
    if (window.bridge && typeof window.bridge.broadcastState === 'function') {
      window.bridge.broadcastState();
    }
  });
  await page.waitForTimeout(100);
}

async function runUnitChecks() {
  const weatherLive = require(path.join(ROOT, 'web/home/lib/weather-live.js'));

  // X1 / X6: mapState off vs on
  const off = weatherLive.mapState({ consent: false, status: 'off', condition: 'rain' });
  assert.deepStrictEqual(off, { enabled: false, kind: 'clear', intensity: 0, visualType: 'auto' });

  const offNull = weatherLive.mapState(null);
  assert.deepStrictEqual(offNull, { enabled: false, kind: 'clear', intensity: 0, visualType: 'auto' });

  const cases = [
    ['clear', { enabled: true, kind: 'clear', intensity: 0, visualType: 'clear' }],
    ['cloudy', { enabled: true, kind: 'cloudy', intensity: 0.4, visualType: 'overcast' }],
    ['fog', { enabled: true, kind: 'fog', intensity: 0.6, visualType: 'overcast' }],
    ['rain', { enabled: true, kind: 'rain', intensity: 0.7, visualType: 'rain' }],
    ['snow', { enabled: true, kind: 'snow', intensity: 0.7, visualType: 'snow' }],
    ['storm', { enabled: true, kind: 'storm', intensity: 1.0, visualType: 'rain' }]
  ];
  for (const [cond, expected] of cases) {
    assert.deepStrictEqual(
      weatherLive.mapState({ consent: true, status: 'ok', condition: cond }),
      expected,
      `mapState failed for ${cond}`
    );
  }

  // X4: validateCoordsInput
  assert.strictEqual(weatherLive.validateCoordsInput('52.23, 21.01').ok, true);
  assert.strictEqual(weatherLive.validateCoordsInput('52.23, 21.01').lat, 52.2);
  assert.strictEqual(weatherLive.validateCoordsInput('52.23, 21.01').lon, 21.0);
  assert.strictEqual(weatherLive.validateCoordsInput('91, 20').ok, false);
  assert.strictEqual(weatherLive.validateCoordsInput('52, 181').ok, false);
  assert.strictEqual(weatherLive.validateCoordsInput('NaN, 20').ok, false);
  assert.strictEqual(weatherLive.validateCoordsInput('52').ok, false);
}

async function runBrowserChecks() {
  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    browser = await chromium.launch({ channel: 'msedge' });
  }
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
    page.__errors = [];
    page.on('pageerror', (e) => { page.__errors.push('pageerror: ' + e.message); });
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
        page.__errors.push('console: ' + m.text());
      }
    });

    await page.goto(`${server.base}/web/home/index.html`);
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length >= 9,
      null,
      { timeout: 10000 }
    );
    await page.waitForTimeout(600);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(200);
    }

    // X7: intercept fetch, XMLHttpRequest, WebSocket before loading weather module
    await page.evaluate(() => {
      window.__wxNetCalls = [];
      const origFetch = window.fetch;
      window.fetch = function (url) {
        const u = String(url || '');
        if (/open-meteo|http:\/\/|https:\/\//i.test(u) && !u.startsWith(window.location.origin)) {
          window.__wxNetCalls.push('fetch:' + u);
        }
        return origFetch.apply(this, arguments);
      };
      const OrigXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function () {
        const xhr = new OrigXHR();
        const origOpen = xhr.open;
        xhr.open = function (method, url) {
          window.__wxNetCalls.push('xhr:' + method + ':' + url);
          return origOpen.apply(this, arguments);
        };
        return xhr;
      };
      window.WebSocket = function (url) {
        window.__wxNetCalls.push('ws:' + url);
        throw new Error('WebSocket blocked in mock test');
      };

      // Spy on bridge.send
      window.__wxSentMessages = [];
      if (window.bridge && typeof window.bridge.send === 'function') {
        const origSend = window.bridge.send.bind(window.bridge);
        window.bridge.send = function (msg) {
          if (msg && typeof msg.type === 'string' && msg.type.startsWith('weather.')) {
            window.__wxSentMessages.push(msg);
          }
          return origSend(msg);
        };
      }
    });

    await loadWeatherIntoPage(page);

    // Open weather feature directly (since PK-APP4 wires index.json separately)
    await page.evaluate(() => {
      window.CuyHome.openFeature('weather');
    });
    await page.waitForSelector('#wxConsentToggle', { timeout: 5000 });

    // X1: default-off
    const initial = await page.evaluate(() => ({
      checked: document.getElementById('wxConsentToggle').checked,
      status: document.getElementById('wxStatusText').textContent.trim(),
      state: window.bridge.getState().weather
    }));
    assert.strictEqual(initial.checked, false, 'X1: toggle should be off by default');
    assert.strictEqual(initial.state.consent, false, 'X1: state.weather.consent should be false');
    assert.strictEqual(initial.state.status, 'off', 'X1: state.weather.status should be off');
    assert.strictEqual(initial.status, 'Off', 'X1: UI status should be Off');

    // X2: consent-text-lists-data-sent
    const modalText = await page.$eval('.wx-panel', (el) => el.textContent);
    assert.ok(modalText.includes('api.open-meteo.com'), 'X2: must mention api.open-meteo.com');
    assert.ok(modalText.includes('1 decimal'), 'X2: must mention 1 decimal');
    assert.ok(modalText.includes('30 minutes'), 'X2: must mention 30 minutes');
    assert.ok(modalText.includes('geocoding-api.open-meteo.com'), 'X2: must mention geocoding-api.open-meteo.com');
    assert.ok(modalText.includes('Weather data by Open-Meteo.com (CC BY 4.0)'), 'X2: must include attribution');

    // X3: enable-sends-message
    await page.click('#wxConsentToggle');
    await page.waitForTimeout(100);
    const afterEnable = await page.evaluate(() => ({
      checked: document.getElementById('wxConsentToggle').checked,
      sent: window.__wxSentMessages.filter((m) => m.type === 'weather.setConsent'),
      state: window.bridge.getState().weather
    }));
    assert.strictEqual(afterEnable.checked, true, 'X3: toggle should be checked');
    assert.ok(afterEnable.sent.some((m) => m.consent === true), 'X3: must send weather.setConsent(true)');
    assert.strictEqual(afterEnable.state.consent, true, 'X3: mock state consent should be true');

    // X4: invalid-location-rejected-in-ui
    const sentBeforeInvalid = await page.evaluate(() => window.__wxSentMessages.length);
    await page.fill('#wxLocationInput', '999, 200');
    await page.click('#wxSaveLocationBtn');
    await page.waitForTimeout(50);
    const invalidRes = await page.evaluate(() => ({
      errorVisible: !document.getElementById('wxErrorMsg').hidden,
      errorText: document.getElementById('wxErrorMsg').textContent.trim(),
      sentCount: window.__wxSentMessages.length
    }));
    assert.strictEqual(invalidRes.errorVisible, true, 'X4: error message should be visible');
    assert.ok(invalidRes.errorText.length > 0, 'X4: error text should be non-empty');
    assert.strictEqual(invalidRes.sentCount, sentBeforeInvalid, 'X4: invalid coords must not send message');

    // X5: delete-location-clears
    await page.fill('#wxLocationInput', '52.23, 21.01');
    await page.click('#wxSaveLocationBtn');
    await page.waitForTimeout(100);
    let savedState = await page.evaluate(() => window.bridge.getState().weather);
    assert.strictEqual(savedState.lat, 52.2, 'X5: lat should be rounded to 52.2');
    assert.strictEqual(savedState.lon, 21.0, 'X5: lon should be rounded to 21.0');

    await page.click('#wxDeleteLocationBtn');
    await page.waitForTimeout(100);
    savedState = await page.evaluate(() => window.bridge.getState().weather);
    assert.strictEqual(savedState.locationName, '', 'X5: locationName must be cleared');
    assert.strictEqual(savedState.lat, null, 'X5: lat must be null');
    assert.strictEqual(savedState.lon, null, 'X5: lon must be null');

    // X8: offline-state-shown
    await page.evaluate(() => {
      const s = window.bridge.currentState;
      s.weather = Object.assign({}, s.weather, {
        consent: true,
        status: 'offline',
        lat: 52.2,
        lon: 21.0,
        locationName: 'Warsaw'
      });
      window.bridge.broadcastState();
    });
    await page.waitForTimeout(100);
    const offlineText = await page.$eval('#wxStatusText', (el) => el.textContent.trim());
    assert.ok(offlineText.startsWith('Offline'), `X8: expected Offline status, got "${offlineText}"`);

    // X9: keyboard-operable
    await page.focus('#wxConsentToggle');
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    const toggledByKey = await page.$eval('#wxConsentToggle', (el) => el.checked);
    assert.strictEqual(toggledByKey, false, 'X9: Space on toggle should toggle consent off');

    await page.focus('#wxLocationInput');
    await page.fill('#wxLocationInput', 'Warsaw');
    await page.focus('#wxSaveLocationBtn');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const sentCity = await page.evaluate(() =>
      window.__wxSentMessages.some((m) => m.type === 'weather.setLocation' && m.city === 'Warsaw')
    );
    assert.strictEqual(sentCity, true, 'X9: Enter on Save location should send city');

    // X7: zero network calls
    const netCalls = await page.evaluate(() => window.__wxNetCalls);
    assert.deepStrictEqual(netCalls, [], 'X7: zero fetch/XHR/WS calls allowed in mock');

    // X10: no-console-errors
    assert.deepStrictEqual(page.__errors, [], 'X10: expected zero console/page errors');

    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
}

(async () => {
  runUnitChecks();
  await runBrowserChecks();
  console.log('ux-p133-weather-live: PASS (X1-X10)');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
