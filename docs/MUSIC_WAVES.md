# Cuy: muzyka, fale wykonania (plan równoległej pracy subagentów)

Status: plan wykonawczy do `docs/MUSIC_PLAN.md` (decyzje zamknięte) i `docs/MUSIC_TASKS.md` (zadania). Prompty do każdego z 60 zadań: `docs/music_prompts/` (generowane, indeks w `INDEX.md`). Nic z tego nie jest jeszcze wdrożone; start po komendzie właściciela.

Cel: wszystkie 144 pliki audio (140 twórczych + 4 `_full`) i kod odtwarzania, w falach, w których pakiety jednej fali **nie dotykają tych samych plików** i mogą iść równolegle.

---

> **Reguła stylu (od Single-layer v4, wiążąca także dla belek MW-4):** jeden instrument na utwór, pełne progresje z gotowych rodzin (`docs/music_progressions.md`), efekty (pogłos, taśma, chorus, szerokość stereo), bez wielowarstwowych "kolekcji" dźwięków. Wzór wzorcowy: `theme_cuy` (EP, `chords.rolled`, zob. `docs/music_review/MT-11.md`).
>
> **Legenda harmoniczna v7 (wiążąca dla akordów i progresji wszystkich utworów):** [`docs/music_legend.md`](music_legend.md): słownik akordów, techniki progresji, zasady voice-leadingu i tabela "utwór -> instrument, tempo, tonacja, progresja takt po takcie, FX, długość". Kod: `tools/music/theory.py`, `tools/music/legend_progs.py`.


## 1. Zasady równoległości

1. **Własność plików.** Pakiet zapisuje wyłącznie pliki ze swojej kolumny „Pliki własne”. Wspólne pliki (`assets/data/music.json`, `assets/LICENSES/music.md`, `docs/music_review/README.md`) są **generowane** skryptem po fali i nie są edytowane przez agentów.
2. **Jedno zadanie muzyczne = jedna specyfikacja** `tools/music/specs/<id>.json` (płyta: 4) + OGG + wiersz przeglądu `docs/music_review/MT-<n>.md`. Dzięki temu dwa pakiety nigdy nie piszą do tego samego pliku.
3. **Szkic specyfikacji nie jest pisany ręcznie.** `tools/music/catalog2spec.py` (PM-04) buduje z katalogu szkic: tempo, metrum, tonację, takty, akordy takt po takcie, nuty melodii ze szkieletu, siatki perkusji, listę warstw z dB i wejściami. Agent muzyczny uzupełnia tylko pola `pattern` (rytmy basu, akordów, ozdób) ze słownika wzorów z `CONTRACT.md` i słucha wyniku.
4. **Czytanie.** Agent czyta swój prompt, `docs/music_prompts/README.md` i `tools/music/CONTRACT.md`; reszty dokumentów nie czyta (oszczędność tokenów, zasada z `CLAUDE.md`).
5. **Praca w osobnych gałęziach/worktree** `music/<pakiet>`; merge przez lead w kolejności ID. Konflikty niemożliwe przy dyscyplinie z p. 1-2; jedyny wspólny plik to `INDEX.md`, który lead regeneruje.
6. **Bramki odsłuchu (G1-G4)** to ludzkie. Fala po bramce startuje dopiero po zatwierdzeniu. Brak zatwierdzenia = poprawka w pakiecie źródłowym (głosy, efekty, katalog), a nie obejście.
7. **Limit równoległości:** domyślnie 6 agentów na falę. Gdy budżet pozwala na więcej, fale MW-4…MW-7 można scalić (pakiety i tak mają rozłączne pliki), ale bramki G3 i G4 zostają.
8. **Fale kodu gry** (`IW-*`) idą równolegle z falami audio. Są realizowane przez narzędzie projektu (`docs/opt/packages.spec.json` + `python3 tools/opt/gen_packages.py`, `CLAUDE.md`): nie piszemy ręcznie `waves.yaml` ani promptów pakietów.

