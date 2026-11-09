'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Ensure CommonJS environment setup
const CuyRoomGeometry = require('../../web/home/features/places/room-geometry.js');
const CuyScenes = require('../../web/home/features/places/scenes.js');

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

// RS1: salon (12x7) def.size = [192,112] and def.wallH = 32
test('RS1: salon (12x7) size and wallH', () => {
  const stateSalon = {
    rooms: {
      layouts: {
        salon: { cols: 12, rows: 7, wallRows: 2, items: [] }
      }
    }
  };
  const defSalon = CuyScenes.def('salon', 'day', stateSalon);
  assert.deepStrictEqual(defSalon.size, [192, 112], 'RS1: salon size must be [192, 112]');
  assert.strictEqual(defSalon.wallH, 32, 'RS1: salon wallH must be 32');

  // Shorthand def(sceneId, state)
  const defShort = CuyScenes.def('salon', stateSalon);
  assert.deepStrictEqual(defShort.size, [192, 112], 'RS1 shorthand: salon size must be [192, 112]');
  assert.strictEqual(defShort.wallH, 32, 'RS1 shorthand: salon wallH must be 32');
});

// RS2: a 10x6 pig room gives [160,96] and wallH from its wallRows
test('RS2: 10x6 pig room size and wallH from wallRows', () => {
  const statePig = {
    rooms: {
      layouts: {
        'pig:pip': { cols: 10, rows: 6, wallRows: 3, items: [] }
      }
    }
  };
  const defPig = CuyScenes.def('pig:pip', 'day', statePig);
  assert.deepStrictEqual(defPig.size, [160, 96], 'RS2: 10x6 pig room size must be [160, 96]');
  assert.strictEqual(defPig.wallH, 3 * 16, 'RS2: wallH must be wallRows * 16 = 48');

  // Also via pigRooms mapping
  const statePigRooms = {
    rooms: {
      pigRooms: [{ roomId: 'room_koko', pigId: 'koko' }],
      layouts: {
        room_koko: { cols: 10, rows: 6, wallRows: 2, items: [] }
      }
    }
  };
  const defKoko = CuyScenes.def('pig:koko', null, statePigRooms);
  assert.deepStrictEqual(defKoko.size, [160, 96], 'RS2 pigRooms: size must be [160, 96]');
  assert.strictEqual(defKoko.wallH, 32, 'RS2 pigRooms: wallH must be 32');
});

// RS3: a floor item at cell (2,3) of size 3x2 has y = (3+2)*16 = 80 >= wallH and equals what cellToPx returns
test('RS3: floor item at cell (2,3) of size 3x2 matches cellToPx', () => {
  const layoutWithItem = {
    cols: 12,
    rows: 7,
    wallRows: 2,
    items: [
      { id: 'sofa', itemId: 'sofa', x: 2, y: 3, w: 3, h: 2 }
    ]
  };
  const stateItem = {
    rooms: {
      layouts: {
        salon: layoutWithItem
      }
    }
  };
  const things = CuyScenes.placedThings(stateItem, 'salon');
  assert.strictEqual(things.length, 1, 'RS3: expected 1 placed thing');
  const it = things[0];

  const expectedPx = CuyRoomGeometry.cellToPx(layoutWithItem, 2, 3, 3, 2);
  const defSalon = CuyScenes.def('salon', null, stateItem);

  assert.strictEqual(it.y, (3 + 2) * 16, 'RS3: item y must equal (3+2)*16 = 80');
  assert.strictEqual(it.y, expectedPx.y, 'RS3: item y must equal cellToPx.y');
  assert.strictEqual(it.x, expectedPx.x, 'RS3: item x must equal cellToPx.x');
  assert(it.y >= defSalon.wallH, `RS3: item y (${it.y}) must be >= wallH (${defSalon.wallH})`);
});

