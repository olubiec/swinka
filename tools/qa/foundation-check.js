// Checks a research ("foundation") document written by an R package.
// Usage: node tools/qa/foundation-check.js <file.md> <min numbered sections>
// Passes when: file exists, 1500..16000 chars, has N headings "## <number>.", no TODO/TBD left.
const fs = require('fs');
const [file, minArg] = process.argv.slice(2);
const min = parseInt(minArg || '4', 10);
if (!file || !fs.existsSync(file)) { console.log('FAIL missing ' + file); process.exit(1); }
const t = fs.readFileSync(file, 'utf8');
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
if (t.length < 1500) fail('too short (' + t.length + ' chars)');
if (t.length > 16000) fail('too long (' + t.length + ' chars), max 16000');
const heads = (t.match(/^## \d+\./gm) || []).length;
if (heads < min) fail('numbered sections ' + heads + ' < ' + min);
if (/\b(TODO|TBD)\b/.test(t)) fail('TODO/TBD left in text');
console.log(bad ? 'FOUNDATION CHECK FAILED' : 'FOUNDATION OK (' + heads + ' sections, ' + t.length + ' chars)');
process.exit(bad ? 1 : 0);
