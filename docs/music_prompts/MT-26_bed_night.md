# MT-26 · bed_night · Belka noc (22-6, tylko z włączonym „Muzyka w nocy”)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/beds/bed_night.ogg` (OGG, -20 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | pozytywka, prawie cisza |
| Tempo | 54 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 36 (160 s, 2:40) |
| Tonacja | D dorycki |
| Gama | D E F G A B C |
| Pentatonika | D F G A C |
| Motyw Cuy | D4 E4 F4 A4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | E4 F4 A4, ♪ ♪ ♩ |
| Głośność | -20 LUFS |
| Seed | 98637 |

Charakter: **pozytywka nocna**. Efekty: REV-L 30%, LP(4 kHz), bez basu; nic powyżej 5 kHz.

### 1.1 Słownik akordów

- `Dm9` = D F A C E
- `Em7` = E G B D
- `G6/D` = G B D E (bas D)
- `Bbmaj7` = Bb D F A
- `C6/9` = C E G A D

### 1.2 Akordy takt po takcie

- takty 1-8: Dm9 | Dm9 | Dm9 | Dm9 | Dm9 | Dm9 | Dm9 | Dm9
- takty 9-16: Em7 | Em7 | Em7 | Em7 | G6/D | G6/D | G6/D | G6/D
- takty 17-24: Dm9 | Dm9 | Dm9 | Dm9 | Dm9 | Dm9 | Dm9 | Dm9
- takty 25-32: Bbmaj7 | Bbmaj7 | Bbmaj7 | Bbmaj7 | C6/9 | C6/9 | C6/9 | C6/9
- takty 33-36: Dm9 | Dm9 | Dm9 | Dm9

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |
| 17-24 | B |
| 25-32 | A″ |
| 33-36 | A‴ |

### 1.4 Melodia

Tryb rzadki: **1 nuta na takt**, wartość = cały okres, pentatonika D F G A C, start na 5. stopniu pentatoniki, ruch ≤ 1 stopień pentatoniki, wybór z `seed`; nuta zawsze zgodna z akordem (3., 5., 9. lub 6. stopień). Frazy symetryczne co 4 okresy (powtórzenie konturu).
Podpis Cuy (E4 F4 A4) wchodzi zamiast zwykłej nuty w miejscach z sekcji „Podpis”.

### 1.5 Podpis Cuy

Podpis (E4 F4 A4) w taktach: 12, 24, 36; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BOX` | melodia pentatoniczna D-F-G-A-C, symetryczne frazy | C4-G5 (wg szkieletu) | 1 nuta na takt, półnuta | -3 dB | 1 | 0 |
| 2 | pad | `PAD` | bardzo cichy pad na D3-A3 | D3-A3 | długie akordy | -16 dB | 1 | szeroko ±35 |
| 3 | ozdoba | `CEL` | gwiazdki: pojedyncze nuty 4 oktawy wyżej | oktawa 5-6 | losowo co 8-14 s | -20 dB | 5 | R 30 |

**Perkusja:** brak.

**Przebieg / dynamika**

- podpis Cuy w dorycku (D4 E4 F4) w BOX w taktach 12, 24, 36
- Pętla: takt 36 (Dm9) = takt 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, D dorian, 54 BPM, 4/4 time. Instruments: music-box, detuned triangle pad, celesta. No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Night music box, barely there. Seamless loop.

**Zakaz:** puls rytmiczny; dźwięki jasne powyżej 5 kHz.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: pozytywka nocna, (3) szew pętli niesłyszalny (test 5× pętli), (4) -20 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-26.md`.
