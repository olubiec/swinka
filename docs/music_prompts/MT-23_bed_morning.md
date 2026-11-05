# MT-23 · bed_morning · Belka rano (6-9)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/beds/bed_morning.ogg` (OGG, -20 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | belka pulpitu rano; jeden głos prowadzący, bez perkusji |
| Tempo | 70 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 48 (165 s, 2:44) |
| Tonacja | C dur |
| Gama | C D E F G A B |
| Pentatonika | C D E G A |
| Motyw Cuy | C4 D4 E4 G4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | D4 E4 G4, ♪ ♪ ♩ |
| Głośność | -20 LUFS |
| Seed | 14987 |

Charakter: **poranek: jasno, szeroko, ptaki**. Efekty: REV-L 24% na dzwonkach; jasny, szeroki stereo; bez basu poniżej 80 Hz (HP 80 Hz).

### 1.1 Słownik akordów

- `Cmaj9` = C E G B D
- `Am9` = A C E G B
- `Fmaj9` = F A C E G
- `Em7` = E G B D
- `Dm9` = D F A C E
- `G13sus` = G C F A E
- `Gmaj9` = G B D F# A
- `Em9` = E G B D F#
- `Bm7` = B D F# A
- `D13sus` = D G C E B

### 1.2 Akordy takt po takcie

- takty 1-8: Cmaj9 | Cmaj9 | Am9 | Fmaj9 | Cmaj9 | Em7 | Dm9 | G13sus
- takty 9-16: Cmaj9 | Cmaj9 | Am9 | Fmaj9 | Cmaj9 | Em7 | Dm9 | G13sus
- takty 17-24: Cmaj9 | Cmaj9 | Am9 | Fmaj9 | Cmaj9 | Em7 | Dm9 | G13sus
- takty 25-32: Gmaj9 | Gmaj9 | Em9 | Cmaj9 | Gmaj9 | Bm7 | Am9 | D13sus
- takty 33-40: Gmaj9 | Gmaj9 | Em9 | Cmaj9 | Gmaj9 | Bm7 | Am9 | D13sus
- takty 41-48: Gmaj9 | Gmaj9 | Em9 | Cmaj9 | Gmaj9 | Bm7 | Am9 | D13sus

### 1.3 Forma

| Takty | Sekcja | Tonacja | Opis |
| --- | --- | --- | --- |
| 1-24 | C-dur | C dur | trzy przebiegi 8-taktowego cyklu w C-dur |
| 25-48 | G-dur | G dur | trzy przebiegi cyklu w G-dur, powrót do C przy zapętleniu |

### 1.4 Melodia

Tryb rzadki: **1 nuta na 2 takty**, wartość = cały okres, pentatonika C D E G A, start na 5. stopniu pentatoniki, ruch ≤ 1 stopień pentatoniki, wybór z `seed`; nuta zawsze zgodna z akordem (3., 5., 9. lub 6. stopień). Frazy symetryczne co 4 okresy (powtórzenie konturu).
Podpis Cuy (D4 E4 G4) wchodzi zamiast zwykłej nuty w miejscach z sekcji „Podpis”.

### 1.5 Podpis Cuy

Podpis (1: D4 E4 G4 / 25: A4 B4 D5) w taktach: 16, 32, 48; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pad | `PAD` | długie akordy | C3-C5, szeroko | jeden akord na takt (lub 2 takty) | -6 dB | 1 | szeroko ±35 |
| 2 | melodia | `BELL` | rzadkie nuty pentatoniczne (C-D-E-G-A; w G-dur G-A-B-D-E) | C4-G5 (wg szkieletu) | 1 nuta na 2 takty, półnuty | -4 dB | 1 | 0 |
| 3 | ozdoba | `P12` | szarpnięcia | oktawa 5-6 | na „i” 3 co 4 takty | -10 dB | 3 | R 30 |
| 4 | szum | `noise_birds` | ćwierkanie | - | ciągłe | -20 dB | 5 | szeroko ±50 |

**Perkusja:** brak.

**Przebieg / dynamika**

- takt 1: sam PAD
- takt 3: pierwsze nuty BELL
- takt 5: wejście ptaków
- podpis Cuy w BELL w taktach 16, 32 i 48 (-4 dB)
- Pętla: takt 48 (G-dur, D13sus) łączy się z taktem 1 (Cmaj9) przez wspólny PAD; ogon zawinięty.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, C major, 70 BPM, 4/4 time. Instruments: detuned triangle pad, soft bell, narrow 12.5% pulse wave (plucky, nasal). No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Bright morning bed with birds. Seamless loop.

**Zakaz:** perkusja; linia melodyczna gęstsza niż ćwierćnuty.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: poranek: jasno, szeroko, ptaki, (3) szew pętli niesłyszalny (test 5× pętli), (4) -20 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-23.md`.
