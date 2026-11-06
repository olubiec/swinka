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

  // S1: more-after-weight
  await testScenario('more-after-weight', async () => {
    await ux.openMore(page);
    await ux.openFromMore(page, 'Care calendar');
    await page.waitForSelector('.fc-tab[data-tab="weight"]', { timeout: 4000 });
    await page.click('.fc-tab[data-tab="weight"]');
    await page.waitForTimeout(200);
    await ux.closeModal(page);
    await ux.pushState(page);
    await ux.pushState(page);
    await ux.pushState(page);
    await ux.openMore(page);
    await ux.pushState(page);
    await page.waitForTimeout(200);
    const html = await ux.modalHtml(page);
    if (!html.includes('album-grid')) {
      throw new Error('.album-grid is absent in modal after openMore');
    }
    if (html.includes('fc-tabs') || html.includes('fc-content')) {
      throw new Error('Weight/calendar content leaked into More modal');
    }
    await ux.closeModal(page);
  });

  // S2: stale-container-all-features
  await testScenario('stale-container-all-features', async () => {
    const features = await page.evaluate(() => window.CuyHome.listFeatures().map(f => ({ id: f.id, title: f.title })));
    for (const feat of features) {
      await ux.openMore(page);
      await ux.openFromMore(page, feat.title);
      await page.waitForTimeout(150);
      await ux.closeModal(page);
      await ux.pushState(page);

      const isActive = await page.isVisible('.modal-backdrop.active');
      if (isActive) {
        throw new Error(`.modal-backdrop.active is still present after closing feature ${feat.id}`);
      }

      const bodyInfo = await page.evaluate(() => {
        const mb = document.querySelector('.modal-body');
        return {
          className: mb.className.trim(),
          childCount: mb.children.length,
          html: mb.innerHTML.trim()
        };
      });
      if (bodyInfo.className !== 'modal-body') {
        throw new Error(`modal-body class is "${bodyInfo.className}", expected "modal-body" after closing feature ${feat.id}`);
      }
      if (bodyInfo.html !== '' && bodyInfo.className !== 'modal-body') {
        throw new Error(`Feature ${feat.id} content re-rendered while closed: ${bodyInfo.html.slice(0, 80)}`);
      }

      await ux.openMore(page);
      const htmlMore = await ux.modalHtml(page);
      if (!htmlMore.includes('album-grid')) {
        throw new Error(`.album-grid is absent after closing feature ${feat.id}`);
      }
      await ux.closeModal(page);
    }
  });

  // S3: switch-feature-no-leak
  await testScenario('switch-feature-no-leak', async () => {
    await ux.openMore(page);
    await ux.openFromMore(page, 'Care calendar');
    await page.waitForSelector('.modal-back', { timeout: 3000 });
    await page.click('.modal-back');
    await page.waitForTimeout(200);
    await ux.openFromMore(page, 'Vet clinic');
    await page.waitForTimeout(200);
    await ux.pushState(page);
    const html = await ux.modalHtml(page);
    if (html.includes('fc-tabs') || html.includes('fc-content')) {
      throw new Error('Calendar content leaked into Vet clinic modal after state push');
    }
    const currentFeat = await page.evaluate(() => window.CuyHome.currentFeatureId);
    if (currentFeat !== 'vet') {
      throw new Error(`Current feature is "${currentFeat}", expected "vet"`);
    }
    await ux.closeModal(page);
  });

  // S4: back-button
  await testScenario('back-button', async () => {
    // 1. Opened from More -> has Back control
    await ux.openMore(page);
    await ux.openFromMore(page, 'Care calendar');
    await page.waitForSelector('.modal-back', { timeout: 3000 });
    const backAttrs = await page.$eval('.modal-back', el => ({
      ariaLabel: el.getAttribute('aria-label'),
      text: el.textContent.trim(),
      tabIndex: el.tabIndex
    }));
    if (backAttrs.ariaLabel !== 'Back to More') {
      throw new Error(`Back button aria-label is "${backAttrs.ariaLabel}", expected "Back to More"`);
    }
    if (!backAttrs.text.includes('Back') && !backAttrs.text.includes('←')) {
      throw new Error(`Back button text is "${backAttrs.text}", expected "Back" or left arrow`);
    }
    await page.click('.modal-back');
    await page.waitForTimeout(200);

    const title = await page.$eval('#modalTitle', el => el.textContent.trim());
    if (title !== 'More') {
      throw new Error(`Title after clicking Back is "${title}", expected "More"`);
    }
    const html = await ux.modalHtml(page);
    if (!html.includes('album-grid')) {
      throw new Error('.album-grid missing after clicking Back');
    }
    await ux.closeModal(page);

    // 2. Opened NOT from More (e.g. #btnShop or CuyHome.openFeature)
    const btnShop = await page.$('#btnShop');
    if (btnShop) {
      await page.click('#btnShop');
      await page.waitForTimeout(200);
      const hasBack = await page.isVisible('.modal-back');
      if (hasBack) {
        throw new Error('Back button is visible when opened from #btnShop');
      }
      await ux.closeModal(page);
      const isClosed = !(await page.isVisible('.modal-backdrop.active'));
      if (!isClosed) throw new Error('Modal did not close normally after #btnShop');
    }

    await page.evaluate(() => window.CuyHome.openFeature('calendar'));
    await page.waitForTimeout(200);
    const hasBackDirect = await page.isVisible('.modal-back');
    if (hasBackDirect) {
      throw new Error('Back button is visible when opened via openFeature directly');
    }
    await ux.closeModal(page);
  });

  // S5: reopen-resets
  await testScenario('reopen-resets', async () => {
    await ux.openMore(page);
    await ux.openFromMore(page, 'Care calendar');
    await page.waitForSelector('.fc-tab[data-tab="weight"]', { timeout: 3000 });
    await page.click('.fc-tab[data-tab="weight"]');
    await page.waitForTimeout(200);

    await page.waitForSelector('.modal-back', { timeout: 3000 });
    await page.click('.modal-back');
    await page.waitForTimeout(200);

    await ux.openFromMore(page, 'Care calendar');
    await page.waitForSelector('.fc-tab', { timeout: 3000 });

    const activeTab = await page.$eval('.fc-tab.active', el => el.dataset.tab);
    if (activeTab !== 'today') {
      throw new Error(`Calendar reopened with active tab "${activeTab}", expected "today"`);
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
