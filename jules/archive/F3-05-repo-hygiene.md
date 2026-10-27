# Task F3-05: Repo hygiene (remove leftover agent scratch files, ignore backup files)

Read `AGENTS.md` first and follow it. Deletions only, plus three lines in `.gitignore`. It changes no code, no data and no docs, and can run at the same time as the other wave 3 tasks.

## Facts (checked on main, 26.10.2026)
Tracked files that are leftovers of earlier agent runs and not part of the product:
- repo root: `patch_click.sh`, `patch_decor.sh`, `patch_edge_director.patch`, `patch_form_pet.patch`, `patch_form_pet_nextstep.patch`, `patch_formpet.diff`,
  `patch_playanim.sh`, `patch_shadow.sh`, `replace_script.py`, `rm_scripts.sh`, `run_patch.sh`, `Program.cs` (a 15-line `ManualClock` demo, no project file next to it);
- folder `TestRand/` (`Program.cs`, `TestRand.csproj`; it is not in `Cuy.sln` and not in `.github/workflows/ci.yml`);
- `src/Cuy.Core/Pet.Care.cs.orig`, `web/home/features/coloring/feature.js.bak`, `tools/qa/calendar-screenshot.js` (a one-off screenshot script from F2-01; the CI uses `web-smoke.js`).
`.gitignore` has no rule for `*.orig`, `*.bak` or `*.rej`.

## Files you may change / delete
Only the files listed above, and `.gitignore`.

## Steps
1. For EACH file or folder above run `git grep -n "<file name>" -- . ':!jules' ':!*.md'` (the name without its folder) and read the hits in `.github`, `tools`, `src`, `tests`, `Cuy.sln` and
   `*.csproj`. Delete it only if nothing outside itself and outside the other files in this list refers to it. If something does, keep the file and list it in the PR with the reference.
2. Append to `.gitignore`: `*.orig`, `*.bak`, `*.rej`.
3. Run the full checks. Nothing may change in behaviour or in the test count.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; `node tools/qa/web-smoke.js`
(unchanged result); `git status` shows only deletions and the `.gitignore` change.

## PR description must contain
A table: file, referenced by (none / what), deleted yes/no.

## Gotowe pliki
None.

## Testy ręczne (ZWERYFIKUJ NA PC)
None.

When done, open a pull request against `main` titled `F3-05: Repo hygiene`.
