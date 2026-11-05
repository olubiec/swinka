# MT-33 · place_room_bedroom · Pokój: sypialnia

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_room_bedroom.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | wolna kołysanka |
| Tempo | 60 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 24 (96 s, 1:36) |
| Tonacja | D dorycki |
| Gama | D E F G A B C |
| Pentatonika | D F G A C |
| Motyw Cuy | D4 E4 F4 A4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | E4 F4 A4, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 57896 |

Charakter: **kołysanka**. Efekty: REV-L 28%.

### 1.1 Słownik akordów

- `Dm9` = D F A C E
- `Em7` = E G B D
- `Gmaj7` = G B D F#

### 1.2 Akordy takt po takcie

- takty 1-8: Dm9 | Em7 | Gmaj7 | Dm9 | Dm9 | Em7 | Gmaj7 | Dm9
- takty 9-16: Dm9 | Em7 | Gmaj7 | Dm9 | Dm9 | Em7 | Gmaj7 | Dm9
- takty 17-24: Dm9 | Em7 | Gmaj7 | Dm9 | Dm9 | Em7 | Gmaj7 | Dm9

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-20 | B |
| 21-24 | A″ |

### 1.4 Melodia

Tryb rzadki: **1 nuta na takt**, wartość = cały okres, pentatonika D F G A C, start na 5. stopniu pentatoniki, ruch ≤ 1 stopień pentatoniki, wybór z `seed`; nuta zawsze zgodna z akordem (3., 5., 9. lub 6. stopień). Frazy symetryczne co 4 okresy (powtórzenie konturu).

### 1.5 Podpis Cuy

Brak podpisu w tym utworze.

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BOX` | melodia D-F-G-A | C4-G5 (wg szkieletu) | 1 nuta na takt, półnuta | -3 dB | 1 | 0 |
| 2 | pad | `PAD` | pad | C3-C5, szeroko | długie akordy | -14 dB | 1 | szeroko ±35 |

**Perkusja:** brak.

**Przebieg / dynamika**

- brak basu
- Pętla: takt 24 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, D dorian, 60 BPM, 4/4 time. Instruments: music-box, detuned triangle pad. No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Slow lullaby in dorian. Seamless loop.

**Zakaz:** jakikolwiek puls.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: kołysanka, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-33.md`.
