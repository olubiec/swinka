# Cuy: muzyka, lista zadań i prompty do każdego dźwięku

Status: wykonawcza rozpiska do `docs/MUSIC_PLAN.md` (decyzje tam zamknięte, tu ich nie zmieniamy). Dla każdego z **144 plików audio** jest zadanie (ID `MT-…`); pełne prompty są w `docs/music_prompts/` (sekcje 5-10 poniżej), fale wykonania w `docs/MUSIC_WAVES.md`.
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

W C-dur: **C4 D4 E4 G4**, rytm: ósemka, ósemka, ósemka, ćwierćnuta z kropką (razem 3 ćwierćnuty, potem ćwierćnuta oddechu). Stopnie: `1 2 3 5`. Schodzi stopniami w górę, na ostatniej nucie skok małej tercji (E→G), kończy na 5. stopniu: przyjaźnie, nie finałowo.
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

## 5-10. Prompty (przeniesione do `docs/music_prompts/`)

Pełne prompty każdego z 60 zadań (36 pętli/jingle/szumów i 24 płyty po 4 utwory) są **generowane** z danych `tools/music/catalog_*.py` poleceniem `python3 tools/music/gen_prompts.py` do `docs/music_prompts/MT-<n>_<id>.md`. Indeks: `docs/music_prompts/INDEX.md`; konwencje i paleta głosów: `docs/music_prompts/README.md`. Zastępują krótsze prompty z pierwszej wersji tego dokumentu (żeby nie było dwóch źródeł prawdy).

Każdy prompt zawiera: parametry (tempo, metrum, swing, tonacja, gama, pentatonika, motyw i podpis w tej tonacji, seed), słownik akordów z nutami, akordy takt po takcie, formę z numerami taktów, tabelę nut melodii (szkielet A i B), tabelę warstw (głos, partia, rejestr, wzór, dB, wejście, pan), siatki perkusji (16 lub 12 kroków), efekty, przebieg dynamiki, szew pętli, wersję angielską do zewnętrznego generatora i warunki odbioru. Płyty mają cztery rozpisane utwory (A1, A2, B1, B2) z długościami i akordami.

Zmiany względem pierwszej wersji tego dokumentu (wynikają z precyzowania):
1. Melodie mają zapisane nuty (szkielety `std/pas/syn/hop/stc/bal/wlz`), a nie opis słowny.
2. Motyw Cuy cytowany w taktach 1-2 wszędzie (targ: było 5-6).
3. Ostatni takt `theme_cuy`: Dm9 G13 (prowadzi do Am9 na początku pętli).
4. A2 krótszy o 4 takty, gdy inaczej przekraczałby 120 s (s1_nocna, s2_pszczoly, s4_synth, s4_taniec). Mostek B1 ma 4 takty zamiast 8, gdy inaczej przekraczałby 120 s.
5. Progresje zapisane jako pełne cykle; brakujące takty (pokój zabaw, targ, park, bed_day, bed_evening) uzupełnione.

Fale wykonania i równoległa praca subagentów: `docs/MUSIC_WAVES.md`.

---

## 11. Kolejność zadań i pakiety

| Pakiet | Zawartość | Zależy | Odbiór |
| --- | --- | --- | --- |
| PM-1 | MT-01…MT-10 (infrastruktura; w `MUSIC_WAVES.md` rozbite na PM-01…PM-06) | – | 3 próbne utwory przechodzą `music-audit` |
| PM-2 | MT-11…MT-22 (motyw, jingle, szumy) | PM-1 | M1 z planu |
| PM-3 | MT-23…MT-26 (belki) | PM-2 | M2 |
| PM-4 | MT-27…MT-41 (miejsca i pokoje) | PM-2 | M3 |
| PM-5 | MT-42…MT-46 (minigry) | PM-2 | M4 |
| PM-6a | MT-101…MT-106 (seria 1) | PM-2, funkcja płyt | M5 |
| PM-6b | MT-107…MT-112 (seria 2) | PM-6a | M5 |
| PM-6c | MT-113…MT-118 (seria 3) | PM-6a | M5 |
| PM-6d | MT-119…MT-124 (seria 4) | PM-6a | M5 |

Zasady dla agentów: jedno zadanie = jedna specyfikacja (lub 4 dla płyty); nie edytować plików innych zadań; po renderze uruchomić `music-audit` i wpisać wiersz w `MUSIC_REVIEW.md`; seed nie zmienia się po zatwierdzeniu odsłuchu.
