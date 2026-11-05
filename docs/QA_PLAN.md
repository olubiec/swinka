# Cuy – full QA plan (technical, visual, conceptual)

Status: plan only. Nothing here has been run yet. Each wave ends with a written report committed to
`docs/qa/reports/QA-<wave>.md` and pushed to `main`. Waves run in order; a wave is closed when its
report is pushed, even if it lists failures (failures are findings, not blockers for the next wave).

Rules for every wave (from AGENTS.md): English only, no change of existing test assertions, no new
dependencies, no edits to `.github/workflows` or `tools/orkiestra`. Fixes are NOT part of a test wave:
a finding goes into the report with severity (S1 crash/data loss, S2 wrong behaviour, S3 cosmetic,
S4 note) and a repro. Fix waves come after the reports.

Environment: Core tests and desktop build run on Linux (`DOTNET_ROLL_FORWARD=Major`,
`-p:EnableWindowsTargeting=true`). The WinForms app and `SelfTest.cs` run only on Windows; those
checks are listed as "manual (Windows)" and go to `docs/TESTY_RECZNE.md`.

Report template (`docs/qa/reports/QA-<wave>.md`): scope, commands run, pass/fail counts, findings
table (ID, severity, area, repro, expected vs actual), known-open items carried over, verdict.

## Known open items to re-check (carried over from W24-W33)
- Room key conflict: `PigRoomsMigrationTests.ThreeRosterPigsGetThreeRooms_AndSecondCallCreatesNone` (pig.Id) vs `NamedId ?? Id` everywhere else.
- 3 failing Core tests on clean HEAD: `WorldAssetsTests` (2), `GameSessionWorldTests.Open_OldSaveWithEquippedDecor...`.
- `icon-pig` missing; store CSS uses undefined vars; 404 for `dust_motes.png`, `cone_shade.png`, `lamp_floor.png`.
- Unwired: `ApplyTime`, `AttachPigRooms`, `OnMemorialChanged`, dorm bond bonus, comfort with hidden rooms, `customize.js`/`dorm.js` not loaded by `index.html`.
- `check-assets.js` atlas `file_x2` check must go before any `_x2` deletion.

## QA-1 – Static and build baseline (technical)
Goal: know exactly what is red before testing behaviour.
- Full Core suite (`dotnet test tests/Cuy.Core.Tests`), per-class failure list, flaky check (run 3x, compare).
- Desktop build Debug + Release; warnings count and new warnings vs `docs/PROJECT_STATE.md`.
- `node --check` on every `web/home/**/*.js` and `tools/qa/*.js`; JSON validity of all `assets/data/*.json` and `web/home/**/*.json`.
- `tools/qa`: `data-check`, `check-assets`, `check-icons`, `check-css-vars`, `plan-audit`, `layout.selftest`, `palette-test`, `a11y-check` (static part).
- Dead-reference scan: scripts in `index.html` vs files on disk, `features/index.json` vs folders, contracts in `docs/contracts/*.md` vs message handlers in `src/Cuy/dotNet/Features`.
- Save compatibility: load every old-save fixture in tests and one synthetic save per past schema version; round-trip (load, save, load) equality.
Deliverable: `QA-1.md` with the red list as the baseline for later waves.

## QA-2 – Core logic and economy (technical)
- Mutation-style review of coverage: list public `Pet`/`GameState`/`World` methods with no test touching them (grep + coverage run if `coverlet` is already available, otherwise by name).
- Property/fuzz tests as new files only: random action sequences (feed, buy, place, move, adopt, memorial, time jumps) against invariants: money never negative, item counts conserved, no duplicate room ids, every roster pig resolvable to one room, every placed item in grid bounds and owned.
- Time handling: offline gaps (1 min, 1 day, 30 days, clock going backwards, DST change), `ApplyTime` once wired.
- Economy: `tools/qa/economy-sim.js` for 1, 3, 5 pigs over 30 simulated days; check inflation, sink/source balance, store totals bound (five-pig total 19059 chosen in PK-30a: confirm it is intended).
- Pig rooms / dorm / homes / store: migrations from legacy single room, shared room share/unshare, memorial pigs, hidden rooms vs comfort, home variants pricing, refund rules.
- Validation layer: every `Input/Validation/*Messages.cs` with hostile input (null, empty, huge, wrong type, unknown ids, negative numbers, unicode, path-like strings).
Deliverable: `QA-2.md` with invariant results and the conflict decision recommendation for the room key.

