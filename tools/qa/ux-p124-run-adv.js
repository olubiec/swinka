'use strict';

const { chromium } = require('playwright');
const ux = require('./lib/ux');

const STRICT = process.env.STRICT === '1';
const results = [];

function record(status, id, detail) {
  const line = detail ? `${status} ${id}: ${detail}` : `${status} ${id}`;
  results.push({ status, id, detail: detail || '' });
  console.log(line);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

async function switchPlace(page, placeId) {
  await page.evaluate((id) => {
    if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
      window.CuyPlaces.openPlace(id);
    } else {
      const btn = document.querySelector(`#placesBar [data-place="${id}"]`);
      if (btn) btn.click();
    }
    if (window.CuyRun && typeof window.CuyRun.onState === 'function') {
      window.CuyRun.onState({ place: id });
    }
  }, placeId);
  await page.waitForTimeout(250);
}

(async () => {
  const server = await ux.startServer();
  const browser = await launchBrowser();
  const notFoundUrls = [];

  try {
    const page = await ux.openHome(browser);
    page.on('response', (res) => {
      if (res.status() === 404) {
        notFoundUrls.push(res.url());
      }
    });

    const hasRun = await page.evaluate(() => Boolean(window.CuyRun));
    if (!hasRun) {
      for (const id of [
        'RUN-entry-only-in-garden',
        'RUN-assign-flow',
        'RUN-full-disables',
        'RUN-unfenced-hint',
        'RUN-pig-actually-runs-in-run'
      ]) {
        record('SKIP', id, 'window.CuyRun not loaded');
      }
    } else {
      // 1. RUN-entry-only-in-garden
      try {
        await switchPlace(page, 'salon');
        const visSalon = await page.isVisible('#runEntryBtn');
        await switchPlace(page, 'park');
        const visPark = await page.isVisible('#runEntryBtn');
        await switchPlace(page, 'garden');
        const visGarden = await page.isVisible('#runEntryBtn');

        if (!visSalon && !visPark && visGarden) {
          record('PASS', 'RUN-entry-only-in-garden');
        } else {
          record('DEFECT', 'RUN-entry-only-in-garden', `expected hidden in salon/park and visible in garden, got salon=${visSalon} park=${visPark} garden=${visGarden}`);
        }
      } catch (e) {
        record('DEFECT', 'RUN-entry-only-in-garden', e.message);
      }

      // 2. RUN-assign-flow
      try {
        await switchPlace(page, 'garden');
        await page.evaluate(() => {
          window.__sentRunMsgs = [];
          const origSend = window.bridge && window.bridge.send;
          if (origSend && !window.__runHooked) {
            window.__runHooked = true;
            window.bridge.send = function (msg) {
              if (msg && (msg.type === 'run.out' || msg.type === 'run.in')) {
                window.__sentRunMsgs.push(msg);
              }
              return origSend.apply(this, arguments);
            };
          }
        });

        await page.click('#runEntryBtn');
        await page.waitForSelector('.run-panel-backdrop:not([hidden]) .run-panel', { timeout: 3000 });

        const btnSel = '.run-assign-btn[data-pig-id="starter"]';
        const initialText = await page.textContent(btnSel);
        await page.click(btnSel);
        await page.waitForTimeout(200);
        const afterOutText = await page.textContent(btnSel);

        await page.click(btnSel);
        await page.waitForTimeout(200);
        const afterInText = await page.textContent(btnSel);

        const sent = await page.evaluate(() => window.__sentRunMsgs || []);
        const sentOut = sent.some((m) => m.type === 'run.out' && m.pigId === 'starter');
        const sentIn = sent.some((m) => m.type === 'run.in' && m.pigId === 'starter');

        if (initialText === 'Let out' && afterOutText === 'Bring in' && afterInText === 'Let out' && sentOut && sentIn) {
          record('PASS', 'RUN-assign-flow');
        } else {
          record('DEFECT', 'RUN-assign-flow', `texts=[${initialText}->${afterOutText}->${afterInText}] sentOut=${sentOut} sentIn=${sentIn}`);
        }
      } catch (e) {
        record('DEFECT', 'RUN-assign-flow', e.message);
      }

      // 3. RUN-full-disables
      try {
        await page.evaluate(() => {
          window.CuyRun.onState({
            place: 'garden',
            run: {
              available: true,
              valid: true,
              reason: 'ok',
              cells: [[4, 3], [5, 3], [6, 3], [7, 3], [4, 4], [5, 4], [6, 4], [7, 4], [4, 5], [5, 5], [6, 5], [7, 5]],
              capacity: 1,
              out: [{ pigId: 'starter', since: '2026-11-21T10:00:00Z', hoursToday: 0 }],
              candidates: [
                { pigId: 'starter', name: 'Cuy', out: true, memorial: false },
                { pigId: 'kuki', name: 'Kuki', out: false, memorial: false }
              ],
              verdict: { ok: true, code: 'Ok', message: 'Ready for the garden run' }
            }
          });
        });
        await page.waitForTimeout(150);
        const kukiDisabled = await page.isDisabled('.run-assign-btn[data-pig-id="kuki"]');
        const starterDisabled = await page.isDisabled('.run-assign-btn[data-pig-id="starter"]');

        if (kukiDisabled && !starterDisabled) {
          record('PASS', 'RUN-full-disables');
        } else {
          record('DEFECT', 'RUN-full-disables', `expected kuki disabled & starter enabled, got kuki=${kukiDisabled} starter=${starterDisabled}`);
        }
      } catch (e) {
        record('DEFECT', 'RUN-full-disables', e.message);
      }

      // 4. RUN-unfenced-hint
      try {
        await page.evaluate(() => {
          window.CuyRun.onState({
            place: 'garden',
            run: {
              available: true,
              valid: false,
              reason: 'open_edge',
              cells: [],
              capacity: 0,
              out: [],
              candidates: [{ pigId: 'starter', name: 'Cuy', out: false, memorial: false }],
              verdict: { ok: true, code: 'Ok', message: '' }
            }
          });
        });
        await page.waitForTimeout(150);
        const statusText = await page.textContent('.run-status-box');
        if (statusText && statusText.includes('Close a fence line with a gate to make a run') && statusText.includes('open_edge')) {
          record('PASS', 'RUN-unfenced-hint');
        } else {
          record('DEFECT', 'RUN-unfenced-hint', `unexpected status text: "${statusText}"`);
        }
      } catch (e) {
        record('DEFECT', 'RUN-unfenced-hint', e.message);
      }

      // 5. RUN-pig-actually-runs-in-run
      record('SKIP', 'RUN-pig-actually-runs-in-run', 'run_overlay draws static markers; pig run animation inside run bounds not implemented in F3-3');
    }

    // 6. RUN-console-clean
    const errors = await page.evaluate(() => []);
    const pageErrors = page.__errors || [];
    if (pageErrors.length === 0 && notFoundUrls.length === 0) {
      record('PASS', 'RUN-console-clean');
    } else {
      record('DEFECT', 'RUN-console-clean', `errors=${JSON.stringify(pageErrors)} 404s=${JSON.stringify(notFoundUrls)}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  const defects = results.filter((r) => r.status === 'DEFECT').length;
  const skips = results.filter((r) => r.status === 'SKIP').length;
  const passes = results.filter((r) => r.status === 'PASS').length;
  console.log(`SUMMARY: PASS=${passes} DEFECT=${defects} SKIP=${skips}`);
  if (STRICT && defects > 0) {
    process.exit(1);
  }
})();
