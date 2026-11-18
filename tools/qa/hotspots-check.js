// Schema validator for assets/data/scene_hotspots.json (PK-P43ab).
'use strict';

const fs = require('fs');
const path = require('path');

const KINDS = ['stall', 'plot', 'orchard', 'shop', 'decor', 'lamp'];
const SCENE_W = 256;
const SCENE_H = 144;
const MAX_LABEL_LEN = 14;

function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['Root must be an object'] };
  }
  if (!data.scenes || typeof data.scenes !== 'object' || Array.isArray(data.scenes)) {
    return { ok: false, errors: ['Missing or invalid scenes object'] };
  }
  const sceneKeys = Object.keys(data.scenes);
  for (let s = 0; s < sceneKeys.length; s += 1) {
    const sceneId = sceneKeys[s];
    const items = data.scenes[sceneId];
    if (!Array.isArray(items)) {
      errors.push('scenes.' + sceneId + ' must be an array');
      continue;
    }
    const seenIds = Object.create(null);
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const prefix = 'scenes.' + sceneId + '[' + i + ']';
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(prefix + ' must be an object');
        continue;
      }
      if (typeof item.id !== 'string' || item.id.trim().length === 0) {
        errors.push(prefix + '.id must be a non-empty string');
      } else if (seenIds[item.id]) {
        errors.push(prefix + '.id duplicate "' + item.id + '" in scene ' + sceneId);
      } else {
        seenIds[item.id] = true;
      }

      if (KINDS.indexOf(item.kind) === -1) {
        errors.push(prefix + '.kind invalid: ' + item.kind);
      }

      if (!Array.isArray(item.rect) || item.rect.length !== 4 || !item.rect.every(Number.isFinite)) {
        errors.push(prefix + '.rect must be 4 finite numbers [x0, y0, x1, y1]');
      } else {
        const x0 = item.rect[0];
        const y0 = item.rect[1];
        const x1 = item.rect[2];
        const y1 = item.rect[3];
        if (x0 < 0 || x1 > SCENE_W || x0 >= x1 || y0 < 0 || y1 > SCENE_H || y0 >= y1) {
          errors.push(prefix + '.rect out of 256x144 bounds or inverted: [' + item.rect.join(',') + ']');
        }
      }

      if (typeof item.label !== 'string' || item.label.trim().length === 0 || item.label.length > MAX_LABEL_LEN) {
        errors.push(prefix + '.label must be non-empty string <= ' + MAX_LABEL_LEN + ' chars');
      }
    }
  }
  return { ok: errors.length === 0, errors: errors };
}

function runSelfTest() {
  const dataPath = path.resolve(__dirname, '../../assets/data/scene_hotspots.json');
  const realData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const realRes = validate(realData);
  if (!realRes.ok) {
    console.error('FAIL scene_hotspots.json:', realRes.errors);
    process.exit(1);
  }
  console.log('PASS scene_hotspots.json');

  const invalidSamples = [
    {
      name: 'duplicate-id',
      data: {
        version: 1,
        scenes: {
          garden: [
            { id: 'pond', kind: 'decor', rect: [10, 10, 20, 20], label: 'Pond' },
            { id: 'pond', kind: 'decor', rect: [30, 30, 40, 40], label: 'Pond 2' }
          ]
        }
      }
    },
    {
      name: 'rect-out-of-bounds',
      data: {
        version: 1,
        scenes: {
          park: [{ id: 'gazebo', kind: 'decor', rect: [200, 100, 270, 140], label: 'Gazebo' }]
        }
      }
    },
    {
      name: 'bad-kind-and-long-label',
      data: {
        version: 1,
        scenes: {
          farm: [{ id: 'orchard', kind: 'unknown', rect: [10, 10, 50, 50], label: 'Very long label > 14' }]
        }
      }
    }
  ];

  for (let i = 0; i < invalidSamples.length; i += 1) {
    const res = validate(invalidSamples[i].data);
    if (res.ok) {
      console.error('FAIL invalid sample accepted:', invalidSamples[i].name);
      process.exit(1);
    }
    console.log('PASS rejected invalid sample: ' + invalidSamples[i].name);
  }

  const validSample = {
    version: 1,
    scenes: {
      room: [],
      garden: [{ id: 'pond', kind: 'decor', rect: [62, 126, 76, 132], label: 'Pond' }]
    }
  };
  const validRes = validate(validSample);
  if (!validRes.ok) {
    console.error('FAIL valid sample rejected:', validRes.errors);
    process.exit(1);
  }
  console.log('PASS accepted valid sample');
}

if (require.main === module) {
  runSelfTest();
}

module.exports = {
  KINDS: KINDS,
  validate: validate
};
