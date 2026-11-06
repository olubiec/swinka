# Cuy – full experience test plan (every small action)

Scope: what a player sees and does on Windows, end to end. Complements `docs/QA_PLAN.md` (static/core/concept)
and `docs/DEBUG_PLAN.md` (physics waves). Status: plan, nothing here has been run.

Severity: S1 crash / data loss / pig lost, S2 wrong behaviour, S3 cosmetic, S4 note.
Every case: ID, steps, expected, result (pass / fail / blocked), severity, screenshot or log line.
Automatable cases are marked `[auto]` (Core xunit or Playwright against `web/home`); the rest are `[manual-win]`.
Log to read after every session: `%LocalAppData%\Cuy\logs\cuy.log`. Perf: run with `CUY_PERF=1`.

## 0. Environments and preconditions
- E1 Win 11 x64, 100% DPI, one monitor, WebView2 Runtime installed (clean install of the release zip).
- E2 Win 10 x64, 150% DPI, two monitors (one left of primary, negative coordinates).
- E3 Win 11, 200% DPI, taskbar at the left / top / auto-hidden, 3 monitors with different DPI.
- E4 Machine WITHOUT WebView2 Runtime (message must be the friendly one, not an exception).
- E5 Win 11 ARM64 or 32-bit process (loader selection; the HRESULT 0x8007000B regression).
- Fresh save, save with 1 / 3 / 5 pigs, old-schema save, corrupted save (truncated JSON).
- Always test Debug and Release builds, and the installed (not only the built) exe.

## 1. Startup and Home window (regression: "Home could not start WebView2 0x8007000B")
- H1 Click the house icon: Home opens in < 3 s, no message box. Log has `EnsureCoreWebView2Async done`.
- H2 Open / close Home 20 times: no leaked `msedgewebview2` processes, memory flat (+- 50 MB).
- H3 Open Home twice quickly (double click): one window, no exception.
- H4 E4 machine: friendly message with the download link; pig keeps working; no crash.
- H5 E5: process bitness matches the loader (`WebView2Loader.dll` present for x86, x64, arm64 in output).
- H6 User-data folder not writable (read-only profile): clear message, log line, no hang.
- H7 Home while the pig is mid-toss / mid-drag: both keep working.
- H8 Close Home with the X, Alt+F4, from tray; reopen: state preserved.
- H9 JS error forwarding: force a JS exception, it appears in `cuy.log` with file and line.
- H10 Offline machine: Home works fully (virtual host mapping, no network calls).

## 2. Album / visual design (compare screen by screen with the album mockups and `docs/VISUAL_WAVES.md`)
For each screen: Home, pigs list, pig card, rooms, dorm, plan, customize, store, garden, farm, market, minigames,
memorial, settings, music player, diary.
- V1 Screenshot at 800x600, 1280x720, 1920x1080, 2560x1440 and Windows 100 / 150 / 200% DPI.
- V2 Side-by-side with the album page: layout, spacing, colours, fonts, corner radius, icon set, frame art. List every deviation.
- V3 Pixel art: no blur (`image-rendering: pixelated`), integer scaling only, no half-pixel seams between atlas tiles.
- V4 Every breed x coat x age renders in album, card, room and on the desktop; no missing sprite, no wrong flip.
- V5 Every item icon (`check-icons`) and every placeholder (`icon-pig`, missing lamp/dust/cone assets) is listed and fixed or accepted.
- V6 Day / night / time-of-day tint: smooth, no banding, text still readable (E9 default: system clock).
- V7 Light and dark mode, high contrast, reduced motion, text scaling 150%.
- V8 Long names (40 chars, Polish diacritics, emoji), max numbers (money 9 999 999), empty states, error states, loading states.
- V9 Dialog / tooltip z-order, nothing clipped when resizing 400 to 2000 px, no horizontal scrollbars.
- V10 Animations: no stutter, no jump at transitions (animation seam test `[auto]`), idle loops do not drift.
- V11 Fonts load offline; no FOUT flash of wrong font.
- V12 Contact sheets of all sprites reviewed by eye (CLAUDE.md "Visual work" rule).

