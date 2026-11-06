// Runs every tools/qa/ux-*.js scenario script in order and prints a summary table.
// Usage: node tools/qa/ux-all.js [p1|p2|...]   (no argument = all). Exit code 1 if any script fails.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const filter = (process.argv[2] || '').toLowerCase();
const files = fs.readdirSync(__dirname).filter(f => /^ux-p\d+-.*\.js$/.test(f) && (!filter || f.startsWith('ux-' + filter + '-'))).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 180000 });
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + f);
  if (!ok) console.log((r.stdout + r.stderr).split('\n').filter(l => /FAIL|Error|error/.test(l)).slice(0, 15).map(l => '  ' + l).join('\n'));
}
console.log(files.length + ' scripts, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
