# MT-38 · place_room_james · Pokój: kryjówka (safe hideout)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_james.ogg` (OGG, -26 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | najciszej ze wszystkich pokoi |
| Tempo | 56 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 24 (103 s, 1:43) |
| Tonacja | D dorycki |
| Gama | D E F G A B C |
| Pentatonika | D F G A C |
| Motyw Cuy | D4 E4 F4 A4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | E4 F4 A4, ♪ ♪ ♩ |
| Głośność | -26 LUFS |
| Seed | 65667 |

Charakter: **najciszej: kryjówka**. Efekty: REV-L 30%, LP(3,5 kHz).

### 1.1 Słownik akordów

- `Dm9` = D F A C E
- `Gmaj7` = G B D F#

### 1.2 Akordy takt po takcie

- takty 1-8: Dm9 | Dm9 | Gmaj7 | Dm9 | Dm9 | Dm9 | Gmaj7 | Dm9
- takty 9-16: Dm9 | Dm9 | Gmaj7 | Dm9 | Dm9 | Dm9 | Gmaj7 | Dm9
- takty 17-24: Dm9 | Dm9 | Gmaj7 | Dm9 | Dm9 | Dm9 | Gmaj7 | Dm9

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-20 | B |
| 21-24 | A″ |

### 1.4 Melodia

Tryb rzadki: **1 nuta na 2 takty**, wartość = cały okres, pentatonika D F G A C, start na 5. stopniu pentatoniki, ruch ≤ 1 stopień pentatoniki, wybór z `seed`; nuta zawsze zgodna z akordem (3., 5., 9. lub 6. stopień). Frazy symetryczne co 4 okresy (powtórzenie konturu).

### 1.5 Podpis Cuy

Brak podpisu w tym utworze.

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BOX` | pojedyncze nuty D5, A5, F5 | C4-G5 (wg szkieletu) | 1 nuta na 2 takty | -6 dB | 1 | 0 |
| 2 | pad | `PAD` | pad | C3-C5, szeroko | długie akordy | -18 dB | 1 | szeroko ±35 |
| 3 | szum | `noise_room_tone` | ton pokoju | - | ciągły | -34 dB | 1 | szeroko ±50 |

**Perkusja:** brak.

**Przebieg / dynamika**

- cel głośności -26 LUFS (nie -18)
- bez podpisu Cuy
- Pętla: takt 24 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, D dorian, 56 BPM, 4/4 time. Instruments: music-box, detuned triangle pad. No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Quietest hideout. Seamless loop.

**Zakaz:** wszystko głośniejsze niż -26 LUFS.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: najciszej: kryjówka, (3) szew pętli niesłyszalny (test 5× pętli), (4) -26 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-38.md`.
