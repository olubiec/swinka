'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');
const { renderOverlay, LAYERS, DEFAULT_SCENES } = require('./scene-overlay.js');

const EXPECTED_SIZES = {
  garden: { w: 1024, h: 576 },
  park:   { w: 1536, h: 768 },
  farm:   { w: 1024, h: 576 },
  market: { w: 1024, h: 576 },
  room:   { w: 960,  h: 520 }
};

function getLaunchOptions() {
  if (process.env.CHROMIUM_PATH) {
    return { executablePath: process.env.CHROMIUM_PATH };
  }
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return { executablePath: c };
    }
  }
  return {};
}

function readIhdr(filePath) {
  const buf = fs.readFileSync(filePath);
  assert(buf.length >= 24, 'File too small for PNG header: ' + filePath);
  const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  assert(buf.subarray(0, 8).equals(pngSig), 'Invalid PNG signature in ' + filePath);
  assert.strictEqual(buf.toString('ascii', 12, 16), 'IHDR', 'Missing IHDR chunk in ' + filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuy-ux-p45-'));
  let server = null;
  let browser = null;

  try {
    server = await ux.startServer();
    browser = await chromium.launch(getLaunchOptions());
    const page = await ux.openHome(browser);

    // O1: every default scene produces a PNG
    console.log('Testing O1: every default scene produces a PNG...');
    for (const scene of DEFAULT_SCENES) {
      const outPath = path.join(tmpDir, `${scene}.png`);
      const res = await renderOverlay(scene, outPath, { page });
      assert(fs.existsSync(outPath), `Expected output file ${outPath} to exist`);
      const stat = fs.statSync(outPath);
      assert(stat.size > 0, `Expected file ${outPath} to be non-empty`);
      assert(res.buffer && res.buffer.length > 0, `Expected renderOverlay to return buffer for ${scene}`);
    }
    console.log('O1 PASS: all default scenes produced PNGs');

    // O2: PNG width/height = scene size x 4 (read the IHDR)
    console.log('Testing O2: PNG width/height = scene size x 4 (read the IHDR)...');
    for (const scene of DEFAULT_SCENES) {
      const outPath = path.join(tmpDir, `${scene}.png`);
      const { width, height } = readIhdr(outPath);
      const expected = EXPECTED_SIZES[scene];
      assert(expected, 'No expected size for scene ' + scene);
      assert.strictEqual(width, expected.w, `Width mismatch for ${scene}: got ${width}, expected ${expected.w}`);
      assert.strictEqual(height, expected.h, `Height mismatch for ${scene}: got ${height}, expected ${expected.h}`);
    }
    console.log('O2 PASS: all PNG dimensions match scene size x 4');

    // O3: two runs give byte-identical files
    console.log('Testing O3: two runs give byte-identical files...');
    const gardenRun2 = path.join(tmpDir, 'garden_run2.png');
    await renderOverlay('garden', gardenRun2, { page });
    const bufGarden1 = fs.readFileSync(path.join(tmpDir, 'garden.png'));
    const bufGarden2 = fs.readFileSync(gardenRun2);
    assert(bufGarden1.equals(bufGarden2), 'garden run 1 and run 2 are not byte-identical');

    const roomRun2 = path.join(tmpDir, 'room_run2.png');
    await renderOverlay('room', roomRun2, { page });
    const bufRoom1 = fs.readFileSync(path.join(tmpDir, 'room.png'));
    const bufRoom2 = fs.readFileSync(roomRun2);
    assert(bufRoom1.equals(bufRoom2), 'room run 1 and run 2 are not byte-identical');
    console.log('O3 PASS: two runs produce byte-identical files');

    // O4: a scene without blockers renders
    console.log('Testing O4: a scene without blockers renders...');
    const roomNoBlockers = path.join(tmpDir, 'room_noblockers.png');
    const resNoBlockers = await renderOverlay('room', roomNoBlockers, {
      page,
      layers: ['walk', 'blockers', 'exits']
    });
    assert(fs.existsSync(roomNoBlockers), 'Expected room_noblockers.png to exist');
    const ihdrNoBlockers = readIhdr(roomNoBlockers);
    assert.strictEqual(ihdrNoBlockers.width, 960);
    assert.strictEqual(ihdrNoBlockers.height, 520);
    console.log('O4 PASS: scene without blockers renders cleanly');

    // O5: --grid output differs from no-grid output
    console.log('Testing O5: --grid output differs from no-grid output...');
    const gardenGrid = path.join(tmpDir, 'garden_grid.png');
    await renderOverlay('garden', gardenGrid, { page, grid: true });
    const bufGardenGrid = fs.readFileSync(gardenGrid);
    assert(!bufGarden1.equals(bufGardenGrid), 'Expected grid output to differ from no-grid output');
    console.log('O5 PASS: --grid output differs from no-grid output');

    console.log('\nALL 5 OVERLAY CHECKS PASS (O1-O5)');
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

run().catch((err) => {
  console.error('UX P45 OVERLAY TEST FAILED:', err);
  process.exit(1);
});
