# MT-102 · s1_marchewka · Marchewkowy beat

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s1_marchewka_a1`, `rec_s1_marchewka_a2`, `rec_s1_marchewka_b1`, `rec_s1_marchewka_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 1 (Siano & lofi), rzadkość: **common**.

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
| Swing | 56% |
| Seed bazowy | 28504 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **chrupanie w hi-hat (otwarty hat na „i” 4)**.
Efekty serii: TAPE(0.2%) na całość, LP(9 kHz), REV-S 12%, VINYL(-46 dB) pod całością (cichutko).

### 1.1 Słownik akordów

- `Gmaj9` = G B D F# A
- `Em9` = E G B D F#
- `Cmaj9` = C E G B D
- `D13` = D F# C E B
- `Bm7` = B D F# A
- `Am9` = A C E G B
- `D13sus` = D G C E B

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Gmaj9 | Em9 | Cmaj9 | D13 (x2) | Bm7 | Em9 | Am9 | D13 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·½ A4·½ B4·½ D5·1½ r·1 |
| 2 | r·1 A4·½ B4·½ D5·2 |
| 3 | D5·1 C5·½ B4·½ C5·1 B4·1 |
| 4 | A4·1½ B4·½ A4·2 |
| 5 | A4·½ B4·½ C5·½ E5·1½ r·1 |
| 6 | r·1 B4·½ C5·½ E5·2 |
| 7 | F#5·1 E5·½ D5·½ B4·1 D5·1 |
| 8 | D5·1½ B4·½ A4·1 G4·1 |

Zakres A: G4-F#5.

Szkielet B `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | D5·1 E5·1 G5·1 E5·1 |
| 2 | D5·3 r·1 |
| 3 | E5·1 G5·1 A5·1 G5·1 |
| 4 | E5·3 r·1 |
| 5 | G5·½ F#5·½ E5·½ D5·½ E5·2 |
| 6 | D5·½ E5·½ D5·½ B4·½ D5·2 |
| 7 | C5·1 B4·1 A4·1 B4·1 |
| 8 | A4·3 r·1 |

Zakres B: A4-A5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 A4·½ B4·½ D5·1`), takt N = tonika (Gmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s1_marchewka_a1`

- Tempo **84 BPM**, 4/4, **36 taktów**, czas **103 s** (1:42).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-36 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 35 = podpis Cuy, takt 36 = tonika Gmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Gmaj9 | Em9 | Cmaj9 | D13 | Gmaj9 | Em9 | Cmaj9 | D13
- takty 9-16: Bm7 | Em9 | Am9 | D13 | Bm7 | Em9 | Am9 | D13
- takty 17-24: Gmaj9 | Em9 | Cmaj9 | D13 | Gmaj9 | Em9 | Cmaj9 | D13
- takty 25-32: Bm7 | Em9 | Am9 | D13 | Bm7 | Em9 | Am9 | D13
- takty 33-36: Gmaj9 | Em9 | Cmaj9 | Gmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | frazy trzynutowe wskazujące w górę (G4 A4 B4, A4 B4 D5) | C4-G5 (wg szkieletu) | wg szkieletu 'std' | -3 dB | 1 | 0 |
| 2 | bas | `PIZ` | bas szarpany synkopowany | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | kroki 1, „i” 2, 3, „i” 4 (siatka 16: 1, 7, 9, 15) | -3 dB | 1 | 0 |
| 3 | akordy | `EP` | akordy | voicing blisko, C3-G4 (nic poniżej C3) | na „i” 2 i 4 | -8 dB | 1 | L 25 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -12 dB | `X.....X.........` |
| `SNR` | -12 dB | `....X.......X...` |
| `HAT` | -14 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. „chrupiący” hi-hat: otwarty hat 160 ms na „i” 4 (krok 15).

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G major, 84 BPM, 4/4 time, swing 56%. Instruments: narrow 12.5% pulse wave (plucky, nasal), pizzicato bass, electric piano, soft kick, noise snare, hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (G4 A4 B4 D5). Bouncy plucked lo-fi beat with a crunchy open hi-hat.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: chrupanie w hi-hat (otwarty hat na „i” 4), (3) zakaz: szybkie nuty melodii (>ósemki), (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s1_marchewka_a2`

- Tempo **76 BPM**, **36 taktów**, czas **114 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-36 A‴.

**Akordy takt po takcie**

- takty 1-8: Gmaj9 | Em9 | Cmaj9 | D13 | Gmaj9 | Em9 | Cmaj9 | D13
- takty 9-16: Bm7 | Em9 | Am9 | D13 | Bm7 | Em9 | Am9 | D13
- takty 17-24: Gmaj9 | Em9 | Cmaj9 | D13 | Gmaj9 | Em9 | Cmaj9 | D13
- takty 25-32: Bm7 | Em9 | Am9 | D13 | Bm7 | Em9 | Am9 | D13
- takty 33-36: Gmaj9 | Em9 | Cmaj9 | Gmaj9

**Warstwy aktywne:** `P12` (melodia, -3 dB), `PIZ` (bas, -3 dB), `EP` (akordy, -8 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s1_marchewka_b1`

- Tempo **91 BPM**, **44 taktów** (A1 + mostek 8 taktów po takcie 24), czas **116 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B |
| 25-32 | Mostek | szkielet B (takty 1-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 33-40 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 41-44 | A‴ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Em9 | Am9 | D13 | Gmaj9 | Cmaj9 | Am9 | D13sus D13 | Gmaj9`)

- takty 1-8: Gmaj9 | Em9 | Cmaj9 | D13 | Gmaj9 | Em9 | Cmaj9 | D13
- takty 9-16: Bm7 | Em9 | Am9 | D13 | Bm7 | Em9 | Am9 | D13
- takty 17-24: Gmaj9 | Em9 | Cmaj9 | D13 | Gmaj9 | Em9 | Cmaj9 | D13
- takty 25-32: Em9 | Am9 | D13 | Gmaj9 | Cmaj9 | Am9 | D13sus D13 | Gmaj9
- takty 33-40: Bm7 | Em9 | Am9 | D13 | Bm7 | Em9 | Am9 | D13
- takty 41-44: Gmaj9 | Em9 | Cmaj9 | Gmaj9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -10 dB | `X.....X.........` |
| `SNR` | -10 dB | `....X.......X...` |
| `HAT` | -12 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. „chrupiący” hi-hat: otwarty hat 160 ms na „i” 4 (krok 15).

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s1_marchewka_b2`

- Tempo **67 BPM** (A1 × 0,8), **28 taktów**, czas **100 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Gmaj9 | Em9 | Cmaj9 | D13`; powtarzana 7 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `PIZ` | -3 dB | powolne korzenie G2-D3, półnuty |
| szum | `noise_vinyl_crackle` | -38 dB | szum serii (domyślny) |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-24: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki G A B D E, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 25-28: motyw Cuy w odwróceniu: D5 B4 A4 G4, jedna nuta na takt (całe takty); ostatni takt: tonika Gmaj9, ogon zostaje.
- Całość TAPE(0.2%) na całość. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s1_marchewka/` (nazwy `rec_s1_marchewka_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-102.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
