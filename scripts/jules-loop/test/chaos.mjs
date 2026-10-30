// Symulacja pełnej pętli na atrapach gh i Jules API.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ORCH = process.env.ORCH || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'orchestrator.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jl-'));
const WORLD = path.join(tmp, 'world.json');
fs.mkdirSync(path.join(tmp, 'tasks'), { recursive: true });
fs.chmodSync(path.join(HERE, 'bin/gh'), 0o755);

const fresh = () => ({ issues: [], comments: [], nextIssue: 1, labels: [], prs: {}, sessions: {}, nextPr: 101, nextSession: 1000,
  main: { sha: 'main0' }, mainCounter: 0, mergedOrder: [], checksBySha: {}, runsBySha: {}, mainRuns: {}, dispatched: [], variables: {}, calls: [], sent: [] });
const rd = () => JSON.parse(fs.readFileSync(WORLD, 'utf8'));
const wr = (w) => fs.writeFileSync(WORLD, JSON.stringify(w, null, 1));
wr(fresh());

// --- mock Jules API ---
const server = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const w = rd(); const url = req.url.replace('/v1alpha', ''); const send = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); wr(w); };
    if (w.faultP && Math.random() < w.faultP) return send({ error: 'injected' }, 500);
    if (req.headers['x-goog-api-key'] !== 'test') return send({ error: 'bad key' }, 401);
    let m;
    if (req.method === 'GET' && url.startsWith('/sources')) return send({ sources: [{ name: 'sources/github/o/r', githubRepo: { owner: 'o', repo: 'r' } }] });
    if (req.method === 'POST' && url === '/sessions') {
      if (w.quota) return send({ error: 'quota exceeded' }, 429);
      const id = String(w.nextSession++); const j = JSON.parse(b);
      assert.equal(j.automationMode, 'AUTO_CREATE_PR'); assert.equal(j.sourceContext.source, 'sources/github/o/r');
      w.sessions[id] = { id, state: 'QUEUED', prompt: j.prompt, title: j.title, pr: null, messages: [] };
      return send({ name: `sessions/${id}`, id, state: 'QUEUED', url: `https://jules.google/session/${id}` });
    }
    if ((m = /^\/sessions\/(\d+):sendMessage$/.exec(url)) && req.method === 'POST') { w.sessions[m[1]].messages.push(JSON.parse(b).prompt); w.sent.push(m[1]); return send({}); }
    if ((m = /^\/sessions\/(\d+):approvePlan$/.exec(url))) return send({});
    if ((m = /^\/sessions\/(\d+)$/.exec(url)) && req.method === 'DELETE') { w.sessions[m[1]].state = 'DELETED'; w.deleted = (w.deleted || []).concat(m[1]); return send({}); }
    if ((m = /^\/sessions\/(\d+)$/.exec(url))) {
      const s = w.sessions[m[1]]; return send({ name: `sessions/${s.id}`, id: s.id, state: s.state, outputs: s.pr ? [{ pullRequest: { url: `https://github.com/o/r/pull/${s.pr}` } }] : [] });
    }
    send({ error: 'nf ' + url }, 404);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;



