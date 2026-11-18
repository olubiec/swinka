'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..', '..');
const WEATHER_JSON_PATH = path.join(ROOT, 'assets', 'data', 'weather.json');
const WEATHER_JS_PATH = path.join(ROOT, 'web', 'home', 'lib', 'weather.js');

const Weather = require(WEATHER_JS_PATH);
const weatherData = JSON.parse(fs.readFileSync(WEATHER_JSON_PATH, 'utf8'));

function createMockCtx() {
  const calls = {
    save: 0,
    restore: 0,
    fillRect: 0,
    beginPath: 0,
    moveTo: 0,
    lineTo: 0,
    stroke: 0,
    fillStyles: [],
    strokeStyles: [],
    alphas: []
  };
  let _fillStyle = '#000000';
  let _strokeStyle = '#000000';
  let _globalAlpha = 1;

  const ctx = {
    get fillStyle() { return _fillStyle; },
    set fillStyle(v) { _fillStyle = v; calls.fillStyles.push(v); },
    get strokeStyle() { return _strokeStyle; },
    set strokeStyle(v) { _strokeStyle = v; calls.strokeStyles.push(v); },
    get globalAlpha() { return _globalAlpha; },
    set globalAlpha(v) { _globalAlpha = v; calls.alphas.push(v); },
    lineWidth: 1,
    save() { calls.save++; },
    restore() { calls.restore++; },
    fillRect() { calls.fillRect++; },
    beginPath() { calls.beginPath++; },
    moveTo() { calls.moveTo++; },
    lineTo() { calls.lineTo++; },
    stroke() { calls.stroke++; }
  };

  return { ctx, calls };
}

function totalCtxCalls(calls) {
  return calls.save + calls.restore + calls.fillRect + calls.beginPath +
    calls.moveTo + calls.lineTo + calls.stroke;
}

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log('PASS', name);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error('FAIL', name, err && err.stack ? err.stack : err);
  }
}

// W1: deterministic
test('W1 deterministic', () => {
  const s1 = Weather.stateFor('2026-11-18', 'outdoor', {}, weatherData);
  const s2 = Weather.stateFor('2026-11-18', 'outdoor', {}, weatherData);
  assert.deepStrictEqual(s1, s2);
  assert.strictEqual(s1.outdoor, true);
  assert.ok(['clear', 'overcast', 'rain'].includes(s1.type));

  const sDate = Weather.stateFor(new Date('2026-11-18T12:00:00Z'), 'outdoor', {}, weatherData);
  assert.strictEqual(sDate.type, s1.type);
  assert.strictEqual(sDate.seed, s1.seed);

  const seenTypes = new Set();
  for (let day = 1; day <= 30; day++) {
    const key = '2026-11-' + String(day).padStart(2, '0');
    const st = Weather.stateFor(key, 'outdoor', {}, weatherData);
    seenTypes.add(st.type);
  }
  assert.ok(seenTypes.size >= 2, 'Expected multiple weather types over 30 days, got: ' + Array.from(seenTypes).join(','));
});

// W2: indoors-none
test('W2 indoors-none', () => {
  for (const kind of ['indoor', 'room', '', null, undefined]) {
    const st = Weather.stateFor('2026-11-18', kind, {}, weatherData);
    assert.deepStrictEqual(st, { type: 'none', outdoor: false, seed: 0, config: null });

    const { ctx, calls } = createMockCtx();
    Weather.draw(ctx, st, 1000, 256, 144);
    assert.strictEqual(totalCtxCalls(calls), 0);
  }
});

// W3: rain-draws-streaks
test('W3 rain-draws-streaks', () => {
  let rainState = null;
  for (let i = 0; i < 200; i++) {
    const st = Weather.stateFor('seed-' + i, 'outdoor', {}, weatherData);
    if (st.type === 'rain') {
      rainState = st;
      break;
    }
  }
  assert.ok(rainState, 'Expected to find a rain state within 200 seeds');

  const { ctx, calls } = createMockCtx();
  Weather.draw(ctx, rainState, 1500, 256, 144);

  const rainCfg = weatherData.types.rain;
  assert.ok(calls.fillRect >= 1, 'Expected tint fillRect');
  assert.ok(calls.fillStyles.includes(rainCfg.tintColor), 'Expected tintColor from weather.json');
  assert.strictEqual(calls.moveTo, rainCfg.streakCount, 'moveTo count should match streakCount');
  assert.strictEqual(calls.lineTo, rainCfg.streakCount, 'lineTo count should match streakCount');
  assert.ok(calls.stroke >= 1, 'Expected stroke call(s)');
  assert.ok(calls.strokeStyles.includes(rainCfg.streakColor), 'Expected streakColor from weather.json');

  // Clear state should draw nothing
  let clearState = null;
  for (let i = 0; i < 200; i++) {
    const st = Weather.stateFor('clear-seed-' + i, 'outdoor', {}, weatherData);
    if (st.type === 'clear') {
      clearState = st;
      break;
    }
  }
  assert.ok(clearState, 'Expected to find a clear state');
  const clearMock = createMockCtx();
  Weather.draw(clearMock.ctx, clearState, 1500, 256, 144);
  assert.strictEqual(totalCtxCalls(clearMock.calls), 0);
});

