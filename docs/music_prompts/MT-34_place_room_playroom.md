# MT-34 · place_room_playroom · Pokój: pokój zabaw

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_playroom.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | zabawna pozytywka i ksylofon |
| Tempo | 100 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 32 (77 s, 1:17) |
| Tonacja | C dur |
| Gama | C D E F G A B |
| Pentatonika | C D E G A |
| Motyw Cuy | C4 D4 E4 G4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | D4 E4 G4, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 40304 |

Charakter: **staccato, dzieciństwo**. Efekty: REV-S 8%.

### 1.1 Słownik akordów

- `C` = C E G
- `G7` = G B D F
- `F` = F A C
- `Am` = A C E
- `D7` = D F# A C
- `G` = G B D
- `Dm7` = D F A C

### 1.2 Akordy takt po takcie

- takty 1-8: C | G7 | C | F | C | Am | D7 G7 | C
- takty 9-16: C | G7 | C | F | C | Am | D7 G7 | C
- takty 17-24: F | C | G | C | F | Dm7 G7 | C | C
- takty 25-32: C | G7 | C | F | C | Am | D7 G7 | C

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |

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

Szkielet B `std` (tonacja C dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·1 A4·1 C5·1 A4·1 |
| 2 | G4·3 r·1 |
| 3 | A4·1 C5·1 D5·1 C5·1 |
| 4 | A4·3 r·1 |
| 5 | C5·½ B4·½ A4·½ G4·½ A4·2 |
| 6 | G4·½ A4·½ G4·½ E4·½ G4·2 |
| 7 | F4·1 E4·1 D4·1 E4·1 |
| 8 | D4·3 r·1 |

Zakres B: D4-D5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (D4 E4 G4) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `XYL` | melodia staccato, potem zabawne powtórki | C4-G5 (wg szkieletu) | wg szkieletu 'hop' | -2 dB | 1 | 0 |
| 2 | ozdoba | `BOX` | kontrapunkt | oktawa 5-6 | długie nuty nad melodią | -8 dB | 9 | R 30 |
| 3 | bas | `TRI` | bas „skok” | korzenie od C2, przejścia do oktawy 3 (nie poniżej E1) | korzeń-oktawa | -4 dB | 1 | 0 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `SHK` | -20 dB | `......X.......X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- staccato to wyróżnik
- Pętla: takt 32 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, C major, 100 BPM, 4/4 time. Instruments: xylophone, music-box, triangle wave (bass/pad). No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Playful xylophone and music box. Seamless loop.

**Zakaz:** swing.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: staccato, dzieciństwo, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-34.md`.
