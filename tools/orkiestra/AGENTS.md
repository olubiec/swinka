# AGENTS.md — rules for every agent session in this repo

You are implementing ONE task of the `orkiestra` project (a Python CLI that runs waves of
Antigravity `agy` agent tasks in git worktrees and merges them via GitHub).

## Hard rules
1. Read ONLY: this file, your task file in `plan/zadania/`, and the files your task names.
   Do NOT read `PLAN.md`, `vendor/` or other tasks' files unless your task file says so.
2. Create/modify ONLY the files listed under "Files" in your task. Never touch anything else.
   If you believe another file must change, stop and say so in your final reply.
3. Do NOT run `git commit`, `git push`, `git checkout`, or create PRs. The human/orchestrator does that.
4. Do NOT install packages globally. Allowed: `pip install -e ".[dev]"` once if imports fail.
5. Run only the tests of your task (command given in the task), not the whole suite in a loop.
   Max 3 test-fix iterations; if still failing, stop and report.
6. Final reply: ONE line: `DONE: <what you did, max 20 words>` or `BLOCKED: <reason, max 30 words>`.
   No summaries, no file listings, no code in the final reply.

## Tech stack
- Python 3.11+, standard library + `PyYAML` only. Dev: `pytest`, `ruff`.
- Type hints everywhere (`from __future__ import annotations` at top of each module).
- Shared types live in `orkiestra/models.py`, exceptions in `orkiestra/errors.py`. Import them; never redefine.
- Subprocesses: `subprocess.run([...], capture_output=True, text=True, check=False)` — list args, no `shell=True`
  (only exception: running a user-provided `test_command`, which uses `shell=True`).
- Logging: `logger = logging.getLogger(__name__)`; no `print()` outside `orkiestra/cli.py`.
- User-facing messages (CLI output, PR bodies) in Polish; code, identifiers and comments in English.
- Tests: pytest, no network, no real `agy` or `gh` (mock subprocess or use `tests/fakes/`). Use `tmp_path`.
- Keep functions small; no new dependencies; no global mutable state.
