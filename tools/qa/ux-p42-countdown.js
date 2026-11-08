'use strict';

const path = require('path');
const assert = require('assert');

const featurePath = path.resolve(__dirname, '../../web/home/features/pigs/feature.js');
const pigs = require(featurePath);

const formatRemaining = typeof pigs === 'function' ? pigs : (pigs.formatRemaining || pigs);

if (typeof formatRemaining !== 'function') {
  console.error('FAIL: formatRemaining could not be required from ' + featurePath);
  process.exit(1);
}

// D1: 100.5-days -> 100d 12h 0m
{
  const ms = 100.5 * 24 * 60 * 60 * 1000;
  const result = formatRemaining(ms);
  assert.strictEqual(result, '100d 12h 0m', `D1 failed: expected "100d 12h 0m", got "${result}"`);
  console.log('PASS D1: 100.5-days -> 100d 12h 0m');
}

// D2: 3h5m -> 3h 5m
{
  const ms = (3 * 60 + 5) * 60 * 1000;
  const result = formatRemaining(ms);
  assert.strictEqual(result, '3h 5m', `D2 failed: expected "3h 5m", got "${result}"`);
  console.log('PASS D2: 3h5m -> 3h 5m');
}

// D3: 59s -> <1m
{
  const ms = 59 * 1000;
  const result = formatRemaining(ms);
  assert.strictEqual(result, '<1m', `D3 failed: expected "<1m", got "${result}"`);
  console.log('PASS D3: 59s -> <1m');
}

// D4: zero-and-negative -> Ready
{
  const cases = [0, -1, -500, -86400000, -Infinity];
  for (const c of cases) {
    const result = formatRemaining(c);
    assert.strictEqual(result, 'Ready', `D4 failed for ${c}: expected "Ready", got "${result}"`);
  }
  console.log('PASS D4: zero-and-negative -> Ready');
}

// D5: no-dot-no-nan over 1000 random inputs
{
  const specialInputs = [NaN, null, undefined, 'abc', Infinity, -Infinity, 0.5, 0.00001, 100.25, -0.1, {}, []];
  for (const val of specialInputs) {
    const res = formatRemaining(val);
    assert.strictEqual(typeof res, 'string', `D5 type failed for ${val}`);
    assert.ok(!res.includes('.'), `D5 dot found in "${res}" for input ${val}`);
    assert.ok(!res.includes('NaN'), `D5 NaN found in "${res}" for input ${val}`);
  }

  for (let i = 0; i < 1000; i++) {
    let val;
    const r = Math.random();
    if (r < 0.15) {
      val = -Math.random() * 1e8;
    } else if (r < 0.3) {
      val = Math.random() * 60000;
    } else if (r < 0.5) {
      val = Math.random() * 3600000;
    } else if (r < 0.7) {
      val = Math.random() * 86400000;
    } else if (r < 0.85) {
      val = Math.random() * 1e10;
    } else {
      val = Math.random() * 1e7 + 0.987654;
    }

    const res = formatRemaining(val);
    assert.strictEqual(typeof res, 'string', `D5 type failed for random ${val}`);
    assert.ok(!res.includes('.'), `D5 dot found in "${res}" for random ${val}`);
    assert.ok(!res.includes('NaN'), `D5 NaN found in "${res}" for random ${val}`);
  }
  console.log('PASS D5: no-dot-no-nan over 1000 random inputs');
}

// D6: rollover 23h59m60s boundaries
{
  // Just before 24h: 23h 59m 59s -> 23h 59m
  const before24h = ((23 * 60 + 59) * 60 + 59) * 1000 + 999;
  assert.strictEqual(formatRemaining(before24h), '23h 59m', 'D6 failed before 24h');

  // At exactly 24h (23h 59m 60s): 1d 0h 0m
  const at24h = 24 * 60 * 60 * 1000;
  assert.strictEqual(formatRemaining(at24h), '1d 0h 0m', 'D6 failed at 24h');

  // Just before 1h: 59m 59s -> 59m
  const before1h = (59 * 60 + 59) * 1000 + 999;
  assert.strictEqual(formatRemaining(before1h), '59m', 'D6 failed before 1h');

  // At exactly 1h (59m 60s): 1h 0m
  const at1h = 60 * 60 * 1000;
  assert.strictEqual(formatRemaining(at1h), '1h 0m', 'D6 failed at 1h');

  // Just before 1m: 59s -> <1m
  const before1m = 59 * 1000 + 999;
  assert.strictEqual(formatRemaining(before1m), '<1m', 'D6 failed before 1m');

  // At exactly 1m (60s): 1m
  const at1m = 60 * 1000;
  assert.strictEqual(formatRemaining(at1m), '1m', 'D6 failed at 1m');

  // Just before 48h: 1d 23h 59m 59s -> 1d 23h 59m
  const before48h = ((47 * 60 + 59) * 60 + 59) * 1000 + 999;
  assert.strictEqual(formatRemaining(before48h), '1d 23h 59m', 'D6 failed before 48h');

  // At exactly 48h (1d 23h 59m 60s): 2d 0h 0m
  const at48h = 48 * 60 * 60 * 1000;
  assert.strictEqual(formatRemaining(at48h), '2d 0h 0m', 'D6 failed at 48h');

  console.log('PASS D6: rollover 23h59m60s boundaries');
}

console.log('All countdown format checks passed.');
