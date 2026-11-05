# MT-124 · s4_taniec · Taniec w klatce

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s4_taniec_a1`, `rec_s4_taniec_a2`, `rec_s4_taniec_b1`, `rec_s4_taniec_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 4 (Retro 70-90), rzadkość: **unique**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | C moll (naturalny) |
| Gama | C D Eb F G Ab Bb |
| Pentatonika (melodia) | C Eb F G Bb |
| Motyw Cuy (stopnie 1 2 ♭3 5) | C4 D4 Eb4 G4, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | D4 Eb4 G4, rytm ♪ ♪ ♩ |
| Akord toniczny | Cm9 |
| Metrum | 4/4 |
| Swing | 50% |
| Seed bazowy | 14802 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **najszybszy utwór w grze; własny motyw (nie Nyan Cat: nie zbliżać się do jego skali, rytmu i linii)**.
Efekty serii: CRUSH tylko na perkusji, REV-S 8%, bez TAPE (poza s4_kaseta); wolno P50 i ostrzejszy kit.

### 1.1 Słownik akordów

- `Cm` = C Eb G
- `Ab` = Ab C Eb
- `Eb` = Eb G Bb
- `Bb` = Bb D F
- `Fm` = F Ab C
- `G7` = G B D F
- `Cm9` = C Eb G Bb D

### 1.2 Progresja (cykl)

