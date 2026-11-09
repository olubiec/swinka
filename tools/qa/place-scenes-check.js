#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const defaultJsonPath = path.join(repoRoot, 'assets/data/place_scenes.json');

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

function checkBlockers(data) {
  const failures = {
    B1: [],
    B2: [],
    B3: [],
    B4: [],
    B5: [],
    B6: []
  };

  const scenes = data.scenes || {};

  for (const [name, scene] of Object.entries(scenes)) {
    if (!scene) continue;
    const blockers = scene.blockers || [];
    if (!Array.isArray(blockers)) {
      failures.B5.push(`${name}: blockers is not an array`);
      continue;
    }

    const seenIds = new Set();
    const [sw, sh] = scene.size || [];

    for (let i = 0; i < blockers.length; i++) {
      const b = blockers[i];
      if (!b || typeof b !== 'object') {
        failures.B5.push(`${name}: blocker #${i} is not an object`);
        continue;
      }

      // B5: ids unique per scene
      if (typeof b.id !== 'string' || !b.id.trim()) {
        failures.B5.push(`${name}: blocker #${i} missing non-empty id`);
      } else if (seenIds.has(b.id)) {
        failures.B5.push(`${name}: duplicate blocker id '${b.id}'`);
      } else {
        seenIds.add(b.id);
      }

      // Rect format
      if (!Array.isArray(b.rect) || b.rect.length !== 4 || b.rect.some(v => typeof v !== 'number' || isNaN(v))) {
        failures.B1.push(`${name}.${b.id || i}: rect must be 4 numbers`);
        continue;
      }

      const [x0, y0, x1, y1] = b.rect;

      // B6: rect order x0<x1, y0<y1
      if (x0 >= x1 || y0 >= y1) {
        failures.B6.push(`${name}.${b.id || i}: invalid rect order [${x0}, ${y0}, ${x1}, ${y1}]`);
      }

      // B1: each rect inside the scene
      if (sw != null && sh != null) {
        if (x0 < 0 || y0 < 0 || x1 > sw || y1 > sh) {
          failures.B1.push(`${name}.${b.id || i}: rect [${x0}, ${y0}, ${x1}, ${y1}] out of scene size [${sw}, ${sh}]`);
        }
      }
    }

    if (!Array.isArray(scene.walk) || scene.walk.length !== 4) {
      continue;
    }

    const [wx0, wy0, wx1, wy1] = scene.walk;
    const midY = Math.floor((wy0 + wy1) / 2);

    // B2: no rect overlaps the spawn/entry points (left/right edge exits, x=8 and x=size-8 at walk mid height)
    if (sw != null) {
      const leftSpawn = { x: 8, y: midY };
      const rightSpawn = { x: sw - 8, y: midY };

      for (const b of blockers) {
        if (!Array.isArray(b.rect) || b.rect.length !== 4) continue;
        const [x0, y0, x1, y1] = b.rect;
        if (x0 <= leftSpawn.x && leftSpawn.x <= x1 && y0 <= leftSpawn.y && leftSpawn.y <= y1) {
          failures.B2.push(`${name}.${b.id}: overlaps left spawn (8, ${midY})`);
        }
        if (x0 <= rightSpawn.x && rightSpawn.x <= x1 && y0 <= rightSpawn.y && rightSpawn.y <= y1) {
          failures.B2.push(`${name}.${b.id}: overlaps right spawn (${sw - 8}, ${midY})`);
        }
      }
    }

    // B3: >= 60% of each walk band stays free
    const totalPixels = Math.max(0, (wx1 - wx0) * (wy1 - wy0));
    if (totalPixels > 0) {
      let freePixels = 0;
      const validBlockers = blockers.filter(b => Array.isArray(b.rect) && b.rect.length === 4 && b.rect[0] < b.rect[2] && b.rect[1] < b.rect[3]);
      for (let y = wy0; y < wy1; y++) {
        for (let x = wx0; x < wx1; x++) {
          let blocked = false;
          for (let bi = 0; bi < validBlockers.length; bi++) {
            const r = validBlockers[bi].rect;
            if (x >= r[0] && x < r[2] && y >= r[1] && y < r[3]) {
              blocked = true;
              break;
            }
          }
          if (!blocked) freePixels++;
        }
      }
      const freeRatio = freePixels / totalPixels;
      if (freeRatio < 0.60) {
        failures.B3.push(`${name}: free area ${(freeRatio * 100).toFixed(1)}% < 60%`);
      }
    }

    // B4: the free area is ONE connected region (4 px grid flood fill) and both exits are reachable
    if (sw != null && totalPixels > 0) {
      const STEP = 4;
      const cols = Math.ceil((wx1 - wx0) / STEP);
      const rows = Math.ceil((wy1 - wy0) / STEP);
      const validBlockers = blockers.filter(b => Array.isArray(b.rect) && b.rect.length === 4 && b.rect[0] < b.rect[2] && b.rect[1] < b.rect[3]);

      const grid = [];
      let totalFree = 0;
      for (let r = 0; r < rows; r++) {
        const rowArr = new Uint8Array(cols);
        const cellY0 = wy0 + r * STEP;
        const cellY1 = Math.min(wy1, cellY0 + STEP);
        for (let c = 0; c < cols; c++) {
          const cellX0 = wx0 + c * STEP;
          const cellX1 = Math.min(wx1, cellX0 + STEP);
          let blocked = false;
          for (let bi = 0; bi < validBlockers.length; bi++) {
            const br = validBlockers[bi].rect;
            if (cellX0 < br[2] && cellX1 > br[0] && cellY0 < br[3] && cellY1 > br[1]) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            rowArr[c] = 1;
            totalFree++;
          }
        }
        grid.push(rowArr);
      }

      if (totalFree === 0) {
        failures.B4.push(`${name}: has no free cells`);
        continue;
      }

      const clampLX = Math.max(wx0, Math.min(wx1 - 1, 8));
      const clampLY = Math.max(wy0, Math.min(wy1 - 1, midY));
      const startCol = Math.floor((clampLX - wx0) / STEP);
      const startRow = Math.floor((clampLY - wy0) / STEP);

      const clampRX = Math.max(wx0, Math.min(wx1 - 1, sw - 8));
      const clampRY = Math.max(wy0, Math.min(wy1 - 1, midY));
      const endCol = Math.floor((clampRX - wx0) / STEP);
      const endRow = Math.floor((clampRY - wy0) / STEP);

      if (!grid[startRow][startCol]) {
        failures.B4.push(`${name}: left exit cell [${startCol},${startRow}] is blocked`);
        continue;
      }
      if (!grid[endRow][endCol]) {
        failures.B4.push(`${name}: right exit cell [${endCol},${endRow}] is blocked`);
        continue;
      }

      const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
      const queue = [[startCol, startRow]];
      visited[startRow][startCol] = 1;
      let reachedCount = 0;

      while (queue.length > 0) {
        const [c, r] = queue.shift();
        reachedCount++;
        const neighbors = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];
        for (let ni = 0; ni < 4; ni++) {
          const nc = neighbors[ni][0];
          const nr = neighbors[ni][1];
          if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && grid[nr][nc] && !visited[nr][nc]) {
            visited[nr][nc] = 1;
            queue.push([nc, nr]);
          }
        }
      }

      if (!visited[endRow][endCol]) {
        failures.B4.push(`${name}: right exit not reachable from left exit`);
      } else if (reachedCount !== totalFree) {
        failures.B4.push(`${name}: free area is not one connected region (${reachedCount}/${totalFree} cells reached)`);
      }
    }
  }

  const results = {
    B1: failures.B1.length === 0,
    B2: failures.B2.length === 0,
    B3: failures.B3.length === 0,
    B4: failures.B4.length === 0,
    B5: failures.B5.length === 0,
    B6: failures.B6.length === 0
  };

  const allPassed = Object.values(results).every(Boolean);

  return { allPassed, results, failures };
}

