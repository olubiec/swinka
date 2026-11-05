// End-to-end smoke of the record player (A7) in the Home page (web/home), headless, at 420 px.
// Usage (repo root): CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/qa/music-smoke.js
// Screenshots go to MUSIC_SMOKE_OUT (default tools/qa/out/music-smoke). Exit 1 on any failed step or page/console error.
// The C# side is MOCKED in one place: csMockInstall below (see the comment there). Audio is a stub: no sound.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { assertLayout } = require('./lib/layout.js');

const ROOT = path.resolve(__dirname, '..', '..');
const MUSIC_DIR = path.join(ROOT, 'web', 'home', 'features', 'music');
const OUT = process.env.MUSIC_SMOKE_OUT || path.join(__dirname, 'out', 'music-smoke');
const VIEW = { width: 420, height: 640 };
const SAVE_KEY = 'cuy_mock_state_v1'; // the bridge mock's save (web/home/bridge.js), used here only for the "old save" step
const ALLOWED_MISSING = require('./known-missing-assets.json').allowed;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.ogg': 'audio/ogg', '.svg': 'image/svg+xml' };

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'records', 'manifest.json'), 'utf8'));
// Same numbers as src/Cuy.Core/Music/MusicPrices.cs and the rarity map MusicShop.ParseRecordRarities reads.
const PRICES = {
  record: { common: 60, rare: 200 },
  player: { player_turntable: 120, player_portable: 250, player_gramophone: 400, player_cassette: 600, player_boombox: 900, player_jukebox: 1400 }
};
const RARITY_OF = {};
for (const r of manifest.records) if (r && typeof r.id === 'string' && typeof r.rarity === 'string') RARITY_OF[r.id] = r.rarity;

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ---- MOCK C# (the only place the C# side is imitated) ----
// Mirrors MusicFeature.cs (musicBuy: check, pay, grant), MusicShop.cs (Check/Grant), GameState.Music.cs (EnsureMusic on load).
// The save is the bridge mock state, so a page reload is the game restart and the save survives it.
// There is no C# message for placing or picking up a player yet, so cs.place / cs.pickUp below stand in for one.
// Starting clovers (200) are the test's own pig state, set on a new game only.
function csMockInstall(arg) {
  const b = window.bridge;
  const cs = window.__csMock = window.__csMock || { log: [] };
  const s0 = b.currentState;
  if (arg.newGame) s0.clovers = 200;

  // The save fields live in state.music (GameState AddState -> state["music"], MusicFeature.cs). Created when missing.
  const music = (s) => {
    if (!s.music || typeof s.music !== 'object' || Array.isArray(s.music)) s.music = {};
    const m = s.music;
    if (!m.records || typeof m.records !== 'object' || Array.isArray(m.records)) m.records = {};
    if (!Array.isArray(m.playerOwned)) m.playerOwned = [];
    if (!m.playerPlaced || typeof m.playerPlaced !== 'object' || Array.isArray(m.playerPlaced)) m.playerPlaced = {};
    return m;
  };
  // GameState.EnsureMusic: the starter player once, then musicVersion = 1.
  const ensureMusic = (s) => {
    const m = music(s);
    if ((Number(m.musicVersion) || 0) >= 1) return m;
    if (!m.playerOwned.includes(arg.starter) && !Object.values(m.playerPlaced).includes(arg.starter)) m.playerOwned.push(arg.starter);
    m.musicVersion = 1;
    return m;
  };
  const commit = () => { b.saveMockState(); b.broadcastState(); };

  // MusicShop.Check (balance = pig clovers, the root of the state)
  const check = (s, m, kind, itemId) => {
    if (!itemId) return { error: 'UnknownItem', price: 0 };
    if (kind === 'record') {
      const rarity = arg.rarityOf[itemId];
      if (!rarity) return { error: 'UnknownItem', price: 0 };
      const price = arg.recordPrice[rarity];
      if (price === undefined) return { error: 'NotForSale', price: 0 };
      return s.clovers < price ? { error: 'NotEnoughClovers', price } : { error: null, price };
    }
    if (kind === 'player') {
      const price = arg.playerPrice[itemId];
      if (price === undefined) return { error: 'UnknownItem', price: 0 };
      if (m.playerOwned.includes(itemId) || Object.values(m.playerPlaced).includes(itemId)) return { error: 'AlreadyOwned', price };
      return s.clovers < price ? { error: 'NotEnoughClovers', price } : { error: null, price };
    }
    return { error: 'UnknownItem', price: 0 };
  };

  // MusicFeature.HandleMessage("musicBuy"): a refusal changes nothing (C# shows a toast only).
  const orig = b.handleMockAction.bind(b);
  b.handleMockAction = (action) => {
    if (action.type !== 'musicBuy') return orig(action);
    const s = b.currentState;
    const m = ensureMusic(s);
    const c = check(s, m, action.kind, action.itemId);
    if (c.error) { cs.log.push('refused ' + c.error + ' ' + action.itemId); return; }
    s.clovers -= c.price; // TryPay
    if (action.kind === 'record') m.records[action.itemId] = (m.records[action.itemId] || 0) + 1; // Grant
    else m.playerOwned.push(action.itemId);
    cs.log.push('bought ' + action.kind + ' ' + action.itemId + ' for ' + c.price);
    commit();
  };

  // Stand-in for placing / picking up (playerOwned <-> playerPlaced, as in features/music/world.js).
  cs.place = (roomId, playerId) => {
    const m = ensureMusic(b.currentState);
    if (m.playerPlaced[roomId] !== undefined || !m.playerOwned.includes(playerId)) return false;
    m.playerOwned = m.playerOwned.filter((id) => id !== playerId);
    m.playerPlaced[roomId] = playerId;
    commit();
    return true;
  };
  cs.pickUp = (roomId) => {
    const m = ensureMusic(b.currentState);
    const id = m.playerPlaced[roomId];
    if (id === undefined) return false;
    delete m.playerPlaced[roomId];
    if (!m.playerOwned.includes(id)) m.playerOwned.push(id);
    commit();
    return true;
  };

  ensureMusic(s0); // the C# load rule (EnsureMusic) runs on every load of a save
  commit();
}

