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
const tick = (extra = {}) => new Promise((resolve) => {
  const p = spawn('node', [ORCH], { cwd: tmp, env: { ...process.env, PATH: `${path.join(HERE, 'bin')}:${process.env.PATH}`, FAKE_WORLD: WORLD,
    GITHUB_REPOSITORY: 'o/r', JULES_API_KEY: 'test', JULES_API_BASE: `http://127.0.0.1:${PORT}/v1alpha`, LOOP_FAKE_NOW: new Date(clock).toISOString(), LOOP_REFRESH: 'off', LOOP_AUTONOMOUS: 'off', ...extra } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => resolve({ code, out }));
});
const advanceMin = (n) => { clock += n * 60e3; };

// --- pomocnicze: świat po stronie "Jules/GitHub" ---
let shaN = 0;
function julesFinishes(fn) {
  const w = rd();
  for (const s of Object.values(w.sessions)) if (s.state === 'QUEUED' || s.state === 'IN_PROGRESS') {
    const n = w.nextPr++; const sha = `sha${++shaN}`;
    const isTest = /^Zadanie T/.test(s.prompt); const isI = /^Zadanie I/.test(s.prompt); const isR = /^Zadanie R/.test(s.prompt); const isP = /^Zadanie P/.test(s.prompt);
    const id = (/\[([^\]]+)\]/.exec(s.title) || [])[1];
    const fid = id.replace(/\.\d$/, '');
    const files = isP ? ((w.planFiles || {})[id] || []) : isR ? ((w.refreshFiles || {})[(/\[([^\]]+)\]/.exec(s.title) || [])[1]] || []) : isTest ? [{ filename: `tests/${id}.test.js`, status: 'added' }] : isI ? [{ filename: 'src/fix.js', status: 'modified' }]
      : [{ filename: `src/${fid}.js`, status: 'added' }, { filename: `tests/${fid}.test.js`, status: 'added' }, ...((w.extraFiles || {})[id] || [])];
    w.prs[n] = { number: n, state: 'open', merged: false, mergeable: true, mergeable_state: 'clean', title: s.title, head: { sha, ref: `jules/${id}` }, labels: [], files };
    w.checksBySha[sha] = [{ name: 'test', status: 'completed', conclusion: fn(s, n, id) }]; w.runsBySha[sha] = [{ id: +n, name: 'CI', status: 'completed', conclusion: fn(s, n, id) }];
    s.pr = n; s.state = 'COMPLETED';
  }
  wr(w);
}
const setChecks = (prN, conclusion, newSha) => { const w = rd(); const pr = w.prs[prN]; if (newSha) { pr.head.sha = newSha; } w.checksBySha[pr.head.sha] = [{ name: 'test', status: 'completed', conclusion }]; w.runsBySha[pr.head.sha] = [{ id: +prN, name: 'CI', status: 'completed', conclusion }]; wr(w); };
const mainCI = (conclusion) => { const w = rd(); w.mainRuns[w.main.sha] = [{ id: 1, status: 'completed', conclusion }]; w.runsBySha[w.main.sha] = [{ id: 1, name: 'CI', status: 'completed', conclusion }]; wr(w); };
const wf = (name, own) => fs.writeFileSync(path.join(tmp, 'tasks', name), `# ${name}\nCel: coś.\nZmieniaj: ${own}\nWeryfikacja: npm test\n`);
const body = () => rd().issues[0]?.body.split('<!--')[0] || '';
const prsOf = (...ns) => ns.map((n) => rd().prs[n]);
const T = (label) => console.log(`\n===== ${label} =====`);

// ---------- Scenariusz 1: walidacja własności plików ----------
T('1. fala z konfliktem plików jest odrzucona bez zużycia sesji');
wf('W1-01-a.md', 'src/a.js, src/shared/*'); wf('W1-02-b.md', 'src/shared/util.js');
let r = await tick(); console.log(r.out);
assert.equal(r.code, 0); assert.equal(Object.keys(rd().sessions).length, 0);
assert.ok(/Konflikt plików/.test(r.out));

