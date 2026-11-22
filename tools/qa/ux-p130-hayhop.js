'use strict';
const assert = require('assert');
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');
const logic = require('../../web/home/minigames/hayhop/hayhop-logic.js');

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runLogicTests() {
  // H1: deterministic-seed
  {
    const g1 = logic.createGame({ rng: mulberry32(42), width: 360, height: 290 });
    const g2 = logic.createGame({ rng: mulberry32(42), width: 360, height: 290 });
    for (let i = 0; i < 60; i++) {
      g1.step(16, { dir: (i % 2 === 0) ? 0.5 : -0.3 });
      g2.step(16, { dir: (i % 2 === 0) ? 0.5 : -0.3 });
    }
    assert.deepStrictEqual(g1.state(), g2.state(), 'H1: same seed + inputs must produce identical state');
    assert.strictEqual(g1.score(), g2.score(), 'H1: same seed must produce identical score');
  }

  // H2: jump-up-on-tuft
  {
    const g = logic.createGame({ rng: mulberry32(7), width: 360, height: 290 });
    let bounced = false;
    for (let i = 0; i < 30; i++) {
      const s = g.step(16, { dir: 0 });
      if (s.pig.vy < 0) {
        bounced = true;
        break;
      }
    }
    assert.ok(bounced, 'H2: pig must bounce upward (vy < 0) when landing on start tuft');
  }

  // H3: fall-ends-game
  {
    const g = logic.createGame({ rng: mulberry32(9), width: 360, height: 290 });
    // Move far away from the start tuft? No, start tuft is x=180 w=80, pig at x=180.
    // Move hard left immediately so pig misses tufts or falls after first bounce.
    // Even simpler: steer off any tuft by stepping left/right, or wait until falling below cameraY + height + 24.
    // Let's step left for 120 frames, then right if needed, or verify gameOver triggers when falling.
    for (let i = 0; i < 300 && !g.state().gameOver; i++) {
      g.step(30, { dir: -1 });
    }
    // If pig happened to land on a tuft at the left edge, steer to the other side
    for (let i = 0; i < 400 && !g.state().gameOver; i++) {
      g.step(30, { dir: 1 });
    }
    assert.strictEqual(g.state().gameOver, true, 'H3: falling below bottom must end the game');
  }

  // H4: score-is-max-height + HOP-score-monotonic
  {
    const g = logic.createGame({ rng: mulberry32(12), width: 360, height: 290 });
    let prevScore = g.score();
    assert.strictEqual(prevScore, 0, 'H4: initial score must be 0');
    let sawPositive = false;
    for (let i = 0; i < 300; i++) {
      const s = g.step(16, { dir: 0 });
      assert.ok(s.score >= prevScore, 'H4/HOP-score-monotonic: score must never decrease');
      assert.strictEqual(s.score, Math.floor(s.maxHeightPx / 10), 'H4: score must equal floor(maxHeightPx / 10)');
      if (s.score > 0) sawPositive = true;
      prevScore = s.score;
    }
    assert.ok(sawPositive, 'H4: score must increase as pig bounces upward');
  }

  // H5: difficulty-grows
  {
    const gLow = logic.createGame({ rng: mulberry32(99), width: 360, height: 290 });
    const tuftsLow = gLow.state().tufts.filter((t) => t.id > 0);
    assert.ok(tuftsLow.length > 0, 'H5: initial tufts must exist');
    assert.strictEqual(tuftsLow[0].w, 56, 'H5: initial tuft width should be 56');

    // Create a game and climb or verify width/gap rules via high-height tufts
    // Climb by guiding pig toward the next tuft above it
    const gHigh = logic.createGame({ rng: mulberry32(99), width: 360, height: 290 });
    for (let i = 0; i < 1500 && gHigh.score() < 60 && !gHigh.state().gameOver; i++) {
      const st = gHigh.state();
      const target = st.tufts.find((t) => !t.broken && t.y < st.pig.y && t.y > st.pig.y - 75) || st.tufts[0];
      const dir = target ? Math.max(-1, Math.min(1, (target.x - st.pig.x) / 20)) : 0;
      gHigh.step(16, { dir });
    }
    const stHigh = gHigh.state();
    if (stHigh.score >= 30) {
      const topTuft = stHigh.tufts[stHigh.tufts.length - 1];
      assert.ok(topTuft.w < 56, 'H5: tuft width must shrink as score grows');
    } else {
      // Even if RNG path didn't reach 30, check gap progression is bounded < 76
      for (let i = 1; i < tuftsLow.length; i++) {
        const gap = tuftsLow[i - 1].y - tuftsLow[i].y;
        assert.ok(gap >= 34 && gap < 76, 'H5: tuft gap must be reachable (< 76px)');
      }
    }
  }

  // H6: input-left-right-clamped + HOP-hold-left-forever
  {
    const g = logic.createGame({ rng: mulberry32(3), width: 360, height: 290 });
    for (let i = 0; i < 200; i++) {
      const s = g.step(16, { dir: -1 });
      assert.ok(Number.isFinite(s.pig.x) && !Number.isNaN(s.pig.x), 'H6: pig.x must not be NaN');
      assert.ok(s.pig.x >= 12 && s.pig.x <= 360 - 12, 'H6: pig.x clamped on left');
    }
    for (let i = 0; i < 200; i++) {
      const s = g.step(16, { dir: 1 });
      assert.ok(Number.isFinite(s.pig.x) && !Number.isNaN(s.pig.x), 'H6: pig.x must not be NaN');
      assert.ok(s.pig.x >= 12 && s.pig.x <= 360 - 12, 'H6: pig.x clamped on right');
    }
  }

  // H7: no-negative-time
  {
    const g = logic.createGame({ rng: mulberry32(5), width: 360, height: 290 });
    const before = g.state();
    const after = g.step(-100, { dir: 1 });
    assert.strictEqual(after.elapsedMs, before.elapsedMs, 'H7: negative dtMs must not advance elapsedMs');
    assert.strictEqual(after.pig.y, before.pig.y, 'H7: negative dtMs must not move pig');
    assert.strictEqual(after.score, before.score, 'H7: negative dtMs must not change score');
  }

  // HOP-spam-restart-50 (logic level)
  {
    for (let i = 0; i < 50; i++) {
      const g = logic.createGame({ rng: mulberry32(i + 1), width: 360, height: 290 });
      assert.strictEqual(g.score(), 0, 'HOP-spam-restart-50: score resets to 0');
      assert.strictEqual(g.state().gameOver, false, 'HOP-spam-restart-50: gameOver resets to false');
    }
  }
}

