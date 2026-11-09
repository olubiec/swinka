#!/usr/bin/env node
/**
 * QA test for PK-P45c3: Register trim sprites in tiles.json.
 * TA1: tiles.json parses and still contains every key it had before plus trim.
 * TA2: both trim files exist and their IHDR size equals the declared size.
 * TA3: check-assets.js accepts the entry (run as a child process).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TILES_JSON_PATH = path.join(ROOT, 'assets', 'world', 'tiles.json');
const WORLD_DIR = path.join(ROOT, 'assets', 'world');

// Expected original keys before PK-P45c3
const OLD_TOP_KEYS = ['note', 'bg', 'tiles', 'market'];

const OLD_BG_KEYS = [
  'garden_morning', 'park_morning', 'garden_day', 'park_day',
  'garden_evening', 'park_evening', 'garden_night', 'park_night',
  'farm', 'market', 'orchard', 'menu'
];

const OLD_TILES_KEYS = [
  'grass_1', 'grass_2', 'grass_park', 'water_0', 'water_1', 'water_2', 'water_3',
  'fence_00', 'fence_01', 'fence_02', 'fence_03', 'fence_04', 'fence_05', 'fence_06', 'fence_07',
  'fence_08', 'fence_09', 'fence_10', 'fence_11', 'fence_12', 'fence_13', 'fence_14', 'fence_15',
  'wall_bedroom_1', 'wall_bedroom_2', 'wall_bedroom_3', 'wall_bedroom_4',
  'floor_bedroom_1', 'floor_bedroom_2', 'floor_bedroom_3', 'floor_bedroom_4',
  'wall_playroom_1', 'wall_playroom_2', 'wall_playroom_3', 'wall_playroom_4',
  'floor_playroom_1', 'floor_playroom_2', 'floor_playroom_3', 'floor_playroom_4',
  'memory_stone', 'wall_pig_kuki', 'floor_pig_kuki', 'wall_pig_ned', 'floor_pig_ned',
  'wall_pig_james', 'floor_pig_james', 'wall_pig_glen', 'floor_pig_glen',
  'wall_pig_racuch', 'floor_pig_racuch', 'run_floor', 'wall_memory', 'floor_memory',
  'wallpaper_mint', 'wallpaper_peach', 'wallpaper_sky', 'wallpaper_lilac',
  'wallpaper_night', 'wallpaper_cream', 'floor_wood_light', 'floor_wood',
  'floor_tiles_checker', 'floor_carpet_red', 'floor_grass', 'floor_soil',
  'floor_stone', 'floor_straw', 'floor_fleece'
];

const OLD_MARKET_KEYS = [
  'stall_basic', 'stall_big', 'order_board',
  'promo_1', 'promo_2', 'promo_3',
  'poster_1', 'poster_2', 'poster_3'
];

function readPngIhdrSize(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    assert.strictEqual(buf[i], sig[i], `Invalid PNG signature in ${filePath}`);
  }

  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      const width = data.readUInt32BE(0);
      const height = data.readUInt32BE(4);
      return [width, height];
    }
  }
  throw new Error(`IHDR chunk not found in ${filePath}`);
}

function testTA1() {
  const content = fs.readFileSync(TILES_JSON_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    assert.fail(`tiles.json failed to parse: ${err.message}`);
  }

  for (const k of OLD_TOP_KEYS) {
    assert.ok(k in data, `Missing top-level key '${k}' in tiles.json`);
  }
  for (const k of OLD_BG_KEYS) {
    assert.ok(k in data.bg, `Missing bg key '${k}' in tiles.json`);
  }
  for (const k of OLD_TILES_KEYS) {
    assert.ok(k in data.tiles, `Missing tiles key '${k}' in tiles.json`);
  }
  for (const k of OLD_MARKET_KEYS) {
    assert.ok(k in data.market, `Missing market key '${k}' in tiles.json`);
  }

  assert.ok(data.trim, "Missing top-level 'trim' key in tiles.json");
  assert.deepStrictEqual(data.trim.baseboard, {
    file: 'house/trim_baseboard.png',
    size: [16, 8]
  });
  assert.deepStrictEqual(data.trim.floor_shadow, {
    file: 'house/trim_floor_shadow.png',
    size: [16, 4]
  });
  console.log('TA1 PASS: tiles.json structure and original keys intact');
  return data;
}

function testTA2(data) {
  for (const [trimId, entry] of Object.entries(data.trim)) {
    const filePath = path.join(WORLD_DIR, entry.file);
    assert.ok(fs.existsSync(filePath), `Trim sprite file does not exist: ${filePath}`);
    const [width, height] = readPngIhdrSize(filePath);
    assert.strictEqual(width, entry.size[0], `Width mismatch for ${trimId}: got ${width}, expected ${entry.size[0]}`);
    assert.strictEqual(height, entry.size[1], `Height mismatch for ${trimId}: got ${height}, expected ${entry.size[1]}`);
  }
  console.log('TA2 PASS: trim files exist and match declared IHDR sizes');
}

function testTA3() {
  const checkAssetsScript = path.join(ROOT, 'tools', 'qa', 'check-assets.js');
  const res = cp.spawnSync(process.execPath, [checkAssetsScript], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.strictEqual(res.status, 0, `check-assets.js exited with code ${res.status}:\n${res.stderr || res.stdout}`);
  console.log('TA3 PASS: check-assets.js accepts tiles.json with trim entries');
}

function main() {
  const data = testTA1();
  testTA2(data);
  testTA3();
  console.log('ALL TESTS PASSED');
}

main();