// Audio stub (no sound): records instances so the test can read play/pause/volume.
function audioStubInit() {
  window.__audioInstances = [];
  class StubAudio {
    constructor(src) {
      this.src = src === undefined ? '' : src;
      this.paused = true;
      this.volume = 1;
      this.loop = false;
      window.__audioInstances.push(this);
    }
    addEventListener() {}
    removeEventListener() {}
    canPlayType() { return 'probably'; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
  }
  window.Audio = StubAudio;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, timeout = 3000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await fn();
    if (last) return last;
    await sleep(50);
  }
  throw new Error('timeout: ' + label + ' (last: ' + JSON.stringify(last) + ')');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ viewport: VIEW });
  await context.addInitScript(audioStubInit);
  const page = await context.newPage();

  const errors = [];
  const results = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  // "Failed to load resource" is the browser's line for a 404; the response check below decides for it (as in web-smoke).
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', (r) => {
    if (r.status() >= 400 && !ALLOWED_MISSING.some((a) => r.url().includes(a))) errors.push('HTTP ' + r.status() + ' ' + r.url());
  });

  const log = (tag, name, extra) => {
    console.log(tag + ' ' + name + (extra ? ': ' + extra : ''));
    results.push({ tag, name, extra: extra || '' });
  };
  // Runs one step; a step fails on an exception or on any page/console error raised while it ran.
  async function step(name, fn) {
    const before = errors.length;
    try {
      await fn();
      if (errors.length > before) throw new Error('errors: ' + errors.slice(before).join(' | '));
      log('PASS', name);
    } catch (e) {
      log('FAIL', name, e.message);
    }
  }

  const music = () => page.evaluate(() => window.bridge.getState().music);
  const clovers = () => page.evaluate(() => window.bridge.getState().clovers);
  const mini = () => page.evaluate(() => {
    const p = document.querySelector('.mp_panel');
    if (!p) return null;
    const btn = p.querySelector('.mp_btn');
    return {
      title: p.querySelector('.mp_title').textContent,
      count: p.querySelector('.mp_count').textContent,
      playLabel: btn.getAttribute('aria-label'),
      playDisabled: btn.disabled,
      muted: p.classList.contains('is-muted')
    };
  });
  const engine = () => page.evaluate(() => window.CuyMusicPlayer.autoEngine().getState());
  const audioLast = () => page.evaluate(() => {
    const a = window.__audioInstances[window.__audioInstances.length - 1];
    return a ? { paused: a.paused, volume: a.volume } : null;
  });

  const mockArg = (newGame) => ({
    newGame, rarityOf: RARITY_OF, recordPrice: PRICES.record, playerPrice: PRICES.player, starter: 'player_turntable'
  });
  // Opens the Home page (a reload is a restart). withMock: install csMockInstall (the C# side) after the page is up.
  async function load({ newGame = false, withMock = true } = {}) {
    await page.goto(base + '/web/home/index.html');
    await page.waitForTimeout(300);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(150);
    }
    await page.addStyleTag({ path: path.join(MUSIC_DIR, 'shelf.css') });
    await page.addScriptTag({ path: path.join(MUSIC_DIR, 'shelf.js') });
    if (withMock) await page.evaluate(csMockInstall, mockArg(newGame));
    await page.waitForTimeout(150);
  }

  async function buyRecord(id) {
    await page.evaluate(() => window.CuyHome.openFeature('shop'));
    try {
      await page.click('.feature-shop-tab[data-tab="toy"]'); // records are in the Toys tab; the shop opens on Food
      await page.waitForSelector(`[data-buy="record:${id}"]:not([disabled])`, { timeout: 3000 });
      await page.click(`[data-buy="record:${id}"]`);
      await until(async () => ((await music()).records || {})[id] > 0, 'record ' + id + ' saved');
    } finally {
      await page.evaluate(() => window.CuyHome.closeFeature && window.CuyHome.closeFeature()).catch(() => {});
      await page.waitForTimeout(150);
    }
  }

  // Draws the shelf from the save (shelf.js) into a fixed scratch host, screenshots it and returns the model summary.
  async function shelfShot(file, playingId) {
    const summary = await page.evaluate(([m, playing]) => {
      const save = window.bridge.getState().music;
      const model = window.CuyMusicShelf.buildShelfModel(m, save, playing);
      let host = document.getElementById('smoke-shelf');
      if (!host) {
        host = document.createElement('div');
        host.id = 'smoke-shelf';
        host.style.cssText = 'position:fixed;left:0;top:0;width:420px;padding:8px;background:#2b2236;z-index:9999';
        document.body.appendChild(host);
      }
      window.CuyMusicShelf.renderShelf(host, model);
      return { ownedCount: model.ownedCount, total: model.total, lockedSlots: host.querySelectorAll('.is-locked').length, playingSlots: host.querySelectorAll('.is-playing').length };
    }, [manifest, playingId || null]);
    await page.locator('#smoke-shelf').screenshot({ path: path.join(OUT, file) });
    await page.evaluate(() => document.getElementById('smoke-shelf') && document.getElementById('smoke-shelf').remove());
    return summary;
  }

  // ---- Steps (plan order; one deviation, see step 4) ----
  await load({ newGame: true });

  await step('1 new save: starter player only, shelf empty, mini player empty', async () => {
    // Whole-page layout is not asserted: the Home page itself overflows vertically at 420x640 (pre-existing, see web-smoke).
    // The mini player must sit inside the window and the page must not scroll sideways.
    const fit = await page.evaluate(() => {
      const r = document.querySelector('.mp_panel').getBoundingClientRect();
      return { inside: r.left >= -1 && r.right <= window.innerWidth + 1, sideways: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    if (!fit.inside || fit.sideways) throw new Error('mini player layout at 420 px: ' + JSON.stringify(fit));
    const m = await music();
    if (JSON.stringify(m.playerOwned) !== '["player_turntable"]') throw new Error('playerOwned ' + JSON.stringify(m.playerOwned));
    if (m.musicVersion !== 1 || Object.keys(m.records).length !== 0) throw new Error('bad new save ' + JSON.stringify(m));
    const s = await shelfShot('shelf_1_empty.png', null);
    if (s.ownedCount !== 0 || s.lockedSlots !== s.total) throw new Error('shelf not empty: ' + JSON.stringify(s));
    const mm = await mini();
    if (mm.title !== 'No records yet' || !mm.playDisabled) throw new Error('mini player not empty: ' + JSON.stringify(mm));
  });

  await step('2 buy a record: in the shop, in the save, on the shelf', async () => {
    const before = await clovers();
    await buyRecord('s1_poranek');
    const m = await music();
    if (m.records.s1_poranek !== 1) throw new Error('record not granted: ' + JSON.stringify(m.records));
    if ((await clovers()) !== before - PRICES.record.common) throw new Error('clovers not paid');
    const s = await shelfShot('shelf_2_owned.png', null);
    if (s.ownedCount !== 1) throw new Error('shelf does not show the record: ' + JSON.stringify(s));
  });

  await step('3 record shows as owned; no queue without a placed player', async () => {
    const mm = await mini();
    if (mm.title !== 'No records yet') throw new Error('queue before placement: ' + JSON.stringify(mm));
  });

  // Deviation from the plan order: the plan puts play before placing, but features/music/world.js only queues
  // records when a player is placed (canPlayMusic), so play is only reachable after placing. Placing goes first.
  await step('4 place the player in the room (stand-in, see csMockInstall)', async () => {
    const ok = await page.evaluate(() => window.__csMock.place('salon', 'player_turntable'));
    if (!ok) throw new Error('place refused');
    const mm = await until(async () => { const x = await mini(); return x && x.title === 's1_poranek' ? x : null; }, 'queue after placing');
    if (mm.count !== '1/1' || mm.playDisabled) throw new Error('mini player not ready: ' + JSON.stringify(mm));
    const drawn = await page.evaluate(async () => {
      const img = new Image();
      img.src = '../../assets/world/house/player_turntable.png';
      await img.decode();
      const sheet = { off: img, on: img };
      const ctx = { drawImage() {} };
      return window.CuyMusicWorld.drawPlayers(ctx, { state: window.bridge.getState(), floorY: 119 }, () => sheet, 0);
    });
    if (drawn !== 1) throw new Error('room layer drew ' + drawn + ' players, expected 1');
  });

  await step('5 play', async () => {
    await page.click('.mp_panel .mp_btn');
    await until(async () => (await engine()).status === 'playing', 'status playing');
    await until(async () => { const x = await mini(); return x && x.playLabel === 'Pause' ? x : null; }, 'button shows Pause');
    const a = await audioLast();
    if (!a || a.paused) throw new Error('audio stub not playing');
  });

  await step('6 pause', async () => {
    await page.click('.mp_panel .mp_btn');
    await until(async () => (await engine()).status === 'paused', 'status paused');
    const mm = await mini();
    if (mm.playLabel !== 'Play') throw new Error('button label after pause: ' + mm.playLabel);
  });

  await step('7 buy a second record (queue of two)', async () => {
    await buyRecord('s1_marchewka');
    const mm = await until(async () => { const x = await mini(); return x && x.count === '1/2' ? x : null; }, 'count 1/2');
    if (!mm) throw new Error('queue not updated');
  });

  await step('8 change track (next)', async () => {
    await page.click('.mp_panel button[aria-label="Next track"]');
    const mm = await until(async () => { const x = await mini(); return x && x.count === '2/2' ? x : null; }, 'count 2/2');
    if (mm.title !== 's1_poranek') throw new Error('title after next: ' + mm.title);
    await until(async () => (await engine()).status === 'playing', 'playing after next');
    await shelfShot('shelf_8_owned_playing.png', 's1_poranek');
    await page.locator('.mp_panel').screenshot({ path: path.join(OUT, 'mini_8_playing_420.png') });
  });

  await step('9 sound off in the header (mute)', async () => {
    await page.click('#btnSound');
    // The engine applies the mute on the next tick (app.js toggles Sound, then the engine refreshes) and the panel on its poll.
    await until(async () => { const a = await audioLast(); return a && a.volume === 0 ? a : null; }, 'audio volume 0 after mute');
    await until(async () => (await engine()).muted === true, 'engine muted');
    await until(async () => { const mm = await mini(); return mm && mm.muted ? mm : null; }, 'panel marked muted');
  });

  await step('10 restart (reload): save kept', async () => {
    await page.reload();
    await page.waitForTimeout(300);
    await page.addStyleTag({ path: path.join(MUSIC_DIR, 'shelf.css') });
    await page.addScriptTag({ path: path.join(MUSIC_DIR, 'shelf.js') });
    await page.evaluate(csMockInstall, mockArg(false));
    const m = await until(async () => { const x = await music(); return x && x.records && x.records.s1_marchewka === 1 ? x : null; }, 'save loaded');
    if (m.records.s1_poranek !== 1 || m.playerPlaced.salon !== 'player_turntable') throw new Error('save lost: ' + JSON.stringify(m));
    if ((await clovers()) !== 80) throw new Error('clovers after restart: ' + (await clovers()));
    const mm = await until(async () => { const x = await mini(); return x && x.count === '1/2' ? x : null; }, 'queue restored');
    if (mm.title !== 's1_marchewka') throw new Error('queue restored with wrong first title: ' + mm.title);
  });

  await step('11 pick the player up (zdejmij)', async () => {
    const ok = await page.evaluate(() => window.__csMock.pickUp('salon'));
    if (!ok) throw new Error('pick up refused');
    const mm = await until(async () => { const x = await mini(); return x && x.title === 'No records yet' ? x : null; }, 'queue empty');
    if (!mm.playDisabled) throw new Error('play still enabled without a player');
    const m = await music();
    if (m.playerOwned.indexOf('player_turntable') < 0 || Object.keys(m.playerPlaced).length !== 0) throw new Error('player not back in owned: ' + JSON.stringify(m));
  });

  await step('12 place the player again (postaw)', async () => {
    const ok = await page.evaluate(() => window.__csMock.place('salon', 'player_turntable'));
    if (!ok) throw new Error('place refused');
    await until(async () => { const x = await mini(); return x && x.count === '1/2' ? x : null; }, 'queue back');
  });

  await step('13 old save without music fields: no exception, shop and shelf still work', async () => {
    const save = await page.evaluate(() => {
      const s = window.bridge.getState();
      delete s.music;
      delete s.musicVersion;
      return s;
    });
    await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, save]);
    await load({ withMock: false }); // no C# load rule here: the page alone must cope with a save without the fields
    const mm = await mini();
    if (!mm) throw new Error('no mini player');
    await page.evaluate(() => window.CuyHome.openFeature('shop'));
    await page.click('.feature-shop-tab[data-tab="toy"]');
    await page.waitForSelector('[data-buy="record:s1_poranek"]', { timeout: 3000 });
    await page.evaluate(() => window.CuyHome.closeFeature && window.CuyHome.closeFeature());
    const s = await shelfShot('shelf_13_old_save.png', null);
    if (s.total !== manifest.records.length) throw new Error('shelf total ' + s.total);
  });

  await step('14 old save gets the starter player once (C# load rule)', async () => {
    await page.evaluate(csMockInstall, mockArg(false));
    const m = await music();
    if (m.musicVersion !== 1 || m.playerOwned.indexOf('player_turntable') < 0) throw new Error('starter not granted: ' + JSON.stringify(m));
  });

  const finalMini = await mini();
  if (finalMini) await page.locator('.mp_panel').screenshot({ path: path.join(OUT, 'mini_final_420.png') }).catch(() => {});
  await context.close();
  await browser.close();
  server.close();

  const failed = results.filter((r) => r.tag === 'FAIL');
  console.log(failed.length ? '\nMUSIC SMOKE RED: ' + failed.length + ' failed step(s)' : '\nMUSIC SMOKE GREEN: ' + results.length + ' steps');
  console.log('Screenshots: ' + OUT);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