// ---------- Scenariusz 2: pełna fala ----------
T('2. poprawna fala W1 (2 zadania) + W2 (1 zadanie) już w repo');
wf('W1-02-b.md', 'src/b.js'); wf('W1-01-a.md', 'src/W1-01.js, tests/W1-01.test.js'); fs.writeFileSync(path.join(tmp, 'tasks', 'W1-02-b.md'), '# b\nZmieniaj: src/W1-02.js, tests/W1-02.test.js\n');
wf('W2-01-c.md', 'src/W2-01.js, tests/W2-01.test.js');
r = await tick(); console.log(r.out);
assert.equal(Object.keys(rd().sessions).length, 2, 'start 2 sesji');

advanceMin(8);
julesFinishes((s, n, id) => (id === 'W1-02' ? 'failure' : 'success')); // W1-01 zielone, W1-02 czerwone
r = await tick(); console.log(r.out);
let w = rd();
assert.equal(w.prs[101].merged, true, 'zielony PR scalony');
assert.equal(w.prs[102].merged, false, 'czerwony PR nie scalony');
assert.equal(w.sent.length, 0, 'jeszcze czekamy na CI Fixer');

advanceMin(11);
r = await tick(); console.log(r.out);
w = rd();
assert.equal(w.sent.length, 1, 'prośba o poprawkę przez sendMessage');
assert.ok(/CI jest czerwone/.test(Object.values(w.sessions)[1].messages[0]) && /expected 3 got 4/.test(Object.values(w.sessions)[1].messages[0]), 'log błędu w prośbie');

advanceMin(11);
r = await tick(); console.log(r.out);
w = rd();
assert.ok(w.comments.some((c) => c.issue === 102 && /^@jules /.test(c.body)), 'druga prośba: komentarz w PR');

advanceMin(3);
setChecks(102, 'success', 'sha-fix'); // Jules wypchnął poprawkę, CI zielone
r = await tick(); console.log(r.out);
w = rd();
assert.equal(w.prs[102].merged, true, 'po poprawce PR scalony');
assert.deepEqual(w.mergedOrder.slice(0, 2), [101, 102]);
const iss = JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(rd().issues[0].body)[1]);
assert.equal(iss.phase, 'tests', 'przejście do fali testów');
assert.equal(iss.testTasks.length, 2, 'dwa zadania testowe');
assert.ok(rd().sessions['1002'].prompt.includes('src/W1-01.js') && !rd().sessions['1002'].prompt.includes('README.md'), 'test-prompt: tylko pliki produkcyjne');

T('3. fala testów -> merge -> CI na main -> start W2');
advanceMin(8);
julesFinishes(() => 'success');
r = await tick(); console.log(r.out);
w = rd();
assert.equal(w.mergedOrder.length, 4, 'merge testów');
let st = JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(w.issues[0].body)[1]);
assert.equal(st.phase, 'integrate', 'faza integracji (CI na main jeszcze nie ma)');

