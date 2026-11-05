# MT-36 · place_room_kuki · Pokój: łąka (calm meadow)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_kuki.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | pastoralny, przewiewny |
| Tempo | 72 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 32 (107 s, 1:47) |
| Tonacja | G dur |
| Gama | G A B C D E F# |
| Pentatonika | G A B D E |
| Motyw Cuy | G4 A4 B4 D5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | A4 B4 D5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 33196 |

Charakter: **wiatr**. Efekty: REV-M 14%.

### 1.1 Słownik akordów

- `Gmaj7` = G B D F#
- `Cmaj7` = C E G B
- `Am7` = A C E G
- `D7sus` = D G A C
- `Em7` = E G B D
- `Gmaj7/B` = G B D F# (bas B)
- `D7` = D F# A C

### 1.2 Akordy takt po takcie

(cykl 12 taktów: `Gmaj7 | Cmaj7 | Am7 | D7sus (x2) | Em7 | Cmaj7 | Gmaj7/B | Am7 D7`)

- takty 1-8: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 9-16: Em7 | Cmaj7 | Gmaj7/B | Am7 D7 | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 17-24: Gmaj7 | Cmaj7 | Am7 | D7sus | Em7 | Cmaj7 | Gmaj7/B | Am7 D7
- takty 25-32: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |

### 1.4 Melodia

Szkielet A `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·1 A4·1 B4·1 D5·1 |
| 2 | D5·3 r·1 |
| 3 | E5·1 D5·1 B4·1 A4·1 |
| 4 | B4·3 r·1 |
| 5 | A4·1 B4·1 C5·1 E5·1 |
| 6 | E5·3 r·1 |
| 7 | D5·1 B4·1 A4·1 B4·1 |
| 8 | G4·4 |

Zakres A: G4-E5.

Szkielet B `pas` (tonacja G dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | D5·2 E5·2 |
| 2 | G5·3 r·1 |
| 3 | A5·2 G5·2 |
| 4 | E5·3 r·1 |
| 5 | D5·2 E5·2 |
| 6 | D5·3 r·1 |
| 7 | C5·2 B4·2 |
| 8 | A4·3 r·1 |

Zakres B: A4-A5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (A4 B4 D5) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | melodia pentatoniczna z ozdobnikami | C4-G5 (wg szkieletu) | wg szkieletu 'pas' + nuty przygodne | -3 dB | 1 | 0 |
| 2 | pad | `PAD` | pad | C3-C5, szeroko | długie akordy | -9 dB | 1 | szeroko ±35 |
| 3 | bas | `TRI` | bas co 2 takty | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | korzeń | -8 dB | 1 | 0 |
| 4 | szum | `noise_wind` | wiatr | - | ciągły | -26 dB | 1 | szeroko ±50 |

**Perkusja:** brak.

**Przebieg / dynamika**

- Pętla: takt 32 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G major, 72 BPM, 4/4 time. Instruments: narrow 12.5% pulse wave (plucky, nasal), detuned triangle pad, triangle wave (bass/pad). No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Pastoral meadow with wind. Seamless loop.

**Zakaz:** banjo (to ogród).

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: wiatr, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-36.md`.