## 3. Economy, buying, selling
- B1 Buy each store item once: money decreases by exactly the price, item count +1, toast, sound.
- B2 Not enough money: button disabled or clear message, state unchanged `[auto]`.
- B3 Buy the last affordable item (money becomes exactly 0), then buy again: refused.
- B4 Buy 100 of a stackable item: count correct, no overflow, UI shows 99+ or exact per design.
- B5 Rapid double click / spam on Buy: one purchase per click, no negative money, no duplicates `[auto]`.
- B6 Sell / refund: refund equals the documented rule; sold item leaves inventory AND its room slot.
- B7 Close the app right after a purchase (kill process): save contains the purchase or not at all, never half.
- B8 Home variants / room upgrades: price, unlock order, refund, and the pig is not inside removed geometry.
- B9 Food: buying, stock, spoilage, feeding consumes exactly one unit.
- B10 Gifts, rewards, daily bonus: given once per period, clock changes (back / forward, DST) cannot farm them `[auto]`.
- B11 Totals: simulate 30 days with 1 / 3 / 5 pigs (`economy-sim`), no runaway inflation, five-pig total confirmed intended.
- B12 Prices in store equal prices in `items.json`, Polish and English labels exist for every item.

## 4. Placing and arranging items (room editor)
- P1 Place every item category on an empty grid: snaps to cell, correct footprint, correct layer / z-order.
- P2 Place on edge cells and corners; item larger than the free space is rejected with feedback.
- P3 Overlap rules: allowed combinations (rug under bed) vs forbidden (two beds); rejected item returns to inventory.
- P4 Move, rotate, flip each item, then reload the save: position, rotation, flip identical `[auto]`.
- P5 Remove item: goes back to inventory (not lost, not duplicated), slot free.
- P6 Place an item the player does not own (forced via bridge message): rejected `[auto]`.
- P7 Placed item count equals owned minus inventory at all times (invariant) `[auto]`.
- P8 Undo / cancel mid-drag with Esc and by dropping outside the grid: item returns to the previous place.
- P9 Wall vs floor vs ceiling items: only on valid surfaces. Door and window cells never blocked.
- P10 Place so that the pig's path is fully blocked: pig is never stuck, there is always a reachable cell or the placement is refused.
- P11 Lights, decor and plants: visual effect matches the album, light radius clipped to the room.
- P12 Many items (full room): frame rate stays smooth, no layout shift.
- P13 Change room while carrying an item: item not lost.
- P14 Switch pig / room / home variant while items are placed: each room keeps its own layout (room key rule `NamedId ?? Id`).
- P15 Save, quit, start, check every room again with pixel diff against a screenshot taken before quitting.

## 5. Physics on the desktop (see `docs/PHYSICS.md`, `DragVelocity`, `TossPhysics`)
- F1 Drop from 100 / 300 / 900 px onto the taskbar: falls with gravity, lands on the taskbar top edge, feet not sunk, not floating.
- F2 Toss left / right at low, medium, max speed: bounces off screen edges (-0.3), never leaves the screen.
- F3 Toss up: rises, falls back, lands exactly once.
- F4 Drag with tiny, slow, fast, circular, and stationary-before-release movements: release speed matches the hand.
- F5 Soft (< 40) and hard (>= 40) landing: correct animation, no jitter after landing.
- F6 Land on a window title bar: stands on the window; move the window away while standing: pig falls; close it: falls.
- F7 Window minimised / maximised / snapped / fullscreen / another virtual desktop under the pig: pig does not clip, hover or vanish.
- F8 Taskbar left / top / right / auto-hide, and taskbar height changes (Settings): ground level follows, pig not under the bar.
- F9 Monitors: toss across monitors with different DPI, negative coordinates, a monitor unplugged while the pig is on it (pig returns to primary).
- F10 Resolution or DPI change while running: pig remains on screen on valid ground.
- F11 Lock screen / sleep / resume / RDP connect: no teleport to (0,0), no huge dt step, pig on ground.
- F12 Debugger-like pause (suspend process 2 s): next step is clamped to 50 ms, no tunnelling through the floor `[auto]`.
- F13 Tick rates 8 / 16 / 33 ms give the same trajectory `[auto]`, CPU low with `CUY_PERF=1`, p95 frame < 20 ms, gaps > 20 ms counted.
- F14 Shadow follows the pig and windows with no lag, no stale bitmap, click-through works, GDI object count flat over 30 min.
- F15 Collision with game-room walls inside Home (if physical): no escape through corners.

