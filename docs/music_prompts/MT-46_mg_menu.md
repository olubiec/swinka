# MT-46 · mg_menu · Minigra: menu (bez stemów)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/minigames/mg_menu.ogg` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | krótki wesoły shuffle |
| Tempo | 112 BPM |
| Metrum | 4/4 |
| Swing | 62% |
| Takty | 16 (34 s, 0:34) |
| Tonacja | G dur |
| Gama | G A B C D E F# |
| Pentatonika | G A B D E |
| Motyw Cuy | G4 A4 B4 D5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | A4 B4 D5, ♪ ♪ ♩ |
| Głośność | -16 LUFS |
| Seed | 67372 |

Charakter: **wesołość**. Efekty: REV-S 8%.

### 1.1 Słownik akordów

- `G` = G B D
- `Em7` = E G B D
- `C` = C E G
- `D7` = D F# A C

### 1.2 Akordy takt po takcie

- takty 1-8: G | Em7 | C | D7 | G | Em7 | C | D7
- takty 9-16: G | Em7 | C | D7 | G | Em7 | C | D7

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |

### 1.4 Melodia

Szkielet A `hop`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·½ A4·½ B4·½ D5·1½ r·1 |
| 2 | D5·½ r·½ G5·½ r·½ D5·½ r·½ G5·½ r·½ |
| 3 | E5·½ r·½ A5·½ r·½ E5·½ r·½ D5·½ r·½ |
| 4 | B4·1 C5·1 A4·2 |
| 5 | A4·½ B4·½ C5·½ E5·1½ r·1 |
| 6 | E5·½ r·½ G5·½ r·½ E5·½ r·½ G5·½ r·½ |
| 7 | F#5·½ r·½ E5·½ r·½ D5·½ r·½ B4·½ r·½ |
| 8 | D5·1 B4·1 G4·2 |

Zakres A: G4-A5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (A4 B4 D5) w taktach: 16; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P25` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'hop' | -2 dB | 1 | 0 |
| 2 | akordy | `BNJ` | akompaniament | voicing blisko, C3-G4 (nic poniżej C3) | ósemki w shuffle | -8 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1 i 3 | -4 dB | 1 | 0 |
| 4 | ozdoba | `GLK` | akcent | oktawa 5-6 | ostatnia ćwierćnuta co 4. taktu | -10 dB | 4 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 12 triolowych na takt (shuffle)) |
| --- | --- | --- |
| `BRSH` | -12 dB | `X.XX.XX.XX.X` |
| `KICK` | -14 dB | `X.....X.....` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- Pętla: takt 16 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G major, 112 BPM, 4/4 time, swing 62%. Instruments: 25% pulse wave (brass/piano-like), banjo-like pluck, triangle wave (bass/pad), glockenspiel. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Short happy shuffle. Seamless loop.

**Zakaz:** napięcie.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: wesołość, (3) szew pętli niesłyszalny (test 5× pętli), (4) -16 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-46.md`.
