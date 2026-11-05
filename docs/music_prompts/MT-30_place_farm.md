# MT-30 · place_farm · Farma

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_farm.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | farma (shuffle, slide) |
| Tempo | 100 BPM |
| Metrum | 4/4 |
| Swing | 66% |
| Takty | 32 (77 s, 1:17) |
| Tonacja | A dur |
| Gama | A B C# D E F# G# |
| Pentatonika | A B C# E F# |
| Motyw Cuy | A4 B4 C#5 E5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | B4 C#5 E5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 97033 |

Charakter: **slide i kogut**. Efekty: REV-S 10%.

### 1.1 Słownik akordów

- `A` = A C# E
- `D` = D F# A
- `E7` = E G# B D

### 1.2 Akordy takt po takcie

- takty 1-8: A | A | A | A | D | D | A | A
- takty 9-16: E7 | D | A | E7 | A | A | A | A
- takty 17-24: D | D | A | A | E7 | D | A | E7
- takty 25-32: A | D | A | A | D | A | E7 | A

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |

### 1.4 Melodia

Szkielet A `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ A4·½ B4·½ C#5·½ E5·1½ r·½ |
| 2 | r·1½ C#5·½ E5·½ F#5·1 r·½ |
| 3 | E5·½ r·½ E5·½ C#5·1 B4·½ r·1 |
| 4 | C#5·1½ A4·½ B4·1 r·1 |
| 5 | r·½ B4·½ C#5·½ D5·½ F#5·1½ r·½ |
| 6 | r·1½ D5·½ F#5·½ G#5·1 r·½ |
| 7 | F#5·½ r·½ E5·½ D5·1 C#5·½ r·1 |
| 8 | B4·1½ C#5·½ A4·2 |

Zakres A: A4-G#5.

Szkielet B `std` (tonacja A dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E5·1 F#5·1 A5·1 F#5·1 |
| 2 | E5·3 r·1 |
| 3 | F#5·1 A5·1 B5·1 A5·1 |
| 4 | F#5·3 r·1 |
| 5 | A5·½ G#5·½ F#5·½ E5·½ F#5·2 |
| 6 | E5·½ F#5·½ E5·½ C#5·½ E5·2 |
| 7 | D5·1 C#5·1 B4·1 C#5·1 |
| 8 | B4·3 r·1 |

Zakres B: B4-B5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (B4 C#5 E5) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BNJ` | melodia + ślizgi P12 (portamento 90 ms) | C4-G5 (wg szkieletu) | wg szkieletu 'syn'; slide na ostatniej nucie fraz | -2 dB | 1 | 0 |
| 2 | akordy | `BNJ` | akompaniament shuffle, trójdźwięk | voicing blisko, C3-G4 (nic poniżej C3) | ćwierć-triola | -7 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas root-fifth | korzenie od A2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1, kwinta na 3 | -5 dB | 1 | 0 |
| 4 | ozdoba | `P12` | kogutowe nawoływanie A5-E6 | oktawa 5-6 | raz w takcie 17 | -8 dB | 17 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 12 triolowych na takt (shuffle)) |
| --- | --- | --- |
| `BRSH` | -14 dB | `X.XX.XX.XX.X` |
| `HAT` | -22 dB | `X.XX.XX.XX.X` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- takty 1-12: dwunastotaktowy blues (A A A A | D D A A | E7 D A E7), potem wariacja
- Pętla: takt 32 A -> takt 1 A.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, A major, 100 BPM, 4/4 time, swing 66%. Instruments: banjo-like pluck, triangle wave (bass/pad), narrow 12.5% pulse wave (plucky, nasal). No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Country shuffle with slide ornaments. Seamless loop.

**Zakaz:** banjo głośniejsze niż bas.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: slide i kogut, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-30.md`.