advanceMin(6);
r = await tick(); console.log(r.out);
assert.equal(rd().dispatched.length, 1, 'dispatch CI na main, gdy brak runu');
mainCI('success');
r = await tick(); console.log(r.out);
st = JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(rd().issues[0].body)[1]);
assert.deepEqual(st.doneWaves, [1]);
assert.equal(st.wave, 2, 'automatycznie ruszyła fala 2');
assert.equal(st.phase, 'build');
assert.equal(rd().comments.filter((c) => c.body.startsWith('@') && !c.body.startsWith('@jules') && !/odrzucona/.test(c.body)).length, 0, 'brak pingów, gdy kolejna fala już czeka');
const sf = rd().files['docs/PROJECT_STATE.md'].content;
assert.ok(/\*\*W1-01\*\* #101/.test(sf) && /efekt:/.test(sf) && /Fala W1 gotowa/.test(sf), 'plik stanu zawiera wpisy i efekt');
assert.equal(rd().commits.length, 1, 'jeden commit stanu na falę');
assert.ok(/\[skip ci\]/.test(rd().commits[0]), 'commit stanu bez CI');

T('4. integracja czerwona -> naprawa -> zielona -> brak kolejnej fali');
advanceMin(8);
julesFinishes(() => 'success');
r = await tick(); console.log(r.out); // merge W2-01 -> testy? (src/W2-01.js) 
w = rd(); st = JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(w.issues[0].body)[1]);
assert.equal(st.phase, 'tests');
advanceMin(8); julesFinishes(() => 'success');
r = await tick(); console.log(r.out);
mainCI('failure'); // main czerwony po fali
r = await tick(); console.log(r.out);
w = rd(); st = JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(w.issues[0].body)[1]);
assert.equal(st.integrate.tasks.length, 1, 'uruchomiono naprawę integracyjną');
assert.ok(/Log błędu/.test(st.integrate.tasks[0].prompt));
advanceMin(8); julesFinishes(() => 'success');
r = await tick(); console.log(r.out); // start sesji naprawczej
advanceMin(8); julesFinishes(() => 'success');
r = await tick(); console.log(r.out); // merge PR naprawczego
mainCI('success');
r = await tick(); console.log(r.out);
w = rd(); st = JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(w.issues[0].body)[1]);
assert.deepEqual(st.doneWaves, [1, 2]);
assert.equal(st.phase, 'idle');
assert.ok(w.comments.some((c) => /Brak kolejnej fali/.test(c.body)), 'informacja o czekaniu na prompty');
assert.equal(w.variables.JULES_LOOP_ACTIVE, 'false', 'cron wyłączony, gdy pętla bezczynna');

T('5. limit quota -> pauza, bez zawieszenia');
wf('W3-01-d.md', 'src/d.js');
{ const ww = rd(); ww.quota = true; wr(ww); }
r = await tick(); console.log(r.out);
assert.ok(/limit zadań/.test(r.out));
assert.equal(Object.keys(rd().sessions).filter((k) => rd().sessions[k].prompt.includes('W3-01')).length, 0);

T('6. dry-run nic nie zmienia');
{ const ww = rd(); ww.quota = false; wr(ww); }
const before = JSON.stringify(rd().calls.filter((c) => !c.startsWith('GET')));
advanceMin(40);
r = await tick({ LOOP_DRY_RUN: '1' }); console.log(r.out);
assert.equal(JSON.stringify(rd().calls.filter((c) => !c.startsWith('GET'))), before, 'brak zapisów w dry-run');


