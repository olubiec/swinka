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

    const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
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
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 10 && window.CuyPlaces && window.CuyScenesMock && window.CuyScenes && typeof window.CuyScenes.getAtlas === 'function' && !!window.CuyScenes.getAtlas(),
      { timeout: 10000 }
    );
    await page.waitForTimeout(600);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(200);
    }

    // Apply 'seven' mock state
    await page.evaluate(() => {
      const seven = window.CuyScenesMock.state('seven');
      const st = window.bridge.currentState || {};
      st.places = seven.places;
      st.rooms = st.rooms || {};
      if (seven.rooms) st.rooms = seven.rooms;
      window.bridge.currentState = st;
      window.bridge.broadcastState();
    });

    // F1: context-per-scene-kind
    try {
      const res = await page.evaluate(() => {
        const calls = [];
        const hasSetSceneContext = !!(window.CanvasPig && typeof window.CanvasPig.setSceneContext === 'function');
        const origSetCtx = window.CanvasPig && window.CanvasPig.setSceneContext;
        if (window.CanvasPig) {
          window.CanvasPig.setSceneContext = function (ctx) {
            calls.push(ctx);
            if (typeof origSetCtx === 'function') return origSetCtx.call(this, ctx);
          };
        }
        window.CuyPlaces.openPlace('garden');
        const outdoorCtx = window.CuyPlaces.getSceneContext();
        window.CuyPlaces.openPlace('salon');
        const roomCtx = window.CuyPlaces.getSceneContext();
        return { hasSetSceneContext, calls, roomCtx, outdoorCtx };
      });
      if (!res.hasSetSceneContext) console.log('STUB CanvasPig.setSceneContext');
      assert.strictEqual(res.roomCtx.sceneId, 'salon');
      assert.strictEqual(res.roomCtx.sceneKind, 'room');
      assert.strictEqual(res.outdoorCtx.sceneId, 'garden');
      assert.strictEqual(res.outdoorCtx.sceneKind, 'outdoor');
      assert.ok(res.calls.some(c => c && c.sceneId === 'salon' && c.sceneKind === 'room'), 'setSceneContext not called for salon');
      assert.ok(res.calls.some(c => c && c.sceneId === 'garden' && c.sceneKind === 'outdoor'), 'setSceneContext not called for garden');
      pass('F1 context-per-scene-kind');
    } catch (e) {
      fail('F1 context-per-scene-kind', e);
    }

    // F2: things-list-updates-after-place
    try {
      const res = await page.evaluate(() => {
        window.CuyPlaces.openPlace('salon');
        const before = window.CuyPlaces.getSceneContext().things.slice();
        const inst = window.CuyPig && window.CuyPig.mainInstance;
        if (inst) {
          inst.pendingSpot = { spot: { gx: 10, gy: 10 }, decision: { id: 'nap' } };
        }
        const st = window.bridge.currentState;
        if (!st.rooms) st.rooms = {};
        if (!st.rooms.layouts) st.rooms.layouts = {};
        if (!st.rooms.layouts.salon) st.rooms.layouts.salon = { name: 'Salon', cols: 12, rows: 7, items: [] };
        st.rooms.layouts.salon.items = (st.rooms.layouts.salon.items || []).slice();
        st.rooms.layouts.salon.items.push({ uid: 'u_test_sofa', itemId: 'sofa_cosy', x: 2, y: 2, flip: false });
        window.bridge.broadcastState();
        const after = window.CuyPlaces.getSceneContext().things.slice();
        const spotCleared = inst ? inst.pendingSpot === null : true;
        return { beforeCount: before.length, after, spotCleared };
      });
      assert.strictEqual(res.after.length, res.beforeCount + 1, 'things list did not update after place');
      assert.ok(res.after.some(t => t && (t.itemId === 'sofa_cosy' || t.id === 'sofa_cosy')), 'new placed item missing from things');
      assert.strictEqual(res.spotCleared, true, 'pendingSpot was not invalidated on things change');
      pass('F2 things-list-updates-after-place');
    } catch (e) {
      fail('F2 things-list-updates-after-place', e);
    }

    // F3: sound-on-place-and-harvest (WorldSounds.play spy for places events)
    try {
      const played = await page.evaluate(() => {
        const events = [];
        const origPlay = window.WorldSounds.play;
        window.WorldSounds.resetThrottle();
        window.WorldSounds.play = function (ev, opts) {
          events.push(ev);
          return origPlay.call(window.WorldSounds, ev, opts);
        };
        try {
          window.CuyPlaces.openPlace('garden');
          if (typeof window.onEdgeHold === 'function') {
            window.onEdgeHold({ side: 'right', active: true });
          }
        } finally {
          window.WorldSounds.play = origPlay;
        }
        return events;
      });
      assert.ok(played.includes('fountain_ambience'), 'WorldSounds.play("fountain_ambience") not called in garden');
      assert.ok(played.includes('edit_error'), 'WorldSounds.play("edit_error") not called on locked edge hold');
      pass('F3 sound-on-place-and-harvest');
    } catch (e) {
      fail('F3 sound-on-place-and-harvest', e);
    }

    // F4: muted-no-sound
    try {
      const mutedRes = await page.evaluate(() => {
        window.WorldSounds.resetThrottle();
        window.WorldSounds.setSuppressed(true);
        const fountainPlayed = window.WorldSounds.play('fountain_ambience');
        const errorPlayed = window.WorldSounds.play('edit_error');
        window.WorldSounds.setSuppressed(false);
        return { fountainPlayed, errorPlayed };
      });
      assert.strictEqual(mutedRes.fountainPlayed.played, false);
      assert.strictEqual(mutedRes.fountainPlayed.reason, 'suppressed');
      assert.strictEqual(mutedRes.errorPlayed.played, false);
      assert.strictEqual(mutedRes.errorPlayed.reason, 'suppressed');
      pass('F4 muted-no-sound');
    } catch (e) {
      fail('F4 muted-no-sound', e);
    }

    // F5: run-entry-only-in-garden
    try {
      const runRes = await page.evaluate(() => {
        const stateAt = (place) => {
          window.CuyPlaces.openPlace(place);
          const btn = document.getElementById('runEntryBtn');
          return btn ? { exists: true, hidden: !!btn.hidden } : { exists: false, hidden: true };
        };
        return {
          salon: stateAt('salon'),
          garden: stateAt('garden'),
          park: stateAt('park')
        };
      });
      assert.strictEqual(runRes.salon.hidden, true, 'runEntryBtn should be hidden in salon');
      assert.strictEqual(runRes.garden.exists, true, 'runEntryBtn should exist in garden');
      assert.strictEqual(runRes.garden.hidden, false, 'runEntryBtn should be visible in garden');
      assert.strictEqual(runRes.park.hidden, true, 'runEntryBtn should be hidden in park');
      pass('F5 run-entry-only-in-garden');
    } catch (e) {
      fail('F5 run-entry-only-in-garden', e);
    }

    // F6: no-console-errors
    try {
      assert.deepStrictEqual(errors, [], 'Unexpected console/page errors: ' + errors.join('; '));
      pass('F6 no-console-errors');
    } catch (e) {
      fail('F6 no-console-errors', e);
    }

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
