# MT-35 · place_room_dorm · Pokój: wspólna sypialnia

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_dorm.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | miękka kołysanka zespołowa |
| Tempo | 64 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 32 (120 s, 2:00) |
| Tonacja | G dur |
| Gama | G A B C D E F# |
| Pentatonika | G A B D E |
| Motyw Cuy | G4 A4 B4 D5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | A4 B4 D5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 42941 |

Charakter: **kanon trzygłosowy**. Efekty: REV-M 16%.

### 1.1 Słownik akordów

- `Gmaj9` = G B D F# A
- `Em7` = E G B D
- `Cmaj9` = C E G B D
- `D13` = D F# C E B
- `Bm7` = B D F# A
- `Am7` = A C E G

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `Gmaj9 | Em7 | Cmaj9 | D13 (x2) | Gmaj9 | Bm7 | Am7 | D13 (x2)`)

- takty 1-8: Gmaj9 | Em7 | Cmaj9 | D13 | Gmaj9 | Em7 | Cmaj9 | D13
- takty 9-16: Gmaj9 | Bm7 | Am7 | D13 | Gmaj9 | Bm7 | Am7 | D13
- takty 17-24: Gmaj9 | Em7 | Cmaj9 | D13 | Gmaj9 | Em7 | Cmaj9 | D13
- takty 25-32: Gmaj9 | Bm7 | Am7 | D13 | Gmaj9 | Bm7 | Am7 | D13

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

Brak podpisu w tym utworze.

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BOX` | temat kanonu (od taktu 1) | C4-G5 (wg szkieletu) | szkielet 'pas', 8 taktów, powtarzany co 8 | -3 dB | 1 | 0 |
| 2 | melodia | `CEL` | ten sam temat, opóźnienie 2 takty | C4-G5 (wg szkieletu) | wejście takt 3 | -6 dB | 3 | 0 |
| 3 | melodia | `P12` | ten sam temat, opóźnienie 4 takty, ciepły filtr 2 kHz | C4-G5 (wg szkieletu) | wejście takt 5 | -9 dB | 5 | 0 |
| 4 | pad | `PAD` | pad | C3-C5, szeroko | długie akordy | -12 dB | 1 | szeroko ±35 |
| 5 | bas | `TRI` | bas | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1 | -8 dB | 9 | 0 |

**Perkusja:** brak.

**Przebieg / dynamika**

- trzy głosy w kanonie
- Pętla: takt 32 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G major, 64 BPM, 4/4 time. Instruments: music-box, celesta, narrow 12.5% pulse wave (plucky, nasal), detuned triangle pad, triangle wave (bass/pad). No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Three-voice canon lullaby. Seamless loop.

**Zakaz:** perkusja.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: kanon trzygłosowy, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-35.md`.
