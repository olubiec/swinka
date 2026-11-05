# Cuy music style guide

Status: v2, the owner's style guide (draft v1) fitted to the real repo. Counts come from `docs/MUSIC_INVENTORY.md` (Totals block, 2026-11-05). Everything marked **(proposal)** is a creative or design choice of this guide, not a repo fact. Everything marked **(owner)** needs a decision. Repo facts carry a file reference.

All music is original and generated as code (section 12). Nothing here asks anyone to copy an existing song.

What changed against draft v1 (details in section 16):
- No Popcorn minigame exists: 4 minigames, not 5.
- The 6 players are the real 6 (turntable, suitcase, gramophone, cassette, boombox, jukebox), not the draft's generic types.
- Records use the real 24 titles and the 4 real series, with the genre chosen per title.
- Wear is a fixed trait of a copy (no repair), so there is no "cleaner after repair" rule.
- Rooms: exactly 10 (4 shared, 5 named-pig rooms, 1 default pig room). The room count is confirmed.
- Desktop music needs a playback path that the repo does not have today (section 2.2).
- Weather is inactive in the game and has no "hot" value, so weather layers are reserved.
- Room stems are dropped from v1. Only minigames have stems (the 12 in the inventory).

---

## 1. Sound identity

One sentence: **warm pixel music for a cosy pet game: a chiptune palette played gently, with jazz and lo-fi colour.**

- Reference feel: short loops built on a recurring motif. Own palette, own melodies.
- Palette: pulse 25% and 12.5% (lead, plucks), triangle (bass, pads), soft filtered noise (brushes, rain, wind, hats), optional sine bell (celesta, music box). No sawtooth leads, no harsh 50% square above 2 kHz, no vocals, no samples of real instruments. Exception: records of the Retro series may use pulse 50% and a noise kit (10.3).
- Harmony: major, pentatonic and Mixolydian for happy places. Dorian and natural minor only for night, dreamy and spooky material. Jazz colour: added 7ths and 9ths, ii-V-I turnarounds, swing 8ths (62-66%).
- Rhythm: beds have no drum kit (at most brushes and a soft bass). Minigames and some records use a full chiptune kit (noise snare, triangle kick).
- Mood words for every track: warm, small, tidy, playful. Avoid: aggressive, epic, dark, dramatic, loud.
- Pixel feel: slight bit-reduction on percussion only (8-bit noise), never on the whole mix (except cracked records).
- Visual match: the world style is "a bit lofi, vintage little house" (`docs/STYL_SWIATA.md:6`), with "gramophone and cassette (lofi)" as a motif (`:93`). The music follows that.

---

## 2. Global behaviour rules and how the repo plays audio today

### 2.1 Rules (apply to every track)

1. Default music volume 0.6 of master, stored in `assets/data/music.json`. Today `CuyMusic` starts at 0.35 (`web/home/music.js:20`) and Home SFX at 0.7 (`web/home/sound.js:22`). The 0.6 replaces 0.35 once the mix is balanced (**owner** can keep 0.35).
2. User toggle and volume slider for music must exist in Settings. Today they do not: `CuyMusic.setVolume` and `setEnabled` have no caller, and Settings has only "Sound volume" (`web/home/features/settings/feature.js:12-14`). This is Phase 0 (section 13).
3. Quiet hours 22:00-08:00: desktop music is off. This matches the desktop default (`src/Cuy/dotNet/SoundManager.cs:32`). The Core default is 22:00-07:00 (`src/Cuy.Core/Audio/SoundPolicy.cs`), so one of them must change (**owner**, D-09). Home and records, if the user starts them, may play at 0.4 volume. Home music has no quiet-hours check today (`music.js`), so this is new code.
4. Full-screen app or presentation in front: desktop music is muted (same rule as SFX: `SoundManager.cs:77`, `FullscreenDetector.cs`).
5. Never interrupt SFX: duck music by 4-6 dB for 400 ms around wheek, purr, crunch and pop. Today neither player has a duck call, and desktop SFX (NAudio) and Home SFX (ZzFX) are separate, so ducking is new code on both sides.
6. Desktop beds must be safe next to work: no sudden loud moments, no melody lead above -24 LUFS short-term, no percussion, loop length 2-4 minutes.
7. One music source at a time, highest priority wins, others fade out in 1.5 s. Priority: minigame > record playing > Home screen > place bed > desktop bed.
8. Dance-to-music (system loopback) must ignore the game's own audio. **It is not implemented** (D-07: `MusicDetector.cs` exists in Core but nothing in `src/Cuy` uses it; the event `music` in `assets/data/actions.json:622` has no raiser). The rule is a design constraint for when it is built. Own tracks trigger a dance through an explicit flag, never through loopback.
9. Every loop must be seamless: first and last sample at a zero crossing, reverb tails wrapped into the loop start.
10. All music numbers (volume, ducking, fades, wear levels, EQ presets) live in `assets/data/music.json`, not in code. The file does not exist yet.

### 2.2 The real playback paths (this decides what can be built)

