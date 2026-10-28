#!/usr/bin/env node
// Jules Loop: orkiestrator pętli Haiku -> Jules -> CI -> merge -> testy -> następna fala.
// Bez zależności (Node 20+). Używa: Jules REST API (v1alpha) + `gh api` (preinstalowane na runnerach GitHuba).
// Jeden przebieg ("tick") jest idempotentny: stan żyje w issue z etykietą `jules-loop`.
// Wzorzec za oficjalnym google-labs-code/jules-skills (walidacja własności plików, równoległy dispatch,
// sekwencyjny merge z CI), zmieniony tak, by wejściem były pliki tasks/W*.md, a nie issues.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';

const env = process.env;
const REPO = env.GITHUB_REPOSITORY || env.REPO;
if (!REPO) { console.error('Brak GITHUB_REPOSITORY'); process.exit(2); }
const OWNER = REPO.split('/')[0];
const BASE = env.LOOP_BASE_BRANCH || 'main';
const CI_WORKFLOW = env.LOOP_CI_WORKFLOW || 'ci.yml';
const JULES_BASE = env.JULES_API_BASE || 'https://jules.googleapis.com/v1alpha';
const JULES_KEY = env.JULES_API_KEY || '';
const DRY = ['1', 'true'].includes(env.LOOP_DRY_RUN || '');
const ACTION = (env.LOOP_ACTION || 'tick').trim();
const ACTION_ARG = (env.LOOP_ACTION_ARG || '').trim();
const LABEL = 'jules-loop';
const ACTIVE_VAR = 'JULES_LOOP_ACTIVE';

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const CFG = {
  maxConcurrent: num(env.LOOP_MAX_CONCURRENT, 12),        // Pro: 15 naraz, zostawiamy zapas
  dailyBudget: num(env.LOOP_DAILY_BUDGET, 80),            // Pro: 100/dobę, zostawiamy zapas
  fixGraceMin: num(env.LOOP_FIX_GRACE_MIN, 10),           // tyle czeka na CI Fixer Julesa
  maxNudges: num(env.LOOP_MAX_NUDGES, 2),                 // ile razy prosimy Julesa o poprawkę
  maxRedCycles: num(env.LOOP_MAX_RED_CYCLES, 6),
  sessionTimeoutMin: num(env.LOOP_SESSION_TIMEOUT_MIN, 120),
  testWave: (env.LOOP_TEST_WAVE || 'on') !== 'off',
  testTaskCap: num(env.LOOP_TEST_TASK_CAP, 10),
  noCiGraceMin: 10,
  maxIntegrationFixes: 2,
  maxSessionAttempts: 2,
  maxPlanNudges: 2,
  planGuard: (env.LOOP_PLAN_GUARD || 'on') !== 'off',
  scopeAllow: (env.LOOP_SCOPE_ALLOW || 'package-lock.json,yarn.lock,pnpm-lock.yaml').split(',').map((x) => x.trim()).filter(Boolean),
  stateFile: env.LOOP_STATE_FILE || 'docs/PROJECT_STATE.md',
  maxErrors: 5,
};
const now = () => (env.LOOP_FAKE_NOW ? Date.parse(env.LOOP_FAKE_NOW) : Date.now());
const iso = (t = now()) => new Date(t).toISOString();
const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('⚠️', ...a);

// ---------- GitHub (gh api) ----------
const R = (p) => `repos/${REPO}/${p}`;
function gh(method, apiPath, body, opts = {}) {
  const args = ['api', apiPath, '-X', method, '-H', 'Accept: application/vnd.github+json'];
  const o = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...(opts.token ? { GH_TOKEN: opts.token } : {}) } };
  if (body !== undefined) { args.push('--input', '-'); o.input = JSON.stringify(body); }
  let out;
  try { out = execFileSync('gh', args, o); }
  catch (e) {
    const msg = `${e.stderr || ''}${e.stdout || ''}` || e.message;
    const err = new Error(`gh ${method} ${apiPath}: ${msg.toString().slice(0, 300)}`);
    err.status = Number((/HTTP (\d{3})/.exec(msg) || [])[1]) || 0;
    throw err;
  }
  if (opts.raw) return out;
  return out.trim() ? JSON.parse(out) : {};
}
// Zapisy: w trybie dry-run tylko logujemy.
function ghw(method, apiPath, body, opts) {
  if (DRY) { log(`[dry] ${method} ${apiPath}`); return {}; }
  return gh(method, apiPath, body, opts);
}

