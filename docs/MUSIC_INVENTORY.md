# Music inventory (read-only audit)

Date: 2026-11-05. Branch: `claude/vigilant-bell-xcuzdi`. Scope: whole repo, read-only.
Changed: only this file. No code, data, tests or commits were touched.

## 0. Method and status keys

- **IMPLEMENTED**: present in code or data in the repo (file and line given).
- **PLANNED**: only in docs or design notes, not in code.
- **MENTIONED**: a single passing mention in a doc.
- **NOT FOUND**: searched (case-insensitive grep over docs, assets/data, web, src, tests, tools) and absent.
- Durations: OGG via `ffprobe`; WAV via the WAV header. Nothing is guessed.
- Line numbers are from the current working tree.
- Where a file was not read in full, the note says which part was checked.

---

## 1. Places and screens where music could play

### 1.1 Desktop states (the Windows pig; no music plays here today)

| id | name | type | status | source |
| --- | --- | --- | --- | --- |
| T01 | morning (ambient period) | time of day | IMPLEMENTED (data) | `assets/data/lights.json` key `ambient.morning` |
| T02 | day | time of day | IMPLEMENTED (data) | `assets/data/lights.json` key `ambient.day` |
| T03 | evening | time of day | IMPLEMENTED (data) | `assets/data/lights.json` key `ambient.evening` |
| T04 | night | time of day | IMPLEMENTED (data) | `assets/data/lights.json` key `ambient.night` |
| W1 | Clear | weather | IMPLEMENTED (model only) | `src/Cuy.Core/Weather/WeatherInfo.cs`, enum `WeatherCondition` |
| W2 | Cloudy | weather | IMPLEMENTED (model only) | same enum |
| W3 | Fog | weather | IMPLEMENTED (model only) | same enum |
| W4 | Rain | weather | IMPLEMENTED (model only) | same enum |
| W5 | Snow | weather | IMPLEMENTED (model only) | same enum |
| W6 | Storm | weather | IMPLEMENTED (model only) | same enum |
| S1 | asleep (action `sleep`) | sleep | IMPLEMENTED | `assets/data/actions.json`, id `sleep` |
| S2 | nap (action `nap`) | sleep | IMPLEMENTED | `assets/data/actions.json`, id `nap` |
| S3 | sleep in house (`sleep_in_house`) | sleep | IMPLEMENTED | `assets/data/actions.json`, id `sleep_in_house` |
| S4 | offline counts as sleep | sleep | IMPLEMENTED | `src/Cuy.Core/Balance.cs:42` `OfflineCountsAsSleep = true` |
| F1 | full screen, muted | full screen | IMPLEMENTED | `src/Cuy/dotNet/SoundManager.cs:77` (`MuteOnFullScreen` default true), `:273-293` (`IsSoundSuppressed`), `src/Cuy/dotNet/Platform/FullscreenDetector.cs` |
| Q1 | quiet hours | time window | IMPLEMENTED | `src/Cuy/dotNet/SoundManager.cs:32` (default 22:00-08:00); see Discrepancy D-09 |

Notes:
- `actions.json` `day_budget.times_of_day` (lines ~32-45) has its own bands: 7-9, 11-15, 17-21, 23-7. These do not match the four `lights.json` periods (see D-12).
- Weather: `WeatherInfo.cs` has the model (6 values, `IsWet` for Rain and Storm). There is no weather fetch service in `src/` (grep `WeatherService`, `OpenMeteo` finds only the model file). Weather is never active in the running game. Status of weather in play: NOT FOUND.

### 1.2 Home window: screens and views

Feature screens (`web/home/features/<id>/feature.js`, `registerFeature`, same 16 ids as `web/home/features/index.json`):

| id | feature id | title | status | music today |
| --- | --- | --- | --- | --- |
| H01 | achievements | Achievements | IMPLEMENTED | none |
| H02 | calendar | Care calendar | IMPLEMENTED | none |
| H03 | coloring | Colouring | IMPLEMENTED | **calm track** (`feature.js:405-406` plays `calm`; `:893-894` stops it) |
| H04 | daily | Daily gift | IMPLEMENTED | none |
| H05 | decor | Decorate | IMPLEMENTED | none |
| H06 | diary | Diary | IMPLEMENTED | none |
| H07 | farm | Farm | IMPLEMENTED | none |
| H08 | garden | Garden | IMPLEMENTED | none (time-of-day background, `garden/feature.js:47, 95, 157`) |
| H09 | market | Market | IMPLEMENTED | none |
| H10 | pigs | My Pigs | IMPLEMENTED | none |
| H11 | rooms | Rooms | IMPLEMENTED | none |
| H12 | settings | Settings | IMPLEMENTED | none (sound volume slider only, `settings/feature.js:13-14`) |
| H13 | shop | Shop | IMPLEMENTED | none (fanfare SFX on purchase, `shop/feature.js:107`) |
| H14 | store | Store | IMPLEMENTED | none |
| H15 | tricks | Tricks | IMPLEMENTED | none |
| H16 | vet | Vet clinic | IMPLEMENTED | none |

Onboarding screens (`web/home/app.js`, `showOnly`, lines 163 and up): H17 `intro`, H18 `letter`, H19 `welcome`. IMPLEMENTED, no music.

Modals and other views (`web/home/app.js`):
- H20 minigames hub: `openMinigamesModal`, line 862. IMPLEMENTED. No music on the select screen (see section 4).
- H21 sticker album (behaviour album): `openAlbumModal`, line 914; 31 sticker entries in `STICKERS`, lines 871-903. IMPLEMENTED. No music.
- H22 more menu: `openMoreModal`, line 758. IMPLEMENTED. No music.
- H23 developer test modal: `openDevTestModal`, line 969. IMPLEMENTED (debug). Not a player screen.

Places bar: `renderPlacesBar`, `app.js:641`, built from `places.json`.

Total Home screens and views: 16 feature screens + 3 onboarding + 4 modals = **23** (H01-H23).

### 1.3 Rooms

Rooms are listed in `assets/data/places.json` (house) and `assets/data/pig_rooms.json` (pig rooms and shared bedroom).

| id | name | type | unlock | levels (cols x rows, cost) | comfort class | status | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | `salon` (Living room) | shared house room | unlocked at start | 12x7 0; 16x8 530; 20x9 1200 | common (x0.5) | IMPLEMENTED | `places.json` places[house].rooms[salon] |
| R02 | `bedroom` (Bedroom) | shared house room | 470 | 10x6 0; 14x7 660 | common (x0.5) | IMPLEMENTED | `places.json` rooms[bedroom] |
| R03 | `playroom` (Playroom) | shared house room | 660 | 12x7 0; 16x8 930 | common (x0.5) | IMPLEMENTED | `places.json` rooms[playroom] |
| R04 | `dorm` (Shared bedroom) | shared, up to 6 residents | 1500 and at least 2 pigs | 16x8 0; 20x9 1100; 24x10 1800 | common (x0.5) for others; own room (x1.0) for residents | IMPLEMENTED (Core `Pet.Dorm.cs`, `SharedRoomOps.cs`; flag `DormActive` on) | `pig_rooms.json` dorm |
| R05 | `pig:kuki` | personal | free at adoption | 10x6 0; 12x7 400; 14x8 900 | own (x1.0) | IMPLEMENTED (Core `Pet.PigRooms.cs`, theme in `pig_rooms.json` themes.kuki) | `pig_rooms.json` |
| R06 | `pig:ned` | personal | free at adoption | same as R05 | own (x1.0) | IMPLEMENTED | `pig_rooms.json` themes.ned |
| R07 | `pig:james` | personal | free at adoption | same as R05 | own (x1.0) | IMPLEMENTED | `pig_rooms.json` themes.james |
| R08 | `pig:glen` | personal | free at adoption | same as R05 | own (x1.0) | IMPLEMENTED | `pig_rooms.json` themes.glen |
| R09 | `pig:racuch` | personal | free at adoption | same as R05 | own (x1.0) | IMPLEMENTED | `pig_rooms.json` themes.racuch |
| R10 | `pig:<random adoptee>` | personal (max 1 random adoption) | free at adoption | same as R05 | own (x1.0) | IMPLEMENTED (`pigs.json` `max_adopted: 1`) | `pigs.json`; `pig_rooms.json` `default_themes` (3 defaults) |