| path | tech | what it can do today | limit that shapes the style |
| --- | --- | --- | --- |
| Home window | `window.CuyMusic`, one `HTMLAudioElement` per track, fade 400 ms (`web/home/music.js`) | OGG loops, volume, on/off, mute follows `Sound.isMuted`, pauses when hidden (`:255-266`) | one track at a time; no stems, no filters, no ducking |
| Minigames | `minigames-api.js` calls `CuyMusic` (start `games_1`/`games_2` alternating, `games_boss` at 15 s for Veggie Rain only, pause, resume, `menu` on result) | whole tracks | no stems; no stop on close (D-14); Hay Maze and Nyan have no `onTimeLeft`, so no boss track |
| Desktop pig | NAudio 1.8.4 `WaveOutEvent`, 10 WAV one-shots (`SoundManager.cs`, `Cuy.csproj:32`) | SFX, one looping WAV (purr) | **no music playback and no OGG decoder** |
| Host to Home bridge | `PostWebMessageAsJson`, `WebMessageReceived` (`src/Cuy/dotNet/HomeWindow.cs:372, 492`) | messages both ways | usable for priority hand-over (rule 7) |

Consequences for the style:
- Wear, player EQ, night filters, weather layers and stems all need **WebAudio** (biquad filters, detune LFO, buffer sources), so they are built in the Home window. `CuyMusic` must grow a WebAudio engine (one new file, per-feature file rule in `AGENTS.md`). `HTMLAudioElement` alone cannot do them.
- Records and players live in Home (players are items placed in house rooms, `PLAN_ODTWARZACZ.md`). So all record DSP is WebAudio. Good fit.
- Desktop beds need a new path. Options (**owner**): (a) add an OGG decoder to the desktop (new dependency, needs approval under `AGENTS.md`); (b) ship WAV beds (4 stereo 3-minute WAVs are about 120 MB, so mono 22 kHz, about 10 MB each); (c) play desktop beds only while Home is open, through `CuyMusic`. Draft recommendation: **(a)** with MIT-licensed NVorbis, in Phase 2. Until then the desktop pig has no music, and the 4 beds can run inside Home at a "desktop" priority (c).

---

## 3. Leitmotif: the Cuy theme

- One motif of 4-6 notes, one 8-bar composition (`theme_cuy`), the same in every key and tempo. Repo: not found, new work.
- Character: stepwise, rising first phrase, small leap on the last note, ends on the 3rd or 5th (friendly, not final).
- It appears: quoted in the first 2 bars of every A1 record track (24 tracks), as `home_main` and `home_welcome` (below), in the birthday jingle, in the stage jingle, and as a hidden 3-note tag at the end of minigame loops.
- Arrangements are code variations of the same notes (no new compositions, no new files). The repo has 5 life stages (`src/Cuy.Core/LifeStage.cs`: Baby, Junior, Adult, Senior, Legend), so the 3 arrangements map like this:
  - **Baby**: one octave higher, celesta and xylophone timbre, tempo +10%.
  - **Junior**: the adult base (no own arrangement). (proposal)
  - **Adult**: base version.
  - **Senior**: tempo -15%, triangle and warm pulse 25%, slower arpeggios.
  - **Legend**: adult version plus a golden layer: harp-like plucks (sine and fast decay) doubling the motif one octave up, and a soft pad on the 5th.
- Mechanism: `StageChanged` is raised (`Pet.cs:163`) and heard by `BrainController.cs:85` and `HomeWindow.cs:153`, so the stage is already available to Home. The arrangement is chosen at playback from the pig's current stage. With 2 active pigs, use the pig the Home view shows (**owner**).

---

## 4. Desktop beds (pet on the taskbar)

All four are instrumental, no drums, loop 2-4 min, 60-80 BPM, one lead voice at most, mostly pads and sparse plucks. They cannot play until the desktop path exists (section 2.2); see Phase 2.

The repo has 4 ambient periods in `assets/data/lights.json` (`ambient`: morning, day, evening, night). That file holds colour and level only, **no hour boundaries**. The activity bands in `actions.json` (`day_budget.times_of_day`: 7-9, 11-15, 17-21, 23-7) are a different set (D-12). The hours below are a **proposal**.

| id | period (lights.json) | hours (proposal) | style | key / feel | instruments |
| --- | --- | --- | --- | --- | --- |
| `bed_morning` | `morning` | 06:00-09:00 | bright ambient, birds | C or G major, airy | triangle pad, sine bells, soft pulse 12.5% plucks, bird noise chirps |
| `bed_day` | `day` | 09:00-17:00 | near silence, nap-friendly | F major, very sparse | long triangle pad, one pluck every 6-10 s, room tone |
| `bed_evening` | `evening` | 17:00-22:00 | lo-fi jazz | Bb major or G minor, swing 64% | electric-piano pulse 25% with vibrato, triangle walking bass, noise brushes, light vinyl crackle |
| `bed_night` | `night` | 22:00-06:00 | music box, almost silent | D Dorian, 50-60 BPM | sine music box, soft pad. Quiet hours (rule 3) cover it, so it plays only if the user allows desktop music at night |

