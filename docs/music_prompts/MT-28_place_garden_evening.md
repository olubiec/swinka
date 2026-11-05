# MT-28 · place_garden_evening · Ogród wieczór

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_garden_evening.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | ogród wieczorem |
| Tempo | 69 BPM |
| Metrum | 4/4 |
| Swing | 60% |
| Takty | 32 (111 s, 1:51) |
| Tonacja | E miksolidyjski |
| Gama | E F# G# A B C# D |
| Pentatonika | E F# G# B C# |
| Motyw Cuy | E4 F#4 G#4 B4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | F#4 G#4 B4, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 92558 |

Charakter: **ocieplenie, wolniej, bas wchodzi późno**. Efekty: REV-S 12%.

### 1.1 Słownik akordów

- `E7` = E G# B D
- `D` = D F# A
- `A` = A C# E
- `Bm7` = B D F# A

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `E7 | D | A | E7 (x2) | E7 | Bm7 | A | E7 (x2)`)

- takty 1-8: E7 | D | A | E7 | E7 | D | A | E7
- takty 9-16: E7 | Bm7 | A | E7 | E7 | Bm7 | A | E7
- takty 17-24: E7 | D | A | E7 | E7 | D | A | E7
- takty 25-32: E7 | Bm7 | A | E7 | E7 | Bm7 | A | E7

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |

### 1.4 Melodia

Szkielet A `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E4·1 F#4·1 G#4·1 B4·1 |
| 2 | B4·3 r·1 |
| 3 | C#5·1 B4·1 G#4·1 F#4·1 |
| 4 | G#4·3 r·1 |
| 5 | F#4·1 G#4·1 A4·1 C#5·1 |
| 6 | C#5·3 r·1 |
| 7 | B4·1 G#4·1 F#4·1 G#4·1 |
| 8 | E4·4 |

Zakres A: E4-C#5.

Szkielet B `pas` (tonacja E miksolidyjski):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | B4·2 C#5·2 |
| 2 | E5·3 r·1 |
| 3 | F#5·2 E5·2 |
| 4 | C#5·3 r·1 |
| 5 | B4·2 C#5·2 |
| 6 | B4·3 r·1 |
| 7 | A4·2 G#4·2 |
| 8 | F#4·3 r·1 |

Zakres B: F#4-F#5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (F#4 G#4 B4) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | melodia długimi nutami, ciepły filtr 3 kHz | C4-G5 (wg szkieletu) | wg szkieletu 'pas' | -3 dB | 1 | 0 |
| 2 | pad | `PAD` | pad na E-B | C3-C5, szeroko | długie akordy | -8 dB | 1 | szeroko ±35 |
| 3 | bas | `TRI` | bas, wchodzi późno | korzenie od E2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1 | -6 dB | 9 | 0 |
| 4 | szum | `noise_crickets` | świerszcze | - | ciągłe | -22 dB | 1 | szeroko ±50 |
| 5 | ozdoba | `BELL` | pojedyncza nuta G#5 | oktawa 5-6 | co 8 taktów | -14 dB | 8 | R 30 |

**Perkusja:** brak.

**Przebieg / dynamika**

- bas wchodzi od taktu 9, nie od razu
- Pętla: takt 32 -> takt 1 przez PAD.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, E mixolydian, 69 BPM, 4/4 time, swing 60%. Instruments: narrow 12.5% pulse wave (plucky, nasal), detuned triangle pad, triangle wave (bass/pad), soft bell. No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Warm mixolydian dusk with crickets. Seamless loop.

**Zakaz:** perkusja.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: ocieplenie, wolniej, bas wchodzi późno, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-28.md`.
