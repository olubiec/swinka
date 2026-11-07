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

  async function openColoring() {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 5000 });
    const btn = page.locator('#modalBody button[data-open-feature="coloring"]');
    if (await btn.count() > 0) {
      await btn.click();
    } else {
      await ux.openFromMore(page, 'Colouring');
    }
    await page.waitForSelector('.feature-coloring .coloring-home', { timeout: 5000 });
  }

  async function openFirstPicture() {
    await page.waitForSelector('.feature-coloring .play-level', { timeout: 5000 });
    await page.click('.feature-coloring .play-level');
    await page.waitForSelector('.feature-coloring .coloring-editor #editorCanvas', { timeout: 5000 });
  }

  async function getVisibleBackElements() {
    return await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll(
        '.modal-back, .ui-back, .back-btn, .back-gallery, [aria-label*="Back" i], button'
      ));
      const seen = new Set();
      const result = [];
      for (const el of candidates) {
        if (seen.has(el)) continue;
        seen.add(el);
        const isBackClass = el.classList.contains('modal-back') ||
                            el.classList.contains('ui-back') ||
                            el.classList.contains('back-btn') ||
                            el.classList.contains('back-gallery');
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const text = (el.textContent || '').trim();
        const isBackAttr = aria.includes('back');
        const isBackText = text.includes('⬅') || text.includes('←') || /^(back|wstecz)$/i.test(text);

        if (isBackClass || isBackAttr || isBackText) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 0 && rect.height > 0) {
            result.push({
              tag: el.tagName,
              className: el.className,
              ariaLabel: el.getAttribute('aria-label'),
              text: el.textContent.trim(),
              isModalBack: el.classList.contains('modal-back')
            });
          }
        }
      }
      return result;
    });
  }

  function endsWithAsset(bg, assetName) {
    if (!bg || bg === 'none') return false;
    const re = new RegExp(assetName.replace('.', '\\.') + '["\')]*$');
    return re.test(bg);
  }

  // C1 list-one-back (coloring list: exactly 1 visible back element)
  await testScenario('C1 list-one-back', async () => {
    await openColoring();
    const backEls = await getVisibleBackElements();
    if (backEls.length !== 1) {
      throw new Error(`Expected exactly 1 visible back element on coloring list, found ${backEls.length}: ${JSON.stringify(backEls)}`);
    }
    if (!backEls[0].isModalBack) {
      throw new Error(`Expected the visible back element to be .modal-back, got: ${JSON.stringify(backEls[0])}`);
    }
  });

  // C2 picture-one-back (inside a picture: exactly 1)
  await testScenario('C2 picture-one-back', async () => {
    await openColoring();
    await openFirstPicture();
    const backEls = await getVisibleBackElements();
    if (backEls.length !== 1) {
      throw new Error(`Expected exactly 1 visible back element inside picture, found ${backEls.length}: ${JSON.stringify(backEls)}`);
    }
    if (!backEls[0].isModalBack) {
      throw new Error(`Expected the visible back element inside picture to be .modal-back, got: ${JSON.stringify(backEls[0])}`);
    }
  });

  // C3 back-chain (picture -> Back -> list -> Back -> More grid, one level each)
  await testScenario('C3 back-chain', async () => {
    await openColoring();
    await openFirstPicture();

    // Level 1 click: from picture -> list
    await page.click('.modal-back');
    await page.waitForSelector('.feature-coloring .coloring-home', { timeout: 5000 });
    const isEditorGone = !(await page.isVisible('.feature-coloring .coloring-editor'));
    if (!isEditorGone) {
      throw new Error('Coloring editor is still visible after clicking Back from picture');
    }
    const titleAtList = await page.$eval('#modalTitle', el => el.textContent.trim());
    if (titleAtList !== 'Colouring') {
      throw new Error(`Title after first Back should be "Colouring", got "${titleAtList}"`);
    }

    // Level 2 click: from list -> More grid
    await page.click('.modal-back');
    await page.waitForSelector('.album-grid', { timeout: 5000 });
    const titleAtMore = await page.$eval('#modalTitle', el => el.textContent.trim());
    if (titleAtMore !== 'More') {
      throw new Error(`Title after second Back should be "More", got "${titleAtMore}"`);
    }
  });

  // C4 x-closes-all (X closes the whole window from the picture)
  await testScenario('C4 x-closes-all', async () => {
    await openColoring();
    await openFirstPicture();

    await page.click('#modalCloseBtn');
    await page.waitForTimeout(300);

    const isModalActive = await page.isVisible('#modalBackdrop.active');
    if (isModalActive) {
      throw new Error('Modal backdrop is still active after clicking close button (X)');
    }
  });

  // C5 same-asset (back element uses back_btn.png)
  await testScenario('C5 same-asset', async () => {
    await openColoring();
    await openFirstPicture();

    await page.waitForSelector('.modal-back', { timeout: 3000 });
    const backBg = await page.$eval('.modal-back', el => getComputedStyle(el).backgroundImage);
    if (!endsWithAsset(backBg, 'back_btn.png')) {
      throw new Error(`Back element does not use back_btn.png, got: ${backBg}`);
    }
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
