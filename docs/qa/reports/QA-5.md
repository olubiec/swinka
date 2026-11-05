# QA-5 – Concept, gameplay, content

Date: 2026-11-05. Judged against `docs/CONCEPT.md` (17 lines), `docs/GOALS.md`, `docs/ROADMAP.md`, `docs/PROJECT_STATE.md`. Evidence: code/data greps, `economy-sim` output (QA-2), the 12 new `t_room_*` diary entries, QA-4 screenshots. No human play-through was possible on Linux (the WinForms app and the desktop pet behaviour cannot run here), so journey items marked "static" are judged from code and data only.

## Concept conformance
| Concept statement | Verdict | Evidence |
|---|---|---|
| Pig never dies; worst state is "very sick" | OK | No death/kill path in `Cuy.Core` (only memorial pigs, an explicit user choice via `SetMemorial`). |
| No ads, payments, telemetry | OK | No telemetry or payment code found. |
| No internet at runtime | **Partly** | `UpdateChecker` calls `api.github.com/repos/olubiec/swinka/releases/latest`. It is triggered from Settings ("check_update"), not at startup, but it is still a network call; the concept says "bez internetu w czasie działania". Also `SettingsFeature` passes a hard-coded current version `"1.0.0"`, so the comparison will be wrong after any release (F5-01). |
| In-game text in English | OK | No Polish diacritics in `web/home` UI strings or `assets/data` texts (only typographic `×`, `·`, `–`). |
| Dev mode not in player package | OK | `btnDevTest` is hidden when running in WebView (`app.js:120`), visible only in a plain browser. |
| Warm, short, humorous tone | OK | The 12 `t_room_*` entries are short, in first person, consistent, no grammar errors found, use the template grammar (`#room_cosy_thing#`). Slight repetition of "cosy" (3 of 12). |
| Each feature has a CI test or a manual-test entry | **Partly** | New W24-W33 features have Core tests and `web-smoke` steps. The unwired items (below) have neither, and 13 older features have no bridge contract (F3-05). |
| Pixel art, nearest-neighbour | OK | QA-4: all canvases/images pixelated. |

## Gameplay and economy (static, from `economy-sim`, 365 days, "sane" profile)
- Time to first room upgrade: casual 90 d, regular 51 d, heavy 26 d. Shared bedroom: 144 / 107 / 93 d. All content bought: heavy 100 %, regular 79 %, casual 44 %.
- The "smart" and "exploit" profiles reach no milestone in a year (F2-02). For a gift game aimed at one gentle player the casual numbers are acceptable (a milestone every 2-3 months), but the first meaningful purchase after 51-90 days is long for a game whose loop is daily petting; a quicker early reward (a cheap home variant or decor within the first week) is recommended.
- Top room level unreachable for casual/smart in a year (F2-03): confirm that is intentional "long tail".
- Five-pig total store cost 19059 (changed by PK-30a from 35000): confirm with the owner that the lower cap is intended.

## Player journeys (static review)
| Journey | Result |
|---|---|
| First launch | `30_firststart` smoke passes; new game gives starter pair with one room each (`GameSessionPigRoomsTests`). OK. |
| Adopting a second pig | Room is created via `PigAdopted` **only if `AttachPigRooms()` is called**; the session does not call it yet (listed open since W24). Rooms for adopted pigs appear only after the next `EnsurePigRooms`/restart. **S2 (F5-02).** |
| Memorial | Flow exists (`SetMemorial`, confirmation dialog, memory room), but the memorial UI test is flaky (F3-03) and `OnMemorialChanged` is not wired: a memorial pig's room is not updated until restart (F5-03). |
| Shared bedroom | Dorm logic and UI done, but `dorm.js`, `plan.js`, `customize.js` are not loaded by `index.html` (F3-06) and the bond bonus is not applied (`DormBondBonus` unused). The headline benefit of buying the dorm (1800 clovers) is therefore absent (F5-04, **S2**). |
| Returning after a month | Offline gap handled by existing time code; `ApplyTime` for pig rooms not wired, so comfort/diary hooks for rooms do not run for the gap (F5-05, S3). |
| Store | Works functionally but looks broken (F4-01). A player will see the Store as the least polished screen. |

## Documentation consistency
- `docs/PROJECT_STATE.md` status says "46 waves, 162 tasks" and its log ends on 28.10; reality: W24-W33 executed. Stale (F5-06, S4).
- `docs/QA_PLAN.md` known-open list and this report agree with the code as of 2706e57.
- Terminology: UI says "Shared bedroom", code and docs say "dorm", `rooms` feature contains the dorm; acceptable but document the mapping in `docs/contracts/dorm.md` (already does).
- `docs/ROADMAP.md` is in English while `CONCEPT.md`/`GOALS.md`/`PROJECT_STATE.md` are Polish; AGENTS.md requires English (F5-07, S4).

## Findings summary
| ID | Sev | Description |
|---|---|---|
| F5-01 | S3 | Update check hard-codes version "1.0.0" and uses the network (concept says no internet at runtime). Decide: keep as explicit opt-in click, document it in CONCEPT, read the real assembly version. |
| F5-02 | S2 | `AttachPigRooms()` not called by the session: newly adopted pigs get no room until restart. |
| F5-03 | S3 | `OnMemorialChanged` not wired after `SetMemorial`. |
| F5-04 | S2 | Dorm UI scripts not loaded and bond bonus not applied: a paid feature without its benefit. |
| F5-05 | S3 | `ApplyTime` (rooms) not wired. |
| F5-06 | S4 | `PROJECT_STATE.md` stale. |
| F5-07 | S4 | Language policy: Polish docs vs AGENTS.md "English everywhere". |
| F5-08 | S3 | Early-game reward pacing (first purchase 51-90 days). |

## Verdict
The concept is respected in tone, safety and visuals. The biggest conceptual gap is that W24-W27 delivered the rooms/dorm/homes features as code and screens, but their wiring (F5-02, F5-04) is unfinished, so the new headline features are not fully reachable by a player.
