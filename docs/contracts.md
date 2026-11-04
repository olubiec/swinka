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

## settings – task F2-08, F4-07, W7-03, W-UPD
State key `settings`:
```json
{
  "petSize": "small|big",
  "sounds": true,
  "autostart": true,
  "volume": 70,
  "quietHours": { "enabled": false, "start": "22:00", "end": "07:00" },
  "muteFullscreen": true,
  "soundSuppressed": false,
  "monitors": [
    { "index": 0, "name": "\\\\.\\DISPLAY1", "width": 1920, "height": 1080, "primary": true }
  ],
  "monitor": 0
}
```
State key `update` (autoupdater state):
```json
{
  "available": false,
  "version": "1.0.0",
  "currentVersion": "1.0.0",
  "status": "idle",
  "notes": "",
  "downloading": false
}
```
Messages:
- `settings_pet_size { size: "small"|"big" }`
- `settings_sounds { on: boolean }`
- `settings_autostart { on: boolean }`
- `settings_volume { value: 0..100 }` (or `0.0..1.0`)
- `settings_quiet_hours { enabled: boolean, start: "HH:mm", end: "HH:mm" }`
- `settings_mute_fullscreen { on: boolean }`
- `settings_monitor { index: number }`
- `settings_reset_confirmed` → creates backup of current save (`save.reset-<timestamp>.bak`), writes `reset.pending` marker, posts farewell toast, and terminates process.
- `check_update` / `settings_check_update` → checks for newer releases asynchronously.
- `apply_update` / `settings_apply_update` → downloads and applies update.

## diary and album – Core: `Diary/DiaryWriter.cs` (task F4-03), UI F4-04
State keys `diary` and `albumDates` are produced by `ProgressFeature`; `album` key list is produced in root state:
- `diary`: `[ { "date": "2026-10-24", "text": "..." } ]` (up to 60 recent entries, newest first).
- `album`: list of unlocked animation/photo keys e.g. `["sniff", "chew"]`.
- `albumDates`: map of animation key to unlock date `yyyy-MM-dd` e.g. `{ "sniff": "2026-10-20" }`.

## bond – Core: `Bond/BondUnlocks.cs` (task F4-05)
State key `bond` (root state) and `bondNext` (from `ProgressFeature`):
- `bond`: `{ "level": 4, "points": 61, "pointsToday": 12, "maxPointsToday": 30 }`
- `bondNext`: `{ "level": 5, "id": "trick_spin", "title": "Spin Trick", "pointsToNext": 12 }` (or `null` if all unlocks completed).
Unlock ids (`assets/data/bond.json`): approach_cursor 2, greet_on_start 3, trick_spin 5, come_when_called 7, trick_stand_up 9,
companion 10, trick_popcorn 12, trick_hurdle 15, golden_bowl 20. C# asks `Pet.IsUnlocked(id)`.

## hayRack – Core: `Pet.Hay.cs` (task F4-06)
State key `hayRack`: `{ "value": 60, "max": 100 }` (produced by `ProgressFeature`). Feeding `hay` refills the rack (`Pet.RefillHay()`).

## minigames – Core: `Pet.Minigames.cs` (task F5-04, W7-01, W7-02)
State key `minigames`:
```json
{
  "records": { "veggie_rain": 140, "veggie_memory": 42, "hay_maze": 38 },
  "dailyRewardedDate": "2026-11-01",
  "dailyRewardedCount": 3,
  "dailyMax": 10,
  "plays": { "veggie_rain": 6, "veggie_memory": 2, "hay_maze": 4 },
  "lastResult": {
    "gameId": "veggie_rain",
    "score": 140,
    "clovers": 15,
    "mood": 15.0,
    "isNewRecord": true,
    "rewarded": true
  }
}
```
Game list: `web/home/minigames/games.json` (ids: `veggie_rain`, `veggie_memory`, `hay_maze`).
Messages:
- `minigame_result { gameId, score }` → records play count, awards clovers/mood up to daily cap, checks high score record, and pushes updated state.

## tricks – Core: `Pet.Tricks.cs` (task F6-05, W7-05)
State key `tricks`:
```json
[
  { "id": "spin", "title": "Spin", "unlocked": true, "unlockLevel": 5, "readyIn": 0 },
  { "id": "stand_up", "title": "Stand Up", "unlocked": true, "unlockLevel": 9, "readyIn": 45 },
  { "id": "popcorn", "title": "Popcorn", "unlocked": false, "unlockLevel": 12, "readyIn": 0 },
  { "id": "hurdle", "title": "Hurdle Jump", "unlocked": false, "unlockLevel": 15, "readyIn": 0 }
]
```
Messages:
- `trick { id }` → invokes trick attempt on desktop and in Home.
Result statuses handled:
- `Ok` → plays trick animation and awards bond points.
- `Tired` → posts toast "Too tired for tricks".
- `Locked` → posts toast "Not unlocked yet".
- `Cooldown` → posts toast "Give me a moment".
- `Sleeping` → posts toast "Shh, sleeping".