function checkPlaceScenes(data, options = {}) {
  const root = options.repoRoot || repoRoot;
  let allPassed = true;
  const results = {};
  const failures = {};

  // C1: every bg path exists under assets/
  let c1Ok = true;
  const c1Failures = [];
  for (const [name, scene] of Object.entries(data.scenes || {})) {
    if (scene && scene.bg) {
      for (const [tod, relPath] of Object.entries(scene.bg)) {
        const fullPath = path.join(root, 'assets', relPath);
        if (!fs.existsSync(fullPath)) {
          c1Ok = false;
          c1Failures.push(`${name}.${tod}: ${relPath}`);
        }
      }
    }
  }
  results.C1 = c1Ok;
  failures.C1 = c1Failures;
  if (!c1Ok) allPassed = false;

  // C2: PNG size read from the file header equals size
  let c2Ok = true;
  const c2Failures = [];
  for (const [name, scene] of Object.entries(data.scenes || {})) {
    if (scene && scene.bg) {
      for (const [tod, relPath] of Object.entries(scene.bg)) {
        const fullPath = path.join(root, 'assets', relPath);
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
  results.C2 = c2Ok;
  failures.C2 = c2Failures;
  if (!c2Ok) allPassed = false;

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
  results.C3 = c3Ok;
  failures.C3 = c3Failures;
  if (!c3Ok) allPassed = false;

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
  results.C4 = c4Ok;
  failures.C4 = c4Failures;
  if (!c4Ok) allPassed = false;

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
  results.C5 = c5Ok;
  failures.C5 = c5Failures;
  if (!c5Ok) allPassed = false;

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
  results.C6 = c6Ok;
  failures.C6 = c6Failures;
  if (!c6Ok) allPassed = false;

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
  results.C7 = c7Ok;
  failures.C7 = c7Failures;
  if (!c7Ok) allPassed = false;

  // Blocker rules B1-B6
  const blockerResults = checkBlockers(data);
  for (const [rule, passed] of Object.entries(blockerResults.results)) {
    results[rule] = passed;
    failures[rule] = blockerResults.failures[rule];
    if (!passed) allPassed = false;
  }

  // R1: depth_scale far >= 0.9 and far < near <= 1.0 for every scene
  let r1Ok = true;
  const r1Failures = [];
  for (const [name, scene] of Object.entries(data.scenes || {})) {
    if (!scene || !Array.isArray(scene.depth_scale) || scene.depth_scale.length !== 2) {
      r1Ok = false;
      r1Failures.push(`${name} depth_scale invalid`);
      continue;
    }
    const [far, near] = scene.depth_scale;
    if (typeof far !== 'number' || typeof near !== 'number' || far < 0.9 || far >= near || near > 1.0) {
      r1Ok = false;
      r1Failures.push(`${name} invalid depth_scale [${far}, ${near}] (expected 0.9 <= far < near <= 1.0)`);
    }
  }
  results.R1 = r1Ok;
  failures.R1 = r1Failures;
  if (!r1Ok) allPassed = false;

  // R2: walk height >= 12 and bottom edge <= size height - 2
  let r2Ok = true;
  const r2Failures = [];
  for (const [name, scene] of Object.entries(data.scenes || {})) {
    if (!scene || !Array.isArray(scene.walk) || scene.walk.length !== 4) {
      r2Ok = false;
      r2Failures.push(`${name} invalid walk format`);
      continue;
    }
    const [x0, y0, x1, y1] = scene.walk;
    const [sw, sh] = scene.size || [];
    const h = y1 - y0;
    if (h < 12) {
      r2Ok = false;
      r2Failures.push(`${name} walk height ${h} < 12`);
    }
    if (sh != null && y1 > sh - 2) {
      r2Ok = false;
      r2Failures.push(`${name} walk bottom ${y1} > size height - 2 (${sh - 2})`);
    }
  }
  results.R2 = r2Ok;
  failures.R2 = r2Failures;
  if (!r2Ok) allPassed = false;

  // R3: a scene with size_from_layout has fallback size and walk
  let r3Ok = true;
  const r3Failures = [];
  for (const [name, scene] of Object.entries(data.scenes || {})) {
    if (scene && scene.size_from_layout) {
      const hasSize = Array.isArray(scene.size) && scene.size.length === 2 &&
        typeof scene.size[0] === 'number' && typeof scene.size[1] === 'number';
      const hasWalk = Array.isArray(scene.walk) && scene.walk.length === 4 &&
        scene.walk.every(v => typeof v === 'number');
      if (!hasSize || !hasWalk) {
        r3Ok = false;
        r3Failures.push(`${name} size_from_layout missing fallback ${!hasSize ? 'size' : ''}${!hasSize && !hasWalk ? ' and ' : ''}${!hasWalk ? 'walk' : ''}`);
      }
    }
  }
  results.R3 = r3Ok;
  failures.R3 = r3Failures;
  if (!r3Ok) allPassed = false;

  return { allPassed, results, failures };
}

function runCli() {
  if (!fs.existsSync(defaultJsonPath)) {
    console.error(`Missing place_scenes.json at ${defaultJsonPath}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(defaultJsonPath, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON in ${defaultJsonPath}: ${err.message}`);
    process.exit(1);
  }

  const { allPassed, results, failures } = checkPlaceScenes(data);

  const descriptions = {
    C1: 'every bg path exists under assets/',
    C2: 'PNG size read from file header equals size',
    C3: 'walk lies inside size and width >= 60, height >= 12',
    C4: 'every exits.to is a known scene or house',
    C5: 'exit ring closes in both right and left directions',
    C6: 'depth_scale far<=near<=1.0 for all scenes',
    C7: 'all four times of day present for outdoor scenes',
    B1: 'each rect inside the scene',
    B2: 'no rect overlaps spawn/entry points',
    B3: '>= 60% of each walk band stays free',
    B4: 'the free area is ONE connected region and both exits are reachable',
    B5: 'ids unique per scene',
    B6: 'rect order x0<x1, y0<y1',
    R1: 'depth_scale far >= 0.9 and far < near <= 1.0 for every scene',
    R2: 'walk height >= 12 and bottom edge <= size height - 2',
    R3: 'a scene with size_from_layout has fallback size and walk'
  };

  for (const [code, desc] of Object.entries(descriptions)) {
    if (results[code]) {
      console.log(`${code}: OK - ${desc}`);
    } else {
      console.error(`${code}: FAIL - ${failures[code].join('; ')}`);
    }
  }

  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  checkBlockers,
  checkPlaceScenes
};