## QA-3 – Bridge, persistence and robustness (technical)
- Web/native bridge contract: for each `docs/contracts/*.md`, send every message in valid and invalid form through the mock and through the C# handler tests; verify error replies are well-formed and never throw.
- Save robustness: truncated JSON, wrong types, missing sections, future schema version, huge roster, concurrent save (two writes), disk-full simulation where testable, backup/restore path.
- Long-run soak (headless): node/Playwright session of 30 min with scripted clicks across all screens; watch console errors, memory growth (heap snapshots at 0/10/30 min), timers leaking, event listener counts.
- Performance: startup time of `web/home`, frame time on the busiest room (max items, 5 pigs, lights on), DOM node count per screen, asset payload size.
- Manual (Windows): `SelfTest.cs` run, tray/process icon, DPI 100/150/200%, multi-monitor, fresh install and upgrade from the previous release.
Deliverable: `QA-3.md`.

## QA-4 – Graphical and UX (visual)
Use Playwright with Chromium (`CHROMIUM_PATH=/usr/bin/google-chrome`), screenshots at `deviceScaleFactor` 2 into `tools/qa/out/`, contact sheets referenced from the report.
- Screen matrix: every screen and feature (home, pigs, rooms, dorm, plan, customize, store, garden, farm, market, minigames) x viewport (800x600, 1280x720, 1920x1080, small window) x light/dark time of day x 1/3/5 pigs.
- State matrix: empty, full, error, loading, memorial pig, long names (Polish diacritics, 40 chars), max numbers.
- Pixel-art integrity: no blur (image-rendering), integer scaling, atlas alignment (`check-assets`, `anim-test`), sprite coverage per breed/coat, palette compliance (`palette-test`), icon coverage (`check-icons`, `icon-pig`).
- Lighting: `lights-test`, with and without the three missing assets; day/night transitions; no banding/clipping.
- Regression diff: baseline screenshots from this wave, stored for later comparison (`tools/qa/out/baseline/`, not committed if large; list hashes in the report).
- Accessibility: `a11y-check`, contrast ratios, keyboard-only walkthrough of every screen, focus order and visible focus, reduced-motion, text scaling 150%.
- Layout stress: resize drag from 400 to 2000 px, overflow/clipping detection, z-index overlaps of dialogs and tooltips.
Deliverable: `QA-4.md` with an image index and a severity-sorted visual defect list.

## QA-5 – Concept, gameplay and content (conceptual)
Judged against `docs/CONCEPT.md`, `docs/GOALS.md` and `docs/ROADMAP.md` (read the named sections only).
- Concept conformance: for each stated goal, which feature delivers it, is it reachable, is it discoverable without docs. Gap list: promised but missing, built but not in the concept.
- Player-journey walkthroughs (scripted + written): first launch, first day, first week, adopting a second pig, a pig dying/memorial, returning after a month, upgrading rooms, buying a home. Record friction points, dead ends, unclear text, missing feedback.
- Tone and content review: Polish/English text consistency, diary templates (`t_room_*` and others) for grammar, repetition, and tone suitable for the audience; naming rules (`NAMES.md`) coverage.
- Economy feel: time to first purchase, time to each home variant, whether idle play is rewarded without being exploitable; compare with `economy-sim` output.
- Emotional design check: memorial flow, neglect consequences (is anything punishing in a way the concept forbids?), notification/pet-presence intrusiveness on the desktop.
- Consistency audit: terminology across UI, docs and code (room/home/dorm/store); contradictions between docs (`PLAN.md`, `ROADMAP.md`, `PROJECT_STATE.md`) and reality.
Deliverable: `QA-5.md` with a prioritised recommendation list.

## QA-6 – Synthesis and release readiness
- Merge findings of QA-1..5 into one deduplicated register `docs/qa/FINDINGS.md` (ID, severity, area, owner wave, status).
- Re-run the QA-1 baseline to confirm nothing changed during testing.
- Proposed fix waves: group findings into packages (files disjoint, 1-6 items each), written into `docs/opt/packages.spec.json` terms but NOT generated until approved.
- Go/no-go table per area (core, bridge, UI, visuals, concept) with the evidence link.
Deliverable: `QA-6.md` plus `FINDINGS.md`.

## Execution
Per wave: subagents per test area write only new files under `tests/`, `tools/qa/` and `docs/qa/`;
the main agent runs the commands, collects results, writes the report, makes one commit
`QA-<n>: report` and pushes to `main`. Estimated order of effort: QA-1 small, QA-2 large, QA-3 medium,
QA-4 large (screenshots), QA-5 medium (reading and judgement), QA-6 small.