## 2. Mapa katalogów i własność

| Ścieżka | Właściciel | Uwagi |
| --- | --- | --- |
| `tools/music/spec.schema.json`, `validate_spec.py`, `CONTRACT.md` | PM-01 | kontrakt; po MW-0 tylko przez PM-01b (poprawki, jeśli zajdą) |
| `tools/music/voices.py` + `test_voices.py` | PM-02 | |
| `tools/music/fx.py` + `test_fx.py` | PM-03 | |
| `tools/music/theory.py`, `catalog_*.py`, `gen_prompts.py`, `catalog2spec.py`, `motif.py` | PM-04 | już istnieją: theory, katalogi, gen_prompts |
| `tools/music/build_manifest.py`, `tools/qa/music-audit.js`, `tools/music/review_sheet.py` | PM-05 | |
| `tools/music/finish.py` + `test_finish.py` | PM-06 | |
| `tools/music/sequencer.py`, `render.py` | PM-07 | |
| `tools/music/stems.py` | PM-08 | |
| `tools/music/noise/<id>.py` | PM-N1…N3 | po jednym pliku na szum |
| `tools/music/specs/<id>.json` | pakiet zadania | po jednym pliku na utwór |
| `assets/music/**` | pakiet zadania | OGG; katalogi: `home/`, `beds/`, `places/`, `minigames/`, `records/<id>/`, `jingles/`, `noise/` |
| `docs/music_review/MT-<n>.md` | pakiet zadania | po jednym pliku na zadanie |
| `assets/data/music.json`, `assets/LICENSES/music.md` | **generowane** (lead po fali) | `build_manifest.py` |
| `src/**`, `web/**`, `tests/**` | pakiety `IW-*` | rozdział 5 |

## 3. Kontrakty (wyjście MW-0, wszyscy na nich pracują)

`tools/music/CONTRACT.md` zawiera i zamraża:

- **Format audio:** `numpy.float32`, kształt `(2, n)`, 44 100 Hz, zakres ±1,0. Jingle mono = suma kanałów przy kodowaniu.
- **`voices.render(voice, midi, dur_s, vel, sr, rng) -> ndarray`**: jeden dźwięk; `voice` z palety (README promptów).
- **`fx.apply(chain, audio, sr) -> ndarray`**: `chain` = lista `{"fx": "REV-M", "wet": 0.16}` itd.
- **Zdarzenie nutowe:** `{t_beats, dur_beats, midi, vel, voice, layer}`; **zdarzenie perkusji:** `{t_steps, inst, vel}`.
- **`sequencer.build(spec) -> {layer: ndarray}`**: audio na warstwę (do stemów i dB).
- **`finish.finish(audio, spec) -> path`**: zawinięcie ogona, zerowe przejście, LUFS, limiter -1 dBTP, OGG.
- **Słownik wzorów** (`pattern`): `bass.root_fifth`, `bass.walking`, `bass.bossa`, `bass.octave8`, `bass.oom`, `bass.pedal2bars`, `chords.offbeat_2_4`, `chords.arp8`, `chords.bossa`, `chords.stab_i2_i4`, `chords.oompa`, `orn.every_n_bars(n, beat)`, `random.pentatonic_walk`, `noise.loop(file, db)`.
- **CLI:** `python3 tools/music/render.py <id>` (jeden utwór lub wszystkie jego pliki), `python3 tools/music/validate_spec.py [id…]`, `node tools/qa/music-audit.js [--only id…]`, `python3 tools/music/gen_prompts.py`.

---

## 4. Fale audio

Legenda kolumn: **MT** = zadanie z `MUSIC_TASKS.md`; **Odbiór** = komenda lub warunek, który agent uruchamia przed zgłoszeniem.

### MW-0: kontrakt (1 agent, sekwencyjnie)