- Room id prefix `pig:` is in `web/home/features/rooms/feature.js:3` and `:14`.
- Comfort rule: `pig_rooms.json` `comfort` `own 1, common 0.5, others 0`; `common_places` = salon, bedroom, playroom, dorm, garden, park. Cap 100 (`places.json` `comfort.cap`).
- Night version of a room: same loop with filter and lower volume (user model). The repo has no per-room night track (NOT FOUND).
- Total rooms: **10** (R01-R10). The count of personal rooms is bounded by the roster of 6 (named 5 + 1 random).

### 1.4 Outdoor places and areas

| id | name | type | unlock | levels | music status | source |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | garden (Garden) | outdoor place | 400 | 16x9 0; 20x10 470 | IMPLEMENTED place; music none | `places.json` garden; `WORLD.md` section 1 |
| G2 | park (Park) | outdoor place | 1200 (needs garden) | 24x12 0; 30x14 1600 | IMPLEMENTED place; music none | `places.json` park |
| G3 | farm (Farm) | outdoor place | 600 (needs garden) | none listed (24 plots in 6 rows, `WORLD.md` section 1) | IMPLEMENTED (`features/farm`, Core `FarmEngine.cs`); music none | `places.json` farm |
| G4 | market (Market) | place | unlocked at start | none | IMPLEMENTED (`features/market`, Core `MarketPricing.cs`); music none | `places.json` market |
| G5 | garden variant: 4 time-of-day backgrounds (morning, day, evening, night) | variant | with garden | 4 | IMPLEMENTED (`garden/feature.js:47, 95, 157`) | `WORLD.md:49` |
| G6 | run (wybieg), fenced part of the garden | planned area | PLANNED | PLANNED | PLANNED only: `docs/PIG_ROOMS.md` section 8 (line ~52) and W28; no `Pet.Run.cs`, no `RunFeature.cs`, no `RunActive` flag | `docs/PIG_ROOMS.md` |
| G7 | seasons (winter, summer) | variant | - | - | NOT FOUND in code or data. Open question only: `docs/WORLD.md:278` ("czy świat ma mieć sezony (zima, lato)") | MENTIONED |
| G8 | memory corner (`memory_corner`) | decor in garden | free | - | decor item, not a place | `WORLD.md:50` |
| G9 | Home market stalls (6): seeds and tools, home and garden, pantry, buyback, daily deals, orders board | sub-areas of market | with market | - | PLANNED or IMPLEMENTED per stall not verified in this audit | `WORLD.md` section 5.1 (lines 90-98) |

Outdoor places in the design but not in data: none beyond G1-G6.

Counts used later: garden 1 place (2 loops, see section 9); park 1; farm 1; market 1.

---

## 2. Records, players and other music items

### 2.1 Records (collection of 24 in 4 series of 6)

Source for all rows: `assets/records/manifest.json` (version 3), `records[]`. Each record has five PNG states (`mint`, `worn`, `scratched`, `cracked`, `warped`) and a `tracks` field, which is **0 for every record**.

Rarity totals from the manifest: **common 17, rare 5, unique 2** (sum 24).

| id | name | series | rarity | damage states (PNG per state) | price hint | status | music |
| --- | --- | --- | --- | --- | --- | --- | --- |
| s1_poranek | Poranek w sianie | 1 Siano & lofi | common | 5 | 40 | art IMPLEMENTED; game PLANNED | tracks 0 (NOT FOUND) |
| s1_marchewka | Marchewkowy beat | 1 | common | 5 | 40 | same | tracks 0 |
| s1_deszcz | Deszcz na dachu | 1 | common | 5 | 40 | same | tracks 0 |
| s1_kubek | Kubek z para | 1 | common | 5 | 40 | same | tracks 0 |
| s1_nocna | Nocna sciezka | 1 | rare | 5 | 150 | same | tracks 0 |
| s1_cichy | Cichy kat | 1 | common | 5 | 40 | same | tracks 0 |
| s2_rosa | Rosa | 2 Ogrod | common | 5 | 40 | same | tracks 0 |
| s2_pietruszka | Pietruszka funk | 2 | common | 5 | 40 | same | tracks 0 |
| s2_pszczoly | Pszczoly | 2 | rare | 5 | 150 | same | tracks 0 |
| s2_wiatr | Wiatr w trawie | 2 | common | 5 | 40 | same | tracks 0 |
| s2_dynia | Dynia | 2 | common | 5 | 40 | same | tracks 0 |
| s2_jablka | Zimowe jablka | 2 | common | 5 | 40 | same | tracks 0 |
| s3_ksiezyc | Ksiezyc | 3 Nocne zabawy | common | 5 | 40 | same | tracks 0 |
| s3_swietliki | Swietliki | 3 | rare | 5 | 150 | same | tracks 0 |
| s3_sowa | Sowa | 3 | common | 5 | 40 | same | tracks 0 |
| s3_kolysanka | Kolysanka | 3 | common | 5 | 40 | same | tracks 0 |
| s3_tupot | Cichy tupot | 3 | common | 5 | 40 | same | tracks 0 |
| s3_sen | Sen o sianie | 3 | common | 5 | 40 | same | tracks 0 |
| s4_disco | Disco gryzon | 4 Retro 70-90 | unique | 5 | 500 | same | tracks 0 |
| s4_synth | Synth fala | 4 | rare | 5 | 150 | same | tracks 0 |
| s4_kaseta | Kaseta mixtape | 4 | rare | 5 | 150 | same | tracks 0 |
| s4_radio | Radio FM | 4 | common | 5 | 40 | same | tracks 0 |
| s4_arcade | Arcade | 4 | common | 5 | 40 | same | tracks 0 |
| s4_taniec | Taniec w klatce | 4 | unique | 5 | 500 | same | tracks 0 |

Common to all rows:
- Price hint is per rarity only: common 40, rare 150, unique 500 (`assets/records/players_design.json` `economy_draft.record_price_hint`). Marked "DO DOPRACOWANIA" (to be worked out). Not in any `world_items.json` or shop data (NOT FOUND).
- Damage field: no `condition` or `wear` field. The damage is the set of five PNG states per record (`states` map in the manifest). Price multiplier per state: mint 1.0, worn 0.7, scratched 0.6, cracked 0.5, warped 0.6 (`players_design.json` `economy_draft.state_price_multiplier`).
- Damaged records (which copy has which state): **NOT FOUND**. The manifest says the state is a fixed property of each copy (`manifest.json` note), and no copy data exists.
- Sleeves: 24 files in `assets/records/sleeve/` (one per record). Frame files: `frame_common.png`, `frame_rare.png`, `frame_unique.png`. Empty slot: `sleeve_empty.png`.
- PNG count check: 24 x 5 states = 120, plus 3 frames and 1 empty slot = 124 PNGs in `assets/records/`. Matches the directory listing.
- Tracks or sides per record stated in the repo: **NOT FOUND**. Only the `tracks: 0` placeholder exists (see D-02).
- Record "find" or acquisition code in Core or desktop: **NOT FOUND** (grep `Vinyl`, `PlayerOwned`, `RecordOwned`, `AddRecord` in `src/`).
- `assets/records/` is read by no code: grep `records/manifest`, `manifest.json`, `players_design`, `assets/records` in `web/`, `src/`, `tools/` returns nothing (`docs/PROMPT_PODPIECIE_GRAFIKI.md:34` says the same).

Record "easter egg": no record is labelled as an easter egg. The two `unique` records are `s4_disco` and `s4_taniec` (described as seasonal events in `players_design.json` `economy_draft.sources`). The "Rarytasy" series (unique collectibles, including "Zagubiona tasma") was dropped in `docs/PLAN_ODTWARZACZ.md:39` and `:65`.

### 2.2 Music players (6)

Source: `assets/records/players_design.json` `players`, and `docs/PLAN_ODTWARZACZ.md` section 2 (lines 10-18).