Existing audio: `calm_loop.ogg` (266 s, "Exploring Town", CC0) already exists for coloring. Keep it in v1. It is a Home track, not a desktop bed.

Weather and mood are layers on top, not new tracks (section 8).

---

## 5. Home window

Home is where the player spends time actively, so it is slightly warmer and more rhythmic than the desktop. The repo has 23 Home views (16 feature screens, 3 onboarding screens, 4 modals; inventory section 1.2). Only coloring has music today (`coloring/feature.js:405`, track `calm`). To keep the loop budget at 25, Home reuses existing loops:

| id | screens | what plays | style | BPM | key | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `home_main` | pig view (needs, feed), pigs, rooms hub, more, achievements, daily, calendar, vet, store, tricks | **`theme_cuy` loop** (the leitmotif composition, counted once as loop 1) | warm bossa nova, soft brushes | 88-96 | A minor to C major | carries the leitmotif as its A section |
| `home_welcome` | intro, letter, welcome (H17-H19) | `theme_cuy` first 8 bars, played once, fades into `home_main` | simple hopeful solo melody | 80 | C major | no new file (code intro) |
| `home_coloring` | coloring | **existing `calm_loop.ogg`** | relaxed lo-fi | 78 | C major | exists, keep for v1 |
| `home_shop` | shop (optional) | the `place_market` loop | light swing, cash-register tag | 104-112 | F major | optional new loop (**owner**, +1 file) |
| `home_album` | sticker album, diary (optional) | music box and celesta | sentimental | 60-68 | G major | optional new loop (+1 file), the most "gift-like" piece |

Settings, letter view and other small screens: no change, the current track continues. The 2 optional loops are outside the base count (section 13).

The mini-player (record playback, `PLAN_FALE_WDROZENIE.md` Fala A) has no music of its own; it plays the record's tracks (section 10).

---

## 6. Places

The repo has these places (`assets/data/places.json`, `docs/WORLD.md`): 4 house rooms in `places.json` or `pig_rooms.json`, 5 named-pig rooms, 1 default pig room, garden, park, farm, market. The run (wybieg) is only planned (G6) and gets no music.

Each place has one bed loop. The night version is the same loop through a low-pass filter (1.8 kHz) at -6 dB, not a new track (WebAudio, section 2.2).

### 6.1 Outdoor places and market

| id | place | style | BPM | key | instruments / notes |
| --- | --- | --- | --- | --- | --- |
| `place_garden_day` | garden, morning and day (2 of its 4 backgrounds: `garden/feature.js:47, 95, 157`) | acoustic pastoral, banjo feel | 84-92 | G major | pulse 12.5% banjo plucks, triangle bass, bird noise |
| `place_garden_evening` | garden, evening and night (night = same loop, filtered) | slower, warmer, crickets | 66-72 | E Mixolydian | same palette, softer, cricket noise layer |
| `place_park` | park (needs garden) | easy folk waltz | 96 (3/4) | D major | pulse plucks, soft brushes, children-at-a-distance noise optional |
| `place_farm` | farm (24 plots) | country shuffle, light | 100 | A major | banjo plucks, triangle bass, slide-like pulse glides |
| `place_market` | market | busy swing, jingle accents | 112-120 | Bb major | brass-like pulse 25% stabs, walking bass, shop bell |

### 6.2 Rooms (10, confirmed from `places.json` and `pig_rooms.json`)

Mood words below come from `assets/data/pig_rooms.json` (`themes.<pig>.mood`). Style, BPM and key are a **proposal**. Comfort (0-100, `places.json` comfort cap 100) does not add stems in v1 (see 6.3).

| id | room | source | style | BPM | key |
| --- | --- | --- | --- | --- | --- |
| `place_room_salon` | Living room | `places.json` | cosy lo-fi, wood and warm lamp | 76 | F major |
| `place_room_bedroom` | Bedroom | `places.json` | slow lullaby, music box and pad | 60 | D Dorian |
| `place_room_playroom` | Playroom | `places.json` | playful music box and xylophone | 100 | C major |
| `place_room_dorm` | Shared bedroom (up to 6 residents) | `pig_rooms.json` dorm | soft ensemble lullaby, warmer than the bedroom | 64 | G major |
| `place_room_kuki` | Kuki ("calm meadow") | `themes.kuki` | pastoral, airy | 72 | G major |
| `place_room_ned` | Ned ("snack nook") | `themes.ned` | light swing, tidy pluck bass | 104 | Bb major |
| `place_room_james` | James ("safe hideout") | `themes.james` | near silent, music box, night palette | 56 | D Dorian |
| `place_room_glen` | Glen ("cosy reading corner") | `themes.glen` | jazz ballad, electric-piano pulse | 68 | Eb major |
| `place_room_racuch` | Racuch ("play corner") | `themes.racuch` | playful, hopping plucks | 108 | C major |
| `place_room_default` | pig room of the random adoptee (3 default themes, no mood word) | `default_themes` | warm and neutral, one loop for all three | 80 | A major |

