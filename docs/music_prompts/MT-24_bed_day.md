# MT-24 · bed_day · Belka dzień (9-17)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/beds/bed_day.ogg` (OGG, -20 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | najcichsza belka; prawie cisza, przyjazna drzemce |
| Tempo | 60 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 48 (192 s, 3:12) |
| Tonacja | F dur |
| Gama | F G A Bb C D E |
| Pentatonika | F G A C D |
| Motyw Cuy | F4 G4 A4 C5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | G4 A4 C5, ♪ ♪ ♩ |
| Głośność | -20 LUFS |
| Seed | 1664 |

Charakter: **prawie cisza dla drzemki**. Efekty: LP(5 kHz) na całość; REV-M 20%; dynamika prawie płaska.

### 1.1 Słownik akordów

- `Fmaj9` = F A C E G
- `Dm9` = D F A C E
- `Gm9` = G Bb D F A
- `Bbmaj9` = Bb D F A C
- `C13sus` = C F Bb D A

### 1.2 Akordy takt po takcie

- takty 1-8: Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9
- takty 9-16: Dm9 | Dm9 | Dm9 | Dm9 | Gm9 | Gm9 | Gm9 | Gm9
- takty 17-24: Bbmaj9 | Bbmaj9 | Bbmaj9 | Bbmaj9 | C13sus | C13sus | C13sus | C13sus
- takty 25-32: Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9
- takty 33-40: Dm9 | Dm9 | Dm9 | Dm9 | Gm9 | Gm9 | Gm9 | Gm9
- takty 41-48: C13sus | C13sus | C13sus | C13sus | Fmaj9 | Fmaj9 | Fmaj9 | Fmaj9

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |
| 33-40 | B′ |
| 41-48 | A‴ |

### 1.4 Melodia

Brak melodii ciągłej i brak motywu Cuy.

### 1.5 Podpis Cuy

Brak podpisu w tym utworze.

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pad | `PAD` | pad długi, wolne poruszenie filtra 0,03 Hz | C3-C5, szeroko | ciągły, zmiana akordu zgodnie z mapą | -3 dB | 1 | szeroko ±35 |
| 2 | szum | `noise_room_tone` | ton pokoju | - | ciągły | -28 dB | 1 | szeroko ±50 |
| 3 | ozdoba | `P12` | pojedyncze szarpnięcie (nuta z akordu: F5, A5 lub C6) | oktawa 5-6 | co 6-10 s losowo (seed), nie na mocnej części | -14 dB | 5 | R 30 |

**Perkusja:** brak.

**Przebieg / dynamika**

- brak melodii ciągłej i motywu Cuy
- najwyżej 1 zdarzenie P12 na 6 s
- Pętla: takt 48 (Fmaj9) = takt 1; PAD bez ataku przy zapętleniu.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, F major, 60 BPM, 4/4 time. Instruments: detuned triangle pad, narrow 12.5% pulse wave (plucky, nasal). No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Almost silent daytime pad. Seamless loop.

**Zakaz:** dźwięki zwracające uwagę; rytmiczny bas.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: prawie cisza dla drzemki, (3) szew pętli niesłyszalny (test 5× pętli), (4) -20 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-24.md`.
