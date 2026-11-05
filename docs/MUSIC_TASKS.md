# Cuy: muzyka, lista zadań i prompty do każdego dźwięku

Status: wykonawcza rozpiska do `docs/MUSIC_PLAN.md` (decyzje tam zamknięte, tu ich nie zmieniamy). Dla każdego z **144 plików audio** jest zadanie (ID `MT-…`) i prompt: tonacja, tempo, progresja, warstwy, instrumenty, perkusja, efekty, miks, pętla, zakazy.
Prompt jest zapisany tak, by dało się go (a) przepisać 1:1 do specyfikacji `tools/music/specs/<id>.json` (renderer kodowy, część 6 planu) albo (b) wkleić do zewnętrznego generatora muzyki jako opis stylu. Ścieżka (a) jest domyślna: licencje czyste, wynik powtarzalny (`seed`).

Dwie decyzje podjęte przy pisaniu tego dokumentu (poza `MUSIC_PLAN.md`), do wglądu:
1. **Motyw Cuy ma teraz konkretne nuty** (część 2). Plan mówił tylko „4-6 nut, schodzi stopniami, skok na końcu".
2. **Pętle minigier**: „4 pętle" z planu to miks `<gra>_full` renderowany automatycznie jako suma trzech stemów (zero pracy twórczej; używany przy pauzie, awarii WebAudio i w QA). Twórczo powstają tylko stemy.

---

## 0. Słownik głosów (jedyna paleta; w promptach używamy tylko tych kodów)

Wszystko syntetyzowane kodem. Brak sampli prawdziwych instrumentów, brak wokali, brak piły.

| Kod | Nazwa | Brzmienie i parametry |
| --- | --- | --- |
| `P12` | puls 12,5% | wąski, nosowy, „banjo/szarpnięcie"; atak 2 ms, zanik 180-350 ms, filtr 4 kHz |
| `P25` | puls 25% | pełniejszy, „blacha/pianino": atak 3 ms, zanik 250-600 ms |
| `P50` | puls 50% | tylko seria 4 i retro: pusty, „radiowy"; filtr 6 kHz |
| `TRI` | trójkąt | bas i pad: atak 8 ms, zanik wg partii, filtr 1,2 kHz dla basu |
| `PAD` | pad | 3 trójkąty rozstrojone ±7 centów, atak 1,2 s, release 1,5 s, dolnoprzepust 2 kHz |
| `BELL` | dzwonek | sinus + składowe 2,76× i 5,4× (-18/-26 dB), zanik 1,2 s |
| `BOX` | pozytywka | `BELL` z krótszym zanikiem 0,6 s, tylko dźwięki z gamy, brak vibrato, lekkie `tuning drift` ±4 centy |
| `CEL` | celesta | sinus + 4× (-14 dB), zanik 0,5 s |
| `GLK` | glockenspiel | sinus + 3× i 6× (-10/-18 dB), atak 1 ms, zanik 0,35 s |
| `XYL` | ksylofon | `P25` + sinus 4× (-12 dB), zanik 90 ms, staccato |
| `EP` | pianino elektryczne | `P25` + vibrato 5 Hz ±8 centów, zanik 600 ms |
| `BNJ` | banjo | `P12` + grzebień (comb) 3 ms, zanik 180 ms |
| `PIZ` | pizzicato | `TRI` + `P12` 1× (-12 dB), zanik 120 ms |
| `HARP` | harfa | sinus pluck, atak 1 ms, zanik 0,9 s |
| `ACC` | akordeon | `P25` + tremolo 6 Hz 20%, bez ataku |
| `BUZZ` | bzyczenie | sinus 220 Hz z FM 40 Hz, tylko `s2_pszczoly` |
| `KICK` | stopa | `TRI` pitch 140→45 Hz w 150 ms |
| `SNR` | werbel | szum pasmowy 1,8 kHz, zanik 120 ms (+ `TRI` 200 Hz -12 dB) |
| `BRSH` | miotełki | szum, filtr 3-9 kHz, obwiednia „swish" 180 ms |
| `HAT` | hi-hat | szum, górnoprzepust 8 kHz, zanik 30 ms (otwarty 160 ms) |
| `SHK` | shaker | szum 5-10 kHz, atak 15 ms, zanik 70 ms |
| `AMB-*` | warstwy szumu | użycie plików `noise_*` (część 6.9) lub generatora szumu różowego/brązowego |

Efekty (wspólne): `REV-S` pogłos mały (0,6 s, 12% mokry), `REV-M` (1,4 s, 18%), `REV-L` (3,2 s, 30%, pre-delay 40 ms), `LP(f)` dolnoprzepust, `HP(f)`, `TAPE(w)` falowanie taśmy ±w %, `VINYL(db)` trzask winylu, `CRUSH` bit-crush 8 bit/12 kHz (tylko perkusja).

Zapis nut w promptach: `C4` = środkowe C. „Takt" = takt 4/4, chyba że napisano 3/4. „dB" przy warstwie to poziom względem najgłośniejszej warstwy (0 dB).

---

## 1. Wspólny blok (wklejany na początek każdego promptu / pole `style_base`)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami (kolor jazzowy), melodia śpiewna i prosta, powtarzalna jak w grach Nintendo na Game Boy. Bit-crush wyłącznie na perkusji. Utwór ma być wielokrotnie słuchalny w tle, bez „ucha" skaczącego do przodu. Całość autorska, nie przypomina żadnej istniejącej piosenki.

Formaty i zasady liczenia:

| Reguła | Wartość |
| --- | --- |
| Format | OGG Vorbis q5-6, 44,1 kHz, stereo (jingle: mono) |
| Głośność | belki -20 LUFS, Domek -18, minigry -16, płyty -16, jingle -14; szczyt ≤ -1 dBTP |
| Pętla | start i koniec w zerowym przejściu; ogon pogłosu zawinięty na początek; `loopStart`/`loopEnd` w `music.json` |
| Długość płyty (A1) | liczba taktów = `round(100 s × BPM / 240)` do wielokrotności 4 (3/4: `100 s × BPM / 180`); wynik w tabeli płyt. Rzadkie i unikatowe: +4 takty |
| Długość płyty A2 | te same takty co A1, tempo -10% (dłużej o ~11%) |
| Długość płyty B1 | tempo +8%, takty jak A1 + mostek 8 taktów |
| Długość płyty B2 | tempo A1 × 0,8, takty = `ceil(95 s × BPM_B2 / 240)` do wielokrotności 4 |
| Ziarno | `seed` w specyfikacji; zmiana ziarna = nowa wariacja bez zmiany stylu |
| Podpis Cuy | 3 nuty: stopnie 2-3-5 (część 2); kończy utwór lub wchodzi co N taktów (patrz prompt) |

Konwencja struktur: `A` = temat główny, `B` = kontrast/mostek, `Aʹ` = wariacja tematu. Liczby w nawiasach to takty.

---

## 2. Motyw Cuy (definicja wiążąca)

W C-dur: **C4 D4 E4 G4**, rytm: ósemka, ósemka, ósemka, ćwierćnuta z kropką (łącznie 1,5 taktu 4/4 przy podziale na pół-takty; kończy się oddechem). Stopnie: `1 2 3 5`. Schodzi stopniami w górę, na ostatniej nucie skok małej tercji (E→G), kończy na 5. stopniu: przyjaźnie, nie finałowo.
- **Podpis Cuy** = ostatnie 3 nuty: stopnie `2 3 5` (D4 E4 G4 w C-dur), rytm ♪ ♪ ♩.
- Transpozycja: zawsze po stopniach tonacji utworu (np. w G-dur: A4 B4 D5). W molu i dorycku: `1 2 ♭3 5` (np. A-moll: A4 B4 C5 E5).
- Rejestr: C4-G5. Nigdy poniżej G3.
- Wersje: pełna (4 nuty), skrócona = podpis, odwrócona (zjazd 5 3 2 1) tylko w zakończeniach spokojnych utworów.

