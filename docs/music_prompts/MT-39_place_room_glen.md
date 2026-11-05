# MT-39 · place_room_glen · Pokój: kącik czytelniczy

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_glen.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | ballada jazzowa |
| Tempo | 68 BPM |
| Metrum | 4/4 |
| Swing | 60% |
| Takty | 32 (113 s, 1:52) |
| Tonacja | E♭ dur |
| Gama | Eb F G Ab Bb C D |
| Pentatonika | Eb F G Bb C |
| Motyw Cuy | Eb4 F4 G4 Bb4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | F4 G4 Bb4, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 32038 |

Charakter: **odwrócone ii-V**. Efekty: REV-S 12%.

### 1.1 Słownik akordów

- `Ebmaj9` = Eb G Bb D F
- `Cm9` = C Eb G Bb D
- `Fm9` = F Ab C Eb G
- `Bb13` = Bb D Ab C G
- `Abmaj9` = Ab C Eb G Bb
- `Abm6` = Ab Cb Eb F
- `Gm7` = G Bb D F
- `C7♭9` = C E G Bb Db

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 (x2) | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 (x2)`)

- takty 1-8: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9
- takty 9-16: Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 17-24: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9
- takty 25-32: Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13

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
| 1 | Eb4·½ F4·½ G4·½ Bb4·2½ |
| 2 | r·2 G4·1 F4·1 |
| 3 | Eb4·1½ F4·½ G4·2 |
| 4 | r·1 Bb4·1 G4·1 F4·1 |
| 5 | F4·½ G4·½ Ab4·½ C5·2½ |
| 6 | r·2 Bb4·1 Ab4·1 |
| 7 | G4·1½ Ab4·½ Bb4·2 |
| 8 | r·1 G4·1 F4·1 Eb4·1 |

Zakres A: Eb4-C5.

Szkielet B `pas` (tonacja E♭ dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | Bb4·2 C5·2 |
| 2 | Eb5·3 r·1 |
| 3 | F5·2 Eb5·2 |
| 4 | C5·3 r·1 |
| 5 | Bb4·2 C5·2 |
| 6 | Bb4·3 r·1 |
| 7 | Ab4·2 G4·2 |
| 8 | F4·3 r·1 |

Zakres B: F4-F5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (F4 G4 Bb4) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `EP` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'bal' | -3 dB | 1 | 0 |
| 2 | akordy | `EP` | akordy | voicing blisko, C3-G4 (nic poniżej C3) | rozłożone | -3 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas co 2 takty | korzenie od Eb2, przejścia do oktawy 3 (nie poniżej E1) | korzeń | -7 dB | 1 | 0 |
| 4 | ozdoba | `BELL` | pojedyncze nuty w tle | oktawa 5-6 | co 4 takty | -16 dB | 3 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -16 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- odwrócone ii-V: Fm9 Bb13 przed Ebmaj9
- Pętla: takt 32 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, Eb major, 68 BPM, 4/4 time, swing 60%. Instruments: electric piano, triangle wave (bass/pad), soft bell. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Jazz ballad reading corner. Seamless loop.

**Zakaz:** szybkie przejścia.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: odwrócone ii-V, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-39.md`.
