'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { checkPlaceScenes } = require('./place-scenes-check.js');

const repoRoot = path.resolve(__dirname, '../..');
const jsonPath = path.join(repoRoot, 'assets/data/place_scenes.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const realData = JSON.parse(rawData);

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

// SD1: the real data passes the checker
test('SD1 real data passes checker', () => {
  const result = checkPlaceScenes(realData, { repoRoot });
  assert.strictEqual(result.allPassed, true, 'Expected all checks to pass: ' + JSON.stringify(result.failures));
  assert.strictEqual(result.results.R1, true, 'R1 passed');
  assert.strictEqual(result.results.R2, true, 'R2 passed');
  assert.strictEqual(result.results.R3, true, 'R3 passed');
});

// SD2: depth_scale [0.6, 1] is rejected
test('SD2 depth_scale [0.6, 1] rejected', () => {
  const fixture = JSON.parse(rawData);
  fixture.scenes.garden.depth_scale = [0.6, 1.0];
  const result = checkPlaceScenes(fixture, { repoRoot });
  assert.strictEqual(result.allPassed, false, 'Expected checker to reject depth_scale [0.6, 1]');
  assert.strictEqual(result.results.R1, false, 'Expected R1 to fail');
});

// SD3: walk bottom beyond the image is rejected
test('SD3 walk bottom beyond image rejected', () => {
  const fixture = JSON.parse(rawData);
  // Garden size is [256, 144]; set walk bottom to 145 (beyond height 144)
  fixture.scenes.garden.walk = [8, 80, 248, 145];
  const result = checkPlaceScenes(fixture, { repoRoot });
  assert.strictEqual(result.allPassed, false, 'Expected checker to reject walk bottom beyond image');
  assert.strictEqual(result.results.R2, false, 'Expected R2 to fail');
});

// SD4: size_from_layout without size is rejected
test('SD4 size_from_layout without size rejected', () => {
  const fixture = JSON.parse(rawData);
  assert.strictEqual(fixture.scenes.room.size_from_layout, true, 'room must have size_from_layout');
  delete fixture.scenes.room.size;
  const result = checkPlaceScenes(fixture, { repoRoot });
  assert.strictEqual(result.allPassed, false, 'Expected checker to reject size_from_layout without size');
  assert.strictEqual(result.results.R3, false, 'Expected R3 to fail');
});

// SD5: every scene depth_scale steps are multiples of 1/16 (s*16 is integer)
test('SD5 depth_scale steps are multiples of 1/16', () => {
  const scenes = realData.scenes || {};
  const sceneKeys = Object.keys(scenes);
  assert(sceneKeys.length > 0, 'No scenes found');
  for (const name of sceneKeys) {
    const scene = scenes[name];
    assert(Array.isArray(scene.depth_scale), `${name} has depth_scale array`);
    assert.strictEqual(scene.depth_scale.length, 2, `${name} depth_scale has 2 elements`);
    for (const s of scene.depth_scale) {
      assert(typeof s === 'number', `${name} step is a number`);
      const k = s * 16;
      assert(Math.abs(k - Math.round(k)) < 1e-9, `${name} step ${s} is not a multiple of 1/16 (s*16 = ${k})`);
    }
  }
});

console.log(`All ${passed}/${total} SD tests passed`);
