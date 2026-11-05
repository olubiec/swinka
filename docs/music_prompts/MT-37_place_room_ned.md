# MT-37 · place_room_ned · Pokój: kąt przekąsek (snack nook)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_ned.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | swing, chrupanie |
| Tempo | 104 BPM |
| Metrum | 4/4 |
| Swing | 62% |
| Takty | 32 (74 s, 1:14) |
| Tonacja | B♭ dur |
| Gama | Bb C D Eb F G A |
| Pentatonika | Bb C D F G |
| Motyw Cuy | Bb4 C5 D5 F5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | C5 D5 F5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 78917 |

Charakter: **motyw chrupania**. Efekty: REV-S 10%.

### 1.1 Słownik akordów

- `Bb6` = Bb D F G
- `Gm7` = G Bb D F
- `Cm7` = C Eb G Bb
- `F7` = F A C Eb
- `Eb6` = Eb G Bb C
- `Dm7` = D F A C
- `G7` = G B D F

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `Bb6 | Gm7 | Cm7 F7 | Bb6 (x2) | Eb6 | Cm7 | Dm7 G7 | Cm7 F7 (x2)`)

- takty 1-8: Bb6 | Gm7 | Cm7 F7 | Bb6 | Bb6 | Gm7 | Cm7 F7 | Bb6
- takty 9-16: Eb6 | Cm7 | Dm7 G7 | Cm7 F7 | Eb6 | Cm7 | Dm7 G7 | Cm7 F7
- takty 17-24: Bb6 | Gm7 | Cm7 F7 | Bb6 | Bb6 | Gm7 | Cm7 F7 | Bb6
- takty 25-32: Eb6 | Cm7 | Dm7 G7 | Cm7 F7 | Eb6 | Cm7 | Dm7 G7 | Cm7 F7

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
| 1 | r·½ Bb4·½ C5·½ D5·½ F5·1½ r·½ |
| 2 | r·1½ D5·½ F5·½ G5·1 r·½ |
| 3 | F5·½ r·½ F5·½ D5·1 C5·½ r·1 |
| 4 | D5·1½ Bb4·½ C5·1 r·1 |
| 5 | r·½ C5·½ D5·½ Eb5·½ G5·1½ r·½ |
| 6 | r·1½ Eb5·½ G5·½ A5·1 r·½ |
| 7 | G5·½ r·½ F5·½ Eb5·1 D5·½ r·1 |
| 8 | C5·1½ D5·½ Bb4·2 |

Zakres A: Bb4-A5.

Szkielet B `std` (tonacja B♭ dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | F5·1 G5·1 Bb5·1 G5·1 |
| 2 | F5·3 r·1 |
| 3 | G5·1 Bb5·1 C6·1 Bb5·1 |
| 4 | G5·3 r·1 |
| 5 | Bb5·½ A5·½ G5·½ F5·½ G5·2 |
| 6 | F5·½ G5·½ F5·½ D5·½ F5·2 |
| 7 | Eb5·1 D5·1 C5·1 D5·1 |
| 8 | C5·3 r·1 |

Zakres B: C5-C6.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (C5 D5 F5) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P25` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'syn' | -3 dB | 1 | 0 |
| 2 | akordy | `P25` | stabsy „blacha” (Bb D F) | voicing blisko, C3-G4 (nic poniżej C3) | na „i” 2 i 4 | -4 dB | 1 | L 25 |
| 3 | bas | `PIZ` | bas pizzicato walking | korzenie od Bb2, przejścia do oktawy 3 (nie poniżej E1) | 4 ćwierćnuty | -3 dB | 1 | 0 |
| 4 | ozdoba | `XYL` | figura „chrupania”: 4 szesnastki staccato D6 D6 D6 D6 | oktawa 5-6 | w taktach 8 i 24 na 4. ćwierćnucie | -8 dB | 8 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -14 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- Pętla: takt 32 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, Bb major, 104 BPM, 4/4 time, swing 62%. Instruments: 25% pulse wave (brass/piano-like), pizzicato bass, xylophone. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Swing snack nook with crunch figure. Seamless loop.

**Zakaz:** dzwonki.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: motyw chrupania, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-37.md`.
