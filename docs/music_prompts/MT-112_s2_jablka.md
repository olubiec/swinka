# MT-112 · s2_jablka · Zimowe jabłka

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s2_jablka_a1`, `rec_s2_jablka_a2`, `rec_s2_jablka_b1`, `rec_s2_jablka_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 2 (Ogród), rzadkość: **common**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | A moll (naturalny) |
| Gama | A B C D E F G |
| Pentatonika (melodia) | A C D E G |
| Motyw Cuy (stopnie 1 2 ♭3 5) | A4 B4 C5 E5, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | B4 C5 E5, rytm ♪ ♪ ♩ |
| Akord toniczny | Am9 |
| Metrum | 3/4 |
| Swing | 50% |
| Seed bazowy | 62831 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **folkowy walc zimowy z kryształkami**.
Efekty serii: REV-M 14% na melodii, bez TAPE, bez VINYL; powietrzny, szeroki stereo.

### 1.1 Słownik akordów

- `Am` = A C E
- `Dm` = D F A
- `E7` = E G# B D
- `F` = F A C
- `C` = C E G
- `G` = G B D
- `Am9` = A C E G B

### 1.2 Progresja (cykl)

Cykl 20 taktów, powtarzany; takt n gra akord (n−1 mod 20)+1. Zapis: `Am | Dm | E7 | Am (x2) | F | C | G | E7 (x2) | Am | Dm | E7 | Am`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `wlz`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A4·½ B4·½ C5·½ E5·1½ |
| 2 | r·1 C5·½ E5·½ F5·1 |
| 3 | E5·1 D5·½ C5·½ D5·1 |
| 4 | B4·1½ C5·½ B4·1 |
| 5 | B4·½ C5·½ D5·½ F5·1½ |
| 6 | r·1 D5·½ F5·½ G5·1 |
| 7 | F5·1 E5·½ D5·½ C5·1 |
| 8 | B4·1 A4·2 |

Zakres A: A4-G5.

Szkielet B `wlz`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E5·1 F5·1 A5·1 |
| 2 | A5·2 r·1 |
| 3 | B5·1 A5·1 F5·1 |
| 4 | F5·2 r·1 |
| 5 | A5·½ G5·½ F5·½ E5·½ F5·1 |
| 6 | E5·1 C5·1 E5·1 |
| 7 | D5·1 C5·1 B4·1 |
| 8 | B4·2 r·1 |

Zakres B: B4-B5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 B4·½ C5·½ E5·1`), takt N = tonika (Am9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s2_jablka_a1`

- Tempo **90 BPM**, 3/4, **48 taktów**, czas **96 s** (1:36).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | B′ | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 41-48 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 47 = podpis Cuy, takt 48 = tonika Am9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Am | Dm | E7 | Am | Am | Dm | E7 | Am
- takty 9-16: F | C | G | E7 | F | C | G | E7
- takty 17-24: Am | Dm | E7 | Am | Am | Dm | E7 | Am
- takty 25-32: Am | Dm | E7 | Am | F | C | G | E7
- takty 33-40: F | C | G | E7 | Am | Dm | E7 | Am
- takty 41-48: Am | Dm | E7 | Am | Am | Dm | E7 | Am9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | szarpnięcia melodii | C4-G5 (wg szkieletu) | wg szkieletu 'wlz' | -2 dB | 1 | 0 |
| 2 | bas | `TRI` | bas na 1 | korzenie od A2, przejścia do oktawy 3 (nie poniżej E1) | ćwierćnuta na 1 | -4 dB | 1 | 0 |
| 3 | akordy | `P12` | akord na 2-3 | voicing blisko, C3-G4 (nic poniżej C3) | ćwierćnuty 2 i 3 | -8 dB | 1 | L 25 |
| 4 | ozdoba | `BELL` | zimowe kryształki | oktawa 5-6 | pojedyncza nuta co 8 taktów (E6) | -12 dB | 5 | R 30 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 3. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 12 szesnastek na takt 3/4) |
| --- | --- | --- |
| `BRSH` | -16 dB | `....X...X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, A natural minor, 90 BPM, 3/4 time. Instruments: narrow 12.5% pulse wave (plucky, nasal), triangle wave (bass/pad), soft bell, brush swishes. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (A4 B4 C5 E5). Folk waltz with winter crystal chimes.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: folkowy walc zimowy z kryształkami, (3) zakaz: metrum 4/4; perkusja inna niż miotełki, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s2_jablka_a2`

- Tempo **81 BPM**, **48 taktów**, czas **107 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 B′; 41-48 A‴.

**Akordy takt po takcie**

- takty 1-8: Am | Dm | E7 | Am | Am | Dm | E7 | Am
- takty 9-16: F | C | G | E7 | F | C | G | E7
- takty 17-24: Am | Dm | E7 | Am | Am | Dm | E7 | Am
- takty 25-32: Am | Dm | E7 | Am | F | C | G | E7
- takty 33-40: F | C | G | E7 | Am | Dm | E7 | Am
- takty 41-48: Am | Dm | E7 | Am | Am | Dm | E7 | Am9

**Warstwy aktywne:** `P12` (melodia, -2 dB), `TRI` (bas, -4 dB), `P12` (akordy, -8 dB), `BELL` (ozdoba, -12 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s2_jablka_b1`

- Tempo **97 BPM**, **56 taktów** (A1 + mostek 8 taktów po takcie 24), czas **104 s**.
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

**Akordy takt po takcie** (mostek: `F | G | Am | E7 | F | Dm | E7 | Am`)

- takty 1-8: Am | Dm | E7 | Am | Am | Dm | E7 | Am
- takty 9-16: F | C | G | E7 | F | C | G | E7
- takty 17-24: Am | Dm | E7 | Am | Am | Dm | E7 | Am
- takty 25-32: F | G | Am | E7 | F | Dm | E7 | Am
- takty 33-40: Am | Dm | E7 | Am | F | C | G | E7
- takty 41-48: F | C | G | E7 | Am | Dm | E7 | Am
- takty 49-56: Am | Dm | E7 | Am | Am | Dm | E7 | Am9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 12 szesnastek na takt 3/4) |
| --- | --- | --- |
| `BRSH` | -14 dB | `....X...X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s2_jablka_b2`

- Tempo **72 BPM** (A1 × 0,8), **40 taktów**, czas **100 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Am | Dm | E7 | Am`; powtarzana 10 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `P12` | -3 dB | melodia w oktawie 4, długie nuty |
| szum | `noise_wind` | -30 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-36: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki A C D E G, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 37-40: motyw Cuy w odwróceniu: E5 C5 B4 A4, jedna nuta na takt (całe takty); ostatni takt: tonika Am9, ogon zostaje.
- Całość REV-M 14% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s2_jablka/` (nazwy `rec_s2_jablka_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-112.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
