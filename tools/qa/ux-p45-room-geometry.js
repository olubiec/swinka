'use strict';

const path = require('path');
const fs = require('fs');
const assert = require('assert');

const CuyRoomGeometry = require(path.join(__dirname, '../../web/home/features/places/room-geometry.js'));
const { geometry, cellToPx, pxToCell, CELL } = CuyRoomGeometry;

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    throw err;
  }
}

// G1: default layout -> size [192, 112], wallH 32
test('G1 default layout', () => {
  assert.strictEqual(CELL, 16);
  const g = geometry();
  assert.deepStrictEqual(g.size, [192, 112]);
  assert.strictEqual(g.wallH, 32);
  assert.deepStrictEqual(g.floor, [0, 32, 192, 112]);
  assert.deepStrictEqual(g.walk, [8, 40, 184, 110]);
  assert.strictEqual(g.cell, 16);
});

// G2: 12x8 wallRows 3 -> [192, 128], wallH 48
test('G2 12x8 wallRows 3', () => {
  const g = geometry({ cols: 12, rows: 8, wallRows: 3 });
  assert.deepStrictEqual(g.size, [192, 128]);
  assert.strictEqual(g.wallH, 48);
  assert.deepStrictEqual(g.floor, [0, 48, 192, 128]);
  assert.deepStrictEqual(g.walk, [8, 56, 184, 126]);
});

// G3: cellToPx of a 3x2 sofa at cell (1,3) equals the old formula
test('G3 cellToPx 3x2 sofa at (1,3)', () => {
  const cx = 1;
  const cy = 3;
  const cw = 3;
  const ch = 2;

  // Formula from CuyScenes.placedThings
  const oldX = Math.round(cx * 16 + (cw * 16) / 2);
  const oldY = Math.round((cy + ch) * 16);
  assert.strictEqual(oldX, 40);
  assert.strictEqual(oldY, 80);

  const pt = cellToPx(null, cx, cy, cw, ch);
  assert.strictEqual(pt.x, oldX);
  assert.strictEqual(pt.y, oldY);

  const ptObj = cellToPx({ cols: 12, rows: 7 }, cx, cy, cw, ch);
  assert.strictEqual(ptObj.x, oldX);
  assert.strictEqual(ptObj.y, oldY);
});

// G4: pxToCell(cellToPx(c)) round-trips for 20 random cells
test('G4 round-trips for 20 random cells', () => {
  const layout = { cols: 12, rows: 7, wallRows: 2 };
  for (let i = 0; i < 20; i++) {
    const rx = Math.floor(Math.random() * 12);
    const ry = Math.floor(Math.random() * 7);

    // Test with layout and separate cx, cy
    const pt1 = cellToPx(layout, rx, ry, 1, 1);
    const back1 = pxToCell(layout, pt1.x, pt1.y);
    assert.strictEqual(back1.cx, rx, `cx mismatch for cell (${rx}, ${ry})`);
    assert.strictEqual(back1.cy, ry, `cy mismatch for cell (${rx}, ${ry})`);

    // Test with cell object pxToCell(cellToPx(c))
    const c = { cx: rx, cy: ry };
    const pt2 = cellToPx(c);
    const back2 = pxToCell(pt2);
    assert.strictEqual(back2.cx, rx, `c object cx mismatch for cell (${rx}, ${ry})`);
    assert.strictEqual(back2.cy, ry, `c object cy mismatch for cell (${rx}, ${ry})`);
  }
});

// G5: garbage input (null, strings, 0, negative) returns the default geometry
test('G5 garbage input returns default geometry', () => {
  const expectedDefault = {
    size: [192, 112],
    wallH: 32,
    floor: [0, 32, 192, 112],
    walk: [8, 40, 184, 110],
    cell: 16
  };

  const garbageCases = [
    null,
    undefined,
    'garbage',
    123,
    0,
    -5,
    {},
    { cols: '12', rows: null, wallRows: -5 },
    { cols: 0, rows: 0, wallRows: 0 },
    { cols: -10, rows: -10, wallRows: -2 },
    { cols: 1.5, rows: 2.5, wallRows: 0.5 }
  ];

  for (const tc of garbageCases) {
    const g = geometry(tc);
    assert.deepStrictEqual(g.size, expectedDefault.size, `size mismatch for ${JSON.stringify(tc)}`);
    assert.strictEqual(g.wallH, expectedDefault.wallH, `wallH mismatch for ${JSON.stringify(tc)}`);
    assert.deepStrictEqual(g.floor, expectedDefault.floor, `floor mismatch for ${JSON.stringify(tc)}`);
    assert.deepStrictEqual(g.walk, expectedDefault.walk, `walk mismatch for ${JSON.stringify(tc)}`);
    assert.strictEqual(g.cell, expectedDefault.cell, `cell mismatch for ${JSON.stringify(tc)}`);
  }
});

// G6: walk is inside size with width >= 60 and height >= 12 for 12x7 and 10x6
test('G6 walk bounds for 12x7 and 10x6', () => {
  const layouts = [
    { cols: 12, rows: 7, wallRows: 2 },
    { cols: 10, rows: 6, wallRows: 2 }
  ];

  for (const l of layouts) {
    const g = geometry(l);
    const [x0, y0, x1, y1] = g.walk;
    const [w, h] = g.size;

    assert(x0 >= 0, `x0 ${x0} >= 0`);
    assert(y0 >= 0, `y0 ${y0} >= 0`);
    assert(x1 <= w, `x1 ${x1} <= ${w}`);
    assert(y1 <= h, `y1 ${y1} <= ${h}`);

    const walkWidth = x1 - x0;
    const walkHeight = y1 - y0;
    assert(walkWidth >= 60, `walkWidth ${walkWidth} >= 60 for ${l.cols}x${l.rows}`);
    assert(walkHeight >= 12, `walkHeight ${walkHeight} >= 12 for ${l.cols}x${l.rows}`);
  }
});

// G7: index.html contains the script tag before the scenes.js tag
test('G7 index.html script tag order', () => {
  const htmlPath = path.join(__dirname, '../../web/home/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const geomIdx = html.indexOf('<script src="features/places/room-geometry.js"></script>');
  const scenesIdx = html.indexOf('<script src="features/places/scenes.js"></script>');

  assert(geomIdx !== -1, 'room-geometry.js script tag not found in index.html');
  assert(scenesIdx !== -1, 'scenes.js script tag not found in index.html');
  assert(geomIdx < scenesIdx, 'room-geometry.js must appear before scenes.js in index.html');
});

console.log(`\nAll ${passed}/${total} checks passed.`);