// ---------- Jules REST ----------
async function jules(method, path, body) {
  const res = await fetch(JULES_BASE + path, {
    method,
    headers: { 'x-goog-api-key': JULES_KEY, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const e = new Error(`Jules ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    e.status = res.status; throw e;
  }
  return data;
}

// ---------- Stan ----------
const freshState = () => ({
  v: 1, phase: 'idle', wave: null, doneWaves: [], tasks: [], testTasks: [],
  integrate: { attempts: 0, tasks: [], dispatched: {}, lastFixSha: null, blockedNotified: false },
  startLog: [], sourceName: null, invalid: {}, waitingNotified: false, lastMergeAt: 0,
  quotaBlockedUntil: 0, waveStartedAt: 0, journal: [], lastWaveSummary: '', stateFileWarned: false,
});

function loadState() {
  const list = gh('GET', R(`issues?labels=${LABEL}&state=open&per_page=5`));
  const issue = (Array.isArray(list) ? list : []).find((i) => !i.pull_request) || null;
  let state = freshState();
  if (issue) {
    const m = /<!-- JULES_LOOP_STATE\n([\s\S]*?)\n-->/.exec(issue.body || '');
    if (m) { try { state = { ...freshState(), ...JSON.parse(m[1]) }; } catch { warn('uszkodzony stan, start od zera'); } }
  }
  return { issue, state };
}

const EMOJI = { pending: '⏳', running: '🏃', pr: '🔀', merged: '✅', skipped: '⏭️', 'needs-human': '🛑' };
function renderBody(state) {
  const rows = (title, list) => !list.length ? '' :
    `\n**${title}**\n\n| Zadanie | Status | PR | Poprawki | Uwagi |\n|---|---|---|---|---|\n` +
    list.map((t) => `| ${t.id} | ${EMOJI[t.status] || ''} ${t.status}${t.sessionState && t.status === 'running' ? ` (${t.sessionState})` : ''} | ${t.prNumber ? `#${t.prNumber}` : '-'} | ${t.nudges || 0} | ${(t.note || '').replace(/\|/g, '/').slice(0, 120)} |`).join('\n') + '\n';
  const used = (state.startLog || []).filter((t) => t > now() - 864e5).length;
  return [
    '## 🤖 Jules Loop: stan pętli',
    `**Faza:** ${state.phase}${state.wave ? ` · **Fala:** W${state.wave}` : ''} · **Ukończone fale:** ${state.doneWaves.length ? state.doneWaves.map((n) => 'W' + n).join(', ') : 'brak'}`,
    `**Sesje Julesa uruchomione przez pętlę (24 h):** ${used}/${CFG.dailyBudget} · aktualizacja: ${iso()}`,
    rows('Zadania budowy', state.tasks), rows('Fala testów', state.testTasks), rows('Naprawa integracji', state.integrate.tasks || []),
    '\n**Odblokowanie:** usuń etykietę `needs-human` z PR (pętla wznowi), albo uruchom workflow ręcznie: `resume`, `skip` (ID zadania), `skip-wave`.',
    `\n<!-- JULES_LOOP_STATE\n${JSON.stringify(state)}\n-->`,
  ].join('\n');
}

function saveState(issue, state) {
  const body = renderBody(state);
  if (DRY) { log('[dry] zapis stanu pominięty\n' + body.split('<!--')[0]); return issue; }
  if (!issue) {
    try { gh('POST', R('labels'), { name: LABEL, color: '5319e7', description: 'Stan pętli Jules Loop' }); } catch { /* istnieje */ }
    return gh('POST', R('issues'), { title: '🤖 Jules Loop: stan pętli', body, labels: [LABEL] });
  }
  gh('PATCH', R(`issues/${issue.number}`), { body });
  return issue;
}

function notify(issue, events) {
  if (!events.length) return;
  log('Powiadomienia:\n' + events.map((e) => ' - ' + e).join('\n'));
  if (DRY || !issue) return;
  const who = env.LOOP_NOTIFY_USER || OWNER;
  try {
    gh('POST', R(`issues/${issue.number}/comments`), { body: `@${who}\n${events.map((e) => '- ' + e).join('\n')}` },
      { token: env.NOTIFY_TOKEN || undefined });
  } catch (e) { warn('powiadomienie nie poszło:', e.message); }
}

function setActiveVar(active) {
  if (DRY) return;
  const value = active ? 'true' : 'false';
  try { gh('PATCH', R(`actions/variables/${ACTIVE_VAR}`), { name: ACTIVE_VAR, value }); }
  catch (e) {
    try { gh('POST', R('actions/variables'), { name: ACTIVE_VAR, value }); }
    catch (e2) { warn(`nie ustawiono zmiennej ${ACTIVE_VAR} (potrzebny PAT z uprawnieniem Variables):`, e2.message.slice(0, 120)); }
  }
}

// ---------- Fale i zadania z plików ----------
function scanWaves() {
  const waves = new Map();
  if (!fs.existsSync('tasks')) return waves;
  for (const f of fs.readdirSync('tasks').sort()) {
    const m = /^W(\d+)-([A-Za-z0-9]+)(?:[-_].*)?\.md$/i.exec(f);
    if (!m) continue;
    const n = Number(m[1]);
    if (!waves.has(n)) waves.set(n, []);
    waves.get(n).push({ id: `W${n}-${m[2]}`, file: `tasks/${f}` });
  }
  return waves;
}
function parseList(text, key) {
  const m = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'im').exec(text);
  return m ? m[1].split(',').map((s) => s.trim().replace(/^`|`$/g, '')).filter(Boolean) : null;
}
const parseOwnership = (text) => parseList(text, 'Zmieniaj');
const isWild = (p) => /(\*|\/)$/.test(p);
const stem = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\*+$/, '').replace(/\/$/, '');
function overlaps(a, b) {
  const sa = stem(a), sb = stem(b);
  if (!isWild(a) && !isWild(b)) return sa === sb;
  if (isWild(a) && isWild(b)) return sa.startsWith(sb) || sb.startsWith(sa);
  return isWild(a) ? sb.startsWith(sa) : sa.startsWith(sb);
}
function validateWave(files) {
  const problems = [];
  const owned = [];
  for (const t of files) {
    const text = fs.readFileSync(t.file, 'utf8');
    const own = parseOwnership(text);
    if (!own) { problems.push(`${t.id}: brak linii "Zmieniaj:" (nie można sprawdzić konfliktów)`); continue; }
    for (const o of own) for (const prev of owned) if (prev.id !== t.id && overlaps(o, prev.path))
      problems.push(`Konflikt plików: ${t.id} (${o}) i ${prev.id} (${prev.path})`);
    own.forEach((o) => owned.push({ id: t.id, path: o }));
  }
  return problems;
}
const titleOf = (text, fb) => ((/^#\s+(.+)$/m.exec(text) || [])[1] || fb).slice(0, 100);
const mkTask = (o) => ({ status: 'pending', attempts: 0, feedbackReplies: 0, nudges: 0, planNudges: 0, redCycles: 0, mergeFails: 0, errors: 0, ...o });

function buildPrompt(t) {
  if (t.prompt) return t.prompt;
  const body = fs.readFileSync(t.file, 'utf8');
  return [
    `Wykonaj zadanie ${t.id} z pliku ${t.file} zgodnie z AGENTS.md. Tytuł PR zacznij od [${t.id}].`,
    'Przed zakończeniem uruchom testy i build; PR tylko gdy przechodzą. Nie zmieniaj ani nie usuwaj asercji istniejących testów.',
    'Zmieniaj tylko pliki z listy "Zmieniaj". W opisie PR: co zrobiono, decyzje i dlaczego, jak sprawdzić.',
    'Nikt nie odpowie na pytania: jeśli czegoś brakuje, przyjmij najrozsądniejsze założenie, zapisz je w opisie PR i kontynuuj.',
    '', `--- ${t.file} ---`, body,
  ].join('\n');
}

// ---------- Dziennik zmian (plik stanu projektu) ----------
// Zmiany trafiają do pliku w repo (docs/PROJECT_STATE.md), a nie do powiadomień: Claude czyta go na starcie sesji.
const jr = (ctx, text) => {
  const j = ctx.state.journal;
  j.push(`${iso().slice(0, 16).replace('T', ' ')} · ${text}`);
  if (j.length > 300) j.splice(0, j.length - 300);
};
function renderStateFile(prev, state, entries) {
  const MARK = '<!-- LOG -->';
  const status = ['<!-- STATUS -->',
    `**Ukończone fale:** ${state.doneWaves.length ? state.doneWaves.map((n) => 'W' + n).join(', ') : 'brak'} · **Faza pętli:** ${state.phase}${state.wave ? ` (W${state.wave})` : ''} · **Aktualizacja:** ${iso().slice(0, 16).replace('T', ' ')} UTC`,
    state.lastWaveSummary ? `**Ostatnia fala:** ${state.lastWaveSummary}` : '', '<!-- /STATUS -->'].filter(Boolean).join('\n');
  let base = prev && prev.includes(MARK) ? prev : [
    '# Stan projektu', '',
    '> Prowadzony automatycznie przez Jules Loop. Każdy scalony PR i zdarzenie pętli dopisuje wpis: co zmieniono i z jakim efektem. Claude czyta ten plik na początku sesji; nie edytuj sekcji Log ręcznie.', '',
    '## Status', '', status, '', '## Log zmian (najnowsze u góry)', '', MARK, ''].join('\n');
  base = base.replace(/<!-- STATUS -->[\s\S]*?<!-- \/STATUS -->/, status);
  const i = base.indexOf(MARK) + MARK.length;
  return base.slice(0, i) + '\n' + entries.map((e) => '- ' + e).join('\n') + base.slice(i);
}
function flushJournal(ctx) {
  const { state } = ctx;
  if (!state.journal.length) return;
  if (DRY) { log(`[dry] zapis ${CFG.stateFile} (${state.journal.length} wpisów)`); return; }
  try {
    let sha, prev = '';
    try { const f = gh('GET', R(`contents/${CFG.stateFile}?ref=${BASE}`)); sha = f.sha; prev = Buffer.from(f.content || '', 'base64').toString('utf8'); }
    catch (e) { if (e.status !== 404) throw e; }
    const content = renderStateFile(prev, state, [...state.journal].reverse());
    gh('PUT', R(`contents/${CFG.stateFile}`), {
      message: `docs(state): ${state.journal.length} wpisów z Jules Loop [skip ci]`,
      content: Buffer.from(content, 'utf8').toString('base64'), branch: BASE, ...(sha ? { sha } : {}),
    });
    state.journal = []; state.stateFileWarned = false;
    log(`📝 zapisano ${CFG.stateFile}`);
  } catch (e) {
    warn('zapis pliku stanu nieudany (wpisy czekają w kolejce):', e.message.slice(0, 150));
    if (!state.stateFileWarned) { ctx.events.push(`⚠️ Nie mogę zapisać ${CFG.stateFile} na ${BASE} (ochrona gałęzi? PAT musi móc pushować na ${BASE}). Wpisy czekają w issue pętli.`); state.stateFileWarned = true; }
  }
}

// ---------- Zgodność z planem (deterministycznie, bez Claude) ----------
const inScope = (f, pats) => pats.some((p) => (isWild(p) ? f === stem(p) || f.startsWith(stem(p) + '/') || f.startsWith(stem(p)) : f === stem(p)));
const ASSERT_RE = /\b(expect|assert\w*|should|toBe|toEqual|toThrow|t\.(is|equal|deepEqual|ok|true|false))\b/;
function planProblems(t, prFiles) {
  const problems = [];
  const names = prFiles.map((f) => f.filename);
  if (t.kind === 'build' && t.file && fs.existsSync(t.file)) {
    const text = fs.readFileSync(t.file, 'utf8');
    const own = parseOwnership(text);
    const need = parseList(text, 'Wymagane');
    if (own) {
      const allowed = [...own, ...(need || [])];
      const extra = names.filter((f) => !inScope(f, allowed) && !CFG.scopeAllow.includes(f));
      if (extra.length) problems.push(`Zmienione pliki spoza listy "Zmieniaj": ${extra.slice(0, 8).join(', ')}. Cofnij te zmiany (zostaw tylko: ${allowed.join(', ')}).`);
    }
    if (need) {
      const missing = need.filter((n) => !names.some((f) => inScope(f, [n])));
      if (missing.length) problems.push(`Brakuje wymaganych plików z zadania (linia "Wymagane"): ${missing.join(', ')}. Dodaj je.`);
    }
  }
  for (const f of prFiles) {
    if (!f.patch || f.status === 'added' || f.status === 'removed') continue;
    const lines = f.patch.split('\n');
    const rem = lines.filter((l) => l.startsWith('-') && !l.startsWith('---') && ASSERT_RE.test(l)).length;
    const add = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++') && ASSERT_RE.test(l)).length;
    if (rem > add) problems.push(`Usunięte asercje w ${f.filename} (−${rem}/+${add}). Przywróć je; nie osłabiaj testów, żeby przeszły.`);
  }
  return problems;
}

// ---------- Jules: sesje ----------
const ACTIVE_STATES = new Set(['QUEUED', 'PLANNING', 'AWAITING_PLAN_APPROVAL', 'AWAITING_USER_FEEDBACK', 'IN_PROGRESS']);
const allTasks = (s) => [...s.tasks, ...s.testTasks, ...(s.integrate.tasks || [])];
const budgetLeft = (s) => { s.startLog = (s.startLog || []).filter((t) => t > now() - 864e5); return CFG.dailyBudget - s.startLog.length; };
const activeCount = (s) => allTasks(s).filter((t) => t.status === 'running' && t.sessionId && (!t.sessionState || ACTIVE_STATES.has(t.sessionState))).length;

async function ensureSource(state) {
  if (state.sourceName) return state.sourceName;
  let token, found;
  do {
    const r = await jules('GET', `/sources?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
    found = (r.sources || []).find((s) => s.githubRepo && `${s.githubRepo.owner}/${s.githubRepo.repo}`.toLowerCase() === REPO.toLowerCase());
    token = r.nextPageToken;
  } while (!found && token);
  if (!found) throw new Error(`Jules nie widzi repo ${REPO}: zainstaluj aplikację Jules na GitHubie i nadaj dostęp do tego repo.`);
  return (state.sourceName = found.name);
}

async function startTask(ctx, t) {
  const { state, events } = ctx;
  if (now() < (state.quotaBlockedUntil || 0)) return;
  if (budgetLeft(state) <= 0) { if (!ctx.budgetNoted) { log(`⏸️ Dzienny budżet sesji (${CFG.dailyBudget}) wyczerpany: zadania czekają.`); ctx.budgetNoted = true; } return; }
  if (activeCount(state) >= CFG.maxConcurrent) return;
  const prompt = buildPrompt(t);
  if (DRY) { log(`[dry] start sesji dla ${t.id} (${prompt.length} znaków promptu)`); return; }
  try {
    const source = await ensureSource(state);
    const s = await jules('POST', '/sessions', {
      prompt, title: `[${t.id}] ${t.title || t.id}`.slice(0, 120),
      sourceContext: { source, githubRepoContext: { startingBranch: BASE } },
      automationMode: 'AUTO_CREATE_PR',
    });
    t.sessionId = s.id || String(s.name || '').split('/').pop();
    t.sessionUrl = s.url; t.sessionState = s.state || 'QUEUED';
    t.status = 'running'; t.startedAt = now(); t.attempts += 1; t.noPrSince = 0;
    state.startLog.push(now());
    log(`▶️ ${t.id}: sesja ${t.sessionId}`);
  } catch (e) {
    if (e.status === 429 || (e.status === 403 && /quota/i.test(e.message))) {
      state.quotaBlockedUntil = now() + 30 * 60e3;
      log('⏸️ Jules zgłosił limit zadań (quota): pauza 30 min.');
    } else throw e;
  }
}

function needsHuman(ctx, t, reason) {
  t.status = 'needs-human'; t.note = reason;
  ctx.events.push(`🛑 ${t.id}: ${reason}${t.prNumber ? ` (PR #${t.prNumber})` : ''}`);
  jr(ctx, `🛑 **${t.id}** wymaga człowieka: ${reason}${t.prNumber ? ` (PR #${t.prNumber})` : ''}`);
  if (t.prNumber) { try { ghw('POST', R(`issues/${t.prNumber}/labels`), { labels: ['needs-human'] }); } catch { /* brak uprawnień */ } }
}

async function pollTask(ctx, t) {
  const s = await jules('GET', `/sessions/${t.sessionId}`);
  t.sessionState = s.state;
  const prUrl = (s.outputs || []).map((o) => o.pullRequest && o.pullRequest.url).find(Boolean);
  if (prUrl) {
    t.prUrl = prUrl; t.prNumber = Number((/\/pull\/(\d+)/.exec(prUrl) || [])[1]); t.status = 'pr'; return;
  }
  switch (s.state) {
    case 'FAILED':
      if (t.attempts < CFG.maxSessionAttempts) { t.status = 'pending'; t.sessionId = null; t.note = 'ponowna próba po FAILED'; }
      else needsHuman(ctx, t, 'sesja Julesa zakończyła się błędem (2 próby)');
      return;
    case 'COMPLETED':
      if (!t.noPrSince) t.noPrSince = now();
      else if (now() - t.noPrSince > 5 * 60e3) needsHuman(ctx, t, 'sesja zakończona bez PR (brak zmian?)');
      return;
    case 'AWAITING_USER_FEEDBACK':
      if (t.feedbackReplies >= 2) { needsHuman(ctx, t, 'Jules ciągle pyta o doprecyzowanie'); return; }
      await jules('POST', `/sessions/${t.sessionId}:sendMessage`, { prompt: 'Nikt nie odpowie na pytania. Przyjmij najrozsądniejszą interpretację zgodnie z AGENTS.md i plikiem zadania, zapisz założenia w opisie PR i kontynuuj.' });
      t.feedbackReplies += 1; return;
    case 'AWAITING_PLAN_APPROVAL':
      await jules('POST', `/sessions/${t.sessionId}:approvePlan`, {}); return;
    default:
      if (t.startedAt && now() - t.startedAt > CFG.sessionTimeoutMin * 60e3) needsHuman(ctx, t, `sesja trwa dłużej niż ${CFG.sessionTimeoutMin} min`);
  }
}

// ---------- PR: CI, poprawki, merge ----------
function ciStatus(sha) {
  const runs = (gh('GET', R(`commits/${sha}/check-runs?per_page=100`)).check_runs) || [];
  let st = { total_count: 0 };
  try { st = gh('GET', R(`commits/${sha}/status`)); } catch { /* brak legacy statusów */ }
  const BAD = ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure', 'stale'];
  const failed = runs.filter((r) => r.status === 'completed' && BAD.includes(r.conclusion));
  if (failed.length || (st.total_count > 0 && ['failure', 'error'].includes(st.state))) return { state: 'red' };
  if (runs.some((r) => r.status !== 'completed') || (st.total_count > 0 && st.state === 'pending')) return { state: 'pending' };
  if (!runs.length && !(st.total_count > 0)) return { state: 'none' };
  return { state: 'green' };
}
function failureLog(sha) {
  try {
    const runs = gh('GET', R(`actions/runs?head_sha=${sha}&per_page=10`)).workflow_runs || [];
    const bad = runs.find((r) => r.conclusion === 'failure');
    if (!bad) return '(brak logu)';
    const job = (gh('GET', R(`actions/runs/${bad.id}/jobs?per_page=30`)).jobs || []).find((j) => j.conclusion === 'failure');
    if (!job) return `(workflow "${bad.name}" nieudany, brak szczegółów zadania)`;
    const txt = gh('GET', R(`actions/jobs/${job.id}/logs`), undefined, { raw: true });
    return txt.split('\n').map((l) => l.replace(/^\S+Z /, '')).slice(-70).join('\n').slice(-3500);
  } catch (e) { return `(nie udało się pobrać logu: ${e.message.slice(0, 100)})`; }
}
async function nudge(ctx, t, pr, kind, extra = '') {
  const sha7 = pr.head.sha.slice(0, 7);
  const msg = kind === 'plan' ? `PR nie jest zgodny z zadaniem ${t.id}:\n- ${extra}\nPopraw to w tym samym PR, uruchom testy i wypchnij.`
    : kind === 'conflict'
    ? `PR ma konflikty z ${BASE}. Zrób rebase na ${BASE}, rozwiąż konflikty zachowując zmiany z obu stron, uruchom testy i wypchnij.`
    : `CI jest czerwone na commicie ${sha7}. Napraw tylko to; nie zmieniaj innych plików ani asercji testów.\n\nLog:\n${failureLog(pr.head.sha)}`;
  if (DRY) { log(`[dry] nudge ${t.id} (${kind})`); return; }
  let sent = false;
  const turn = kind === 'plan' ? t.planNudges : t.nudges;
  if (turn % 2 === 0 && t.sessionId) { // 1. próba przez API sesji, 2. przez komentarz w PR
    try { await jules('POST', `/sessions/${t.sessionId}:sendMessage`, { prompt: msg }); sent = true; } catch (e) { warn(`sendMessage ${t.id}:`, e.message.slice(0, 100)); }
  }
  if (!sent) gh('POST', R(`issues/${pr.number}/comments`), { body: `@jules ${msg}` });
  t.note = `prośba o poprawkę #${turn + 1} (${kind})`;
}

async function handlePr(ctx, t) {
  const { state } = ctx;
  const pr = gh('GET', R(`pulls/${t.prNumber}`));
  if (pr.merged) { t.status = 'merged'; t.note = ''; return; }
  if (pr.state === 'closed') { needsHuman(ctx, t, 'PR zamknięty bez scalenia'); return; }
  const labels = (pr.labels || []).map((l) => l.name);
  if (labels.includes('hold')) { t.note = 'etykieta hold'; return; }
  if (labels.includes('needs-human')) { t.status = 'needs-human'; return; }
  const sha = pr.head.sha;

  if (pr.mergeable_state === 'dirty') {
    if (t.nudges >= CFG.maxNudges) { needsHuman(ctx, t, 'konflikty, których Jules nie rozwiązał'); return; }
    if (t.conflictNudgedSha !== sha) { await nudge(ctx, t, pr, 'conflict'); t.nudges += 1; t.conflictNudgedSha = sha; }
    return;
  }
  const ci = ciStatus(sha);
  if (ci.state === 'none') {
    if (t.noCiSha !== sha) { t.noCiSha = sha; t.noCiSince = now(); }
    else if (now() - t.noCiSince > CFG.noCiGraceMin * 60e3) needsHuman(ctx, t, 'brak wyników CI na PR (czy workflow CI ma wyzwalacz pull_request?)');
    return;
  }
  if (ci.state === 'pending') return;
  if (ci.state === 'red') {
    if (t.redSha !== sha) { t.redSha = sha; t.redSince = now(); t.redCycles += 1; if (t.redCycles > CFG.maxRedCycles) { needsHuman(ctx, t, `CI czerwone ${t.redCycles} razy z rzędu`); return; } }
    if ((now() - t.redSince) / 60e3 >= CFG.fixGraceMin) {
      if (t.nudges >= CFG.maxNudges) { needsHuman(ctx, t, 'CI nadal czerwone po prośbach o poprawkę'); return; }
      await nudge(ctx, t, pr, 'ci'); t.nudges += 1; t.redSince = now();
    } else t.note = 'czeka na CI Fixer';
    return;
  }
  // zielone: merge
  if (pr.mergeable === null && pr.mergeable_state === 'unknown') { t.note = 'GitHub liczy mergeable'; return; }
  const prFiles = gh('GET', R(`pulls/${t.prNumber}/files?per_page=100`));
  const files = prFiles.map((f) => f.filename);
  const forbidden = files.find((f) => f.startsWith('.github/workflows/') || f.startsWith('scripts/jules-loop/'));
  if (forbidden) { needsHuman(ctx, t, `PR zmienia ${forbidden}: scal ręcznie`); return; }
  if (CFG.planGuard) {
    const problems = planProblems(t, prFiles);
    if (problems.length) {
      if (t.planNudgedSha === sha) { // czekamy na nowy commit od Julesa
        if (now() - (t.planNudgedAt || 0) > CFG.fixGraceMin * 60e3) {
          if (t.planNudges >= CFG.maxPlanNudges) needsHuman(ctx, t, `PR niezgodny z zadaniem: ${problems[0].slice(0, 160)}`);
          else { t.planNudgedSha = null; }
        } else t.note = 'czeka na poprawkę zgodności z planem';
        return;
      }
      if (t.planNudges >= CFG.maxPlanNudges) { needsHuman(ctx, t, `PR niezgodny z zadaniem: ${problems[0].slice(0, 160)}`); return; }
      if (DRY) { log(`[dry] niezgodność ${t.id}: ${problems.join(' | ')}`); return; }
      await nudge(ctx, t, pr, 'plan', problems.join('\n- '));
      t.planNudges += 1; t.planNudgedSha = sha; t.planNudgedAt = now();
      return;
    }
  }
  if (DRY) { log(`[dry] merge PR #${t.prNumber}`); return; }
  try {
    gh('PUT', R(`pulls/${t.prNumber}/merge`), { merge_method: 'squash', commit_title: `${t.id}: ${(t.title || pr.title || '').slice(0, 80)}` });
    t.status = 'merged'; t.note = ''; state.lastMergeAt = now();
    try { gh('DELETE', R(`git/refs/heads/${pr.head.ref}`)); } catch { /* gałąź może być usunięta automatycznie */ }
    log(`✅ ${t.id}: PR #${t.prNumber} scalony`);
    const brief = (pr.body || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/^[#>*\-\s]+/, '').trim()).filter(Boolean).slice(0, 2).join(' ').slice(0, 220);
    const fixes = (t.nudges || 0) + (t.planNudges || 0);
    jr(ctx, `✅ **${t.id}** #${t.prNumber} ${(t.title || pr.title || '').slice(0, 80)}: ${brief || '(brak opisu w PR)'} · efekt: +${pr.additions ?? '?'}/−${pr.deletions ?? '?'} w ${pr.changed_files ?? files.length} plikach, CI zielone${fixes ? `, poprawek: ${fixes}` : ''}`);
  } catch (e) {
    t.mergeFails += 1; t.note = `merge nieudany: ${e.message.slice(-120)}`;
    if (t.mergeFails >= 3) needsHuman(ctx, t, `nie da się scalić (${e.message.slice(-100)})`);
  }
}

function recheckHuman(ctx, t) {
  const pr = gh('GET', R(`pulls/${t.prNumber}`));
  if (pr.merged) { t.status = 'merged'; t.note = 'scalone ręcznie'; return; }
  const labels = (pr.labels || []).map((l) => l.name);
  if (pr.state === 'open' && !labels.includes('needs-human')) {
    Object.assign(t, { status: 'pr', nudges: 0, planNudges: 0, planNudgedSha: null, redCycles: 0, mergeFails: 0, errors: 0, redSha: null, note: 'wznowione' });
    log(`▶️ ${t.id}: wznowione po zdjęciu etykiety needs-human`); jr(ctx, `▶️ **${t.id}** wznowione po zdjęciu needs-human`);
  }
}

async function processTasks(ctx, list) {
  for (const t of list) {
    if (t.status === 'merged' || t.status === 'skipped') continue;
    try {
      if (t.status === 'pending') await startTask(ctx, t);
      else if (t.status === 'running') await pollTask(ctx, t);
      if (t.status === 'pr') await handlePr(ctx, t);
      else if (t.status === 'needs-human' && t.prNumber) recheckHuman(ctx, t);
    } catch (e) {
      warn(`${t.id}:`, e.message); t.note = e.message.slice(0, 120); t.errors += 1;
      if (t.errors >= CFG.maxErrors && t.status !== 'needs-human') needsHuman(ctx, t, `powtarzające się błędy: ${e.message.slice(0, 100)}`);
    }
  }
}

// ---------- Fazy ----------
function startNextWave(ctx) {
  const { state, events } = ctx;
  const waves = scanWaves();
  const pending = [...waves.keys()].filter((n) => !state.doneWaves.includes(n)).sort((a, b) => a - b);
  if (!pending.length) {
    if (!state.waitingNotified) {
      const last = state.doneWaves.length ? Math.max(...state.doneWaves) : 0;
      events.push(`💤 Brak kolejnej fali. ${state.lastWaveSummary ? state.lastWaveSummary + ' ' : ''}Wypchnij tasks/W${last + 1}-*.md na ${BASE}, a pętla ruszy sama. Zmiany i efekty: ${CFG.stateFile}.`);
      state.waitingNotified = true;
    }
    return false;
  }
  const n = pending[0];
  const files = waves.get(n);
  const hash = crypto.createHash('sha1').update(files.map((f) => f.file + fs.readFileSync(f.file, 'utf8')).join('\0')).digest('hex');
  const problems = validateWave(files);
  if (problems.length) {
    if (state.invalid[n] !== hash) { events.push(`🛑 Fala W${n} odrzucona przed startem (żadna sesja nie zużyta):\n  - ${problems.join('\n  - ')}`); state.invalid[n] = hash; }
    return false;
  }
  state.wave = n; state.phase = 'build'; state.waitingNotified = false; state.waveStartedAt = now();
  state.tasks = files.map((f) => mkTask({ id: f.id, kind: 'build', file: f.file, title: titleOf(fs.readFileSync(f.file, 'utf8'), f.id) }));
  state.testTasks = []; state.integrate = { attempts: 0, tasks: [], dispatched: {}, lastFixSha: null, blockedNotified: false };
  log(`▶️ Start fali W${n}: ${files.length} zadań`); jr(ctx, `▶️ Start fali W${n}: ${files.length} zadań (${files.map((f) => f.id).join(', ')})`);
  return true;
}

const isSource = (f) => !/(^|\/)(tests?|__tests__|spec|docs?|tasks|assets)\//i.test(f) && !/\.(test|spec)\./i.test(f)
  && !/\.(md|json|ya?ml|lock|txt|png|jpe?g|gif|svg|ico|ttf|woff2?|toml)$/i.test(f);

function createTestWave(ctx) {
  const { state, events } = ctx;
  const items = [];
  if (CFG.testWave) {
    for (const t of state.tasks) {
      if (!t.prNumber) continue;
      try {
        const src = gh('GET', R(`pulls/${t.prNumber}/files?per_page=100`)).filter((f) => f.status !== 'removed').map((f) => f.filename).filter(isSource);
        if (src.length) items.push({ id: t.id, pr: t.prNumber, files: src });
      } catch (e) { warn(`pliki PR #${t.prNumber}:`, e.message); }
    }
  }
  if (!items.length) { state.phase = 'integrate'; return; }
  const size = Math.ceil(items.length / CFG.testTaskCap);
  const tasks = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const id = `T${state.wave}-${String(tasks.length + 1).padStart(2, '0')}`;
    const prompt = [
      `Zadanie ${id}: testy dla zmian z zescalonych PR ${chunk.map((c) => `#${c.pr} (${c.id})`).join(', ')}. Tytuł PR zacznij od [${id}].`,
      `Pliki produkcyjne do pokrycia: ${[...new Set(chunk.flatMap((c) => c.files))].join(', ')}.`,
      'Dodaj brakujące testy: przypadki brzegowe, błędne dane wejściowe, regresje. Użyj istniejącego frameworka i konwencji z AGENTS.md.',
      'Nie zmieniaj ani nie usuwaj istniejących asercji. Kod produkcyjny zmień tylko, gdy test ujawnia realny błąd: minimalna poprawka i sekcja "Znaleziony błąd" w opisie PR.',
      'Przed zakończeniem uruchom testy i build; PR tylko gdy przechodzą. Nikt nie odpowie na pytania: przyjmij rozsądne założenia i opisz je w PR.',
    ].join('\n');
    tasks.push(mkTask({ id, kind: 'test', title: `testy dla ${chunk.map((c) => c.id).join(', ')}`, prompt }));
  }
  state.testTasks = tasks; state.phase = 'tests';
  log(`🧪 Fala testów W${state.wave}: ${tasks.length} zadań`); jr(ctx, `🧪 Fala testów W${state.wave}: ${tasks.length} zadań dla ${items.length} scalonych PR`);
}

function checkIntegration(ctx) {
  const { state, events } = ctx;
  const integ = state.integrate;
  const sha = gh('GET', R(`commits/${BASE}`)).sha;
  const runs = gh('GET', R(`actions/workflows/${CI_WORKFLOW}/runs?head_sha=${sha}&per_page=5`)).workflow_runs || [];
  if (!runs.length) {
    if (!integ.dispatched[sha] && now() - (state.lastMergeAt || 0) > 5 * 60e3) {
      try { ghw('POST', R(`actions/workflows/${CI_WORKFLOW}/dispatches`), { ref: BASE }); integ.dispatched[sha] = true; log('Uruchomiono CI na main (workflow_dispatch)'); }
      catch (e) { warn('workflow_dispatch CI:', e.message.slice(0, 120)); if (!integ.blockedNotified) { events.push(`🛑 Brak CI na ${BASE}. Dodaj do ${CI_WORKFLOW} wyzwalacze push (${BASE}) i workflow_dispatch.`); integ.blockedNotified = true; } }
    }
    return 'wait';
  }
  const run = runs[0];
  if (run.status !== 'completed') return 'wait';
  if (run.conclusion === 'success') return 'done';
  if (integ.lastFixSha === sha) return 'wait';
  if (integ.attempts >= CFG.maxIntegrationFixes) {
    if (!integ.blockedNotified) { events.push(`🛑 CI na ${BASE} czerwone po ${integ.attempts} naprawach integracyjnych (commit ${sha.slice(0, 7)}). Wymaga człowieka.`); integ.blockedNotified = true; }
    return 'blocked';
  }
  integ.attempts += 1; integ.lastFixSha = sha;
  const prompt = [
    `Zadanie I${state.wave}-${integ.attempts}: po scaleniu fali W${state.wave} CI na ${BASE} jest czerwone (commit ${sha.slice(0, 7)}). Tytuł PR zacznij od [I${state.wave}-${integ.attempts}].`,
    `Log błędu:\n${failureLog(sha)}`,
    'Znajdź przyczynę i napraw ją minimalną zmianą. Nie zmieniaj ani nie usuwaj asercji, żeby testy przeszły. Uruchom testy i build przed zakończeniem.',
  ].join('\n');
  integ.tasks = [mkTask({ id: `I${state.wave}-${integ.attempts}`, kind: 'integrate', title: 'naprawa integracji', prompt })];
  log(`🔧 CI na ${BASE} czerwone po fali W${state.wave}: uruchomiono naprawę integracyjną (próba ${integ.attempts}).`); jr(ctx, `🔧 CI na ${BASE} czerwone po fali W${state.wave}: naprawa integracyjna, próba ${integ.attempts}`);
  return 'fixing';
}

async function advance(ctx) {
  const { state, events } = ctx;
  for (let guard = 0; guard < 6; guard += 1) {
    if (state.phase === 'idle') { if (startNextWave(ctx)) continue; break; }
    const list = state.phase === 'build' ? state.tasks : state.phase === 'tests' ? state.testTasks : state.integrate.tasks;
    await processTasks(ctx, list);
    if (!list.every((t) => t.status === 'merged' || t.status === 'skipped')) break;
    if (state.phase === 'build') { createTestWave(ctx); continue; }
    if (state.phase === 'tests') { state.phase = 'integrate'; continue; }
    const r = checkIntegration(ctx);
    if (r !== 'done') break;
    const merged = state.tasks.filter((t) => t.status === 'merged').length;
    const testPrs = state.testTasks.filter((t) => t.status === 'merged').length;
    const fixes = allTasks(state).reduce((a, t) => a + (t.nudges || 0) + (t.planNudges || 0), 0);
    state.lastWaveSummary = `Fala W${state.wave} gotowa: ${merged} PR budowy, ${testPrs} PR testów, CI na ${BASE} zielone${fixes ? `, poprawek po drodze: ${fixes}` : ''}${state.integrate.attempts ? `, napraw integracji: ${state.integrate.attempts}` : ''}.`;
    log(`✅ ${state.lastWaveSummary}`); jr(ctx, `🏁 ${state.lastWaveSummary}`);
    state.doneWaves.push(state.wave);
    flushJournal(ctx);
    Object.assign(state, { phase: 'idle', wave: null, tasks: [], testTasks: [], waitingNotified: false });
    state.integrate = { attempts: 0, tasks: [], dispatched: {}, lastFixSha: null, blockedNotified: false };
  }
}

function applyAction(ctx) {
  const { state, events } = ctx;
  if (ACTION === 'resume') {
    for (const t of allTasks(state)) if (t.status === 'needs-human') {
      Object.assign(t, { status: t.prNumber ? 'pr' : 'pending', nudges: 0, redCycles: 0, mergeFails: 0, errors: 0, redSha: null, attempts: 0, note: 'wznowione ręcznie' });
      if (!t.prNumber) t.sessionId = null;
    }
    state.integrate.attempts = 0; state.integrate.blockedNotified = false; state.integrate.lastFixSha = null; state.quotaBlockedUntil = 0;
    log('▶️ Wznowiono zadania oznaczone needs-human.'); jr(ctx, '▶️ Ręczne wznowienie zadań needs-human');
  } else if (ACTION === 'skip' && ACTION_ARG) {
    const t = allTasks(state).find((x) => x.id === ACTION_ARG);
    if (t) { t.status = 'skipped'; t.note = 'pominięte ręcznie'; log(`⏭️ Pominięto ${t.id}.`); jr(ctx, `⏭️ Pominięto ${t.id} ręcznie`); } else warn(`nie znaleziono zadania ${ACTION_ARG}`);
  } else if (ACTION === 'skip-wave' && state.wave) {
    log(`⏭️ Porzucono falę W${state.wave}.`); jr(ctx, `⏭️ Porzucono falę W${state.wave} ręcznie`);
    state.doneWaves.push(state.wave);
    Object.assign(state, { phase: 'idle', wave: null, tasks: [], testTasks: [] });
    state.integrate = { attempts: 0, tasks: [], dispatched: {}, lastFixSha: null, blockedNotified: false };
  }
}

async function main() {
  if (!JULES_KEY && !DRY) { console.error('Brak JULES_API_KEY'); process.exit(2); }
  log(`Jules Loop tick · repo=${REPO} · action=${ACTION}${DRY ? ' · DRY-RUN' : ''} · ${iso()}`);
  const { issue: loaded, state } = loadState();
  const ctx = { state, events: [], budgetNoted: false };
  applyAction(ctx);
  if (DRY) { // sprawdź łączność z Julesem bez tworzenia sesji
    try { log('Jules: repo widoczne jako', await ensureSource(state)); } catch (e) { warn(e.message); }
  }
  await advance(ctx);
  {
    const cur = state.phase === 'build' ? state.tasks : state.phase === 'tests' ? state.testTasks : null;
    const stalled = cur && cur.some((t) => t.status === 'needs-human') && cur.every((t) => ['merged', 'skipped', 'needs-human'].includes(t.status));
    if (state.journal.length && (state.phase === 'idle' || stalled)) flushJournal(ctx);
  }
  const issue = saveState(loaded, state) || loaded;
  notify(issue, ctx.events);
  const moreWaves = [...scanWaves().keys()].some((n) => !state.doneWaves.includes(n));
  setActiveVar(state.phase !== 'idle' || moreWaves);
  log(`Koniec ticka: faza=${state.phase}, fala=${state.wave}`);
}

main().catch((e) => { console.error('❌', e.stack || e.message); process.exit(1); });