| Pakiet | Zadanie | Pliki własne | Odbiór |
| --- | --- | --- | --- |
| PM-01 | MT-01: schemat specyfikacji, walidator, `CONTRACT.md`, 3 ręczne specyfikacje przykładowe | `spec.schema.json`, `validate_spec.py`, `CONTRACT.md`, `specs/_example_*.json` | `python3 tools/music/validate_spec.py` zielony dla 3 przykładów; `CONTRACT.md` zawiera sekcje z rozdziału 3 |

Bramka: lead czyta `CONTRACT.md` (10 min) i zamraża.

### MW-1: silnik, część I (5 agentów równolegle; zależą tylko od kontraktu)

| Pakiet | Zadanie | Pliki własne | Odbiór |
| --- | --- | --- | --- |
| PM-02 | MT-02: wszystkie głosy z palety, test widma | `voices.py`, `test_voices.py`, `tmp/voice_sheet/*.wav` (nie commitowane) | `python3 tools/music/test_voices.py`: każdy głos 1 s, brak clippingu, widmo zgodne z opisem; arkusz odsłuchu głosów |
| PM-03 | MT-04: efekty `REV-*`, `LP/HP`, `TAPE`, `VINYL`, `CRUSH`, stereo | `fx.py`, `test_fx.py` | `python3 tools/music/test_fx.py`; próbki przed/po |
| PM-04 | MT-06 + `catalog2spec.py`: moduł motywu i generator szkiców specyfikacji ze wszystkich 60 katalogów | `motif.py`, `catalog2spec.py`, `specs/*.json` (szkice, pola `pattern` puste) | `python3 tools/music/catalog2spec.py && python3 tools/music/validate_spec.py` zielony dla 60 zadań; motyw w 12 tonacjach |
| PM-05 | MT-08, MT-09, MT-10: manifest, audyt, arkusz przeglądu | `build_manifest.py`, `tools/qa/music-audit.js`, `review_sheet.py`, `docs/music_review/README.md` | `node tools/qa/music-audit.js` zielony na pustym zestawie i na zestawie testowym |
| PM-06 | MT-05: zamykanie pętli, LUFS, limiter, OGG | `finish.py`, `test_finish.py` | szew niesłyszalny w teście 5× pętli, LUFS ±0,5, szczyt ≤ -1 dBTP |

**Bramka G1 (człowiek, 15 min):** arkusz odsłuchu głosów i efektów. Każdy głos ma brzmieć jak opis w palecie. Odrzucenie = poprawka w PM-02/PM-03 (MW-1 powtarzana tylko dla tego pakietu).

### MW-2: silnik, część II i szumy (4 agentów)

| Pakiet | Zadanie | Pliki własne | Zależy od | Odbiór |
| --- | --- | --- | --- | --- |
| PM-07 | MT-03: sekwencer + `render.py` | `sequencer.py`, `render.py`, `test_sequencer.py` | PM-02, PM-04, PM-06 | 8-taktowa próbka z 3 warstwami gra czysto; `render.py _example_*` tworzy OGG |
| PM-N1 | MT-14, 15, 16, 17: szumy winylowe | `noise/noise_vinyl_crackle.py`, `noise_needle_drop`, `noise_needle_lift`, `noise_needle_skip`, `assets/music/noise/*.ogg`, `docs/music_review/MT-14…17.md` | PM-03, PM-06 | wg promptów MT-14…17 |
| PM-N2 | MT-18, 19, 22: deszcz, wiatr, ton pokoju | j.w. dla `noise_rain`, `noise_wind`, `noise_room_tone` | PM-03, PM-06 | wg promptów |
| PM-N3 | MT-20, 21: ptaki, świerszcze | j.w. dla `noise_birds`, `noise_crickets` | PM-03, PM-06 | wg promptów |

### MW-1b: research harmonii (1 agent)

