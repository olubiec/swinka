# Home message and state contracts (shared by the web and C# halves of each feature)

Both halves of a feature are often built in parallel by different agents. Follow these shapes EXACTLY. Times sent to the
page are local time strings `yyyy-MM-ddTHH:mm`; dates `yyyy-MM-dd`. JS → C# messages are `{ type, ... }` sent with
`window.bridge.send`. C# → JS: the state (pushed after every handled message and when something changes) and, rarely,
page messages via `HomeWindow.PostToPage` (received with `CuyHome.api.onMessage(type, cb)`).
The C# half implements `Cuy.Features.IHomeFeature` (see `src/Cuy/dotNet/Features/README.md`); its `Id` = state key below.

## calendar (real-life care calendar) – Core: `Pet.Care.cs`, `CareSchedule` (task F1-07)
State key `calendar`:
```json
{ "pigs": ["Pumpkin", "Oreo"],
  "tasks": [ { "id": "veggies", "title": "Fresh veggies", "text": "...", "schedule": "daily|weekly|every_n_days",
               "time": "18:00", "weekday": 0, "everyDays": 28, "enabled": true, "weightLog": false,
               "due": true, "nextDue": "2026-10-25T18:00", "lastDone": "2026-10-24T18:12", "streak": 5 } ],
  "history": [ { "date": "2026-10-24", "taskId": "veggies" } ],
  "weights": [ { "date": "2026-10-19", "pig": "Pumpkin", "grams": 1012 } ],
  "alerts": [ "Pumpkin lost 60 g since 12 Oct. Watch her and see a vet if it continues." ],
  "snoozeMinutes": [15, 60, 180],
  "cloversPerTask": 5, "cloversToday": 10, "cloversMaxToday": 30 }
```
`history` = last 62 days; `weights` = all. Messages:
- `calendar_done { taskId }` → mark done, award `Pet.AwardCareTask()` clovers, pig plays `happy`.
- `calendar_snooze { taskId, minutes }`
- `calendar_settings { pigs: [..], tasks: [ { id, enabled, time, weekday, everyDays } ] }` (only changed fields needed)
- `calendar_weight { pig, grams, date? }` (date default today), `calendar_weight_delete { pig, date }`

## vet (illnesses and the clinic) – Core: `Pet.Health.cs`, `HealthSystem` (task F1-08)
State key `vet`:
```json
{ "isSick": true, "checkupPrice": 30, "lastCheckup": "2026-10-20T15:02",
  "conditions": [ { "id": "scurvy", "name": "Scurvy (vitamin C deficiency)", "known": true, "severity": 0.4,
                    "since": "2026-10-23T08:00", "treated": false, "price": 40, "courseDays": 3,
                    "courseDaysLeft": 0, "doseDueToday": false, "info": "...", "cureHint": "Vitamin C above 60" } ],
  "history": [ { "id": "mites", "name": "Mites", "start": "2026-09-30", "end": "2026-10-03" } ],
  "symptoms": [ "Tired", "Not eating treats" ] }
```
Unknown (not yet diagnosed) conditions are sent with `known: false`, `name: "Something is wrong"`, `info: ""`.
`symptoms` = short visible signs derived from active conditions (diagnosed or not). Messages:
- `vet_checkup` → pay `checkupPrice` (`Pet.TryPay(price, "vet")`), `Pet.Checkup()`.
- `vet_treat { conditionId }` → only for known conditions; pay the condition price; `Pet.Treat(id)`.
- `vet_dose { conditionId }` → `Pet.GiveDose(id)` (free; once per day).
Failed payments: the C# half posts page message `{ type: 'toast', text: 'Not enough clovers' }`.

## coloring – Core: `Pet.Coloring.cs` (task F2-09)
State key `coloring`: `{ "completed": ["gp_001"], "unlockedPacks": ["guinea_pigs","food_and_toys"],
"rewardedToday": 2, "maxRewardedPerDay": 5, "lastReward": { "pictureId": "gp_001", "clovers": 12 } }`
Messages: `coloring_load { pictureId }` → page message `{ type: 'coloring_progress', pictureId, painted }`;
`coloring_save { pictureId, painted }`; `coloring_done { pictureId, cells }`; `coloring_unlock { packId }` (price from
`assets/coloring/index.json`).

