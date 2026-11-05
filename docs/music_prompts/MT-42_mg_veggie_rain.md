# MT-42 · mg_veggie_rain · Minigra: Veggie Rain (3 stemy)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/minigames/mg_veggie_rain_{base,rhythm,lead}.ogg` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | skoczny chiptune; +6 BPM na poziom w kodzie; ostatnie 15 s tempo +10% (zastępuje games_boss) |
| Tempo | 132 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 16 (29 s, 0:29) |
| Tonacja | C dur |
| Gama | C D E F G A B |
| Pentatonika | C D E G A |
| Motyw Cuy | C4 D4 E4 G4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | D4 E4 G4, ♪ ♪ ♩ |
| Głośność | -16 LUFS |
| Seed | 80401 |

Charakter: **skoczność**. Efekty: REV-S 6%.

### 1.1 Słownik akordów

- `C` = C E G
- `G` = G B D
- `Am` = A C E
- `F` = F A C
- `G7` = G B D F

### 1.2 Akordy takt po takcie

- takty 1-8: C | G | Am | F | C | G | F | G7
- takty 9-16: C | G | Am | F | C | G | F | G7

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |

### 1.4 Melodia

Szkielet A `hop`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | C4·½ D4·½ E4·½ G4·1½ r·1 |
| 2 | G4·½ r·½ C5·½ r·½ G4·½ r·½ C5·½ r·½ |
| 3 | A4·½ r·½ D5·½ r·½ A4·½ r·½ G4·½ r·½ |
| 4 | E4·1 F4·1 D4·2 |
| 5 | D4·½ E4·½ F4·½ A4·1½ r·1 |
| 6 | A4·½ r·½ C5·½ r·½ A4·½ r·½ C5·½ r·½ |
| 7 | B4·½ r·½ A4·½ r·½ G4·½ r·½ E4·½ r·½ |
| 8 | G4·1 E4·1 C4·2 |

Zakres A: C4-D5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (D4 E4 G4) w taktach: 16; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

Każdy stem ma tę samą liczbę próbek, to samo tempo i te same punkty pętli; `_full` powstaje automatycznie (suma trzech stemów, bez pracy twórczej).

| Stem | # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `base` | 1 | bas | `TRI` | bas ósemkami korzeń-oktawa | korzenie od C2, przejścia do oktawy 3 (nie poniżej E1) | ósemki | -3 dB | 1 | 0 |
| `base` | 2 | pad | `P25` | pad | C3-C5, szeroko | długie akordy | -10 dB | 1 | szeroko ±35 |
| `rhythm` | 3 | perkusja | `KICK/SNR/HAT` | kit szumowy | - | KICK 1 i 3, SNR 2 i 4, HAT ósemki -12, CRUSH tylko HAT | -3 dB | 1 | KICK 0, SNR 0, HAT R 20, SHK L 20, BRSH L 10 |
| `lead` | 4 | melodia | `P25` | melodia radosna, motyw w taktach 1-2 i 9-10 | C4-G5 (wg szkieletu) | wg szkieletu 'hop' | -2 dB | 1 | 0 |
| `lead` | 5 | ozdoba | `GLK` | wsparcie na akcentach | oktawa 5-6 | akcenty melodii | -8 dB | 1 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -3 dB | `X.......X.......` |
| `SNR` | -3 dB | `....X.......X...` |
| `HAT` | -12 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- _base od startu, _rhythm po 10 s (kod), _lead po 25 s (kod)
- ostatnie 15 s: tempo +10% (kod)
- Pętla: takt 16 G7 -> 1 C.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, C major, 132 BPM, 4/4 time. Instruments: triangle wave (bass/pad), 25% pulse wave (brass/piano-like), soft kick, noise snare, hi-hat, glockenspiel. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Bouncy upbeat chiptune. Seamless loop.

**Zakaz:** melodia zdominowana przez bas.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: skoczność, (3) szew pętli niesłyszalny (test 5× pętli), (4) -16 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-42.md`.
