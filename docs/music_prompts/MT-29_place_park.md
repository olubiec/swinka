# MT-29 · place_park · Park

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_park.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | park (3/4, folkowy walc) |
| Tempo | 96 BPM (3/4) |
| Metrum | 3/4 |
| Swing | 50% |
| Takty | 32 (60 s, 1:00) |
| Tonacja | D dur |
| Gama | D E F# G A B C# |
| Pentatonika | D E F# A B |
| Motyw Cuy | D4 E4 F#4 A4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | E5 F#5 A5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 49983 |

Charakter: **akcent na „raz”, walc**. Efekty: REV-S 10%.

### 1.1 Słownik akordów

- `D` = D F# A
- `A7` = A C# E G
- `G` = G B D
- `Bm` = B D F#
- `Em7` = E G B D
- `Gmaj7` = G B D F#

### 1.2 Akordy takt po takcie

- takty 1-8: D | A7 | D | G | D | Bm | Em7 A7 | D
- takty 9-16: D | A7 | D | G | D | Bm | Em7 A7 | D
- takty 17-24: G | D | Em7 | A7 | D | Gmaj7 | A7 | D
- takty 25-32: D | A7 | D | G | D | Bm | Em7 A7 | D

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |

### 1.4 Melodia

Szkielet A `wlz`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | D5·½ E5·½ F#5·½ A5·1½ |
| 2 | r·1 F#5·½ A5·½ B5·1 |
| 3 | A5·1 G5·½ F#5·½ G5·1 |
| 4 | E5·1½ F#5·½ E5·1 |
| 5 | E5·½ F#5·½ G5·½ B5·1½ |
| 6 | r·1 G5·½ B5·½ C#6·1 |
| 7 | B5·1 A5·½ G5·½ F#5·1 |
| 8 | E5·1 D5·2 |

Zakres A: D5-C#6.

Szkielet B `wlz` (tonacja D dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A5·1 B5·1 D6·1 |
| 2 | D6·2 r·1 |
| 3 | E6·1 D6·1 B5·1 |
| 4 | B5·2 r·1 |
| 5 | D6·½ C#6·½ B5·½ A5·½ B5·1 |
| 6 | A5·1 F#5·1 A5·1 |
| 7 | G5·1 F#5·1 E5·1 |
| 8 | E5·2 r·1 |

Zakres B: E5-E6.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (E5 F#5 A5) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | melodia prosta; motyw w taktach 1-2 (D5 E5 F#5 A5) | C4-G5 (wg szkieletu) | wg szkieletu 'wlz' o oktawę wyżej | -2 dB | 1 | 0 |
| 2 | akordy | `P12` | akompaniament „oom-pa-pa” | voicing blisko, C3-G4 (nic poniżej C3) | akord na 2 i 3 | -6 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas na 1 | korzenie od D2, przejścia do oktawy 3 (nie poniżej E1) | korzeń | -5 dB | 1 | 0 |
| 4 | szum | `dzieci` | dalekie głosy dzieci: szum formantowy 800/1500 Hz | - | losowo co 6-10 s, 1-2 s | -34 dB | 5 | szeroko ±50 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 12 szesnastek na takt 3/4) |
| --- | --- | --- |
| `BRSH` | -16 dB | `....X...X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- akcent na „raz”
- Pętla: takt 32 D -> takt 1 D.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, D major, 96 BPM, 3/4 time. Instruments: narrow 12.5% pulse wave (plucky, nasal), triangle wave (bass/pad). No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Folk waltz in the park. Seamless loop.

**Zakaz:** ostry puls 50%.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: akcent na „raz”, walc, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-29.md`.