| id | name | role | price hint | range (cells) | mood bonus | dance style | light | art | data status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| player_turntable | Wooden turntable | start, 70s | 0 (start owned) | 5 | 1.0 | kolysanie (sway) | no | IMPLEMENTED (`assets/world/house/player_turntable.png` + `_on`) | PLANNED (`world_items.json` has no `player_*`) |
| player_portable | Suitcase record player | portable | 120 | 4 | 0.8 | sway | no | IMPLEMENTED (art) | PLANNED |
| player_gramophone | Horn gramophone | decorative, 1920 | 300 | 5 | 1.0 | obrot (spin) | no | IMPLEMENTED (art) | PLANNED |
| player_cassette | Cassette deck | 80s | 450 | 5 | 1.1 | popcorn | no | IMPLEMENTED (art) | PLANNED |
| player_boombox | Boombox | loud, bass | 700 | 7 | 1.3 | popcorn | yes | IMPLEMENTED (art) | PLANNED |
| player_jukebox | Jukebox | 50s, record queue | 1200 | 8 | 1.5 | all | yes | IMPLEMENTED (art) | PLANNED |

- Art: 12 PNG files (6 off, 6 `_on`) in `assets/world/house/`. UI and FX: `mp_panel`, `mp_display`, `mp_btn`, `mp_btn_pressed`, `mp_knob`, `mp_thumb`, `shelf_plank`, `badge_wear_{mint,worn,scratched,cracked,warped}` in `assets/ui/` (12 files checked); `fx_notes.png`, `fx_vu.png`, `fx_record_reveal.png` in `assets/fx/`.
- Player prices: see D-06 (two different sets in the docs).
- Player mood bonus is a multiplier in the design notes only. No code reads it.
- Count: **6 players**, all PLANNED for behaviour (art IMPLEMENTED).

### 2.3 Other music-capable or music-named items

- `gramophone` in `assets/data/world_items.json` (`items[]`): place house, size 1x1, price 15, comfort 0, layer floor, icon `gramophone`. Status IMPLEMENTED as **decor only**; it does not play music. Motif also in `docs/STYL_SWIATA.md:93` ("gramofon i kaseta (lofi)"), a design motif.
- Other radios, jukeboxes, cassettes, vinyl, turntables, tapes in `assets/data/*.json` and `world_items_proposed.json`: NOT FOUND (apart from the players above, which are design notes).
- Shop entries for music or records: NOT FOUND.

---

## 3. Existing audio and how it plays today

### 3.1 `assets/music/` (5 OGG files + `tracks.json`)

Durations from `ffprobe`. All files are Vorbis, stereo, 44.1 kHz. All are played with `loop = true` (default in `web/home/music.js:173`).

| file | id (tracks.json) | use | duration | bitrate | loop or one-shot | license | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `music/adventure_stage1.ogg` | games_1 | minigames (alternate with games_2) | 41.14 s | 329 kbps | loop | CC0 | `assets/music/tracks.json` entry `games_1`; `assets/LICENSES/music.md` |
| `music/adventure_stage2.ogg` | games_2 | minigames | 56.10 s | 352 kbps | loop | CC0 | `tracks.json` entry `games_2` |
| `music/adventure_boss.ogg` | games_boss | last 15 s of Veggie Rain (only) | 71.72 s | 337 kbps | loop | CC0 | `tracks.json` entry `games_boss`; `minigames-api.js:446` |
| `music/adventure_select.ogg` | menu | result screen after a game | 21.33 s | 352 kbps | loop | CC0 | `tracks.json` entry `menu`; `minigames-api.js:540` |
| `music/calm_loop.ogg` | calm | colouring | 265.99 s | 75 kbps | loop | CC0 | `tracks.json` entry `calm`; `coloring/feature.js:406` |

- Total: 456.28 s (about 7 min 36 s) of audio.
- `tracks.json`: 5 entries. Authors: Juhani Junkala (4), Spring Spring (1).
- `assets/LICENSES/music.md`: 5 lines (one per track), CC0, with source URL and download date. `THIRD_PARTY_NOTICES.md` section 15 (lines 257-264) lists the same 5.
- Calm track title and author: "Exploring Town" by Spring Spring (opengameart).

### 3.2 `assets/sounds/` (10 WAV one-shots)

All mono, 44.1 kHz, PCM. Loaded by name in `src/Cuy/dotNet/SoundManager.cs:157-170`.

| file | duration | mode | used for | source |
| --- | --- | --- | --- | --- |
| `angry_squeal.wav` | 0.45 s | one-shot | anger (teeth chattering, too many clicks) | `src/Cuy.Core/Audio/SoundPolicy.cs:19` |
| `chirp.wav` | 0.42 s | one-shot | baby, contentment | `SoundPolicy.cs:15` |
| `crunch_1.wav` | 0.28 s | one-shot (alternates) | eating | `SoundPolicy.cs:21` |
| `crunch_2.wav` | 0.30 s | one-shot (alternates) | eating | `SoundPolicy.cs:21` |
| `fear_squeal.wav` | 0.41 s | one-shot | fear, fleeing | `SoundPolicy.cs:17` |
| `pop.wav` | 0.25 s | one-shot | popcorning | `SoundPolicy.cs:23` |
| `purr.wav` | 1.44 s | **loops while petting** | purring | `SoundPolicy.cs:13`; `SoundManager.cs:400` (`StartPurrLoop`) |
| `wheek_1.wav` | 0.54 s | one-shot (random pick) | wheek | `SoundManager.cs:387` |
| `wheek_2.wav` | 0.40 s | one-shot (random pick) | wheek | same |
| `wheek_3.wav` | 0.34 s | one-shot (random pick) | wheek | same |

Only the purr is a loop. The other nine are one-shots.

### 3.3 Licences for audio

- `assets/LICENSES/music.md`: CC0 (5 tracks). Consistent with `tracks.json`.
- `assets/LICENSES/sounds.md`: states "Pixabay Content License" for 10 entries, but the file names listed there (`kwik_1..3`, `mruczenie`, `cwierkanie`, `pisk_strachu`, `pisk_zlosci`, `chrupanie_1..2`, `pop`) do not match the files in `assets/sounds/`. Only `pop.wav` matches. See D-10.
- `THIRD_PARTY_NOTICES.md` line 170: NAudio is "used for sound playback and for the per-session audio peak meters". The line also claims the dance feature (F6-01), which is not implemented.
- ZzFX (MIT) is used for the Home synth sounds. Licence `assets/LICENSES/zzfx.txt`.
- Nyan Cuy synth music: no licence needed (synthesised in code).

### 3.4 How audio plays today

