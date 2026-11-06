'use strict';
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
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

  // Helper to get features to test (at least 6)
  async function getFeaturesList() {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 4000 });
    const feats = await page.$$eval('#modalBody button[data-open-feature]', btns => btns.map(b => b.dataset.openFeature));
    if (feats.length < 6) {
      throw new Error(`Expected at least 6 features in More, found ${feats.length}`);
    }
    return feats.slice(0, 6);
  }

  // I1: same-icons
  await testScenario('same-icons', async () => {
    const features = await getFeaturesList();

    const moreCloseBg = await page.$eval('#modalCloseBtn', el => getComputedStyle(el).backgroundImage);
    if (!moreCloseBg || moreCloseBg === 'none' || !moreCloseBg.includes('close.svg')) {
      throw new Error(`More close button does not use close.svg, got: ${moreCloseBg}`);
    }

    let expectedBackBg = null;

    for (const feat of features) {
      await page.click(`#modalBody button[data-open-feature="${feat}"]`);
      await page.waitForSelector('.modal-back', { timeout: 3000 });

      const backBg = await page.$eval('.modal-back', el => getComputedStyle(el).backgroundImage);
      if (!backBg || backBg === 'none' || !backBg.includes('back.svg')) {
        throw new Error(`Feature "${feat}" back button does not use back.svg, got: ${backBg}`);
      }
      if (expectedBackBg === null) {
        expectedBackBg = backBg;
      } else if (backBg !== expectedBackBg) {
        throw new Error(`Feature "${feat}" back button backgroundImage differs: expected "${expectedBackBg}", got "${backBg}"`);
      }

      const closeBg = await page.$eval('#modalCloseBtn', el => getComputedStyle(el).backgroundImage);
      if (closeBg !== moreCloseBg) {
        throw new Error(`Feature "${feat}" close button backgroundImage differs from More close button: expected "${moreCloseBg}", got "${closeBg}"`);
      }

      await page.click('.modal-back');
      await page.waitForFunction(() => document.getElementById('modalTitle')?.textContent.trim() === 'More');
      await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 3000 });
    }
    await ux.closeModal(page);
  });

  // I2: size-and-hit
  await testScenario('size-and-hit', async () => {
    const features = await getFeaturesList();

    // Check More close button
    const closeBox = await page.$eval('#modalCloseBtn', el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        visible: el.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden',
        ariaLabel: el.getAttribute('aria-label') || ''
      };
    });

    if (!closeBox.visible) throw new Error('More close button is not visible');
    if (closeBox.width < 32 || closeBox.height < 32) {
      throw new Error(`More close button size (${closeBox.width}x${closeBox.height}) is under 32x32`);
    }
    if (!/close/i.test(closeBox.ariaLabel)) {
      throw new Error(`More close button aria-label ("${closeBox.ariaLabel}") does not match Close`);
    }

    // Check in features
    for (const feat of features) {
      await page.click(`#modalBody button[data-open-feature="${feat}"]`);
      await page.waitForSelector('.modal-back', { timeout: 3000 });

      const backBox = await page.$eval('.modal-back', el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          width: rect.width,
          height: rect.height,
          visible: el.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden',
          ariaLabel: el.getAttribute('aria-label') || ''
        };
      });

      if (!backBox.visible) throw new Error(`Back button in "${feat}" is not visible`);
      if (backBox.width < 32 || backBox.height < 32) {
        throw new Error(`Back button in "${feat}" size (${backBox.width}x${backBox.height}) is under 32x32`);
      }
      if (!/back/i.test(backBox.ariaLabel)) {
        throw new Error(`Back button in "${feat}" aria-label ("${backBox.ariaLabel}") does not match Back`);
      }

      const fCloseBox = await page.$eval('#modalCloseBtn', el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          width: rect.width,
          height: rect.height,
          visible: el.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden',
          ariaLabel: el.getAttribute('aria-label') || ''
        };
      });

      if (!fCloseBox.visible) throw new Error(`Close button in "${feat}" is not visible`);
      if (fCloseBox.width < 32 || fCloseBox.height < 32) {
        throw new Error(`Close button in "${feat}" size (${fCloseBox.width}x${fCloseBox.height}) is under 32x32`);
      }
      if (!/close/i.test(fCloseBox.ariaLabel)) {
        throw new Error(`Close button in "${feat}" aria-label ("${fCloseBox.ariaLabel}") does not match Close`);
      }

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
    await page.click('#modalBody button[data-open-feature="album"]');
    await page.waitForSelector('.modal-back', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    if (await page.isVisible('#modalBackdrop.active')) {
      throw new Error('Modal remained open after pressing Escape in feature window');
    }

    // 4. Back button returns to More, and close closes from feature
    await ux.openMore(page);
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

  // I4: no-text-glyph
  await testScenario('no-text-glyph', async () => {
    const features = await getFeaturesList();

    const checkNoGlyph = (text, name) => {
      if (text.includes('✕') || text.includes('←')) {
        throw new Error(`${name} has raw text glyph (✕ or ←): "${text}"`);
      }
    };

    const moreCloseText = await page.$eval('#modalCloseBtn', el => el.textContent);
    checkNoGlyph(moreCloseText, 'More close button');

    for (const feat of features) {
      await page.click(`#modalBody button[data-open-feature="${feat}"]`);
      await page.waitForSelector('.modal-back', { timeout: 3000 });

      const backText = await page.$eval('.modal-back', el => el.textContent);
      checkNoGlyph(backText, `Feature "${feat}" back button`);

      const closeText = await page.$eval('#modalCloseBtn', el => el.textContent);
      checkNoGlyph(closeText, `Feature "${feat}" close button`);

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
