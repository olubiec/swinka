# MT-123 · s4_arcade · Arcade

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s4_arcade_a1`, `rec_s4_arcade_a2`, `rec_s4_arcade_b1`, `rec_s4_arcade_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 4 (Retro 70-90), rzadkość: **common**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | G dur |
| Gama | G A B C D E F# |
| Pentatonika (melodia) | G A B D E |
| Motyw Cuy (stopnie 1 2 3 5) | G4 A4 B4 D5, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | A4 B4 D5, rytm ♪ ♪ ♩ |
| Akord toniczny | Gmaj9 |
| Metrum | 4/4 |
| Swing | 50% |
| Seed bazowy | 88953 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **chiptune dance**.
Efekty serii: CRUSH tylko na perkusji, REV-S 8%, bez TAPE (poza s4_kaseta); wolno P50 i ostrzejszy kit.

### 1.1 Słownik akordów

- `G` = G B D
- `D` = D F# A
- `Em` = E G B
- `C` = C E G
- `Am` = A C E
- `D7` = D F# A C
- `Gmaj9` = G B D F# A

### 1.2 Progresja (cykl)

Cykl 24 taktów, powtarzany; takt n gra akord (n−1 mod 24)+1. Zapis: `G | D | Em | C (x4) | Am | C | D | G (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `stc`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·½ A4·½ B4·½ D5·1½ r·1 |
| 2 | D5·½ B4·½ A4·½ B4·½ D5·½ B4·½ A4·½ r·½ |
| 3 | B4·½ C5·½ D5·½ E5·½ D5·½ C5·½ B4·½ r·½ |
| 4 | A4·½ B4·½ A4·½ G4·½ A4·2 |
| 5 | A4·½ B4·½ C5·½ E5·1½ r·1 |
| 6 | E5·½ D5·½ C5·½ D5·½ E5·½ D5·½ C5·½ r·½ |
| 7 | B4·½ D5·½ F#5·½ D5·½ E5·½ C5·½ A4·½ r·½ |
| 8 | D5·1 B4·1 G4·2 |

Zakres A: G4-F#5.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ D5·½ E5·½ G5·1½ E5·½ r·½ |
| 2 | D5·½ r·½ E5·½ D5·1 B4·½ r·1 |
| 3 | r·½ E5·½ G5·½ A5·1½ G5·½ r·½ |
| 4 | E5·1 D5·1 B4·1 A4·1 |
| 5 | r·½ G5·½ F#5·½ E5·1½ D5·½ r·½ |
| 6 | r·½ D5·½ E5·½ D5·1½ B4·½ r·½ |
| 7 | C5·1½ B4·½ A4·1 r·1 |
| 8 | A4·3 r·1 |

Zakres B: A4-A5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 A4·½ B4·½ D5·1`), takt N = tonika (Gmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s4_arcade_a1`

- Tempo **135 BPM**, 4/4, **56 taktów**, czas **100 s** (1:40).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | A‴ | temat wraca w pełnej aranżacji (szkielet A) |
| 41-48 | B′ | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 49-56 | A‵ | temat wraca w pełnej aranżacji (szkielet A); takt 55 = podpis Cuy, takt 56 = tonika Gmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: G | D | Em | C | G | D | Em | C
- takty 9-16: G | D | Em | C | G | D | Em | C
- takty 17-24: Am | C | D | G | Am | C | D | G
- takty 25-32: G | D | Em | C | G | D | Em | C
- takty 33-40: G | D | Em | C | G | D | Em | C
- takty 41-48: Am | C | D | G | Am | C | D | G
- takty 49-56: G | D | Em | C | G | D | Em | Gmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bas | `TRI` | bas ósemkami | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | ósemki na korzeniu | -3 dB | 1 | 0 |
| 2 | melodia | `P25` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'stc' | -3 dB | 1 | 0 |
| 3 | faktura | `P50` | arpeggio | oktawa 4-5 | szesnastki w górę | -8 dB | 1 | R 20 |
| 4 | ozdoba | `GLK` | akcent | oktawa 5-6 | co 8 taktów | -10 dB | 9 | R 30 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -3 dB | `X...X...X...X...` |
| `SNR` | -3 dB | `....X.......X...` |
| `HAT` | -12 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. HAT szesnastki z CRUSH.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G major, 135 BPM, 4/4 time. Instruments: triangle wave (bass/pad), 25% pulse wave (brass/piano-like), 50% square wave (hollow, radio-like), glockenspiel, soft kick, noise snare, hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (G4 A4 B4 D5). Fast arcade chiptune dance.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: chiptune dance, (3) zakaz: wolne zawieszenia w A1/B1, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s4_arcade_a2`

- Tempo **122 BPM**, **56 taktów**, czas **110 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 A‴; 41-48 B′; 49-56 A‵.

**Akordy takt po takcie**

- takty 1-8: G | D | Em | C | G | D | Em | C
- takty 9-16: G | D | Em | C | G | D | Em | C
- takty 17-24: Am | C | D | G | Am | C | D | G
- takty 25-32: G | D | Em | C | G | D | Em | C
- takty 33-40: G | D | Em | C | G | D | Em | C
- takty 41-48: Am | C | D | G | Am | C | D | G
- takty 49-56: G | D | Em | C | G | D | Em | Gmaj9

**Warstwy aktywne:** `TRI` (bas, -3 dB), `P25` (melodia, -3 dB), `P50` (faktura, -8 dB), `GLK` (ozdoba, -10 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s4_arcade_b1`

- Tempo **146 BPM**, **64 taktów** (A1 + mostek 8 taktów po takcie 24), czas **105 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B |
| 25-32 | Mostek | szkielet B (takty 1-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 33-40 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 41-48 | A‴ | temat wraca w pełnej aranżacji (szkielet A) |
| 49-56 | B′ | kontrast: szkielet B |
| 57-64 | A‵ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Am | Em | C | D | Am | C | D | D7`)

- takty 1-8: G | D | Em | C | G | D | Em | C
- takty 9-16: G | D | Em | C | G | D | Em | C
- takty 17-24: Am | C | D | G | Am | C | D | G
- takty 25-32: Am | Em | C | D | Am | C | D | D7
- takty 33-40: G | D | Em | C | G | D | Em | C
- takty 41-48: G | D | Em | C | G | D | Em | C
- takty 49-56: Am | C | D | G | Am | C | D | G
- takty 57-64: G | D | Em | C | G | D | Em | Gmaj9

**Zmiany względem A1**

1. Kontrmelodia `XYL` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -1 dB | `X...X...X...X...` |
| `SNR` | -1 dB | `....X.......X...` |
| `HAT` | -10 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. HAT szesnastki z CRUSH.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s4_arcade_b2`

- Tempo **108 BPM** (A1 × 0,8), **44 taktów**, czas **98 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `G | D | Em | C`; powtarzana 11 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `P25` | -3 dB | melodia, długie nuty |
| szum | `eter` | -42 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-40: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki G A B D E, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 41-44: motyw Cuy w odwróceniu: D5 B4 A4 G4, jedna nuta na takt (całe takty); ostatni takt: tonika Gmaj9, ogon zostaje.
- Całość CRUSH tylko na perkusji. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s4_arcade/` (nazwy `rec_s4_arcade_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-123.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
