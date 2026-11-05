# MT-120 · s4_synth · Synth fala

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s4_synth_a1`, `rec_s4_synth_a2`, `rec_s4_synth_b1`, `rec_s4_synth_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 4 (Retro 70-90), rzadkość: **rare**.

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
| Swing | 50% |
| Seed bazowy | 83906 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **synthwave z gated snare**.
Efekty serii: CRUSH tylko na perkusji, REV-S 8%, bez TAPE (poza s4_kaseta); wolno P50 i ostrzejszy kit.

### 1.1 Słownik akordów

- `Em` = E G B
- `C` = C E G
- `G` = G B D
- `D` = D F# A
- `Am` = A C E
- `Bm` = B D F#
- `B7` = B D# F# A
- `Em9` = E G B D F#

### 1.2 Progresja (cykl)

Cykl 24 taktów, powtarzany; takt n gra akord (n−1 mod 24)+1. Zapis: `Em | C | G | D (x4) | Am | C | D | Bm (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E4·½ F#4·½ G4·½ B4·1½ r·1 |
| 2 | r·1 F#4·½ G4·½ B4·2 |
| 3 | B4·1 A4·½ G4·½ A4·1 G4·1 |
| 4 | F#4·1½ G4·½ F#4·2 |
| 5 | F#4·½ G4·½ A4·½ C5·1½ r·1 |
| 6 | r·1 G4·½ A4·½ C5·2 |
| 7 | D5·1 C5·½ B4·½ G4·1 B4·1 |
| 8 | B4·1½ G4·½ F#4·1 E4·1 |

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

## 2. Utwór A1 (podpisowy): `rec_s4_synth_a1`

- Tempo **105 BPM**, 4/4, **48 taktów**, czas **110 s** (1:50).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | B′ | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 41-48 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 47 = podpis Cuy, takt 48 = tonika Em9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Em | C | G | D | Em | C | G | D
- takty 9-16: Em | C | G | D | Em | C | G | D
- takty 17-24: Am | C | D | Bm | Am | C | D | Bm
- takty 25-32: Em | C | G | D | Em | C | G | D
- takty 33-40: Em | C | G | D | Em | C | G | D
- takty 41-48: Am | C | D | Bm | Am | C | D | Em9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pad | `PAD` | pad szeroki (7 trójkątów ±12 centów, atak 0,8 s) | C3-C5, szeroko | długie akordy | -6 dB | 1 | szeroko ±35 |
| 2 | faktura | `P25` | arpeggio szesnastkami (E-G-B-E w górę i w dół) | oktawa 4-5 | 16-ki ciągłe | -4 dB | 1 | R 20 |
| 3 | bas | `TRI` | bas ósemkami | korzenie od E2, przejścia do oktawy 3 (nie poniżej E1) | ósemki na korzeniu | -3 dB | 1 | 0 |
| 4 | melodia | `P50` | melodia prowadząca (dodatkowy głos płyty rzadkiej) | C4-G5 (wg szkieletu) | wg szkieletu 'std' | -5 dB | 1 | 0 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -4 dB | `X...X...X...X...` |
| `SNR` | -4 dB | `....X.......X...` |
| `HAT` | -14 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. SNR z gated reverb: ogon 250 ms ucięty.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, E natural minor, 105 BPM, 4/4 time. Instruments: detuned triangle pad, 25% pulse wave (brass/piano-like), triangle wave (bass/pad), 50% square wave (hollow, radio-like), soft kick, noise snare, hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (E4 F#4 G4 B4). Synthwave with arpeggios and gated snare.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: synthwave z gated snare, (3) zakaz: saw; zbyt długi pogłos bez gate, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s4_synth_a2`

- Tempo **95 BPM**, **44 taktów** (A1 minus 4: blok powtórki wycięty, by zmieścić się w 120 s), czas **111 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 B′; 41-44 A‴.

**Akordy takt po takcie**

- takty 1-8: Em | C | G | D | Em | C | G | D
- takty 9-16: Em | C | G | D | Em | C | G | D
- takty 17-24: Am | C | D | Bm | Am | C | D | Bm
- takty 25-32: Em | C | G | D | Em | C | G | D
- takty 33-40: Em | C | G | D | Em | C | G | D
- takty 41-44: Am | C | D | Em9

**Warstwy aktywne:** `PAD` (pad, -6 dB), `P25` (faktura, -4 dB), `TRI` (bas, -3 dB), `P50` (melodia, -5 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s4_synth_b1`

- Tempo **113 BPM**, **56 taktów** (A1 + mostek 8 taktów po takcie 24), czas **119 s**.
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

**Akordy takt po takcie** (mostek: `Am | C | D | Bm | Em | C | D | B7`)

- takty 1-8: Em | C | G | D | Em | C | G | D
- takty 9-16: Em | C | G | D | Em | C | G | D
- takty 17-24: Am | C | D | Bm | Am | C | D | Bm
- takty 25-32: Am | C | D | Bm | Em | C | D | B7
- takty 33-40: Em | C | G | D | Em | C | G | D
- takty 41-48: Em | C | G | D | Em | C | G | D
- takty 49-56: Am | C | D | Bm | Am | C | D | Em9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-10 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -2 dB | `X...X...X...X...` |
| `SNR` | -2 dB | `....X.......X...` |
| `HAT` | -12 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. SNR z gated reverb: ogon 250 ms ucięty.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s4_synth_b2`

- Tempo **84 BPM** (A1 × 0,8), **36 taktów**, czas **103 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Em | C | G | D`; powtarzana 9 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `P25` | -3 dB | arpeggio zwolnione, 1 nuta na ćwierćnutę |
| szum | `eter` | -42 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-32: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki E G A B D, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 33-36: motyw Cuy w odwróceniu: B4 G4 F#4 E4, jedna nuta na takt (całe takty); ostatni takt: tonika Em9, ogon zostaje.
- Całość CRUSH tylko na perkusji. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s4_synth/` (nazwy `rec_s4_synth_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-120.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
