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
  page.setDefaultTimeout(7000);

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

  async function openCalendar() {
    await page.evaluate(() => {
      if (window.CuyHome) window.CuyHome.openFeature('calendar');
    });
    await page.waitForSelector('.feature-calendar .fc-tabs', { timeout: 5000 });
  }

  async function switchTab(tabId) {
    await page.click(`.fc-tab[data-tab="${tabId}"]`);
    await page.waitForTimeout(150);
  }

  // T1: Tabs have game style class and styling, do not look like unstyled browser buttons
  await testScenario('T1 game-style tabs', async () => {
    await openCalendar();
    const tabs = page.locator('.fc-tab');
    const count = await tabs.count();
    assert.strictEqual(count, 4, 'Expected 4 tabs');

    const styles = await page.evaluate(() => {
      const activeTab = document.querySelector('.fc-tab.active');
      const inactiveTab = document.querySelector('.fc-tab:not(.active)');
      const getStyles = el => {
        const cs = window.getComputedStyle(el);
        return {
          borderRadius: cs.borderRadius,
          borderStyle: cs.borderStyle,
          borderColor: cs.borderColor,
          backgroundColor: cs.backgroundColor,
          color: cs.color
        };
      };
      return {
        active: activeTab ? getStyles(activeTab) : null,
        inactive: inactiveTab ? getStyles(inactiveTab) : null
      };
    });

    assert.ok(styles.active, 'Active tab must exist');
    assert.ok(styles.inactive, 'Inactive tab must exist');
    assert.strictEqual(styles.active.borderRadius, '0px', 'Active tab should have hard corners (0px radius)');
    assert.strictEqual(styles.inactive.borderRadius, '0px', 'Inactive tab should have hard corners (0px radius)');
    assert.notStrictEqual(styles.active.backgroundColor, 'rgba(0, 0, 0, 0)', 'Active tab should have background color from palette');
    assert.notStrictEqual(styles.inactive.backgroundColor, 'rgba(0, 0, 0, 0)', 'Inactive tab should have background color from palette');
    assert.notStrictEqual(styles.active.backgroundColor, styles.inactive.backgroundColor, 'Active and inactive tabs should have distinct backgrounds');
  });

  // T2: Settings in manualOptIn mode shows all reminders disabled
  await testScenario('T2 Settings manualOptIn all disabled', async () => {
    await page.evaluate(() => {
      const s = window.bridge.currentState;
      if (!s.calendar) s.calendar = {};
      s.calendar.manualOptIn = true;
      if (s.calendar.tasks) {
        s.calendar.tasks.forEach(t => {
          t.enabled = false;
          t.optedIn = false;
        });
      }
      window.bridge.broadcastState();
    });

    await openCalendar();
    await switchTab('settings');
    await page.waitForSelector('.fc-setting-row', { timeout: 3000 });

    const checkedCount = await page.$$eval('.fc-task-enabled', inputs => inputs.filter(i => i.checked).length);
    assert.strictEqual(checkedCount, 0, 'In manualOptIn mode, all reminders should be unchecked by default');
  });

  // T3: Enabling a reminder sends calendar_settings with the correct task id
  await testScenario('T3 enable reminder sends calendar_settings', async () => {
    await page.evaluate(() => {
      window.__lastActions = [];
      window.bridge.onAction(a => window.__lastActions.push(a));
    });

    await openCalendar();
    await switchTab('settings');
    await page.waitForSelector('.fc-setting-row[data-id="veggies"]', { timeout: 3000 });

    await page.click('.fc-setting-row[data-id="veggies"] .fc-task-enabled');
    await page.waitForTimeout(200);

    const actions = await page.evaluate(() => window.__lastActions);
    const settingsAction = actions.find(a => a.type === 'calendar_settings');
    assert.ok(settingsAction, 'Expected calendar_settings action to be sent');
    assert.ok(Array.isArray(settingsAction.tasks), 'Expected tasks array in calendar_settings');
    const veggiesTask = settingsAction.tasks.find(t => t.id === 'veggies');
    assert.ok(veggiesTask, 'Expected veggies task in calendar_settings tasks');
    assert.strictEqual(veggiesTask.enabled, true, 'Expected veggies task to have enabled: true');
  });

  // T4: Saving pig data sends calendar_profile with valid fields
  await testScenario('T4 save pig data sends calendar_profile', async () => {
    await page.evaluate(() => {
      window.__lastActions = [];
    });

    await openCalendar();
    await switchTab('settings');
    await page.waitForSelector('.fc-profile-card[data-pig="Pumpkin"]', { timeout: 3000 });

    await page.fill('.fc-profile-card[data-pig="Pumpkin"] .fc-pig-birth', '2025-03-15');
    await page.fill('.fc-profile-card[data-pig="Pumpkin"] .fc-pig-adopted', '2025-04-01');
    await page.fill('.fc-profile-card[data-pig="Pumpkin"] .fc-pig-baseline', '980');

    await page.click('.fc-profile-card[data-pig="Pumpkin"] .fc-btn-save-profile');
    await page.waitForTimeout(200);

    const actions = await page.evaluate(() => window.__lastActions);
    const profileAction = actions.find(a => a.type === 'calendar_profile' && a.pig === 'Pumpkin');
    assert.ok(profileAction, 'Expected calendar_profile action for Pumpkin');
    assert.strictEqual(profileAction.birthDate, '2025-03-15', 'Birth date mismatch');
    assert.strictEqual(profileAction.adoptedDate, '2025-04-01', 'Adopted date mismatch');
    assert.strictEqual(profileAction.baselineGrams, 980, 'Baseline grams mismatch');
  });

  // T5: Entering weight adds a row to the table and sends calendar_weight
  await testScenario('T5 weight entry adds row and sends calendar_weight', async () => {
    await page.evaluate(() => {
      window.__lastActions = [];
    });

    await openCalendar();
    await switchTab('weight');
    await page.waitForSelector('.fc-weight-pig-section[data-pig="Pumpkin"]', { timeout: 3000 });

    const initialRows = await page.$$eval(
      '.fc-weight-pig-section[data-pig="Pumpkin"] .fc-weight-table tbody tr.fc-weight-row',
      rows => rows.length
    );

    await page.fill('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-input-weight-grams', '1060');
    await page.fill('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-input-weight-date', '2026-11-12');
    await page.click('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-btn-save-weight');
    await page.waitForTimeout(200);

    const actions = await page.evaluate(() => window.__lastActions);
    const weightAction = actions.find(a => a.type === 'calendar_weight' && a.pig === 'Pumpkin');
    assert.ok(weightAction, 'Expected calendar_weight action for Pumpkin');
    assert.strictEqual(weightAction.grams, 1060, 'Grams mismatch in action');
    assert.strictEqual(weightAction.date, '2026-11-12', 'Date mismatch in action');

    const newRows = await page.$$eval(
      '.fc-weight-pig-section[data-pig="Pumpkin"] .fc-weight-table tbody tr.fc-weight-row',
      rows => rows.length
    );
    assert.ok(newRows >= initialRows, 'Table should have at least the initial number of rows or updated');

    const topRowText = await page.$eval(
      '.fc-weight-pig-section[data-pig="Pumpkin"] .fc-weight-table tbody tr.fc-weight-row',
      tr => tr.textContent
    );
    assert.ok(topRowText.includes('1060 g'), 'Top row should display newly entered weight 1060 g');
    assert.ok(topRowText.includes('2026-11-12'), 'Top row should display date 2026-11-12');
  });

  // T6: After weight entry, weigh task disappears from Today tab
  await testScenario('T6 weigh task disappears from Today after logging weight', async () => {
    await page.evaluate(() => {
      window.__lastActions = [];
      const s = window.bridge.currentState;
      if (!s.calendar) s.calendar = {};
      if (!s.calendar.tasks) s.calendar.tasks = [];
      let weighTask = s.calendar.tasks.find(t => t.id === 'weigh');
      if (!weighTask) {
        weighTask = { id: 'weigh', title: 'Weekly weigh-in', enabled: true, due: true, weightLog: true };
        s.calendar.tasks.push(weighTask);
      } else {
        weighTask.enabled = true;
        weighTask.due = true;
      }
      window.bridge.broadcastState();
    });

    await openCalendar();
    await switchTab('today');
    await page.waitForSelector('#fcContent', { timeout: 3000 });

    const weighCountBefore = await page.locator('.fc-task[data-id="weigh"]').count();
    assert.strictEqual(weighCountBefore, 1, 'Weigh task should be visible on Today tab when due');

    // Go to weight tab and log weight
    await switchTab('weight');
    await page.waitForSelector('.fc-weight-pig-section[data-pig="Pumpkin"]', { timeout: 3000 });
    await page.fill('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-input-weight-grams', '1070');
    await page.fill('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-input-weight-date', '2026-11-12');
    await page.click('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-btn-save-weight');
    await page.waitForTimeout(200);

    // Switch back to Today tab
    await switchTab('today');
    await page.waitForTimeout(200);

    const weighCountAfter = await page.locator('.fc-task[data-id="weigh"]').count();
    assert.strictEqual(weighCountAfter, 0, 'Weigh task must disappear from Today tab after weight entry');
  });

  // T7: Invalid weight (0 or text) does not send message
  await testScenario('T7 invalid weight 0 or text does not send message', async () => {
    await openCalendar();
    await switchTab('weight');
    await page.waitForSelector('.fc-weight-pig-section[data-pig="Pumpkin"]', { timeout: 3000 });

    // Test 0
    await page.evaluate(() => { window.__lastActions = []; });
    await page.fill('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-input-weight-grams', '0');
    await page.click('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-btn-save-weight');
    await page.waitForTimeout(100);

    let actions = await page.evaluate(() => window.__lastActions);
    let weightSent = actions.some(a => a.type === 'calendar_weight');
    assert.strictEqual(weightSent, false, 'Entering weight 0 must not send calendar_weight');

    // Test text / invalid
    await page.evaluate(() => {
      window.__lastActions = [];
      const el = document.querySelector('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-input-weight-grams');
      if (el) el.value = 'abc';
    });
    await page.click('.fc-weight-pig-section[data-pig="Pumpkin"] .fc-btn-save-weight');
    await page.waitForTimeout(100);

    actions = await page.evaluate(() => window.__lastActions);
    weightSent = actions.some(a => a.type === 'calendar_weight');
    assert.strictEqual(weightSent, false, 'Entering text for weight must not send calendar_weight');
  });

  // T8: No console errors
  await testScenario('T8 no console errors', async () => {
    assert.strictEqual(page.__errors.length, 0, 'Expected no console or page errors: ' + page.__errors.join('; '));
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
