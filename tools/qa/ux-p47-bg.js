'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCENES_PATH = path.join(ROOT, 'assets', 'data', 'place_scenes.json');
const DEFAULTS_PATH = path.join(ROOT, 'assets', 'data', 'outdoor_defaults.json');
const BG_DIR = path.join(ROOT, 'assets', 'world', 'bg');

const TODS = ['morning', 'day', 'evening', 'night'];
const OUTDOOR_SCENES = ['garden', 'park', 'farm', 'market'];

// Instance blocker ids from R46.md sec. 3 (used when outdoor_defaults.json is not present yet)
const R46_INSTANCE_IDS = {
  garden: ['fountain', 'bench', 'flower_bed_left', 'flower_bed_right', 'tree_trunk_left', 'tree_trunk_right', 'burrow', 'hedge'],
  park: ['tree_trunk_1', 'tree_trunk_2', 'tree_trunk_3', 'tree_trunk_4', 'gazebo', 'bridge_post_left', 'bridge_post_right', 'bench_left', 'bench_right', 'lantern_left', 'lantern_mid', 'lantern_right'],
  farm: ['fence_left', 'barn_base', 'fence_right'],
  market: ['stall_left', 'notice_board', 'stall_center', 'crates_barrels', 'stall_right', 'sign_right']
};

let failures = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failures += 1;
  }
}

function readPngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = '89504e470d0a1a0a';
  assert(buf.length >= 24 && buf.subarray(0, 8).toString('hex') === sig, `Invalid PNG signature: ${filePath}`);
  assert(buf.subarray(12, 16).toString('ascii') === 'IHDR', `Missing IHDR chunk: ${filePath}`);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  };
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function runPython(relScript) {
  const scriptPath = path.join(ROOT, relScript);
  const py = process.platform === 'win32' ? 'python' : 'python3';
  try {
    execFileSync(py, [scriptPath], { cwd: ROOT, stdio: 'pipe' });
  } catch (err) {
    if (process.platform !== 'win32') throw err;
    execFileSync('python3', [scriptPath], { cwd: ROOT, stdio: 'pipe' });
  }
}

function main() {
  const scenesData = JSON.parse(fs.readFileSync(SCENES_PATH, 'utf8'));
  const scenes = scenesData.scenes || {};

  // T1 & T6: Check all outdoor PNGs exist, TODs complete, and dimensions === 256x144
  const expectedFiles = [];
  for (const tod of TODS) {
    expectedFiles.push(`garden_${tod}.png`);
    expectedFiles.push(`park_${tod}.png`);
  }
  expectedFiles.push('farm.png', 'market.png');

  for (const file of expectedFiles) {
    const full = path.join(BG_DIR, file);
    assert(fs.existsSync(full), `T1/T6 missing bg file: ${file}`);
    if (fs.existsSync(full)) {
      const sz = readPngSize(full);
      assert(sz.width === 256 && sz.height === 144, `T1 ${file} expected 256x144, got ${sz.width}x${sz.height}`);
    }
  }

  // T2, T3, T4, T6 on place_scenes.json
  let defaultsData = null;
  if (fs.existsSync(DEFAULTS_PATH)) {
    defaultsData = JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf8'));
  } else {
    console.log('SKIP T4b: outdoor_defaults.json not present yet');
  }

  for (const id of OUTDOOR_SCENES) {
    const sc = scenes[id];
    assert(!!sc, `Missing scene ${id} in place_scenes.json`);
    if (!sc) continue;

    // T2
    assert(Array.isArray(sc.size) && sc.size[0] === 256 && sc.size[1] === 144, `T2 ${id}.size expected [256, 144], got ${JSON.stringify(sc.size)}`);

    // T6 bg entries
    for (const tod of TODS) {
      assert(sc.bg && typeof sc.bg[tod] === 'string' && sc.bg[tod].length > 0, `T6 ${id}.bg.${tod} missing`);
    }

    // T3 walk, exits, blockers inside 256x144
    const w = sc.walk;
    assert(
      Array.isArray(w) && w.length === 4 && w[0] >= 0 && w[1] >= 0 && w[2] <= 256 && w[3] <= 144 && w[0] < w[2] && w[1] < w[3],
      `T3 ${id}.walk out of bounds: ${JSON.stringify(w)}`
    );
    if (sc.exits) {
      for (const [dir, ex] of Object.entries(sc.exits)) {
        assert(ex && typeof ex.x === 'number' && ex.x >= 0 && ex.x <= 256, `T3 ${id}.exits.${dir}.x out of bounds: ${ex && ex.x}`);
      }
    }
    const blockers = sc.blockers || [];
    for (const b of blockers) {
      const r = b.rect;
      assert(
        Array.isArray(r) && r.length === 4 && r[0] >= 0 && r[1] >= 0 && r[2] <= 256 && r[3] <= 144 && r[0] < r[2] && r[1] < r[3],
        `T3 ${id}.blockers[${b.id}] out of 256x144 bounds: ${JSON.stringify(r)}`
      );
    }

    // T4 bg_clean and no instance blockers
    assert(sc.bg_clean === true, `T4 ${id}.bg_clean expected true, got ${sc.bg_clean}`);
    const forbidden = new Set(R46_INSTANCE_IDS[id] || []);
    if (defaultsData && Array.isArray(defaultsData[id])) {
      for (const item of defaultsData[id]) {
        if (item && item.id) forbidden.add(item.id);
      }
    }
    for (const b of blockers) {
      assert(!forbidden.has(b.id), `T4 ${id} still has instance blocker: ${b.id}`);
    }
  }

  // T7: room keys and walk inside 256x144 and 12x7 default floor [32, 48, 224, 128]
  const room = scenes.room;
  assert(!!room, 'T7 missing scenes.room');
  if (room) {
    assert(Array.isArray(room.size) && room.size[0] === 256 && room.size[1] === 144, `T7 room.size expected [256, 144], got ${JSON.stringify(room.size)}`);
    assert(room.size_from_layout === true, `T7 room.size_from_layout expected true`);
    assert(room.behindLine === 48, `T7 room.behindLine expected 48, got ${room.behindLine}`);
    const rw = room.walk;
    assert(
      Array.isArray(rw) && rw.length === 4 &&
      rw[0] >= 0 && rw[1] >= 0 && rw[2] <= 256 && rw[3] <= 144 &&
      rw[0] >= 32 && rw[1] >= 48 && rw[2] <= 224 && rw[3] <= 128 &&
      rw[0] < rw[2] && rw[1] < rw[3],
      `T7 room.walk out of 256x144 or 12x7 floor [32,48,224,128]: ${JSON.stringify(rw)}`
    );
  }

  // T5: Determinism — run generators twice and compare checksums
  const generators = [
    'tools/art/world/garden_bg.py',
    'tools/art/world/park_bg.py',
    'tools/art/world/farm_bg.py',
    'tools/art/world/market_bg.py'
  ];
  for (const gen of generators) runPython(gen);
  const firstHashes = {};
  for (const file of expectedFiles) {
    firstHashes[file] = sha256(path.join(BG_DIR, file));
  }
  for (const gen of generators) runPython(gen);
  for (const file of expectedFiles) {
    const second = sha256(path.join(BG_DIR, file));
    assert(firstHashes[file] === second, `T5 non-deterministic output for ${file}`);
  }

  if (failures > 0) {
    console.error(`ux-p47-bg.js: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('ux-p47-bg.js: ALL PASS (T1-T7)');
}

main();
