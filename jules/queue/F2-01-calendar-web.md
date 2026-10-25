# Task F2-01: Care calendar in Home (web feature)

Read `AGENTS.md` and `jules/contracts.md` (section **calendar**) first and follow them exactly.

## Goal
The player keeps a care calendar for her REAL guinea pigs in Cuy's Home: today's tasks, a month view, settings and a
weight log with a chart. The C# half (`CalendarFeature`, task F2-02) is built in parallel and sends the `calendar`
state described in the contract.

## Files you may add
`web/home/features/calendar/feature.js`, `web/home/features/calendar/feature.css`. Nothing else (do NOT edit
`features/index.json`; for local testing add `"calendar"` temporarily and remove it before committing).

## UI (modal ~360x520 px, pixel style, reuse CSS variables from style.css, selectors prefixed `.feature-calendar`)
Tabs at the top: **Today** · **Month** · **Weight** · **Settings**.
1. Today: list of tasks from `state.calendar.tasks` sorted: due first (highlighted, with the task icon), then upcoming
   today, then later ones ("Next: Sun 10:00"). Each row: icon, title, time, streak flame "x5", and for due tasks
   buttons **Done** (sends `calendar_done`) and **Later ▾** (menu with `snoozeMinutes`: "15 min", "1 h", "3 h" →
   `calendar_snooze`). Tapping a row expands the `text` (the care advice). A due `weigh` task's Done opens the Weight
   tab instead. Header line: "Clovers from care today: 10 / 30".
   Icons: veggies `icon-bell-pepper`, water `icon-water-drop`, hay `icon-hay`, spot_clean `icon-broom`, weigh `icon-scale`,
   full_clean `icon-broom`, brush `icon-brush`, nails `icon-nail-clipper`, vet_check `icon-vet`; unknown → `icon-calendar`.
2. Month: a 7-column calendar of the current month (Mon-first), arrows for previous/next month (back to 2 months).
   Each day shows small dots: green = every daily task done that day (from `history`), yellow = some, empty = none
   (future days blank); days with a weight entry get a tiny scale mark. Tap a day → list of what was done.
3. Weight: one section per pig (`pigs`; if empty, a hint "Add your pigs in Settings"): input grams (number, 100-3000) +
   date (default today) + **Save** (`calendar_weight`); a line chart (canvas, pixel style, last 12 entries) with the
   values; list of entries with delete (`calendar_weight_delete`); `alerts` shown at the top in a warning box.
4. Settings: pig names (add/remove chips, max 6, letters/digits/spaces, max 16 chars), and per task: enabled toggle,
   time (HH:MM input), weekday select for weekly, "every N days" for every_n_days. **Save** sends `calendar_settings`.
5. Mock mode (no `state.calendar`): build a demo state in the feature (3 tasks, 2 pigs, 5 weights) so the UI can be
   developed and the smoke test passes; label it "(demo)".
6. Register: `CuyHome.registerFeature({ id: 'calendar', title: 'Care calendar', icon: 'icon-calendar', order: 10, open, close, onState })`.
   Re-render the open tab on `onState` without losing input focus (re-render lists only).

## Checks
- `node --check web/home/features/calendar/feature.js`.
- Smoke test with `"calendar"` temporarily in `web/home/features/index.json`
  (`npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`),
  then revert that line. Attach screenshots of all 4 tabs (demo state) to the PR.

When done, open a pull request against `main` titled `F2-01: Care calendar UI`.
