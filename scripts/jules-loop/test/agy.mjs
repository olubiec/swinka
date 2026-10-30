// Test backendu agy: orkiestrator + atrapa gh, bez Julesa. Runner "wykonuje" workflow przez modyfikację świata.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ORCH = path.join(HERE, '..', 'orchestrator.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-'));
const WORLD = path.join(tmp, 'world.json');
fs.mkdirSync(path.join(tmp, 'tasks'), { recursive: true });
fs.chmodSync(path.join(HERE, 'bin/gh'), 0o755);
const fresh = () => ({ issues: [], comments: [], nextIssue: 1, labels: [], prs: {}, nextPr: 101, main: { sha: 'main0' }, mainCounter: 0, mergedOrder: [],
  checksBySha: {}, runsBySha: {}, mainRuns: {}, dispatched: [], variables: {}, calls: [], agyRuns: [], agyDispatches: [] });
const rd = () => JSON.parse(fs.readFileSync(WORLD, 'utf8'));
const wr = (w) => fs.writeFileSync(WORLD, JSON.stringify(w, null, 1));
wr(fresh());

let clock = Date.parse('2026-10-28T10:00:00Z');
const advanceMin = (n) => { clock += n * 60e3; };
const tick = (extra = {}) => new Promise((resolve) => {
  const p = spawn('node', [ORCH], { cwd: tmp, env: { ...process.env, PATH: `${path.join(HERE, 'bin')}:${process.env.PATH}`, FAKE_WORLD: WORLD,
    GITHUB_REPOSITORY: 'o/r', LOOP_BACKEND: 'agy', JULES_API_KEY: '', LOOP_FAKE_NOW: new Date(clock).toISOString(), LOOP_REFRESH: 'off', LOOP_AUTONOMOUS: 'off', LOOP_PLAN: 'off', LOOP_TEST_WAVE: 'off', ...extra } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => resolve({ code, out }));
});
const T = (l) => console.log(`\n===== ${l} =====`);
const stateOf = () => JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(rd().issues[0].body)[1]);
let runId = 500, shaN = 0;
// "runner": zakończ wszystkie dispatche bez runu; mode=new -> PR, mode=amend -> nowy commit w PR
function runnerWorks(ci = 'success') {
  const w = rd();
  for (const d of w.agyDispatches.filter((x) => !x.done)) {
    d.done = true; const sha = `sha${++shaN}`; const id = /\[([^\]]+)\]/.exec(d.title)[1];
    w.agyRuns.push({ id: ++runId, display_title: `agy [${d.sid}] ${d.title}`, status: 'completed', conclusion: 'success' });
    if (d.mode === 'new') {
      const n = w.nextPr++;
      w.prs[n] = { number: n, state: 'open', merged: false, mergeable: true, mergeable_state: 'clean', title: d.title, head: { sha, ref: `agy/${d.sid}` }, labels: [], files: [{ filename: `src/${id}.js` }, { filename: `tests/${id}.test.js` }] };
      w.checksBySha[sha] = [{ name: 'test', status: 'completed', conclusion: ci }]; w.runsBySha[sha] = [{ id: n, name: 'CI', status: 'completed', conclusion: ci }];
    } else {
      const pr = Object.values(w.prs).find((x) => x.head.ref === `agy/${d.sid}`); pr.head.sha = sha;
      w.checksBySha[sha] = [{ name: 'test', status: 'completed', conclusion: 'success' }]; w.runsBySha[sha] = [{ id: pr.number, name: 'CI', status: 'completed', conclusion: 'success' }];
    }
  }
  wr(w);
}
const wf = (name, own) => fs.writeFileSync(path.join(tmp, 'tasks', name), `# ${name}\nCel: coś.\nZmieniaj: ${own}\nWeryfikacja: npm test\n`);

T('1. start: bez JULES_API_KEY, dispatch z promptem (base64) i tytułem');
wf('W1-01-a.md', 'src/W1-01.js, tests/W1-01.test.js'); wf('W1-02-b.md', 'src/W1-02.js, tests/W1-02.test.js');
let r = await tick(); assert.equal(r.code, 0, r.out);
let w = rd(); assert.equal(w.agyDispatches.length, 2, 'dwa dispatche');
assert.ok(w.agyDispatches.every((d) => d.mode === 'new' && /^a[0-9a-z]{9}[0-9a-f]{4}$/.test(d.sid)), 'format sid');
assert.ok(/\[W1-01\]/.test(w.agyDispatches[0].title));
assert.ok(Buffer.from(w.agyDispatches[0].prompt_b64, 'base64').toString().includes('TRYB AUTONOMICZNY'), 'prompt ma tryb autonomiczny');
assert.equal(w.calls.filter((c) => c.includes('dispatches')).length, 2);

T('2. brak runu w ciągu 10 min: QUEUED, po 10 min: FAILED -> ponowna próba');
advanceMin(5); r = await tick(); assert.equal(r.code, 0, r.out);
assert.equal(rd().agyDispatches.length, 2, 'jeszcze nie restartuje');
{ const w2 = rd(); w2.agyRuns.push({ id: 1, display_title: `agy [${w2.agyDispatches[0].sid}] x`, status: 'in_progress' }); wr(w2); }
advanceMin(5); r = await tick(); assert.equal(r.code, 0, r.out);

T('3. runner kończy: PR wykryty po gałęzi agy/<sid>, CI zielone -> merge');
runnerWorks(); advanceMin(5); r = await tick(); assert.equal(r.code, 0, r.out);
advanceMin(2); r = await tick(); assert.equal(r.code, 0, r.out);
w = rd(); assert.equal(w.mergedOrder.length, 2, `oba PR scalone: ${w.mergedOrder}\n${r.out}`);

T('4. czerwone CI: nudge = nowy dispatch mode=amend (nie komentarz @jules)');
wf('W2-01-c.md', 'src/W2-01.js, tests/W2-01.test.js');
advanceMin(5); r = await tick(); assert.equal(r.code, 0, r.out); // domknięcie fali 1 (CI main) może wymagać ticków
for (let i = 0; i < 6 && !rd().agyDispatches.some((d) => /W2-01/.test(d.title)); i++) { const w3 = rd(); w3.mainRuns[w3.main.sha] = [{ id: 1, status: 'completed', conclusion: 'success' }]; w3.runsBySha[w3.main.sha] = [{ id: 1, name: 'CI', status: 'completed', conclusion: 'success' }]; wr(w3); advanceMin(8); r = await tick(); }
assert.ok(rd().agyDispatches.some((d) => /W2-01/.test(d.title)), `start W2-01\n${r.out}`);
runnerWorks('failure'); advanceMin(5); r = await tick(); assert.equal(r.code, 0, r.out);
advanceMin(15); r = await tick(); assert.equal(r.code, 0, r.out);
w = rd(); const amend = w.agyDispatches.find((d) => d.mode === 'amend');
assert.ok(amend, `jest dispatch amend\n${r.out}`);
assert.ok(/CI jest czerwone/.test(Buffer.from(amend.prompt_b64, 'base64').toString()), 'prośba o poprawkę z logiem CI');
assert.ok(!w.comments.some((c) => /^@jules /.test(c.body)), 'żadnych komentarzy @jules');
runnerWorks(); advanceMin(5); r = await tick(); advanceMin(2); r = await tick(); assert.equal(r.code, 0, r.out);
assert.equal(rd().mergedOrder.length, 3, 'po poprawce PR scalony');

console.log('\n✅ TESTY BACKENDU AGY PRZESZŁY');
process.exit(0);