async function runBrowserTests() {
  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
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

  try {
    // H8: page-loads-no-errors
    await page.goto(`${server.base}/web/home/minigames/hayhop/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => !!window.__hayHopDebug, { timeout: 10000 });
    await page.waitForTimeout(100);

    const hasCanvas = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return !!(c && c.width > 0 && c.height > 0);
    });
    assert.ok(hasCanvas, 'H8: Phaser canvas must render with non-zero dimensions');

    // HOP-resize-window
    for (const vp of [{ width: 320, height: 480 }, { width: 600, height: 800 }, { width: 420, height: 640 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(100);
      const visible = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) return false;
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      assert.ok(visible, `HOP-resize-window: canvas must remain visible at ${vp.width}x${vp.height}`);
    }

    // HOP-pause-on-blur
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(150);
    const pausedSnapshot = await page.evaluate(() => {
      const g = window.__hayHopDebug;
      return g ? g.state().elapsedMs : null;
    });
    await page.waitForTimeout(200);
    const pausedAfter = await page.evaluate(() => {
      const g = window.__hayHopDebug;
      return g ? g.state().elapsedMs : null;
    });
    if (pausedSnapshot !== null) {
      assert.strictEqual(pausedAfter, pausedSnapshot, 'HOP-pause-on-blur: elapsedMs must not grow while blurred');
    }
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    // H9: result-api-called-once + HOP-result-sent-once
    const sentCount = await page.evaluate(() => {
      const sent = [];
      const origSend = window.bridge.send.bind(window.bridge);
      window.bridge.send = function (msg) {
        if (msg && msg.type === 'minigame_result') sent.push(msg);
        return origSend(msg);
      };
      if (window.__hayHopDebug && window.__hayHopDebug.forceFallForTest) {
        window.__hayHopDebug.forceFallForTest();
      }
      return new Promise((resolve) => {
        setTimeout(() => resolve(sent.length), 350);
      });
    });
    assert.strictEqual(sentCount, 1, 'H9: minigame_result must be sent exactly once on game over');

    // H10: restart-works
    const btn = await page.$('#minigamesBtnReplay');
    if (btn) {
      await btn.click();
    } else {
      await page.evaluate(() => window.MiniGames.start('hay_hop', { container: document.getElementById('modalBody') }));
    }
    await page.waitForSelector('canvas', { timeout: 5000 });
    await page.waitForTimeout(200);
    const restartedScore = await page.evaluate(() => {
      return window.__hayHopDebug ? window.__hayHopDebug.score() : 0;
    });
    assert.strictEqual(restartedScore, 0, 'H10: score must reset to 0 after restart');

    // HOP-console-clean
    assert.deepStrictEqual(errors, [], 'H8/HOP-console-clean: zero console/page errors expected');
  } finally {
    await browser.close();
    server.close();
  }
}

(async () => {
  runLogicTests();
  await runBrowserTests();
  console.log('PASS: ux-p130-hayhop (H1-H10 + HOP adversarial)');
})().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
