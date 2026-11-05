# MT-44 · mg_veggie_memory · Minigra: Veggie Memory (3 stemy)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/minigames/mg_veggie_memory_{base,rhythm,lead}.ogg` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | spokojna pozytywka, bez presji |
| Tempo | 72 BPM |
| Metrum | 4/4 |
| Swing | 50% |
| Takty | 16 (53 s, 0:53) |
| Tonacja | F dur |
| Gama | F G A Bb C D E |
| Pentatonika | F G A C D |
| Motyw Cuy | F4 G4 A4 C5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | G4 A4 C5, ♪ ♪ ♩ |
| Głośność | -16 LUFS |
| Seed | 86082 |

Charakter: **pozytywka**. Efekty: REV-M 14%.

### 1.1 Słownik akordów

- `Fmaj7` = F A C E
- `Dm7` = D F A C
- `Gm7` = G Bb D F
- `C7` = C E G Bb

### 1.2 Akordy takt po takcie

- takty 1-8: Fmaj7 | Dm7 | Gm7 | C7 | Fmaj7 | Dm7 | Gm7 | C7
- takty 9-16: Fmaj7 | Dm7 | Gm7 | C7 | Fmaj7 | Dm7 | Gm7 | C7

### 1.3 Forma

| Takty | Sekcja |
| --- | --- |
| 1-8 | A |
| 9-16 | Aʹ |

### 1.4 Melodia

Szkielet A `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | F4·1 G4·1 A4·1 C5·1 |
| 2 | C5·3 r·1 |
| 3 | D5·1 C5·1 A4·1 G4·1 |
| 4 | A4·3 r·1 |
| 5 | G4·1 A4·1 Bb4·1 D5·1 |
| 6 | D5·3 r·1 |
| 7 | C5·1 A4·1 G4·1 A4·1 |
| 8 | F4·4 |

Zakres A: F4-D5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (G4 A4 C5) w taktach: 16; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

Każdy stem ma tę samą liczbę próbek, to samo tempo i te same punkty pętli; `_full` powstaje automatycznie (suma trzech stemów, bez pracy twórczej).

| Stem | # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `base` | 1 | pad | `PAD` | pad | C3-C5, szeroko | długie akordy | -4 dB | 1 | szeroko ±35 |
| `base` | 2 | bas | `TRI` | bas co 2 takty | korzenie od F2, przejścia do oktawy 3 (nie poniżej E1) | korzeń | -8 dB | 1 | 0 |
| `rhythm` | 3 | perkusja | `SHK/BRSH` | delikatne shaker i miotełki | - | SHK na „i”, BRSH na 2 i 4 | -18 dB | 1 | KICK 0, SNR 0, HAT R 20, SHK L 20, BRSH L 10 |
| `lead` | 4 | melodia | `BOX` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'pas' | -3 dB | 1 | 0 |
| `lead` | 5 | ozdoba | `CEL` | kontrapunkt | oktawa 5-6 | długie nuty | -9 dB | 1 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `SHK` | -18 dB | `X.X.X.X.X.X.X.X.` |
| `BRSH` | -18 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- _lead rośnie z poziomem (kod), tempo stałe
- Pętla: takt 16 -> 1.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, F major, 72 BPM, 4/4 time. Instruments: detuned triangle pad, triangle wave (bass/pad), shaker, brush swishes, music-box, celesta. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Calm music box, no pressure. Seamless loop.

**Zakaz:** stopa; werbel; szybkie nuty.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: pozytywka, (3) szew pętli niesłyszalny (test 5× pętli), (4) -16 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-44.md`.