| path | where | what | status | evidence |
| --- | --- | --- | --- | --- |
| Desktop SFX | `src/Cuy/dotNet/SoundManager.cs` | NAudio `WaveOutEvent`, 10 clips cached, per-clip volume | IMPLEMENTED | `SoundManager.cs:157-170, 308-340` |
| Desktop NAudio version | `src/Cuy/Cuy.csproj:32` | `NAudio` **1.8.4** | IMPLEMENTED; F6-00 upgrade (2.2.1) NOT applied | see D-08 |
| Desktop volume | `SoundManager.cs:84-114` | 0.0-1.0, synced to `Program.MyData`; fallback `_volumeFallback = 0.8f` (line 114) | IMPLEMENTED | |
| Desktop mute | `SoundManager.cs:54-62` | `IsMuted` (default false, from saved setting) | IMPLEMENTED | |
| Desktop quiet hours | `SoundManager.cs:32, 116-125, 287-289` | enabled by default, 22:00-08:00 | IMPLEMENTED; default mismatch with Core (D-09) | |
| Desktop full-screen mute | `SoundManager.cs:51, 67-77, 237-265, 293` | `MuteOnFullScreen` default true; check cached 1500 ms | IMPLEMENTED | |
| Wheek rate limit | `SoundManager.cs:33, 376-393`; `src/Cuy.Core/Audio/SoundPolicy.cs:11` | max 1 wheek per 2 minutes | IMPLEMENTED | |
| Home SFX | `web/home/sound.js` | ZzFX synth, 5 cues: `click`, `wheek`, `crunch`, `sweep`, `fanfare`; volume default 0.7 (line 22), `zzfxV = volume * 0.3` (line 38) | IMPLEMENTED | W21-03 (plant, water, harvest, coin, place, error) NOT FOUND in `sound.js` (see Gaps) |
| Home music player | `web/home/music.js` | `window.CuyMusic`, `HTMLAudioElement` per track, fade 400 ms; default volume `0.35` (line 20); on/off default `true` (line 21); localStorage keys `cuy_music_volume`, `cuy_music_on` (lines 11-12) | IMPLEMENTED | loaded in `web/home/index.html:264` |
| Home music volume UI | - | `CuyMusic.setVolume` and `setEnabled` have **no caller** in `web/` | NOT REACHABLE from UI | grep result empty |
| Home music mute link | `music.js:39-44, 255-266` | follows `Sound.isMuted` (poll 500 ms); stops when hidden (visibility change, line 261) | IMPLEMENTED | |
| Home music quiet hours | - | not applied by `music.js` (only desktop applies quiet hours) | NOT FOUND | grep |
| Home music autoplay | `music.js:275-288` | retry on first `pointerdown` or `keydown` | IMPLEMENTED | `docs/TESTY_RECZNE.md:89` (AUTOPLAY-01) not yet tested on Windows |
| Minigame music | `web/home/minigames/minigames-api.js` | see section 4 | IMPLEMENTED | |
| Nyan Cuy synth music | `web/home/minigames/nyan-audio.js` | 135 BPM lead and bass, Web Audio | **dead code**: not loaded by any HTML (see D-16) | `nyan-audio.js:118` |
| Dance to music (loopback) | - | `AudioSessionProbe`, `MusicDetector` (Core), `DanceToMusicBehavior` | **NOT IMPLEMENTED**: `MusicDetector.cs` exists in Core but nothing in `src/Cuy` uses it; `AudioSessionProbe.cs` and `DanceToMusicBehavior.cs` NOT FOUND | D-07 |
| Dance animation | `web/home/canvas-pig.js:32` | sprite row 16, 16 frames, 8 fps, loop | IMPLEMENTED | triggered by mood, not music (`docs/ANIMATIONS.md:26`) |
| Dancing action | `assets/data/actions.json` id `dancing`; `src/Cuy.Core/AI/Brain.cs:752-757` | 4 s, mood +4, energy -2 | IMPLEMENTED | description "when the mood is very high" |
| Music event mapping | `assets/data/actions.json:622-624` (`"music": { "animation": "dance" }`) | event `music` | **no raiser** in `src/` (grep: only `SelfTest.cs:75`, which is a check name) | D-07 |
| Music check at start-up | `src/Cuy/dotNet/SelfTest.cs:470-482` | checks `music/tracks.json` files exist and are over 10 KB | IMPLEMENTED | |

---

## 4. Minigames

Minigame list: `web/home/minigames/games.json` (5 JS files: 4 games + `hay-maze-logic.js`). Music hook code: `web/home/minigames/minigames-api.js`.

| id | game | states in code | music hooks | status |
| --- | --- | --- | --- | --- |
| M1 | Veggie Rain (`veggie-rain.js`) | start; play (60 s timer, `GAME_SECONDS`, `:30`); finish (`finish()`, `:146`, then `endGame`) | start: `games_1` / `games_2` alternate (`minigames-api.js:362-363`); `onTimeLeft` at 15 s: `games_boss` (`:446`; `veggie-rain.js:79` calls it); pause/resume (`:485`, `:503`); result: `menu` at volume 0.6 (`:540`) | IMPLEMENTED |
| M2 | Nyan Cuy (`nyan-cuy.js`) | hover before start (`:420`); play; game over (`gameOver()`, `:299`; GAME OVER modal `:343-375`); restart (`:375`) | shim `NyanAudio.startMusic` (`nyan-cuy.js:42-52`) calls `CuyMusic.play('games_1')`; `startMusic` called at start (`:156-157`), `stopMusic` (pause) at game over (`:171-177`, `:303-304`); no `onTimeLeft`, so no boss track | IMPLEMENTED |
| M3 | Veggie Memory (`veggie-memory.js`) | play (card flips); level complete (`levelComplete()`, `:270`); Finish button (`:106-118`) | start/pause/resume/result via `minigames-api.js` only | IMPLEMENTED |
| M4 | Hay Maze (`hay-maze.js`) | play (60 s timer, `:22`); clover pickup (`:341`); finish records time (`docs/TESTING.md` line 31) | via `minigames-api.js` only; no `onTimeLeft`, so no boss track | IMPLEMENTED |
| M5 | minigame select screen (`renderSelectScreen`, `minigames/index.html:81`) | menu | **no music** | IMPLEMENTED (no music) |
| M6 | minigame result screen (`endGame`, `minigames-api.js:536-540`) | result | `menu` track at volume 0.6 | IMPLEMENTED |

Stems: none (NOT FOUND). Each game uses whole tracks.
Stop on close: `CuyMusic.stop` is called only from coloring (`coloring/feature.js:894`). Minigames only pause on Home close (`minigames-api.js:8`, `:485`). See Gaps.
Synth Nyan music: `nyan-audio.js` is not loaded by any HTML (grep `nyan-audio` in `web/`, `*.html` and `*.js` returns only its own header). The game plays `games_1` from the ogg via the shim instead.
QA note: `docs/qa/reports/S1.md:13` says the bass notes `E2`, `FS2`, `GS2` are missing from the note table in `nyan-audio.js`, so they are silently skipped (not confirmed in this audit).

Minigame total: 4 games, 1 select screen, 1 result screen.

---

## 5. Events that could get a jingle

Raised = a `Raise(...)` or `?.Invoke(...)` call exists in `src/Cuy.Core`. Listener = subscriber in `src/Cuy/dotNet`.

| id | event | raised (Core) | listener (desktop) | jingle in docs? | status |
| --- | --- | --- | --- | --- | --- |
| E01 | `StageChanged` (life stage) | `Pet.cs:163` | `BrainController.cs:85`; `HomeWindow.cs:153` | not stated | IMPLEMENTED |
| E02 | `Birthday` | `Pet.cs:177` | `BrainController.cs:90`; `HomeWindow.cs:154`. Reward 100 and party animation in `actions.json:628-629` | **yes**: `ARCHITECTURE.md:162` "Annual celebrations with party music" (MENTIONED) | IMPLEMENTED; party music NOT FOUND |
| E03 | `LevelUp` (bond level) | `Pet.Bond.cs:81` | `HomeWindow.cs:155` | not stated | IMPLEMENTED |
| E04 | `DailyGiftClaimed` | `Pet.Economy.cs:90` | NOT FOUND | not stated | IMPLEMENTED (no listener) |
| E05 | `OfferUnlocked` (named-pig offer) | `Pet.Adoption.cs:219` | `BrainController.cs:91` | not stated (toast + diary, `docs/NAMED_PIGS.md` section 2.1) | IMPLEMENTED |
| E06 | `PigAdopted` (incl. memorial) | `Pet.Adoption.cs:315` | `BrainController.cs:92`; `Pet.PigRooms.cs:37` | not stated | IMPLEMENTED |
| E07 | `PlaceUnlocked` | `Pet.World.cs:100, 120`; `Pet.Dorm.cs:42` | NOT FOUND | not stated | IMPLEMENTED (no listener) |
| E08 | `PlaceUpgraded` (room upgrade) | `Pet.World.cs:143`; `Pet.Dorm.cs:62` | NOT FOUND | not stated | IMPLEMENTED (no listener) |
| E09 | `NeedLow` | `Pet.cs:191` | `BrainController.cs:118`; `HomeWindow.cs:151` | no | IMPLEMENTED |
| E10 | `NeedCritical` | `Pet.cs:201` | `BrainController.cs:125`; `HomeWindow.cs:152` | no | IMPLEMENTED |
| E11 | `AchievementEarned` | `Pet.Achievements.cs:83` | NOT FOUND | no | IMPLEMENTED (no listener) |
| E12 | minigame result and new high score | `minigames-api.js:568` (`Sound.fanfare()` on new record) | JS | no | IMPLEMENTED (SFX fanfare) |
| E13 | new album sticker (behaviour seen) | `app.js:871-939` (`unlockedCount`) | JS | no | IMPLEMENTED |
| E14 | purchase | no Core event; `TrySpendClovers` path; shop plays `fanfare()` at `shop/feature.js:107` | JS | no | IMPLEMENTED as SFX only |
| E15 | record found or unlocked | NOT FOUND in code | - | `docs/PLAN_ODTWARZACZ.md:82` (section 9.7, "Zdobycie płyty", `fx_record_reveal`) | **PLANNED** |
| E16 | room (place) upgrade | = E08 | - | `docs/PIG_ROOMS.md` section 6 | IMPLEMENTED (= E08) |
| E17 | daily reward streak | = E04 (`DailyRewardEventArgs` streak) | - | - | IMPLEMENTED |
| E18 | birthday, party jingle | = E02 | - | `ARCHITECTURE.md:162` | MENTIONED |

