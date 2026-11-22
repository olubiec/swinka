'use strict';
const assert = require('assert');
const { chromium } = require('playwright');
const { startServer } = require('./lib/ux');

(async () => {
  const server = await startServer();
  let browser = null;
  let failed = 0;

  function pass(name) {
    console.log('PASS', name);
  }
  function fail(name, err) {
    failed += 1;
    console.error('FAIL', name + ':', err && err.message ? err.message : err);
  }

  try {
    try {
      browser = await chromium.launch();
    } catch (_) {
      browser = await chromium.launch({ channel: 'msedge' });
    }

    const page = await browser.newPage({ viewport: { width: 420, height: 640 } });
    const errors = [];
    const requests = [];

    page.on('request', (req) => {
      requests.push(req.url());
    });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
        errors.push('console: ' + m.text());
      }
    });

    await page.goto(`${server.base}/web/home/index.html`);
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().some((f) => f && f.id === 'weather'),
      null,
      { timeout: 10000 }
    );
    await page.waitForTimeout(800);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(200);
    }

    // A1: all-libs-defined
    try {
      const libs = await page.evaluate(() => ({
        companion: Boolean(window.Companion && typeof window.Companion.create === 'function'),
        danceSync: Boolean(window.DanceSync && typeof window.DanceSync.beatClock === 'function' && typeof window.DanceSync.createBrowserSync === 'function'),
        weatherLive: Boolean(window.CuyWeatherLive && typeof window.CuyWeatherLive.mapState === 'function'),
        stageLooks: Boolean(window.StageLooks && typeof window.StageLooks.lookFor === 'function' && typeof window.StageLooks.badge === 'function' && typeof window.StageLooks.housePlate === 'function')
      }));
      assert.strictEqual(libs.companion, true, 'Companion lib missing');
      assert.strictEqual(libs.danceSync, true, 'DanceSync lib missing');
      assert.strictEqual(libs.weatherLive, true, 'CuyWeatherLive lib missing');
      assert.strictEqual(libs.stageLooks, true, 'StageLooks lib missing');
      pass('A1 all-libs-defined');
    } catch (e) {
      fail('A1 all-libs-defined', e);
    }

    // A2: weather-feature-listed
    try {
      const hasWeather = await page.evaluate(() => {
        const list = window.CuyHome.listFeatures();
        return list.some((f) => f && f.id === 'weather');
      });
      assert.strictEqual(hasWeather, true, 'weather feature not listed');
      await page.evaluate(() => window.CuyHome.openFeature('weather'));
      await page.waitForSelector('#modalBackdrop.active', { timeout: 5000 });
      const modalText = await page.textContent('#modalBody');
      assert.ok(modalText && modalText.trim().length > 0, 'weather modal body empty');
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(200);
      pass('A2 weather-feature-listed');
    } catch (e) {
      fail('A2 weather-feature-listed', e);
    }

    // A3: hayhop-in-games-list-and-opens
    try {
      await page.waitForFunction(
        () => window.Minigry && typeof window.Minigry.getAllGames === 'function' && window.Minigry.getAllGames().some((g) => g.id === 'hay_hop'),
        null,
        { timeout: 10000 }
      );
      await page.click('#btnMinigames');
      await page.waitForSelector('#modalBackdrop.active', { timeout: 5000 });
      const card = page.locator('#modalBody [data-game-id="hay_hop"], #modalBody button:has-text("Hay Hop"), #modalBody :text("Hay Hop")').first();
      await card.waitFor({ state: 'visible', timeout: 5000 });
      await card.click();
      await page.waitForSelector('#minigamesCanvasWrapper, #modalBody canvas', { timeout: 5000 });
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(200);
      pass('A3 hayhop-in-games-list-and-opens');
    } catch (e) {
      fail('A3 hayhop-in-games-list-and-opens', e);
    }

    // A4: music-play-starts-beat-clock
    try {
      const beatRes = await page.evaluate(async () => {
        let stubBeatCalled = false;
        const hasCanvasSetBeat = !!(window.CanvasPig && typeof window.CanvasPig.setBeat === 'function');
        const beatCalls = [];
        if (window.CanvasPig) {
          const origSetBeat = window.CanvasPig.setBeat;
          window.CanvasPig.setBeat = function (clock) {
            beatCalls.push(clock ? clock.bpm() : null);
            if (typeof origSetBeat === 'function') return origSetBeat.call(this, clock);
            stubBeatCalled = true;
          };
        }
        await window.CuyMusic.play('meadow_waltz');
        const activeClock = (window.CuyHome && typeof window.CuyHome.getBeatClock === 'function')
          ? window.CuyHome.getBeatClock()
          : null;
        const activeBpm = activeClock && typeof activeClock.bpm === 'function' ? activeClock.bpm() : null;
        window.CuyMusic.stop(0);
        const afterStopClock = (window.CuyHome && typeof window.CuyHome.getBeatClock === 'function')
          ? window.CuyHome.getBeatClock()
          : null;
        return { hasCanvasSetBeat, stubBeatCalled, beatCalls, activeBpm, afterStopClock };
      });
      if (!beatRes.hasCanvasSetBeat) console.log('STUB CanvasPig.setBeat');
      assert.ok(beatRes.activeBpm && beatRes.activeBpm > 0, 'beat clock did not start with valid BPM');
      assert.strictEqual(beatRes.afterStopClock, null, 'beat clock did not clear on stop');
      pass('A4 music-play-starts-beat-clock');
    } catch (e) {
      fail('A4 music-play-starts-beat-clock', e);
    }

    // A5: no-network-request-on-load
    try {
      const external = requests.filter((url) => {
        return !url.startsWith(server.base) && !url.startsWith('data:') && !url.startsWith('blob:');
      });
      assert.deepStrictEqual(external, [], 'External network requests detected: ' + external.join(', '));
      pass('A5 no-network-request-on-load');
    } catch (e) {
      fail('A5 no-network-request-on-load', e);
    }

    // A6: no-console-errors
    try {
      assert.deepStrictEqual(errors, [], 'Console/page errors: ' + errors.join('; '));
      pass('A6 no-console-errors');
    } catch (e) {
      fail('A6 no-console-errors', e);
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  process.exit(failed > 0 ? 1 : 0);
})();