| Pakiet | Zadanie | Pliki własne | Zależy od | Odbiór |
| --- | --- | --- | --- | --- |
| PM-R0 | research progresji: rodziny (jazz, ambient, pixel) i mapowanie każdego id ze specyfikacji | `docs/music_progressions.md` | – | każdy id z `tools/music/specs` ma wpis w tabeli mapowania |

### MW-3: pilot stylu (3 agentów)

| Pakiet | Zadanie | Pliki własne | Zależy od | Odbiór |
| --- | --- | --- | --- | --- |
| PM-08 | MT-07: stemy (jedna specyfikacja → 3 stemy + `_full`) | `stems.py`, `test_stems.py` | PM-07 | 3 stemy mają identyczną liczbę próbek; `_full` = suma |
| PM-09 | MT-11: `theme_cuy` (= `home_main`) | `specs/theme_cuy.json`, `assets/music/home/theme_cuy.ogg`, `docs/music_review/MT-11.md` | PM-07 | wg MT-11 |
| PM-10 | MT-12, 13: dwa jingle | `specs/jingle_*.json`, `assets/music/jingles/*.ogg`, przeglądy | PM-07 | wg MT-12/13: długości 5,0 s i ≤ 5 s |

**Bramka G2 (człowiek, 30 min): „czy to jest nasz styl”.** Motyw, jingle, szumy odsłuchane na słuchawkach, głośniku laptopa i w mono. Zatwierdzenie otwiera fale treści. Odrzucenie: zmiana w `catalog_*.py`/głosach/efektach, regeneracja, powtórka MW-3. To jedyny punkt, w którym zła decyzja kosztuje dużo, dlatego jest przed masową produkcją.

### MW-4: belki, miejsca na zewnątrz, minigry (6 agentów)

| Pakiet | Zadania | Pliki własne (specyfikacje i OGG tych zadań) | Odbiór |
| --- | --- | --- | --- |
| PM-11 | MT-23 `bed_morning`, MT-24 `bed_day` | `specs/bed_morning,bed_day.json`, `assets/music/beds/` | 2:00-4:00 min, -20 LUFS ±1,5 |
| PM-12 | MT-25 `bed_evening`, MT-26 `bed_night` | j.w. | j.w. |
| PM-13 | MT-27 `place_garden_day`, MT-28 `place_garden_evening`, MT-29 `place_park` | `assets/music/places/` | pętle 60-125 s, -18 LUFS |
| PM-14 | MT-30 `place_farm`, MT-31 `place_market` | j.w. | j.w. |
| PM-15 | MT-42 `mg_veggie_rain`, MT-43 `mg_hay_maze` (po 3 stemy + `_full`) | `assets/music/minigames/` | stemy równej długości, suma -16 LUFS |
| PM-16 | MT-44 `mg_veggie_memory`, MT-45 `mg_nyan_cuy`, MT-46 `mg_menu` | j.w. | j.w.; `mg_nyan_cuy` bez zbliżenia do cudzej piosenki |

Po fali: lead uruchamia `build_manifest.py` i `music-audit.js` (stan: 1+2+9+4+5+13+4 = 38 plików).

Stan MW-4 (belki, miejsca, minigry): zrobione 4 belki, 5 miejsc (po jednej warstwie, jeden instrument, legenda v7, pogłos REV) i 15 stemów (5 minigier × base/rhythm/lead, jeden instrument na minigrę, osobne pliki, bez `_full`). Pomiar: -18 LUFS (belki, miejsca, stemy), TP ≤ -1,1 dBTP, szwy czyste, belki 160-192 s, miejsca 66-111 s, minigry 28-53 s. Manifest i `music-audit.js` po fali (lead).

### MW-5: pokoje i seria 1 płyt (5 agentów)

