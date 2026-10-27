# Old Polish names → current English names

Reference for old notes and research files (the agent rules now live in `AGENTS.md`). Polish ids may appear in code only in the save migration `src/Cuy.Core/Save/SaveSystem.cs`.

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
