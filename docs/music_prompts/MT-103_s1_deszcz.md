# MT-103 · s1_deszcz · Deszcz na dachu

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s1_deszcz_a1`, `rec_s1_deszcz_a2`, `rec_s1_deszcz_b1`, `rec_s1_deszcz_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 1 (Siano & lofi), rzadkość: **common**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | E♭ dur |
| Gama | Eb F G Ab Bb C D |
| Pentatonika (melodia) | Eb F G Bb C |
| Motyw Cuy (stopnie 1 2 3 5) | Eb4 F4 G4 Bb4, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | F4 G4 Bb4, rytm ♪ ♪ ♩ |
| Akord toniczny | Ebmaj9 |
| Metrum | 4/4 |
| Swing | 62% |
| Seed bazowy | 49600 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **deszcz w tle, ballada jazzowa**.
Efekty serii: TAPE(0.2%) na całość, LP(9 kHz), REV-S 12%, VINYL(-46 dB) pod całością (cichutko).

### 1.1 Słownik akordów

- `Ebmaj9` = Eb G Bb D F
- `Cm9` = C Eb G Bb D
- `Fm9` = F Ab C Eb G
- `Bb13` = Bb D Ab C G
- `Abmaj9` = Ab C Eb G Bb
- `Abm6` = Ab Cb Eb F
- `Gm7` = G Bb D F
- `C7♭9` = C E G Bb Db

### 1.2 Progresja (cykl)

Cykl 24 taktów, powtarzany; takt n gra akord (n−1 mod 24)+1. Zapis: `Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 (x3)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `bal`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | Eb4·½ F4·½ G4·½ Bb4·2½ |
| 2 | r·2 G4·1 F4·1 |
| 3 | Eb4·1½ F4·½ G4·2 |
| 4 | r·1 Bb4·1 G4·1 F4·1 |
| 5 | F4·½ G4·½ Ab4·½ C5·2½ |
| 6 | r·2 Bb4·1 Ab4·1 |
| 7 | G4·1½ Ab4·½ Bb4·2 |
| 8 | r·1 G4·1 F4·1 Eb4·1 |

Zakres A: Eb4-C5.

Szkielet B `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | Bb4·2 C5·2 |
| 2 | Eb5·3 r·1 |
| 3 | F5·2 Eb5·2 |
| 4 | C5·3 r·1 |
| 5 | Bb4·2 C5·2 |
| 6 | Bb4·3 r·1 |
| 7 | Ab4·2 G4·2 |
| 8 | F4·3 r·1 |

Zakres B: F4-F5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 F4·½ G4·½ Bb4·1`), takt N = tonika (Ebmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s1_deszcz_a1`

- Tempo **66 BPM**, 4/4, **28 taktów**, czas **102 s** (1:42).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-20 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 21-28 | A″ | temat wraca w pełnej aranżacji (szkielet A); takt 27 = podpis Cuy, takt 28 = tonika Ebmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 9-16: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 17-24: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 25-28: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `EP` | balladowy fortepian, melodia | C4-G5 (wg szkieletu) | wg szkieletu 'bal' | -2 dB | 1 | 0 |
| 2 | akordy | `EP` | akordy rozłożone ósemkami | voicing blisko, C3-G4 (nic poniżej C3) | arpeggio w górę | -6 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas co 2 takty (korzeń, półnuta ligowana) | korzenie od Eb2, przejścia do oktawy 3 (nie poniżej E1) | takty nieparzyste | -6 dB | 1 | 0 |
| 4 | szum | `noise_rain` | deszcz na dachu przez cały utwór | - | w A2: -22 | -26 dB | 1 | szeroko ±50 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -16 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, Eb major, 66 BPM, 4/4 time, swing 62%. Instruments: electric piano, triangle wave (bass/pad), brush swishes. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (Eb4 F4 G4 Bb4). Jazz ballad on electric piano with rain on a roof.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: deszcz w tle, ballada jazzowa, (3) zakaz: stopa; solo dłuższe niż 4 takty, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s1_deszcz_a2`

- Tempo **59 BPM**, **28 taktów**, czas **114 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-20 B; 21-28 A″.

**Akordy takt po takcie**

- takty 1-8: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 9-16: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 17-24: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 25-28: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9

**Warstwy aktywne:** `EP` (melodia, -2 dB), `EP` (akordy, -6 dB), `TRI` (bas, -6 dB), `noise_rain` (szum, -26 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s1_deszcz_b1`

- Tempo **71 BPM**, **32 taktów** (A1 + mostek 4 taktów po takcie 20 — skrócony z 8, by zmieścić się w 120 s), czas **108 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-20 | B | kontrast: szkielet B |
| 21-24 | Mostek | szkielet B (takty 5-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Abmaj9 | Gm7 | Fm9 | Bb13`)

- takty 1-8: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 9-16: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13
- takty 17-24: Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9 | Abmaj9 | Gm7 | Fm9 | Bb13
- takty 25-32: Abmaj9 | Abm6 | Gm7 C7♭9 | Fm9 Bb13 | Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9

**Zmiany względem A1**

1. Kontrmelodia `BELL` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -14 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s1_deszcz_b2`

- Tempo **53 BPM** (A1 × 0,8), **24 taktów**, czas **109 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Ebmaj9 | Cm9 | Fm9 Bb13 | Ebmaj9`; powtarzana 6 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `EP` | -3 dB | melodia w oktawie 4, długie nuty |
| szum | `noise_rain` | -20 dB | głośniejszy deszcz |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-20: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki Eb F G Bb C, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 21-24: motyw Cuy w odwróceniu: Bb4 G4 F4 Eb4, jedna nuta na takt (całe takty); ostatni takt: tonika Ebmaj9, ogon zostaje.
- Całość TAPE(0.2%) na całość. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s1_deszcz/` (nazwy `rec_s1_deszcz_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-103.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