| Pakiet | Zadania | Odbiór |
| --- | --- | --- |
| PM-17 | MT-32 salon, MT-33 sypialnia, MT-34 pokój zabaw | pętle 60-125 s, -18 LUFS |
| PM-18 | MT-35 wspólna sypialnia, MT-36 łąka, MT-37 przekąski | j.w. |
| PM-19 | MT-38 kryjówka (-26 LUFS), MT-39 kącik czytelniczy, MT-40 kącik zabaw, MT-41 domyślny | j.w. |
| PM-20 | MT-101 `s1_poranek`, MT-102 `s1_marchewka`, MT-103 `s1_deszcz` (po 4 utwory) | 85-120 s, -16 LUFS, wiersze przeglądu |
| PM-21 | MT-104 `s1_kubek`, MT-105 `s1_nocna`, MT-106 `s1_cichy` | j.w. |

Stan MW-5 (pokoje, MT-32…41): zrobione 10 specyfikacji `place_room_*` (jedna warstwa, jeden instrument, legenda v7, bez perkusji i szumu, pogłos REV). Różne rodziny: SOUL, DORQ, LULL, MODAL, DORSOUL, LYD, BACKDOOR, THIRDS, PEDAL, PHRYG. Pomiar: -18 LUFS (kryjówka -24, schemat nie zna -26), TP ≤ -1,2 dBTP, szew bez kliknięcia. Seria 1 (MT-101…106) zrobiona: 24 specyfikacje `rec_s1_*` (generator `gen_records_mw67.py`, SERIES_IDS zawiera „s1”, master -16 LUFS).

**Bramka G3 (człowiek, 40 min): seria 1 jako wzorzec płyt.** Sprawdzamy, czy A1/A2 to „ta sama płyta”, B1 żwawszy, B2 spokojny. Zatwierdzona seria 1 jest wzorcem dla serii 2-4.

### MW-6: serie 2 i 3 (4 agentów, po 3 płyty = 12 plików)

| Pakiet | Zadania |
| --- | --- |
| PM-22 | MT-107 `s2_rosa`, MT-108 `s2_pietruszka`, MT-109 `s2_pszczoly` |
| PM-23 | MT-110 `s2_wiatr`, MT-111 `s2_dynia`, MT-112 `s2_jablka` |
| PM-24 | MT-113 `s3_ksiezyc`, MT-114 `s3_swietliki`, MT-115 `s3_sowa` |
| PM-25 | MT-116 `s3_kolysanka`, MT-117 `s3_tupot`, MT-118 `s3_sen` |

Stan MW-6 (płyty serii 2-3, MT-107…118): zrobione 12 płyt x 4 warianty = 48 specyfikacji `rec_s2_*`, `rec_s3_*` (generator `tools/music/gen_records_mw67.py`). Jeden instrument, jedna warstwa (`chords.rolled`, arp8 bez zmian), progresje legendy v7 wg `legend_progs.py`, bez perkusji i szumu. Pomiar: -18 LUFS, TP ≤ -1 dBTP, długość 90-120 s, szew bez kliknięcia. Seria 1 (MT-101…106) poza tym zakresem.

### MW-7: seria 4 (2 agentów) i końcowy audyt

| Pakiet | Zadania |
| --- | --- |
| PM-26 | MT-119 `s4_disco`, MT-120 `s4_synth`, MT-121 `s4_kaseta` |
| PM-27 | MT-122 `s4_radio`, MT-123 `s4_arcade`, MT-124 `s4_taniec` |

Stan MW-7 (seria 4, MT-119…124): zrobione 6 płyt x 4 warianty = 24 specyfikacje `rec_s4_*` tym samym generatorem, te same reguły co MW-6 (efekty serii 4 z katalogu, bez TAPE poza `s4_kaseta`). Stan: wszystkie 144 pliki wygenerowane.

### MW-8: zamknięcie (1 agent)

| Pakiet | Zadanie | Odbiór |
| --- | --- | --- |
| PM-28 | pełny `build_manifest.py`, `music-audit.js` na 144 plikach, `assets/LICENSES/music.md`, raport `docs/music_review/REPORT.md` (tabela 140 wierszy z ocenami), lista poprawek | wszystkie 7 kontroli audytu zielone; 144 pliki; raport bez ocen < 3 |