Notes:
- The random adoptee has no own mood, and `pigs.json` allows at most 1 random pig, so one default loop serves it.
- Personal rooms only exist for pigs the player has (max roster 6), but all 10 loops are produced up front.
- A room loop plays only while that room is open in Home. The loops share one instrument family with the leitmotif, so a walk through the house stays coherent.

### 6.3 Loop budget check (total must stay 25)

leitmotif and `home_main` 1 + desktop 4 + rooms 10 + garden 2 + park 1 + farm 1 + market 1 + minigames 4 + minigame menu 1 = **25**. This equals the inventory formula (`MUSIC_INVENTORY.md` section 9.2). The draft's "6 rooms" and "Home 4 loops" are replaced by the real counts. Room stems would add 30 files, so v1 uses code only: comfort opens a low-pass (low comfort = darker) and raises the pad volume (proposal). Stems for rooms are a later option.

---

## 7. Minigames

Lively, 120-150 BPM, full chiptune kit allowed, short loops built around a mini-motif that ends with the 3-note Cuy tag. Each game has one loop split into **3 stems** (base, rhythm, lead) that enter as intensity rises. Plus one menu loop. The repo has 4 games in `web/home/minigames/games.json`: Veggie Rain, Nyan Cuy, Veggie Memory, Hay Maze.

| id | game | style | BPM | key | stems and intensity |
| --- | --- | --- | --- | --- | --- |
| `mg_veggie_rain` | Veggie Rain (60 s timer, `veggie-rain.js:30`) | bouncy chiptune, major | 132, +6 per level | C major | base: bass and pad. rhythm: noise hats and kick. lead: playful pulse melody. Last 15 s: the existing boss hook (`games_boss`) becomes "all 3 stems plus tempo +10" |
| `mg_hay_maze` | Hay Maze (60 s timer, `hay-maze.js:22`) | tense but cute, bass ostinato | 108, +10 in the last 15 s | A minor | base: ostinato. rhythm: ticking noise. lead: sparse melody. Needs a new `onTimeLeft` call (none today) |
| `mg_veggie_memory` | Veggie Memory (no timer) | calm music box, no pressure | 72 | F major | 3 gentle layers that grow with level, no tempo pressure |
| `mg_nyan_cuy` | Nyan Cuy | fast chiptune dance, **own** motif | 130-140 | E minor | 3 stems by score. Today it plays `games_1` through a shim (`nyan-cuy.js:42-52`); `nyan-audio.js` is not loaded (D-16). See section 14 |
| `mg_menu` | minigame select screen (today silent, `renderSelectScreen`) | short upbeat shuffle | 112 | G major | one loop, no stems. The result screen keeps the existing `menu` track (`minigames-api.js:540`) |

Draft's `mg_popcorn` is removed: there is no Popcorn minigame in the repo.

Mechanism (new): stems need synchronised buffer sources, i.e. the WebAudio engine from section 2.2 (3 `AudioBufferSourceNode`s started on the same clock). `HTMLAudioElement` cannot hold sample-accurate sync. Stop-on-close must be fixed first (D-14).

Result jingles: the existing SFX fanfare (`minigames-api.js:568`) stays. Win and lose jingles are not in the base budget (section 9).

---

## 8. Modifiers (change the sound without new tracks)

| modifier | repo fact | effect |
| --- | --- | --- |
| Life stage | 5 values (`LifeStage.cs`) | leitmotif arrangement (section 3); Home and beds use the stage arrangement as a thin layer |
| Time of day | 4 ambient periods (`lights.json`) | selects the desktop bed; garden and rooms get the night filter |
| Weather | enum Clear, Cloudy, Fog, Rain, Snow, Storm; model only, **no fetch service** (`Weather/WeatherInfo.cs`); it is a network feature that needs owner consent (`docs/PLAN.md:174`) | **reserved, not produced until weather is active.** Mapping prepared: Rain and Storm = rain layer (Storm adds wind and -2 dB lead); Fog = wind low and low-pass 3 kHz; Clear daytime = bird layer; Snow = low-pass 3 kHz, tempo x0.92; Cloudy = none. The draft's "heat" has no enum value, so it is dropped |
| Mood or needs low | `NeedLow` at 35, `NeedCritical` at 15 (`Balance.cs`, `Pet.cs:191, 201`) | lead voice drops out, only the pad remains; very low = music fades to room tone |
| Sleep (idle) | actions `sleep`, `nap`, `sleep_in_house`; offline counts as sleep | music fades out over 20 s |
| Comfort of a room | 0-100 (`places.json`) | low-pass opening and pad level (section 6.3), no stems |
| Mood 85 or more | `dancing` action, 4 s (`actions.json`, `Brain.cs:752-757`) | no music change |
| Season | not found in the repo (`WORLD.md:278` is only a question) | reserved, do not produce |

---

## 9. Jingles

Base budget: **2 jingles** (inventory). The draft proposed birthday and stage change. The inventory proposed birthday and record reveal. Decision of this guide (**proposal**): birthday and stage change, because both events already exist and have listeners.

