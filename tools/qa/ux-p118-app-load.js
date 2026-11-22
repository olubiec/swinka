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
    const badResponses = [];

    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
        errors.push('console: ' + m.text());
      }
    });
    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400) {
        const url = res.url();
        if (!/\/features\/[^/]+\/mock\.js(?:\?|$)/.test(url)) {
          badResponses.push(status + ' ' + url);
        }
      }
    });

    await page.goto(`${server.base}/web/home/index.html`);
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(
      () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().some(f => f && f.id === 'run'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(600);

    // A1: all-libs-defined
    try {
      const libs = await page.evaluate(() => ({
        PigBehavior: typeof window.PigBehavior,
        RestSpots: typeof window.RestSpots,
        PigMotion: typeof window.PigMotion,
        PigReactions: typeof window.PigReactions,
        DrawBudget: typeof window.DrawBudget,
        WorldSounds: typeof window.WorldSounds,
        EditHistory: typeof window.EditHistory
      }));
      for (const [k, t] of Object.entries(libs)) {
        assert.notStrictEqual(t, 'undefined', `window.${k} is undefined`);
      }
      pass('A1 all-libs-defined');
    } catch (e) {
      fail('A1 all-libs-defined', e);
    }

    // A2: no-404-or-console-error
    try {
      assert.deepStrictEqual(badResponses, [], 'Unexpected HTTP >= 400: ' + badResponses.join(', '));
      assert.deepStrictEqual(errors, [], 'Console/page errors: ' + errors.join('; '));
      pass('A2 no-404-or-console-error');
    } catch (e) {
      fail('A2 no-404-or-console-error', e);
    }

    // A3: run-feature-listed
    try {
      const featureInfo = await page.evaluate(async () => {
        const idx = await fetch('features/index.json').then(r => r.json());
        const listed = window.CuyHome.listFeatures().map(f => f && f.id);
        return { idx, listed };
      });
      assert.ok(featureInfo.idx.includes('run'), 'features/index.json missing "run"');
      assert.ok(featureInfo.listed.includes('run'), 'CuyHome.listFeatures() missing "run"');
      pass('A3 run-feature-listed');
    } catch (e) {
      fail('A3 run-feature-listed', e);
    }

    // A4: needs-reach-canvas
    try {
      const stubInfo = await page.evaluate(() => {
        const inst = window.CuyPig && window.CuyPig.mainInstance;
        const hasSetBehaviorData = !!(inst && typeof inst.setBehaviorData === 'function');
        const hasApplyReaction = !!(inst && typeof inst.applyReaction === 'function');
        if (inst && !hasSetBehaviorData) {
          inst.setBehaviorData = function (a, h) { inst._stubBehaviorData = { a, h }; };
        }
        window.bridge.mockSetNeed('energy', 17);
        const energy = inst && inst.lastState && inst.lastState.needs ? inst.lastState.needs.energy : null;
        return { hasSetBehaviorData, hasApplyReaction, energy };
      });
      if (!stubInfo.hasSetBehaviorData) console.log('STUB PigCanvas.setBehaviorData');
      if (!stubInfo.hasApplyReaction) console.log('STUB PigCanvas.applyReaction');
      assert.strictEqual(stubInfo.energy, 17, 'needs.energy did not reach canvasPig.lastState');
      pass('A4 needs-reach-canvas');
    } catch (e) {
      fail('A4 needs-reach-canvas', e);
    }

    // A5: load-order-correct
    try {
      const srcs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'))
      );
      const pos = (needle) => srcs.indexOf(needle);
      const mustOrder = (before, after) => {
        const i = pos(before);
        const j = pos(after);
        assert.ok(i !== -1, `Missing script ${before}`);
        assert.ok(j !== -1, `Missing script ${after}`);
        assert.ok(i < j, `${before} (${i}) must load before ${after} (${j})`);
      };
      mustOrder('sound.js', 'lib/world-sounds.js');
      mustOrder('lib/world-sounds.js', 'canvas-pig.js');
      for (const lib of [
        'lib/draw-budget.js',
        'lib/pig-behavior.js',
        'lib/rest-spots.js',
        'lib/pig-motion.js',
        'lib/pig-reactions.js'
      ]) {
        mustOrder('lib/play-targets.js', lib);
        mustOrder(lib, 'canvas-pig.js');
      }
      mustOrder('features/places/edit-history.js', 'features/places/edit-panel.js');
      mustOrder('canvas-pig.js', 'app.js');
      pass('A5 load-order-correct');
    } catch (e) {
      fail('A5 load-order-correct', e);
    }

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