Event declarations in Core: 13 in total (`Pet.cs:31-43` NeedLow, NeedCritical, StageChanged, Birthday, LevelUp; `Pet.Adoption.cs:19-20` OfferUnlocked, PigAdopted; `Pet.Achievements.cs:37` AchievementEarned; `Pet.Economy.cs:18` DailyGiftClaimed; `Pet.World.cs:19-20` PlaceUnlocked, PlaceUpgraded; `Save/AutoSaver.cs:35` SaveFailed; `Audio/MusicDetector.cs:26` MusicChanged). `SaveFailed` and `MusicChanged` are not game events. `MusicChanged` is raised in `MusicDetector.cs:125` but nothing subscribes to it in `src/`.

Jingle candidates with explicit "special" wording in docs: E02 (birthday party music, MENTIONED) and E15 (record reveal, PLANNED). Used for production: 2.

---

## 6. Modifiers that could change music without new tracks

| id | modifier | values (count) | source | status |
| --- | --- | --- | --- | --- |
| M01 | life stage | Baby, Junior, Adult, Senior, Legend (5). Thresholds 21 days, 0.5 y, 4 y, 8 y | `src/Cuy.Core/LifeStage.cs` | IMPLEMENTED |
| M02 | time of day, ambient | morning, day, evening, night (4) | `assets/data/lights.json` `ambient` | IMPLEMENTED (garden and rooms render; desktop does not) |
| M03 | time of day, activity bands | 7-9, 11-15, 17-21, 23-7 (4) | `assets/data/actions.json` `day_budget.times_of_day` | IMPLEMENTED (different boundaries, see D-12) |
| M04 | weather | Clear, Cloudy, Fog, Rain, Snow, Storm (6); Rain and Storm are "wet" | `src/Cuy.Core/Weather/WeatherInfo.cs` | model IMPLEMENTED; fetch NOT FOUND (inactive) |
| M05 | season | NOT FOUND (0 values) | - | NOT FOUND (`WORLD.md:278` question only) |
| M06 | mood | 0-100; low threshold 35; critical 15; hysteresis 5; dancing at mood 85 or more | `src/Cuy.Core/Balance.cs:48, 51, 57`; `docs/ANIMATIONS.md:26` | IMPLEMENTED |
| M07 | needs | 6: satiety (fullness), vitamin C, energy, mood, cleanliness, teeth | `src/Cuy.Core/Need.cs` | IMPLEMENTED |
| M08 | sleep state | awake, asleep (sleep, nap, sleep in house); offline counts as sleep; energy regen 15 per hour | `actions.json`; `Balance.cs:42, 45` | IMPLEMENTED |
| M09 | pig count | active pigs 1-2 (`BrainController.cs:304` takes 2); roster 1-6 (`pigs.json` `max_roster` 6); named 5; random 0-1 (`max_adopted` 1) | `pigs.json`, `pigs_named.json`, `NAMED_PIGS.md` section 4.3 | IMPLEMENTED |
| M10 | memorial mode | off, on (per pig, 5 pigs) | `docs/NAMED_PIGS.md` section 5 | PLANNED or IMPLEMENTED per W13 (not verified) |
| M11 | comfort | 0-100 cap; own room x1.0; common x0.5; others x0 | `places.json` `comfort`; `pig_rooms.json` `comfort` | IMPLEMENTED |
| M12 | bond level | 0-20 (`MaxBondLevel` 20; `BondStep` 15) | `Balance.cs:72, 78` | IMPLEMENTED |
| M13 | birthdays celebrated | integer per pig | `Events.cs` (`BirthdayEventArgs`) | IMPLEMENTED |
| M14 | daily streak | integer | `Events.cs` (`DailyRewardEventArgs`) | IMPLEMENTED |
| M15 | quiet hours | on or off (window 22:00-08:00 or 22:00-07:00) | `SoundManager.cs:32`; `SoundPolicy.cs` | IMPLEMENTED (two defaults, D-09) |
| M16 | full screen | on or off | `SoundManager.cs:77`; `FullscreenDetector.cs` | IMPLEMENTED |
| M17 | mute and volume | mute on or off; volume 0-100 % | `SoundManager.cs:54, 84`; `music.js:20-21` | IMPLEMENTED (music volume not reachable from UI) |
| M18 | pig trait | 7: cuddly, glutton, explorer, vocal, skittish, sleepyhead, popcorning | `docs/NAMED_PIGS.md` section 3 table (row "Cechy") | IMPLEMENTED (named pigs) |
| M19 | record rarity | common, rare, unique (3) | `manifest.json` | IMPLEMENTED (data) |
| M20 | record state | mint, worn, scratched, cracked, warped (5) | `manifest.json` states; `players_design.json` | art IMPLEMENTED; game PLANNED |
| M21 | player | 6, range 4-8, mood bonus 0.8-1.5, dance style sway/spin/popcorn/all | `players_design.json` | PLANNED |
| M22 | garden or park or farm or market unlocked | locked or unlocked (per place) | `places.json` | IMPLEMENTED |
| M23 | minigame | 4 games; boss track only in Veggie Rain | section 4 | IMPLEMENTED |

---

## 7. Pigs

- **Named pigs: 5**: Kuki, Ned, James, Glen, Racuch (`assets/data/pigs_named.json` 5 entries; `docs/NAMED_PIGS.md` sections 2-3).
- **Random adoptee names: 10**: Piko, Milo, Luna, Koko, Buba, Zuzu, Nala, Oreo, Pumpkin, Mochi (`assets/data/pigs.json` `names`). Max 1 random adoption (`max_adopted` 1). Roster max 6 (`max_roster` 6).
- **Breeds: 4** in the art reference: smooth, teddy, rosette, peruvian (`docs/RASY.md` table lines 8-11). The `skinny` breed was dropped and maps to `smooth_lean` (`RASY.md:18`). Core still lists 5 breeds including `skinny` (`src/Cuy.Core/Pigs/PigProfile.cs:48`; see D-11).
- **Builds: 3**: normal, chubby, lean (`RASY.md` lines 15-17).
- Named-pig breed and build (`docs/NAMED_PIGS.md` section 3 table): Kuki rosette / normal; Ned teddy / chubby; James teddy / normal; Glen rosette / lean; Racuch smooth / chubby.
- **Music themes or favourite music per pig: NOT FOUND.** `NAMED_PIGS.md`, `pigs_named.json` and `pig_rooms.json` contain no music preference. The `mood` fields in `pig_rooms.json` (for example "calm meadow", "snack nook") are room decor themes, not music.
- Music-related traits, planned only: `docs/PLAN_ODTWARZACZ.md:96` (section 11): popcorning pigs dance often, sleepyhead sways only, skittish ignores loud music. PLANNED.

---

## 8. Music mentions in docs and tasks (decided or not)

Each row quotes the file and line. Translations are mine.

