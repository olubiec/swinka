'use strict';
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Helper to load all shop items from assets/data/
function loadAllShopItems() {
  const decor = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'items_decor.json'), 'utf8')).items || [];
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'items.json'), 'utf8')).items || [];
  const shop = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'items_shop.json'), 'utf8')).items || [];

  const items = [];
  const seen = new Set();

  function addItem(it, defaultCat) {
    if (seen.has(it.id)) return;
    seen.add(it.id);
    let cat = it.category || defaultCat;
    if (cat === 'vegetable' || cat === 'treat' || cat === 'chew_stick') cat = 'food';
    else if (cat === 'equipment') cat = 'toy';
    else if (cat === 'furniture') cat = 'decor';
    else if (cat === 'medicine' || cat === 'vitamins') cat = 'care';

    items.push({
      id: it.id,
      name: it.name,
      category: cat,
      price: it.price || 10,
      icon: it.icon,
      description: it.description || '',
      oneTime: !!it.one_time,
      dailyLimit: it.daily_limit,
      slot: it.slot,
      look: it.look
    });
  }

  for (const it of base) addItem(it, 'food');
  for (const it of shop) addItem(it, 'food');
  for (const it of decor) addItem(it, 'decor');

  return items;
}

// Store rows to test store feature
function loadTestStoreRows() {
  return [
    { id: 'sofa_cosy', kind: 'item', name: 'Cosy sofa', category: 'furniture', place: 'house', price: 40, owned: 0, placed: 0, locked: false },
    { id: 'armchair', kind: 'item', name: 'Armchair', category: 'furniture', place: 'house', price: 30, owned: 0, placed: 0, locked: false },
    { id: 'bookshelf', kind: 'item', name: 'Bookshelf', category: 'furniture', place: 'house', price: 60, owned: 0, placed: 0, locked: false },
    { id: 'plant_pot', kind: 'item', name: 'Plant pot', category: 'plants', place: 'house', price: 15, owned: 0, placed: 0, locked: false },
    { id: 'plant_shelf', kind: 'item', name: 'Plant shelf', category: 'plants', place: 'house', price: 25, owned: 0, placed: 0, locked: false }
  ];
}

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
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

  const allShopItems = loadAllShopItems();
  const testStoreRows = loadTestStoreRows();

  // Set up mock state with all items
  await page.evaluate(({ shopItems, storeRows }) => {
    if (window.bridge) {
      window.bridge.registerMockState('full_shop', function(st) {
        st.shop = {
          items: shopItems,
          categories: ['food', 'toy', 'decor', 'care']
        };
        // Give inventory for decor testing
        st.inventory = st.inventory || {};
        shopItems.filter(i => i.category === 'decor').forEach(i => {
          st.inventory[i.id] = 1;
        });
        st.decor = {
          equipped: {
            wallpaper: 'wallpaper_mint',
            floor: 'floor_wood_light',
            rug: 'rug_round_pink',
            plant: 'plant_fern',
            picture: 'picture_pig',
            lamp: 'lamp_mushroom'
          }
        };
      });

      window.bridge.registerMockState('store', function(st) {
        st.store = {
          categories: [
            { id: 'furniture', name: 'Furniture', count: 3 },
            { id: 'plants', name: 'Plants', count: 2 }
          ],
          rows: storeRows
        };
      });

      if (window.bridge.broadcastState) {
        window.bridge.broadcastState();
      }
    }
  }, { shopItems: allShopItems, storeRows: testStoreRows });

  await page.waitForTimeout(300);

  // Helper in browser to extract icon descriptor from element
  const getDescriptorFn = () => `
    window.__getIconDescriptor = function(el) {
      const img = el.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || img.src;
        const norm = src.split('/').slice(-2).join('/');
        return 'img:' + norm;
      }
      const canvas = el.querySelector('canvas');
      if (canvas) {
        return 'canvas:' + canvas.toDataURL();
      }
      const swatch = el.querySelector('.item-icon-swatch, [data-color]');
      if (swatch) {
        const c = swatch.getAttribute('data-color') || swatch.style.backgroundColor;
        return 'swatch:' + c;
      }
      const pixelIcon = el.querySelector('.pixel-icon');
      if (pixelIcon) {
        const cls = Array.from(pixelIcon.classList).filter(c => c.startsWith('icon-')).sort().join(' ');
        const c = pixelIcon.style.backgroundColor;
        return 'icon:' + cls + (c ? (':' + c) : '');
      }
      return null;
    };
  `;

  await page.evaluate(getDescriptorFn());

  // I1: shop-icons-unique
  await testScenario('shop-icons-unique', async () => {
    await page.click('#btnShop');
    await page.waitForSelector('.feature-shop-tabs', { timeout: 5000 });

    const tabs = ['food', 'toy', 'decor', 'care'];
    for (const tabId of tabs) {
      await page.click(`.feature-shop-tab[data-tab="${tabId}"]`);
      await page.waitForTimeout(200);

      const result = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.feature-shop-item'));
        const descriptors = new Map();
        const duplicates = [];

        items.forEach(it => {
          const btn = it.querySelector('button[data-buy]');
          const id = btn ? btn.dataset.buy : (it.querySelector('b') ? it.querySelector('b').textContent : 'unknown');
          const desc = window.__getIconDescriptor(it);
          if (!desc) {
            duplicates.push(`item ${id} has no icon descriptor`);
            return;
          }
          if (descriptors.has(desc)) {
            duplicates.push(`items "${descriptors.get(desc)}" and "${id}" share icon descriptor ${desc}`);
          } else {
            descriptors.set(desc, id);
          }
        });

        return { count: items.length, duplicates };
      });

      if (result.count === 0) {
        throw new Error(`Tab ${tabId} has no items`);
      }
      if (result.duplicates.length > 0) {
        throw new Error(`Tab ${tabId} duplicates: ` + result.duplicates.join('; '));
      }
    }
  });

  // I2: store-icons-unique
  await testScenario('store-icons-unique', async () => {
    await page.evaluate(() => window.CuyHome.openFeature('store'));
    await page.waitForSelector('.store-card', { timeout: 5000 });

    const result = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.store-card[data-kind="item"]'));
      const descriptors = new Map();
      const duplicates = [];

      cards.forEach(card => {
        const id = card.dataset.id;
        const desc = window.__getIconDescriptor(card);
        if (!desc) {
          duplicates.push(`store item ${id} has no icon descriptor`);
          return;
        }
        if (descriptors.has(desc)) {
          duplicates.push(`store items "${descriptors.get(desc)}" and "${id}" share icon descriptor ${desc}`);
        } else {
          descriptors.set(desc, id);
        }
      });

      return { count: cards.length, duplicates };
    });

    if (result.count === 0) {
      throw new Error('Store has no item cards');
    }
    if (result.duplicates.length > 0) {
      throw new Error('Store duplicates: ' + result.duplicates.join('; '));
    }
  });

  // I3: decor-icons-unique
  await testScenario('decor-icons-unique', async () => {
    await page.evaluate(() => window.CuyHome.openFeature('decor'));
    await page.waitForSelector('.decor-slot-row', { timeout: 5000 });

    const result = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.decor-slot-row'));
      const errors = [];

      rows.forEach(row => {
        const labelEl = row.querySelector('.decor-slot-label');
        const slot = labelEl ? labelEl.textContent.trim().toLowerCase() : 'unknown';
        const btns = Array.from(row.querySelectorAll('.decor-item-btn[data-id]')).filter(b => b.dataset.id);
        const descriptors = new Map();

        btns.forEach(b => {
          const id = b.dataset.id;
          const desc = window.__getIconDescriptor(b);
          if (!desc) {
            errors.push(`decor item ${id} in slot ${slot} has no icon descriptor`);
            return;
          }
          if (descriptors.has(desc)) {
            errors.push(`slot ${slot}: items "${descriptors.get(desc)}" and "${id}" share icon descriptor ${desc}`);
          } else {
            descriptors.set(desc, id);
          }
        });
      });

      return { errors };
    });

    if (result.errors.length > 0) {
      throw new Error('Decor duplicates: ' + result.errors.join('; '));
    }
  });

  // I4: no-broken-images
  await testScenario('no-broken-images', async () => {
    // Check across shop, store, and decor
    const features = ['shop', 'store', 'decor'];
    for (const f of features) {
      await page.evaluate((feat) => window.CuyHome.openFeature(feat), f);
      await page.waitForTimeout(300);

      const broken = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('.modal-body img'));
        return imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
      });

      if (broken.length > 0) {
        throw new Error(`Feature ${f} has broken images: ` + broken.join(', '));
      }
    }
  });

  // I5: icon-scale
  await testScenario('icon-scale', async () => {
    const features = ['shop', 'store', 'decor'];
    for (const f of features) {
      await page.evaluate((feat) => window.CuyHome.openFeature(feat), f);
      await page.waitForTimeout(300);

      const scaleErrors = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('.modal-body img.item-icon-img'));
        const errs = [];
        imgs.forEach(img => {
          const style = window.getComputedStyle(img);
          const rend = style.imageRendering;
          if (rend !== 'pixelated' && rend !== 'crisp-edges') {
            errs.push(`Image ${img.src} has image-rendering: "${rend}", expected pixelated`);
          }

          const rect = img.getBoundingClientRect();
          const natW = img.naturalWidth;
          const natH = img.naturalHeight;
          if (natW > 0 && natH > 0) {
            const scaleX = rect.width / natW;
            const scaleY = rect.height / natH;
            const isIntX = Math.abs(scaleX - Math.round(scaleX)) < 0.05 && Math.round(scaleX) >= 1;
            const isIntY = Math.abs(scaleY - Math.round(scaleY)) < 0.05 && Math.round(scaleY) >= 1;
            if (!isIntX || !isIntY) {
              errs.push(`Image ${img.src} scale is fractional: scaleX=${scaleX.toFixed(2)}, scaleY=${scaleY.toFixed(2)} (nat: ${natW}x${natH}, rect: ${rect.width}x${rect.height})`);
            }
          }
        });
        return errs;
      });

      if (scaleErrors.length > 0) {
        throw new Error(`Feature ${f} icon-scale errors: ` + scaleErrors.join('; '));
      }
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error in ux-p2-icons runner:', err);
  process.exit(1);
});
