# MT-32 · place_room_salon · Pokój: salon

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_salon.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | przytulne lo-fi, drewno i lampka |
| Tempo | 76 BPM |
| Metrum | 4/4 |
| Swing | 58% |
| Takty | 32 (101 s, 1:41) |
| Tonacja | F dur |
| Gama | F G A Bb C D E |
| Pentatonika | F G A C D |
| Motyw Cuy | F4 G4 A4 C5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | G4 A4 C5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 43220 |

Charakter: **ciepły trzask winylu na wejściu**. Efekty: REV-S 12%.

### 1.1 Słownik akordów

- `Fmaj9` = F A C E G
- `Dm9` = D F A C E
- `Gm9` = G Bb D F A
- `C13` = C E Bb D A
- `Bbmaj9` = Bb D F A C
- `Am7` = A C E G
- `D7♭9` = D F# A C Eb
- `C13sus` = C F Bb D A

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 (x2) | Bbmaj9 | Am7 D7♭9 | Gm9 | C13sus C13 (x2)`)

- takty 1-8: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 9-16: Bbmaj9 | Am7 D7♭9 | Gm9 | C13sus C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13sus C13
- takty 17-24: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 25-32: Bbmaj9 | Am7 D7♭9 | Gm9 | C13sus C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13sus C13

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |

### 1.4 Melodia

Szkielet A `bal`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | F4·½ G4·½ A4·½ C5·2½ |
| 2 | r·2 A4·1 G4·1 |
| 3 | F4·1½ G4·½ A4·2 |
| 4 | r·1 C5·1 A4·1 G4·1 |
| 5 | G4·½ A4·½ Bb4·½ D5·2½ |
| 6 | r·2 C5·1 Bb4·1 |
| 7 | A4·1½ Bb4·½ C5·2 |
| 8 | r·1 A4·1 G4·1 F4·1 |

Zakres A: F4-D5.

Szkielet B `pas` (tonacja F dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | C5·2 D5·2 |
| 2 | F5·3 r·1 |
| 3 | G5·2 F5·2 |
| 4 | D5·3 r·1 |
| 5 | C5·2 D5·2 |
| 6 | C5·3 r·1 |
| 7 | Bb4·2 A4·2 |
| 8 | G4·3 r·1 |

Zakres B: G4-G5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (G4 A4 C5) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `EP` | melodia (pianino puls 25%) | C4-G5 (wg szkieletu) | 4-nutowe frazy; wg szkieletu 'bal' | -3 dB | 1 | 0 |
| 2 | akordy | `EP` | akordy | voicing blisko, C3-G4 (nic poniżej C3) | rozłożone | -6 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas | korzenie od F2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1 i 3 | -5 dB | 1 | 0 |
| 4 | szum | `noise_vinyl_crackle` | ciepły trzask winylu na wejściu | - | takty 1-4: -34, potem -42 | -42 dB | 1 | szeroko ±50 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -14 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- trzask winylu głośniej w pierwszych 4 taktach
- Pętla: takt 32 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, F major, 76 BPM, 4/4 time, swing 58%. Instruments: electric piano, triangle wave (bass/pad). No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Cosy lo-fi salon. Seamless loop.

**Zakaz:** stopa.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: ciepły trzask winylu na wejściu, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-32.md`.
