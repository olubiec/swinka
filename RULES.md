# Rules for agents (Cuy)

Valid from step V1b. Until V1b is done, ZASADY.md applies.

- Cuy is a pixel-art guinea pig desktop pet for Windows, built on eSheep (MIT). Read PLAN.md for the plan; prompts in PLAN.md are for the human, do only the current task.
- PLAN.md is written in Polish and older prompts use old Polish names. Map them with the table below.
- Parallel work: change only your task's files; keep shared files (GameState, Brain, Program, bridge.js) changes minimal and list them in the report; commit only when told.
- App: C# WinForms, .NET Framework 4.8, `src/Cuy` (Cuy.sln at the root). Game logic: `src/Cuy.Core`, .NET Standard 2.0, no WinForms or Win32. Tests: `tests/Cuy.Core.Tests`.
- Home window: HTML/JS in `web/home` inside WebView2 (virtual host https://cuy.home/). Minigames: Phaser 3 in `web/home/minigames/<game>/`.
- Art, sounds and data live in `assets/`. Do not draw new art; report what is missing. Pixel art is scaled with nearest neighbour only.
- Currency: clovers. Save: `%AppData%\Cuy\save.json` + `save.bak`, with a version field and migrations. Logs: `%LocalAppData%\Cuy\logs`.
- All code, comments, UI texts and docs are in English. UI strings live in `Strings.cs` and `web/home/strings.js`.
- The clock has a speed multiplier (60x in Debug only). Dev tools (F9 overlay, Diagnostics, DevTools) exist in Debug builds only.
- Do not guess APIs; check docs or the code. Do not remove features without being asked.
- After each task: report what changed, how you tested it, and what the human should check.

## Layout

| Path | Contents |
| --- | --- |
| `src/Cuy` | Desktop app (pet window, tray, Home window host, managers) |
| `src/Cuy.Core` | Needs, Brain (utility AI), GameState, SaveSystem, clock |
| `tests/Cuy.Core.Tests` | xUnit tests |
| `tools/Cuy.Simulator` | Console simulation of many days |
| `tools/build_pet_xml.py` | Builds the desktop animations.xml from a sprite sheet |
| `tools/art` | Python pixel-art generator (pig.py, anims*.py, props.py, export.py, english_assets.py) |
| `web/home` | Home window page; `web/home/minigames` minigames |
| `assets/sprites/<variant>/` | `spritesheet.png` (64 px frames), `spritesheet_x2.png` (128 px), `animations.json`, `animations_x2.json` |
| `assets/icons/` | `icons_16.png` + `icons.json`, `pig_head.ico` (tray) |
| `assets/app-icon/` | `cuy.ico`, `icon_16/32/256.png`, `logo_256.png` |
| `assets/sounds/` | `wheek_1-3`, `purr`, `chirp`, `fear_squeal`, `angry_squeal`, `crunch_1-2`, `pop` (.wav) |
| `assets/data/` | `actions.json`, `items.json`, `simulation.json` |

## Old Polish names → new names

| Old | New |
| --- | --- |
| Świnka (app), DesktopPet, SwinkaCore | Cuy, Cuy.Core |
| swinka/ | assets/ |
| swinka/dorosla, maluch, senior, legenda | assets/sprites/adult, baby, senior, legend |
| towarzysz_czarno-biala, towarzysz_agouti, towarzysz_kremowa | companion_black_white, companion_agouti, companion_cream |
| swinka_spritesheet.png, swinka_animacje.json | spritesheet.png, animations.json |
| swinka/ikony/ikony_16.png, ikony.json, glowa_swinki.ico | assets/icons/icons_16.png, icons.json, pig_head.ico |
| swinka/ikona/swinka.ico | assets/app-icon/cuy.ico |
| swinka/dzwieki/kwik_N, mruczenie, cwierkanie, pisk_strachu, pisk_zlosci, chrupanie_N | assets/sounds/wheek_N, purr, chirp, fear_squeal, angry_squeal, crunch_N |
| swinka/dane/symulacja.json | assets/data/simulation.json |
| domek/, minigry/ | web/home/, web/home/minigames/ |
| narzedzia/ | tools/art/ |
| Domek, sklepik, album, pamiętnik | Home, shop, album, diary |
| koniczynki, bobek, więź, paśnik | clovers, poop, bond, hay rack |
| maluch, młodzik, dorosła, senior, legenda | baby, junior, adult, senior, legend |
| najedzenie, witamina_c, energia, humor, czystosc, zabki | fullness, vitamin_c, energy, mood, cleanliness, teeth |

## Data keys (assets/data)

| Old key | New key | Old key | New key |
| --- | --- | --- | --- |
| potrzeby | needs | spadek_na_godzine | decay_per_hour |
| czynnosci | actions | zdarzenia | events |
| animacja | animation | czas_s | duration_s |
| efekty | effects | warunki / warunek | conditions / condition |
| waga_bazowa | base_weight | limit_dzienny | daily_limit |
| limit_na_godzine | hourly_limit | mnoznik_etapu | stage_multiplier |
| mnoznik_pory | time_multiplier | mnoznik | multiplier |
| zaspokaja | satisfies | zuzywa | consumes |
| siano_w_pasniku(_min) | hay_in_rack(_min) | przedmiot / przedmioty | item / items |
| wejscie / wyjscie | enter / exit | ruch | moves |
| sygnal | signal | dystans_px | distance_px |
| budzet_dnia | day_budget | procent_czasu | time_share_percent |
| pory | times_of_day | aktywnosc / drzemki | activity / naps |
| rzadkie_na_dobe | rare_per_day | wybor | selection |
| waluta | currency | nazwa / opis | name / description |
| cena | price | kategoria | category |
| ikona | icon | bez_limitu | unlimited |
| uzycia | uses | trwale | permanent |
| nagroda_koniczynki | reward_clovers | etap_min | stage_min |
| co_minut | every_minutes | potem | then |
| <need>_min / <need>_max | e.g. mood_min, energy_max | zdrowie_max | health_max |
| temperatura_min/max | temperature_min/max | wiez | bond |

Ids follow the same rule (papryka → bell_pepper, natka → parsley, ogorek → cucumber, granulat → pellets, gryzak → chew_stick, pilka → ball, tunel → tunnel, domek → house, poidlo → water_bottle, tort → cake, jarmuz → kale, siano → hay; actions: odpoczynek → rest, weszenie → sniffing, spacer → walk, jedzenie_siana → eat_hay, picie → drink, drzemka → nap, sen → sleep, sen_w_domku → sleep_in_house, kwiczenie → wheeking, proszenie → begging). The full list is in tools/art/english_assets.py.