---

## 3. Zadania infrastrukturalne (przed jakąkolwiek muzyką)

| ID | Zadanie | Efekt | Zależy od | Odbiór |
| --- | --- | --- | --- | --- |
| MT-01 | Schemat specyfikacji `tools/music/spec.schema.json` + walidator | pola: `id,bpm,meter,key,mode,bars,swing,seed,chords[],layers[],drums,fx,master,loop,stem_of` | – | 3 przykładowe specyfikacje przechodzą walidację |
| MT-02 | Renderer głosów (część 0): wszystkie kody `P12…BUZZ`, `KICK…SHK` | `tools/music/voices.py` | MT-01 | test: każdy głos 1 s do WAV, brak clippingu, widmo zgodne z opisem |
| MT-03 | Sekwencer: progresja → takty, wzorce rytmiczne (`pattern`), swing, humanizacja ±8 ms/±3 dB (z `seed`) | `tools/music/sequencer.py` | MT-02 | 8-taktowa próbka gra czysto |
| MT-04 | Efekty: `REV-*`, `LP/HP`, `TAPE`, `VINYL`, `CRUSH`, stereo (pan, szerokość) | `tools/music/fx.py` | MT-02 | próbki audio słuchane po jednej |
| MT-05 | Zamykanie pętli: zawinięcie ogona, zerowe przejście, normalizacja LUFS, limiter -1 dBTP, kodowanie OGG | `tools/music/finish.py` | MT-03, MT-04 | szew niesłyszalny (test 5× pętli), LUFS ±0,5 |
| MT-06 | Motyw jako moduł: `motif(key, mode, style)` + podpis | `tools/music/motif.py` | MT-03 | motyw we wszystkich 12 tonacjach używanych w planie |
| MT-07 | Stemy: renderer „jedna specyfikacja → 3 stemy o równej długości + `_full`" | `tools/music/stems.py` | MT-05 | 3 stemy mają identyczną liczbę próbek |
| MT-08 | Budowanie `assets/data/music.json` ze specyfikacji (id, plik, pętla, głośność, kontekst, stemy) | `tools/music/build_manifest.py` | MT-05 | JSON przechodzi `music-audit.js` |
| MT-09 | `tools/qa/music-audit.js` (7 kontroli, plan 5.10) | skrypt bez sieci | MT-08 | zielony na pustym i pełnym zestawie |
| MT-10 | Arkusz odsłuchu `docs/MUSIC_REVIEW.md`: tabela id, 3 odsłuchy (słuchawki, głośnik laptopa, mono), ocena 1-5, uwagi | dokument | – | wypełniany po każdej partii |

---

## 4. Zadania muzyczne: indeks (144 pliki)

| Zakres | ID zadań | Plików | Etap | Zależy od |
| --- | --- | --- | --- | --- |
| Motyw `theme_cuy` (=`home_main`) | MT-11 | 1 | M1 | MT-06 |
| Jingle (2) | MT-12, MT-13 | 2 | M1 | MT-11 |
| Szumy (9) | MT-14…MT-22 | 9 | M1 | MT-04 |
| Belki pulpitu (4) | MT-23…MT-26 | 4 | M2 | MT-11 |
| Miejsca na zewnątrz (5) | MT-27…MT-31 | 5 | M3 | MT-11 |
| Pokoje (10) | MT-32…MT-41 | 10 | M3 | MT-11 |
| Minigry: 4 gry × 3 stemy + menu | MT-42…MT-46 | 13 (+4 `_full` automatycznie) | M4 | MT-07 |
| Płyty: 24 płyty × 4 utwory | MT-101…MT-124 | 96 | M5 (seria po serii) | MT-11 |

Plików twórczych: 1+2+9+4+5+10+13+96 = **140**; plus 4 pliki `_full` renderowane automatycznie = **144**.
Każde zadanie kończy się wspólnym odbiorem: (1) `music-audit` zielony, (2) wypełniony wiersz w `MUSIC_REVIEW.md`, (3) wyróżnik z promptu słyszalny w odsłuchu, (4) licencja: „własna, wygenerowana kodem" w `assets/LICENSES/music.md`.

---

## 5. Prompty: motyw, jingle, szumy

### MT-11 `theme_cuy` (także `home_main`)
- **Rola:** wizytówka gry; pętla głównego widoku Domku. Cel: -18 LUFS, 32 takty (≈ 83 s przy 92 BPM), pętla.
- **Parametry:** 92 BPM, 4/4, swing 58%, **a-moll → C-dur** (część A: a-moll, część B: C-dur, powrót do A).
- **Progresja:** A (takty 1-8): Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | E7♭9 | Am9. B (9-16): Fmaj9 | Em7 A7 | Dm9 | G13 | Cmaj9 | Am7 | Dm9 G7 | Cmaj9 G13.
- **Struktura:** A(8) B(8) Aʹ(8) B-zakończenie(8) z wygaszaniem ogona do początku.
- **Warstwy:**
  1. Melodia: `BELL` + `P12` na unisono (BELL -3 dB). Takty 1-2 motyw pełny (A4 B4 C5 E5 w a-moll), takty 3-4 odpowiedź podpisem w dół, 5-8 swobodna linia pentatoniczna A-C-D-E-G, długie nuty.
  2. Akordy: `EP` (P25 + vibrato), rozłożone w synkopie na „i" 2 i 4, -6 dB.
  3. Bas: `TRI` + `PIZ`, korzeń na 1, kwinta na „i" 3, bossanowy wzór (1, -, 5, 5), -4 dB.
  4. Perkusja: `BRSH` miotełki na 2 i 4 (-12 dB), `SHK` ósemki cichutko (-18 dB), stopa `KICK` miękka na 1 i „i" 2 (-14 dB). Brak werbla.
  5. Ozdoba: `GLK` pojedyncze dźwięki co 4 takty (-14 dB).
- **Efekty:** `REV-S` na całość 10%; `REV-M` na `BELL` 18%.
- **Dynamika:** takty 1-4 bez perkusji (wejście motywu), 5 wejście miotełek, 9 wejście basu pełnego.
- **Pętla:** ostatni takt kończy się Dm9 G13, wracając w Am9; ogon pogłosu zawinięty.
- **Zakazy:** żadnej melodii szybszej niż ósemki; bez blachy; bez crashu.

### MT-12 `jingle_birthday`
- **Rola:** zdarzenie `Birthday` (`Pet.cs:177`). 5 s, mono, -14 LUFS, bez pętli, ogon pogłosu wliczony.
- **Parametry:** 108 BPM, 4/4, **C-dur**.
- **Przebieg (takty po 2,2 s):**
  - 0,0-0,5 s: trójdźwięk C (C5 E5 G5) w górę, `GLK` ósemki.
  - 0,5-2,4 s: motyw Cuy pełny (C5 D5 E5 G5, rytm jak w części 2), `GLK` + `P12` (oktawa niżej, -6 dB).
  - 2,4-3,6 s: odpowiedź „imprezowa": róg `P25` (staccato) G4 G4 C5 (wesoły „tu-tu-tuu"), pod spodem `XYL` arpeggio C-E-G-C.
  - 3,6-5,0 s: ostatni akord Cmaj9 (C4 E4 G4 D5) przytrzymany, kończy na przytrzymanej kwincie (G5 w `BELL`), zanik 1,2 s.
