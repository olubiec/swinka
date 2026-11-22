'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { startServer } = require('./lib/ux');

const HayHopLogic = require(path.resolve(__dirname, '../../web/home/minigames/hayhop/hayhop-logic.js'));

const results = [];
function record(status, id, detail) {
  results.push({ status, id, detail: detail || '' });
  console.log(detail ? `${status} ${id}: ${detail}` : `${status} ${id}`);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

function runLogicChecks() {
  // 1. HOP-hold-left-forever
  try {
    const game = HayHopLogic.createGame({ width: 360, height: 290, rng: 42 });
    let bad = null;
    for (let i = 0; i < 200; i++) {
      const st = game.step(16, { dir: -1 });
      if (!Number.isFinite(st.pig.x) || !Number.isFinite(st.pig.y)) {
        bad = `NaN/non-finite position at step ${i}: (${st.pig.x}, ${st.pig.y})`;
        break;
      }
      if (st.pig.x < 12 || st.pig.x > st.width - 12) {
        bad = `x out of bounds at step ${i}: ${st.pig.x} (width=${st.width})`;
        break;
      }
    }
    if (bad) record('DEFECT', 'HOP-hold-left-forever', bad);
    else record('PASS', 'HOP-hold-left-forever');
  } catch (err) {
    record('DEFECT', 'HOP-hold-left-forever', err.message);
  }

  // 5. HOP-score-monotonic
  try {
    const game = HayHopLogic.createGame({ width: 360, height: 290, rng: 7 });
    let prev = game.score();
    let bad = null;
    for (let i = 0; i < 300; i++) {
      const st = game.step(16, { dir: Math.sin(i * 0.15) });
      const cur = game.score();
      if (!Number.isFinite(cur) || cur < prev) {
        bad = `score decreased or invalid at step ${i}: prev=${prev}, cur=${cur}, gameOver=${st.gameOver}`;
        break;
      }
      prev = cur;
    }
    if (bad) record('DEFECT', 'HOP-score-monotonic', bad);
    else record('PASS', 'HOP-score-monotonic');
  } catch (err) {
    record('DEFECT', 'HOP-score-monotonic', err.message);
  }
}

async function runBrowserChecks() {
  const server = await startServer();
  let browser;
  const consoleErrors = [];

  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 420, height: 640 } });

    page.on('pageerror', (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) {
        consoleErrors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto(`${server.base}/web/home/minigames/hayhop/index.html`);
    await page.waitForFunction(() => Boolean(window.__hayHopDebug && window.MiniGames), { timeout: 10000 });
    await page.waitForSelector('canvas', { timeout: 10000 });

    // 2. HOP-spam-restart-50
    try {
      for (let i = 0; i < 50; i++) {
        const g = HayHopLogic.createGame({ width: 360, height: 290, rng: i + 1 });
        if (g.score() !== 0) {
          throw new Error(`createGame #${i} score was ${g.score()}, expected 0`);
        }
      }
      const afterRestart = await page.evaluate(() => {
        const container = document.getElementById('modalBody');
        for (let i = 0; i < 50; i++) {
          window.MiniGames.start('hay_hop', { container });
        }
        return {
          hasDebug: Boolean(window.__hayHopDebug),
          score: window.__hayHopDebug ? window.__hayHopDebug.score() : -1
        };
      });
      await page.waitForFunction(() => Boolean(window.__hayHopDebug), { timeout: 10000 });
      await page.waitForSelector('canvas', { timeout: 10000 });
      if (!afterRestart.hasDebug || afterRestart.score !== 0) {
        record('DEFECT', 'HOP-spam-restart-50', `unexpected state after 50 restarts: ${JSON.stringify(afterRestart)}`);
      } else {
        record('PASS', 'HOP-spam-restart-50');
      }
    } catch (err) {
      record('DEFECT', 'HOP-spam-restart-50', err.message);
    }

    // 3. HOP-resize-window
    try {
      const sizes = [
        { width: 420, height: 640 },
        { width: 320, height: 480 },
        { width: 600, height: 800 }
      ];
      let resizeBad = null;
      for (const sz of sizes) {
        await page.setViewportSize(sz);
        await page.waitForTimeout(100);
        const canvas = page.locator('canvas').first();
        const visible = await canvas.isVisible();
        const box = await canvas.boundingBox();
        if (!visible || !box || box.width <= 0 || box.height <= 0) {
          resizeBad = `canvas invalid at ${sz.width}x${sz.height}: visible=${visible}, box=${JSON.stringify(box)}`;
          break;
        }
      }
      await page.setViewportSize({ width: 420, height: 640 });
      if (resizeBad) record('DEFECT', 'HOP-resize-window', resizeBad);
      else record('PASS', 'HOP-resize-window');
    } catch (err) {
      record('DEFECT', 'HOP-resize-window', err.message);
    }

    // 4. HOP-pause-on-blur
    try {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.waitForTimeout(50);
      const st1 = await page.evaluate(() => window.__hayHopDebug.state());
      await page.waitForTimeout(250);
      const st2 = await page.evaluate(() => window.__hayHopDebug.state());
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForTimeout(50);
      const st3 = await page.evaluate(() => window.__hayHopDebug.state());

      if (!st1.paused || !st2.paused) {
        record('DEFECT', 'HOP-pause-on-blur', `game did not pause on blur: st1.paused=${st1.paused}, st2.paused=${st2.paused}`);
      } else if (st2.elapsedMs !== st1.elapsedMs || st2.maxHeightPx !== st1.maxHeightPx) {
        record('DEFECT', 'HOP-pause-on-blur', `state advanced while paused: elapsed ${st1.elapsedMs}->${st2.elapsedMs}`);
      } else if (st3.paused) {
        record('DEFECT', 'HOP-pause-on-blur', 'game did not unpause on focus');
      } else {
        record('PASS', 'HOP-pause-on-blur');
      }
    } catch (err) {
      record('DEFECT', 'HOP-pause-on-blur', err.message);
    }

    // 6. HOP-result-sent-once
    try {
      await page.evaluate(() => {
        window.__sentHopResults = [];
        if (window.bridge && typeof window.bridge.send === 'function') {
          const origSend = window.bridge.send.bind(window.bridge);
          window.bridge.send = function (msg) {
            if (msg && msg.type === 'minigame_result') {
              window.__sentHopResults.push(msg);
            }
            return origSend(msg);
          };
        }
        window.__hayHopDebug.forceFallForTest();
      });
      await page.waitForTimeout(350);
      const sent = await page.evaluate(() => window.__sentHopResults || []);
      if (sent.length !== 1) {
        record('DEFECT', 'HOP-result-sent-once', `expected 1 minigame_result, got ${sent.length}`);
      } else if (sent[0].gameId !== 'hay_hop') {
        record('DEFECT', 'HOP-result-sent-once', `unexpected gameId: ${sent[0].gameId}`);
      } else {
        record('PASS', 'HOP-result-sent-once');
      }
    } catch (err) {
      record('DEFECT', 'HOP-result-sent-once', err.message);
    }

    // 7. HOP-console-clean
    if (consoleErrors.length > 0) {
      record('DEFECT', 'HOP-console-clean', `${consoleErrors.length} error(s): ${consoleErrors[0]}`);
    } else {
      record('PASS', 'HOP-console-clean');
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

(async () => {
  runLogicChecks();
  await runBrowserChecks();
  const defects = results.filter((r) => r.status === 'DEFECT');
  if (defects.length > 0 && process.env.STRICT === '1') {
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
