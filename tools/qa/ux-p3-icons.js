'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 400, height: 620 } });
  const page = await ux.openHome(context);
  page.setDefaultTimeout(5000);

  let hasFailures = false;

  const testScenario = async (name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    } finally {
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  };

  function endsWithAsset(bg, assetName) {
    if (!bg || bg === 'none') return false;
    const re = new RegExp(assetName.replace('.', '\\.') + '["\')]*$');
    return re.test(bg);
  }

  async function getFeaturesList() {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 4000 });
    const feats = await page.$$eval('#modalBody button[data-open-feature]', btns => btns.map(b => b.dataset.openFeature));
    if (feats.length < 8) {
      throw new Error(`Expected at least 8 features in More, found ${feats.length}`);
    }
    return feats.slice(0, 8);
  }

  // I1: same-asset
  await testScenario('same-asset', async () => {
    // 1. Home header close button
    const headerCloseBg = await page.$eval('#btnClose', el => getComputedStyle(el).backgroundImage);
    if (!endsWithAsset(headerCloseBg, 'close_btn.png')) {
      throw new Error(`Header close button does not use close_btn.png, got: ${headerCloseBg}`);
    }

    // 2. Bar navigation arrows
    const arrowLeftBg = await page.$eval('.places-bar .ui-arrow-left', el => getComputedStyle(el).backgroundImage);
    if (!endsWithAsset(arrowLeftBg, 'arrow_left.png')) {
      throw new Error(`Places left arrow does not use arrow_left.png, got: ${arrowLeftBg}`);
    }
    const arrowRightBg = await page.$eval('.places-bar .ui-arrow-right', el => getComputedStyle(el).backgroundImage);
    if (!endsWithAsset(arrowRightBg, 'arrow_right.png')) {
      throw new Error(`Places right arrow does not use arrow_right.png, got: ${arrowRightBg}`);
    }

    // 3. More dialog close button
    const features = await getFeaturesList();
    const moreCloseBg = await page.$eval('#modalCloseBtn', el => getComputedStyle(el).backgroundImage);
    if (!endsWithAsset(moreCloseBg, 'close_btn.png')) {
      throw new Error(`More close button does not use close_btn.png, got: ${moreCloseBg}`);
    }

    // 4. Feature dialogs (at least 8)
    for (const feat of features) {
      await page.click(`#modalBody button[data-open-feature="${feat}"]`);
      await page.waitForSelector('.modal-back', { timeout: 3000 });

      const backBg = await page.$eval('.modal-back', el => getComputedStyle(el).backgroundImage);
      if (!endsWithAsset(backBg, 'back_btn.png')) {
        throw new Error(`Feature "${feat}" back button does not use back_btn.png, got: ${backBg}`);
      }

      const closeBg = await page.$eval('#modalCloseBtn', el => getComputedStyle(el).backgroundImage);
      if (!endsWithAsset(closeBg, 'close_btn.png')) {
        throw new Error(`Feature "${feat}" close button does not use close_btn.png, got: ${closeBg}`);
      }

      await page.click('.modal-back');
      await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
      await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 3000 });
    }
    await ux.closeModal(page);
  });

  // I2: size-and-hit
  await testScenario('size-and-hit', async () => {
    const checkControl = async (selector, expectedAriaLabel, name) => {
      const box = await page.$eval(selector, el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          width: rect.width,
          height: rect.height,
          visible: el.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden',
          ariaLabel: el.getAttribute('aria-label') || ''
        };
      });

      if (!box.visible) throw new Error(`${name} is not visible`);
      if (box.width < 32 || box.height < 32) {
        throw new Error(`${name} size (${box.width}x${box.height}) is under 32x32`);
      }
      if (expectedAriaLabel && !expectedAriaLabel.test(box.ariaLabel)) {
        throw new Error(`${name} aria-label ("${box.ariaLabel}") does not match ${expectedAriaLabel}`);
      }
    };

    // Header close and bar arrows
    await checkControl('#btnClose', /close/i, 'Header close button');
    await checkControl('.places-bar .ui-arrow-left', /previous/i, 'Places prev arrow');
    await checkControl('.places-bar .ui-arrow-right', /next/i, 'Places next arrow');

    // More close button
    const features = await getFeaturesList();
    await checkControl('#modalCloseBtn', /close/i, 'More close button');

    // Features
    for (const feat of features) {
      await page.click(`#modalBody button[data-open-feature="${feat}"]`);
      await page.waitForSelector('.modal-back', { timeout: 3000 });

      await checkControl('.modal-back', /back/i, `Feature "${feat}" back button`);
      await checkControl('#modalCloseBtn', /close/i, `Feature "${feat}" close button`);

      await page.click('.modal-back');
      await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
    }
    await ux.closeModal(page);
  });

  // I3: works
  await testScenario('works', async () => {
    // 1. Close button closes More
    await ux.openMore(page);
    await page.click('#modalCloseBtn');
    await page.waitForTimeout(150);
    if (await page.isVisible('#modalBackdrop.active')) {
      throw new Error('Modal remained open after clicking Close button in More');
    }

    // 2. Escape closes More
    await ux.openMore(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    if (await page.isVisible('#modalBackdrop.active')) {
      throw new Error('Modal remained open after pressing Escape in More');
    }

    // 3. Escape closes feature window
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature="album"]', { timeout: 3000 });
    await page.click('#modalBody button[data-open-feature="album"]');
    await page.waitForSelector('.modal-back', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    if (await page.isVisible('#modalBackdrop.active')) {
      throw new Error('Modal remained open after pressing Escape in feature window');
    }

    // 4. Back button returns to More, and close closes from feature
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature="album"]', { timeout: 3000 });
    await page.click('#modalBody button[data-open-feature="album"]');
    await page.waitForSelector('.modal-back', { timeout: 3000 });
    await page.click('.modal-back');
    await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
    const backExists = await page.isVisible('.modal-back');
    if (backExists) throw new Error('Back button should be removed after returning to More');

    await page.click('#modalCloseBtn');
    await page.waitForTimeout(150);
    if (await page.isVisible('#modalBackdrop.active')) {
      throw new Error('Modal remained open after clicking Close in More');
    }
  });

  // I4: no-glyph-no-svg
  await testScenario('no-glyph-no-svg', async () => {
    const checkControl = async (selector, name) => {
      const data = await page.$eval(selector, el => ({
        text: el.textContent || '',
        hasSvg: el.querySelector('svg') !== null,
        bg: getComputedStyle(el).backgroundImage || ''
      }));
      if (/[✕←→‹›]/.test(data.text)) {
        throw new Error(`${name} has raw glyph text: "${data.text}"`);
      }
      if (data.hasSvg) {
        throw new Error(`${name} contains an <svg> element`);
      }
      if (data.bg.includes('.svg')) {
        throw new Error(`${name} uses SVG in background: "${data.bg}"`);
      }
    };

    // Home controls
    await checkControl('#btnClose', 'Header close button');
    await checkControl('.places-bar .ui-arrow-left', 'Places prev arrow');
    await checkControl('.places-bar .ui-arrow-right', 'Places next arrow');

    // More close
    const features = await getFeaturesList();
    await checkControl('#modalCloseBtn', 'More close button');

    // In features
    for (const feat of features) {
      await page.click(`#modalBody button[data-open-feature="${feat}"]`);
      await page.waitForSelector('.modal-back', { timeout: 3000 });

      await checkControl('.modal-back', `Feature "${feat}" back button`);
      await checkControl('#modalCloseBtn', `Feature "${feat}" close button`);

      await page.click('.modal-back');
      await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
    }
    await ux.closeModal(page);
  });

  // I5: screens
  await testScenario('screens', async () => {
    const shotsDir = path.resolve(__dirname, '..', '..', 'docs', 'qa', 'shots');
    if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });

    // 1. Home with bar (garden scene)
    if (await page.isVisible('#modalBackdrop.active')) {
      await ux.closeModal(page);
    }
    await page.evaluate(() => {
      if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
        window.CuyPlaces.setCurrentPlace('garden');
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(shotsDir, 'p37-home-bar.png') });

    // 2. More
    await ux.openMore(page);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(shotsDir, 'p37-more.png') });

    // 3. Garden window
    const gardenBtn = await page.$('#modalBody button[data-open-feature="garden"]');
    if (gardenBtn) {
      await gardenBtn.click();
      await page.waitForSelector('.modal-back', { timeout: 3000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(shotsDir, 'p37-garden.png') });
      await page.click('.modal-back');
      await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
    }

    // 4. Album window
    const albumBtn = await page.$('#modalBody button[data-open-feature="album"]');
    if (albumBtn) {
      await albumBtn.click();
      await page.waitForSelector('.modal-back', { timeout: 3000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(shotsDir, 'p37-album.png') });
      await page.click('.modal-back');
      await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
    }

    // 5. Rooms window
    const roomsBtn = await page.$('#modalBody button[data-open-feature="rooms"]');
    if (roomsBtn) {
      await roomsBtn.click();
      await page.waitForSelector('.modal-back', { timeout: 3000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(shotsDir, 'p37-rooms.png') });
      await page.click('.modal-back');
      await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
    }

    await ux.closeModal(page);
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
