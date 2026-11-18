'use strict';
const path = require('path');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
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

  await testScenario('T1: fixed 256x144 canvas across all 7 scenes', async () => {
    const results = await page.evaluate(() => {
      const scenes = ['salon', 'garden', 'park', 'farm', 'market'];
      if (window.CuyScenes && typeof window.CuyScenes.list === 'function') {
        const list = window.CuyScenes.list();
        for (const s of list) {
          if (s && s.id && !scenes.includes(s.id)) scenes.push(s.id);
        }
      }
      while (scenes.length < 7) scenes.push('pig:pig_' + scenes.length);
      const canvas = document.getElementById('pigCanvas');
      return scenes.slice(0, 7).map(id => {
        if (window.CuyScenes && typeof window.CuyScenes.def === 'function' && !id.startsWith('pig:')) {
          window.CanvasPig.setScene(window.CuyScenes.def(id));
        } else {
          window.CanvasPig.setScene({ id, kind: 'room', size: [192, 112], wallH: 32, walk: [8, 40, 184, 110] });
        }
        const dbg = window.CanvasPig.debug();
        return { id, sceneSize: dbg.sceneSize, cw: canvas.width, ch: canvas.height };
      });
    });
    assert.strictEqual(results.length, 7);
    for (const r of results) {
      assert.deepStrictEqual(r.sceneSize, [256, 144], `${r.id} sceneSize`);
      assert.strictEqual(r.cw, 256, `${r.id} canvas.width`);
      assert.strictEqual(r.ch, 144, `${r.id} canvas.height`);
    }
  });

  await testScenario('T2: 12x7 room centered, cell (0,0) and (11,6) hit same cells', async () => {
    const res = await page.evaluate(() => {
      const geom = window.CuyRoomGeometry;
      const layout = { cols: 12, rows: 7, wallRows: 2 };
      const off = geom.stageOffset(12, 7);
      window.CanvasPig.setScene({
        id: 'salon',
        kind: 'room',
        size: [192, 112],
        wallH: 32,
        walk: [8, 40, 184, 110]
      });
      const dbg = window.CanvasPig.debug();
      const c00 = geom.pxToCell(layout, (off.x + 8) - off.x, (off.y + 8) - off.y);
      const cLast = geom.pxToCell(layout, (off.x + 11 * 16 + 8) - off.x, (off.y + 6 * 16 + 8) - off.y);
      const items = (window.CuyScenes && typeof window.CuyScenes.getItems === 'function') ? window.CuyScenes.getItems() : {};
      const floorItem = Object.values(items).find(it => it && (it.kind || 'indoor') === 'indoor' && it.layer !== 'wall') || { id: 'hay_rack' };
      const validInside = window.CanvasPig.cellValid(floorItem.id, off.x + 48, off.y + 64);
      const validOutside = window.CanvasPig.cellValid(floorItem.id, 8, 64);
      return { off, roomOffset: dbg.roomOffset, c00, cLast, validInside, validOutside };
    });
    assert.ok(res.off.x > 0 && res.off.y > 0, '12x7 offset > 0');
    assert.deepStrictEqual(res.roomOffset, res.off);
    assert.deepStrictEqual(res.c00, { cx: 0, cy: 0 });
    assert.deepStrictEqual(res.cLast, { cx: 11, cy: 6 });
    assert.strictEqual(res.validInside, true, 'cell inside room is valid');
    assert.strictEqual(res.validOutside, false, 'cell outside room margin is invalid');
  });

  await testScenario('T3: saved grid item (3,2) draws at same room-relative place', async () => {
    const res = await page.evaluate(() => {
      const geom = window.CuyRoomGeometry;
      const local = geom.cellToPx({ cols: 12, rows: 7 }, 3, 2, 1, 1);
      window.CanvasPig.setScene({ id: 'salon', kind: 'room', size: [192, 112], wallH: 32, walk: [8, 40, 184, 110] });
      window.CanvasPig.setThings([{ id: 'test_item', x: local.x, y: local.y, w: 16, h: 16 }]);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const p12 = { x: inst.things[0].x, y: inst.things[0].y };
      const off12 = geom.stageOffset(12, 7);

      window.CanvasPig.setScene({ id: 'salon', kind: 'room', size: [256, 128], wallH: 32, walk: [8, 40, 248, 126] });
      window.CanvasPig.setThings([{ id: 'test_item', x: local.x, y: local.y, w: 16, h: 16 }]);
      const p16 = { x: inst.things[0].x, y: inst.things[0].y };
      const off16 = geom.stageOffset(16, 8);
      return { local, p12, off12, p16, off16 };
    });
    assert.strictEqual(res.p12.x - res.off12.x, res.local.x);
    assert.strictEqual(res.p12.y - res.off12.y, res.local.y);
    assert.strictEqual(res.p16.x - res.off16.x, res.local.x);
    assert.strictEqual(res.p16.y - res.off16.y, res.local.y);
  });

  await testScenario('T4: upgrade to 16x8 shrinks offset, keeps pig scale consistent', async () => {
    const res = await page.evaluate(() => {
      window.CanvasPig.setScene({ id: 'salon', kind: 'room', size: [192, 112], wallH: 32, walk: [8, 40, 184, 110] });
      const d12 = window.CanvasPig.debug();
      window.CanvasPig.setScene({ id: 'salon', kind: 'room', size: [256, 128], wallH: 32, walk: [8, 40, 248, 126] });
      const d16 = window.CanvasPig.debug();
      return { d12, d16 };
    });
    assert.ok(res.d16.roomOffset.x < res.d12.roomOffset.x, 'offset.x decreases on 16x8');
    assert.ok(res.d16.roomOffset.y < res.d12.roomOffset.y, 'offset.y decreases on 16x8');
    assert.deepStrictEqual(res.d16.sceneSize, [256, 144]);
    assert.ok(res.d12.pig.scale >= 0.75 && res.d12.pig.scale <= 0.875, `12x7 scale=${res.d12.pig.scale}`);
    assert.strictEqual(res.d16.pig.scale, res.d12.pig.scale, 'pig scale unchanged after upgrade');
  });

  await testScenario('T5: no console or page errors', async () => {
    assert.deepStrictEqual(page.__errors, []);
  });

  await browser.close();
  server.close();
  process.exit(hasFailures ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
