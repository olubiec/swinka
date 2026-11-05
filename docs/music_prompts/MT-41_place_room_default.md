# MT-41 · place_room_default · Pokój: domyślny (3 motywy bez nastroju)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_default.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | ciepły neutralny |
| Tempo | 80 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 32 (96 s, 1:36) |
| Tonacja | A dur |
| Gama | A B C# D E F# G# |
| Pentatonika | A B C# E F# |
| Motyw Cuy | A4 B4 C#5 E5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | B4 C#5 E5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 26598 |

Charakter: **neutralność (nic charakterystycznego)**. Efekty: REV-S 10%.

### 1.1 Słownik akordów

- `Amaj9` = A C# E G# B
- `F#m9` = F# A C# E G#
- `Dmaj9` = D F# A C# E
- `E13` = E G# D F# C#
- `C#m7` = C# E G# B
- `E13sus` = E A D F# C#

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `Amaj9 | F#m9 | Dmaj9 | E13 (x2) | Amaj9 | C#m7 | Dmaj9 | E13sus E13 (x2)`)

- takty 1-8: Amaj9 | F#m9 | Dmaj9 | E13 | Amaj9 | F#m9 | Dmaj9 | E13
- takty 9-16: Amaj9 | C#m7 | Dmaj9 | E13sus E13 | Amaj9 | C#m7 | Dmaj9 | E13sus E13
- takty 17-24: Amaj9 | F#m9 | Dmaj9 | E13 | Amaj9 | F#m9 | Dmaj9 | E13
- takty 25-32: Amaj9 | C#m7 | Dmaj9 | E13sus E13 | Amaj9 | C#m7 | Dmaj9 | E13sus E13

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |

### 1.4 Melodia

Szkielet A `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A4·½ B4·½ C#5·½ E5·1½ r·1 |
| 2 | r·1 B4·½ C#5·½ E5·2 |
| 3 | E5·1 D5·½ C#5·½ D5·1 C#5·1 |
| 4 | B4·1½ C#5·½ B4·2 |
| 5 | B4·½ C#5·½ D5·½ F#5·1½ r·1 |
| 6 | r·1 C#5·½ D5·½ F#5·2 |
| 7 | G#5·1 F#5·½ E5·½ C#5·1 E5·1 |
| 8 | E5·1½ C#5·½ B4·1 A4·1 |

Zakres A: A4-G#5.

Szkielet B `pas` (tonacja A dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E5·2 F#5·2 |
| 2 | A5·3 r·1 |
| 3 | B5·2 A5·2 |
| 4 | F#5·3 r·1 |
| 5 | E5·2 F#5·2 |
| 6 | E5·3 r·1 |
| 7 | D5·2 C#5·2 |
| 8 | B4·3 r·1 |

Zakres B: B4-B5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Brak podpisu w tym utworze.

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'std' | -3 dB | 1 | 0 |
| 2 | bas | `TRI` | bas | korzenie od A2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1 | -6 dB | 1 | 0 |
| 3 | ozdoba | `BELL` | dzwonek | oktawa 5-6 | co 4 takty | -10 dB | 4 | R 30 |
| 4 | pad | `PAD` | pad | C3-C5, szeroko | długie akordy | -12 dB | 1 | szeroko ±35 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `SHK` | -22 dB | `......X.......X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- Pętla: takt 32 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, A major, 80 BPM, 4/4 time. Instruments: narrow 12.5% pulse wave (plucky, nasal), triangle wave (bass/pad), soft bell, detuned triangle pad. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Neutral warm tune. Seamless loop.

**Zakaz:** charakterystyczne ozdobniki.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: neutralność (nic charakterystycznego), (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-41.md`.