1. `jingle_birthday` (4-6 s): leitmotif in major, glockenspiel, party horn pulse, ends on a held 5th. Hook: `Birthday` raised at `Pet.cs:177`, heard by `BrainController.cs:90` and `HomeWindow.cs:154`. Today the birthday has only the party animation (`actions.json:628`), and `ARCHITECTURE.md:162` promises "party music" (D-18).
2. `jingle_stage` (3-5 s): short ascending arpeggio plus the leitmotif tag; legend gets the golden layer. Hook: `StageChanged` (`Pet.cs:163`).

Later (not in the base budget): record reveal (planned, `PLAN_ODTWARZACZ.md:82`, needs the record feature), level up (`Pet.Bond.cs:81`), daily reward (`Pet.Economy.cs:90`), purchase, new album sticker, minigame win and lose, place or room unlocked (`Pet.World.cs:100, 120, 143`). Several of these events have no desktop listener yet.

Rules: 2-6 s, bright, never longer than 6 s, 4 dB louder than beds but below SFX peaks, one pulse voice plus bell.

---

## 10. Records (24 records, 4 series of 6)

Source: `assets/records/manifest.json` (version 3). Rarity: common 17, rare 5, unique 2. Nothing in the game reads the manifest or `players_design.json` yet (inventory 2.1), so everything here is design for the record feature (`PLAN_FALE_WDROZENIE.md` Fala A).

### 10.1 Structure

- 24 records, each with 4 tracks: **A1, A2, B1, B2**, 1:30-2:00 each, id `rec_<recordId>_a1` etc. That is 96 tracks. `tracks` is `0` on every record today, so this must be filled in.
- D-02 stays open (**owner**): 4 tracks per record (this guide) or the shared pool of 5 OGG (`PLAN_FALE_WDROZENIE.md:9`, track = hash(id) mod 5). With the pool, the 96 files drop to 0 new files and the style per record in 10.2 cannot be heard.
- Roles: **A1** signature track (quotes the Cuy motif in bars 1-2), **A2** calmer variant, **B1** energetic, **B2** short and atmospheric.
- A record is a collectible: sleeve, series, condition and sound belong together.

### 10.2 The 24 real records and their style (proposal)

Genres follow each record's title. BPM and key are starting points within the genre band.

Series 1, **Siano & lofi** (warm, indoor; sleeves `s1_*`):

| id | title | rarity | genre | BPM | key |
| --- | --- | --- | --- | --- | --- |
| `s1_poranek` | Poranek w sianie | common | lo-fi hip-hop, birds (this is the starter record, `players_design.json` `economy_draft.start`) | 78 | C major |
| `s1_marchewka` | Marchewkowy beat | common | lo-fi hip-hop, plucky bass | 84 | G major |
| `s1_deszcz` | Deszcz na dachu | common | jazz ballad with rain layer | 66 | Eb major |
| `s1_kubek` | Kubek z parą | common | bossa nova | 92 | F major |
| `s1_nocna` | Nocna ścieżka | **rare** | swing, night, walking bass | 122 | D Dorian |
| `s1_cichy` | Cichy kąt | common | music-box lullaby | 60 | C major |

Series 2, **Ogród** (outdoor, acoustic):

| id | title | rarity | genre | BPM | key |
| --- | --- | --- | --- | --- | --- |
| `s2_rosa` | Rosa | common | pastoral | 72 | G major |
| `s2_pietruszka` | Pietruszka funk | common | funk, tight pulse bass | 100 | E minor |
| `s2_pszczoly` | Pszczoły | **rare** | banjo, buzzing sine drone | 112 | A major |
| `s2_wiatr` | Wiatr w trawie | common | field ambient | 58 | D major |
| `s2_dynia` | Dynia | common | polka | 118 | F major |
| `s2_jablka` | Zimowe jabłka | common | folk waltz (3/4), minor | 90 | A minor |

Series 3, **Nocne zabawy** (strange, floating):

| id | title | rarity | genre | BPM | key |
| --- | --- | --- | --- | --- | --- |
| `s3_ksiezyc` | Księżyc | common | space ambient | 52 | Lydian on F |
| `s3_swietliki` | Świetliki | **rare** | dream pop, twinkling bells | 90 | A major |
| `s3_sowa` | Sowa | common | spooky lullaby | 60 | D minor |
| `s3_kolysanka` | Kołysanka | common | toy orchestra lullaby | 100 | C major |
| `s3_tupot` | Cichy tupot | common | glitch, tiptoe plucks | 110 | G Dorian |
| `s3_sen` | Sen o sianie | common | tape-style ambient | 55 | F major |

Series 4, **Retro 70-90** (arcade, dance):