- **Warstwy:** `GLK` (0 dB), `P12` (-6), `P25` róg (-4), `XYL` (-10), `TRI` bas (korzeń C3 na pierwszym i ostatnim akordzie, -8), `SHK` konfetti: szum 6-10 kHz rozproszony 2-4 s (-20 dB).
- **Efekty:** `REV-M` 16%.
- **Zakazy:** bez perkusji z werblem; bez „Happy Birthday" (żadnej cudzej melodii).

### MT-13 `jingle_stage`
- **Rola:** zdarzenie `StageChanged` (`Pet.cs:163`). 3-5 s, mono, -14 LUFS.
- **Parametry:** 96 BPM, **G-dur**.
- **Przebieg:** (1) arpeggio w górę `GLK` G4-B4-D5-G5-B5 ósemkami (1 s), (2) podpis Cuy w G-dur: A4 B4 D5 (`BELL` + `P12`), (3) akord Gmaj9 przytrzymany 1,5 s, (4) cichy `HARP` glissando w dół jako „uśmiech" (0,6 s).
- **Warianty kodem (bez nowych plików):** dla Legend dochodzi złota warstwa (`HARP` podwaja podpis oktawę wyżej, `PAD` na D4 pod spodem); dla Senior tempo ×0,85; dla Baby oktawa wyżej i `CEL` zamiast `BELL`. Jeden plik bazowy, warianty z `arrangements` w `music.json`.
- **Warstwy:** `GLK` (0), `BELL` (-3), `P12` (-6), `HARP` (-12), `PAD` (-14, tylko Legend).
- **Zakazy:** nie dłużej niż 5 s; bez perkusji.

### Szumy (MT-14…MT-22): wszystkie bez melodii, generowane kodem

| ID | Plik | Prompt |
| --- | --- | --- |
| MT-14 | `noise_vinyl_crackle` | Pętla 8 s, stereo. Impulsy Poissona 4-12/s, amplituda lognormalna (-42…-28 dB), krótkie (0,3-1,5 ms), co ~2 s większy „pop" (-24 dB), do tego niski szum brązowy -50 dB, górnoprzepust 200 Hz. Bez regularności słyszalnej jako rytm. Pętla bezszwowa. |
| MT-15 | `noise_needle_drop` | 0,9 s, stereo. „Uderzenie igły": cichy puls niskiego tonu 90 Hz (60 ms, -18 dB), szum szczotkowy narastający 0,25 s i rozpływający się w trzask winylu; pierwsze 40 ms bez trzasku (cisza przed igłą). |
| MT-16 | `noise_needle_lift` | 0,6 s. Odwrócony wariant: trzask → nagły spadek, końcowy „stuk" 140 Hz (-20 dB), 80 ms. |
| MT-17 | `noise_needle_skip` | 0,35 s. Przesunięcie szumu pasmowego 2→6 kHz w 120 ms, dwa pop-y -20 dB co 90 ms, urwany ogon. |
| MT-18 | `noise_rain` | Pętla 12 s, stereo. Szum różowy z górnoprzepustem 400 Hz, -34 dB; krople: losowe kliknięcia sinus 3-6 kHz o zaniku 8 ms (60/s), co 3 s „rozbryzg" 80 ms. Dach: dodatkowy pasmowy rezonans 220 Hz, -46 dB. |
| MT-19 | `noise_wind` | Pętla 14 s. Szum różowy z filtrem pasmowym przemiatanym 300-900 Hz LFO 0,1 Hz, szczyt co ~7 s; ledwo słyszalny gwizd sinus 700 Hz (-48 dB). Bez wyraźnych porywów powyżej -30 dB. |
| MT-20 | `noise_birds` | Pętla 20 s, stereo. 5 typów ćwierknięć: sinus przemiatany 2,5→4,5 kHz (60 ms), trylek 3 impulsów 3,8 kHz (120 ms), „piu" 3→2,2 kHz (140 ms), krótkie „ci" 5 kHz (25 ms), dwugłos. Przerwy losowe 0,4-3 s, dwa ptaki naraz w różnych panoramach, poziom -30…-24 dB. |
| MT-21 | `noise_crickets` | Pętla 16 s. Trylki 4,3 kHz po 3 impulsy (20 ms co 35 ms), 4-5 świerszczy w różnych panoramach, każdy ze stałym własnym tempem (±5%), poziom -34 dB, delikatne falowanie. |
| MT-22 | `noise_room_tone` | Pętla 10 s. Szum brązowy z dolnoprzepustem 400 Hz na -50 dB + cichy rezonans 120 Hz (-56 dB) + okazjonalny „skrzyp" drewna (szum pasmowy 600 Hz, 150 ms, -46 dB, co ~6 s). |

---

## 6. Prompty: belki pulpitu (jedna pętla = jeden głos prowadzący, bez perkusji)

### MT-23 `bed_morning`
- **Parametry:** 70 BPM, 4/4, **C-dur / G-dur** (takty 1-24 C-dur, 25-48 G-dur, wracamy do C), 48 taktów (≈ 2:44), pętla.
- **Progresja:** Cmaj9 | Cmaj9 | Am9 | Fmaj9 | Cmaj9 | Em7 | Dm9 | G13sus (x3 w C), potem Gmaj9 | Gmaj9 | Em9 | Cmaj9 | Gmaj9 | Bm7 | Am9 | D13sus.
- **Warstwy:** (1) `PAD` długie akordy, -6 dB. (2) `BELL` rzadkie nuty melodii pentatonicznej (C-D-E-G-A), 1 nuta na 2 takty, -4 dB. (3) `P12` szarpnięcia na „i" 3 co 4 takty, -10 dB. (4) `noise_birds` ćwierkanie, -20 dB, wejście od taktu 5. (5) co 16 taktów podpis Cuy w `BELL`, -4 dB.
- **Efekty:** `REV-L` 24% na dzwonkach. Jasny, szeroki stereo, bez basu poniżej 80 Hz.
- **Zakazy:** żadnej perkusji, żadnej linii melodycznej gęstszej niż ćwierćnuty.

### MT-24 `bed_day`
- **Rola:** najcichsza belka; prawie cisza, przyjazna drzemce.
- **Parametry:** 60 BPM, 4/4, **F-dur**, 48 taktów (3:12), pętla.
- **Progresja:** Fmaj9 (8 taktów) | Dm9 (4) Gm9 (4) | Bbmaj9 (4) C13sus (4) | Fmaj9 (8), długie wymiany.
- **Warstwy:** (1) `PAD` długi, wolne poruszenie filtra 0,03 Hz, -3 dB. (2) `noise_room_tone` ciągły, -28 dB. (3) Jedno szarpnięcie `P12` (nuta z akordu, F5/A5/C6) co 6-10 s (losowo z `seed`), -14 dB. Brak melodii ciągłej i motywu Cuy.
- **Efekty:** `LP(5 kHz)` całość; `REV-M` 20%. Dynamika prawie płaska.
- **Zakazy:** żadnych dźwięków, które „zwracają uwagę"; brak basu rytmicznego.

### MT-25 `bed_evening`
- **Rola:** lo-fi jazz wieczorny, 17-22.
- **Parametry:** 76 BPM, 4/4, swing 64%, **B♭-dur (A) / g-moll (B)**, 56 taktów (2:57).
- **Progresja:** A (16): Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 F13 (x2, w 2. powtórzeniu ii-V-I na końcu). B (16): Gm9 | Cm9 | F13 | Bbmaj9 | Em7♭5 A7♭9 | Dm9 G7 | Cm9 F13 | Bbmaj9. Co 8 taktów ii-V-I: Cm9 F13 Bbmaj9.
- **Warstwy:** (1) `EP` akordy rozłożone, voicing blisko, -3 dB. (2) Melodia `EP` wyżej lub `BELL` (A4-D5), nuty długie, wejście co drugi takt, -5 dB. (3) `TRI` bas „walking" ćwierćnutami (korzeń-kwinta-przejście), -4 dB. (4) `BRSH` na 2 i 4 + `SHK` trioli, -14 dB. (5) `noise_vinyl_crackle` -42 dB (bardzo cicho).
- **Efekty:** `TAPE(0.2%)` całość, `LP(8 kHz)`, `REV-S` 12%.
- **Zakazy:** brak stopy; solo `EP` nie dłuższe niż 4 takty.