## 6. Boundaries: the pig never goes where it should not, and never escapes
- X1 Walk to every screen edge on every monitor: stops or turns, never partially off-screen beyond the allowed sprite margin.
- X2 Walk under / behind the taskbar and the Start menu: not hidden behind it.
- X3 Walk onto a window that is closed meanwhile: falls safely.
- X4 Climb / walk on a window that is resized smaller than the pig.
- X5 Pig inside Home: never outside the room, never inside furniture, never on a cell flagged blocked `[auto]` on the grid path-finder.
- X6 After place / remove items, run 10 minutes: pig never stuck, never at NaN or Infinity, never at huge coordinates `[auto]`.
- X7 Multiple pigs: no overlap stacking forever, none teleports into another's room.
- X8 Indoor vs outdoor: pig visible outside only when the design says so; a pig "out" always has a way back; no pig lost when the app starts with the pig outside.
- X9 Start the app with a save made on a bigger monitor: pig clamped into the current visible area.
- X10 Kill the app mid-toss: next start places the pig on valid ground, not in the air.
- X11 Hidden / minimised to tray / "pet off": no ghost window, no input capture, no CPU.
- X12 Fullscreen game or video on top: pig does not steal focus, does not appear over exclusive fullscreen if the setting says so.
- X13 Click-through: clicks pass through the transparent parts of the pet window and the shadow, hit-test only on the sprite.
- X14 Very long session (8 h): position, memory, handle counts stable.

## 7. Connections: desktop pet <-> Home <-> save <-> bridge
- C1 Every contract in `docs/contracts/*.md`: valid and invalid message, reply is well-formed, never throws `[auto]`.
- C2 Feed a pig in Home: the desktop pet reacts at once; feed on the desktop: Home number updates without reopening.
- C3 Buy in Home while the pet is walking: no frame drop, no state loss.
- C4 Two quick opens / closes of Home while saving: save is not corrupted `[auto]`.
- C5 Two instances of Cuy: second one exits cleanly or focuses the first; save is not written by both.
- C6 Update over an existing install: save, settings, logs, WebView2 profile kept.
- C7 Uninstall / delete: nothing left running; save location documented.
- C8 Save robustness: truncated, wrong types, future schema, huge roster, read-only file, disk full: friendly handling, backup restored `[auto]`.
- C9 Clock manipulation: back by a day, forward 30 days, DST change: needs / money behave per rules `[auto]`.
- C10 Autostart on / off, tray menu entries, exit from tray.
- C11 Sound: volume, mute, device unplugged while playing (NAudio) does not crash.
- C12 Localisation switch PL <-> EN live: every label changes, nothing left in the other language.

## 8. Walking outside (desktop life) and idle behaviour
- W1 Idle for 30 min: varied behaviour, no loop that looks broken, sleeps at the configured times.
- W2 Walk, run, sit, sleep, eat, play, hide: each animation starts and ends without a position jump (offset seam <= 2 px).
- W3 Turn-around smoothness (D3.1 decision pending) and facing direction correct for walk, run and drag.
- W4 Reactions: mouse hover, click, double click, right-click menu, drag, toss, feed by drag-and-drop.
- W5 Pig meets window edges, the cursor and other pigs: sensible reactions.
- W6 Time of day: tint and behaviour change at dawn, noon, dusk, night (E9).
- W7 Needs: hunger, thirst, mood drop over simulated hours (use time jump), consequences gentle and per concept.
- W8 Memorial: a pig dies or is retired per the rules, memorial shown, no dangling room / pig on desktop.
- W9 Notifications and speech bubbles: not spammy, readable on every DPI, dismissible.
- W10 Resource use: CPU < 3% idle, RAM budget, no growth over 8 h.

## 9. First-run, onboarding and journey scripts
- J1 First launch: install, run, see the pig, first interaction, first purchase, first placement, first diary line. Time each, note friction.
- J2 First day, first week (time jumps): earnings, goals, unlocks are discoverable without docs.
- J3 Adopt a second and fifth pig; room allocation; dorm; shared room.
- J4 Return after one month away: fair outcome, no punishment contradicting `docs/CONCEPT.md`.
- J5 Upgrade home variants and rooms; buy a home; end-to-end totals match the economy sheet.
- J6 Keyboard-only walkthrough of every Home screen; screen reader labels on controls.

## 10. Automation and tooling to add
- `[auto]` Core: invariants fuzz (money >= 0, counts conserved, items in bounds and owned, unique room ids), grid reachability for placement (P10), toss never leaves bounds (F2, X1).
- `[auto]` Playwright against `web/home` with the bridge mock: screens x viewports screenshot matrix, buy / place / save / reload diff, console error gate.
- `[manual-win]` checklist in `docs/TESTY_RECZNE.md`, one run per environment E1-E5, results table in `docs/qa/reports/EXP-<date>.md`.
- Add a Windows CI smoke test that launches `Cuy.exe --diag` and checks WebView2 init (would have caught 0x8007000B).

## 11. Order of execution
1. H1-H10 (blocking: Home must open). 2. B and P (economy and placement, mostly `[auto]`). 3. F and X (physics and
boundaries, on Windows). 4. C (connections and saves). 5. V (album comparison, screenshots). 6. W and J (long
sessions, journeys). Findings go to `docs/qa/FINDINGS.md`; fixes only after the reports, in small waves.
