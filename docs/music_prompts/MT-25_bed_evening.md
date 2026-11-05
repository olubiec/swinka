# MT-25 · bed_evening · Belka wieczór (17-22)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/beds/bed_evening.ogg` (OGG, -20 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | lo-fi jazz wieczorny |
| Tempo | 76 BPM |
| Metrum | 4/4 |
| Swing | 64% |
| Takty | 56 (177 s, 2:56) |
| Tonacja | B♭ dur |
| Gama | Bb C D Eb F G A |
| Pentatonika | Bb C D F G |
| Motyw Cuy | Bb4 C5 D5 F5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | C5 D5 F5, ♪ ♪ ♩ |
| Głośność | -20 LUFS |
| Seed | 3437 |

Charakter: **lo-fi jazz z trzaskiem winylu i ii-V-I**. Efekty: TAPE(0,2%) całość, LP(8 kHz), REV-S 12%.

### 1.1 Słownik akordów

- `Bbmaj9` = Bb D F A C
- `Gm9` = G Bb D F A
- `Cm9` = C Eb G Bb D
- `F13` = F A Eb G D
- `Ebmaj9` = Eb G Bb D F
- `Ebm9` = Eb Gb Bb Db F
- `Ab13` = Ab C Gb Bb F
- `Dm7` = D F A C
- `G7♭9` = G B D F Ab
- `Em7♭5` = E G Bb D
- `A7♭9` = A C# E G Bb
- `Dm9` = D F A C E
- `G7` = G B D F

### 1.2 Akordy takt po takcie

- takty 1-8: Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 F13
- takty 9-16: Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 F13
- takty 17-24: Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 F13
- takty 25-32: Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 F13
- takty 33-40: Gm9 | Cm9 | F13 | Bbmaj9 | Em7♭5 A7♭9 | Dm9 G7 | Cm9 F13 | Bbmaj9
- takty 41-48: Gm9 | Cm9 | F13 | Bbmaj9 | Em7♭5 A7♭9 | Dm9 G7 | Cm9 F13 | Bbmaj9
- takty 49-56: Bbmaj9 | Gm9 | Cm9 F13 | Bbmaj9 | Ebmaj9 | Ebm9 Ab13 | Dm7 G7♭9 | Cm9 Bbmaj9

### 1.3 Forma

| Takty | Sekcja | Tonacja | Opis |
| --- | --- | --- | --- |
| 1-32 | A | B♭ dur | A (16) x2; w 2. A ii-V-I na końcu (Cm9 F13 Bbmaj9) |
| 33-48 | B | G moll (naturalny) | mostek w g-moll |
| 49-56 | A-ogon | B♭ dur | powrót, ostatni takt Cm9 Bbmaj9 |

### 1.4 Melodia

Tryb rzadki: **1 nuta na 2 takty**, wartość = cały okres, pentatonika Bb C D F G, start na 5. stopniu pentatoniki, ruch ≤ 1 stopień pentatoniki, wybór z `seed`; nuta zawsze zgodna z akordem (3., 5., 9. lub 6. stopień). Frazy symetryczne co 4 okresy (powtórzenie konturu).

### 1.5 Podpis Cuy

Brak podpisu w tym utworze.

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | akordy | `EP` | akordy rozłożone, voicing blisko | voicing blisko, C3-G4 (nic poniżej C3) | arpeggio ósemkami w swingu | -3 dB | 1 | L 25 |
| 2 | melodia | `EP` | melodia wyżej (A4-D5), nuty długie, wejście co drugi takt; można BELL | C4-G5 (wg szkieletu) | co 2 takty, półnuty; solo nie dłuższe niż 4 takty | -5 dB | 3 | 0 |
| 3 | bas | `TRI` | walking bass ćwierćnutami (korzeń-kwinta-przejście) | korzenie od Bb2, przejścia do oktawy 3 (nie poniżej E1) | 4 ćwierćnuty | -4 dB | 1 | 0 |
| 4 | szum | `noise_vinyl_crackle` | trzask winylu | - | ciągły, bardzo cicho | -42 dB | 1 | szeroko ±50 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -14 dB | `....X.......X...` |
| `SHK` | -14 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- co 8 taktów kadencja ii-V-I: Cm9 F13 Bbmaj9
- takt 1-2: sam EP
- takt 3: wejście melodii
- brak stopy
- Pętla: takt 56 prowadzi Cm9 -> Bbmaj9, pętla na takt 1 Bbmaj9.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, Bb major, 76 BPM, 4/4 time, swing 64%. Instruments: electric piano, triangle wave (bass/pad). No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Evening lo-fi jazz with vinyl crackle. Seamless loop.

**Zakaz:** stopa; solo EP dłuższe niż 4 takty.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: lo-fi jazz z trzaskiem winylu i ii-V-I, (3) szew pętli niesłyszalny (test 5× pętli), (4) -20 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-25.md`.
