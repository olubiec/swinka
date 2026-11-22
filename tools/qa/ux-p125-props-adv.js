'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ux = require('./lib/ux');

const STRICT = process.env.STRICT === '1';
const ROOT = path.resolve(__dirname, '..', '..');
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

(async () => {
  // 1. PROP-manual-sheet
  try {
    const manualPath = path.join(ROOT, 'docs', 'qa', 'DESKTOP_PROPS_MANUAL.md');
    if (!fs.existsSync(manualPath)) {
      record('DEFECT', 'PROP-manual-sheet', 'docs/qa/DESKTOP_PROPS_MANUAL.md missing');
    } else {
      const content = fs.readFileSync(manualPath, 'utf8');
      const missingSteps = [];
      for (let i = 1; i <= 8; i++) {
        if (!new RegExp(`^${i}\\.\\s+`, 'm').test(content)) {
          missingSteps.push(i);
        }
      }
      if (missingSteps.length === 0) {
        record('PASS', 'PROP-manual-sheet');
      } else {
        record('DEFECT', 'PROP-manual-sheet', `missing numbered steps: ${missingSteps.join(', ')}`);
      }
    }
  } catch (e) {
    record('DEFECT', 'PROP-manual-sheet', e.message);
  }

  // 2. Home UI checks (SKIP if no props UI in Home)
  const server = await ux.startServer();
  const browser = await launchBrowser();
  try {
    const page = await ux.openHome(browser);
    const hasPropsUi = await page.evaluate(() => {
      if (window.CuyProps) return true;
      if (window.CuyHome && typeof window.CuyHome.listFeatures === 'function') {
        return window.CuyHome.listFeatures().some((f) => f && f.id === 'props');
      }
      return false;
    });

    if (!hasPropsUi) {
      record('SKIP', 'PROP-ui-place-remove', 'no desktop props UI in Home (rooms retired in P40d)');
      record('SKIP', 'PROP-ui-limit-message', 'no desktop props UI in Home (rooms retired in P40d)');
    } else {
      record('SKIP', 'PROP-ui-place-remove', 'props UI detected but automated flow not defined in R39');
      record('SKIP', 'PROP-ui-limit-message', 'props UI detected but automated flow not defined in R39');
    }

    if ((page.__errors || []).length === 0) {
      record('PASS', 'PROP-console-clean');
    } else {
      record('DEFECT', 'PROP-console-clean', JSON.stringify(page.__errors));
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