| id | title | rarity | genre | BPM | key |
| --- | --- | --- | --- | --- | --- |
| `s4_disco` | Disco gryzoń | **unique** | disco | 120 | A minor |
| `s4_synth` | Synth fala | **rare** | synthwave | 105 | E minor |
| `s4_kaseta` | Kaseta mixtape | **rare** | funk, tape wobble baked into the sound | 100 | D minor |
| `s4_radio` | Radio FM | common | pop-radio chiptune ballad | 96 | C major |
| `s4_arcade` | Arcade | common | chiptune dance | 135 | G major |
| `s4_taniec` | Taniec w klatce | **unique** | fast dance, **own** motif (not Nyan Cat, section 14) | 130 | C minor |

The series names in the draft (Home, Nature, Lively, Dreamy) are replaced by the real ones. Bands for genres: lo-fi 70-90, bossa 90-100, swing 120-140, waltz 90 (3/4), reggae 70-78, ska 150, funk 100, disco 118-122, synthwave 100-110, chiptune dance 130-140, ambient 50-65, dream pop 90, glitch 110, spooky 60.

Rarity does not change the number of tracks (always 4). Rare and unique records get a fuller arrangement (one more voice, a longer A1), same files count.

### 10.3 Sleeve to sound

The sleeve decides colour of the sound. The repo has the 24 sleeves (`assets/records/sleeve/`, 24x24 px), frame files per rarity and 5 wear PNGs per record. A reliable automatic colour read of a 24x24 pixel sleeve was tried and fails (the cream background dominates), so the main colour and motif of each sleeve must be written by hand into `docs/MUSIC_MAP.md` after looking at the PNGs (**owner or visual pass**). Rules for that map:

| sleeve feature | musical effect |
| --- | --- |
| warm main colour (red, orange, yellow, pink) | major or Mixolydian |
| cool main colour (blue, green, purple) | Dorian, natural minor or Lydian |
| neutral or grey | modal ambiguity, sus chords |
| vegetable or food motif | plucked timbre (pulse 12.5%, banjo-like) |
| animal motif | triangle lead, softer attack |
| star, moon, space motif | bell and pad timbres, long reverb |
| machine or retro motif | pulse 50% plus noise kit |
| bright (high lightness) | tempo at the top of the genre band |
| dark (low lightness) | tempo at the bottom of the genre band |

The key and tempo in 10.2 are the default until the map overrides them.

### 10.4 Wear states (match the five sleeve art states)

The repo has 5 states per record: mint, worn, scratched, cracked, warped (`manifest.json` `states`; badges `badge_wear_*` in `assets/ui/`). Wear is a **fixed trait of each copy**, not something that grows from playing, and **repair is off** (`PLAN_ODTWARZACZ.md:66`: "Uszkodzenie jest stałą cechą płyty ... Naprawa odpada"). The draft's "sounds cleaner after repair or cleaning" is therefore removed. Note that line 31 of the same file and the shop tab "Naprawa" (line 47) still mention repair, so this must be cleaned up in the plan (**owner**, D-20).

Wear is applied at playback from the copy's `condition` (WebAudio, section 2.2). A copy without a stored condition is mint. The values live in `assets/data/music.json`:

| state | crackle | wow/flutter | low-pass | other |
| --- | --- | --- | --- | --- |
| mint | none | none | none | clean |
| worn | -30 dB | +/-0.3% at 0.5 Hz | 9 kHz | slight warmth |
| scratched | -24 dB | +/-0.6% | 7 kHz | skip every 40-90 s: repeats the last 0.5 s once or twice |
| warped | -28 dB | +/-2.5% at 0.3 Hz (slow drifting pitch) | 5 kHz | muffled, slightly detuned |
| cracked | -20 dB | +/-1.0% | 4 kHz | 8-bit crush at 12 kHz, 1-2 s stutter loop every 20-45 s, dropouts 150-300 ms |

`players_design.json` `economy_draft` asks whether damaged records get a "unique crackle" as a collectible plus; this guide answers yes by the table above. Shared audio assets for wear: 1 vinyl crackle loop and 3 needle sounds (drop, lift, skip). Scratch is a separate sound for the turntable (`PRZEKAZANIE_ODTWARZACZE.md`). No wear-specific music.

### 10.5 Players (6, real)

The player changes the sound of the same record with an EQ preset, not new files. Names, ranges and dance styles are from `assets/records/players_design.json`. The draft's "table radio" and "hi-fi turntable" are not in the repo and are removed.

| player id | name | price hint | range (cells) | mood bonus | dance style | EQ and character (proposal) |
| --- | --- | --- | --- | --- | --- | --- |
| `player_turntable` | Wooden turntable (start) | 0 | 5 | 1.0 | sway | warm, full range with a gentle roll-off above 12 kHz, vinyl crackle, scratch |
| `player_portable` | Suitcase record player | 120 | 4 | 0.8 | sway | 400-6000 Hz, mono, thin bass, radio filter, quieter |
| `player_gramophone` | Horn gramophone | 300 | 5 | 1.0 | spin | band-pass 300-3500 Hz, mono, warm mid peak, slight saturation, slow start |
| `player_cassette` | Cassette deck | 450 | 5 | 1.1 | popcorn | low-pass 10 kHz, tape wobble +/-0.2%, hiss at -40 dB |
| `player_boombox` | Boombox | 700 | 7 | 1.3 | popcorn | bass boost, louder, EQ pulses with the beat, light |
| `player_jukebox` | Jukebox | 1200 | 8 | 1.5 | all | warm low boost, 80-8000 Hz, stereo, record queue, light |

