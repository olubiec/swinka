# MT-27 · place_garden_day · Ogród dzień

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/places/place_garden_day.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | ogród w dzień (w nocy filtr LP 1,8 kHz -6 dB w kodzie) |
| Tempo | 88 BPM |
| Metrum | 4/4 |
| Swing | 58% |
| Takty | 32 (87 s, 1:27) |
| Tonacja | G dur |
| Gama | G A B C D E F# |
| Pentatonika | G A B D E |
| Motyw Cuy | G4 A4 B4 D5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | A4 B4 D5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 13848 |

Charakter: **szarpnięcie banjo na synkopie**. Efekty: REV-S 10%.

### 1.1 Słownik akordów

- `G` = G B D
- `Em7` = E G B D
- `Cmaj7` = C E G B
- `D7` = D F# A C
- `Bm7` = B D F# A
- `Am7` = A C E G
- `D7sus` = D G A C

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `G | Em7 | Cmaj7 | D7 (x2) | G | Bm7 | Am7 | D7sus D7 (x2)`)

- takty 1-8: G | Em7 | Cmaj7 | D7 | G | Em7 | Cmaj7 | D7
- takty 9-16: G | Bm7 | Am7 | D7sus D7 | G | Bm7 | Am7 | D7sus D7
- takty 17-24: G | Em7 | Cmaj7 | D7 | G | Em7 | Cmaj7 | D7
- takty 25-32: G | Bm7 | Am7 | D7sus D7 | G | Bm7 | Am7 | D7sus D7

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
| 1 | r·½ G4·½ A4·½ B4·½ D5·1½ r·½ |
| 2 | r·1½ B4·½ D5·½ E5·1 r·½ |
| 3 | D5·½ r·½ D5·½ B4·1 A4·½ r·1 |
| 4 | B4·1½ G4·½ A4·1 r·1 |
| 5 | r·½ A4·½ B4·½ C5·½ E5·1½ r·½ |
| 6 | r·1½ C5·½ E5·½ F#5·1 r·½ |
| 7 | E5·½ r·½ D5·½ C5·1 B4·½ r·1 |
| 8 | A4·1½ B4·½ G4·2 |

Zakres A: G4-F#5.

Szkielet B `std` (tonacja G dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | D5·1 E5·1 G5·1 E5·1 |
| 2 | D5·3 r·1 |
| 3 | E5·1 G5·1 A5·1 G5·1 |
| 4 | E5·3 r·1 |
| 5 | G5·½ F#5·½ E5·½ D5·½ E5·2 |
| 6 | D5·½ E5·½ D5·½ B4·½ D5·2 |
| 7 | C5·1 B4·1 A4·1 B4·1 |
| 8 | A4·3 r·1 |

Zakres B: A4-A5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (A4 B4 D5) w taktach: 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BNJ` | melodia pentatoniczna G-A-B-D-E | C4-G5 (wg szkieletu) | szarpnięcie w synkopie („i” 2); wg szkieletu 'syn' | -2 dB | 1 | 0 |
| 2 | akordy | `BNJ` | akord rozłożony | voicing blisko, C3-G4 (nic poniżej C3) | ósemki | -8 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas ćwierćnutami root-fifth | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1, kwinta na 3 | -5 dB | 1 | 0 |
| 4 | szum | `noise_birds` | ptaki | - | ciągłe | -22 dB | 1 | szeroko ±50 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `SHK` | -18 dB | `......X.......X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- podpis Cuy (A4 B4 D5) w takcie 32
- Pętla: takt 32 D7 -> takt 1 G.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G major, 88 BPM, 4/4 time, swing 58%. Instruments: banjo-like pluck, triangle wave (bass/pad). No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Sunny banjo garden. Seamless loop.

**Zakaz:** perkusja inna niż shaker/miotełki.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: szarpnięcie banjo na synkopie, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-27.md`.
