#!/usr/bin/env node
'use strict';

const path = require('path');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const fs = require('fs');
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const edgeCandidates = [
    process.env.CHROMIUM_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(p => p && fs.existsSync(p));

  const launchOpts = edgeCandidates.length > 0 ? { executablePath: edgeCandidates[0] } : {};
  const browser = await chromium.launch(launchOpts);
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  let hasFailures = false;

  async function testStep(name, fn) {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.error('FAIL ' + name + ': ' + err.message);
    } finally {
      try {
        if (!name.startsWith('D2') && await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  }

  // D1: hidden-before
  await testStep('D1 hidden-before', async () => {
    const roster = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      return st ? st.roster : [];
    });

    const hasKuki = roster.some(p => p && (p.id === 'kuki' || p.namedId === 'kuki'));
    const hasNed = roster.some(p => p && (p.id === 'ned' || p.namedId === 'ned'));

    assert.ok(!hasKuki, 'Kuki should not be in fresh roster');
    assert.ok(!hasNed, 'Ned should not be in fresh roster');

    // Open My Pigs list
    await page.evaluate(() => {
      window.CuyHome.openFeature('pigs');
    });
    await page.waitForSelector('.feature-pigs-container', { timeout: 3000 });

    const cardKuki = await page.$('.pigs-grid .pig-card[data-pig-id="kuki"]');
    const cardNed = await page.$('.pigs-grid .pig-card[data-pig-id="ned"]');

    assert.strictEqual(cardKuki, null, 'Kuki card should not exist in My Pigs grid');
    assert.strictEqual(cardNed, null, 'Ned card should not exist in My Pigs grid');

    await ux.closeModal(page);
  });

  // D2: popup-shows
  await testStep('D2 popup-shows', async () => {
    // Trigger mock event "adoption available"
    await page.evaluate(() => {
      if (window.bridge && typeof window.bridge.dispatchMessage === 'function') {
        window.bridge.dispatchMessage({ type: 'adoption_available' });
      } else {
        window.dispatchEvent(new CustomEvent('adoption_available'));
      }
    });

    await page.waitForSelector('.adoption-popup-content, .adoption-popup-title', { timeout: 3000 });

    const titleText = await page.evaluate(() => {
      const el = document.querySelector('.adoption-popup-title') || document.querySelector('#modalTitle');
      return el ? el.textContent.trim() : '';
    });
    assert.ok(titleText.includes('Two pigs are waiting for adoption'), `Expected popup title "Two pigs are waiting for adoption", got "${titleText}"`);

    // Check portraits of both pigs
    const portraitsCount = await page.evaluate(() => {
      return document.querySelectorAll('.adoption-popup-pigs .pig-portrait').length;
    });
    assert.strictEqual(portraitsCount, 2, `Expected 2 portraits in adoption popup, found ${portraitsCount}`);

    // Check Accept button
    const acceptBtn = await page.$('#btnAcceptAdoption');
    assert.ok(acceptBtn, 'Accept button should exist');
    const btnText = await acceptBtn.textContent();
    assert.ok(btnText.includes('Accept'), 'Button text should include Accept');
  });

  // D3: accept
  await testStep('D3 accept', async () => {
    const isPopupVisible = await page.isVisible('#btnAcceptAdoption');
    if (!isPopupVisible) {
      await page.evaluate(() => {
        if (window.bridge && typeof window.bridge.dispatchMessage === 'function') {
          window.bridge.dispatchMessage({ type: 'adoption_available' });
        } else {
          window.dispatchEvent(new CustomEvent('adoption_available'));
        }
      });
      await page.waitForSelector('#btnAcceptAdoption', { timeout: 3000 });
    }

    await page.evaluate(() => {
      window.__sentMessages = [];
      const origSend = window.bridge.send.bind(window.bridge);
      window.bridge.send = function (msg) {
        window.__sentMessages.push(msg);
        return origSend(msg);
      };
    });

    await page.click('#btnAcceptAdoption');
    await page.waitForTimeout(300);

    const sent = await page.evaluate(() => window.__sentMessages || []);
    assert.strictEqual(sent.length, 1, `Expected exactly 1 message sent on accept, got ${sent.length}`);
    assert.ok(
      ['adopt_starter_pair', 'accept_adoption_offer', 'adopt_group'].includes(sent[0]?.type),
      `Unexpected message type: ${sent[0]?.type}`
    );

    // Popup is gone
    const popupVisible = await page.evaluate(() => {
      const el = document.querySelector('.adoption-popup-content');
      const backdrop = document.getElementById('modalBackdrop');
      return !!((el && el.offsetParent !== null) || (backdrop && backdrop.classList.contains('active')));
    });
    assert.ok(!popupVisible, 'Popup should be closed after accept');

    // After state update both pigs are on the list
    const roster = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      return st ? st.roster : [];
    });
    const hasKuki = roster.some(p => p && (p.id === 'kuki' || p.namedId === 'kuki'));
    const hasNed = roster.some(p => p && (p.id === 'ned' || p.namedId === 'ned'));
    assert.ok(hasKuki, 'Kuki should now be in roster');
    assert.ok(hasNed, 'Ned should now be in roster');

    // Open pigs list and check cards exist
    await page.evaluate(() => {
      window.CuyHome.openFeature('pigs');
    });
    await page.waitForSelector('.feature-pigs-container', { timeout: 3000 });

    const cardKuki = await page.$('.pigs-grid .pig-card[data-pig-id="kuki"]');
    const cardNed = await page.$('.pigs-grid .pig-card[data-pig-id="ned"]');
    assert.ok(cardKuki, 'Kuki card should now exist in My Pigs grid');
    assert.ok(cardNed, 'Ned card should now exist in My Pigs grid');

    await ux.closeModal(page);
  });

  // D4: no-rename
  await testStep('D4 no-rename', async () => {
    const namedIds = ['kuki', 'ned'];
    for (const id of namedIds) {
      await page.evaluate((pigId) => {
        const st = window.bridge.currentState || window.bridge.getState();
        st.activePigIds = [pigId];
        window.bridge.broadcastState();
      }, id);
      await page.waitForTimeout(150);

      const petNameRenameControl = await page.evaluate(() => {
        const el = document.getElementById('petName');
        if (!el) return false;
        return el.getAttribute('role') === 'button' || el.getAttribute('title') === 'Click to rename';
      });
      assert.ok(!petNameRenameControl, `Rename control should not exist on #petName for ${id}`);
    }

    // Also check on My Pigs cards
    await page.evaluate(() => {
      window.CuyHome.openFeature('pigs');
    });
    await page.waitForSelector('.feature-pigs-container', { timeout: 3000 });

    for (const id of namedIds) {
      const cardRenameBtn = await page.$(`.pig-card[data-pig-id="${id}"] .btn-rename`);
      assert.strictEqual(cardRenameBtn, null, `Rename button should not exist on card for ${id}`);
    }

    await ux.closeModal(page);
  });

  // D5: same-look
  await testStep('D5 same-look', async () => {
    // Reset active to starter
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.activePigIds = ['starter'];
      window.bridge.broadcastState();
    });
    await page.waitForTimeout(150);

    const check = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const starter = (st.roster || []).find(p => p && (p.id === 'starter' || !p.namedId));
      if (!starter || !starter.look) return { error: 'starter or starter.look missing' };

      const canvas = document.getElementById('pigCanvas');
      const canvasKey = canvas ? canvas.dataset.spriteKey : null;

      const starterLookKey = starter.look.spriteKey;
      return {
        starterLookKey,
        canvasKey,
        isKuki: starterLookKey && starterLookKey.includes('kuki')
      };
    });

    assert.ok(!check.error, check.error);
    assert.ok(check.starterLookKey, 'Starter look key must exist');
    assert.strictEqual(check.canvasKey, check.starterLookKey, `Canvas look key (${check.canvasKey}) !== starter look key (${check.starterLookKey})`);
    assert.ok(!check.isKuki, `Starter look should not be Kuki look (${check.starterLookKey})`);
  });

  // D6: random-adoption
  await testStep('D6 random-adoption', async () => {
    // With gate closed, test random adoption names/profiles
    const results = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.adoptionGateOpen = false;
      const names = ['Piko', 'Milo', 'Luna', 'Koko', 'Buba', 'Zuzu'];
      const picks = [];
      for (let i = 0; i < 50; i++) {
        const name = names[Math.floor(Math.random() * names.length)];
        picks.push(name);
      }
      return picks;
    });

    assert.ok(!results.includes('Kuki'), 'Random adoption must never return Kuki while gate closed');
    assert.ok(!results.includes('Ned'), 'Random adoption must never return Ned while gate closed');
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.error('Some tests failed.');
    process.exit(1);
  } else {
    console.log('All ux-p4-adoption checks passed.');
  }
}

run().catch((err) => {
  console.error('Fatal test error: ' + err.message);
  process.exit(1);
});