Cykl 24 taktów, powtarzany; takt n gra akord (n−1 mod 24)+1. Zapis: `Cm | Ab | Eb | Bb (x4) | Fm | Ab | Bb | Cm (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

**Wariant płyty:** w taktach 1-2 motyw w ODWRÓCENIU (G4 Eb4 D4 C4, rytm ♪ ♪ ♪ ♩.), reszta szkieletu bez zmian.

Szkielet A `stc`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·½ Eb4·½ D4·½ C4·1½ r·1 |
| 2 | r·1 Eb4·½ D4·½ C4·2 |
| 3 | Eb4·½ F4·½ G4·½ Ab4·½ G4·½ F4·½ Eb4·½ r·½ |
| 4 | D4·½ Eb4·½ D4·½ C4·½ D4·2 |
| 5 | D4·½ Eb4·½ F4·½ Ab4·1½ r·1 |
| 6 | Ab4·½ G4·½ F4·½ G4·½ Ab4·½ G4·½ F4·½ r·½ |
| 7 | Eb4·½ G4·½ Bb4·½ G4·½ Ab4·½ F4·½ D4·½ r·½ |
| 8 | G4·1 Eb4·1 C4·2 |

Zakres A: C4-Bb4.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ G4·½ Ab4·½ C5·1½ Ab4·½ r·½ |
| 2 | G4·½ r·½ Ab4·½ G4·1 Eb4·½ r·1 |
| 3 | r·½ Ab4·½ C5·½ D5·1½ C5·½ r·½ |
| 4 | Ab4·1 G4·1 Eb4·1 D4·1 |
| 5 | r·½ C5·½ Bb4·½ Ab4·1½ G4·½ r·½ |
| 6 | r·½ G4·½ Ab4·½ G4·1½ Eb4·½ r·½ |
| 7 | F4·1½ Eb4·½ D4·1 r·1 |
| 8 | D4·3 r·1 |

Zakres B: D4-D5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 D4·½ Eb4·½ G4·1`), takt N = tonika (Cm9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s4_taniec_a1`

- Tempo **130 BPM**, 4/4, **60 taktów**, czas **111 s** (1:50).
- Pierwsze 2 takty cytują motyw Cuy (odwrócony); ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | B′ | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 41-48 | A‴ | temat wraca w pełnej aranżacji (szkielet A) |
| 49-56 | B″ | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 57-60 | A‵ | temat wraca w pełnej aranżacji (szkielet A); takt 59 = podpis Cuy, takt 60 = tonika Cm9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 9-16: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 17-24: Fm | Ab | Bb | Cm | Fm | Ab | Bb | Cm
- takty 25-32: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 33-40: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 41-48: Fm | Ab | Bb | Cm | Fm | Ab | Bb | Cm
- takty 49-56: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 57-60: Cm | Ab | Eb | Cm9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bas | `TRI` | bas ósemkami z synkopą | korzenie od C2, przejścia do oktawy 3 (nie poniżej E1) | ósemki, synkopa na „i” 2 | -3 dB | 1 | 0 |
| 2 | melodia | `P50` | melodia własna (pentatonika c-moll), motyw Cuy w odwróceniu w taktach 1-2 | C4-G5 (wg szkieletu) | wg szkieletu 'stc' | -3 dB | 1 | 0 |
| 3 | ozdoba | `P25` | kontrmelodia | oktawa 5-6 | przeciwny kontur do melodii | -8 dB | 9 | R 30 |
| 4 | dodatkowy głos | `HAT` | dodatkowy głos płyty unikatowej: ciągły hi-hat szesnastkowy „szum eteru” | oktawa 5-6 | 16-ki ciągłe | -16 dB | 5 | losowo ±40 |
| 5 | ozdoba | `GLK` | hook | oktawa 5-6 | co 4 takty | -9 dB | 9 | R 30 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -3 dB | `X...X...X...X...` |
| `SNR` | -3 dB | `....X.......X...` |
| `HAT` | -12 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. CRUSH na całej perkusji.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, C natural minor, 130 BPM, 4/4 time. Instruments: triangle wave (bass/pad), 50% square wave (hollow, radio-like), 25% pulse wave (brass/piano-like), hi-hat, glockenspiel, soft kick, noise snare. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (C4 D4 Eb4 G4). Fastest dance track, own original lead, minor.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: najszybszy utwór w grze; własny motyw (nie Nyan Cat: nie zbliżać się do jego skali, rytmu i linii), (3) zakaz: skala i rytm znanej piosenki o kocie, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s4_taniec_a2`

- Tempo **117 BPM**, **56 taktów** (A1 minus 4: blok powtórki wycięty, by zmieścić się w 120 s), czas **115 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 A‴; 41-48 B′; 49-56 A‵.

**Akordy takt po takcie**

- takty 1-8: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 9-16: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 17-24: Fm | Ab | Bb | Cm | Fm | Ab | Bb | Cm
- takty 25-32: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 33-40: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 41-48: Fm | Ab | Bb | Cm | Fm | Ab | Bb | Cm
- takty 49-56: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Cm9

**Warstwy aktywne:** `TRI` (bas, -3 dB), `P50` (melodia, -3 dB), `P25` (ozdoba, -8 dB), `GLK` (ozdoba, -9 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s4_taniec_b1`

- Tempo **140 BPM**, **68 taktów** (A1 + mostek 8 taktów po takcie 24), czas **117 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B |
| 25-32 | Mostek | szkielet B (takty 1-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 33-40 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 41-48 | B′ | kontrast: szkielet B |
| 49-56 | A‴ | temat wraca w pełnej aranżacji (szkielet A) |
| 57-64 | B″ | kontrast: szkielet B |
| 65-68 | A‵ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Fm | Ab | Bb | Cm | Eb | Ab | G7 | Cm`)

- takty 1-8: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 9-16: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 17-24: Fm | Ab | Bb | Cm | Fm | Ab | Bb | Cm
- takty 25-32: Fm | Ab | Bb | Cm | Eb | Ab | G7 | Cm
- takty 33-40: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 41-48: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 49-56: Fm | Ab | Bb | Cm | Fm | Ab | Bb | Cm
- takty 57-64: Cm | Ab | Eb | Bb | Cm | Ab | Eb | Bb
- takty 65-68: Cm | Ab | Eb | Cm9

**Zmiany względem A1**

1. Kontrmelodia `XYL` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -1 dB | `X...X...X...X...` |
| `SNR` | -1 dB | `....X.......X...` |
| `HAT` | -10 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. CRUSH na całej perkusji.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s4_taniec_b2`

- Tempo **104 BPM** (A1 × 0,8), **44 taktów**, czas **102 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Cm | Ab | Eb | Bb`; powtarzana 11 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `P50` | -3 dB | melodia, długie nuty |
| szum | `eter` | -42 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-40: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki C Eb F G Bb, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 41-44: motyw Cuy w odwróceniu: G4 Eb4 D4 C4, jedna nuta na takt (całe takty); ostatni takt: tonika Cm9, ogon zostaje.
- Całość CRUSH tylko na perkusji. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s4_taniec/` (nazwy `rec_s4_taniec_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-124.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