- `docs/CONCEPT.md:13`: "dźwięki własne, muzyka CC0" (own sounds, music CC0). Decided.
- `docs/CONCEPT.md:15`: "taniec do muzyki ... opcjonalne (fala W8)" (dancing to music optional, wave W8). Decided as optional.
- `docs/PLAN.md:33`: "Muzyka, emoji, font | Juhani Junkala (CC0), Twemoji (CC-BY 4.0), Pixelify Sans (OFL)". Decided.
- `docs/PLAN.md:174`: "taniec do muzyki" is in a list the owner must decide; "Claude rozpisuje pliki dopiero po Twojej decyzji". Waiting for owner decision.
- `docs/PLAN_ODTWARZACZ.md` (whole file, 100 lines): the record and player design. Key lines: 4 (assumption), 7 (music from a player), 33 (36 records), 61 (36 sets), 65 (decision: 24 records), 78 (24 pieces), 82 (n/24 counter), 90 (prices), 96-100 (dancing).
- `docs/PLAN_FALE_WDROZENIE.md`: line 9 (D2: `tracks` are 0, 5 OGG in the shared pool), line 10 (D3 prices), line 16-22 (Fala A: player, shelf, mini-player, world players, economy, smoke), line 62 (`MUSIC_AUDIO=false` fallback), line 66 (no audio in CI), line 79 (D3 decision: 6 players 120/250/400/600/900/1400), and the decisions table with D2 "wspólna pula 5 plików ogg" (shared pool of 5 OGG; track = hash(id) mod 5).
- `docs/PRZEKAZANIE_ODTWARZACZE.md` section "Dla agenta audio" (lines 26-30): "24 zestawy: utwory (pętle) + krótkie dźwięki". Audio hand-off. "Do zrobienia w kodzie" item 3 asks for `records.json` with `tracks`.
- `docs/PROMPT_PODPIECIE_GRAFIKI.md:21`: "Muzyka | music/tracks.json + 5 plików .ogg | płyty mają jeszcze tracks: 0". `:34`: "Odtwarzacz muzyki (jeszcze nie ma kodu)" (music player, no code yet).
- `docs/TESTY_RECZNE.md:14-29` (section 1, AUD-01..AUD-14): manual audio tests; `:46` (FS-08): sounds must not be muted on desktop click; `:89` (AUTOPLAY-01): does music start without a click; `:171` (in the table) same.
- `docs/TESTING.md:39`: "Play audio or music on Windows | Pig notices sound" (manual test 33).
- `docs/ANIMATIONS.md:26`: "dance | Brain action dancing (mood >= 85); event `music` | both | used".
- `docs/STYL_SWIATA.md:6` ("trochę lofi, vintage'owy domek"): style. `:93` motif "gramofon i kaseta (lofi)".
- `docs/VISUAL_LOG.md:224-231`: "M3 + M4 muzyka (5.11.2026)": art of records and players.
- `docs/INWENTARZ_GRAFIKI.md:15`: "Dźwięki i muzyka | 10 efektów, 5 utworów" (10 effects, 5 tracks). Matches the repo.
- `docs/PLAN_PRZEBUDOWY.md:20`: "dźwięki i muzyka" kept unchanged in the rebuild.
- `docs/qa/reports/S1.md:13`: Nyan Cuy synth bass notes missing from table.
- `docs/prompts/items/W21-03-world-sounds.md`: six new cues (plant, water, harvest, coin, place, error) in `sound.js`; not present (see Gaps).
- `RESEARCH.md:162-164` (R2: sounds and music in Home), `:182` (Juhani Junkala tracks), `:407` (F6-01 dance to music), `:431-433` (R12: music detection).
- `DECYZJE.md:14`: dance pipeline `AudioSessionProbe` → `MusicDetector` → `DanceToMusicBehavior`; no WASAPI loopback, no BPM. Decided. Not implemented.
- `DECYZJE.md:35`: ZzFX (MIT) for sounds. Decided and used.
- `DECYZJE.md:36`: music CC0, quote of the OpenGameArt pages. Decided and used.
- `ARCHITECTURE.md:35` (assets include music), `:85` (`Audio/*` = `MusicDetector`, `SoundPolicy`), `:162` ("Birthday System (`actions.json`): Annual celebrations with party music and popcorn jumping"), `:169` (`nyan-audio.js` as part of nyan_cuy).
- `THIRD_PARTY_NOTICES.md:170`: NAudio for dance feature (not implemented), `:257-264` (section 15 Music: 5 tracks).
- `README.md:59`: "Art (...), sounds, music and data | assets/".
- `docs/archive/jules-F-tasks/F1-09-retro-music.md`: music assets and player (done: `music.js`, `tracks.json`, `music/`). Archive.
- `docs/archive/jules-F-tasks/F2-08-music-and-settings.md`: music in games, Settings toggle (**toggle NOT implemented**), stop on close (**not implemented**). Archive.
- `docs/archive/jules-F-tasks/F6-00-naudio-upgrade.md`: NAudio 2.2.1 (**not applied**: `Cuy.csproj:32` says 1.8.4). Archive.
- `docs/archive/jules-F-tasks/F6-01-dance-to-music.md`: dance to music (**not implemented**). Archive.
- `docs/CONCEPT.md:17` and `docs/WORLD.md` contain no music mention beyond the lines above.
- `TODO.md`, `ROADMAP.md`, `STAN_PROJEKTU.md`: no music mention in the narrow search.

---

## Discrepancies

Each item lists both sides. "Used" says what the production plan uses.

- **D-01 Record collection size: 36 or 24?**
  - `docs/PLAN_ODTWARZACZ.md:33`: "36 płyt w 6 seriach po 6" (36 records in 6 series).
  - `docs/PLAN_ODTWARZACZ.md:61`: "Audio: 36 zestawów" (36 audio sets).
  - `docs/PLAN_ODTWARZACZ.md:55`: M3 row "Płyty serii 3-6 (24 płyty...)" (series 3-6, 24 records; series 3-6 is four series, which conflicts with the 1-4 numbering elsewhere).
  - `docs/PLAN_ODTWARZACZ.md:65` (section 7, decision): "Rozmiar kolekcji: 24 płyty (4 serie po 6 ...)" (24 records, 4 series). Explicit decision.
  - `assets/records/manifest.json` note: "24 plyty w 4 seriach po 6".
  - `docs/PRZEKAZANIE_ODTWARZACZE.md` section "Dla agenta audio": "24 zestawy".
  - Used: **24**. The repo states the decision explicitly (line 65), so it overrides line 33.

- **D-02 Tracks per record: 0, a shared pool of 5, or 4 each?**
  - `assets/records/manifest.json`: `"tracks": 0` on all 24 records.
  - `docs/PLAN_FALE_WDROZENIE.md:9` (D2): "Audio per płyta: tracks w manifeście są 0 (jest 5 plików ogg)" and decision D2 (table, later in the file): shared pool of 5 OGG; a record gets track `hash(id) mod 5`.
  - `docs/PROMPT_PODPIECIE_GRAFIKI.md:21`: "płyty mają jeszcze tracks: 0".
  - User model: 4 tracks per record (side A 2, side B 2). Not in the repo.
  - Used: **4 per record, 96 total** (user model). This conflicts with D2 (5 shared tracks in total). The owner must decide. The difference is 91 tracks.

- **D-03 Wear levels: 3 or 5?**
  - User model: 3 levels (new, worn, scratched).
  - `assets/records/manifest.json` note and `states`: 5 states (mint, worn, scratched, cracked, warped).
  - `docs/PLAN_ODTWARZACZ.md:28-31` (section 3): the same 5 states.
  - `docs/PLAN_ODTWARZACZ.md:41`: "4 stany uszkodzeń dla serii 1-2" (4 damage states for series 1-2). Conflicts with the manifest, which has 5 for every record.
  - `players_design.json` `economy_draft.state_price_multiplier`: 5 values.
  - Used: **5 states**, because the repo states them explicitly. The track count does not change (0 extra tracks per state).

- **D-04 Record sprite size: 12x12 or 16x16?**
  - `docs/PLAN_ODTWARZACZ.md:24`: "okrągła płyta 12x12 px" and `:41` "sprite 12x12".
  - `assets/records/manifest.json` note: "Dysk 16x16, rekaw 24x24".
  - Not used for music. Art fact to fix.

- **D-05 Easter-egg record: none in the repo.**
  - User model: an easter-egg record gets 2 tracks.
  - Repo: no record is called an easter egg. The `unique` records (`s4_disco`, `s4_taniec`) are described as seasonal events (`players_design.json` `economy_draft.sources`).
  - Used: **none counted as easter egg** (rule not applicable; base 96 tracks). Alternative in section 9.5: if the two unique records are easter eggs, 92 tracks.

