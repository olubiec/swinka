'use strict';

const { chromium } = require('playwright');
const { startServer, openMore, openFromMore } = require('./lib/ux');

const STRICT = process.env.STRICT === '1';

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (_) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

async function openHomeWithTracker(browser, base) {
  const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
  page.__errors = [];
  page.__externalRequests = [];

  page.on('pageerror', (e) => { page.__errors.push('pageerror: ' + e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      page.__errors.push('console: ' + m.text());
    }
  });
  page.on('request', (req) => {
    const url = req.url();
    if (isExternalUrl(url, base)) {
      page.__externalRequests.push(url);
    }
  });

  await page.goto(`${base}/web/home/index.html`);
  await page.evaluate(() => document.body.classList.add('webview-mode'));
  await page.waitForFunction(
    () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().some((f) => f.id === 'weather'),
    null,
    { timeout: 10000 }
  );
  await page.waitForTimeout(600);
  if (await page.isVisible('#modalBackdrop.active')) {
    await page.click('#modalCloseBtn');
    await page.waitForTimeout(200);
  }
  return page;
}

function isExternalUrl(url, baseOrigin) {
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return false;
  return !url.startsWith(baseOrigin);
}

(async () => {
  const results = [];
  function pass(id, detail) {
    results.push({ id, status: 'PASS', detail: detail || '' });
    console.log(`PASS ${id}${detail ? ': ' + detail : ''}`);
  }
  function defect(id, detail) {
    results.push({ id, status: 'DEFECT', detail });
    console.log(`DEFECT ${id}: ${detail}`);
  }
  function skip(id, reason) {
    results.push({ id, status: 'SKIP', detail: reason });
    console.log(`SKIP ${id}: ${reason}`);
  }

  let server;
  let browser;
  try {
    server = await startServer();
    browser = await launchBrowser();

    const page = await openHomeWithTracker(browser, server.base);
    const externalRequests = page.__externalRequests;

    // 1. WX-no-request-before-consent: 10s observation after start
    await page.waitForTimeout(10000);
    if (externalRequests.length === 0) {
      pass('WX-no-request-before-consent', '0 external requests in 10s after startup');
    } else {
      defect('WX-no-request-before-consent', `Found ${externalRequests.length} external requests: ${externalRequests.join(', ')}`);
    }

    // Open Live Weather modal
    await openMore(page);
    await openFromMore(page, 'Live Weather');
    await page.waitForSelector('#wxConsentToggle', { timeout: 5000 });

    // 2. WX-consent-text-matches-data-sent
    const consentText = (await page.textContent('.wx-consent-text')) || '';
    const attributionText = (await page.textContent('#wxAttribution')) || '';
    const hasHost = consentText.includes('api.open-meteo.com');
    const hasPrecision = /1 decimal/i.test(consentText);
    const hasInterval = /30 min/i.test(consentText);
    const hasNoPiiClaim = /no player name, pig data, or device id/i.test(consentText);
    const hasAttribution = attributionText.includes('Open-Meteo.com (CC BY 4.0)');
    if (hasHost && hasPrecision && hasInterval && hasNoPiiClaim && hasAttribution) {
      pass('WX-consent-text-matches-data-sent');
    } else {
      defect('WX-consent-text-matches-data-sent', `Consent/attribution text mismatch: host=${hasHost}, precision=${hasPrecision}, interval=${hasInterval}, noPii=${hasNoPiiClaim}, attr=${hasAttribution}`);
    }

    // 3. WX-consent-off-stops-requests
    const beforeCount = externalRequests.length;
    await page.click('#wxConsentToggle');
    await page.waitForTimeout(150);
    await page.fill('#wxLocationInput', '52.22977, 21.01178');
    await page.click('#wxSaveLocationBtn');
    await page.waitForTimeout(150);
    // Turn consent OFF
    await page.click('#wxConsentToggle');
    await page.waitForTimeout(150);
    const countAfterOff = externalRequests.length;
    const refreshDisabled = await page.isDisabled('#wxRefreshBtn');
    await page.click('#wxRefreshBtn', { force: true });
    await page.waitForTimeout(500);
    const statusAfterOff = ((await page.textContent('#wxStatusText')) || '').trim();
    const consentChecked = await page.isChecked('#wxConsentToggle');
    if (refreshDisabled && externalRequests.length === countAfterOff && externalRequests.length === beforeCount && statusAfterOff === 'Off' && !consentChecked) {
      pass('WX-consent-off-stops-requests');
    } else {
      defect('WX-consent-off-stops-requests', `refreshDisabled=${refreshDisabled}, externalRequests=${externalRequests.length - beforeCount}, status='${statusAfterOff}', checked=${consentChecked}`);
    }

    // 4. WX-delete-location-clears-state
    await page.click('#wxConsentToggle');
    await page.waitForTimeout(150);
    await page.fill('#wxLocationInput', '52.2, 21.0');
    await page.click('#wxSaveLocationBtn');
    await page.waitForTimeout(150);
    await page.click('#wxDeleteLocationBtn');
    await page.waitForTimeout(150);
    const savedLocText = ((await page.textContent('#wxSavedLocation')) || '').trim();
    const weatherAfterDelete = await page.evaluate(() => {
      const s = window.bridge && typeof window.bridge.getState === 'function' ? window.bridge.getState() : null;
      return s ? s.weather : null;
    });
    if (
      savedLocText === 'None' &&
      weatherAfterDelete &&
      weatherAfterDelete.locationName === '' &&
      weatherAfterDelete.lat === null &&
      weatherAfterDelete.lon === null
    ) {
      pass('WX-delete-location-clears-state');
    } else {
      defect('WX-delete-location-clears-state', `savedLoc='${savedLocText}', state=${JSON.stringify(weatherAfterDelete)}`);
    }

    // 5. WX-offline-ui
    await page.evaluate(() => {
      if (window.bridge && window.bridge.currentState) {
        window.bridge.currentState.weather = Object.assign({}, window.bridge.currentState.weather, {
          consent: true,
          status: 'offline',
          locationName: '52.2, 21.0',
          lat: 52.2,
          lon: 21.0,
          condition: 'clear'
        });
        window.bridge.broadcastState();
      }
    });
    await page.waitForTimeout(100);
    const offlineStatus = ((await page.textContent('#wxStatusText')) || '').trim();
    const errHidden = await page.evaluate(() => {
      const el = document.querySelector('#wxErrorMsg');
      return !el || el.hidden;
    });
    if (offlineStatus === 'Offline' && errHidden) {
      pass('WX-offline-ui');
    } else {
      defect('WX-offline-ui', `Expected status='Offline' and hidden error, got status='${offlineStatus}', errHidden=${errHidden}`);
    }

    // 6. WX-console-clean
    if (page.__errors.length === 0) {
      pass('WX-console-clean');
    } else {
      defect('WX-console-clean', page.__errors.join(' | '));
    }

    const defectCount = results.filter((r) => r.status === 'DEFECT').length;
    const skipCount = results.filter((r) => r.status === 'SKIP').length;
    console.log(`Summary: ${results.length - defectCount - skipCount} PASS, ${defectCount} DEFECT, ${skipCount} SKIP`);
    if (STRICT && defectCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal error in ux-p143-weather-privacy.js:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
})();
