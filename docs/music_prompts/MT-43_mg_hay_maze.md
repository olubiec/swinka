# MT-43 · mg_hay_maze · Minigra: Hay Maze (3 stemy)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/minigames/mg_hay_maze_{base,rhythm,lead}.ogg` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | napięty, ale słodki; ostatnie 15 s +10 BPM |
| Tempo | 108 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 16 (36 s, 0:35) |
| Tonacja | A moll (naturalny) |
| Gama | A B C D E F G |
| Pentatonika | A C D E G |
| Motyw Cuy | A4 B4 C5 E5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | B4 C5 E5, ♪ ♪ ♩ |
| Głośność | -16 LUFS |
| Seed | 45011 |

Charakter: **ostinato basu**. Efekty: REV-S 6%.

### 1.1 Słownik akordów

- `Am` = A C E
- `F` = F A C
- `E7` = E G# B D

### 1.2 Akordy takt po takcie

- takty 1-8: Am | Am | F | E7 | Am | Am | F | E7
- takty 9-16: Am | Am | F | E7 | Am | Am | F | E7

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |

### 1.4 Melodia

Tryb fraz: melodia gra w oknach 2 taktów co 4 takty: takty 1-2 = szkielet A takty 1-2 (motyw), 5-6 = szkielet A takty 3-4, 9-10 = takty 5-6, 13-14 = takty 7-8. Pozostałe takty cisza.

Szkielet A `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A4·½ B4·½ C5·½ E5·1½ r·1 |
| 2 | r·1 B4·½ C5·½ E5·2 |
| 3 | E5·1 D5·½ C5·½ D5·1 C5·1 |
| 4 | B4·1½ C5·½ B4·2 |
| 5 | B4·½ C5·½ D5·½ F5·1½ r·1 |
| 6 | r·1 C5·½ D5·½ F5·2 |
| 7 | G5·1 F5·½ E5·½ C5·1 E5·1 |
| 8 | E5·1½ C5·½ B4·1 A4·1 |

Zakres A: A4-G5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (B4 C5 E5) w taktach: 16; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

Każdy stem ma tę samą liczbę próbek, to samo tempo i te same punkty pętli; `_full` powstaje automatycznie (suma trzech stemów, bez pracy twórczej).

| Stem | # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `base` | 1 | bas | `TRI` | ostinato ósemkami A2-A2-E3-A2 (wzór 3-nutowy) | korzenie od A2, przejścia do oktawy 3 (nie poniżej E1) | ósemki | -3 dB | 1 | 0 |
| `base` | 2 | pad | `PAD` | cichy pad | C3-C5, szeroko | długie akordy | -14 dB | 1 | szeroko ±35 |
| `rhythm` | 3 | perkusja | `HAT/KICK/SNR` | tykanie | - | HAT ćwierćnuty -8, KICK na 1, co 4 takty fill SNR trzy uderzenia (-6) | -8 dB | 1 | KICK 0, SNR 0, HAT R 20, SHK L 20, BRSH L 10 |
| `lead` | 4 | melodia | `P12` | rzadka melodia: jedna fraza 2 takty co 4 takty; motyw Cuy w molu (A4 B4 C5 E5) raz na pętlę | C4-G5 (wg szkieletu) | szkielet 'std' w oknach | -2 dB | 1 | 0 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `HAT` | -8 dB | `X...X...X...X...` |
| `KICK` | -8 dB | `X...............` |
| `SNR` | -6 dB | `............X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- _lead wchodzi z nowego wywołania onTimeLeft (kod)
- Pętla: takt 16 E7 -> 1 Am.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, A natural minor, 108 BPM, 4/4 time. Instruments: triangle wave (bass/pad), detuned triangle pad, hi-hat, soft kick, noise snare, narrow 12.5% pulse wave (plucky, nasal). No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Tense but sweet minor ostinato. Seamless loop.

**Zakaz:** więcej niż 2 nuty melodii na takt.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: ostinato basu, (3) szew pętli niesłyszalny (test 5× pętli), (4) -16 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-43.md`.