Stan MW-8: wykonane. Manifest 149 pozycji (144 wygenerowane, 5 legacy, 24 płyty), `music-audit` GREEN (7/7 PASS). Pozostają 4 pliki zewnętrzne z ostrzeżeniem o szczycie (`calm`, `games_1`, `games_2`, `games_boss`).

**Decyzje zamykające (delegowane przez właściciela, bez odsłuchu przez agenta):**
- Pliki zewnętrzne `calm`, `games_1`, `games_2`, `games_boss`: nie remasterowane, zostają jako ostrzeżenie. Nie są generowane w tym pipeline, a zmiana ich pliku bez źródła mogłaby naruszyć licencję.
- `noise_needle_skip` (−70 LUFS): akceptowane. To jednorazowy klik, a gated loudness dla takiego dźwięku wychodzi bardzo nisko. Cel w specyfikacji to zmierzona wartość.
- Bramki G2, G3, G4: uznane za zatwierdzone przez właściciela na podstawie delegacji. Odsłuch nie był wykonany przez agenta; automatyczne kontrole są zielone. Jeśli odsłuch wypadnie inaczej, poprawka idzie w `voices.py`/`fx.py` i regeneracja odpowiedniej fali.

### MW-9: unikalne progresje i brzmienia (dopisane po odsłuchu właściciela)

Powód: 24 płyty były 12 rodzinami legendy w transpozycji, a 4 warianty płyty miały tę samą harmonię. Właściciel chciał osobnej progresji i brzmienia dla każdego utworu.

