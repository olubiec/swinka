# MT-45 · mg_nyan_cuy · Minigra: Nyan Cuy (3 stemy)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/minigames/mg_nyan_cuy_{base,rhythm,lead}.ogg` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | szybki taniec chiptune, własny motyw |
| Tempo | 136 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 16 (28 s, 0:28) |
| Tonacja | E moll (naturalny) |
| Gama | E F# G A B C D |
| Pentatonika | E G A B D |
| Motyw Cuy | E4 F#4 G4 B4, ♪ ♪ ♪ ♩. |
| Podpis Cuy | F#5 G5 B5, ♪ ♪ ♩ |
| Głośność | -16 LUFS |
| Seed | 89817 |

Charakter: **własny motyw tańca**. Efekty: REV-S 6%.

### 1.1 Słownik akordów

- `Em` = E G B
- `C` = C E G
- `D` = D F# A
- `Bm` = B D F#
- `Am` = A C E
- `B7` = B D# F# A

### 1.2 Akordy takt po takcie

- takty 1-8: Em | C | D | Bm | Em | C | D | Bm
- takty 9-16: Em | Am | B7 | Em | Em | Am | B7 | Em

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |

### 1.4 Melodia

Szkielet A `stc`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E5·½ F#5·½ G5·½ B5·1½ r·1 |
| 2 | B5·½ G5·½ F#5·½ G5·½ B5·½ G5·½ F#5·½ r·½ |
| 3 | G5·½ A5·½ B5·½ C6·½ B5·½ A5·½ G5·½ r·½ |
| 4 | F#5·½ G5·½ F#5·½ E5·½ F#5·2 |
| 5 | F#5·½ G5·½ A5·½ C6·1½ r·1 |
| 6 | C6·½ B5·½ A5·½ B5·½ C6·½ B5·½ A5·½ r·½ |
| 7 | G5·½ B5·½ D6·½ B5·½ C6·½ A5·½ F#5·½ r·½ |
| 8 | B5·1 G5·1 E5·2 |

Zakres A: E5-D6.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (F#5 G5 B5) w taktach: 16; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

Każdy stem ma tę samą liczbę próbek, to samo tempo i te same punkty pętli; `_full` powstaje automatycznie (suma trzech stemów, bez pracy twórczej).

| Stem | # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `base` | 1 | bas | `TRI` | bas z synkopą | korzenie od E2, przejścia do oktawy 3 (nie poniżej E1) | 1, „i” 2, 4 | -3 dB | 1 | 0 |
| `base` | 2 | pad | `P50` | pad akordowy (w tym utworze wolno P50) | C3-C5, szeroko | długie akordy | -12 dB | 1 | szeroko ±35 |
| `rhythm` | 3 | perkusja | `KICK/SNR/HAT` | pełny kit | - | KICK four-on-the-floor, SNR 2 i 4, HAT szesnastki -14, CRUSH | -3 dB | 1 | KICK 0, SNR 0, HAT R 20, SHK L 20, BRSH L 10 |
| `lead` | 4 | melodia | `P25` | melodia własna, wędrowna (pentatonika e-moll); motyw w odwróceniu w taktach 13-14 | C4-G5 (wg szkieletu) | wg szkieletu 'stc' o oktawę wyżej | -2 dB | 1 | 0 |
| `lead` | 5 | ozdoba | `GLK` | podwajanie przy wyniku 600 pkt | oktawa 5-6 | unison +12 | -8 dB | 1 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -3 dB | `X...X...X...X...` |
| `SNR` | -3 dB | `....X.......X...` |
| `HAT` | -14 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- warstwy wg wyniku: 0 pkt _base, 200 _rhythm, 600 _lead (kod)
- Pętla: takt 16 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, E natural minor, 136 BPM, 4/4 time. Instruments: triangle wave (bass/pad), 50% square wave (hollow, radio-like), soft kick, noise snare, hi-hat, 25% pulse wave (brass/piano-like), glockenspiel. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Fast original chiptune dance. Seamless loop.

**Zakaz:** skala i rytm znanej piosenki o kocie.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: własny motyw tańca, (3) szew pętli niesłyszalny (test 5× pętli), (4) -16 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-45.md`.
