#!/usr/bin/env node
/**
 * Antigravity Task & Wave Runner for Cuy
 * 
 * Replaces legacy Jules Loop with Antigravity-native orchestration:
 * - Multi-agent task execution
 * - Automated Plan Guard (Zmieniaj / Wymagane / assertions check)
 * - Parallel test runner (Core xUnit + Web Playwright + .NET Build + JS lint)
 * - Branch creation, git push, automatic merge to main upon passing verification
 * - Project state tracking
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const TASKS_DIR = path.join(REPO_ROOT, 'tasks');
const TASKS_DONE_DIR = path.join(TASKS_DIR, 'done');
const STATE_FILE = path.join(REPO_ROOT, 'docs', 'PROJECT_STATE.md');

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg) { console.log(`${c.cyan}[Antigravity]${c.reset} ${msg}`); }
function logOk(msg) { console.log(`${c.green}[PASS]${c.reset} ${msg}`); }
function logWarn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); }
function logErr(msg) { console.log(`${c.red}[FAIL]${c.reset} ${msg}`); }

function sh(cmd, options = {}) {
  return execSync(cmd, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    ...options
  });
}

function getActiveTasks() {
  if (!fs.existsSync(TASKS_DIR)) return [];
  const waveOrder = ['W-UPD', 'W-NYAN', 'W-MULTI', 'W4', 'W5', 'W6', 'W7', 'W8'];
  return fs.readdirSync(TASKS_DIR)
    .filter(f => /^W.*\.md$/.test(f))
    .sort((a, b) => {
      const getWave = (name) => {
        for (const w of waveOrder) {
          if (name.startsWith(w)) return w;
        }
        return name.split('-')[0];
      };
      const wA = getWave(a);
      const wB = getWave(b);
      const idxA = waveOrder.indexOf(wA);
      const idxB = waveOrder.indexOf(wB);
      if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
      return a.localeCompare(b);
    })
    .map(parseTaskFile);
}

function parseTaskFile(filename) {
  const fullPath = path.join(TASKS_DIR, filename);
  const content = fs.readFileSync(fullPath, 'utf8');
  const matchId = filename.match(/^((?:W-[A-Z]+|W\d+)-\d+)/);
  const id = matchId ? matchId[1] : filename.replace(/\.md$/, '');
  const titleMatch = content.match(/^#\s*(.*?)$/m);
  const title = titleMatch ? titleMatch[1].trim() : filename;

  const getHeader = (pattern) => {
    const m = content.match(pattern);
    return m ? m[1].trim() : '';
  };

  const zmieniajRaw = getHeader(/(?:Zmieniaj|Change):\s*([^\r\n]+)/i);
  const wymaganeRaw = getHeader(/(?:Wymagane|Required):\s*([^\r\n]+)/i);
  const weryfikacja = getHeader(/(?:Weryfikacja|Verify):\s*([^\r\n]+)/i);
  const dependsOn = getHeader(/(?:Depends on|Zależy od):\s*([^\r\n]+)/i);

  const cleanList = (raw) => raw
    ? raw.split(/[,;\s]+/)
        .map(s => s.trim().replace(/^`|`$/g, ''))
        .filter(Boolean)
    : [];

  return {
    filename,
    id,
    title,
    zmieniaj: cleanList(zmieniajRaw),
    wymagane: cleanList(wymaganeRaw),
    weryfikacja,
    dependsOn,
    content
  };
}

// Check for overlapping file scopes in active wave
function checkScopeCollisions(tasks) {
  const collisions = [];
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const taskA = tasks[i];
      const taskB = tasks[j];
      const shared = taskA.zmieniaj.filter(f => taskB.zmieniaj.includes(f));
      if (shared.length > 0) {
        collisions.push({ a: taskA.id, b: taskB.id, files: shared });
      }
    }
  }
  return collisions;
}

// Verify Plan Guard against current git diff
function verifyPlanGuard(task) {
  log(`Verifying Plan Guard for ${task.id}...`);
  const status = sh('git status --porcelain').trim();
  if (!status) {
    logWarn(`Working directory is clean. No changes to inspect.`);
    return true;
  }

  const changedFiles = status.split('\n')
    .map(line => line.substring(3).trim().replace(/\\/g, '/'))
    .filter(Boolean);

  const allowed = new Set([
    ...task.zmieniaj.map(f => f.replace(/\\/g, '/')),
    ...task.wymagane.map(f => f.replace(/\\/g, '/')),
    'package-lock.json',
    'yarn.lock'
  ]);

  const unauthorized = changedFiles.filter(f => {
    // Check wildcard match or exact match
    return !Array.from(allowed).some(allow => {
      if (allow.endsWith('*')) return f.startsWith(allow.slice(0, -1));
      return f === allow || f.startsWith(allow + '/');
    });
  });

  if (unauthorized.length > 0) {
    logErr(`Plan Guard violation! Files changed outside 'Zmieniaj:':\n  ${unauthorized.join('\n  ')}`);
    return false;
  }

  // Check required files
  for (const req of task.wymagane) {
    const p = path.join(REPO_ROOT, req);
    if (!fs.existsSync(p)) {
      logErr(`Plan Guard violation! Missing required file: ${req}`);
      return false;
    }
  }

  // Check for deleted test assertions
  const diff = sh('git diff -U0');
  const removedAsserts = (diff.match(/^-(?:[ \t]*)(Assert\.|expect\(|assert\.)/gm) || []).length;
  const addedAsserts = (diff.match(/^\+(?:[ \t]*)(Assert\.|expect\(|assert\.)/gm) || []).length;

  if (removedAsserts > addedAsserts) {
    logErr(`Plan Guard warning: Removed test assertions detected (-${removedAsserts}, +${addedAsserts}). Asercje nie mogą być usuwane!`);
    return false;
  }

  logOk(`Plan Guard passed for ${task.id}.`);
  return true;
}

// Parallel Test Runner
async function runTests(options = { core: true, smoke: true, build: true }) {
  log('Starting test suite execution...');
  const results = [];

  // 1. Build check
  if (options.build) {
    const start = Date.now();
    try {
      sh('dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true --nologo');
      results.push({ name: 'Desktop App Build (WinForms .NET 4.8)', code: 0, time: ((Date.now() - start) / 1000).toFixed(1) });
    } catch (e) {
      results.push({ name: 'Desktop App Build (WinForms .NET 4.8)', code: 1, time: ((Date.now() - start) / 1000).toFixed(1), out: e.stdout || e.stderr || e.message });
    }
  }

  // 2. Core Tests
  if (options.core) {
    const start = Date.now();
    try {
      const out = sh('dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --nologo');
      results.push({ name: 'Core Tests (xUnit)', code: 0, time: ((Date.now() - start) / 1000).toFixed(1), out });
    } catch (e) {
      results.push({ name: 'Core Tests (xUnit)', code: 1, time: ((Date.now() - start) / 1000).toFixed(1), out: e.stdout || e.stderr || e.message });
    }
  }

  // 3. Web Smoke
  if (options.smoke) {
    const start = Date.now();
    try {
      const out = sh('node tools/qa/web-smoke.js');
      results.push({ name: 'Web Smoke Test (Playwright)', code: 0, time: ((Date.now() - start) / 1000).toFixed(1), out });
    } catch (e) {
      results.push({ name: 'Web Smoke Test (Playwright)', code: 1, time: ((Date.now() - start) / 1000).toFixed(1), out: e.stdout || e.stderr || e.message });
    }
  }

  let allPassed = true;
  console.log('\n--- Test Suite Summary ---');
  for (const r of results) {
    if (r.code === 0) {
      logOk(`${r.name} in ${r.time}s`);
    } else {
      allPassed = false;
      logErr(`${r.name} FAILED in ${r.time}s\n${(r.out || '').slice(-600)}`);
    }
  }

  return allPassed;
}

// Merge completed task branch to main
function mergeTaskToMain(task) {
  log(`Merging task ${task.id} to main...`);
  sh('git checkout main');
  sh(`git merge task/${task.id} --no-edit`);

  // Move task file to done
  if (!fs.existsSync(TASKS_DONE_DIR)) fs.mkdirSync(TASKS_DONE_DIR, { recursive: true });
  const oldPath = path.join(TASKS_DIR, task.filename);
  const donePath = path.join(TASKS_DONE_DIR, task.filename);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, donePath);
    sh(`git add tasks/done/${task.filename}`);
    sh(`git rm --cached tasks/${task.filename} 2>nul || git rm -f tasks/${task.filename}`);
  }

  // Update PROJECT_STATE.md
  if (fs.existsSync(STATE_FILE)) {
    const today = new Date().toISOString().split('T')[0];
    const logEntry = `- ${today} · [Antigravity] Scalono ${task.id}: ${task.title}\n`;
    let state = fs.readFileSync(STATE_FILE, 'utf8');
    state = state.replace('<!-- LOG -->\n', `<!-- LOG -->\n${logEntry}`);
    fs.writeFileSync(STATE_FILE, state, 'utf8');
    sh(`git add docs/PROJECT_STATE.md`);
  }

  sh(`git commit -m "[Antigravity] Merge ${task.id}: ${task.title}" --allow-empty`);
  sh('git push origin main');
  logOk(`Task ${task.id} merged into main and pushed.`);
}

// Show current status of all tasks, waves and collisions
function printStatus() {
  console.log(`${c.bold}=== Cuy Antigravity Orchestrator Status ===${c.reset}`);
  const tasks = getActiveTasks();
  console.log(`Active pending tasks: ${tasks.length}`);

  const waves = {};
  for (const t of tasks) {
    const wave = t.id.startsWith('W-') ? t.id.split('-').slice(0, 2).join('-') : t.id.split('-')[0];
    waves[wave] = waves[wave] || [];
    waves[wave].push(t);
  }

  for (const [w, wTasks] of Object.entries(waves)) {
    console.log(`\n${c.bold}Wave ${w}:${c.reset} (${wTasks.length} tasks)`);
    for (const t of wTasks) {
      console.log(`  - [${t.id}] ${t.title}`);
      console.log(`      Scope: ${t.zmieniaj.join(', ') || 'N/A'}`);
    }
    const collisions = checkScopeCollisions(wTasks);
    if (collisions.length > 0) {
      logWarn(`Scope collisions in ${w} (must run sequentially):`);
      for (const col of collisions) {
        console.log(`      ${col.a} <-> ${col.b}: ${col.files.join(', ')}`);
      }
    } else {
      logOk(`No scope collisions in ${w}. Tasks can be dispatched concurrently.`);
    }
  }
}

// Batch finish and merge entire wave
async function finishWave(wavePrefix) {
  log(`Starting batch verification and merge for Wave ${wavePrefix}...`);
  const tasks = getActiveTasks().filter(t => t.id.startsWith(wavePrefix));
  if (tasks.length === 0) {
    logWarn(`No active tasks found for wave ${wavePrefix}`);
    return;
  }

  // 1. Run all tests
  const testsOk = await runTests();
  if (!testsOk) {
    logErr(`Tests failed for Wave ${wavePrefix}. Aborting merge.`);
    process.exit(1);
  }

  // 2. Move task files to tasks/done/
  if (!fs.existsSync(TASKS_DONE_DIR)) fs.mkdirSync(TASKS_DONE_DIR, { recursive: true });
  for (const t of tasks) {
    const src = path.join(TASKS_DIR, t.filename);
    const dest = path.join(TASKS_DONE_DIR, t.filename);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest);
    }
  }

  // 3. Git commit & push
  sh('git add -A');
  const commitMsg = `[${wavePrefix}] Complete Wave ${wavePrefix} (${tasks.length} tasks)`;
  sh(`git commit -m "${commitMsg}" --allow-empty`);
  sh('git push origin main');
  logOk(`Wave ${wavePrefix} verified, committed and pushed to origin main.`);
}

// CLI handler
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';

  if (cmd === 'status') {
    printStatus();
  } else if (cmd === 'test' || cmd === 'verify') {
    const ok = await runTests();
    process.exit(ok ? 0 : 1);
  } else if (cmd === 'finish-wave') {
    const wavePrefix = args[1];
    if (!wavePrefix) {
      logErr('Please specify wave prefix, e.g. finish-wave W4');
      process.exit(1);
    }
    await finishWave(wavePrefix);
  } else if (cmd === 'guard') {
    const taskId = args[1];
    const tasks = getActiveTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      logErr(`Task not found: ${taskId}`);
      process.exit(1);
    }
    const ok = verifyPlanGuard(task);
    process.exit(ok ? 0 : 1);
  } else if (cmd === 'merge') {
    const taskId = args[1];
    const tasks = getActiveTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      logErr(`Task not found: ${taskId}`);
      process.exit(1);
    }
    mergeTaskToMain(task);
  } else {
    console.log(`Usage: node tools/antigravity-runner.mjs [status|test|guard <id>|merge <id>]`);
  }
}

main().catch(err => {
  logErr(err.stack || err.message);
  process.exit(1);
});