T('7. strażnik zgodności: pliki spoza zakresu, brak wymaganych, usunięte asercje');
{ const ww = rd(); ww.quota = false; wr(ww); }
r = await tick({ LOOP_ACTION: 'skip-wave' }); console.log(r.out); // porzuć W3
fs.rmSync(path.join(tmp, 'tasks'), { recursive: true, force: true }); fs.mkdirSync(path.join(tmp, 'tasks'));
fs.writeFileSync(path.join(tmp, 'tasks', 'W4-01-x.md'), '# x\nZmieniaj: src/W4-01.js, tests/W4-01.test.js\nWymagane: tests/W4-01.test.js, docs/W4-01.md\n');
fs.writeFileSync(path.join(tmp, 'tasks', 'W4-02-y.md'), '# y\nZmieniaj: src/W4-02.js, tests/W4-02.test.js\n');
{ const ww = rd(); ww.extraFiles = {
  'W4-01': [{ filename: 'src/obce.js', status: 'modified' }],
  'W4-02': [{ filename: 'tests/stare.test.js', status: 'modified', patch: "@@\n-  expect(a).toBe(1);\n-  expect(b).toBe(2);\n+  expect(a).toBe(1);" }],
}; wr(ww); }
// oba PR-y mają zielone CI, ale naruszają plan
advanceMin(50); r = await tick(); console.log(r.out); // start fali 4
advanceMin(8); julesFinishes(() => 'success');
r = await tick(); console.log(r.out);
w = rd();
assert.equal(w.prs[w.nextPr - 2].merged, false, 'W4-01 nie scalony (spoza zakresu + brak wymaganego)');
assert.equal(w.prs[w.nextPr - 1].merged, false, 'W4-02 nie scalony (usunięte asercje)');
const nudgeTexts = [...Object.values(w.sessions).flatMap((x) => x.messages || []), ...w.comments.map((c) => c.body)].join('\n');
assert.ok(/spoza listy "Zmieniaj"/.test(nudgeTexts) && /src\/obce\.js/.test(nudgeTexts), 'prośba o cofnięcie plików spoza zakresu');
assert.ok(/docs\/W4-01\.md/.test(nudgeTexts), 'prośba o brakujący plik');
assert.ok(/Usunięte asercje w tests\/stare\.test\.js/.test(nudgeTexts), 'prośba o przywrócenie asercji');
// Jules poprawia: nowe commity bez naruszeń + zielone CI
{ const ww = rd(); ww.extraFiles = {}; for (const n of [ww.nextPr - 2, ww.nextPr - 1]) { const pr = ww.prs[n]; pr.head.sha += '-ok'; ww.checksBySha[pr.head.sha] = [{ name: 'test', status: 'completed', conclusion: 'success' }]; ww.runsBySha[pr.head.sha] = [{ id: n, name: 'CI', status: 'completed', conclusion: 'success' }];
  pr.files = [{ filename: `src/${pr.title.match(/\[([^\]]+)\]/)[1]}.js`, status: 'added' }, { filename: `tests/${pr.title.match(/\[([^\]]+)\]/)[1]}.test.js`, status: 'added' }, ...(n === ww.nextPr - 2 ? [{ filename: 'docs/W4-01.md', status: 'added' }] : [])]; } wr(ww); }
advanceMin(2); r = await tick(); console.log(r.out);
w = rd();
assert.equal(w.prs[w.nextPr - 2].merged && w.prs[w.nextPr - 1].merged, true, 'po poprawkach oba PR-y scalone');


const stateOf = () => JSON.parse(/<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(rd().issues[0].body)[1]);

T('8. tryb autonomiczny: prompt, wymuszenie po limicie czasu, restart');
w = rd();
assert.ok(Object.values(w.sessions).every((x) => /TRYB AUTONOMICZNY/.test(x.prompt)), 'każdy prompt ma tryb autonomiczny');
const stuck = Object.values(w.sessions).filter((x) => x.state === 'QUEUED').map((x) => x.id);
assert.ok(stuck.length >= 2, 'sesje fali testów wiszą');
advanceMin(125); r = await tick(); console.log(r.out);
w = rd();
assert.ok(stuck.every((id) => w.sessions[id].messages.some((m) => /Limit czasu minął/.test(m))), 'wymuszono zakończenie po 120 min');
advanceMin(16); r = await tick(); console.log(r.out);
w = rd();
assert.ok(stuck.every((id) => (w.deleted || []).includes(id)), 'stare sesje usunięte');
r = await tick(); console.log(r.out);
w = rd();
const restarted = Object.values(w.sessions).filter((x) => x.state === 'QUEUED');
assert.equal(restarted.length, stuck.length, 'nowe sesje po restarcie');
assert.ok(restarted.every((x) => /ponowna próba/.test(x.prompt) && /TRYB AUTONOMICZNY/.test(x.prompt)), 'restart ma notatkę i tryb autonomiczny');
// Jules odpowiada pytaniem -> pętla sama decyduje
{ const ww = rd(); ww.sessions[restarted[0].id].state = 'AWAITING_USER_FEEDBACK'; wr(ww); }
r = await tick(); console.log(r.out);
assert.ok(rd().sessions[restarted[0].id].messages.some((m) => /Zdecyduj samodzielnie/.test(m)), 'pytanie Julesa dostaje decyzję');
{ const ww = rd(); ww.sessions[restarted[0].id].state = 'QUEUED'; wr(ww); }
advanceMin(8); julesFinishes(() => 'success');
r = await tick(); console.log(r.out);
advanceMin(6); r = await tick(); console.log(r.out);
mainCI('success'); r = await tick(); console.log(r.out);
assert.ok(stateOf().doneWaves.includes(4), 'fala 4 dokończona po restarcie');