Zrobione: `tools/music/unique_progs.py` przepisuje `chords`, instrument, wzór i efekty 120 utworów (96 płyt, 10 pokoi, 9 belek i miejsc, 4 gry plus menu). Harmonia pochodzi z gotowców z internetu: 194 progresje z SHLD Free MIDI Chord Packs (Ludovic Drolez, licencja MIT, https://github.com/ldrolez/free-midi-chords, commit 95533fae), zapisane stopniami w `tools/music/ready_progs.json` (dane, nasz kod nie wykonuje cudzego kodu). Każdy utwór składa 1-3 sekcje po 8 taktów z różnych gotowych progresji, transponuje je do swojej tonacji (sekcje B i C bywają w tonacji względnej), rozkłada akordy na takty i ubarwia je słownikiem legendy v7 (maj9#11, m11, 13sus4, 7alt itd.). Dobór po nastroju z tagów paczki (np. Nostalgic, Hopeful, Mysterious dla płyt, więcej Joyful i Playful dla gier). Ta sama gotowa progresja występuje w bibliotece najwyżej kilka razy, a unikalność sekwencji jest wymuszona względem tonaliki (limit powtórzonych taktów). Odcisk brzmienia (instrument, wzór, efekty) jest unikalny dla wszystkich płyt. Tabela wszystkich progresji ze źródłem: `docs/music_progressions_unique.md`. Atrybucja MIT: `assets/LICENSES/music.md`. Stemy i `_full` jednej gry dzielą harmonię z założenia. Bez nowej harmonii zostają: motyw i jingle (już unikalne), 9 szumów (bez akordów) i 5 plików zewnętrznych.

Powtórka: `python3 tools/music/unique_progs.py --apply`, potem render zmienionych specyfikacji, `build_manifest.py` i `music-audit.js --full`. Testy: `python3 tools/music/test_theory.py`.

### Wykres zależności

```
MW-0 PM-01 ─┬─► MW-1 PM-02 voices ─┐
            ├─►       PM-03 fx ────┼─► MW-2 PM-07 sequencer ─► MW-3 PM-08 stems
            ├─►       PM-04 catalog┤        PM-N1/N2/N3 noise      PM-09 theme ─┐
            ├─►       PM-05 audit  │                               PM-10 jingle ┴─► G2
            └─►       PM-06 finish ┘                                                 │
                                                       ┌──── MW-4 (6) beds/places/minigames
                                              po G2 ───┼──── MW-5 (5) rooms + serie 1 ─► G3
                                                       └──── MW-6 (4) serie 2,3 ─► MW-7 (2) seria 4 ─► MW-8 ─► G4
```

MW-4 i MW-5 mogą ruszyć razem po G2 (11 agentów), jeśli budżet pozwala; seria 1 w MW-5 musi przejść G3 przed MW-6/MW-7.

### Liczby kontrolne

| Fala | Pakiety | Zadania MT | Pliki OGG po fali |
| --- | --- | --- | --- |
| MW-0…MW-1 | 6 | MT-01…06, 08…10 | 0 |
| MW-1b | 1 | – | 0 |
| MW-2 | 4 | MT-03, 14…22 | 9 |
| MW-3 | 3 | MT-07, 11, 12, 13 | 12 |
| MW-4 | 6 | MT-23…31, 42…46 | 12 + 4 + 5 + 13 + 4 (`_full`) = 38 |
| MW-5 | 5 | MT-32…41, 101…106 | 38 + 10 + 24 = 72 |
| MW-6 | 4 | MT-107…118 | 72 + 48 = 120 |
| MW-7 | 2 | MT-119…124 | 144 |
| MW-8 | 1 | audyt | 144 |

Razem: 32 pakiety audio (w tym PM-R0 w MW-1b); 140 plików twórczych + 4 `_full` = 144.

---

## 5. Tor kodu gry (`IW-*`, równolegle do audio)

Wykonywany przez narzędzie projektu (pakiety w `docs/opt/packages.spec.json`, generator `tools/opt/gen_packages.py`, kontrola `node tools/qa/plan-audit.js`). Zasady `CLAUDE.md`: pakiety małe (1-6 elementów), pliki rozłączne w obrębie fali, pliki współdzielone (`HomeWindow.cs`, `app.js`, `minigames-api.js`) edytuje jeden pakiet naraz.

| Pakiet | Zakres (wg `MUSIC_PLAN.md`) | Pliki własne | Start po | Odbiór |

> **Wdrożone jako pakiety w `docs/opt/packages.spec.json`** (fale W34–W39, prompty `docs/prompts/PK-34a…PK-38b`). Mapowanie: IW-1 = PK-34a, IW-2 = PK-34b, IW-5 = PK-35, IW-3 = PK-36, IW-4 = PK-37, IW-6 = PK-38a i PK-38b (Fala A z `PLAN_FALE_WDROZENIE.md`). Kolejka startuje po W33.

| --- | --- | --- | --- | --- |
| IW-1 | `MusicPolicy.cs` (5.9): wybór belki wg godziny, priorytety, aranżacje etapów, 5 stanów zużycia, id płyt + testy | `src/Cuy.Core/Audio/MusicPolicy.cs`, `tests/Cuy.Core.Tests/MusicPolicyTests.cs` | MW-0 (zna schemat `music.json`) | testy Core zielone (granice 06:00/09:00/17:00/22:00, noc bez zgody, pełny ekran) |
| IW-2 | `music-engine.js` (5.5) i `music-director.js` (5.4): graf WebAudio, stemy, pętle `loopStart/loopEnd`, ducking, filtr nocny | `web/home/music-engine.js`, `web/home/music-director.js`, `web/home/mocks/music-*.js` | MW-0 | test w przeglądarce z mockiem `AudioContext`: stemy startują na jednym zegarze |
| IW-3 | `MusicPlayer.cs` (NVorbis) + wiadomości mostu `music.handover`, `music.duck` (5.2, 5.6); **wymaga zgody właściciela na zależność** | `src/Cuy/dotNet/MusicPlayer.cs`, `HomeWindow.cs` (jedyny edytor w fali) | MW-3 (są OGG do testu) | belka pulpitu gra, fade, cisza nocna, pełny ekran |
| IW-4 | wpięcia w widokach Domku (5.8): `app.js`, `features/*`, `minigames-api.js`, usunięcie `nyan-audio.js` | pliki z tabeli 5.8 (jeden pakiet naraz) | IW-2, MW-4 (M3/M4) | każdy widok gra swoją pętlę, stop po zamknięciu minigry |
| IW-5 | zapis i Ustawienia (5.7), `SelfTest.cs` (5.8) | `save` schema, Ustawienia, `SelfTest.cs` | IW-1 | testy zapisu; `SelfTest` rozszerzony |
| IW-6 | płyty i odtwarzacze, taniec wg odtwarzacza (M5) | wg „Fali A” z `PLAN_FALE_WDROZENIE.md` (osobny plan) | funkcja płyt | 96 utworów podpiętych |

Zbieżność z audio: IW-1 i IW-2 idą równolegle do MW-1…MW-3; IW-3 po MW-3; IW-4 po MW-4; IW-6 po G3.

## 6. Szablon promptu dla agenta muzycznego (wklejany do sesji pakietu)

```
Pakiet <PM-xx>: zadania <MT-…>.
Czytaj tylko: docs/music_prompts/<pliki zadań>, docs/music_prompts/README.md, tools/music/CONTRACT.md.
Dla każdego zadania:
1. python3 tools/music/catalog2spec.py --id <id>   (szkic specyfikacji; nie pisz od zera)
2. Uzupełnij pola "pattern" w tools/music/specs/<id>.json zgodnie z tabelą warstw z promptu (słownik wzorów z CONTRACT.md).
3. python3 tools/music/render.py <id>   (powstaje WAV i OGG w assets/music/...)
4. Odsłuchaj (słuchawki/głośnik/mono), popraw TYLKO pola specyfikacji (nie moduły silnika); seed zmieniasz tylko jeśli utwór nie przechodzi odbioru.
5. node tools/qa/music-audit.js --only <id>   → zielony.
6. Wpisz wiersz do docs/music_review/MT-<n>.md (3 odsłuchy, ocena 1-5, uwagi).
Zasady: edytujesz wyłącznie pliki własne pakietu; nie dotykasz assets/data/music.json ani LICENSES; błąd silnika zgłaszasz w raporcie, nie naprawiasz sam. Raport końcowy: max 15 linii (pliki, długości, LUFS, ocena, uwagi).
```

## 7. Ryzyka i środki

| Ryzyko | Środek |
| --- | --- |
| Głosy chiptune brzmią „tanio” po złożeniu | Bramka G1 przed sekwencerem i G2 przed masową produkcją; poprawka w `voices.py`/`fx.py` wymusza powtórkę tylko MW-3 |
| Rozjazd stylu między serią 1 a 4 | Wzorzec serii 1 (G3); wspólny słownik głosów i szkielety melodii; regeneracja promptów |
| Czas odsłuchu 140 plików | Odsłuchy tylko na bramkach; arkusz `MUSIC_REVIEW` z oceną 1-5; poprawka tylko niskich ocen |
| NVorbis (zależność) | rozstrzygnięte: zatwierdzone w `MUSIC_PLAN.md`, tabela decyzji, wiersz 5 („tak, własny tor C#”); licencja MIT w `THIRD_PARTY_NOTICES.md` (PK-36) |
| Szew pętli | PM-06 i `music-audit` (test 5×); szumy mają okres dobrany do długości |
| Brak funkcji płyt w grze | MW-5…MW-7 produkują pliki niezależnie od gry; IW-6 startuje osobno |

## 8. Kolejność startu (co po komendzie właściciela)

1. MW-0 (PM-01). 2. MW-1 z 5 agentami + IW-1/IW-2 równolegle. 3. G1. 4. MW-2, MW-3. 5. G2. 6. MW-4 i MW-5. 7. G3. 8. MW-6, MW-7. 9. MW-8, G4.
