'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '../..');
const jsonPath = path.join(repoRoot, 'assets/data/place_scenes.json');
const measuredPath = path.join(repoRoot, 'docs/qa/calibration/MEASURED.md');

function runTests() {
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(rawData);
  const scenes = data.scenes || {};
  const sceneKeys = Object.keys(scenes);
  assert(sceneKeys.length > 0, 'No scenes found in place_scenes.json');

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

  // WB1: for every scene the walk is inside size, height >= 12, bottom <= height - 4 (outdoors)
  test('WB1 walk inside size, height >= 12, bottom <= height - 4 (outdoors)', () => {
    for (const name of sceneKeys) {
      const scene = scenes[name];
      assert(scene, `Scene ${name} missing`);
      assert(Array.isArray(scene.size) && scene.size.length === 2, `${name} has valid size`);
      assert(Array.isArray(scene.walk) && scene.walk.length === 4, `${name} has valid walk`);

      const [sw, sh] = scene.size;
      const [wx0, wy0, wx1, wy1] = scene.walk;

      assert(wx0 < wx1, `${name} walk wx0 < wx1`);
      assert(wy0 < wy1, `${name} walk wy0 < wy1`);
      assert(wx0 >= 0, `${name} walk wx0 >= 0`);
      assert(wy0 >= 0, `${name} walk wy0 >= 0`);
      assert(wx1 <= sw, `${name} walk wx1 (${wx1}) <= size width (${sw})`);
      assert(wy1 <= sh, `${name} walk wy1 (${wy1}) <= size height (${sh})`);

      const height = wy1 - wy0;
      assert(height >= 12, `${name} walk height (${height}) < 12`);

      if (scene.kind === 'outdoor') {
        assert(wy1 <= sh - 4, `${name} outdoor walk bottom (${wy1}) > size height - 4 (${sh - 4})`);
      }
    }
  });

  // WB2: walk width >= 60
  test('WB2 walk width >= 60 for all scenes', () => {
    for (const name of sceneKeys) {
      const scene = scenes[name];
      const [wx0, , wx1] = scene.walk;
      const width = wx1 - wx0;
      assert(width >= 60, `${name} walk width (${width}) < 60`);
    }
  });

  // WB3: MEASURED.md exists and mentions every outdoor scene id
  test('WB3 MEASURED.md exists and mentions every outdoor scene id', () => {
    assert(fs.existsSync(measuredPath), `MEASURED.md missing at ${measuredPath}`);
    const content = fs.readFileSync(measuredPath, 'utf8');

    const outdoorScenes = sceneKeys.filter(k => scenes[k].kind === 'outdoor');
    assert(outdoorScenes.length > 0, 'No outdoor scenes found');

    for (const outdoorId of outdoorScenes) {
      const regex = new RegExp(`\\b${outdoorId}\\b`, 'i');
      assert(regex.test(content), `MEASURED.md does not mention outdoor scene id '${outdoorId}'`);
    }
  });

  console.log(`All ${passed}/${total} WB tests passed`);
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