Prices are "DO DOPRACOWANIA" and conflict with `PLAN_FALE_WDROZENIE.md:79` (120/250/400/600/900/1400, D-06); music does not depend on them. Players are not in `assets/data/world_items.json` yet.

### 10.6 Record behaviour

- Playing a record stops other beds (priority rule 7) and triggers a dance. The dance is the **player's** `dance_style` from `players_design.json` (sway, spin, popcorn). The jukebox ("all") picks by series: Siano & lofi = sway, Ogród = popcorn, Nocne zabawy = slow spin, Retro 70-90 = the existing `dance` animation. The draft's "dance by series" rule is kept only for the jukebox. Reggae (none of the 24 titles) would use the `rumble` animation, so that line is dropped.
- Existing pig animations to reuse: `dance` (`canvas-pig.js:32`), `popcorn`, `rumble` (`actions.json:119, 387`). There is no dedicated sway or spin row in the data checked; if none exists, sway and spin map to `dance` at a slower speed (**owner or visual pass**).
- Skips and crackle never touch the pig's animation timing.
- Starter content: the player starts with the turntable and `s1_poranek` mint (`players_design.json` `economy_draft.start`). Other records come from the shop (rotating offer), gifts, badges and seasonal events (the two unique records). Whether series 2-4 are locked at the start is **owner** (open decision 5).
- Mood bonus: a daily cap is an open question (`economy_draft.open_questions`) so music cannot replace care. Not a music-style rule.
- `MUSIC_AUDIO=false` fallback exists in the plan (`PLAN_FALE_WDROZENIE.md:62`); keep it, CI has no audio (`:66`).

---

## 11. Asset specification and naming

- Format: OGG Vorbis quality 5-6, 44.1 kHz, stereo (mono for jingles and SFX), loops with zero-crossing edges. The existing 5 OGG are 75-352 kbps, so there is no single standard today.
- Loudness: beds -20 LUFS integrated, Home -18, minigames -16, records -16, jingles -14, true peak -1 dBTP. A check script is new work (section 12).
- Folders: `assets/music/beds/`, `assets/music/home/`, `assets/music/places/`, `assets/music/minigames/`, `assets/music/records/<series>/`, `assets/music/jingles/`, `assets/music/noise/`. The existing 5 files stay in `assets/music/` with `tracks.json` (`SelfTest.cs:470-482` checks them at start-up, so the new folders must be added there, not break it).
- Names: `bed_morning.ogg`, `place_garden_day.ogg`, `place_room_kuki.ogg`, `mg_veggie_rain_base.ogg`, `mg_veggie_rain_rhythm.ogg`, `mg_veggie_rain_lead.ogg`, `rec_s1_poranek_a1.ogg`, `jingle_birthday.ogg`, `theme_cuy.ogg`.
- Noise layers (9): vinyl crackle loop, needle drop, needle lift, needle skip, rain, wind, bird chirps, crickets, room tone. This equals the inventory's 6 weather layers plus 3 record sounds in count (9); the list is regrouped so that every layer has a use: crickets serve `place_garden_evening`, room tone serves the "needs very low" fade, and the rest serve weather and wear.
- Data: add `assets/data/music.json` (tracks, volumes, ducking, wear table, EQ presets, hours). Records in `assets/records/` manifest get `tracks` filled, a `style_id` and an optional `condition` default (new fields, the manifest is currently read by no code).

---

## 12. How the music is made (generated as code)

- Claude cannot render audio directly, so each track is a script: tempo, key, chord progression, motif, instrument recipe and a random seed, rendered by a small synth (Python to WAV, then OGG). Alternative for in-game rendering: WebAudio, which can also run the stems. No third-party tool is added without approval.
- One spec file per track (`tools/music/specs/<id>.json`): `bpm`, `key`, `mode`, `chords`, `motif_ref`, `instruments`, `length_bars`, `loop`, `seed`. The renderer is shared, the specs are the creative layer. 144 specs in the base plan.
- Wear and player filters are runtime DSP (WebAudio: biquad filters, detune LFO, noise buffer, scheduled skips).
- Every track is checked: loop seam test, loudness test, peak test, length test. Add these to `tools/qa/`.
- The generated music must stay free of existing-song copying; the leitmotif and every motif are original.

---

## 13. Production plan and counts

Counts from the inventory Totals: loops 25, stems 12, record tracks 96, jingles 2, arrangements 3, noise 9 = **144 new audio files** (arrangements are code variations, not files).

