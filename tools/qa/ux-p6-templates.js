'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_PATH = path.join(ROOT, 'web', 'home', 'features', 'places', 'edit-templates.js');
const PIG_ROOMS_PATH = path.join(ROOT, 'assets', 'data', 'pig_rooms.json');

function makeState(overrides) {
  const base = {
    rooms: {
      layouts: {
        salon: {
          name: 'Living Room',
          cols: 12,
          rows: 6,
          wallRows: 2,
          wallpaper: 'wallpaper_peach',
          floor: 'floor_wood_light',
          items: [{ uid: 'it_1', itemId: 'sofa_cosy', x: 40, y: 80 }]
        },
        garden: {
          name: 'Garden',
          cols: 16,
          rows: 9,
          wallRows: 0,
          wallpaper: '',
          floor: '',
          items: []
        }
      },
      skins: {
        wallpapers: [
          { id: 'wallpaper_mint', name: 'Mint wallpaper', icon: 'wallpaper', price: 30, owned: true },
          { id: 'wallpaper_peach', name: 'Peach wallpaper', icon: 'wallpaper', price: 30, owned: true },
          { id: 'wallpaper_night', name: 'Night wallpaper', icon: 'wallpaper', price: 45, owned: false },
          { id: 'wallpaper_lilac', name: 'Lilac wallpaper', icon: 'wallpaper', price: 35, owned: true },
          { id: 'wallpaper_sky', name: 'Sky wallpaper', icon: 'wallpaper', price: 30, owned: true }
        ],
        floors: [
          { id: 'floor_wood_light', name: 'Light wood', icon: 'floor', price: 25, owned: true },
          { id: 'floor_carpet_red', name: 'Red carpet', icon: 'floor', price: 40, owned: true },
          { id: 'floor_tiles_checker', name: 'Checker tiles', icon: 'floor', price: 35, owned: true },
          { id: 'floor_grass', name: 'Grass floor', icon: 'floor', price: 30, owned: false }
        ]
      },
      owned: {}
    }
  };
  if (overrides && overrides.rooms) {
    Object.assign(base.rooms, overrides.rooms);
  }
  return base;
}

function runNodeTests(EditTemplates) {
  const pigRooms = JSON.parse(fs.readFileSync(PIG_ROOMS_PATH, 'utf8'));
  const jsonThemeIds = Object.keys(pigRooms.themes);

  // M1: themes-listed
  const defaultThemes = EditTemplates.themes({});
  assert.strictEqual(defaultThemes.length, jsonThemeIds.length, 'M1: theme count matches pig_rooms.json');
  for (const id of jsonThemeIds) {
    const found = defaultThemes.find((t) => t.id === id);
    assert(found, `M1: missing theme ${id}`);
    assert.strictEqual(found.wallpaper, pigRooms.themes[id].wallpaper, `M1: ${id} wallpaper`);
    assert.strictEqual(found.floor, pigRooms.themes[id].floor, `M1: ${id} floor`);
    assert.strictEqual(found.mood, pigRooms.themes[id].mood, `M1: ${id} mood`);
  }
  const customThemes = EditTemplates.themes({
    rooms: {
      themes: {
        custom_a: { name: 'Custom A', mood: 'bright', wallpaper: 'wallpaper_mint', floor: 'floor_wood_light' }
      }
    }
  });
  assert.strictEqual(customThemes.length, 1, 'M1: state.rooms.themes overrides defaults');
  assert.strictEqual(customThemes[0].id, 'custom_a', 'M1: custom theme id');
  console.log('M1 themes-listed OK');

  // M2: plan-two-messages
  const state = makeState();
  const planKuki = EditTemplates.plan('kuki', state, 'salon');
  assert(Array.isArray(planKuki.messages), 'M2: messages is array');
  assert.strictEqual(planKuki.messages.length, 2, 'M2: exactly 2 messages');
  assert.deepStrictEqual(planKuki.messages[0], {
    type: 'room_skin',
    room: 'salon',
    slot: 'wallpaper',
    itemId: 'wallpaper_mint'
  }, 'M2: first message is wallpaper room_skin');
  assert.deepStrictEqual(planKuki.messages[1], {
    type: 'room_skin',
    room: 'salon',
    slot: 'floor',
    itemId: 'floor_wood_light'
  }, 'M2: second message is floor room_skin');
  console.log('M2 plan-two-messages OK');

  // M3: furniture-untouched
  const badOps = planKuki.messages.filter((m) => m.type === 'room_remove' || m.type === 'room_move');
  assert.strictEqual(badOps.length, 0, 'M3: no room_remove or room_move');
  assert.strictEqual(state.rooms.layouts.salon.items.length, 1, 'M3: existing items untouched');
  assert.strictEqual(state.rooms.layouts.salon.items[0].uid, 'it_1', 'M3: item uid preserved');
  console.log('M3 furniture-untouched OK');

  // M4: not-owned-refused
  const planJames = EditTemplates.plan('james', state, 'salon');
  assert(typeof planJames.refused === 'string' && planJames.refused.length > 0, 'M4: refused string returned');
  assert(planJames.refused.includes('Night wallpaper'), `M4: refused mentions item name, got: ${planJames.refused}`);
  const planRacuch = EditTemplates.plan('racuch', state, 'salon');
  assert(typeof planRacuch.refused === 'string' && planRacuch.refused.includes('Grass floor'), `M4: refused mentions missing floor, got: ${planRacuch.refused}`);
  console.log('M4 not-owned-refused OK');

  // M5: already-applied-noop
  const appliedState = makeState();
  appliedState.rooms.layouts.salon.wallpaper = 'wallpaper_mint';
  appliedState.rooms.layouts.salon.floor = 'floor_wood_light';
  const noopPlan = EditTemplates.plan('kuki', appliedState, 'salon');
  assert.strictEqual(noopPlan.noop, true, 'M5: noop is true');
  assert.deepStrictEqual(noopPlan.messages, [], 'M5: messages is empty');
  console.log('M5 already-applied-noop OK');

  // M6: unknown-theme
  const unknownPlan = EditTemplates.plan('does_not_exist', state, 'salon');
  assert.strictEqual(unknownPlan.refused, 'Unknown template', 'M6: unknown theme refused');
  console.log('M6 unknown-theme OK');

  // M7: outdoor-room-refused (pure)
  for (const outdoorId of ['garden', 'park', 'farm', 'market', '', null]) {
    const outPlan = EditTemplates.plan('kuki', state, outdoorId);
    assert.strictEqual(outPlan.refused, 'Templates are only for indoor rooms', `M7: ${outdoorId} refused`);
  }
  console.log('M7 outdoor-room-refused (plan) OK');
}

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

