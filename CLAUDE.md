# Cuy – instructions for Claude Code

Read AGENTS.md once per session (single source of rules for Claude and Jules). Plan and status: `docs/PLAN.md`. Root `PLAN.md` is the old Polish master plan: read only a section a task names, never the whole file.

## Save tokens
- Find code with grep/glob first, then read only the needed line ranges. Do not read assets/ binaries, *.Designer.cs, Resources/animations.xml (huge base64) or web/home/minigames/lib/phaser.min.js.
- Do exactly the listed steps. No extra refactors, no new abstractions, no compatibility shims or aliases for old names.
- Build once per task, not after every file. Final report: max 15 lines.

## Commands (Windows, run from repo root)
- Build + tests: `powershell -ExecutionPolicy Bypass -File tools/build.ps1` (add `-Config Release`, or `-NoTests`)
- App output: `src/Cuy/bin/Debug/Cuy.exe` (Release: `src/Cuy/bin/Release/Cuy.exe`)
- Log: `%LocalAppData%\Cuy\logs\cuy.log`; save: `%AppData%\Cuy\save.json`

## Working with Jules
Claude writes plans and task files (`tasks/W<n>-*.md`); Jules writes the code. Task template: see `docs/PLAN.md` ("Szablon zadania"). Do not push to `main`; open a PR.