| phase | content | files | needs |
| --- | --- | --- | --- |
| 0 (gift v1) | reuse the 5 OGG and 10 WAV. Add a music toggle and volume slider to Settings; stop minigame music on close (D-14); fix `assets/LICENSES/sounds.md` (D-10, Pixabay and file names); settle quiet hours (D-09) | 0 | small JS and data work, owner decisions |
| 1 | leitmotif `theme_cuy` (also `home_main`) 1, desktop beds 4, jingles 2, noise 9 | 16 | the beds cannot play before Phase 2 or the Home option (2.2) |
| 2 | rooms 10, garden 2, park 1, farm 1, market 1 | 15 | WebAudio engine in Home, room to track map in `music.json`; desktop OGG path (**owner**) |
| 3 | minigames: 4 loops, 12 stems, 1 menu loop | 17 | stem mixer, select-screen music hook, stop on close |
| 4 | records, series by series: 24 tracks per series | 96 (24 per series) | owner decisions D-01, D-02, D-03; the whole record feature (save fields, shelf, mini-player, world players, economy) which does not exist yet |

Optional, outside the 144: `home_shop` and `home_album` (+2); all other Home screens (up to +15, inventory sensitivity 159).

Sensitivity (from the inventory): if the two unique records are easter eggs, record tracks are 92 and the total 140. If records use the pool of 5, the total is 48.

Because records are the largest block and depend on a feature that is not built, release one series per update and start Phase 4 only after the record feature ships. Phases 1-3 are independent of records.

---

## 14. Legal and sources

- Third-party audio: only CC0 or CC-BY with attribution in `assets/LICENSES/` (`AGENTS.md`). Generated music is original.
- `assets/LICENSES/sounds.md` lists Pixabay sources and file names that do not match `assets/sounds` (only `pop.wav` matches). Pixabay is neither CC0 nor CC-BY. This must be fixed before any public release (D-10). The 5 OGG are CC0 and consistent (`assets/LICENSES/music.md`).
- Nyan Cat melody is protected. A private gift is low risk. If the game is ever shared, replace the Nyan Cuy music and keep `s4_taniec` on an original motif. Today `nyan-audio.js` (a Nyan-style 135 BPM synth) is dead code (D-16): do not load it, and use the planned original `mg_nyan_cuy` instead.
- No melody, lyric or arrangement is copied from Undertale or any other game.

---

## 15. Open decisions (owner)

1. D-01: 36 or 24 records. The manifest and the decision say 24 (`PLAN_ODTWARZACZ.md:65`); older lines say 36. This guide uses 24.
2. D-02: 4 tracks per record (96) or the shared pool of 5 (`PLAN_FALE_WDROZENIE.md:9`). This guide assumes 4.
3. D-03: 3 or 5 wear states. This guide uses 5 (the repo).
4. D-20: repair. `PLAN_ODTWARZACZ.md:66` says no repair; lines 31 and 47 still mention it. This guide assumes no repair.
5. Desktop music path: add an OGG decoder, ship WAV, or play desktop beds only through Home (2.2).
6. Quiet hours: 22:00-08:00 or 22:00-07:00 (D-09), and the hours of the 4 beds (section 4).
7. Whether to produce `home_shop` and `home_album` (+2 loops).
8. Which jingles: this guide uses birthday and stage change; the inventory used birthday and record reveal.
9. Whether series 2-4 are locked at the start.
10. Which pig sets the leitmotif arrangement when two pigs are active.
11. Weather: stay off, or opt in to network weather (`docs/PLAN.md:174`).
12. Music volume default: 0.6 (this guide) or 0.35 (repo).

---

## 16. Changes against draft v1 (for the owner)

| draft v1 | this version | reason (evidence) |
| --- | --- | --- |
| 5 minigames including Popcorn | 4 games plus a menu loop | `games.json` lists 4; no Popcorn file |
| Nyan Cuy keeps the existing synth | `mg_nyan_cuy` uses an original loop; synth is dead code | `nyan-audio.js` not loaded; D-16 |
| Home 4 loops | Home reuses `theme_cuy`, `calm`; 2 optional loops | loop budget stays 25 (inventory 9.2) |
| 6 rooms (confirm) | 10 rooms | `places.json`, `pig_rooms.json` |
| Room stems by comfort | code filter by comfort, no stems | stems would add 30 files; only minigames have stems in the inventory |
| Series Home, Nature, Lively, Dreamy | Siano & lofi, Ogród, Nocne zabawy, Retro 70-90 | `manifest.json` |
| Genres independent of titles | one genre per real title | `manifest.json` titles |
| 6 generic player types | the 6 real players | `players_design.json` |
| Dance by series | dance by player style; series only for the jukebox | `players_design.json` `dance_style` |
| Cleaner after repair | no repair, condition fixed per copy | `PLAN_ODTWARZACZ.md:66` |
| Weather: rain, heat, sun | reserved; mapping for the 6 real enum values | `WeatherInfo.cs`, no fetch service |
| Jingles: birthday, stage | same (the inventory had record reveal) | events exist with listeners |
| Desktop beds play | they cannot until a desktop path exists | `SoundManager.cs`, `Cuy.csproj:32` |
| Leitmotif arrangements baby, senior, legend, adult | same, plus Junior = adult | `LifeStage.cs` has 5 stages |
| "Home" screens quiet hours 0.4 | same, new code | `music.js` has no quiet-hours check |
