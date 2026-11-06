#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const jsonPath = path.join(repoRoot, 'assets/data/place_scenes.json');

if (!fs.existsSync(jsonPath)) {
  console.error(`Missing place_scenes.json at ${jsonPath}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (err) {
  console.error(`Invalid JSON in ${jsonPath}: ${err.message}`);
  process.exit(1);
}

function readPngDimensions(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);

  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47 ||
      buf[4] !== 0x0d || buf[5] !== 0x0a || buf[6] !== 0x1a || buf[7] !== 0x0a) {
    throw new Error(`Not a PNG: ${filePath}`);
  }

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

let allPassed = true;

// C1: every bg path exists under assets/
let c1Ok = true;
const c1Failures = [];
for (const [name, scene] of Object.entries(data.scenes || {})) {
  if (scene && scene.bg) {
    for (const [tod, relPath] of Object.entries(scene.bg)) {
      const fullPath = path.join(repoRoot, 'assets', relPath);
      if (!fs.existsSync(fullPath)) {
        c1Ok = false;
        c1Failures.push(`${name}.${tod}: ${relPath}`);
      }
    }
  }
}
if (c1Ok) {
  console.log('C1: OK - every bg path exists under assets/');
} else {
  allPassed = false;
  console.error(`C1: FAIL - missing files: ${c1Failures.join(', ')}`);
}

// C2: PNG size read from the file header equals size
let c2Ok = true;
const c2Failures = [];
for (const [name, scene] of Object.entries(data.scenes || {})) {
  if (scene && scene.bg) {
    for (const [tod, relPath] of Object.entries(scene.bg)) {
      const fullPath = path.join(repoRoot, 'assets', relPath);
      try {
        const { width, height } = readPngDimensions(fullPath);
        if (width !== scene.size[0] || height !== scene.size[1]) {
          c2Ok = false;
          c2Failures.push(`${name}.${tod} (${width}x${height} != ${scene.size[0]}x${scene.size[1]})`);
        }
      } catch (err) {
        c2Ok = false;
        c2Failures.push(`${name}.${tod} read error: ${err.message}`);
      }
    }
  }
}
if (c2Ok) {
  console.log('C2: OK - PNG size read from file header equals size');
} else {
  allPassed = false;
  console.error(`C2: FAIL - ${c2Failures.join('; ')}`);
}

// C3: walk lies inside size and has width >= 60 and height >= 12
let c3Ok = true;
const c3Failures = [];
for (const [name, scene] of Object.entries(data.scenes || {})) {
  if (!scene || !Array.isArray(scene.walk) || scene.walk.length !== 4) {
    c3Ok = false;
    c3Failures.push(`${name} invalid walk format`);
    continue;
  }
  const [x0, y0, x1, y1] = scene.walk;
  const [sw, sh] = scene.size || [];
  const w = x1 - x0;
  const h = y1 - y0;
  if (x0 < 0 || y0 < 0 || x1 > sw || y1 > sh || x0 >= x1 || y0 >= y1) {
    c3Ok = false;
    c3Failures.push(`${name} walk out of bounds`);
  } else if (w < 60 || h < 12) {
    c3Ok = false;
    c3Failures.push(`${name} walk size ${w}x${h} too small (< 60x12)`);
  }
}
if (c3Ok) {
  console.log('C3: OK - walk lies inside size and width >= 60, height >= 12');
} else {
  allPassed = false;
  console.error(`C3: FAIL - ${c3Failures.join('; ')}`);
}

// C4: every exits.to is a known scene or house
let c4Ok = true;
const c4Failures = [];
const sceneKeys = Object.keys(data.scenes || {});
for (const [name, scene] of Object.entries(data.scenes || {})) {
  if (scene && scene.exits) {
    for (const [dir, exit] of Object.entries(scene.exits)) {
      if (!exit || typeof exit.to !== 'string') {
        c4Ok = false;
        c4Failures.push(`${name}.exits.${dir} invalid`);
      } else if (exit.to !== 'house' && !sceneKeys.includes(exit.to)) {
        c4Ok = false;
        c4Failures.push(`${name}.exits.${dir}.to=${exit.to} unknown`);
      }
    }
  }
}
if (data.house_exits) {
  for (const dir of ['left', 'right']) {
    const to = data.house_exits[dir];
    if (to !== 'house' && !sceneKeys.includes(to)) {
      c4Ok = false;
      c4Failures.push(`house_exits.${dir}=${to} unknown`);
    }
  }
} else {
  c4Ok = false;
  c4Failures.push('house_exits missing');
}
if (c4Ok) {
  console.log('C4: OK - every exits.to is a known scene or house');
} else {
  allPassed = false;
  console.error(`C4: FAIL - ${c4Failures.join('; ')}`);
}

// C5: exit ring closes (right: house->garden->park->farm->market->house; left is reverse)
let c5Ok = true;
const c5Failures = [];
const expectedRight = ['garden', 'park', 'farm', 'market', 'house'];
const visitedRight = [];
let curr = 'house';
for (let i = 0; i < 5; i++) {
  if (curr === 'house') {
    curr = data.house_exits ? data.house_exits.right : null;
  } else {
    curr = data.scenes[curr]?.exits?.right?.to;
  }
  visitedRight.push(curr);
}
if (JSON.stringify(visitedRight) !== JSON.stringify(expectedRight)) {
  c5Ok = false;
  c5Failures.push(`right path expected ${expectedRight.join('->')} but got ${visitedRight.join('->')}`);
}

const expectedLeft = ['market', 'farm', 'park', 'garden', 'house'];
const visitedLeft = [];
curr = 'house';
for (let i = 0; i < 5; i++) {
  if (curr === 'house') {
    curr = data.house_exits ? data.house_exits.left : null;
  } else {
    curr = data.scenes[curr]?.exits?.left?.to;
  }
  visitedLeft.push(curr);
}
if (JSON.stringify(visitedLeft) !== JSON.stringify(expectedLeft)) {
  c5Ok = false;
  c5Failures.push(`left path expected ${expectedLeft.join('->')} but got ${visitedLeft.join('->')}`);
}
if (c5Ok) {
  console.log('C5: OK - exit ring closes in both right and left directions');
} else {
  allPassed = false;
  console.error(`C5: FAIL - ${c5Failures.join('; ')}`);
}

// C6: depth_scale far<=near<=1.0
let c6Ok = true;
const c6Failures = [];
for (const [name, scene] of Object.entries(data.scenes || {})) {
  if (!scene || !Array.isArray(scene.depth_scale) || scene.depth_scale.length !== 2) {
    c6Ok = false;
    c6Failures.push(`${name} depth_scale invalid`);
    continue;
  }
  const [far, near] = scene.depth_scale;
  if (typeof far !== 'number' || typeof near !== 'number' || far <= 0 || far > near || near > 1.0) {
    c6Ok = false;
    c6Failures.push(`${name} invalid depth_scale [${far}, ${near}]`);
  }
}
if (c6Ok) {
  console.log('C6: OK - depth_scale far<=near<=1.0 for all scenes');
} else {
  allPassed = false;
  console.error(`C6: FAIL - ${c6Failures.join('; ')}`);
}

// C7: all four times of day present for outdoor scenes
let c7Ok = true;
const c7Failures = [];
const expectedTimes = data.time_of_day || ['morning', 'day', 'evening', 'night'];
for (const [name, scene] of Object.entries(data.scenes || {})) {
  if (scene && scene.kind === 'outdoor') {
    if (!scene.bg || typeof scene.bg !== 'object') {
      c7Ok = false;
      c7Failures.push(`${name} missing bg object`);
      continue;
    }
    for (const tod of expectedTimes) {
      if (typeof scene.bg[tod] !== 'string' || !scene.bg[tod].trim()) {
        c7Ok = false;
        c7Failures.push(`${name} missing time of day: ${tod}`);
      }
    }
  }
}
if (c7Ok) {
  console.log('C7: OK - all four times of day present for outdoor scenes');
} else {
  allPassed = false;
  console.error(`C7: FAIL - ${c7Failures.join('; ')}`);
}

process.exit(allPassed ? 0 : 1);