let clock = Date.parse('2026-10-28T10:00:00Z');
let SEED = +(process.env.SEED || 7); const rng = () => { SEED = (SEED * 1664525 + 1013904223) >>> 0; return SEED / 4294967296; };
const STEPS = +(process.env.STEPS || 400); const FAULT = +(process.env.FAULT || 0.05);
const tick = (extra = {}) => new Promise((resolve) => {
  const p = spawn('node', [ORCH], { cwd: tmp, env: { ...process.env, PATH: `${path.join(HERE, 'bin')}:${process.env.PATH}`, FAKE_WORLD: WORLD, SEED: String(SEED),
    GITHUB_REPOSITORY: 'o/r', JULES_API_KEY: 'test', JULES_API_BASE: `http://127.0.0.1:${PORT}/v1alpha`, LOOP_FAKE_NOW: new Date(clock).toISOString(), LOOP_AUTONOMOUS: 'on', LOOP_DAILY_BUDGET: '60', LOOP_RETRY_MS: '0', FAULT_P: String(process.env.FAULT_ON === '0' ? 0 : FAULT), ...extra } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => resolve({ code, out }));
});
let shaN = 0;
function makePr(w, s, conclusion) {
  const n = w.nextPr++; const sha = `sha${++shaN}`;
  const id = (/\[([^\]]+)\]/.exec(s.title) || [])[1] || 'X';
  const kind = (/^Zadanie ([A-Z])/.exec(s.prompt) || [])[1] || 'B';
  const fid = id.replace(/(\.\d)+$/, '');
  let files;
  if (kind === 'P') { const wn = id.slice(1); w.files = w.files || {}; files = [];
    for (let i = 1; i <= 3; i++) { const f = `tasks/W${wn}-0${i}-auto.md`; w.files[f] = { sha: `s${wn}${i}`, content: `# zadanie ${i}\nCel: ulepszenie ${wn}.${i}\nZmieniaj: src/W${wn}-0${i}.js, tests/W${wn}-0${i}.test.js\nWymagane: tests/W${wn}-0${i}.test.js\nWeryfikacja: npm test\n` }; files.push({ filename: f, status: 'added' }); } }
  else if (kind === 'R') files = [];
  else if (kind === 'T') files = [{ filename: `tests/${id}.test.js`, status: 'added' }];
  else if (kind === 'I') files = [{ filename: 'src/fix.js', status: 'modified' }];
  else files = [{ filename: `src/${fid}.js`, status: 'added' }, { filename: `tests/${fid}.test.js`, status: 'added' }];
  if (kind === 'P') { w.planFiles = w.planFiles || {}; w.planFiles[id] = files; }
  w.prs[n] = { number: n, state: 'open', merged: false, mergeable: true, mergeable_state: 'clean', title: s.title, head: { sha, ref: `jules/${id}` }, labels: [], files };
  w.checksBySha[sha] = [{ name: 'test', status: 'completed', conclusion }]; w.runsBySha[sha] = [{ id: +n, name: 'CI', status: 'completed', conclusion }];
  s.pr = n; s.state = 'COMPLETED';
}
function julesWorld() {
  const w = rd(); w.faultP = FAULT;
  for (const s of Object.values(w.sessions)) {
    if (['COMPLETED', 'DELETED', 'FAILED'].includes(s.state)) continue;
    const r = rng();
    if (s.state === 'AWAITING_USER_FEEDBACK') { if (s.messages.length && r < 0.8) { s.state = 'IN_PROGRESS'; } continue; }
    if (r < 0.55) makePr(w, s, rng() < 0.82 ? 'success' : 'failure');
    else if (r < 0.65) s.state = 'AWAITING_USER_FEEDBACK';
    else if (r < 0.70) s.state = 'FAILED';
    else if (r < 0.80) s.state = 'IN_PROGRESS';
    // reszta: zawieszona
  }
  // Jules "poprawia" czerwone PR-y po prośbie
  for (const pr of Object.values(w.prs)) if (pr.state === 'open' && !pr.merged && (w.checksBySha[pr.head.sha] || []).some((c) => c.conclusion === 'failure') && rng() < 0.4) {
    const sha = `sha${++shaN}`; pr.head.sha = sha; w.checksBySha[sha] = [{ name: 'test', status: 'completed', conclusion: 'success' }]; w.runsBySha[sha] = [{ id: +pr.number, name: 'CI', status: 'completed', conclusion: 'success' }]; }
  w.mainRuns[w.main.sha] = [{ id: 1, status: 'completed', conclusion: rng() < 0.88 ? 'success' : 'failure' }]; w.runsBySha[w.main.sha] = w.mainRuns[w.main.sha].map((x) => ({ ...x, name: 'CI' }));
  wr(w);
}
{ const w = rd(); w.files = { 'docs/GOALS.md': { sha: 'g', content: '# Cele\nGra przeglądarkowa.' } }; wr(w); }
const stat = { ticks: 0, nonzero: 0, crashes: 0, maxBody: 0, firstErrors: [] };
const stateOf = () => { const b = rd().issues[0]?.body || ''; const m = /<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(b); return m ? JSON.parse(m[1]) : null; };
const CRASH = /(TypeError|ReferenceError|SyntaxError|RangeError|Unhandled|\n\s+at .*\.mjs)/;
for (let i = 0; i < STEPS; i++) {
  clock += (12 + Math.floor(rng() * 25)) * 60e3;
  if (i % 3 === 0) julesWorld();
  const r = await tick(); stat.ticks++;
  if (r.code !== 0) { stat.nonzero++; if (stat.firstErrors.length < 5) stat.firstErrors.push(r.out.split('\n').slice(-4).join(' | ')); }
  if (CRASH.test(r.out)) { stat.crashes++; if (stat.firstErrors.length < 8) stat.firstErrors.push('CRASH: ' + r.out.slice(-400)); }
  const b = rd().issues[0]?.body || ''; stat.maxBody = Math.max(stat.maxBody, b.length);
}
// faza końcowa: bez awarii, pętla musi dalej iść
{ const w = rd(); w.faultP = 0; wr(w); }
const doneBefore = (stateOf()?.doneWaves || []).length;
for (let i = 0; i < 80; i++) { clock += 20 * 60e3; { const w = rd(); w.faultP = 0; wr(w); } julesWorldNoFault(); await tick({ FAULT_P: '0' }); }
function julesWorldNoFault() { const f = FAULT; const keep = f; julesWorld(); const w = rd(); w.faultP = 0; wr(w); }
const st = stateOf();
const pings = rd().comments.filter((c) => c.body.startsWith('@') && !c.body.startsWith('@jules')).length;
const needsHuman = (st?.tasks || []).filter((x) => x.status === 'needs-human').length;
const sessionsTotal = Object.keys(rd().sessions).length;
const merged = rd().mergedOrder.length;
console.log(JSON.stringify({ ...stat, doneWaves: (st?.doneWaves || []).length, doneBeforeRecovery: doneBefore, phase: st?.phase, wave: st?.wave, pings, needsHuman, sessionsTotal, mergedPRs: merged, simDays: ((clock - Date.parse('2026-10-28T10:00:00Z')) / 864e5).toFixed(1), paused: st?.paused }, null, 1));
const ok = stat.crashes === 0 && pings === 0 && needsHuman === 0 && stat.maxBody < 65000 && (st?.doneWaves || []).length > doneBefore && st && !st.paused;
console.log(ok ? '✅ CHAOS OK' : '❌ CHAOS FAIL');
server.close(); process.exit(ok ? 0 : 1);