T('9. korekta kolejnej fali po zakończeniu poprzedniej');
fs.writeFileSync(path.join(tmp, 'tasks', 'W5-01-e.md'), '# e\nCel: stary opis.\nZmieniaj: src/stare.js, tests/stare.test.js\n');
{ const ww = rd(); ww.refreshFiles = { R5: [{ filename: 'tasks/W5-01-e.md', status: 'modified' }] };
  ww.files = ww.files || {}; ww.files['tasks/W5-01-e.md'] = { sha: 't1', content: '# e\nCel: KOREKTA-OK nowy opis.\nZmieniaj: src/W5-01.js, tests/W5-01.test.js\n' }; wr(ww); }
r = await tick({ LOOP_REFRESH: 'on' }); console.log(r.out);
st = stateOf();
assert.equal(st.phase, 'refresh', 'najpierw korekta, nie budowa');
assert.ok(Object.values(rd().sessions).some((x) => /^Zadanie R5/.test(x.prompt)), 'sesja korekty');
assert.ok(!Object.values(rd().sessions).some((x) => /W5-01/.test(x.title) && !/R5/.test(x.title)), 'W5-01 jeszcze nie startuje');
advanceMin(8); julesFinishes(() => 'success');
r = await tick({ LOOP_REFRESH: 'on' }); console.log(r.out);
w = rd(); st = stateOf();
assert.equal(st.refreshed['5'], true, 'korekta oznaczona jako wykonana');
assert.equal(st.phase, 'build', 'po korekcie startuje fala 5');
assert.ok(Object.values(w.sessions).some((x) => /\[W5-01\]/.test(x.title) && /KOREKTA-OK/.test(x.prompt)), 'fala 5 startuje ze świeżą treścią zadania');

T('10. polecenia z komentarzy (telefon): pauza, śmieciowy komentarz, wznowienie, pominięcie');
r = await tick({ LOOP_COMMENT_BODY: '/pause', LOOP_COMMENT_ID: '1' }); console.log(r.out);
assert.equal(stateOf().paused, true, '/pause');
const calls0 = rd().calls.length;
r = await tick({ LOOP_COMMENT_BODY: 'dzięki!' }); console.log(r.out);
assert.equal(r.code, 0); assert.ok(/nie jest poleceniem/.test(r.out)); assert.equal(stateOf().paused, true, 'zwykły komentarz nic nie zmienia');
r = await tick({ LOOP_COMMENT_BODY: '/go' }); console.log(r.out);
assert.equal(stateOf().paused, false, '/go');
r = await tick({ LOOP_COMMENT_BODY: '/skip W5-01' }); console.log(r.out);
assert.equal(stateOf().tasks.find((x) => x.id === 'W5-01').status, 'skipped', '/skip');


// ================= TRYB AUTONOMICZNY =================
const AUTO = { LOOP_AUTONOMOUS: 'on' };
const putTask = (name, text) => { fs.writeFileSync(path.join(tmp, 'tasks', name), text); const ww = rd(); ww.files = ww.files || {}; ww.files['tasks/' + name] = { content: text, sha: 'tk' + name }; wr(ww); };
const titles = () => Object.values(rd().sessions).map((x) => x.title);

