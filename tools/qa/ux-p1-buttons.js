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

  // Helper to open a feature by data-open-feature attribute or title
  async function openFeature(id, title) {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 5000 });
    const btn = page.locator(`#modalBody button[data-open-feature="${id}"]`);
    if (await btn.count() > 0) {
      await btn.click();
    } else {
      await ux.openFromMore(page, title);
    }
    await page.waitForTimeout(200);
  }

  // C1: coloring-play-first-click
  await testScenario('coloring-play-first-click', async () => {
    // First visit
    await openFeature('coloring', 'Colouring');
    await page.waitForSelector('.play-level', { timeout: 3000 });
    await page.click('.play-level');
    await page.waitForSelector('.coloring-editor', { timeout: 1500 });

    // Close and repeat
    await ux.closeModal(page);
    await ux.pushState(page);

    // Second visit
    await openFeature('coloring', 'Colouring');
    await page.waitForSelector('.play-level', { timeout: 3000 });
    await page.click('.play-level');
    await page.waitForSelector('.coloring-editor', { timeout: 1500 });

    await ux.closeModal(page);
  });

  // C2: coloring-play-each-level
  await testScenario('coloring-play-each-level', async () => {
    // Set mock completed state with 1 finished picture
    await page.evaluate(() => {
      const state = { progress: {}, completed: ['gp_001'], unlockedPacks: ['guinea_pigs', 'food_and_toys'] };
      localStorage.setItem('cuy_coloring_v1', JSON.stringify(state));
    });

    await openFeature('coloring', 'Colouring');
    await page.waitForSelector('.play-level', { timeout: 3000 });
    const btnText = (await page.$eval('.play-level', el => el.textContent)).trim();
    if (!btnText.includes('Play level 2')) {
      throw new Error(`Expected button text to include "Play level 2", got "${btnText}"`);
    }

    await page.click('.play-level');
    await page.waitForSelector('.coloring-editor', { timeout: 1500 });
    const editorTitle = (await page.$eval('.editor-title', el => el.textContent)).trim();
    if (!editorTitle.includes('Level 2') && !editorTitle.includes('gp_002')) {
      throw new Error(`Expected editor for level 2, got title "${editorTitle}"`);
    }

    await ux.closeModal(page);
  });

  // V1: vet-checkup-feedback
  await testScenario('vet-checkup-feedback', async () => {
    // Part 1: Healthy pig check-up
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.clovers = 100;
      st.vet = {
        isSick: false,
        checkupPrice: 30,
        lastCheckup: null,
        conditions: [],
        history: [],
        symptoms: []
      };
      window.bridge.saveMockState();
      window.bridge.broadcastState();
    });

    await openFeature('vet', 'Vet clinic');
    await page.waitForSelector('#btn-vet-checkup', { timeout: 3000 });
    const cloversBeforeHealthy = await page.$eval('#cloverCount', el => parseInt(el.textContent, 10));

    await page.click('#btn-vet-checkup');
    await page.waitForSelector('.vet-checkup-result', { timeout: 1500 });
    const resultHealthyText = (await page.$eval('.vet-checkup-result', el => el.textContent)).trim();
    if (!resultHealthyText.includes('No problems found.')) {
      throw new Error(`Expected "No problems found.", got "${resultHealthyText}"`);
    }

    const cloversAfterHealthy = await page.$eval('#cloverCount', el => parseInt(el.textContent, 10));
    if (cloversAfterHealthy !== cloversBeforeHealthy - 30) {
      throw new Error(`Expected clovers to drop by 30 (from ${cloversBeforeHealthy} to ${cloversBeforeHealthy - 30}), got ${cloversAfterHealthy}`);
    }

    await ux.closeModal(page);

    // Part 2: Pig with conditions check-up
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.clovers = 100;
      st.vet = {
        isSick: true,
        checkupPrice: 30,
        lastCheckup: null,
        conditions: [
          { id: 'scurvy', name: 'Scurvy (vitamin C deficiency)', known: true, severity: 0.5, treated: false, price: 50 },
          { id: 'dental', name: 'Something is wrong', known: false, severity: 0.4, treated: false, price: 40 }
        ],
        history: [],
        symptoms: ['Tired']
      };
      window.bridge.saveMockState();
      window.bridge.broadcastState();
    });

    await openFeature('vet', 'Vet clinic');
    await page.waitForSelector('#btn-vet-checkup', { timeout: 3000 });
    const cloversBeforeSick = await page.$eval('#cloverCount', el => parseInt(el.textContent, 10));

    await page.click('#btn-vet-checkup');
    await page.waitForSelector('.vet-checkup-result', { timeout: 1500 });
    const resultSickText = (await page.$eval('.vet-checkup-result', el => el.textContent)).trim();
    if (!resultSickText.includes('Found 2 problem(s)')) {
      throw new Error(`Expected "Found 2 problem(s)", got "${resultSickText}"`);
    }

    const cloversAfterSick = await page.$eval('#cloverCount', el => parseInt(el.textContent, 10));
    if (cloversAfterSick !== cloversBeforeSick - 30) {
      throw new Error(`Expected clovers to drop by 30 (from ${cloversBeforeSick} to ${cloversBeforeSick - 30}), got ${cloversAfterSick}`);
    }

    // Check all conditions are listed as known (no unknown class/card)
    const unknownCardsCount = await page.$$eval('.feature-vet-unknown', els => els.length);
    if (unknownCardsCount !== 0) {
      throw new Error(`Expected 0 unknown condition cards after checkup, found ${unknownCardsCount}`);
    }

    await ux.closeModal(page);

    // Part 3: Not enough clovers
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.clovers = 10;
      st.vet = {
        isSick: false,
        checkupPrice: 30,
        lastCheckup: null,
        conditions: [],
        history: [],
        symptoms: []
      };
      window.bridge.saveMockState();
      window.bridge.broadcastState();
    });

    await openFeature('vet', 'Vet clinic');
    await page.waitForSelector('#btn-vet-checkup', { timeout: 3000 });
    const isDisabled = await page.$eval('#btn-vet-checkup', el => el.hasAttribute('disabled') || el.disabled);
    if (!isDisabled) {
      throw new Error('Checkup button should be disabled when not enough clovers');
    }

    // Forced-enabled click
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-vet-checkup');
      btn.removeAttribute('disabled');
      btn.disabled = false;
      btn.click();
    });

    // Check toast
    await page.waitForFunction(() => {
      const globalT = document.getElementById('globalToast');
      const vetT = document.querySelector('.feature-vet-toast');
      const text = (globalT && globalT.textContent) || (vetT && vetT.textContent) || '';
      return text.includes('Not enough clovers');
    }, { timeout: 2000 });

    await ux.closeModal(page);
  });

  // V2: vet-checkup-twice
  await testScenario('vet-checkup-twice', async () => {
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.clovers = 100;
      st.vet = {
        isSick: false,
        checkupPrice: 30,
        lastCheckup: null,
        conditions: [],
        history: [],
        symptoms: []
      };
      window.bridge.saveMockState();
      window.bridge.broadcastState();
    });

    await openFeature('vet', 'Vet clinic');
    await page.waitForSelector('#btn-vet-checkup', { timeout: 3000 });

    // First click
    await page.click('#btn-vet-checkup');
    await page.waitForSelector('.vet-checkup-result', { timeout: 1500 });
    const firstClovers = await page.$eval('#cloverCount', el => parseInt(el.textContent, 10));
    if (firstClovers !== 70) {
      throw new Error(`Expected 70 clovers after first checkup, got ${firstClovers}`);
    }

    // Second click while result is shown
    await page.click('#btn-vet-checkup');
    await page.waitForTimeout(300);
    await page.waitForSelector('.vet-checkup-result', { timeout: 1500 });
    const secondClovers = await page.$eval('#cloverCount', el => parseInt(el.textContent, 10));
    if (secondClovers !== 40) {
      throw new Error(`Expected 40 clovers after second checkup, got ${secondClovers}`);
    }

    const secondResultText = (await page.$eval('.vet-checkup-result', el => el.textContent)).trim();
    if (!secondResultText.includes('No problems found.')) {
      throw new Error(`Expected "No problems found." after second checkup, got "${secondResultText}"`);
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
