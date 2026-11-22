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
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
        errors.push('console: ' + m.text());
      }
    });

    await page.goto(`${server.base}/web/home/index.html`);
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length >= 10 && window.CuyScenesMock && window.CanvasPig,
      null,
      { timeout: 10000 }
    );

    // STUB PK-APP4: inject F4-2 lib scripts that PK-APP4 will wire into index.html
    console.log('STUB PK-APP4: injecting lib/companion.js, lib/dance-sync.js, lib/stage-looks.js');
    await page.addScriptTag({ url: `${server.base}/web/home/lib/companion.js` });
    await page.addScriptTag({ url: `${server.base}/web/home/lib/dance-sync.js` });
    await page.addScriptTag({ url: `${server.base}/web/home/lib/stage-looks.js` });

    await page.waitForTimeout(400);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(200);
    }

    // Apply 'seven' mock state
    await page.evaluate(() => {
      const seven = window.CuyScenesMock.state('seven');
      const st = window.bridge.currentState || {};
      st.places = seven.places;
      st.rooms = seven.rooms || st.rooms || {};
      window.bridge.currentState = st;
      window.bridge.broadcastState();
    });

    // O1: companion-drawn-in-garden-not-in-room
    try {
      const res = await page.evaluate(() => {
        window.CanvasPig.setCompanion({ enabled: true, id: 'garden_friend' });
        if (window.CuyScenes && typeof window.CuyScenes.def === 'function') {
          window.CanvasPig.setScene(window.CuyScenes.def('salon'));
        }
        window.CanvasPig.fastForward(100);
        const inRoom = window.CanvasPig.debug();

        if (window.CuyScenes && typeof window.CuyScenes.def === 'function') {
          window.CanvasPig.setScene(window.CuyScenes.def('garden'));
        }
        window.CanvasPig.fastForward(200);
        const inGarden = window.CanvasPig.debug();

        window.CanvasPig.setCompanion({ enabled: false, id: 'garden_friend' });
        const afterOff = window.CanvasPig.debug();

        return {
          inRoomCount: (inRoom && inRoom.companion) ? inRoom.companion.length : -1,
          inGardenCount: (inGarden && inGarden.companion) ? inGarden.companion.length : -1,
          inGardenEntry: (inGarden && inGarden.companion && inGarden.companion[0]) || null,
          afterOffCount: (afterOff && afterOff.companion) ? afterOff.companion.length : -1
        };
      });
      assert.strictEqual(res.inRoomCount, 0, 'Companion must not appear in room/salon');
      assert.strictEqual(res.inGardenCount, 1, 'Companion must appear in garden');
      assert.strictEqual(res.inGardenEntry.id, 'garden_friend', 'Companion id should be garden_friend');
      assert.strictEqual(res.afterOffCount, 0, 'Disabling companion must remove it immediately');
      pass('O1 companion-drawn-in-garden-not-in-room');
    } catch (e) {
      fail('O1 companion-drawn-in-garden-not-in-room', e);
    }

    // O2: dance-on-beat-when-music & O3: dance-stops-without-music
    try {
      // STUB CuyMusic audible state for headless test
      console.log('STUB CuyMusic: mocking isPlaying/isEnabled/getVolume/getCurrentAudio for dance sync');
      const res = await page.evaluate(() => {
        const bpmData = {
          version: 1,
          defaultBpm: 120,
          framesPerBeat: 4,
          maxDanceMs: 30000,
          tracks: {
            calm: { file: 'music/calm_loop.ogg', bpm: 96, offsetMs: 0 }
          }
        };
        window.CanvasPig.setMusicBpmData(bpmData);
        const clock = window.DanceSync.beatClock({ bpm: 96, startMs: 0 });
        window.CanvasPig.setBeat(clock);

        let playing = true;
        window.CuyMusic = Object.assign(window.CuyMusic || {}, {
          isPlaying: () => playing,
          isEnabled: () => true,
          getVolume: () => 0.8,
          getCurrentAudio: () => ({ src: 'music/calm_loop.ogg' })
        });
        window.CanvasPig.setNeeds({ mood: 95, energy: 80, fullness: 80, vitamin_c: 80, cleanliness: 80, teeth: 80 });
        window.CanvasPig.fastForward(100);
        const whilePlaying = window.CanvasPig.debug();

        playing = false;
        window.CanvasPig.fastForward(100);
        const afterStop = window.CanvasPig.debug();

        return {
          animPlaying: whilePlaying && whilePlaying.pig && whilePlaying.pig.anim,
          animStopped: afterStop && afterStop.pig && afterStop.pig.anim
        };
      });
      assert.strictEqual(res.animPlaying, 'dance', 'Pig should dance when music is playing and mood/energy are high');
      pass('O2 dance-on-beat-when-music');
      assert.notStrictEqual(res.animStopped, 'dance', 'Pig should stop dancing when music stops');
      pass('O3 dance-stops-without-music');
    } catch (e) {
      fail('O2/O3 dance-sync', e);
    }

    // O4: weather-kind-applies-visual
    try {
      const res = await page.evaluate(() => {
        const gardenTab = document.querySelector('.places-bar [data-place="garden"]');
        if (gardenTab) gardenTab.click();
        window.CanvasPig.setWeatherKind('rain');
        window.CanvasPig.fastForward(50);
        const dbgRain = window.CanvasPig.debug();
        window.CanvasPig.setWeatherKind('clear');
        window.CanvasPig.fastForward(50);
        const dbgClear = window.CanvasPig.debug();
        return {
          rainKind: dbgRain && dbgRain.weatherKind,
          clearKind: dbgClear && dbgClear.weatherKind
        };
      });
      assert.strictEqual(res.rainKind, 'rain', 'weatherKind should be set to rain');
      assert.strictEqual(res.clearKind, 'clear', 'weatherKind should reset to clear');
      pass('O4 weather-kind-applies-visual');
    } catch (e) {
      fail('O4 weather-kind-applies-visual', e);
    }

    // O5: stage-badge-shown-in-house
    try {
      await page.evaluate(() => {
        if (window.CuyScenes && typeof window.CuyScenes.def === 'function') {
          window.CanvasPig.setScene(window.CuyScenes.def('salon'));
        }
        const st = window.bridge.currentState || {};
        st.stageKey = 'legend';
        st.stageName = 'Legend';
        st.pigDays = 2500;
        st.age = Object.assign({}, st.age || {}, { pigDays: 2500 });
        st.roster = [];
        window.bridge.currentState = st;
        window.bridge.broadcastState();
        if (window.PigCanvas && window.PigCanvas.instance && typeof window.PigCanvas.instance.updateState === 'function') {
          window.PigCanvas.instance.updateState(Object.assign({}, window.bridge.currentState, { stageKey: 'legend', roster: [] }));
        }
        window.CanvasPig.fastForward(50);
      });
      await page.waitForTimeout(100);
      const res = await page.evaluate(() => {
        const dbg = window.CanvasPig.debug();
        const badgeEl = document.getElementById('stageBadge');
        return {
          badgeVisible: !!(badgeEl && badgeEl.textContent && badgeEl.textContent.trim().length > 0),
          housePlate: dbg && dbg.housePlate,
          spriteKey: document.getElementById('pigCanvas') && document.getElementById('pigCanvas').dataset.spriteKey
        };
      });
      assert.ok(res.badgeVisible, '#stageBadge must be visible with text');
      assert.ok(res.housePlate && res.housePlate.visible, 'StageLooks.housePlate must be visible in room/salon');
      assert.strictEqual(res.housePlate.stage, 'legend', 'housePlate stage should reflect legend');
      assert.ok(res.spriteKey && res.spriteKey.includes('legend'), 'spriteKey should reflect legend stage');
      pass('O5 stage-badge-shown-in-house');
    } catch (e) {
      fail('O5 stage-badge-shown-in-house', e);
    }

    // O6: pig-behavior-intact
    try {
      const res = await page.evaluate(() => {
        window.CanvasPig.setNeeds({ mood: 80, energy: 10, fullness: 80, vitamin_c: 80, cleanliness: 80, teeth: 80 });
        window.CanvasPig.fastForward(500);
        const dbgSleep = window.CanvasPig.debug();
        const feedBtn = document.querySelector('[data-action="feed"], #btnFeed, .action-btn[data-item="hay"]');
        if (feedBtn) feedBtn.click();
        window.CanvasPig.fastForward(100);
        return {
          behaviorPresent: !!(dbgSleep && dbgSleep.behavior),
          pigX: dbgSleep && dbgSleep.pig && dbgSleep.pig.x,
          pigY: dbgSleep && dbgSleep.pig && dbgSleep.pig.y
        };
      });
      assert.ok(res.behaviorPresent, 'PigBehavior must remain active');
      assert.ok(Number.isFinite(res.pigX) && Number.isFinite(res.pigY), 'Pig position must remain finite');
      pass('O6 pig-behavior-intact');
    } catch (e) {
      fail('O6 pig-behavior-intact', e);
    }

    // O7: no-console-errors
    try {
      assert.strictEqual(errors.length, 0, 'Console/page errors: ' + errors.join('; '));
      pass('O7 no-console-errors');
    } catch (e) {
      fail('O7 no-console-errors', e);
    }
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(failed > 0 ? 1 : 0);
})();
