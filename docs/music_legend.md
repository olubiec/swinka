# Legenda harmoniczna v7 (chill / lofi / jazz / ambient)

Wiążąca dla wszystkich utworów muzycznych Cuy (plan: `docs/MUSIC_WAVES.md`). Źródło prawdy w kodzie: `tools/music/theory.py` (`CHORD_Q`, słownik akordów), `tools/music/legend_progs.py` (progresje, rodziny, `--apply`, `--table`), `tools/music/test_theory.py` (testy zgodności). Opis każdego akordu i progresji poniżej jest sprawdzany testem (każdy symbol się parsuje, maks. 6 głosów, specyfikacje = `legend_progs.py`).

**Stałe reguły:** jeden instrument na utwór; pełne progresje (jeden akord na takt, pętla wraca do taktu 1); duży łańcuch efektów zamiast warstw; "kozackie" = bogate, zaskakujące i jasne, nie mroczne ani agresywne (gra o kawii). Szum (`noise_*`) miksuje silnik gry z osobnych plików, nie jest warstwą specyfikacji. Nie słuchałem audio: opisy barw to zamierzenia z teorii, do potwierdzenia na bramce G2.

## 1. Słownik akordów "kozackich"

Skład w półtonach od podstawy (głosy od dołu). Przykłady na C. Głos 1 (podstawa) gra nisko (F2-E3), reszta w G3-G5. "bez 5" = kwinta pominięta celowo (zmniejsza mulenie i zostaje miejsce na 6 głosów).