### MT-26 `bed_night`
- **Rola:** gra tylko przy „Muzyka w nocy". Pozytywka, prawie cisza.
- **Parametry:** 54 BPM, 4/4, **D-dorycki**, 36 taktów (2:40), pętla.
- **Progresja:** Dm9 (8) | Em7 (4) G6/D (4) | Dm9 (8) | Bbmaj7 (4) C6/9 (4) | Dm9 (4).
- **Warstwy:** (1) `BOX` melodia pentatoniczna D-F-G-A-C, 1 nuta na takt, symetryczne frazy, -3 dB; co 12 taktów podpis Cuy (D4 E4 F4 w dorycku). (2) `PAD` bardzo cichy na D3-A3, -16 dB. (3) `CEL` pojedyncze gwiazdki 4 oktawy wyżej losowo co 8-14 s, -20 dB.
- **Efekty:** `REV-L` 30%, `LP(4 kHz)`, bez basu.
- **Zakazy:** żadnego pulsu rytmicznego; nie za jasno (brak dźwięków powyżej 5 kHz).

---

## 7. Prompty: miejsca na zewnątrz (pętle 80-100 s)

W nocy ta sama pętla przechodzi przez `LP(1,8 kHz)` -6 dB w kodzie. Nie renderujemy wariantu nocnego.