## shop (catalog and buying) – task F2-05
State key `shop`: `{ "items": [ { "id", "name", "category", "price", "icon", "description", "oneTime": true,
"owned": 0, "dailyLimit": 1, "boughtToday": 0 } ], "categories": ["food","toy","decor","care"] }`
(`category` of food/vegetable/treat/chew_stick items is reported as `food`; equipment/toy → `toy`; decor → `decor`;
medicine/vitamins → `care`). Message: `buy { itemId }` (price always from the catalog in C#).

## decor – task F2-06
State key `decor`: `{ "equipped": { "wallpaper": "wallpaper_mint", "floor": null, "rug": null, "plant": "plant_fern",
"picture": null, "lamp": null } }`. Item JSON (in `assets/data/items_decor.json`) has `"category": "decor"`,
`"slot": "<slot>"`, `"look": { ... }` (colours/pattern used by the renderer). Messages: `decor_equip { slot, itemId }`
(`itemId` null = remove; only owned items).

## toys – task F2-07
State key `toys`: `{ "ball": { "owned": true, "readyIn": 0 }, "tunnel": { ... }, "hay_ball": { ... }, "house": { ... } }` (`readyIn` = seconds
until the cooldown ends). Message: `play_toy { item }` → mood/energy effects from the matching action in
`assets/data/actions.json` (`ball_play`, `tunnel`, `hay_ball_play`), respecting its `cooldown_s`; house = short rest, no cooldown.

## daily (daily gift) – Core: `Pet.Economy.cs` (task F1-06)
State key `daily`: `{ "available": true, "amount": 20, "streak": 3 }`. Message: `daily_claim` → `Pet.ClaimDailyGift()`;
then page message `{ type: 'daily_claimed', amount, streak }`.

## settings – task F2-08
State key `settings`: `{ "petSize": "small|big", "sounds": true, "autostart": true }`. Messages:
`settings_pet_size { size }`, `settings_sounds { on }`, `settings_autostart { on }`. Music volume/on-off stay in the
page (`CuyMusic`, localStorage). Added by F4-07: `volume` (0-100), `quietHours { enabled, start, end }`, `muteFullscreen`,
`soundSuppressed` (state only) with messages `settings_volume`, `settings_quiet_hours`, `settings_mute_fullscreen`.
Added by F6-01: `danceToMusic` + `settings_dance { on }`.

## diary and album – Core: `Diary/DiaryWriter.cs` (task F4-03), UI F4-04
State keys: `diary: [ { "date": "2026-10-24", "text": "..." } ]` (last 60, newest first) and
`album: [ { "key": "sniff", "firstSeen": "2026-10-20" } ]` (a bare string means seen, date unknown).

## bond – Core: `Bond/BondUnlocks.cs` (task F4-05)
State key `bond`: `{ "level": 4, "points": 61, "pointsToNext": 24, "next": { "level": 5, "title": "..." }, "pointsToday": 12, "dailyLimit": 30 }`.
Unlock ids (`assets/data/bond.json`): approach_cursor 2, greet_on_start 3, trick_spin 5, come_when_called 7, trick_stand_up 9,
companion 10, trick_popcorn 12, trick_hurdle 15, golden_bowl 20. C# asks `Pet.IsUnlocked(id)`.

## hayRack – Core: `Pet.Hay.cs` (task F4-06)
State key `hayRack: { "value": 60, "max": 100 }`. Feeding `hay` refills the rack (`Pet.RefillHay()`).

## minigames (task F5-04)
State key `minigames: { "dailyCount": 3, "dailyMax": 10, "highScores": { "veggie_rain": 140 }, "plays": { "veggie_rain": 6 } }`.
Game list: `web/home/minigames/games.json` (ids: veggie_rain, hay_hop, hay_maze, veggie_memory).

## tricks – Core: `Pet.Tricks.cs` (task F6-05)
State key `tricks: [ { "id": "spin", "unlocked": true, "readyIn": 0 } ]` (ids spin, stand_up, popcorn, hurdle).
Message `trick { id }` -> result `Ok|Locked|Tired|Cooldown|Sleeping`; `Tired` posts toast "Too tired for tricks".

## companion – Core: `Companion/CompanionState.cs` (tasks F6-06 to F6-08)
State key `companion: { "canAdopt": true, "reason": "Reach bond level 10", "pig": { "name": "Oreo", "coat": "black_white|agouti|cream",
"needs": { "fullness": 80, "energy": 70, "mood": 60, "vitamin_c": 75, "teeth": 90 }, "together": true } | null }`.
Message `companion_adopt { name, coat }`.

## weather – task F6-04 (the only network use)
State key `weather: { "city": "Warsaw", "place": "Warsaw, Poland", "temperatureC": 12.3, "condition": "clear|cloudy|rain|snow|storm" } | null`.
Message `settings_city { city }` (empty = off).

## generic
Page message `{ type: 'toast', text }` → the page shows a small pixel toast for 2.5 s (implemented in F2-05's app.js
changes; until then features may show their own message).
