# MT-108 · s2_pietruszka · Pietruszka funk

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s2_pietruszka_a1`, `rec_s2_pietruszka_a2`, `rec_s2_pietruszka_b1`, `rec_s2_pietruszka_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 2 (Ogród), rzadkość: **common**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | E moll (naturalny) |
| Gama | E F# G A B C D |
| Pentatonika (melodia) | E G A B D |
| Motyw Cuy (stopnie 1 2 ♭3 5) | E4 F#4 G4 B4, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | F#4 G4 B4, rytm ♪ ♪ ♩ |
| Akord toniczny | Em9 |
| Metrum | 4/4 |
| Swing | 54% |
| Seed bazowy | 18610 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **staccato bas i wah**.
Efekty serii: REV-M 14% na melodii, bez TAPE, bez VINYL; powietrzny, szeroki stereo.

### 1.1 Słownik akordów

- `Em7` = E G B D
- `A13` = A C# G B F#
- `Cmaj7` = C E G B
- `B7♭9` = B D# F# A C
- `A13sus` = A D G B F#
- `Dmaj7` = D F# A C#
- `Dm7` = D F A C
- `G7` = G B D F
- `Em9` = E G B D F#

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Em7 | A13 | Em7 | A13 (x2) | Cmaj7 | B7♭9 | Em7 | A13sus A13 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `stc`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E4·½ F#4·½ G4·½ B4·1½ r·1 |
| 2 | B4·½ G4·½ F#4·½ G4·½ B4·½ G4·½ F#4·½ r·½ |
| 3 | G4·½ A4·½ B4·½ C5·½ B4·½ A4·½ G4·½ r·½ |
| 4 | F#4·½ G4·½ F#4·½ E4·½ F#4·2 |
| 5 | F#4·½ G4·½ A4·½ C5·1½ r·1 |
| 6 | C5·½ B4·½ A4·½ B4·½ C5·½ B4·½ A4·½ r·½ |
| 7 | G4·½ B4·½ D5·½ B4·½ C5·½ A4·½ F#4·½ r·½ |
| 8 | B4·1 G4·1 E4·2 |

Zakres A: E4-D5.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ B4·½ C5·½ E5·1½ C5·½ r·½ |
| 2 | B4·½ r·½ C5·½ B4·1 G4·½ r·1 |
| 3 | r·½ C5·½ E5·½ F#5·1½ E5·½ r·½ |
| 4 | C5·1 B4·1 G4·1 F#4·1 |
| 5 | r·½ E5·½ D5·½ C5·1½ B4·½ r·½ |
| 6 | r·½ B4·½ C5·½ B4·1½ G4·½ r·½ |
| 7 | A4·1½ G4·½ F#4·1 r·1 |
| 8 | F#4·3 r·1 |

Zakres B: F#4-F#5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 F#4·½ G4·½ B4·1`), takt N = tonika (Em9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s2_pietruszka_a1`

- Tempo **100 BPM**, 4/4, **40 taktów**, czas **96 s** (1:36).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 39 = podpis Cuy, takt 40 = tonika Em9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | A13
- takty 9-16: Cmaj7 | B7♭9 | Em7 | A13sus A13 | Cmaj7 | B7♭9 | Em7 | A13sus A13
- takty 17-24: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | A13
- takty 25-32: Cmaj7 | B7♭9 | Em7 | A13sus A13 | Cmaj7 | B7♭9 | Em7 | A13sus A13
- takty 33-40: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | Em9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bas | `TRI` | bas pulsowy staccato (16-ki) | korzenie od E2, przejścia do oktawy 3 (nie poniżej E1) | wzór X.XX.X.X na ósemkach, 2× w takcie | -2 dB | 1 | 0 |
| 2 | akordy | `P25` | stabsy „kurczak” z wah (LP z LFO 3 Hz, rezonans) | voicing blisko, C3-G4 (nic poniżej C3) | na „i” 2 i 4 oraz krok 16 | -5 dB | 1 | L 25 |
| 3 | melodia | `P12` | melodia krótka | C4-G5 (wg szkieletu) | wg szkieletu 'stc' | -4 dB | 1 | 0 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -3 dB | `X.....X..X......` |
| `SNR` | -3 dB | `....X.......X...` |
| `HAT` | -12 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, E natural minor, 100 BPM, 4/4 time, swing 54%. Instruments: triangle wave (bass/pad), 25% pulse wave (brass/piano-like), narrow 12.5% pulse wave (plucky, nasal), soft kick, noise snare, hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (E4 F#4 G4 B4). Staccato funk bass with wah stabs.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: staccato bas i wah, (3) zakaz: dzwonki; legato basu, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s2_pietruszka_a2`

- Tempo **90 BPM**, **40 taktów**, czas **107 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 A‴.

**Akordy takt po takcie**

- takty 1-8: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | A13
- takty 9-16: Cmaj7 | B7♭9 | Em7 | A13sus A13 | Cmaj7 | B7♭9 | Em7 | A13sus A13
- takty 17-24: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | A13
- takty 25-32: Cmaj7 | B7♭9 | Em7 | A13sus A13 | Cmaj7 | B7♭9 | Em7 | A13sus A13
- takty 33-40: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | Em9

**Warstwy aktywne:** `TRI` (bas, -2 dB), `P25` (akordy, -5 dB), `P12` (melodia, -4 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s2_pietruszka_b1`

- Tempo **108 BPM**, **48 taktów** (A1 + mostek 8 taktów po takcie 24), czas **107 s**.
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

**Akordy takt po takcie** (mostek: `Cmaj7 | B7♭9 | Em7 | A13 | Dmaj7 | Dm7 G7 | Cmaj7 | B7♭9`)

- takty 1-8: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | A13
- takty 9-16: Cmaj7 | B7♭9 | Em7 | A13sus A13 | Cmaj7 | B7♭9 | Em7 | A13sus A13
- takty 17-24: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | A13
- takty 25-32: Cmaj7 | B7♭9 | Em7 | A13 | Dmaj7 | Dm7 G7 | Cmaj7 | B7♭9
- takty 33-40: Cmaj7 | B7♭9 | Em7 | A13sus A13 | Cmaj7 | B7♭9 | Em7 | A13sus A13
- takty 41-48: Em7 | A13 | Em7 | A13 | Em7 | A13 | Em7 | Em9

**Zmiany względem A1**

1. Kontrmelodia `XYL` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -1 dB | `X.....X..X......` |
| `SNR` | -1 dB | `....X.......X...` |
| `HAT` | -10 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s2_pietruszka_b2`

- Tempo **80 BPM** (A1 × 0,8), **32 taktów**, czas **96 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Em7 | A13 | Em7 | A13`; powtarzana 8 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `TRI` | -3 dB | długie nuty E2-B2 |
| szum | `noise_wind` | -30 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-28: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki E G A B D, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 29-32: motyw Cuy w odwróceniu: B4 G4 F#4 E4, jedna nuta na takt (całe takty); ostatni takt: tonika Em9, ogon zostaje.
- Całość REV-M 14% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s2_pietruszka/` (nazwy `rec_s2_pietruszka_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-108.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