## achievements – Core: `Achievements/` (task F6-02, F6-03)
State key `achievements`:
```json
[
  {
    "id": "first_feed",
    "title": "First Taste",
    "text": "Feed Cuy for the first time",
    "category": "care",
    "reward": 5,
    "earned": true,
    "date": "2026-10-24",
    "hidden": false
  }
]
```
Checked every 5 s in background (`AchievementsFeature.Tick`). Newly completed achievements award clovers and post `{ type: 'toast', text: 'Achievement: <Title> +<reward> clovers' }`.

## companion (not built – design notes)
State key `companion`: `{ "canAdopt": true, "reason": "Reach bond level 10", "pig": { "name": "Oreo", "coat": "black_white|agouti|cream",
"needs": { "fullness": 80, "energy": 70, "mood": 60, "vitamin_c": 75, "teeth": 90 }, "together": true } | null }`.
Message `companion_adopt { name, coat }`.

## weather (not built – design notes)
State key `weather`: `{ "city": "Warsaw", "place": "Warsaw, Poland", "temperatureC": 12.3, "condition": "clear|cloudy|rain|snow|storm" } | null`.
Message `settings_city { city }` (empty = off).

## generic
Page message `{ type: 'toast', text }` → the page shows a small pixel toast for 2.5 s (implemented in `app.js`).

## pigs (My Pigs, breed and coat) – Core: `GameState.Pigs.cs`, `PigProfile`, `Palettes`; C#: `PigsFeature.cs`, `PigLook.cs`
State keys `roster`, `activePigIds` and `offers` (published by `PigsFeature`):
```json
{ "roster": [ { "id": "ab12", "name": "Piko", "breed": "smooth|chubby|skinny|rosette|peruvian",
                "paletteId": "tricolor|dutch|agouti|albino|cinnamon", "traits": ["cuddly"], "discoveredTraits": ["cuddly"],
                "namedId": null, "ageYears": 0.4, "stage": "baby|junior|adult|senior|legend", "memorial": false,
                "blurb": "", "modifiers": { "poop_rate": 1.3 } } ],
  "activePigIds": ["ab12"],
  "offers": [ { "id": "james", "name": "James", "unlocked": true, "daysLeft": 0, "cost": 120, "group": null,
                "adopted": false, "look": { "breed": "rosette", "paletteId": "dutch" },
                "blurb": "...", "traits": ["startles"] } ] }
```
Roster fields:
- `namedId`: id of the named pig definition (`null` or empty for randomly adopted pigs).
- `ageYears`: age in pig years, rounded to 0.1. `stage`: life stage data key (`baby`, `junior`, `adult`, `senior`, `legend`).
- `memorial`: `true` for a pig in memorial mode (not counted in the family limit).
- `blurb`: text from the named pig definition, or `""` for random pigs.
- `modifiers`: present ONLY for named pigs whose definition has modifiers. Keys come from the definition; values are
  rounded to 2 decimals. Missing key = no modifier.

`offers[]` (named pigs that can be adopted; status from `OfferChecker`, time from `OffersStartUtc`):
`id`, `name`, `unlocked` (bool, false = not ready yet), `daysLeft` (days left as computed by `OfferChecker`), `cost` (clovers),
`group` (offer group id or `null`; pigs in one group are adopted together), `adopted` (bool), `look { breed, paletteId }`,
`blurb`, `traits`.

Messages:
- `adopt_pig` (C# takes the price from `assets/data/pigs.json`, never from JS). Random pig; one friend at a time, roster limit.
- `toggle_pig_active { pigId }` (max 2 active, at least 1).
- `adopt_named { id, memorial? }` (`pigId` is accepted as an alternative key; `memorial` defaults to `false`). Price and
  unlock come from the named pig definition in C#. `memorial: true` adopts the pig straight into memorial mode.
- `adopt_group { id }` (`groupId` accepted as an alternative key). Adopts the pigs of the offer group together; success
  toast names all of them. Price and checks are done in Core (`AdoptGroup`).
- `set_memorial { pigId, on }` (`id` accepted as an alternative key; `on` defaults to `true`). Switches a pig in or out of
  memorial mode; the pig stays in the roster.

Toasts posted by `PigsFeature` (page message `{ type: 'toast', text }`):
- `adopt_pig`: "You already adopted a friend", "The family is full", "Not enough clovers", "Welcome <name> to the family!".
- `adopt_named` / `adopt_group`: "Not enough clovers", "The family is full", "Not ready yet"; success "Welcome <name> to the
  family!" (group: names joined with " and "); memorial adoption "Forever in the family".
- `set_memorial` (switched on): "Forever in the family".
- Unknown ids, a pig that is already in the requested state, or an unknown group are ignored silently (no toast).
Sheets: `(breed, stage) -> assets/sprites/<stage>/spritesheet.png` for `smooth`, `assets/sprites/breeds/<breed>/<stage>/spritesheet.png` otherwise (`assets/sprites/breeds.json`).
The sheets are drawn in ginger; the coat is a runtime exact-colour remap from `assets/sprites/palettes.json` (`web/home/lib/palette.js`, `PaletteRemap.cs`).
Unknown breed -> `smooth`, unknown palette -> `tricolor`. Web: `CuySprites.sheet(breed, stage, paletteId)`, `CuySprites.activePig(state)`. Desktop: `PigLook.Apply(pet, xml, stageKey)` gives each `FormPet` the look of its own `PigProfile`.
