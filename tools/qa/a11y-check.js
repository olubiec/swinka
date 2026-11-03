// Headless accessibility check (Playwright, 420x640 viewport).
// Verifies buttons and input controls have accessible names (aria-label, title, or innerText).
// Verifies tab order, that focus is not lost, and that focus indicator is visible.
// Prints 'A11Y OK' and exits with code 0 on success.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function startServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function run() {
  const server = await startServer();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );

  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 420, height: 640 } });
    page.on('pageerror', (err) => errors.push('Page error: ' + err.message));

    await page.goto(base + '/web/home/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    // 1. Verify accessible names on all interactive controls (buttons, inputs, selects, textareas, [role="button"])
    const controls = await page.evaluate(() => {
      const selectors = 'button, input, select, textarea, [role="button"]';
      const elements = Array.from(document.querySelectorAll(selectors));

      return elements.map((el) => {
        const ariaLabel = (el.getAttribute('aria-label') || '').trim();
        const title = (el.getAttribute('title') || '').trim();
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        let labelledByText = '';
        if (ariaLabelledBy) {
          const target = document.getElementById(ariaLabelledBy);
          if (target) labelledByText = (target.innerText || target.textContent || '').trim();
        }
        const text = (el.innerText || el.textContent || '').trim();
        const placeholder = (el.placeholder || '').trim();
        const value = (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') ? el.value : '').trim();

        const accessibleName = ariaLabel || title || labelledByText || text || placeholder || value;
        const style = window.getComputedStyle(el);
        const isHidden = style.display === 'none' || style.visibility === 'hidden' || el.closest('[hidden]') !== null;

        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          role: el.getAttribute('role') || null,
          ariaLabel: ariaLabel || null,
          title: title || null,
          text: text ? text.slice(0, 30) : null,
          accessibleName: accessibleName || null,
          hasAccessibleName: Boolean(accessibleName),
          isHidden
        };
      });
    });

    const unnamed = controls.filter((c) => !c.hasAccessibleName);
    if (unnamed.length > 0) {
      errors.push(`Found ${unnamed.length} control(s) missing accessible name: ` + JSON.stringify(unnamed));
    }

    // 2. Tab order and focus test
    // Focus should move through interactive visible elements without being lost to body / null.
    // Each focused element should have visible focus indicator (outline or shadow).
    const tabHistory = [];
    const minSteps = 12;
    for (let step = 0; step < minSteps; step++) {
      await page.keyboard.press('Tab');
      const focusInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) {
          return { lost: true };
        }
        const style = window.getComputedStyle(el);
        const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
        const hasBoxShadow = style.boxShadow && style.boxShadow !== 'none';
        return {
          lost: false,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          role: el.getAttribute('role') || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          visibleFocus: hasOutline || hasBoxShadow
        };
      });

      if (focusInfo.lost) {
        errors.push(`Tab step ${step + 1}: focus lost to body or null`);
      } else {
        if (!focusInfo.visibleFocus) {
          errors.push(`Tab step ${step + 1} (${focusInfo.id || focusInfo.tag}): focus is not visible`);
        }
        tabHistory.push(focusInfo);
      }
    }

    // Verify tab order visited key navigation controls
    const visitedIds = new Set(tabHistory.map((f) => f.id).filter(Boolean));
    const expectedControls = ['btnSound', 'btnClose', 'btnFeed', 'btnClean', 'btnShop'];
    for (const exp of expectedControls) {
      if (!visitedIds.has(exp)) {
        errors.push(`Tab order did not reach expected control: #${exp}`);
      }
    }

    if (errors.length > 0) {
      console.error('A11Y FAIL:\n' + errors.join('\n'));
      process.exitCode = 1;
      return;
    }

    console.log('A11Y OK');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('A11Y error:', err);
  process.exit(1);
});
