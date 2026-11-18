'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_PATH = path.join(ROOT, 'web', 'home', 'features', 'places', 'edit-filters.js');
const WORLD_ITEMS_PATH = path.join(ROOT, 'assets', 'data', 'world_items.json');
const LIGHTS_PATH = path.join(ROOT, 'assets', 'data', 'lights.json');

async function launchBrowser() {
  if (process.env.CHROMIUM_PATH) {
    return await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (_) {
    return await chromium.launch({ channel: 'msedge', headless: true });
  }
}

function loadWorldItemsMap() {
  const data = JSON.parse(fs.readFileSync(WORLD_ITEMS_PATH, 'utf8'));
  const map = new Map();
  for (const item of data.items) {
    map.set(item.id, item);
  }
  return map;
}

function runNodeTests() {
  const EditFilters = require(MODULE_PATH);
  const itemsById = loadWorldItemsMap();
  const lightsData = JSON.parse(fs.readFileSync(LIGHTS_PATH, 'utf8'));
  const lightIds = Array.from(new Set([
    ...Object.keys(lightsData.sources || {}),
    ...EditFilters.DEFAULT_LIGHT_IDS
  ]));

  // F1: categorize-known-ids (20 ids from world_items.json)
  const expectedTable = [
    // Lights (5)
    ['lamp_floor', 'Lights'],
    ['lamp_mushroom', 'Lights'],
    ['lamp_arc', 'Lights'],
    ['fairy_lights', 'Lights'],
    ['lantern_garden', 'Lights'],
    // Plants (5)
    ['plant_pot', 'Plants'],
    ['flowerbed_tulip', 'Plants'],
    ['bush_berry', 'Plants'],
    ['tree_small', 'Plants'],
    ['hanging_planter', 'Plants'],
    // Furniture (5)
    ['sofa_cosy', 'Furniture'],
    ['armchair', 'Furniture'],
    ['bookshelf', 'Furniture'],
    ['bench_wood', 'Furniture'],
    ['gazebo', 'Furniture'],
    // Decor (5)
    ['window_sun', 'Decor'],
    ['wall_clock', 'Decor'],
    ['rug_fringed', 'Decor'],
    ['fountain', 'Decor'],
    ['sig_glen_knit_bed', 'Decor']
  ];
  assert.strictEqual(expectedTable.length, 20, 'F1 table must have 20 items');

  const sampleItems = expectedTable.map(([id]) => {
    const item = itemsById.get(id);
    assert(item, `F1 missing item in world_items.json: ${id}`);
    return item;
  });

  for (const [id, expectedCategory] of expectedTable) {
    const item = itemsById.get(id);
    const actual = EditFilters.categorize(item, lightIds);
    assert.strictEqual(actual, expectedCategory, `F1 ${id}: expected ${expectedCategory}, got ${actual}`);
  }
  // Also check explicit item.category override
  assert.strictEqual(EditFilters.categorize({ id: 'custom_x', category: 'Plants', layer: 'floor' }), 'Plants', 'F1 explicit category');
  console.log('F1 OK');

  // F2: tabs-counts
  const tabList = EditFilters.tabs(sampleItems, lightIds);
  assert.deepStrictEqual(
    tabList.map(t => t.id),
    ['All', 'Furniture', 'Lights', 'Plants', 'Decor'],
    'F2 tab ids'
  );
  const allTab = tabList.find(t => t.id === 'All');
  const catSum = tabList.filter(t => t.id !== 'All').reduce((acc, t) => acc + t.count, 0);
  assert.strictEqual(allTab.count, sampleItems.length, 'F2 All count === items.length');
  assert.strictEqual(catSum, allTab.count, 'F2 sum of 4 categories === All');
  for (const cat of ['Furniture', 'Lights', 'Plants', 'Decor']) {
    assert.strictEqual(tabList.find(t => t.id === cat).count, 5, `F2 ${cat} count should be 5`);
  }
  console.log('F2 OK');

  // F3: search-substring-case-insensitive
  const f3 = EditFilters.filterItems(sampleItems, { tab: 'All', query: '  SOFA ' }, lightIds);
  assert.strictEqual(f3.length, 1, 'F3 should match 1 sofa');
  assert.strictEqual(f3[0].id, 'sofa_cosy', 'F3 matched sofa_cosy');
  console.log('F3 OK');

  // F4: search-by-id-and-name
  const f4ById = EditFilters.filterItems(sampleItems, { tab: 'All', query: 'sig_glen' }, lightIds);
  assert.strictEqual(f4ById.length, 1, 'F4 match by id');
  assert.strictEqual(f4ById[0].id, 'sig_glen_knit_bed', 'F4 matched sig_glen_knit_bed by id');

  const f4ByName = EditFilters.filterItems(sampleItems, { tab: 'All', query: 'Tulip bed' }, lightIds);
  assert.strictEqual(f4ByName.length, 1, 'F4 match by name');
  assert.strictEqual(f4ByName[0].id, 'flowerbed_tulip', 'F4 matched flowerbed_tulip by name');
  console.log('F4 OK');

  // F5: tab-plus-search
  const f5 = EditFilters.filterItems(sampleItems, { tab: 'Plants', query: 'bed' }, lightIds);
  assert.strictEqual(f5.length, 1, 'F5 only Plants matching bed');
  assert.strictEqual(f5[0].id, 'flowerbed_tulip', 'F5 excludes sig_glen_knit_bed (Decor)');
  console.log('F5 OK');

  // F6: empty-result-message
  assert.strictEqual(EditFilters.EMPTY_MESSAGE, 'No items match your filter', 'F6 EMPTY_MESSAGE');
  const f6 = EditFilters.filterItems(sampleItems, { tab: 'Lights', query: 'nonexistent_xyz' }, lightIds);
  assert.deepStrictEqual(f6, [], 'F6 empty result returns []');
  console.log('F6 OK');

  // F7: does-not-mutate-input
  const snapshot = JSON.stringify(sampleItems);
  EditFilters.categorize(sampleItems[0], lightIds);
  EditFilters.tabs(sampleItems, lightIds);
  const filtered = EditFilters.filterItems(sampleItems, { tab: 'All', query: '' }, lightIds);
  assert.notStrictEqual(filtered, sampleItems, 'F7 filterItems returns new array');
  assert.strictEqual(JSON.stringify(sampleItems), snapshot, 'F7 input array/items not mutated');
  console.log('F7 OK');

  return sampleItems;
}

async function runBrowserTests(sampleItems) {
  const browser = await launchBrowser();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 420, height: 640 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      errors.push(`pageerror: ${err.message}`);
    });

    await page.setContent(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>EditFilters Test</title></head>
<body>
  <form id="testForm">
    <div id="filtersHost"></div>
  </form>
</body>
</html>`);
    await page.addScriptTag({ path: MODULE_PATH });

    // F8: build-renders-tabs-and-input
    const f8 = await page.evaluate((items) => {
      window.__changes = [];
      window.__formSubmitted = false;
      document.getElementById('testForm').addEventListener('submit', (e) => {
        e.preventDefault();
        window.__formSubmitted = true;
      });

      const host = document.getElementById('filtersHost');
      window.EditFilters.build(host, {
        items,
        tab: 'All',
        query: '',
        onChange: (state) => window.__changes.push(state)
      });

      const styleEl = document.getElementById('editFiltersStyle');
      const tablist = host.querySelector('.edit-drawer-tabs[role="tablist"]');
      const tabs = Array.from(host.querySelectorAll('.edit-drawer-tab[role="tab"]'));
      const selected = tabs.filter(el => el.getAttribute('aria-selected') === 'true');
      const search = document.getElementById('editDrawerSearch');
      return {
        hasStyle: !!styleEl,
        hasTablist: !!tablist,
        tabCount: tabs.length,
        tabLabels: tabs.map(t => t.textContent.trim()),
        selectedCount: selected.length,
        selectedTab: selected[0] ? selected[0].getAttribute('data-tab') : null,
        hasSearch: !!search,
        searchType: search ? search.getAttribute('type') : null,
        hasSearchClass: search ? search.classList.contains('edit-drawer-search') : false
      };
    }, sampleItems);

    assert.strictEqual(f8.hasStyle, true, 'F8 #editFiltersStyle injected');
    assert.strictEqual(f8.hasTablist, true, 'F8 .edit-drawer-tabs[role="tablist"] present');
    assert.strictEqual(f8.tabCount, 5, 'F8 5 tabs rendered');
    assert.strictEqual(f8.selectedCount, 1, 'F8 exactly one active tab');
    assert.strictEqual(f8.selectedTab, 'All', 'F8 default active tab is All');
    assert.strictEqual(f8.hasSearch, true, 'F8 #editDrawerSearch exists');
    assert.strictEqual(f8.searchType, 'search', 'F8 input type=search');
    assert.strictEqual(f8.hasSearchClass, true, 'F8 .edit-drawer-search class');
    console.log('F8 OK');

    // F9: onChange-fires-with-state
    await page.click('.edit-drawer-tab[data-tab="Plants"]');
    await page.fill('#editDrawerSearch', 'tulip');
    const changes = await page.evaluate(() => window.__changes);
    assert(changes.length >= 2, 'F9 onChange fired on tab click and search input');
    assert.deepStrictEqual(changes[0], { tab: 'Plants', query: '' }, 'F9 first change is tab Plants');
    assert.deepStrictEqual(changes[changes.length - 1], { tab: 'Plants', query: 'tulip' }, 'F9 last change has tab Plants and query tulip');
    console.log('F9 OK');

    // F10: keyboard (ArrowRight/ArrowLeft switch tabs, Enter in search does not submit form)
    await page.click('.edit-drawer-tab[data-tab="All"]');
    await page.focus('.edit-drawer-tab[data-tab="All"]');
    await page.keyboard.press('ArrowRight');
    const afterRight = await page.evaluate(() => {
      const sel = document.querySelector('.edit-drawer-tab[aria-selected="true"]');
      return sel ? sel.getAttribute('data-tab') : null;
    });
    assert.strictEqual(afterRight, 'Furniture', 'F10 ArrowRight moves All -> Furniture');

    await page.keyboard.press('ArrowLeft');
    const afterLeft = await page.evaluate(() => {
      const sel = document.querySelector('.edit-drawer-tab[aria-selected="true"]');
      return sel ? sel.getAttribute('data-tab') : null;
    });
    assert.strictEqual(afterLeft, 'All', 'F10 ArrowLeft moves Furniture -> All');

    await page.focus('#editDrawerSearch');
    await page.keyboard.press('Enter');
    const submitted = await page.evaluate(() => window.__formSubmitted);
    assert.strictEqual(submitted, false, 'F10 Enter in #editDrawerSearch must not submit form');
    console.log('F10 OK');

    // F11: no-console-errors
    assert.strictEqual(errors.length, 0, `F11 console/page errors: ${errors.join('; ')}`);
    console.log('F11 OK');
  } finally {
    await browser.close();
  }
}

(async () => {
  const sampleItems = runNodeTests();
  await runBrowserTests(sampleItems);
  console.log('ALL ux-p6-filters TESTS PASSED');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