- **D-06 Player prices: two different sets.**
  - `assets/records/players_design.json` `price_hint`: 0, 120, 300, 450, 700, 1200.
  - `docs/PLAN_ODTWARZACZ.md:90`: "przenośny 120, fonograf 300, magnetofon 450, boombox 700, szafa grająca 1200" (same as players_design).
  - `docs/PLAN_FALE_WDROZENIE.md:79` (D3): "6 odtwarzaczy rosnąco 120 / 250 / 400 / 600 / 900 / 1400" (6 players rising 120 / 250 / 400 / 600 / 900 / 1400).
  - Not used for music counts. Prices are "DO DOPRACOWANIA" in both.

- **D-07 Dance to music: documented as built, not built.**
  - `DECYZJE.md:14`, `docs/archive/jules-F-tasks/F6-01-dance-to-music.md`, `THIRD_PARTY_NOTICES.md:170`: the pipeline exists (`AudioSessionProbe` → `MusicDetector` → `DanceToMusicBehavior`).
  - Repo: `src/Cuy.Core/Audio/MusicDetector.cs` exists, but only `tests/Cuy.Core.Tests/ReadyMadeComponentsTests.cs` uses it. `AudioSessionProbe.cs` and `DanceToMusicBehavior.cs` NOT FOUND.
  - `assets/data/actions.json:622` has an event `music`, and `docs/ANIMATIONS.md:26` says "event `music` | used". There is no code that raises it.
  - Used: **not implemented** (no music-driven dancing in the count).

- **D-08 NAudio version.**
  - `docs/archive/jules-F-tasks/F6-00-naudio-upgrade.md` (spec): upgrade to NAudio 2.2.1 before F6-01.
  - `src/Cuy/Cuy.csproj:32`: `NAudio` 1.8.4.
  - Not used. Gap for the dance feature.

- **D-09 Quiet-hours default: 22:00-08:00 or 22:00-07:00?**
  - `src/Cuy/dotNet/SoundManager.cs:32`: `new TimeSpan(22, 0, 0)` to `new TimeSpan(8, 0, 0)`, enabled.
  - `src/Cuy.Core/Audio/SoundPolicy.cs`, class `QuietHoursConfig`: default `End = 07:00`; comment "Default 22:00 - 07:00 (night)".
  - Not used for counts. Behaviour mismatch on desktop vs Core.

- **D-10 Sound licence: Pixabay vs CC0/CC-BY, and file names.**
  - `assets/LICENSES/sounds.md`: Pixabay Content License; 10 entries with names `kwik_1..3`, `mruczenie`, `cwierkanie`, `pisk_strachu`, `pisk_zlosci`, `chrupanie_1..2`, `pop`.
  - `assets/sounds/`: `angry_squeal`, `chirp`, `crunch_1..2`, `fear_squeal`, `pop`, `purr`, `wheek_1..3`. Only `pop` matches.
  - `AGENTS.md` (Rules): "Third-party assets: only CC0 or CC-BY". Pixabay is neither.
  - Gap: licence and names need fixing before the gift.

- **D-11 Breeds: 4 or 5?**
  - `docs/RASY.md` table: smooth, teddy, rosette, peruvian (4); skinny dropped, maps to smooth_lean (`RASY.md:18`).
  - `src/Cuy.Core/Pigs/PigProfile.cs:48`: `{ "smooth", "rosette", "peruvian", "chubby", "skinny" }` (5, and `chubby` is a build, not a breed).
  - Not used for music counts.

- **D-12 Time-of-day periods.**
  - `assets/data/lights.json` `ambient`: morning, day, evening, night (4).
  - `assets/data/actions.json` `day_budget.times_of_day`: 7-9, 11-15, 17-21, 23-7 (4 bands with different boundaries).
  - `docs/STYL_SWIATA.md:39` mentions dusk ("dusk/plum", not in `lights.json`). `assets/data/actions.json:23` says activity is "at dawn and dusk".
  - Used: **4 desktop loops** (count matches). Boundaries to be set by the owner.

- **D-13 "Menu" track.**
  - `assets/music/tracks.json` (`menu`, `use: menu`) and `minigames-api.js:540`: the menu track plays on the result screen after a game.
  - The minigame select screen (`minigames/index.html:81`, `renderSelectScreen`) has no music.
  - The production plan's "minigame menu loop" is a new loop, not the existing `menu` track. The count of 1 is kept and marked as new.

- **D-14 Stop on close (minigames).**
  - `docs/archive/jules-F-tasks/F2-08-music-and-settings.md`: "stop music when the games dialog closes".
  - `web/home/minigames/minigames-api.js`: no `CuyMusic.stop` call; only pause (`:485`). Coloring stops its track (`coloring/feature.js:894`).
  - Gap.

- **D-15 Music on/off and volume UI.**
  - `docs/archive/jules-F-tasks/F2-08-music-and-settings.md`: Settings toggles Music, music volume slider.
  - `web/home/features/settings/feature.js:12-14, 103-105`: only "Sound volume" (`settingsVolume`), no music control.
  - `CuyMusic.setVolume` and `setEnabled`: no caller (grep).
  - Gap for the gift.

- **D-16 Nyan Cuy synth music is not loaded.**
  - `ARCHITECTURE.md:169`: nyan_cuy includes `nyan-audio.js`.
  - Repo: `nyan-audio.js` (456 lines, 135 BPM synth) is not referenced by any HTML or JS loader. `nyan-cuy.js:42-52` uses a shim that plays `games_1` from the ogg instead.
  - Dead code, not a music track in the count.

- **D-17 W21-03 cues not added.**
  - `docs/prompts/items/W21-03-world-sounds.md`: add cues `plant`, `water`, `harvest`, `coin`, `place`, `error` to `sound.js`.
  - `web/home/sound.js`: 5 cues only (`click`, `wheek`, `crunch`, `sweep`, `fanfare`). Not done.

- **D-18 Party music for birthday.**
  - `ARCHITECTURE.md:162`: "Annual celebrations with party music".
  - `assets/music/`: no party track (5 files: stage1, stage2, boss, select, calm). Birthday music NOT FOUND. The birthday uses the party animation only (`actions.json:628`).

- **D-19 Leitmotif.**
  - User model: 1 composition of 8 bars plus arrangements (baby, senior, legend).
  - Repo: NOT FOUND (grep leitmotif, motif, theme in docs and data). Life stages exist (`LifeStage.cs`), but no theme music.
  - Used as user model, marked as not in the repo.

---

## Gaps (not discrepancies, things the repo does not have)

- Seasons (G7, M05): NOT FOUND.
- Weather fetch service: NOT FOUND (model only). Weather is also an opt-in network use (`docs/PLAN.md:174`, owner consent).
- Record find or acquisition event: NOT FOUND in code.
- Records and players in data or code: NOT FOUND (`players_design.json` and `manifest.json` are read by no code).
- Music per pig or favourite music: NOT FOUND.
- Stems for minigames: NOT FOUND.
- Music toggle and volume in Settings UI: NOT FOUND (no callers).
- Quiet hours for Home music: NOT FOUND.
- Sticker album sounds: none.
- Purchase event in Core: NOT FOUND.

---

## 9. Production plan

### 9.1 Rules applied