// W4: cost
test('W4 cost', () => {
  let rainState = null;
  for (let i = 0; i < 200; i++) {
    const st = Weather.stateFor('cost-' + i, 'outdoor', {}, weatherData);
    if (st.type === 'rain') {
      rainState = st;
      break;
    }
  }
  assert.ok(rainState);
  const { ctx } = createMockCtx();
  const t0 = performance.now();
  for (let f = 0; f < 1000; f++) {
    Weather.draw(ctx, rainState, f * 16, 256, 144);
  }
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 150, `Expected 1000 frames < 150ms, took ${elapsed.toFixed(2)}ms`);
});

// W5: settings-off
test('W5 settings-off', () => {
  for (const settings of [{ weatherEnabled: false }, { weather: false }]) {
    const st = Weather.stateFor('2026-11-18', 'outdoor', settings, weatherData);
    assert.deepStrictEqual(st, { type: 'none', outdoor: true, disabled: true, seed: 0, config: null });

    const { ctx, calls } = createMockCtx();
    Weather.draw(ctx, st, 2000, 256, 144);
    assert.strictEqual(totalCtxCalls(calls), 0);
  }
});

// W6: bad-input
test('W6 bad-input', () => {
  assert.doesNotThrow(() => {
    Weather.stateFor(NaN, 'outdoor', null, null);
    Weather.stateFor(undefined, 'outdoor', undefined, undefined);
    Weather.stateFor(new Date('invalid'), 'outdoor', {}, weatherData);
    Weather.stateFor({}, 'outdoor', {}, {});

    const st = Weather.stateFor('2026-11-18', 'outdoor', {}, weatherData);
    Weather.draw(null, st, 1000, 256, 144);
    Weather.draw(undefined, st, 1000, 256, 144);

    const { ctx } = createMockCtx();
    Weather.draw(ctx, null, 1000, 256, 144);
    Weather.draw(ctx, st, NaN, 256, 144);
    Weather.draw(ctx, st, -500, 0, -10);
    Weather.draw(ctx, st, Infinity, NaN, NaN);
  });
});

// W7: no-state-mutation
test('W7 no-state-mutation', () => {
  const settings = { weatherEnabled: true, nested: { a: 1 } };
  const dataCopy = JSON.parse(JSON.stringify(weatherData));
  const settingsBefore = JSON.stringify(settings);
  const dataBefore = JSON.stringify(dataCopy);

  let rainState = null;
  for (let i = 0; i < 200; i++) {
    const st = Weather.stateFor('mut-' + i, 'outdoor', settings, dataCopy);
    if (st.type === 'rain') {
      rainState = st;
      break;
    }
  }
  assert.ok(rainState);
  const stateBefore = JSON.stringify(rainState);
  const { ctx } = createMockCtx();
  Weather.draw(ctx, rainState, 1234, 256, 144);

  assert.strictEqual(JSON.stringify(settings), settingsBefore);
  assert.strictEqual(JSON.stringify(dataCopy), dataBefore);
  assert.strictEqual(JSON.stringify(rainState), stateBefore);
});

// W8: data-valid
test('W8 data-valid', () => {
  assert.strictEqual(weatherData.version, 1);
  assert.ok(Array.isArray(weatherData.outdoorScenes) && weatherData.outdoorScenes.length > 0);
  const types = weatherData.types;
  assert.ok(types && typeof types === 'object');
  let sum = 0;
  for (const key of Object.keys(types)) {
    const w = types[key].weight;
    assert.strictEqual(typeof w, 'number');
    assert.ok(w >= 0 && w <= 1, `weight for ${key} out of 0..1: ${w}`);
    sum += w;
  }
  assert.ok(Math.abs(sum - 1) < 1e-6, `Expected weights sum to 1, got ${sum}`);
});

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  process.exitCode = 1;
}