// RS4: def.walk is inside def.size
test('RS4: def.walk is strictly inside def.size', () => {
  const stateSalon = {
    rooms: {
      layouts: {
        salon: { cols: 12, rows: 7, wallRows: 2, items: [] }
      }
    }
  };
  const statePig = {
    rooms: {
      layouts: {
        'pig:pip': { cols: 10, rows: 6, wallRows: 3, items: [] }
      }
    }
  };

  const defSalon = CuyScenes.def('salon', null, stateSalon);
  const defPig = CuyScenes.def('pig:pip', null, statePig);

  for (const [label, def] of [['salon', defSalon], ['pig:pip', defPig]]) {
    const [wx0, wy0, wx1, wy1] = def.walk;
    const [sw, sh] = def.size;
    assert(wx0 >= 0, `RS4: ${label} walk wx0 >= 0`);
    assert(wy0 >= 0, `RS4: ${label} walk wy0 >= 0`);
    assert(wx1 <= sw, `RS4: ${label} walk wx1 (${wx1}) <= size width (${sw})`);
    assert(wy1 <= sh, `RS4: ${label} walk wy1 (${wy1}) <= size height (${sh})`);
    assert(wx0 < wx1, `RS4: ${label} walk wx0 (${wx0}) < wx1 (${wx1})`);
    assert(wy0 < wy1, `RS4: ${label} walk wy0 (${wy0}) < wy1 (${wy1})`);
    if (def.wallH !== undefined) {
      assert(wy0 >= def.wallH, `RS4: ${label} walk wy0 (${wy0}) >= wallH (${def.wallH})`);
    }
  }
});

// RS5: garden/park/farm/market def equals the place_scenes.json values (size, walk, depth_scale)
test('RS5: outdoor scenes match place_scenes.json values', () => {
  const placeScenesPath = path.resolve(__dirname, '../../assets/data/place_scenes.json');
  const placeScenes = JSON.parse(fs.readFileSync(placeScenesPath, 'utf8'));
  const outdoorScenes = ['garden', 'park', 'farm', 'market'];

  for (const sceneId of outdoorScenes) {
    const def = CuyScenes.def(sceneId);
    const jsonDef = placeScenes.scenes[sceneId];
    assert(jsonDef, `RS5: ${sceneId} missing in place_scenes.json`);

    assert.deepStrictEqual(def.size, jsonDef.size, `RS5: ${sceneId} size mismatch`);
    assert.deepStrictEqual(def.walk, jsonDef.walk, `RS5: ${sceneId} walk mismatch`);
    const ds = def.depth_scale || def.depthScale;
    assert.deepStrictEqual(ds, jsonDef.depth_scale, `RS5: ${sceneId} depth_scale mismatch`);
    assert.strictEqual(def.wallH, undefined, `RS5: outdoor scene ${sceneId} must not have wallH`);
  }
});

// RS6: no layout in state => fallback size [192,112]
test('RS6: no layout in state falls back to [192, 112]', () => {
  // Case A: null state
  const defNoState = CuyScenes.def('salon');
  assert.deepStrictEqual(defNoState.size, [192, 112], 'RS6: fallback size without state must be [192, 112]');
  assert.strictEqual(defNoState.wallH, 32, 'RS6: fallback wallH without state must be 32');
  assert.deepStrictEqual(defNoState.walk, [8, 40, 184, 110], 'RS6: fallback walk without state must be [8, 40, 184, 110]');

  // Case B: empty state
  const defEmpty = CuyScenes.def('salon', null, {});
  assert.deepStrictEqual(defEmpty.size, [192, 112], 'RS6: fallback size with empty state must be [192, 112]');
  assert.strictEqual(defEmpty.wallH, 32, 'RS6: fallback wallH with empty state must be 32');

  // Case C: unknown room without layout
  const defUnknown = CuyScenes.def('pig:nobody', null, {});
  assert.deepStrictEqual(defUnknown.size, [192, 112], 'RS6: fallback size for unknown room must be [192, 112]');
  assert.strictEqual(defUnknown.wallH, 32, 'RS6: fallback wallH for unknown room must be 32');
});

console.log(`\nAll ${passed}/${total} RS tests passed.`);
