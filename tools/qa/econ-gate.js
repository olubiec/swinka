// E8 economy regression gate: runs econ-sim.js and fails (exit 1) when a profile misses a threshold.
// Thresholds (plan D3): the first record is bought within 2 days, the first player within 5 days, for every profile.
// The numbers are the current values; this script never changes prices or economy data.
// Usage (repo root): node tools/qa/econ-gate.js [--days 365] [--seed 1]
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const SIM = path.join(__dirname, 'econ-sim.js');
const LIMITS = { firstRecordDay: 2, firstPlayerDay: 5 };

const args = process.argv.slice(2);
const pass = (name) => { const i = args.indexOf(name); return i < 0 ? [] : [name, args[i + 1]]; };
let out;
try {
  out = execFileSync(process.execPath, [SIM, ...pass('--days'), ...pass('--seed')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.error('econ-gate: econ-sim.js failed to run: ' + (e.stderr || e.message));
  process.exit(1);
}

let report;
try {
  report = JSON.parse(out);
} catch (e) {
  console.error('econ-gate: econ-sim.js did not print JSON: ' + e.message);
  process.exit(1);
}

const failures = [];
const profiles = Object.entries(report.profiles || {});
if (profiles.length === 0) failures.push('no profiles in econ-sim output');
for (const [name, p] of profiles) {
  const checks = [
    ['firstRecordDay', p.firstRecordDay, LIMITS.firstRecordDay],
    ['firstPlayerDay', p.firstPlayerDay, LIMITS.firstPlayerDay],
  ];
  for (const [key, value, max] of checks) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      failures.push(`${name}: ${key} is not a day (${value})`);
    } else if (value > max) {
      failures.push(`${name}: ${key} = ${value}, limit ${max}`);
    }
    console.log(`${value <= max ? 'ok  ' : 'FAIL'} ${name} ${key} = ${value} (<= ${max})`);
  }
}

if (failures.length) {
  console.error('econ-gate: ' + failures.length + ' threshold(s) missed:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(`econ-gate: OK (${profiles.length} profiles, seed ${report.seed}, ${report.days} days)`);
