# Prompty muzyczne: konwencje (czytać razem z promptem zadania)

Prompty `MT-*.md` w tym katalogu są **generowane** (`python3 tools/music/gen_prompts.py`) z danych `tools/music/catalog_*.py`. Agent wykonujący zadanie czyta: swój prompt, ten plik i `tools/music/CONTRACT.md`. Niczego więcej.

## 1. Paleta głosów (jedyna dozwolona)

| Kod | Nazwa | Brzmienie i parametry |
| --- | --- | --- |
| `P12` | puls 12,5% | wąski, nosowy, „banjo/szarpnięcie”; atak 2 ms, zanik 180-350 ms, filtr 4 kHz |
| `P25` | puls 25% | pełniejszy, „blacha/pianino”: atak 3 ms, zanik 250-600 ms |
| `P50` | puls 50% | tylko seria 4, `mg_nyan_cuy`: pusty, „radiowy”; filtr 6 kHz |
| `TRI` | trójkąt | bas i pad: atak 8 ms, zanik wg partii, filtr 1,2 kHz dla basu |
| `PAD` | pad | 3 trójkąty rozstrojone ±7 centów, atak 1,2 s, release 1,5 s, dolnoprzepust 2 kHz |
| `BELL` | dzwonek | sinus + składowe 2,76× i 5,4× (-18/-26 dB), zanik 1,2 s |
| `BOX` | pozytywka | `BELL` z zanikiem 0,6 s, tylko dźwięki z gamy, bez vibrato, `tuning drift` ±4 centy |
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
| `BRSH` | miotełki | szum, filtr 3-9 kHz, obwiednia „swish” 180 ms |
| `HAT` | hi-hat | szum, górnoprzepust 8 kHz, zanik 30 ms (otwarty 160 ms) |
| `SHK` | shaker | szum 5-10 kHz, atak 15 ms, zanik 70 ms |

Efekty: `REV-S` (0,6 s, 12% mokry), `REV-M` (1,4 s, 18%), `REV-L` (3,2 s, 30%, pre-delay 40 ms), `LP(f)`, `HP(f)`, `TAPE(w)` falowanie taśmy ±w %, `VINYL(db)` trzask, `CRUSH` bit-crush 8 bit/12 kHz (tylko perkusja). Procent przy `REV-*` w prompcie zastępuje domyślną wartość mokrej części.

## 2. Zapis

- Nuty: `C4` = środkowe C; `#` krzyż, `b` bemol; w tabelach melodii `nazwa·czas`, czas w ćwierćnutach (`½` = ósemka, `1½` = ćwierćnuta z kropką), `r` = pauza.
- „Stopień” = numer w gamie utworu od toniki w oktawie 4 (1 = tonika, 8 = tonika oktawę wyżej, 9 = sekunda wyżej). W moll i dorycku trzeci stopień to ♭3 (z gamy).
- Takt = 4/4, chyba że napisano 3/4. Siatki perkusji: `X` uderzenie, `O` otwarty hi-hat, `.` cisza; 16 kroków na takt 4/4 (szesnastki), 12 kroków dla 3/4 i dla shuffle 4/4 (triole).
- dB przy warstwie = poziom względem najgłośniejszej warstwy utworu (0 dB). Master: patrz nagłówek zadania.
- Humanizacja: ±8 ms i ±3 dB z `seed`; zmiana `seed` = nowa wariacja bez zmiany stylu. Po zatwierdzeniu odsłuchu `seed` nie zmienia się.
- Pan: w tabeli warstw; kick, bas i melodia w środku.

## 3. Motyw i podpis Cuy

Motyw: stopnie `1 2 3 5` (w moll `1 2 ♭3 5`), rytm ♪ ♪ ♪ ♩. (3 ósemki i ćwierćnuta z kropką), rejestr C4-G5. Podpis: stopnie `2 3 5`, ♪ ♪ ♩. Wersja odwrócona: `5 3 2 1`. Zawsze w tonacji utworu.

## 4. Szkielety melodii

Melodie nie są wymyślane dowolnie: każdy utwór ma szkielet 8 taktów (A, temat) i drugi (B, kontrast) z nazwy w prompcie (`std`, `pas`, `syn`, `hop`, `stc`, `bal`, `wlz`). Tabele nut są w prompcie. Renderer gra szkielet dokładnie, a „humanizacja” działa tylko na czas i głośność. Reguły wariacji (Aʹ, A″, B′), podpis na końcu i tonika są opisane w sekcji 1.3 każdego promptu płyty.

Znaczenie nazw: `std` neutralny, `pas` długie nuty (pastoralny), `syn` synkopy, `hop` podskoki oktawowe, `stc` ciągłe ósemki staccato, `bal` ballada (długie nuty po motywie), `wlz` walc 3/4.

## 5. Płyty: reguły czterech utworów

| Utwór | Reguły |
| --- | --- |
| A1 | podpisowy; forma A(8) Aʹ(8) B(8) A″…; motyw w taktach 1-2; podpis w N−1; tonika w N |
| A2 | tempo −10%, bez perkusji, bas = korzeń na 1, bez ozdobników i dodatkowego głosu; jeśli >120 s, o 4 takty krótszy |
| B1 | tempo +8%, kontrmelodia od taktu 9, perkusja +2 dB, mostek 8 taktów (4, gdy inaczej >120 s) po sekcji B |
| B2 | tempo ×0,8, bez perkusji: `PAD` + jeden głos solo + szum serii; pętla 4 akordów z początku A1; ostatnie 4 takty motyw odwrócony |

Wszystkie płyty: -16 LUFS, szczyt ≤ -1 dBTP, 85-120 s, bez pętli.

## 6. Pozostałe zasady z planu, które zadania zakładają

- Pokój: komfort w kodzie (niski `LP(3 kHz)`, wysoki `LP(12 kHz)`, `PAD` +2 dB przy komforcie 100). Pokój to jeden plik, bez stemów. Miejsca na zewnątrz w nocy: `LP(1,8 kHz)` -6 dB w kodzie, bez osobnego pliku.
- Minigry: stemy `_base`, `_rhythm`, `_lead` o równej liczbie próbek i tych samych punktach pętli; `_full` = automatyczna suma.
- Odbiór każdego zadania: `music-audit` zielony, wiersz w `docs/music_review/MT-<n>.md`, wyróżnik słyszalny, licencja „własna, wygenerowana kodem”.
