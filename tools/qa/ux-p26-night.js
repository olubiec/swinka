'use strict';
const path = require('path');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function launchBrowser() {
  if (process.env.CHROMIUM_PATH) {
    return chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  }
  try {
    return await chromium.launch();
  } catch (e) {
    return chromium.launch({ channel: 'msedge', headless: true });
  }
}

async function run() {
  const server = await ux.startServer();
  const browser = await launchBrowser();
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  page.setDefaultTimeout(10000);

  let hasFailures = false;
  const testScenario = async (name, fn) => {
    try {
      await fn();
      console.log(`PASS: ${name}`);
    } catch (err) {
      hasFailures = true;
      console.error(`FAIL: ${name}:`, err && err.stack ? err.stack : err);
    }
  };

  await page.evaluate(async () => {
    window.CanvasPig.setScene({ id: 'salon', kind: 'room', size: [192, 112], wallH: 32, walk: [8, 40, 184, 110] });
    window.CanvasPig.setPigVisible(true);
    const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
    const lampImg = inst.loadCachedImage('../../assets/world/house/lamp_mushroom.png');
    await new Promise(resolve => {
      if (lampImg.complete && lampImg.naturalWidth > 0) return resolve();
      lampImg.onload = resolve;
      lampImg.onerror = resolve;
      setTimeout(resolve, 1500);
    });
  });

  await testScenario('N1-N4: lamp night effect stays constant across pig positions, day unchanged, no NaN', async () => {
    const res = await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const sampleRect = (x, y, w, h) => {
        const d = inst.ctx.getImageData(x, y, w, h).data;
        let r = 0, g = 0, b = 0, n = w * h;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i]; g += d[i + 1]; b += d[i + 2];
        }
        r /= n; g /= n; b /= n;
        return { r, g, b, luma: (r + g + b) / 3 };
      };

      const lamp = {
        id: 'lamp_mushroom_test',
        itemId: 'lamp_mushroom',
        url: '../../assets/world/house/lamp_mushroom.png',
        x: 80,
        y: 95,
        w: 16,
        h: 32,
        anchorX: 8,
        anchorY: 32,
        _stageOffsetApplied: true
      };
      inst.setThings([lamp], true);

      window.__cuyNow = 23;
      inst.setLightScene({ ambient: { color: [0.55, 0.62, 0.95], level: 0.62 }, sources: [] });

      const positions = [75, 85, 90, 95, 105, 115];
      const nightSamples = positions.map(py => {
        inst.pigX = 160;
        inst.pigY = py;
        inst.render();
        return { py, sample: sampleRect(76, 68, 8, 16) };
      });

      const dbg = inst.debug();
      window.__cuyNow = 12;
      inst.setLightScene(null);
      inst.pigX = 160;
      inst.pigY = 115;
      inst.render();
      const dayBelow = sampleRect(76, 68, 8, 16);
      inst.pigY = 75;
      inst.render();
      const dayAbove = sampleRect(76, 68, 8, 16);

      return { nightSamples, dayBelow, dayAbove, dbg };
    });

    const lumas = res.nightSamples.map(s => s.sample.luma);
    const maxLumaDiff = Math.max(...lumas) - Math.min(...lumas);
    assert.ok(maxLumaDiff <= 2.0, `N1/N2 max night luma diff ${maxLumaDiff} <= 2.0`);
    for (const ch of ['r', 'g', 'b']) {
      const vals = res.nightSamples.map(s => s.sample[ch]);
      const diff = Math.max(...vals) - Math.min(...vals);
      assert.ok(diff <= 2.0, `N1/N2 max night ${ch} diff ${diff} <= 2.0`);
    }
    assert.ok(res.nightSamples[0].sample.luma < res.dayBelow.luma - 20, 'N3 night darker than day by > 20 luma');
    assert.ok(Math.abs(res.dayBelow.luma - res.dayAbove.luma) <= 1.0, 'N3 day lamp identical');
    assert.ok(Number.isFinite(res.dbg.pig.scale) && Number.isFinite(res.dbg.pig.frameWidth), 'N4 no NaN in pig debug');
  });

  await testScenario('S1-S4: procedural contact shadow on floor furniture, none on flat/wall, width scales with w', async () => {
    const res = await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const sampleLuma = (x, y, w, h) => {
        const d = inst.ctx.getImageData(x, y, w, h).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
        return sum / (w * h);
      };

      const makeCanvasImg = (w, h, color) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = color;
        g.fillRect(0, 0, w, h);
        return c;
      };

      inst.setLightScene(null);
      inst.setPigVisible(false);

      // S1: floor standing item
      inst.setThings([{ id: 's1', x: 120, y: 95, w: 32, h: 16, layer: 'floor', img: makeCanvasImg(32, 16, '#886644'), anchorX: 16, anchorY: 16, _stageOffsetApplied: true }], true);
      inst.render();
      const underFloor = sampleLuma(116, 95, 8, 3);
      const besideFloor = sampleLuma(150, 95, 8, 3);

      // S2: flat item & wall item
      inst.setThings([{ id: 's2_flat', x: 120, y: 95, w: 32, h: 16, flat: true, img: makeCanvasImg(32, 16, '#886644'), anchorX: 16, anchorY: 16, _stageOffsetApplied: true }], true);
      inst.render();
      const underFlat = sampleLuma(116, 95, 8, 3);

      inst.setThings([{ id: 's2_wall', x: 120, y: 36, w: 32, h: 16, layer: 'wall', img: makeCanvasImg(32, 16, '#886644'), anchorX: 16, anchorY: 16, _stageOffsetApplied: true }], true);
      inst.render();
      const underWall = sampleLuma(116, 36, 8, 3);
      inst.setThings([], true);
      inst.render();
      const emptyWall = sampleLuma(116, 36, 8, 3);
      const emptyFloor = sampleLuma(116, 95, 8, 3);

      // S3: width w=16 vs w=48
      inst.setThings([{ id: 's3_small', x: 120, y: 95, w: 16, h: 16, layer: 'floor', img: makeCanvasImg(16, 16, '#886644'), anchorX: 8, anchorY: 16, _stageOffsetApplied: true }], true);
      inst.render();
      const leftSmall = sampleLuma(106, 95, 4, 2);

      inst.setThings([{ id: 's3_large', x: 120, y: 95, w: 48, h: 16, layer: 'floor', img: makeCanvasImg(48, 16, '#886644'), anchorX: 24, anchorY: 16, _stageOffsetApplied: true }], true);
      inst.render();
      const leftLarge = sampleLuma(106, 95, 4, 2);

      // S4: NaN guard
      inst.setThings([{ id: 's4_nan', x: 120, y: 95, w: 0, h: 0, layer: 'floor', _stageOffsetApplied: true }], true);
      inst.render();

      return { underFloor, besideFloor, underFlat, emptyFloor, underWall, emptyWall, leftSmall, leftLarge };
    });

    assert.ok(res.besideFloor - res.underFloor >= 8, `S1 shadow darker by >=8 luma (got ${res.besideFloor - res.underFloor})`);
    assert.ok(Math.abs(res.emptyFloor - res.underFlat) <= 1.0, `S2 flat has no shadow (diff ${Math.abs(res.emptyFloor - res.underFlat)})`);
    assert.ok(Math.abs(res.emptyWall - res.underWall) <= 1.0, `S2 wall has no shadow (diff ${Math.abs(res.emptyWall - res.underWall)})`);
    assert.ok(res.leftSmall - res.leftLarge >= 5, `S3 wider item casts wider shadow (${res.leftSmall} vs ${res.leftLarge})`);
    assert.deepStrictEqual(page.__errors, [], 'S4 no errors');
  });

  await browser.close();
  server.close();
  process.exit(hasFailures ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
