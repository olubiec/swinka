# MT-11 · theme_cuy · Motyw Cuy (także home_main)

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_loops.py`. Nie edytuj ręcznie.
> Plik wynikowy: `assets/music/home/theme_cuy.ogg` (OGG, -18 LUFS, szczyt ≤ -1 dBTP, pętla zszyta w zerowym przejściu, ogon pogłosu zawinięty na początek).

## 0. Styl wspólny

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry

| Parametr | Wartość |
| --- | --- |
| Rola | wizytówka gry; pętla głównego widoku Domku |
| Tempo | 92 BPM |
| Metrum | 4/4 |
| Swing | 58% |
| Takty | 32 (83 s, 1:23) |
| Tonacja | A moll (naturalny) |
| Gama | A B C D E F G |
| Pentatonika | A C D E G |
| Motyw Cuy | A4 B4 C5 E5, ♪ ♪ ♪ ♩. |
| Podpis Cuy | B4 C5 E5, ♪ ♪ ♩ |
| Głośność | -18 LUFS |
| Seed | 10724 |

Charakter: **wizytówka: motyw Cuy wypowiedziany w pierwszych 2 taktach**. Efekty: REV-S 10% na całość; REV-M 18% na BELL.

### 1.1 Słownik akordów

- `Am9` = A C E G B
- `Dm9` = D F A C E
- `G13` = G B F A E
- `Cmaj9` = C E G B D
- `E7♭9` = E G# B D F
- `Fmaj9` = F A C E G
- `Em7` = E G B D
- `A7` = A C# E G
- `Am7` = A C E G
- `G7` = G B D F

### 1.2 Akordy takt po takcie

(cykl 16 taktów: `Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | E7♭9 | Am9 | Fmaj9 | Em7 A7 | Dm9 | G13 | Cmaj9 | Am7 | Dm9 G7 | Dm9 G13`)

- takty 1-8: Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | E7♭9 | Am9
- takty 9-16: Fmaj9 | Em7 A7 | Dm9 | G13 | Cmaj9 | Am7 | Dm9 G7 | Dm9 G13
- takty 17-24: Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | E7♭9 | Am9
- takty 25-32: Fmaj9 | Em7 A7 | Dm9 | G13 | Cmaj9 | Am7 | Dm9 G7 | Dm9 G13

### 1.3 Forma

| Takty | Sekcja | Tonacja | Opis |
| --- | --- | --- | --- |
| 1-8 | A | A moll (naturalny) | temat w a-moll |
| 9-16 | B | C dur | kontrast w C-dur |
| 17-24 | Aʹ | A moll (naturalny) | temat w a-moll, wariacja |
| 25-32 | B-zakończenie | C dur | kontrast, wygaszenie ogona do początku |

### 1.4 Melodia

Szkielet A `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A4·½ B4·½ C5·½ E5·1½ r·1 |
| 2 | r·1 B4·½ C5·½ E5·2 |
| 3 | E5·1 D5·½ C5·½ D5·1 C5·1 |
| 4 | B4·1½ C5·½ B4·2 |
| 5 | B4·½ C5·½ D5·½ F5·1½ r·1 |
| 6 | r·1 C5·½ D5·½ F5·2 |
| 7 | G5·1 F5·½ E5·½ C5·1 E5·1 |
| 8 | E5·1½ C5·½ B4·1 A4·1 |

Zakres A: A4-G5.

Szkielet B `pas` (tonacja C dur):

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·2 A4·2 |
| 2 | C5·3 r·1 |
| 3 | D5·2 C5·2 |
| 4 | A4·3 r·1 |
| 5 | G4·2 A4·2 |
| 6 | G4·3 r·1 |
| 7 | F4·2 E4·2 |
| 8 | D4·3 r·1 |

Zakres B: D4-D5.

Wariacja Aʹ: jak A, takty 3-4 oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu. B′: jak B oktawę niżej.

### 1.5 Podpis Cuy

Podpis (1: B4 C5 E5 / 9: D4 E4 G4 / 17: B4 C5 E5 / 25: D4 E4 G4) w taktach: 16, 32; rytm w takcie: pauza 2 ćwierćnuty, potem trzy nuty podpisu ♪ ♪ ♩ (w 3/4: pauza 1).

## 2. Warstwy

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BELL` | melodia, unison z P12 (BELL -3 dB względem P12) | C4-G5 (wg szkieletu) | wg szkieletu; takty 1-2 motyw pełny, 3-4 odpowiedź podpisem w dół, 5-8 swobodna linia pentatoniczna A-C-D-E-G, długie nuty | +0 dB | 1 | 0 |
| 2 | melodia | `P12` | melodia unisono z BELL | C4-G5 (wg szkieletu) | jak BELL | +0 dB | 1 | 0 |
| 3 | akordy | `EP` | akordy rozłożone w synkopie | voicing blisko, C3-G4 (nic poniżej C3) | „i” 2 i 4 (kroki 7 i 15 siatki 16) | -6 dB | 1 | L 25 |
| 4 | bas | `TRI` | bas pizzicato (TRI + PIZ) | korzenie od A2, przejścia do oktawy 3 (nie poniżej E1) | wzór bossa (1, -, 5, 5): korzeń na 1, kwinta na „i” 3; do taktu 8 tylko korzenie, od 9 pełny wzór | -4 dB | 1 | 0 |
| 5 | ozdoba | `GLK` | pojedyncze dźwięki ozdoby | oktawa 5-6 | co 4 takty, ostatnia ćwierćnuta taktu | -14 dB | 4 | R 30 |

**Perkusja**

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -12 dB | `....X.......X...` |
| `SHK` | -18 dB | `X.X.X.X.X.X.X.X.` |
| `KICK` | -14 dB | `X.....X.........` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Przebieg / dynamika**

- takty 1-4: bez perkusji (wejście motywu)
- takt 5: wchodzą miotełki i shaker
- takt 9: bas pełny
- brak werbla i crashu
- Pętla: ostatni takt Dm9 G13 prowadzi do Am9 na początku; ogon pogłosu zawinięty.

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, A natural minor, 92 BPM, 4/4 time, swing 58%. Instruments: soft bell, narrow 12.5% pulse wave (plucky, nasal), electric piano, triangle wave (bass/pad), glockenspiel. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Warm signature theme, a minor to C major, bell and pulse lead. Seamless loop.

**Zakaz:** melodia szybsza niż ósemki; blacha; crash.

**Odbiór:** (1) `music-audit.js` zielony, (2) wyróżnik słyszalny: wizytówka: motyw Cuy wypowiedziany w pierwszych 2 taktach, (3) szew pętli niesłyszalny (test 5× pętli), (4) -18 LUFS ±1,5 LU, (5) wiersz w `docs/music_review/MT-11.md`.