### MT-27 `place_garden_day`
- 88 BPM, 4/4, swing 58%, **G-dur**, 32 takty (≈ 87 s), pętla.
- Progresja: G | Em7 | Cmaj7 | D7 (x2) | G | Bm7 | Am7 | D7sus D7 (x2).
- Warstwy: (1) `BNJ` melodia pentatoniczna G-A-B-D-E, szarpnięcie w synkopie („i" 2), -2 dB. (2) `BNJ` akord rozłożony ósemkami, -8 dB. (3) `TRI` bas ćwierćnutami root-fifth, -5 dB. (4) `SHK` na „i" 2 i 4, -18 dB. (5) `noise_birds` -22 dB.
- Wyróżnik: szarpnięcie banjo na synkopie; podpis Cuy (A4 B4 D5) w takcie 32.
- Efekty: `REV-S` 10%. Zakaz: perkusja bez miotełek.

### MT-28 `place_garden_evening`
- 69 BPM, 4/4, swing 60%, **E-miksolidyjska (E F♯ G♯ A B C♯ D)**, 32 takty (≈ 111 s).
- Progresja: E7 | D | A | E7 (x2) | E7 | Bm7 | A | E7 (x2) (kolor miksolidyjski: D-dur).
- Warstwy: (1) `P12` melodia długimi nutami, ciepły filtr 3 kHz, -3 dB. (2) `PAD` na E-B, -8 dB. (3) `TRI` bas wchodzący od taktu 9 (nie od razu), -6 dB. (4) `noise_crickets` -22 dB. (5) `BELL` co 8 taktów pojedyncza nuta (G♯5), -14 dB.
- Wyróżnik: ocieplenie, wolniej; bas wchodzi późno. Zakaz: perkusja.

### MT-29 `place_park`
- 96 BPM w 3/4, **D-dur**, 32 takty (≈ 80 s), pętla. Łatwy folkowy walc.
- Progresja: D | A7 | D | G | D | Bm | Em7 A7 | D (x2) | G | D | Em7 | A7 | D | Gmaj7 | A7 | D.
- Warstwy: (1) `P12` melodia prosta, motyw Cuy w taktach 1-2 (D5 E5 F♯5 A5), -2 dB. (2) `P12` akompaniament „oom-pa-pa" (bas na 1, akord na 2-3), -6 dB. (3) `TRI` bas na 1 (korzeń), -5 dB. (4) `BRSH` na 2 i 3, -16 dB. (5) opcjonalnie dalekie głosy dzieci: szum formantowy 800/1500 Hz, wzmacniany losowo -34 dB, co 6-10 s.
- Wyróżnik: akcent na „raz". Zakaz: ostry puls 50%.

### MT-30 `place_farm`
- 100 BPM, 4/4, shuffle 66%, **A-dur**, 32 takty (≈ 77 s).
- Progresja: A | A | D | A | E7 | D | A | E7 A (x2, bluesowe 12 taktów w pierwszych 12; reszta wariacja).
- Warstwy: (1) `BNJ` melodia + ślizgi `P12` (portamento 90 ms) w stylu slide, -2 dB. (2) `BNJ` akompaniament shuffle (ćwierć-triola, trójdźwięk), -7 dB. (3) `TRI` bas root-fifth, -5 dB. (4) `BRSH` shuffle, -14 dB. (5) `HAT` jako zegar, -22 dB.
- Wyróżnik: ślizgi slide; krótkie „kogutowe" `P12` nawołanie (A5-E6) raz w takcie 17. Zakaz: banjo głośniejsze niż bas.

### MT-31 `place_market` (także sklep)
- 116 BPM, 4/4, swing 64%, **B♭-dur**, 32 takty (≈ 66 s).
- Progresja: Bb6 | G7 | Cm7 F7 | Bb6 (x2) | Eb6 | Ebm6 | Bb/D G7 | Cm7 F7 Bb6 (x2).
- Warstwy: (1) `P25` stabsy „blacha" na „i" 2 i 4 (Bb-D-F-A), -4 dB. (2) Melodia `P25`, sekwencje trzynutowe, motyw Cuy w taktach 5-6, -3 dB. (3) `TRI` walking bass, -4 dB. (4) `BRSH` + `HAT` swing, -12 dB. (5) `BELL` „dzwonek sklepowy": dwie nuty (E6 C6) co 8 taktów (tag), -8 dB.
- Wyróżnik: tag dzwonka sklepowego. Zakaz: werbel; tylko miotełki.

---

## 8. Prompty: pokoje (10 pętli, 80-110 s)

Komfort w kodzie: niski = `LP(3 kHz)`, wysoki = `LP(12 kHz)`, `PAD` +2 dB przy komforcie 100. W v1 pokój to jeden plik (bez stemów): kod filtruje cały miks i przy komforcie 100 podnosi jego poziom o 2 dB.

### MT-32 `place_room_salon`
- 76 BPM, **F-dur**, 32 takty (≈ 101 s). Przytulne lo-fi, drewno i lampka.
- Progresja: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 (x2) | Bbmaj9 | Am7 D7♭9 | Gm9 | C13sus C13 (x2).
- Warstwy: `EP` (pianino puls 25%) akordy + 4-nutowe frazy, -3; `TRI` bas, -5; `BRSH` miotełki, -14; `noise_vinyl_crackle` -42 na wejściu (pierwsze 4 takty głośniej: -34).
- Wyróżnik: ciepły trzask winylu na wejściu. Zakaz: stopa.

### MT-33 `place_room_bedroom`
- 60 BPM, **D-dorycki**, 24 takty (96 s). Wolna kołysanka.
- Progresja: Dm9 | Em7 | Gmaj7 | Dm9 (x6).
- Warstwy: `BOX` melodia (D-F-G-A), 1 nuta na takt, -3; `PAD` -14. Brak basu.
- Efekty: `REV-L` 28%. Zakaz: jakikolwiek puls.

### MT-34 `place_room_playroom`
- 100 BPM, **C-dur**, 32 takty (77 s). Zabawna pozytywka i ksylofon.
- Progresja: C | G7 | C | F | C | Am | D7 G7 | C (x2) | F | C | G | C | Dm7 G7 | C.
- Warstwy: `XYL` melodia staccato (motyw Cuy w takcie 1-2, potem zabawne powtórki), -2; `BOX` kontrapunkt, -8; `TRI` bas „skok" (octave jump root-root8), -4; `SHK` -20.
- Wyróżnik: staccato, dzieciństwo. Zakaz: swing.

### MT-35 `place_room_dorm` (wspólna sypialnia)
- 64 BPM, **G-dur**, 32 takty (120 s). Miękka kołysanka zespołowa, cieplejsza niż sypialnia.
- Progresja: Gmaj9 | Em7 | Cmaj9 | D13 (x2) | Gmaj9 | Bm7 | Am7 | D13 (x2).
- Warstwy: kanon trzygłosowy: `BOX` temat (takt 1), `CEL` ten sam temat z opóźnieniem 2 takty (takt 3), `P12` ciepły filtr 2 kHz opóźnienie 4 taktów (takt 5), każdy -3/-6/-9 dB; `PAD` -12; `TRI` bas od taktu 9, -8.
- Wyróżnik: trzy głosy w kanonie. Zakaz: perkusja.

### MT-36 `place_room_kuki` („calm meadow")
- 72 BPM, **G-dur**, 32 takty (107 s). Pastoralny, przewiewny, wolniejszy od ogrodu.
- Progresja: Gmaj7 | Cmaj7 | Am7 | D7sus (x2) | Em7 | Cmaj7 | Gmaj7/B | Am7 D7.
- Warstwy: `P12` melodia pentatoniczna z ozdobnikami, -3; `PAD` -9; `TRI` bas co 2 takty, -8; `noise_wind` -26.
- Wyróżnik: wiatr. Zakaz: banjo (to ogród).

### MT-37 `place_room_ned` („snack nook")
- 104 BPM, swing 62%, **B♭-dur**, 32 takty (74 s).
- Progresja: Bb6 | Gm7 | Cm7 F7 | Bb6 (x2) | Eb6 | Cm7 | Dm7 G7 | Cm7 F7 Bb6 (x2).
- Warstwy: `P25` stabsy „blacha" (Bb-D-F), -4; `PIZ` bas pizzicato (walking), -3; `BRSH` -14; `XYL` figura „chrupania": 4 szybkie szesnastki staccato (D6 D6 D6 D6) w takcie 8 i 24, -8.
- Wyróżnik: motyw chrupania. Zakaz: dzwonki.

### MT-38 `place_room_james` („safe hideout")
- 56 BPM, **D-dorycki**, 24 takty (103 s). Najciszej ze wszystkich pokoi.
- Progresja: Dm9 | Dm9 | Gmaj7 | Dm9 (x6, minimalne zmiany).
- Warstwy: `BOX` pojedyncze nuty (D5 A5 F5), 1 na 2 takty, -6; `PAD` -18; `noise_room_tone` -34.
- Efekty: `REV-L` 30%, `LP(3,5 kHz)`. Zakaz: wszystko, co głośniejsze od -26 LUFS; bez podpisu Cuy.

### MT-39 `place_room_glen` („cosy reading corner")
- 68 BPM, swing 60%, **E♭-dur**, 32 takty (113 s). Ballada jazzowa.
- Progresja: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 (x2) | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 (x2, odwrócone ii-V: kadencje Fm9 Bb13 przed Ebmaj9).
- Warstwy: `EP` akordy i melodia, -3; `BRSH` -16; `TRI` bas co 2 takty, -7; `BELL` pojedyncze nuty w tle, -16.
- Wyróżnik: odwrócone ii-V. Zakaz: szybkie przejścia.

### MT-40 `place_room_racuch` („play corner")
- 108 BPM, **C-dur**, 32 takty (71 s). Zabawny, skoczny.
- Progresja: C | F | G7 | C (x2) | Am | Dm7 | G7 | C (x2).
- Warstwy: `P12` melodia z podskokami (oktawowe skoki w górę co takt), -2; `XYL` -8 pod spodem; `TRI` bas „skok" z oktawą, -4; `SHK` na „i", -20.
- Wyróżnik: rytm podskoków (ósemka-pauza-ósemka). Zakaz: moll.

### MT-41 `place_room_default` (3 domyślne motywy bez nastroju)
- 80 BPM, **A-dur**, 32 takty (96 s). Ciepły neutralny.
- Progresja: Amaj9 | F#m9 | Dmaj9 | E13 (x2) | Amaj9 | C#m7 | Dmaj9 | E13sus E13 (x2).
- Warstwy: `P12` melodia, -3; `TRI` bas, -6; `BELL` dzwonek co 4 takty, -10; `PAD` -12; `SHK` -22.
- Wyróżnik: neutralność (nie ma nic charakterystycznego). Zakaz: charakterystyczne ozdobniki.

---

## 9. Prompty: minigry (stemy równej długości, jeden zegar)

Każda gra: 3 stemy o identycznej liczbie próbek i tempie: `_base` (bas i pad), `_rhythm` (perkusja szumowa), `_lead` (melodia). `_full` renderowany automatycznie. Podpis Cuy (3 nuty) przy końcu pętli w `_lead`. Wszystkie stemy mają pętlę zszytą razem (te same `loopStart/loopEnd`). Cel: -16 LUFS dla sumy.

### MT-42 `mg_veggie_rain_*`
- 132 BPM (+6/poziom w kodzie), 4/4, **C-dur**, 16 taktów (≈ 29 s), pętla. Skoczny chiptune.
- Progresja: C | G | Am | F | C | G | F | G7 (x2).
- `_base`: `TRI` bas ósemkami (korzeń-oktawa), -3 dB; `PAD` P25 -10 dB. Wejście od startu.
- `_rhythm`: `KICK` na 1 i 3, `SNR` na 2 i 4, `HAT` ósemki, -3/-3/-12 dB; CRUSH tylko na `HAT`. Wejście po 10 s w kodzie.
- `_lead`: `P25` melodia radosna (motyw Cuy w taktach 1-2, 9-10), `GLK` wsparcie na akcentach, -2 dB. Wejście po 25 s.
- Ostatnie 15 s: kod podbija tempo +10% (zastępuje `games_boss`).
- Zakaz: melodia zdominowana przez bas.

### MT-43 `mg_hay_maze_*`
- 108 BPM (+10 w ostatnich 15 s), 4/4, **a-moll**, 16 taktów (≈ 36 s). Napięty, ale słodki.
- Progresja: Am | Am | F | E7 (x4), z tonikalnym ostinato.
- `_base`: `TRI` ostinato ósemkami A2-A2-E3-A2 (3-nutowy wzór), -3; `PAD` cichy -14.
- `_rhythm`: „tykanie" `HAT` ćwierćnutami, -8; `KICK` na 1, co 4 takty fill `SNR` 3 uderzenia (-6).
- `_lead`: `P12` rzadka melodia (jedna fraza 2 takty co 4 takty), motyw Cuy w molu (A4 B4 C5 E5) raz na pętlę, -2. Wejście z nowego wywołania `onTimeLeft`.
- Wyróżnik: ostinato basu. Zakaz: więcej niż 2 nuty melodii na takt.

### MT-44 `mg_veggie_memory_*`
- 72 BPM, 4/4, **F-dur**, 16 taktów (≈ 53 s). Spokojna pozytywka, bez presji.
- Progresja: Fmaj7 | Dm7 | Gm7 | C7 (x4).
- `_base`: `PAD` + `TRI` bas co 2 takty, -4/-8.
- `_rhythm`: wyłącznie delikatne `SHK` na „i" i `BRSH` na 2 i 4, -18.
- `_lead`: `BOX` melodia + `CEL` kontrapunkt, wejście „rosnące z poziomem" (kod), -3/-9. Tempo stałe.
- Zakaz: stopa, werbel; żadnych szybkich nut.

### MT-45 `mg_nyan_cuy_*`
- 136 BPM, 4/4, **e-moll**, 16 taktów (≈ 28 s). Szybki taniec chiptune, **własny** motyw (nie Nyan Cat; zakaz zbliżania się do jego melodii i skali).
- Progresja: Em | C | D | Bm (x4); w drugiej połowie Em | Am | B7 | Em.
- `_base`: `TRI` bas z synkopą (1 i „i" 2, 4), -3; `P50` pad akordowy -12 (wolno P50 w tym utworze, jak seria 4).
- `_rhythm`: pełny kit: `KICK` four-on-the-floor, `SNR` 2 i 4, `HAT` szesnastki, CRUSH na perkusji, -3/-3/-14. Wejście przy 200 pkt.
- `_lead`: `P25` melodia własna, wędrowna (E5 G5 B5 A5 G5 E5 ... w pentatonice e-moll), motyw Cuy w odwróceniu w taktach 13-14, -2; `GLK` podwajanie wyniku 600 pkt, -8.
- Warstwy wg wyniku: 0, 200, 600 pkt (kod). Zakaz: skala i rytm znanej piosenki o kocie.

### MT-46 `mg_menu` (bez stemów)
- 112 BPM, 4/4, shuffle 62%, **G-dur**, 16 taktów (≈ 34 s). Krótki wesoły shuffle, pętla.
- Progresja: G | Em7 | C | D7 (x4).
- Warstwy: `P25` melodia, -2; `BNJ` akompaniament, -8; `TRI` bas, -4; `BRSH` + `KICK` miękka na 1 i 3, -12/-14; `GLK` na 4. takcie, -10.
- Wyróżnik: wesołość. Zakaz: napięcie.

---

## 10. Prompty: płyty (24 płyty × 4 utwory = 96 plików)

### 10.1 Reguły wspólne dla czterech utworów każdej płyty

| Utwór | Rola | Reguły |
| --- | --- | --- |
| **A1** | podpisowy | Pierwsze 2 takty **cytują motyw Cuy** (część 2) w tonacji płyty. Struktura: A(8) Aʹ(8) B(8) A″(reszta), podpis Cuy na ostatnich 2 taktach. Długość: liczba taktów z tabeli (rzadkie i unikatowe +4 takty, dodatkowy głos opisany w prompcie) |
| **A2** | spokojna wersja | Te same akordy i melodia, tempo -10% (`A2` w tabeli tempa), **bez perkusji** (żadnych `KICK/SNR/HAT/BRSH/SHK`), bas uproszczony do korzenia na 1, ozdobniki melodii usunięte, `REV-M` +6% |
| **B1** | energiczny | Tempo +8%, pełna sekcja rytmiczna gatunku, dodatkowy głos kontrmelodii (`XYL`/`BELL`/`P12`, -9 dB), po 24. takcie **mostek 8 taktów** (zamiana subdominanty, nowy rejestr), potem powrót tematu |
| **B2** | nastrojowy | Tempo ×0,8, **bez perkusji**, tylko `PAD` + jeden głos solowy + warstwa szumu serii (poniżej), pętla 4 akordów z pierwszych taktów A1, w ostatnich 4 taktach motyw Cuy w odwróceniu (zjazd 5-3-2-1). Długość `ceil(95 s × BPM / 240)` do wielokrotności 4 |

Warstwa szumu serii dla B2: seria 1 `noise_vinyl_crackle` -38 dB; seria 2 `noise_wind` lub `noise_birds` -30 dB; seria 3 `noise_room_tone` -34 dB + gwiazdki `CEL`; seria 4 szum eteru (szum biały, `HP(5 kHz)`, -42 dB).
Wszystkie płyty: -16 LUFS, szczyt ≤ -1 dBTP, 90-120 s, bez pętli (płyty grają od A do końca; ogon pogłosu zostaje).
Zadanie dla płyty = 4 specyfikacje (`rec_<id>_a1`, `_a2`, `_b1`, `_b2`) + 4 pliki OGG + wiersz w `MUSIC_REVIEW.md`.
Odbiór dodatkowy: A1 i A2 rozpoznawalnie „ta sama płyta"; B1 wyraźnie żwawszy; B2 niczego nie przypomina głośnością.

Tempa: `A1 / A2 / B1 / B2` w BPM.

### 10.2 Seria 1: Siano & lofi (wnętrze, ciepło)

**MT-101 `s1_poranek` Poranek w sianie** (common, płyta startowa). 78 / 70 / 84 / 62 BPM, C-dur, 32 takty.
- Progresja: Cmaj9 | Am9 | Dm9 | G13 (x2) | Fmaj9 | Em7 | Dm9 | G13sus G13 (x2).
- Warstwy: `P12` melodia, dłuższe nuty pentatoniczne (C-D-E-G-A), -3; `EP` akordy na „i" 2 i 4, -6; `TRI` bas z wolnym pulsem, -4; `KICK` miękka (1, „i" 2), `HAT` ósemki cichutko, `SNR` miękki szum na 2 i 4 (lo-fi hip-hop), -12/-16/-14; `noise_birds` -24.
- B1 mostek (takty 25-32): Fmaj9 | Em7 | Dm9 | Cmaj9/E | Fmaj9 | Gm9 | C13 | Fmaj9, kontrmelodia `GLK`. B2: `PAD` + `P12` solo (C5 E5 G5), `noise_birds` zamiast winylu, progresja Cmaj9 Am9 Dm9 G13.

**MT-102 `s1_marchewka` Marchewkowy beat** (common). 84 / 76 / 91 / 67 BPM, G-dur, 36 taktów.
- Progresja: Gmaj9 | Em9 | Cmaj9 | D13 (x2) | Bm7 | Em9 | Am9 | D13 (x2).
- Warstwy: `PIZ` bas „szarpany" synkopowany (1, „i" 2, 3, „i" 4), -3; `P12` melodia marchewkowa: 3-nutowe frazy wskazujące w górę (G4 A4 B4, A4 B4 D5), -3; `EP` akordy, -8; `KICK` + `SNR`, `HAT`: „chrupiące" szumy hi-hat (otwarty hat 160 ms na „i" 4), -12/-12/-14.
- Wyróżnik: chrupanie w hi-hat. B1 mostek: Em9 | Am9 | D13 | Gmaj9 ... B2: `PAD` + `PIZ` powolne korzenie.

**MT-103 `s1_deszcz` Deszcz na dachu** (common). 66 / 59 / 71 / 53 BPM, **E♭-dur**, 28 taktów, swing 62%.
- Progresja: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 (x3, ostatni z ii-V na końcu).
- Warstwy: `EP` balladowy fortepian (puls 25%), akordy rozłożone + melodia, -2; `TRI` bas co 2 takty, -6; `BRSH` -16; `noise_rain` pętla przez cały utwór, -26 (w A2 głośniej: -22).
- Wyróżnik: deszcz w tle, ballada jazzowa. B2: `PAD` + `EP` solo, więcej deszczu.

**MT-104 `s1_kubek` Kubek z parą** (common). 92 / 83 / 99 / 74 BPM, F-dur, 40 taktów.
- Progresja: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 (x2) | Bbmaj9 | Am7 D7♭9 | Gm9 | C13 (x2).
- Warstwy: bossa nova: `TRI` bas (1, -, 5, 5) -4; `P25` akordy w rytmie bossy (X..X..X.), -6; `P12` melodia lekka, -3; `BRSH` miotełki (wzór bossa), -12; para: szum różowy `HP(3 kHz)` z obwiednią co 4 takty narastającą i opadającą, -30 dB.
- B1 mostek: Bbmaj9 | Am7 | Gm9 | C13. B2: `PAD` + `BELL` solo, para.

**MT-105 `s1_nocna` Nocna ścieżka** (**rare**, +1 głos). 122 / 110 / 132 / 98 BPM, **D-dorycki**, 56 taktów, swing 66%.
- Progresja: Dm9 | G13 | Dm9 | G13 (x2) | Em9 | A13 | Dm9 | Dm9 (x2), blues dorycki w B.
- Warstwy: `TRI` walking bass ćwierćnutami, -3; `EP` akordy stabs na „i" 2 i 4, -6; `P12` melodia dorycka (D-F-G-A-C), -3; `SNR` miotełkowy (szum 3-8 kHz, miękki) na 2 i 4, `KICK` cicha na 1, `HAT` swing, -12/-14/-14; **dodatkowy głos:** `BELL` blue-note (A♭ jako przejście) co 8 taktów, -12.
- B2: `PAD` + `EP` solo w D-dorycku.

**MT-106 `s1_cichy` Cichy kąt** (common). 60 / 54 / 65 / 48 BPM, C-dur, 24 takty.
- Progresja: Cmaj7 | Am7 | Dm7 | G7 (x6).
- Warstwy: sama pozytywka `BOX` melodia i akord rozłożony; ani basu, ani pada. Poziom -3 dB. `noise_room_tone` -40.
- A2: bez żadnych dodatkowych warstw (jak A1, wolniej). B1: dochodzi `CEL`. B2: `BOX` + `PAD` bardzo cichy.

### 10.3 Seria 2: Ogród (plener, akustyka)

**MT-107 `s2_rosa` Rosa** (common). 72 / 65 / 78 / 58 BPM, G-dur, 32 takty.
- Progresja: Gmaj7 | Cmaj7 | Am7 | D7sus (x2) | Em7 | Bm7 | Cmaj7 | D7 (x2).
- Warstwy: `P12` melodia pastoralna, -3; `BELL` krople rosy (pojedyncze nuty, losowo wysoko, G6/D6), -10; `PAD` -9; `TRI` bas co 2 takty, -8; `SHK` ósemki rzadko, -22.
- B2: `PAD` + `BELL` krople.

**MT-108 `s2_pietruszka` Pietruszka funk** (common). 100 / 90 / 108 / 80 BPM, **e-moll**, 40 taktów, swing 54% (16-ki).
- Progresja: Em7 | A13 | Em7 | A13 (x2) | Cmaj7 | B7♭9 | Em7 | A13sus A13 (x2).
- Warstwy: `TRI` bas pulsowy staccato (16-ki, wzór X.XX.X.X), -2; `P25` stabsy „kurczak" wah (LP z LFO 3 Hz, rezonans), -5; `P12` melodia krótka, -4; `KICK` + `SNR` (kit szumowy), `HAT` 16-ki, -3/-3/-12.
- Wyróżnik: staccato bas i wah. B2: `PAD` + `TRI` długie nuty, wiatr.

**MT-109 `s2_pszczoly` Pszczoły** (**rare**, +1 głos). 112 / 101 / 121 / 90 BPM, A-dur, 52 takty.
- Progresja: A | D | A | E7 (x2) | A | F#m | D | E7 A (x2).
- Warstwy: `BNJ` melodia szybka, ósemki, -2; `BNJ` akord rozłożony, -8; `TRI` bas root-fifth, -5; `BRSH` + `HAT` -14; **dodatkowy głos:** `BUZZ` bordun na A3 (sinus 220 Hz + FM 40 Hz), pływający w stereo (LFO panoramy 0,15 Hz), -14.
- Wyróżnik: bzyczący bordun, wchodzi od taktu 9. B2: `PAD` + `BUZZ` + `noise_birds`.

**MT-110 `s2_wiatr` Wiatr w trawie** (common). 58 / 52 / 63 / 46 BPM, D-dur, 24 takty.
- Progresja: Dmaj9 | Bm7 | Gmaj9 | A13sus (x6).
- Warstwy: `PAD` szeroki, filtr przemiatany 600 Hz-2 kHz (LFO 0,05 Hz), -3; `P12` rzadka melodia, 1 nuta na takt, -8; `noise_wind` -22.
- B1: dodatkowo cichy `TRI` bas, `SHK`. B2: tylko `PAD` + wiatr (-18).

**MT-111 `s2_dynia` Dynia** (common). 118 / 106 / 127 / 94 BPM, F-dur, 48 taktów, polka (4/4 „oom-pa").
- Progresja: F | C7 | F | Bb F (x2) | Dm | Gm | C7 | F (x2).
- Warstwy: `ACC` melodia (P25 + tremolo), -3; `TRI` bas oom (1, 3), `P25` „pa" akord na 2 i 4, -4/-6; `HAT` ósemki, -16; `KICK` miękka, -14.
- B2: `PAD` + `ACC` długie nuty, jesienny wiatr.

**MT-112 `s2_jablka` Zimowe jabłka** (common). 90 / 81 / 97 / 72 BPM w **3/4**, **a-moll**, 48 taktów (walc folkowy).
- Progresja: Am | Dm | E7 | Am (x2) | F | C | G | E7 (x2) | Am | Dm | E7 | Am.
- Warstwy: `P12` szarpnięcia melodii, -2; `TRI` bas na 1, `P12` akord na 2-3, -4/-8; `BRSH` na 2-3, -16; `BELL` zimowe kryształki co 8 taktów, -12.
- B2: `PAD` + `P12` solo, `noise_wind`.

### 10.4 Seria 3: Nocne zabawy (dziwnie, unosząc się)

**MT-113 `s3_ksiezyc` Księżyc** (common). 52 / 47 / 56 / 42 BPM, **F-lidyjska**, 20 taktów.
- Progresja: Fmaj7#11 | Gmaj7 | Fmaj7#11 | Em7 (x5).
- Warstwy: `BELL` i `CEL` rozległa melodia (A5 C6 E6), długie nuty, -3; `PAD` -10; `REV-L` 50% mokry.
- Wyróżnik: długi pogłos. B2: `PAD` + `CEL` gwiazdki.

**MT-114 `s3_swietliki` Świetliki** (**rare**, +1 głos). 90 / 81 / 97 / 72 BPM, A-dur, 40 taktów, dream pop.
- Progresja: Amaj7 | F#m9 | Dmaj9 | E6/9 (x2) | Bm9 | E13 | Amaj7 | D6/9 E (x2).
- Warstwy: `PAD` szeroki, -4; `P12` melodia długimi nutami, -4; `TRI` bas, -7; `KICK` miękka + `BRSH`, -14; **dodatkowy głos:** `BELL` losowe migoczące nuty (2-6/takt, skala A, wysoko, każda z losowym panem, -14…-20).
- Wyróżnik: migot dzwonków. B2: `PAD` + `BELL` migoczące.

**MT-115 `s3_sowa` Sowa** (common). 60 / 54 / 65 / 48 BPM, **d-moll** (naturalne), 24 takty.
- Progresja: Dm | Bb | Gm | A7 (x6).
- Warstwy: `BOX` melodia, kołysanka, -3; `PAD` niski na D2-A2 (Dm), -8; `TRI` bas bardzo wolny, -10; skok `BELL` „hu-hu" (dwie nuty D5 A4) co 8 taktów, -10.
- Wyróżnik: straszkowa, ale łagodna. B2: `PAD` + `BOX`.

**MT-116 `s3_kolysanka` Kołysanka** (common). 100 / 90 / 108 / 80 BPM, C-dur, 40 taktów, kołysanka zabawkowej orkiestry.
- Progresja: C | G | Am | F (x2) | C | Em | F | G7 (x2).
- Warstwy: `XYL` melodia, -3; `BOX` akompaniament, -6; `TRI` bas pizzicato, -6; `SHK` -20; `KICK` bardzo miękka (tylko na 1), -18.
- B2: `PAD` + `BOX`.

**MT-117 `s3_tupot` Cichy tupot** (common). 110 / 99 / 119 / 88 BPM, **G-dorycki**, 44 takty, glitch.
- Progresja: Gm7 | C13 | Gm7 | C13 (x2) | Dm7 | Gm7 | Cm7 | F13 (x2).
- Warstwy: `P12` szarpnięcia „na paluszkach" (staccato, ósemki co drugi krok), -4; `TRI` bas, -5; `HAT` szesnastki z lukami, -14; glitch: co 4 takty 1-2 przerwy 80-200 ms z powtórzeniem poprzednich 30 ms (stutter), CRUSH tylko na `HAT`.
- Wyróżnik: krótkie przerwy glitch. B2: `PAD` + pojedyncze szarpnięcia.

**MT-118 `s3_sen` Sen o sianiu** (common). 55 / 50 / 59 / 44 BPM, F-dur, 24 takty, ambient kasetowy.
- Progresja: Fmaj7 | Am7 | Dm9 | Bbmaj7 (x6).
- Warstwy: `PAD` z falowaniem taśmy (`TAPE(0.5%)`, LFO 0,4 Hz), -2; `BELL` rzadkie nuty, -10; szum taśmy -40 dB.
- Wyróżnik: falowanie taśmy. B2: tylko `PAD` + falowanie.

### 10.5 Seria 4: Retro 70-90 (arcade, taniec; wolno `P50` i ostrzejszy kit)

**MT-119 `s4_disco` Disco gryzoń** (**unique**, +1 głos). 120 / 108 / 130 / 96 BPM, a-moll, 52 takty.
- Progresja: Am7 | Dm7 | G7 | Cmaj7 (x2) | Fmaj7 | Bm7♭5 | E7 | Am7 (x2).
- Warstwy: `KICK` four-on-the-floor, -3; `TRI` bas oktawowy ósemkami (A2-A3), -3; `HAT` otwarty na „i", `SNR`+`SHK` klaski na 2 i 4, -12/-6; `P50` melodia, -3; `P25` stabsy akordowe na „i" 2 i 4, -6; **dodatkowy głos:** `GLK` arpeggio cyklu kwintowego co 8 taktów, -10.
- A2: bez perkusji, dyskotekowy „lounge". B2: `PAD` + `P50` solo, szum eteru.

**MT-120 `s4_synth` Synth fala** (**rare**, +1 głos). 105 / 95 / 113 / 84 BPM, **e-moll**, 48 taktów, synthwave.
- Progresja: Em | C | G | D (x4) | Am | C | D | Bm (x2).
- Warstwy: `PAD` szeroki (7 trójkątów ±12 centów, atak 0,8 s), -6; arpeggio `P25` szesnastki (E-G-B-E, w górę i w dół), -4; `TRI` bas ósemkami, -3; `KICK` + `SNR` (gated reverb: ogon 250 ms ucięty), `HAT`, -4/-4/-14; **dodatkowy głos:** `P50` melodia lead, -5.
- B2: `PAD` + arpeggio zwolnione.

**MT-121 `s4_kaseta` Kaseta mixtape** (**rare**, +1 głos). 100 / 90 / 108 / 80 BPM, **d-moll**, 44 takty, funk z falowaniem taśmy wypieczonym w dźwięk.
- Progresja: Dm7 | G13 | Dm7 | G13 (x2) | Bbmaj7 | A7 | Dm7 | G13 (x2).
- Warstwy: `TRI` bas staccato 16-ki, -3; `P25` stabsy wah, -5; `P12` melodia, -4; kit szumowy (`KICK`, `SNR`, `HAT` 16-ki), -3/-3/-12; **dodatkowy głos:** `BELL` hook co 8 taktów.
- Efekty (wypieczone): `TAPE(0.6%)` na całość, wow 0,5 Hz + flutter 6 Hz ±0,15%, szum taśmy -38 dB, `LP(10 kHz)`, saturacja miękka. Zakaz: wyłączanie falowania.

**MT-122 `s4_radio` Radio FM** (common). 96 / 86 / 104 / 77 BPM, C-dur, 40 taktów, ballada radiowa chiptune.
- Progresja: C | Em | F | G (x2) | Am | Em | F | G (x2).
- Warstwy: `P50` melodia (pusty, radiowy, filtr 6 kHz), -3; `TRI` bas, -5; `PAD` -10; `KICK` + `SNR` miękka, -10/-12; szum eteru (biały, `HP(5 kHz)`, -42) z wolnym „strojeniem" (przesunięcie filtra 0,03 Hz).
- B2: `PAD` + `P50` solo, więcej eteru (-36).

**MT-123 `s4_arcade` Arcade** (common). 135 / 122 / 146 / 108 BPM, G-dur, 56 taktów, chiptune dance.
- Progresja: G | D | Em | C (x4) | Am | C | D | G (x2).
- Warstwy: kit szumowy pełny (`KICK` four-on-floor, `SNR` 2 i 4, `HAT` 16-ki + CRUSH), -3/-3/-12; `TRI` bas ósemki, -3; `P25` melodia, -3; `P50` arpeggio, -8; `GLK` co 8 taktów, -10.
- B2: `PAD` + `P25` solo, szum eteru.

**MT-124 `s4_taniec` Taniec w klatce** (**unique**, +1 głos). 130 / 117 / 140 / 104 BPM, **c-moll**, 60 taktów, szybki taniec, **własny motyw** (nie Nyan Cat; zakaz zbliżania się do jego linii, skali i rytmu).
- Progresja: Cm | Ab | Eb | Bb (x4) | Fm | Ab | Bb | Cm (x2).
- Warstwy: kit pełny + CRUSH na perkusji, -3/-3/-12; `TRI` bas ósemki z synkopą, -3; `P50` melodia własna (C5 Eb5 G5 F5 Eb5 C5 …, pentatonika c-moll), motyw Cuy w odwróceniu w taktach 1-2, -3; `P25` kontrmelodia, -8; **dodatkowy głos:** `noise` hi-hat „szum eteru" jako `HAT` ciągły szesnastkowy, -16, oraz `GLK` hook co 4 takty, -9.
- Wyróżnik: najszybszy w grze. B2: `PAD` + `P50` solo, eter.

---

## 11. Kolejność zadań i pakiety

| Pakiet | Zawartość | Zależy | Odbiór |
| --- | --- | --- | --- |
| PM-1 | MT-01…MT-10 (infrastruktura) | – | 3 próbne utwory przechodzą `music-audit` |
| PM-2 | MT-11…MT-22 (motyw, jingle, szumy) | PM-1 | M1 z planu |
| PM-3 | MT-23…MT-26 (belki) | PM-2 | M2 |
| PM-4 | MT-27…MT-41 (miejsca i pokoje) | PM-2 | M3 |
| PM-5 | MT-42…MT-46 (minigry) | PM-2 | M4 |
| PM-6a | MT-101…MT-106 (seria 1) | PM-2, funkcja płyt | M5 |
| PM-6b | MT-107…MT-112 (seria 2) | PM-6a | M5 |
| PM-6c | MT-113…MT-118 (seria 3) | PM-6a | M5 |
| PM-6d | MT-119…MT-124 (seria 4) | PM-6a | M5 |

Zasady dla agentów: jedno zadanie = jedna specyfikacja (lub 4 dla płyty); nie edytować plików innych zadań; po renderze uruchomić `music-audit` i wpisać wiersz w `MUSIC_REVIEW.md`; seed nie zmienia się po zatwierdzeniu odsłuchu.