async function runDomTests() {
  const source = fs.readFileSync(MODULE_PATH, 'utf8');
  const browser = await launchBrowser();
  const errors = [];

  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await page.setContent(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Templates Test</title></head>
<body>
  <div id="host"></div>
  <script>${source}</script>
</body>
</html>`);

    const state = makeState();
    // Make 'glen' already applied in salon so we test enabled, refused, and noop together
    state.rooms.layouts.salon.wallpaper = 'wallpaper_lilac';
    state.rooms.layouts.salon.floor = 'floor_wood_light';

    // M7 DOM: outdoor clears container
    const outdoorHtml = await page.evaluate((st) => {
      const host = document.getElementById('host');
      host.innerHTML = '<div class="stale">old</div>';
      window.EditTemplates.build(host, { state: st, roomId: 'garden', send: () => {} });
      return host.innerHTML;
    }, state);
    assert.strictEqual(outdoorHtml, '', 'M7: outdoor build clears container');
    console.log('M7 outdoor-room-refused (DOM) OK');

    // M8: build-renders-buttons-disabled-when-refused
    const domInfo = await page.evaluate((st) => {
      window.__sent = [];
      const host = document.getElementById('host');
      // STUB send
      const send = (msg) => window.__sent.push(msg);
      window.EditTemplates.build(host, { state: st, roomId: 'salon', send });
      const btns = Array.from(host.querySelectorAll('[data-theme]'));
      return btns.map((b) => ({
        theme: b.getAttribute('data-theme'),
        disabled: b.disabled,
        title: b.getAttribute('title') || '',
        ariaPressed: b.getAttribute('aria-pressed')
      }));
    }, state);

    assert.strictEqual(domInfo.length, 5, 'M8: 5 theme buttons rendered');
    const kukiBtn = domInfo.find((b) => b.theme === 'kuki');
    const jamesBtn = domInfo.find((b) => b.theme === 'james');
    const glenBtn = domInfo.find((b) => b.theme === 'glen');
    assert.strictEqual(kukiBtn.disabled, false, 'M8: owned unapplied theme enabled');
    assert.strictEqual(jamesBtn.disabled, true, 'M8: unowned theme disabled');
    assert(jamesBtn.title.includes('Buy Night wallpaper in the shop'), `M8: disabled title explains reason: ${jamesBtn.title}`);
    assert.strictEqual(glenBtn.disabled, true, 'M8: already-applied theme disabled');
    assert.strictEqual(glenBtn.ariaPressed, 'true', 'M8: already-applied theme has aria-pressed=true');
    console.log('M8 build-renders-buttons-disabled-when-refused OK');

    // M9: click-sends-messages-in-order
    await page.click('[data-theme="kuki"]');
    const sent = await page.evaluate(() => window.__sent);
    assert.strictEqual(sent.length, 2, 'M9: click sends 2 messages');
    assert.deepStrictEqual(sent[0], {
      type: 'room_skin',
      room: 'salon',
      slot: 'wallpaper',
      itemId: 'wallpaper_mint'
    }, 'M9: first sent message is wallpaper');
    assert.deepStrictEqual(sent[1], {
      type: 'room_skin',
      room: 'salon',
      slot: 'floor',
      itemId: 'floor_wood_light'
    }, 'M9: second sent message is floor');
    console.log('M9 click-sends-messages-in-order OK');

    // M10: no-console-errors
    assert.strictEqual(errors.length, 0, `M10: expected no console errors, got: ${errors.join('; ')}`);
    console.log('M10 no-console-errors OK');
  } finally {
    await browser.close();
  }
}

(async function main() {
  const EditTemplates = require(MODULE_PATH);
  runNodeTests(EditTemplates);
  await runDomTests();
  console.log('ALL ux-p6-templates TESTS PASSED');
}().catch((err) => {
  console.error(err);
  process.exit(1);
}));