T('11. brak fal -> Jules sam planuje następną falę, pętla ją scala i buduje');
putTask('x.tmp', 'x'); // nie jest plikiem zadania
{ const ww = rd();
  ww.files['tasks/W6-01-a.md'] = { sha: 'p1', content: '# a\nCel: x\nZmieniaj: src/W6-01.js, tests/W6-01.test.js\nWymagane: tests/W6-01.test.js\nWeryfikacja: npm test\n' };
  ww.files['tasks/W6-02-b.md'] = { sha: 'p2', content: '# b\nCel: y\nZmieniaj: src/W6-02.js, tests/W6-02.test.js\nWeryfikacja: npm test\n' };
  ww.planFiles = { P6: [{ filename: 'tasks/W6-01-a.md', status: 'added' }, { filename: 'tasks/W6-02-b.md', status: 'added' }] };
  delete ww.files['tasks/W6-01-a.md']; delete ww.files['tasks/W6-02-b.md']; ww.stagedPlan = { 'tasks/W6-01-a.md': { sha: 'p1', content: '# a\nCel: x\nZmieniaj: src/W6-01.js, tests/W6-01.test.js\nWymagane: tests/W6-01.test.js\nWeryfikacja: npm test\n' }, 'tasks/W6-02-b.md': { sha: 'p2', content: '# b\nCel: y\nZmieniaj: src/W6-02.js, tests/W6-02.test.js\nWeryfikacja: npm test\n' } };
  wr(ww); }
const pings = () => rd().comments.filter((c) => c.body.startsWith('@') && !c.body.startsWith('@jules')).length;
const pings0 = pings();
r = await tick({ ...AUTO, LOOP_ACTION: 'skip-wave' }); console.log(r.out);
w = rd();
assert.ok(/Fokus tej fali/.test(Object.values(w.sessions).at(-1).prompt) && /^Zadanie P6/.test(Object.values(w.sessions).at(-1).prompt) && /docs\/GOALS\.md/.test(Object.values(w.sessions).at(-1).prompt), 'prompt planowania');
assert.ok(w.files['AGENTS.md'] && /jules-loop:autonomy/.test(w.files['AGENTS.md'].content), 'zasady autonomii dopisane do AGENTS.md');
assert.equal(pings(), pings0, 'planowanie nie woła człowieka');
{ const ww = rd(); Object.assign(ww.files, ww.stagedPlan); wr(ww); } // Jules "zapisał" pliki w PR-ze planu
advanceMin(8); julesFinishes(() => 'success');
r = await tick(AUTO); console.log(r.out);
st = stateOf();
assert.equal(st.refreshed['6'], true, 'plan scalony');
assert.equal(st.phase, 'build'); assert.equal(st.wave, 6, 'ruszyła zaplanowana fala 6');
assert.ok(titles().some((x) => /\[W6-01\]/.test(x)) && titles().some((x) => /\[W6-02\]/.test(x)), 'zadania z planu wystartowały');

T('12. zadanie za trudne: timeout -> restart -> rozbicie na etapy (bez needs-human)');
advanceMin(125); r = await tick(AUTO); console.log(r.out);
advanceMin(16); r = await tick(AUTO); console.log(r.out);
r = await tick(AUTO); console.log(r.out);
advanceMin(125); r = await tick(AUTO); console.log(r.out);
advanceMin(16); r = await tick(AUTO); console.log(r.out);
st = stateOf();
assert.equal(st.tasks.find((x) => x.id === 'W6-01').status, 'split', 'W6-01 rozbite');
assert.deepEqual(st.tasks.filter((x) => x.splitFrom === 'W6-01').map((x) => x.id), ['W6-01.1', 'W6-01.2', 'W6-01.3']);
assert.ok(!st.tasks.some((x) => x.status === 'needs-human'), 'brak needs-human');
assert.equal(Object.values(rd().sessions).filter((x) => /ETAP 1\/3/.test(x.prompt)).length, 2, 'startują tylko etapy 1');
assert.equal(Object.values(rd().sessions).filter((x) => /ETAP 2\/3/.test(x.prompt)).length, 0, 'etap 2 czeka na 1');
assert.ok(/Rozbite automatycznie/.test(rd().files['tasks/W6-01-a.md'].content), 'adnotacja w pliku zadania');
advanceMin(8); julesFinishes(() => 'success');
r = await tick(AUTO); console.log(r.out);
assert.ok(Object.values(rd().sessions).some((x) => /ETAP 2\/3/.test(x.prompt)), 'po scaleniu etapu 1 startuje etap 2');