- Leitmotif: 1 composition (8 bars) plus 3 arrangements as code variations. Repo: NOT FOUND (user model used).
- Desktop ambient: 1 loop per time of day defined in the docs. Repo: 4 `lights.json` periods (rule confirmed: expected 4).
- Weather: noise layers, no tracks.
- Each Home screen that needs its own music: 1 loop. Repo: only coloring needs music (`coloring/feature.js:405`), and it already has `calm_loop.ogg`. Base new loops = 0. Upper bound = 15 (all other feature screens).
- Each room: 1 loop, night version = same loop with filter and lower volume. Rooms counted: 10 (R01-R10).
- Garden: 2 loops (day, evening). Repo has 4 periods (`WORLD.md:49`) but says nothing about music per period, so the user rule stays (changed nothing).
- Each other place: 1 loop. Park, farm, market (3).
- Each minigame: 1 loop split into 3 stems, plus 1 loop for the minigame menu. 4 games; the menu loop is new (D-13).
- Jingles: one per implemented or planned event that the docs call special. Two: birthday (E02, MENTIONED) and record reveal (E15, PLANNED).
- Each record: 4 tracks (side A 2, side B 2). Repo: NOT FOUND, user model used (D-02).
- Easter-egg record: 2 tracks. Repo: no easter-egg record (D-05); 0 records counted.
- Damaged records: no extra tracks. Wear is code effects (crackle, pitch wobble, low-pass, skip). Repo states 5 wear states (D-03), not 3. Damaged-copy assignment: NOT FOUND.

Changed rules (with the place the repo says so):
1. Wear levels: 3 (user) to 5 (repo, `manifest.json`, `PLAN_ODTWARZACZ.md:28-31`). Track count unchanged.
2. Record count: 24 (repo decision, `PLAN_ODTWARZACZ.md:65`), not 36 (`PLAN_ODTWARZACZ.md:33`).

### 9.2 Formula

Loops L = leitmotif 1 + desktop ambient 4 + Home screens 0 + rooms 10 + garden 2 + park 1 + farm 1 + market 1 + minigame loops 4 + minigame menu 1 = **25**
Stems S = minigames 4 x 3 = **12**
Record tracks R = records 24 x 4 + easter-egg records 0 x 2 = **96**
Jingles J = 2 x 1 = **2**
Arrangements A = leitmotif 3 (code variations, 0 files) = **3**
Noise assets N = weather layers 6 + record shared 3 = **9**
Total new audio files T = L + S + R + J + N = 25 + 12 + 96 + 2 + 9 = **144**

### 9.3 Category table

| category | items (ids) | count | tracks each | total |
| --- | --- | --- | --- | --- |
| Leitmotif (composition) | 1 | 1 | 1 | 1 loop |
| Leitmotif arrangements | baby, senior, legend | 3 | 0 (code) | 3 arrangements |
| Desktop ambient | T01-T04 | 4 | 1 | 4 loops |
| Home screens (base) | H03 coloring: existing `calm` | 0 new | 0 | 0 loops |
| Rooms | R01-R10 | 10 | 1 | 10 loops |
| Garden | G1 (day, evening) | 1 place | 2 | 2 loops |
| Park | G2 | 1 | 1 | 1 loop |
| Farm | G3 | 1 | 1 | 1 loop |
| Market | G4 | 1 | 1 | 1 loop |
| Minigames | M1-M4 | 4 | 1 loop + 3 stems | 4 loops, 12 stems |
| Minigame menu | M5 | 1 | 1 | 1 loop |
| Records | s1_poranek ... s4_taniec (24) | 24 | 4 | 96 tracks |
| Jingles | E02 birthday, E15 record reveal | 2 | 1 | 2 jingles |
| Shared noise, weather | W1-W6 (Clear may be silent; if so 5) | 6 | 1 layer | 6 |
| Shared noise, records | crackle loop, scratch, skip | 3 | 1 | 3 |

Shared noise notes: "needle drop" is not in the repo (NOT FOUND), so 0 are counted. Scratch is in the repo (`players_design.json` turntable "scratch"; `PRZEKAZANIE_ODTWARZACZE.md`: "Scratch = osobny dźwięk"). Crackle: "trzaski winylu" (`players_design.json`). Skip: "przeskok" for cracked (`PLAN_ODTWARZACZ.md` section 3).

### 9.4 Grand totals (base)

- Loops: **25**
- Stems: **12**
- Record tracks: **96**
- Jingles: **2**
- Arrangements (code): **3**
- Shared noise assets: **9**
- Total new audio files: **144**

### 9.5 Sensitivity

- If the two unique records (`s4_disco`, `s4_taniec`) are easter eggs: record tracks 92; total **140**.
- If every feature screen gets its own loop (+15): loops 40; total **159**.
- If records use the D2 pool (5 shared OGG): record tracks 0 new (5 existing files reused); total 144 - 96 + 0 = **48** (loops 25, stems 12, jingles 2, noise 9). Note: 25 + 12 + 2 + 9 = 48.

### 9.6 What exists already (reuse)

- 5 OGG music files (7 min 36 s) and 10 WAV SFX (purr is the only loop).
- 5 Home music tracks cover: coloring (calm), minigames (games_1, games_2, games_boss), result screen (menu).
- ZzFX synth: 5 cues in `sound.js`, plus fanfare SFX for shop, coloring and new minigame high score.
- Record art: 24 sets x 5 states, 24 sleeves, frames, FX.
- Player art: 12 PNG (6 players, off and on).

### 9.7 Phased list

Phase 0, v1 gift (what is IMPLEMENTED today):
- New music files needed: **0**. Use the 5 OGG and 10 WAV that exist.
- Code and content fixes before the gift (not tracks): (a) a music toggle and volume in Settings, since none is reachable (D-15); (b) stop minigame music on dialog close (D-14); (c) fix the sound licence and file names, and the Pixabay vs CC0/CC-BY conflict (D-10); (d) settle quiet hours (D-09) and the Nyan dead code (D-16).
- Decision for the owner: whether the 10 WAV SFX with a Pixabay licence stay in the gift.

Phase 1, rooms and outdoor places (uses the existing Home player `music.js`):
- 15 loops: rooms 10, garden 2, park 1, farm 1, market 1.
- Needs a room or place to track map (not in code). Needs the owner to choose which rooms get music (the repo does not say).

Phase 2, desktop ambient (4 loops):
- Needs a desktop playback path for OGG. Cuy uses NAudio 1.8.4 with WAV (`SoundManager.cs`); no OGG decoder is referenced in `Cuy.csproj`. Decide: WAV or MP3 for desktop, or add a decoder (new dependency, needs owner approval under AGENTS.md).
- Needs a time-of-day rule: which boundaries (D-12).
- Weather layers (6) need the weather service, which does not exist (section 1.1). Blocked by the no-network rule unless the owner consents.

Phase 3, records and players (96 record tracks, 6 players):
- Status PLANNED. Needs the owner decisions D-01, D-02, D-03.
- Needs the save fields for owned records and player state (`PLAN_FALE_WDROZENIE.md` A1), the shelf and album UI (A3), the mini-player (A4), world players (A5), prices (A6). None of these exist in code.
- Needs `world_items.json` entries for the 6 players (NOT FOUND, PLANNED).
- 96 tracks is the largest block. If the D2 pool (5 OGG) is kept, this phase needs 0 new tracks.

Phase 4, minigame stems and menu (12 stems + 1 menu loop):
- Needs a stem mixer (none in code) and a select-screen music hook (none). Each game currently uses whole tracks.

Phase 5, jingles and leitmotif (2 jingles, 1 composition, 3 arrangements):
- Birthday jingle: hook exists (E02, `BrainController.cs:90`), no party track exists (D-18).
- Record reveal jingle: needs the record feature (Phase 3).
- Leitmotif: NOT FOUND in repo; needs the owner decision and a code hook per life stage (`LifeStage.cs`).

Later, out of scope for v1: seasons (NOT FOUND); record trade; music per pig.

---

## Totals

```text
Totals (music inventory, repo 2026-11-05)
Repo now: OGG music 5 (7 min 36 s), WAV SFX 10 (purr loops), records 24 (tracks 0), players 6 (art only)
Plan base: loops 25 | stems 12 | record tracks 96 | jingles 2 | arrangements 3 (code) | noise 9
Total new audio files: 144 (= 25 + 12 + 96 + 2 + 9)
Sensitivity: unique records as easter eggs -> 140; +15 Home screen loops -> 159; records on D2 pool of 5 -> 48
Gift v1 (implemented today): 0 new files; reuse 5 OGG + 10 WAV
Discrepancies: records 36 vs 24 (D-01); tracks 0 vs D2 pool of 5 (D-02); wear 5 states vs 3 (D-03)
Gaps: no music toggle or volume in UI; no record or player code; no seasons, party or leitmotif track
```