| Symbol | Półtony | Przykład (C) | Barwa i zastosowanie |
| --- | --- | --- | --- |
| `maj7#11` | 0 4 7 11 18 | C E G B F# | lidyjska jasność, "wschód słońca"; akord I lub IV zamiast zwykłego maj7 |
| `maj9#11` | 0 4 11 14 18 (bez 5) | C E B D F# | najbardziej "marzycielski" tonik; domyślny akord domu |
| `maj13` | 0 4 11 14 21 (bez 5) | C E B D A | ciepły, otwarty, jak kadencja końcowa; spokojniejszy od #11 |
| `maj13#11` | 0 4 11 14 18 21 (bez 5, 6 głosów) | C E B D F# A | triada D nad Cmaj7 (upper structure): bogaty, błyszczący; punkt kulminacyjny |
| `m9` | 0 3 7 10 14 | C Eb G Bb D | miękki, neo-soulowy ii/vi |
| `m11` | 0 3 10 14 17 (bez 5) | C Eb Bb D F | kwartowy, otwarty; główny akord molowy "chill" |
| `m13` | 0 3 10 14 21 (bez 5) | C Eb Bb D A | dorycka 6: jaśniejszy niż m11, "jazzowy poranek" |
| `m(maj7)9` | 0 3 7 11 14 | C Eb G B D | "filmowy" zwrot, słodko-gorzki; tylko w pojedynczych taktach |
| `7sus4` / `9sus4` | 0 5 7 10 / +14 | C F G Bb (D) | zawieszenie bez tercji; zamiast V7, rozwiązuje się lub zawisa (nie napina) |
| `13sus4` | 0 5 10 14 21 (bez 5) | C F Bb D A | najbardziej "otwarty" dominant; domyślny turnaround pętli |
| `7#9` | 0 4 10 15 (bez 5) | C E Bb D# | funkowy "Hendrix"; użycie oszczędne |
| `7b13` | 0 4 10 20 (bez 5) | C E Bb Ab | dominant z półtonowym ciągnieniem 13→5; ciepły, mniej ostry niż alt |
| `7alt` | 0 4 10 15 20 | C E Bb D# Ab | #9 + b13 (bez b9, łagodniejszy): napięcie przed ii lub I |
| `7b9b13` | 0 4 10 13 20 | C E Bb Db Ab | frygijsko-dominantowy; "tajemnica", ale grany miękko |
| `7#11` / `9#11` / `13#11` | 0 4 7 10 18 / 0 4 10 14 18 / 0 4 10 14 18 21 | C E Bb D F# (A) | lidyjski dominantowy: zamiennik trytonowy i bVII7; zabawny, "kosmiczny" |
| `7#5` / `9#5` | 0 4 8 10 (14) | C E G# Bb (D) | cała tonowa: sen, unoszenie się, brak ciężaru |
| `maj7#5` | 0 4 8 11 | C E G# B | lidyjski rozszerzony: magiczny, "iskra" |
| `m7b5` / `m9b5` | 0 3 6 10 (14) | C Eb Gb Bb (D) | półzmniejszony: czułość przed rozwiązaniem w ii-V |
| `dim7` | 0 3 6 9 | C Eb Gb Bbb | symetryczny łącznik chromatyczny (tylko przejście, 1 takt) |
| `q3` / `q4` / `sowhat` | 0 5 10 / +15 / +15 +19 | C F Bb (Eb) (G) | kwarty: bez tercji, nie "dur" ani "moll"; `sowhat` = 4 kwarty + wielka tercja (E A D G B) |
| `sus2` / `sus24` | 0 2 7 / 0 2 5 7 | C D G / C D F G | klaster: jasny, "dziecięcy" |
| `add9` / `madd9` | 0 4 7 14 / 0 3 7 14 | C E G D | proste, ciepłe, bez septymy |
| `6/9` / `m6/9` | 0 4 7 9 14 / 0 3 9 14 | C E G A D | zamknięcie "uśmiechem", bez ciągnienia |
| `maj7/3` (slash) | bas = tercja | `Cmaj7/E` | bas biegnie liniami ("1. inwersja"), gładka linia basu |
| `m11/b7` (slash) | bas = septyma | `Am11/G`, `Dm11/G` | miękkie prowadzenie do V, pseudo-pedał |
| Upper structure | triada nad basem | `D/C` (=C13#11 bez 3), `Bb/C`, `Fmaj7#11/C` | triada w górze, inny dźwięk w basie: "kolorowe" akordy bez nazewnictwa |

Dotychczasowe typy (`maj9`, `m7`, `m9`, `13`, `13sus`, `7sus`, `6`, `6/9`, `maj7#11`, `m7♭5`, `7♭9`) pozostają. Wszystkie nowe typy mają testy składu w `test_theory.py`.

## 2. Techniki progresji

| Technika | Opis | Przykład (C) | Użyta w |
| --- | --- | --- | --- |
| Zamiennik trytonowy | V7 zastąpiony akordem o tryton dalej: bas schodzi półtonem do toniki | `G13` -> `Db13` -> `Cmaj13` | theme_cuy, SOUL, jingle_birthday (`Db9#11`) |
| Modal interchange | akord pożyczony z moll/tonacji równoległej: iv, bVII, bVI, bIII, bII | `Fm9`, `Bbmaj7#11`, `Abmaj7#11`, `Ebmaj9#11` | MODAL, theme_cuy, bed_day |
| Cykl tercji wielkich (Coltrane w skrócie) | trzy tonalne centra co tercję wielką: C - Ab - E - (C) | `Cmaj9#11 | Abmaj9#11 | Emaj9#11 | Dm11` | THIRDS, theme_cuy (takty 17-19) |
| Backdoor ii-V | iv - bVII7 - I zamiast ii - V - I | `Fm9 | Bb13 | Cmaj13` | BACKDOOR, bed_evening |
| Ruch chromatyczny basu / głosów | bas lub głos wiodący przesuwa się półtonem | `Dm11 | Db13 | Cmaj13`; `Dsowhat | Ebsowhat | Dsowhat` | wszędzie jako domyślne połączenie |
| Pedał (pedal point) i dron | bas stoi na jednej nucie, akordy nad nim zmieniają kolor | `D/C | Em11/C | Fmaj7#11/C` | PEDAL (sen, ambient) |
| Kadencja plagalna | IV - I (lub iv - I), "amen" | `Fmaj9#11 | Fm6/9 | Cmaj9` | LULL |
| Deceptive ii-V do bIII | ii - V rozwiązane w bIII zamiast I | `Dm11 | G13sus4 | Ebmaj9#11` | MODAL, theme_cuy (B2) |
| Neo-soul / Rhodes | małe kroki w głosach, 6 głosów, rozłożenie (roll), brak skoków | `Am11 | Dm11 | Em11` | SOUL, wszystkie rolled |
| Dominant zawieszony | V jako 13sus4/9sus4 na końcu pętli: pętla "oddycha" zamiast zamykać | `G13sus4 -> Cmaj9#11` | turnaround wszędzie |
| Moll kwartowy ("So What") | stos kwart w dorysku, przesunięcie o półton w górę i z powrotem | `Dsowhat | Ebsowhat | Dsowhat` | DORQ (noc, pokoje) |
| Cała tonowa | dominanty #5 jedna za drugą, bez ciągnienia | `C9#5 | D9#5 | E9#5` | WHOLE (sen) |

## 3. Voice-leading dla jednego instrumentu

- Maks. 6 głosów (typowo 5); `chords.rolled` bierze podstawę (lub bas z `/`) + do 5 górnych.
- Podstawa: jeden głos, F2-E3 (midi 41-52); nic poniżej C3 nie jest podwajane (brak mulenia).
- Góra: G3-G5 (midi 55-79), rozpiętość <= 19 półtonów, głosy różne.
- Gładko: każdy głos idzie do najbliższego głosu następnego akordu (przy równej liczbie głosów przez permutację, przy różnej przez odległość do najbliższego); wspólne dźwięki zostają.
- Roll (rozłożenie w górę): 0,15-0,4 uderzenia między głosami (parametr `chords.rolled(x)`); szerszy dla jingli i celesty, wąski dla basu w lofi.
- Trzymanie do końca taktu; pogłos zlewa zmiany.
- Arpeggio (`chords.arp8`): ósemki po tonach akordu w C4-B4, swing 58, dla "żwawych" miejsc.

## 4. Rodziny progresji (8 taktów, tonika C; `legend_progs.FAMILIES` transponuje do dowolnej tonacji)

| Rodzina | Charakter | 8 taktów |
| --- | --- | --- |
| `LYD` (tonika C) | lidyjski wschód słońca | Cmaj9#11 \| Dmaj13 \| Em11 \| Fmaj13#11 \| Cmaj7/E \| Dm11/G \| Cmaj13 \| G6/9 |
| `SOUL` (tonika C) | neo-soul, tritonowy zwrot | Cmaj13 \| Am11 \| Dm11 \| G7b13 \| Em11 \| A7alt \| Dm9 \| Db9#11 |
| `MODAL` (tonika C) | modal interchange, bIII deceptive | Cmaj9 \| Bbmaj7#11 \| Abmaj9#11 \| Fmaj13#11 \| Cmaj7/E \| Ebmaj9#11 \| Dm11 \| G13sus4 |
| `BACKDOOR` (tonika C) | backdoor ii-V, jasny jazz | Cmaj9 \| Am11 \| Fm9 \| Bb13 \| Cmaj13 \| Em11 \| Fmaj9#11 \| G13sus4 |
| `THIRDS` (tonika C) | cykl tercji (Coltrane lite) | Cmaj9#11 \| Abmaj9#11 \| Emaj9#11 \| Dm11 \| Db13 \| Cmaj13 \| Am11 \| G13sus4 |
| `DORQ` (tonika D) | dorycki kwartowy (tonika D) | Dsowhat \| Ebsowhat \| Dsowhat \| Gmaj13#11 \| Em11 \| Fmaj13#11 \| Dm11 \| A9sus4 |
| `PEDAL` (tonika C) | pedał C, ambient | Cmaj9 \| D/C \| Em11/C \| Fmaj7#11/C \| Cmaj9 \| Bb/C \| Dm11/C \| G/C |
| `WHOLE` (tonika C) | cała tonowa, sen | Cmaj7#5 \| D9#5 \| Fmaj13#11 \| E9#5 \| Dbmaj7#11 \| C9#5 \| Fmaj13#11 \| G9sus4 |
| `PHRYG` (tonika A) | frygijsko-dominantowa tajemnica (tonika A) | Am11 \| Bbmaj7#11 \| Am9 \| E7b9b13 \| Dm11 \| Bbmaj13#11 \| E7alt \| Am(maj7)9 |
| `DORSOUL` (tonika G) | dorycki soul (tonika G) | Gm11 \| C13 \| Bbmaj9#11 \| Ebmaj13#11 \| Gm13 \| Am11 \| D7b13 \| Db9#11 |
| `MINSOUL` (tonika E) | eolski soul (tonika E) | Em11 \| Cmaj13#11 \| Am11 \| B7alt \| Em9 \| Dmaj9#11 \| Cmaj9#11 \| B7b13 |
| `LULL` (tonika C) | kołysanka, plagalna | Cmaj9 \| Fmaj9#11 \| Cmaj7/E \| Fm6/9 \| Cmaj13 \| Dm11 \| Fmaj9#11 \| Cmaj9 |

Wszystkie rodziny: dominant końcowy (`G13sus4`, `Db9#11`, `E7b13`...) prowadzi do taktu 1, więc pętla nie ma szwu harmonicznego. Transpozycja zachowuje pisownię (bemole w tonacjach z bemolami).

## 5. Utwory: zbudowane i z gotową specyfikacją (jeden instrument, jedna warstwa `chd`)

Wspólne: format 4/4, 1 akord na takt, TP <= -1 dBTP, pętla bez szwu (test 5x w `finish`). FX-łańcuchy: **LOFI** = SAT(2.5), TAPE(0.3), CHORUS(3), REV-L 0,4, LOFI(12), LP(2800), SHELF(-4), WIDTH(1,4); **AIRY** = CHORUS(2), REV-L 0,45, LP(6000), WIDTH(1,5); **LUSH** = SAT(1,5), CHORUS(3), REV-L 0,4, LP(4000), SHELF(-2), WIDTH(1,4); **PLUCK** = TAPE(0,2), REV-M 0,25, LP(5000), WIDTH(1,2).

| Utwór | Instrument / wzór | BPM | Tonacja / tryb | FX | Długość / LUFS | Nastrój |
| --- | --- | --- | --- | --- | --- | --- |
| `theme_cuy` (MT-11) | EP `chords.rolled(0.2)` | 66 | C lidyjski/dur, pożyczki bVII/bVI/bIII/iv | LOFI + VINYL(-50) (REV-L 0,42) | 32 takty = 116,4 s; -18 | wizytówka: ciepły, błyszczący, "chill" |
| `jingle_stage` (MT-13) | EP `chords.rolled(0.3)` | 109 | G lidyjski | SAT, CHORUS, REV-S 0,2, LP(3800), SHELF(-3), WIDTH(1,3) | 2 takty = 5,0 s; -14 | "level up": zawieszenie rozwiązane w blask |
| `jingle_birthday` (MT-12) | HARP `chords.rolled(0.22)` | 112 | C lidyjski dominantowy -> lidyjski | SAT, CHORUS, REV-S 0,2, WIDTH(1,3) | 2 takty = 4,9 s; -14 | święto: akord jak glissando harfy |
| `bed_morning` (MT-23) | HARP `chords.rolled(0.25)` | 70 | C lidyjski | AIRY | 48 takt. = 164,6 s; -20 | świt, ptaki (szum osobno) |
| `bed_day` (MT-24) | PAD `chords.rolled(0.35)` | 60 | F lidyjski | LUSH | 48 takt. = 192,0 s; -20 | spokojne południe |
| `bed_evening` (MT-25) | EP `chords.rolled(0.2)` | 76 | Bb dur, bIV/iv, backdoor | LOFI | 56 takt. = 176,8 s; -20 | złota godzina, neo-soul |
| `bed_night` (MT-26) | CEL `chords.rolled(0.3)` | 54 | D dorycki kwartowy | AIRY | 36 takt. = 160,0 s; -20 | gwiazdy, kołysanka dla dorosłych |
| `place_garden_day` (MT-27) | HARP `chords.rolled(0.25)` | 88 | G lidyjski | AIRY | 32 takty = 87,3 s; -18 | słoneczny ogród |
| `place_garden_evening` (MT-28) | EP `chords.rolled(0.2)` | 69 | E miksolidyjski | LOFI | 32 takty = 111,3 s; -18 | świetliki, ciepły wieczór |
| `place_park` (MT-29) | BOX `chords.arp8` (swing 58) | 96 | D dur | PLUCK | 32 takty = 60,0 s; -18 | spacer, pozytywka |
| `place_farm` (MT-30) | ACC `chords.rolled(0.2)` | 100 | A dur | LUSH | 32 takty = 76,8 s; -18 | gospodarska ciepłota |
| `place_market` (MT-31) | BNJ `chords.arp8` (swing 58) | 116 | Bb dur | PLUCK | 32 takty = 66,2 s; -18 | gwar targu, najżwawszy z miejsc |

### Progresje (takt po takcie; po `A` idzie `B`, potem znów `A`... do liczby taktów, ostatni takt wraca do 1)

**`theme_cuy`** (32 takty = 4 x 8):

| Takty | Akordy |
| --- | --- |
| 1-8 (A1) | Cmaj9#11 \| Bbmaj7#11 \| Am11 \| Abmaj7#11 \| Dm11 \| Db13 \| Cmaj13 \| G13sus4 |
| 9-16 (B1) | Fmaj13#11 \| Fm9 \| Em11 \| A7alt \| Dm9 \| Db9#11 \| Cmaj7/E \| G9sus4 |
| 17-24 (A2, cykl tercji) | Cmaj9#11 \| Abmaj9#11 \| Emaj9#11 \| Dm11 \| Db13 \| Cmaj13 \| Am11 \| G13sus4 |
| 25-32 (B2) | Fmaj13#11 \| Fm(maj7)9 \| Em11 \| Ebmaj9#11 \| Dm11 \| Db9#11 \| Cmaj13#11 \| G13sus4 |

**Jingle:** `jingle_stage`: D9sus4 \| Gmaj13#11. `jingle_birthday`: Db9#11 \| Cmaj13#11.

| Utwór | A (8 taktów) | B (8 taktów) |
| --- | --- | --- |
| `bed_morning` | Cmaj9#11 \| Dmaj7#11 \| Em11 \| Fmaj13#11 \| Cmaj7/E \| Dm11/G \| Cmaj13 \| G6/9 | Am11 \| Fmaj13#11 \| Bbmaj7#11 \| Fmaj7/A \| Dm11 \| Db13 \| Cmaj13#11 \| G9sus4 |
| `bed_day` | Fmaj9#11 \| Gm11 \| Am11 \| Bbmaj13#11 \| Fmaj7/A \| Gm11/C \| Fmaj13 \| C6/9 | Dm11 \| Bbmaj9#11 \| Abmaj7#11 \| Fmaj7/C \| Gm9 \| Gb13 \| Fmaj13#11 \| C13sus4 |
| `bed_evening` | Bbmaj9#11 \| Gm11 \| Cm11 \| F7b13 \| Dm11 \| Ebmaj9#11 \| Cm11 \| F13sus4 | Ebmaj13#11 \| Ebm9 \| Dm11 \| G7alt \| Cm11 \| B13 \| Bbmaj13 \| F9sus4 |
| `bed_night` | Dsowhat \| Ebsowhat \| Dsowhat \| Gmaj13#11 \| Em11 \| Fmaj13#11 \| Dm11 \| A9sus4 | Em11 \| A9sus4 \| Dm11 \| Bbmaj9#11 \| Gm13 \| C13sus4 \| Fmaj13#11 \| A7b13 |
| `place_garden_day` | Gmaj9#11 \| Bm11 \| Cmaj13#11 \| D13sus4 \| Em11 \| Bbmaj7#11 \| Am11 \| D9sus4 | Cmaj9#11 \| Cm9 \| Bm11 \| E7alt \| Am11 \| Ab13 \| Gmaj13 \| D13sus4 |
| `place_garden_evening` | E9sus4 \| Dmaj9#11 \| Amaj13#11 \| Bm11 \| C#m11 \| Dmaj7#11 \| Amaj7/C# \| B13sus4 | Amaj9#11 \| Am9 \| G#m11 \| C#7alt \| F#m11 \| F13 \| Emaj13 \| B9sus4 |
| `place_farm` | Amaj9 \| D6/9 \| F#m11 \| E13sus4 \| Amaj13 \| Bm11 \| Dmaj13#11 \| E9sus4 | Dmaj13#11 \| C#m11 \| Bm11 \| E7b13 \| Amaj7/C# \| Dmaj7/F# \| Bm11 \| E9sus4 |
| `place_market` | Bbmaj9 \| Gm9 \| Cm11 \| F13 \| Bbmaj13 \| Ebmaj7#11 \| Cm11 \| F9sus4 | Ebmaj9#11 \| Ebm9 \| Dm11 \| G7alt \| Cm11 \| B13 \| Bbmaj13#11 \| F13sus4 |
| `place_park` | Dmaj9 \| Bm11 \| Emaj13#11 \| A13sus4 \| F#m11 \| Gmaj13#11 \| Em11 \| A9sus4 | Gmaj9#11 \| Gm9 \| F#m11 \| B7b13 \| Em11 \| Eb13 \| Dmaj13 \| A13sus4 |

## 6. Do zbudowania (specyfikacje to szkice bez wzorów; progresje gotowe, wpisz je poleceniem z `legend_progs.py`)

Forma wszystkich poniższych utworów jednowarstwowych: **A B A B ...**, gdzie A = 8 taktów rodziny w tonice utworu, B = ta sama rodzina o kwartę wyżej (`legend_progs.form_future`), przycięte do liczby taktów w specyfikacji. Płyty `rec_*`: cztery warianty (`a1 a2 b1 b2`) mają tę samą progresję i różne tempa (ze specyfikacji). Nie zbudowane, bo to fala MW-5/MW-6/MW-7 (poza zakresem tej zmiany) i bo draft specyfikacji nie ma jeszcze wzorów; narzędzia (sekwencer, FX, finish) są gotowe.

| Utwór | Instrument | Wzór | Rodzina i tonika | A (8 taktów) |
| --- | --- | --- | --- | --- |
| `place_room_bedroom` | CEL | chords.rolled(0.3) | DORQ D | Dsowhat \| Ebsowhat \| Dsowhat \| Gmaj13#11 \| Em11 \| Fmaj13#11 \| Dm11 \| A9sus4 |
| `place_room_default` | EP | chords.rolled(0.2) | SOUL A | Amaj13 \| F#m11 \| Bm11 \| E7b13 \| C#m11 \| F#7alt \| Bm9 \| Bb9#11 |
| `place_room_dorm` | BOX | chords.rolled(0.3) | LULL G | Gmaj9 \| Cmaj9#11 \| Gmaj7/B \| Cm6/9 \| Gmaj13 \| Am11 \| Cmaj9#11 \| Gmaj9 |
| `place_room_glen` | EP | chords.rolled(0.2) | MODAL Eb | Ebmaj9 \| Dbmaj7#11 \| Bmaj9#11 \| Abmaj13#11 \| Ebmaj7/G \| Gbmaj9#11 \| Fm11 \| Bb13sus4 |
| `place_room_james` | PAD | chords.rolled(0.35) | DORSOUL D | Dm11 \| G13 \| Fmaj9#11 \| Bbmaj13#11 \| Dm13 \| Em11 \| A7b13 \| G#9#11 |
| `place_room_kuki` | HARP | chords.rolled(0.25) | LYD G | Gmaj9#11 \| Amaj13 \| Bm11 \| Cmaj13#11 \| Gmaj7/B \| Am11/D \| Gmaj13 \| D6/9 |
| `place_room_ned` | BNJ | chords.arp8 | BACKDOOR Bb | Bbmaj9 \| Gm11 \| Ebm9 \| Ab13 \| Bbmaj13 \| Dm11 \| Ebmaj9#11 \| F13sus4 |
| `place_room_playroom` | XYL | chords.arp8 | THIRDS C | Cmaj9#11 \| G#maj9#11 \| Emaj9#11 \| Dm11 \| C#13 \| Cmaj13 \| Am11 \| G13sus4 |
| `place_room_racuch` | BOX | chords.arp8 | MODAL C | Cmaj9 \| Bbmaj7#11 \| G#maj9#11 \| Fmaj13#11 \| Cmaj7/E \| Ebmaj9#11 \| Dm11 \| G13sus4 |
| `place_room_salon` | EP | chords.rolled(0.2) | SOUL F | Fmaj13 \| Dm11 \| Gm11 \| C7b13 \| Am11 \| D7alt \| Gm9 \| Gb9#11 |
| `s1_poranek` | HARP | chords.rolled(0.25) | LYD C | Cmaj9#11 \| Dmaj13 \| Em11 \| Fmaj13#11 \| Cmaj7/E \| Dm11/G \| Cmaj13 \| G6/9 |
| `s1_marchewka` | BNJ | chords.arp8 | BACKDOOR G | Gmaj9 \| Em11 \| Cm9 \| F13 \| Gmaj13 \| Bm11 \| Cmaj9#11 \| D13sus4 |
| `s1_deszcz` | EP | chords.rolled(0.2) | SOUL Eb | Ebmaj13 \| Cm11 \| Fm11 \| Bb7b13 \| Gm11 \| C7alt \| Fm9 \| E9#11 |
| `s1_kubek` | ACC | chords.rolled(0.2) | MODAL F | Fmaj9 \| Ebmaj7#11 \| Dbmaj9#11 \| Bbmaj13#11 \| Fmaj7/A \| Abmaj9#11 \| Gm11 \| C13sus4 |
| `s1_nocna` | EP | chords.rolled(0.2) | DORSOUL D | Dm11 \| G13 \| Fmaj9#11 \| Bbmaj13#11 \| Dm13 \| Em11 \| A7b13 \| G#9#11 |
| `s1_cichy` | BOX | chords.rolled(0.3) | PEDAL C | Cmaj9 \| D/C \| Em11/C \| Fmaj7#11/C \| Cmaj9 \| Bb/C \| Dm11/C \| G/C |
| `s2_rosa` | CEL | chords.rolled(0.3) | LULL G | Gmaj9 \| Cmaj9#11 \| Gmaj7/B \| Cm6/9 \| Gmaj13 \| Am11 \| Cmaj9#11 \| Gmaj9 |
| `s2_pietruszka` | EP | chords.rolled(0.2) | MINSOUL E | Em11 \| Cmaj13#11 \| Am11 \| B7alt \| Em9 \| Dmaj9#11 \| Cmaj9#11 \| B7b13 |
| `s2_pszczoly` | BNJ | chords.arp8 | LYD A | Amaj9#11 \| Bmaj13 \| C#m11 \| Dmaj13#11 \| Amaj7/C# \| Bm11/E \| Amaj13 \| E6/9 |
| `s2_wiatr` | PAD | chords.rolled(0.35) | PEDAL D | Dmaj9 \| E/D \| F#m11/D \| Gmaj7#11/D \| Dmaj9 \| C/D \| Em11/D \| A/D |
| `s2_dynia` | ACC | chords.rolled(0.2) | THIRDS F | Fmaj9#11 \| Dbmaj9#11 \| Amaj9#11 \| Gm11 \| Gb13 \| Fmaj13 \| Dm11 \| C13sus4 |
| `s2_jablka` | HARP | chords.rolled(0.25) | PHRYG A | Am11 \| Bbmaj7#11 \| Am9 \| E7b9b13 \| Dm11 \| Bbmaj13#11 \| E7alt \| Am(maj7)9 |
| `s3_ksiezyc` | PAD | chords.rolled(0.35) | LYD F | Fmaj9#11 \| Gmaj13 \| Am11 \| Bbmaj13#11 \| Fmaj7/A \| Gm11/C \| Fmaj13 \| C6/9 |
| `s3_swietliki` | CEL | chords.arp8 | WHOLE A | Amaj7#5 \| B9#5 \| Dmaj13#11 \| C#9#5 \| Bbmaj7#11 \| A9#5 \| Dmaj13#11 \| E9sus4 |
| `s3_sowa` | PAD | chords.rolled(0.35) | MINSOUL D | Dm11 \| Bbmaj13#11 \| Gm11 \| A7alt \| Dm9 \| Cmaj9#11 \| Bbmaj9#11 \| A7b13 |
| `s3_kolysanka` | BOX | chords.rolled(0.3) | LULL C | Cmaj9 \| Fmaj9#11 \| Cmaj7/E \| Fm6/9 \| Cmaj13 \| Dm11 \| Fmaj9#11 \| Cmaj9 |
| `s3_tupot` | EP | chords.rolled(0.2) | DORSOUL G | Gm11 \| C13 \| Bbmaj9#11 \| Ebmaj13#11 \| Gm13 \| Am11 \| D7b13 \| C#9#11 |
| `s3_sen` | PAD | chords.rolled(0.4) | PEDAL F | Fmaj9 \| G/F \| Am11/F \| Bbmaj7#11/F \| Fmaj9 \| Eb/F \| Gm11/F \| C/F |
| `s4_disco` | EP | chords.arp8 | MINSOUL A | Am11 \| Fmaj13#11 \| Dm11 \| E7alt \| Am9 \| Gmaj9#11 \| Fmaj9#11 \| E7b13 |
| `s4_synth` | P25 | chords.rolled(0.15) | MINSOUL E | Em11 \| Cmaj13#11 \| Am11 \| B7alt \| Em9 \| Dmaj9#11 \| Cmaj9#11 \| B7b13 |
| `s4_kaseta` | EP | chords.rolled(0.2) | PHRYG D | Dm11 \| Ebmaj7#11 \| Dm9 \| A7b9b13 \| Gm11 \| Ebmaj13#11 \| A7alt \| Dm(maj7)9 |
| `s4_radio` | ACC | chords.rolled(0.2) | BACKDOOR C | Cmaj9 \| Am11 \| Fm9 \| Bb13 \| Cmaj13 \| Em11 \| Fmaj9#11 \| G13sus4 |
| `s4_arcade` | P25 | chords.arp8 | THIRDS G | Gmaj9#11 \| Ebmaj9#11 \| Bmaj9#11 \| Am11 \| G#13 \| Gmaj13 \| Em11 \| D13sus4 |
| `s4_taniec` | EP | chords.arp8 | DORSOUL C | Cm11 \| F13 \| Ebmaj9#11 \| G#maj13#11 \| Cm13 \| Dm11 \| G7b13 \| F#9#11 |

**Płyty:** wiersze `s1_...`-`s4_...` dotyczą czterech wariantów każdej płyty (`rec_<seria>_a1/a2/b1/b2`). **Pokoje:** `place_room_*` (w specyfikacjach 24-32 takty).

### Minigry (MW-4, nie zbudowane)

Minigry wymagają 3 stemów (base/rhythm/lead, równa długość) i perkusji, a sekwencer buduje stem z osobnej warstwy; reguła jednego instrumentu każe użyć jednego głosu w trzech wzorach (propozycja: `chords.rolled` -> base, `chords.arp8` -> rhythm, `melody.skeleton` -> lead, ten sam głos). Do decyzji właściciela przed budową, dlatego zostają szkicami. Progresje (8 taktów, powtarzane; instrument w nawiasie):

| Utwór | Tonika, instrument, BPM | 8 taktów |
| --- | --- | --- |
| `mg_veggie_rain` | C, BNJ, 132 | Cmaj9#11 \| A7b13 \| Dm11 \| G13 \| Ebmaj9#11 \| Ab13#11 \| Cmaj13 \| G13sus4 |
| `mg_hay_maze` | A frygijsko-dominantowy, EP, 108 | Am11 \| Bbmaj7#11 \| Am9 \| E7b9b13 \| Dm11 \| Bbmaj13#11 \| E7alt \| Am(maj7)9 |
| `mg_veggie_memory` | F, BOX, 72 | Fmaj7#5 \| Gm11 \| Am11 \| Bbmaj9#11 \| F9#5 \| G9#5 \| Fmaj13 \| C13sus4 |
| `mg_nyan_cuy` | E dorycki, EP, 136 | Em11 \| Dmaj9#11 \| Cmaj13#11 \| B7alt \| Em9 \| Gmaj13#11 \| Am11 \| B13sus4 |
| `mg_menu` | G lidyjski, BNJ, 112 | G6/9 \| Bm11 \| Cmaj13#11 \| D13sus4 \| Em11 \| Ebmaj9#11 \| Am11 \| Db13 |

### Szumy (MW-2, zbudowane): `noise_*`

Bez harmonii (szum, trzaski, deszcz, wiatr, ptaki, świerszcze, ton pokoju); ta legenda ich nie dotyczy.

## 7. Stan i pomiary

Zbudowane i zmierzone (render `tools/music/render.py`, pomiar ffmpeg `ebur128`, centroid: średnia ważona energią z okien 4096 próbek, onsety: liczba zdarzeń nutowych wzoru):

| Plik | Długość | LUFS | TP (dBTP) | Centroid | Onsety | Szew pętli |
| --- | --- | --- | --- | --- | --- | --- |
| `theme_cuy.ogg` | 116,36 s | -18,0 | -2,1 | 1238 Hz | 163 | 0,0012 (typowy skok 0,056) |
| `jingle_stage.ogg` | 5,00 s | -14,0 | -2,5 | 1335 Hz | 11 | bez pętli |
| `jingle_birthday.ogg` | 4,89 s | -14,0 | -4,0 | 416 Hz | 11 | bez pętli |

Beds i places: render próbny poza repo (OGG nie są commitowane, bo fala MW-4 produkuje je razem z manifestem); pomiary sprawdzają, że specyfikacje się budują i mieszczą w celach MW-4:

| Id | Długość | LUFS | TP (dBTP) | Centroid | Onsety |
| --- | --- | --- | --- | --- | --- |
| `bed_morning` | 164,6 s | -20,0 | -6,0 | 346 Hz | 252 |
| `bed_day` | 192,0 s | -20,0 | -7,2 | 610 Hz | 249 |
| `bed_evening` | 176,8 s | -20,0 | -4,8 | 1008 Hz | 279 |
| `bed_night` | 160,0 s | -20,1 | -3,7 | 550 Hz | 185 |
| `place_garden_day` | 87,3 s | -18,0 | -4,0 | 501 Hz | 162 |
| `place_garden_evening` | 111,3 s | -18,0 | -1,9 | 1021 Hz | 162 |
| `place_park` | 60,0 s | -18,0 | -5,0 | 530 Hz | 192 |
| `place_farm` | 76,8 s | -18,0 | -5,0 | 1480 Hz | 162 |
| `place_market` | 66,2 s | -18,1 | -1,2 | 1640 Hz | 256 |

Nie słuchałem audio: kontrola barw i charakteru to bramka G2.
