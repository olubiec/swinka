'use strict';
const path = require('path');
const assert = require('assert');

// Ensure module resolution finds node_modules under tools/qa
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

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

  // Ensure edit-panel script and styles are loaded
  await page.waitForFunction(() => window.CuyEdit, { timeout: 2000 }).catch(async () => {
    await page.addStyleTag({ url: 'features/places/edit-panel.css' });
    await page.addScriptTag({ url: 'features/places/edit-panel.js' });
  });

  async function resetMockState(opts = {}) {
    await page.evaluate((options) => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
      st.clovers = typeof options.clovers === 'number' ? options.clovers : 500;

      // Set up places array with levels and costs
      st.places.places = [
        {
          id: 'salon',
          name: 'Living room',
          unlocked: true,
          level: options.salonLevel !== undefined ? options.salonLevel : 1,
          maxLevel: 3,
          nextLevelCost: options.salonNextCost !== undefined ? options.salonNextCost : 150,
          unlockCost: 0
        },
        {
          id: 'garden',
          name: 'Garden',
          unlocked: true,
          level: 1,
          maxLevel: 2,
          nextLevelCost: 470,
          unlockCost: 400
        },
        {
          id: 'park',
          name: 'Park',
          unlocked: options.parkUnlocked !== undefined ? options.parkUnlocked : false,
          level: 0,
          maxLevel: 2,
          nextLevelCost: 1600,
          unlockCost: 1200
        }
      ];

      // Update order list to match unlocked / locked status
      if (Array.isArray(st.places.order)) {
        const parkOrd = st.places.order.find(s => s && s.id === 'park');
        if (parkOrd) {
          parkOrd.locked = !(options.parkUnlocked !== undefined ? options.parkUnlocked : false);
        }
      }

      window.bridge.broadcastState();
      window.CuyPlaces.openPlace(options.place || 'salon');
      if (window.CuyEdit) {
        if (!window.CuyEdit.isOpen()) {
          window.CuyEdit.toggle();
        } else {
          window.CuyEdit.render(st);
        }
      }
    }, opts);
    await page.waitForTimeout(100);
  }

  // U1: row-shows-level-and-cost
  await testScenario('U1 row-shows-level-and-cost', async () => {
    await resetMockState({ place: 'salon', salonLevel: 1, salonNextCost: 150, clovers: 500 });

    const drawer = page.locator('#editDrawer');
    await drawer.waitFor({ state: 'visible', timeout: 3000 });

    // Scene title
    const titleText = await page.locator('#editDrawerTitle').textContent();
    assert(titleText && (titleText.includes('Living room') || titleText.includes('Salon')),
      `Expected scene title in header, got: "${titleText}"`);

    // Level
    const levelText = await page.locator('#editDrawerLevel').textContent();
    assert(levelText && levelText.includes('Level 1'),
      `Expected "Level 1" in header, got: "${levelText}"`);

    // Upgrade button
    const upgradeBtn = page.locator('#editDrawerUpgradeBtn');
    assert(await upgradeBtn.isVisible(), 'Upgrade button should be visible in header');

    const btnText = await upgradeBtn.textContent();
    assert(btnText.includes('Upgrade') && btnText.includes('150'),
      `Expected Upgrade button to show "Upgrade" and cost "150", got: "${btnText}"`);

    // Check for coin/clover icon inside Upgrade button
    const hasCoinIcon = await page.evaluate(() => {
      const btn = document.getElementById('editDrawerUpgradeBtn');
      return !!btn && !!btn.querySelector('.pixel-icon.icon-clover, .pixel-icon.icon-coin');
    });
    assert(hasCoinIcon, 'Upgrade button must contain currency pixel-icon');

    // Button should be enabled since 500 >= 150
    const isDisabled = await upgradeBtn.isDisabled();
    assert(!isDisabled, 'Upgrade button should be enabled when affordable');
  });

  // U2: upgrade-sends
  await testScenario('U2 upgrade-sends', async () => {
    await resetMockState({ place: 'salon', salonLevel: 1, salonNextCost: 150, clovers: 500 });

    const upgradeBtn = page.locator('#editDrawerUpgradeBtn');
    await upgradeBtn.waitFor({ state: 'visible', timeout: 3000 });

    // Attach spy on bridge.send and CuyPlaces.upgrade
    await page.evaluate(() => {
      window.__sentMessages = [];
      const origSend = window.bridge.send;
      window.bridge.send = function (msg) {
        window.__sentMessages.push(msg);
        return origSend.apply(this, arguments);
      };
    });

    await upgradeBtn.click();
    await page.waitForTimeout(100);

    const sent = await page.evaluate(() => window.__sentMessages || []);
    const upgradeMsg = sent.find(m => m && m.type === 'place_upgrade');
    assert(upgradeMsg, 'place_upgrade message must be sent on click');
    assert.strictEqual(upgradeMsg.id, 'salon', 'place_upgrade id must be current scene id ("salon")');
  });

  // U3: disabled-when-poor
  await testScenario('U3 disabled-when-poor', async () => {
    // Only 50 clovers, but cost is 150
    await resetMockState({ place: 'salon', salonLevel: 1, salonNextCost: 150, clovers: 50 });

    const upgradeBtn = page.locator('#editDrawerUpgradeBtn');
    await upgradeBtn.waitFor({ state: 'visible', timeout: 3000 });

    const isDisabled = await upgradeBtn.isDisabled();
    assert(isDisabled, 'Upgrade button must be disabled when player cannot afford cost');

    // Must have a reason in title or aria-label
    const title = await upgradeBtn.getAttribute('title');
    const ariaLabel = await upgradeBtn.getAttribute('aria-label');
    const hasReason = (title && /clover|need|poor|afford/i.test(title)) ||
                      (ariaLabel && /need|more|short/i.test(ariaLabel));
    assert(hasReason, `Disabled button should provide a reason (title="${title}", aria-label="${ariaLabel}")`);
  });

  // U4: max-level-hides-upgrade
  await testScenario('U4 max-level-hides-upgrade', async () => {
    // Salon at max level 3 (nextLevelCost: null)
    await resetMockState({ place: 'salon', salonLevel: 3, salonNextCost: null, clovers: 500 });

    const levelText = await page.locator('#editDrawerLevel').textContent();
    assert(levelText && levelText.includes('Level 3'),
      `Expected "Level 3" in header, got: "${levelText}"`);

    // Upgrade button must be hidden when at max level
    const isHidden = await page.evaluate(() => {
      const btn = document.getElementById('editDrawerUpgradeBtn');
      if (!btn) return true;
      if (btn.hidden) return true;
      const style = window.getComputedStyle(btn);
      return style.display === 'none' || style.visibility === 'hidden';
    });
    assert(isHidden, 'Upgrade button must be hidden when max level reached');
  });

  // U5: locked-scene-shows-unlock-and-sends
  await testScenario('U5 locked-scene-shows-unlock-and-sends', async () => {
    // Park is locked with cost 1200, clovers 2000
    await resetMockState({ place: 'park', parkUnlocked: false, clovers: 2000 });

    const drawer = page.locator('#editDrawer');
    await drawer.waitFor({ state: 'visible', timeout: 3000 });

    const titleText = await page.locator('#editDrawerTitle').textContent();
    assert(titleText && titleText.includes('Park'),
      `Expected scene title "Park" in header, got: "${titleText}"`);

    // Upgrade button should be hidden on locked scene
    const isUpgradeHidden = await page.evaluate(() => {
      const btn = document.getElementById('editDrawerUpgradeBtn');
      if (!btn) return true;
      if (btn.hidden) return true;
      const style = window.getComputedStyle(btn);
      return style.display === 'none' || style.visibility === 'hidden';
    });
    assert(isUpgradeHidden, 'Upgrade button should be hidden for locked scene');

    // Unlock button should be visible
    const unlockBtn = page.locator('#editDrawerUnlockBtn');
    assert(await unlockBtn.isVisible(), 'Unlock button must be visible for locked scene');

    const unlockText = await unlockBtn.textContent();
    assert(unlockText.includes('Unlock') && unlockText.includes('1200'),
      `Expected Unlock button to show "Unlock" and "1200", got: "${unlockText}"`);

    const hasCoinIcon = await page.evaluate(() => {
      const btn = document.getElementById('editDrawerUnlockBtn');
      return !!btn && !!btn.querySelector('.pixel-icon.icon-clover, .pixel-icon.icon-coin');
    });
    assert(hasCoinIcon, 'Unlock button must contain currency pixel-icon');

    // Unlock button should be enabled since 2000 >= 1200
    assert(!(await unlockBtn.isDisabled()), 'Unlock button should be enabled when affordable');

    // Spy on bridge.send
    await page.evaluate(() => {
      window.__sentMessages = [];
      const origSend = window.bridge.send;
      window.bridge.send = function (msg) {
        window.__sentMessages.push(msg);
        return origSend.apply(this, arguments);
      };
    });

    await unlockBtn.click();
    await page.waitForTimeout(100);

    const sent = await page.evaluate(() => window.__sentMessages || []);
    const unlockMsg = sent.find(m => m && m.type === 'place_unlock');
    assert(unlockMsg, 'place_unlock message must be sent on click');
    assert.strictEqual(unlockMsg.id, 'park', 'place_unlock id must be "park"');
  });

  await browser.close();
  if (server && typeof server.kill === 'function') {
    server.kill();
  } else if (server && typeof server.close === 'function') {
    server.close();
  }

  if (hasFailures) {
    process.exit(1);
  } else {
    console.log('ALL UX-P40-EDIT-UPGRADE TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error in ux-p40-edit-upgrade:', err);
  process.exit(1);
});