T('13. nakładające się zakresy: wykonane po kolei zamiast odrzucenia fali');
putTask('W9-01-a.md', '# a\nCel: x\nZmieniaj: src/W9-01.js, tests/W9-01.test.js, src/shared/*\n');
putTask('W9-02-b.md', '# b\nCel: y\nZmieniaj: src/W9-02.js, tests/W9-02.test.js, src/shared/util.js\n');
r = await tick({ ...AUTO, LOOP_ACTION: 'skip-wave' }); console.log(r.out);
st = stateOf();
assert.equal(st.wave, 9); assert.deepEqual(st.tasks.find((x) => x.id === 'W9-02').after, ['W9-01']);
assert.ok(titles().some((x) => /\[W9-01\]/.test(x)) && !titles().some((x) => /\[W9-02\]/.test(x)), 'startuje tylko pierwsze');
advanceMin(8); julesFinishes(() => 'success');
r = await tick(AUTO); console.log(r.out);
assert.ok(titles().some((x) => /\[W9-02\]/.test(x)), 'drugie startuje po pierwszym');

T('14. main czerwony: kolejne naprawy z cooldownem, w końcu cofnięcie zmian, pętla się nie zatrzymuje');
advanceMin(8); julesFinishes(() => 'success');
r = await tick(AUTO); console.log(r.out); // merge W9-02 + start testów
advanceMin(8); julesFinishes(() => 'success');
r = await tick(AUTO); console.log(r.out); // merge testów -> integracja
const redCycle = async () => { advanceMin(6); r = await tick(AUTO); console.log(r.out); mainCI('failure'); r = await tick(AUTO); console.log(r.out); r = await tick(AUTO); console.log(r.out); advanceMin(8); julesFinishes(() => 'success'); r = await tick(AUTO); console.log(r.out); };
await redCycle(); // I9-1
st = stateOf(); assert.equal(st.integrate.attempts, 1);
await redCycle(); // I9-2
st = stateOf(); assert.equal(st.integrate.attempts, 2, 'druga zwykła naprawa');
advanceMin(6); r = await tick(AUTO); mainCI('failure'); r = await tick(AUTO); console.log(r.out);
st = stateOf(); assert.equal(st.integrate.attempts, 2, 'cooldown przed kolejną próbą');
advanceMin(65); r = await tick(AUTO); console.log(r.out);
st = stateOf(); assert.equal(st.integrate.attempts, 3, 'po cooldownie trzecia próba');
assert.ok(/git revert/.test(st.integrate.tasks[0].prompt), 'trzecia próba to cofnięcie zmian');
assert.equal(pings(), pings0, 'żadnego wołania człowieka w trybie autonomicznym');
r = await tick(AUTO); advanceMin(8); julesFinishes(() => 'success'); r = await tick(AUTO); console.log(r.out);
advanceMin(6); r = await tick(AUTO); mainCI('success'); r = await tick(AUTO); console.log(r.out);
st = stateOf();
assert.ok(st.doneWaves.includes(9), 'fala 9 zakończona mimo czerwonego main');
assert.ok(['plan', 'build', 'idle'].includes(st.phase) && st.phase !== 'integrate', 'pętla idzie dalej (planuje kolejną falę)');

console.log('\n✅ WSZYSTKIE SCENARIUSZE PRZESZŁY');
server.close();
