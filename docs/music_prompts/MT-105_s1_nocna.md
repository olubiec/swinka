# MT-105 · s1_nocna · Nocna ścieżka

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s1_nocna_a1`, `rec_s1_nocna_a2`, `rec_s1_nocna_b1`, `rec_s1_nocna_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 1 (Siano & lofi), rzadkość: **rare**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | D dorycki |
| Gama | D E F G A B C |
| Pentatonika (melodia) | D F G A C |
| Motyw Cuy (stopnie 1 2 ♭3 5) | D4 E4 F4 A4, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | E4 F4 A4, rytm ♪ ♪ ♩ |
| Akord toniczny | Dm9 |
| Metrum | 4/4 |
| Swing | 66% |
| Seed bazowy | 8345 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **blues dorycki, walking bass i blue-note dzwonka**.
Efekty serii: TAPE(0.2%) na całość, LP(9 kHz), REV-S 12%, VINYL(-46 dB) pod całością (cichutko).

### 1.1 Słownik akordów

- `Dm9` = D F A C E
- `G13` = G B F A E
- `Em9` = E G B D F#
- `A13` = A C# G B F#
- `Gm9` = G Bb D F A
- `C13` = C E Bb D A
- `Fmaj9` = F A C E G
- `Bb13` = Bb D Ab C G
- `A7♭9` = A C# E G Bb

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Dm9 | G13 | Dm9 | G13 (x2) | Em9 | A13 | Dm9*2 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ D4·½ E4·½ F4·½ A4·1½ r·½ |
| 2 | r·1½ F4·½ A4·½ B4·1 r·½ |
| 3 | A4·½ r·½ A4·½ F4·1 E4·½ r·1 |
| 4 | F4·1½ D4·½ E4·1 r·1 |
| 5 | r·½ E4·½ F4·½ G4·½ B4·1½ r·½ |
| 6 | r·1½ G4·½ B4·½ C5·1 r·½ |
| 7 | B4·½ r·½ A4·½ G4·1 F4·½ r·1 |
| 8 | E4·1½ F4·½ D4·2 |

Zakres A: D4-C5.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ A4·½ B4·½ D5·1½ B4·½ r·½ |
| 2 | A4·½ r·½ B4·½ A4·1 F4·½ r·1 |
| 3 | r·½ B4·½ D5·½ E5·1½ D5·½ r·½ |
| 4 | B4·1 A4·1 F4·1 E4·1 |
| 5 | r·½ D5·½ C5·½ B4·1½ A4·½ r·½ |
| 6 | r·½ A4·½ B4·½ A4·1½ F4·½ r·½ |
| 7 | G4·1½ F4·½ E4·1 r·1 |
| 8 | E4·3 r·1 |

Zakres B: E4-E5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 E4·½ F4·½ A4·1`), takt N = tonika (Dm9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s1_nocna_a1`

- Tempo **122 BPM**, 4/4, **56 taktów**, czas **110 s** (1:50).
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
| 49-56 | A‵ | temat wraca w pełnej aranżacji (szkielet A); takt 55 = podpis Cuy, takt 56 = tonika Dm9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 9-16: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 17-24: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 25-32: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 33-40: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 41-48: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 49-56: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | Dm9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bas | `TRI` | walking bass ćwierćnutami (korzeń-kwinta-przejście) | korzenie od D2, przejścia do oktawy 3 (nie poniżej E1) | 4 ćwierćnuty/takt | -3 dB | 1 | 0 |
| 2 | akordy | `EP` | stabsy | voicing blisko, C3-G4 (nic poniżej C3) | na „i” 2 i 4 | -6 dB | 1 | L 25 |
| 3 | melodia | `P12` | melodia dorycka (D-F-G-A-C) | C4-G5 (wg szkieletu) | wg szkieletu 'syn' | -3 dB | 1 | 0 |
| 4 | dodatkowy głos | `BELL` | dodatkowy głos płyty rzadkiej: blue-note (Ab jako przejście do G), pojedyncza nuta | oktawa 5-6 | co 8 taktów, 2. połowa taktu | -12 dB | 9 | losowo ±40 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 12 triolowych na takt (shuffle)) |
| --- | --- | --- |
| `SNR` | -12 dB | `...X.....X..` |
| `KICK` | -14 dB | `X.....X.....` |
| `HAT` | -14 dB | `X.XX.XX.XX.X` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. SNR to miotełkowy szum 3-8 kHz, miękki; KICK cicha tylko na 1.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, D dorian, 122 BPM, 4/4 time, swing 66%. Instruments: triangle wave (bass/pad), electric piano, narrow 12.5% pulse wave (plucky, nasal), soft bell, noise snare, soft kick, hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (D4 E4 F4 A4). Midnight doriian blues with walking bass and a blue-note bell.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: blues dorycki, walking bass i blue-note dzwonka, (3) zakaz: werbel pełny; crash, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s1_nocna_a2`

- Tempo **110 BPM**, **52 taktów** (A1 minus 4: blok powtórki wycięty, by zmieścić się w 120 s), czas **113 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 A‴; 41-48 B′; 49-52 A‵.

**Akordy takt po takcie**

- takty 1-8: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 9-16: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 17-24: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 25-32: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 33-40: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 41-48: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 49-52: Dm9 | G13 | Dm9 | Dm9

**Warstwy aktywne:** `TRI` (bas, -3 dB), `EP` (akordy, -6 dB), `P12` (melodia, -3 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s1_nocna_b1`

- Tempo **132 BPM**, **64 taktów** (A1 + mostek 8 taktów po takcie 24), czas **116 s**.
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

**Akordy takt po takcie** (mostek: `Gm9 | C13 | Fmaj9 | Bb13 | Em9 | A13 | Dm9 | A7♭9`)

- takty 1-8: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 9-16: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 17-24: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 25-32: Gm9 | C13 | Fmaj9 | Bb13 | Em9 | A13 | Dm9 | A7♭9
- takty 33-40: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 41-48: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | G13
- takty 49-56: Em9 | A13 | Dm9 | Dm9 | Em9 | A13 | Dm9 | Dm9
- takty 57-64: Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Dm9 | Dm9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-10 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 12 triolowych na takt (shuffle)) |
| --- | --- | --- |
| `SNR` | -10 dB | `...X.....X..` |
| `KICK` | -12 dB | `X.....X.....` |
| `HAT` | -12 dB | `X.XX.XX.XX.X` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. SNR to miotełkowy szum 3-8 kHz, miękki; KICK cicha tylko na 1.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s1_nocna_b2`

- Tempo **98 BPM** (A1 × 0,8), **40 taktów**, czas **98 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Dm9 | G13 | Dm9 | G13`; powtarzana 10 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `EP` | -3 dB | melodia dorycka D-F-G-A-C, długie nuty |
| szum | `noise_vinyl_crackle` | -38 dB | szum serii (domyślny) |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-36: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki D F G A C, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 37-40: motyw Cuy w odwróceniu: A4 F4 E4 D4, jedna nuta na takt (całe takty); ostatni takt: tonika Dm9, ogon zostaje.
- Całość TAPE(0.2%) na całość. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s1_nocna/` (nazwy `rec_s1_nocna_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-105.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
