# Cuy – instructions for Claude Code

Read RULES.md once per session. PLAN.md is the human's Polish plan: read only the section a task names, never the whole file.

## Save tokens
- Find code with grep/glob first, then read only the needed line ranges. Do not read assets/ binaries, *.Designer.cs, Resources/animations.xml (huge base64) or web/home/minigames/lib/phaser.min.js.
- Do exactly the listed steps. No extra refactors, no new abstractions, no compatibility shims or aliases for old names.
- Build once per lettered part, not after every file. Final report: max 15 lines.

## Commands (Windows, run from repo root)
- Build + tests: `powershell -ExecutionPolicy Bypass -File tools/build.ps1` (add `-Config Release`, or `-NoTests`)
- App output: `src/Cuy/bin/Debug/Cuy.exe` (Release: `src/Cuy/bin/Release/Cuy.exe`)
- Log: `%LocalAppData%\Cuy\logs\cuy.log`; save: `%AppData%\Cuy\save.json`

## Canonical ids (use only these strings in code)
- items: hay pellets bell_pepper parsley kale cucumber carrot chew_stick ball tunnel house water_bottle cake
- icons: keys of assets/icons/icons.json (clover, poop, pig_head, need_fullness, need_vitamin_c, need_energy, need_mood, need_cleanliness, need_teeth, plus the item ids, strawberry, onion, chocolate)
- needs: fullness vitamin_c energy mood cleanliness teeth
- stages: baby junior adult senior legend; currency: clovers (icon clover)
- Polish ids may appear only in the save migration in src/Cuy.Core/Save/SaveSystem.cs.

## Commit
One commit per task, message given in the task. Do not push unless the task says so.
