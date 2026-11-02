# Animations (60 rows per sprite sheet)

Every animation exists in all 5 stages (baby, junior, adult, senior, legend), all 5 breeds and every coat palette (same grid: 64x64 frames, 16 columns, row = index below).
- **Desktop**: all 60 are defined in `Resources/animations.xml` and played by `FormPet` through the Brain (actions in `assets/data/actions.json`), `InteractionManager`, behaviours and items.
- **Home**: all 60 are playable by `canvas-pig.js` (checked for every stage by `node tools/qa/anim-test.js`); the Home pig shows the Brain's current action, direct reactions (petting, feeding, toys, tricks) and idle behaviours.
- A "new in V7" trigger was added as a Brain action in `assets/data/actions.json` (numbers are data, cooldowns and daily limits included).

| Row | Animation | Trigger (real code) | Platforms | Status |
| --- | --- | --- | --- | --- |
| 0 | `idle` | Brain action `rest`; fallback after every one-shot | both | used |
| 1 | `sniff` | Brain action `sniffing`; Home idle behaviour | both | used |
| 2 | `walk` | Brain action `walk` (cooldown 20 s) | both | used |
| 3 | `run` | Brain action `zoomies`; `then` of event `called` | both | used |
| 4 | `popcorn` | Brain action `popcorn`; trick `popcorn`; rewards (daily gift, colouring page done, Home care actions) | both | used |
| 5 | `eat` | Brain action `eat_hay` (hay in rack) | both | used |
| 6 | `eat_treat` | Items with animation `eat_treat` (vegetables, treats) via feed drawer / FoodManager | both | used |
| 7 | `scratch` | Brain action `scratching`; Home idle behaviour | both | used |
| 8 | `lie_down` | `enter` of Brain action `sleep` | desktop (Home plays it when sent) | used |
| 9 | `sleep` | Brain action `sleep` (energy <= 35, idle user) | both | used |
| 10 | `doze` | Brain action `nap` | both | used |
| 11 | `wake_up` | `exit` of Brain action `sleep` | both | used |
| 12 | `yawn` | Brain action `yawning` (energy <= 65, new in V7); Home test panel | both | used |
| 13 | `startle` | Event `startle` (MouseFearBehavior: fast mouse near the pig) | desktop | used |
| 14 | `freeze` | `then` of `startle` | desktop | used |
| 15 | `wheek` | Brain action `wheeking` (hungry); care reminders | both | used |
| 16 | `dance` | Brain action `dancing` (mood >= 85, new in V7); event `music` | both | used |
| 17 | `happy` | Calendar done, Home care actions, care reminder (RequestAnimation) | both | used |
| 18 | `held` | Event `picked_up` (dragging the pig on the desktop) | desktop | used |
| 19 | `fall` | Event `falling` (drop from drag/toss); XML physics | desktop | used |
| 20 | `land` | `then` of `fall`, XML chain after `fall`/`toss` | desktop | used |
| 21 | `front_idle` | InteractionManager: cursor still 1-3 s near the pig | desktop | used |
| 22 | `front_look` | Event `cursor_watching`: 5 frames track the cursor | desktop | used |
| 23 | `turn` | XML chain from `idle`/`walk`/`run` when the pig changes direction | desktop | used |
| 24 | `peek` | Edge peek director and fullscreen-hide behaviour (peek on start / hiding) | desktop | used; frames 0 and 11 are empty by design (pig fully off-screen at the start and end) |
| 25 | `front_happy` | Brain action `beaming` (mood >= 90, new in V7) | desktop | used |
| 26 | `drink` | Brain action `drink` (needs `water_bottle`); item animation | both | used |
| 27 | `chew_stick` | Brain action `chew_stick` (needs `chew_stick`); dental chew item | both | used |
| 28 | `dig_hay` | Brain action `dig_hay` (hay in rack >= 30) | both | used |
| 29 | `chin_rub` | Brain action `chin_marking` | both | used |
| 30 | `eat_bowl` | Items with animation `eat_bowl` (pellets, bowls) | both | used |
| 31 | `eat_big` | Items with animation `eat_big` (big food items) | both | used |
| 32 | `beg` | Brain action `begging` (low vitamin C); FoodManager when food is offered | both | used |
| 33 | `stand_up` | Trick `stand_up` (bond level 9) | both | used |
| 34 | `sad` | Brain action `sadness` (mood <= 20) | both | used |
| 35 | `sick` | Brain action `sickness` (health <= 25) | both | used |
| 36 | `poop` | Event `poop` (PoopManager) | both | used |
| 37 | `shiver` | Brain action `cold` (temperature <= 5 C) | both | used |
| 38 | `heat_flop` | Brain action `heat` (temperature >= 28 C) | both | used |
| 39 | `sleep_house` | Brain action `sleep_in_house` (needs `house`), between `house_enter` and `house_exit` | both | used |
| 40 | `purr_pet` | Event `petting` (click/stroke the pig) | both | used |
| 41 | `chatter` | Event `too_many_clicks`; companion interaction | both | used |
| 42 | `rumble` | Brain action `rumblestrut` (adult, companion) | both | used |
| 43 | `flee` | Event `flee` (mouse behaviour) | desktop | used |
| 44 | `greet` | Event `greeting_on_start`; Home opening | both | used |
| 45 | `come_called` | Event `called` (Call button / Home), `then` run | both | used |
| 46 | `spin` | Trick `spin` (bond level 5) | both | used |
| 47 | `hurdle` | Trick `hurdle` (bond level 15) | both | used |
| 48 | `house_enter` | `enter` of `sleep_in_house`; house toy in Home | both | used |
| 49 | `house_exit` | `exit` of `sleep_in_house` | both | used |
| 50 | `tunnel_in` | Brain action `tunnel` (needs `tunnel`); tunnel toy in Home | both | used |
| 51 | `tunnel_wiggle` | none | none | unused by design: its tunnel is the full 60 px tunnel and does not line up with the 28 px tunnel of `tunnel_in`/`tunnel_out` on the desktop where the form cannot grow; revisit after a Windows check |
| 52 | `tunnel_out` | `exit` of Brain action `tunnel` | both | used |
| 53 | `ball_push` | Brain actions `ball_play`, `hay_ball_play`; ball toy in Home | both | used |
| 54 | `nose_touch` | Brain action `nose_touch` (companion) | desktop | used |
| 55 | `groom_other` | Brain action `grooming_other` (companion) | desktop | used |
| 56 | `follow` | Brain action `following` (companion, energy >= 30, new in V7) | desktop | used |
| 57 | `sleep_together` | Brain action `sleeping_together` (companion, energy <= 45, new in V7) | desktop | used |
| 58 | `party` | Event `birthday`; cake item | both | used |
| 59 | `chirp` | Brain action `chirping` (baby/junior only, new in V7); chirp sound | both | used |

## Loops and transitions reviewed (V7.3)
- `house_enter` -> `sleep_house` -> `house_exit`: the house sat at a different place/size in `sleep_house` (x 28-62, 32 px wide) than in `house_enter` (x 34-63, 28 px wide), so it popped. `sleep_house` now uses the same house geometry (`house(36, 28, 30)`); roof bounding box identical (34-63, 28-34) in both.
- `tunnel_in` -> (hidden) -> `tunnel_out`: both draw the same 28 px tunnel cut by the frame edge; `tunnel_wiggle` is not used (see above).
- `lie_down` -> `sleep` -> `wake_up`: body height and head position match at the joins (checked frame by frame).
- `fall` -> `land`: `land` frame 0 is the squash on the floor right after the airborne `fall` loop; no pop.
- `peek` frames 0 and 11 are empty on purpose (the pig is off-screen at the start and end of the peek); documented, not a defect.
- `front_look`: 5 frames (0 left, 1 right, 2 up, 3 down, 4 centre) for cursor tracking; every frame differs only in the gaze, no jump.
- Not verifiable here (needs Windows): that the XML offsets keep the tunnel and house in place on screen. Steps VIS-06..VIS-08 in `TESTY_RECZNE.md`.
