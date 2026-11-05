# MT-116 · s3_kolysanka · Kołysanka

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s3_kolysanka_a1`, `rec_s3_kolysanka_a2`, `rec_s3_kolysanka_b1`, `rec_s3_kolysanka_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 3 (Nocne zabawy), rzadkość: **common**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | C dur |
| Gama | C D E F G A B |
| Pentatonika (melodia) | C D E G A |
| Motyw Cuy (stopnie 1 2 3 5) | C4 D4 E4 G4, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | D4 E4 G4, rytm ♪ ♪ ♩ |
| Akord toniczny | Cmaj9 |
| Metrum | 4/4 |
| Swing | 50% |
| Seed bazowy | 35476 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **zabawkowa orkiestra**.
Efekty serii: REV-L 25% na melodii, TAPE(0.3%), LP(8 kHz); miękkie ataki.

### 1.1 Słownik akordów

- `C` = C E G
- `G` = G B D
- `Am` = A C E
- `F` = F A C
- `Em` = E G B
- `G7` = G B D F
- `Dm` = D F A
- `Cmaj9` = C E G B D

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `C | G | Am | F (x2) | C | Em | F | G7 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | C4·½ D4·½ E4·½ G4·1½ r·1 |
| 2 | r·1 D4·½ E4·½ G4·2 |
| 3 | G4·1 F4·½ E4·½ F4·1 E4·1 |
| 4 | D4·1½ E4·½ D4·2 |
| 5 | D4·½ E4·½ F4·½ A4·1½ r·1 |
| 6 | r·1 E4·½ F4·½ A4·2 |
| 7 | B4·1 A4·½ G4·½ E4·1 G4·1 |
| 8 | G4·1½ E4·½ D4·1 C4·1 |

Zakres A: C4-B4.

Szkielet B `std`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·1 A4·1 C5·1 A4·1 |
| 2 | G4·3 r·1 |
| 3 | A4·1 C5·1 D5·1 C5·1 |
| 4 | A4·3 r·1 |
| 5 | C5·½ B4·½ A4·½ G4·½ A4·2 |
| 6 | G4·½ A4·½ G4·½ E4·½ G4·2 |
| 7 | F4·1 E4·1 D4·1 E4·1 |
| 8 | D4·3 r·1 |

Zakres B: D4-D5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 D4·½ E4·½ G4·1`), takt N = tonika (Cmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s3_kolysanka_a1`

- Tempo **100 BPM**, 4/4, **40 taktów**, czas **96 s** (1:36).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 39 = podpis Cuy, takt 40 = tonika Cmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: C | G | Am | F | C | G | Am | F
- takty 9-16: C | Em | F | G7 | C | Em | F | G7
- takty 17-24: C | G | Am | F | C | G | Am | F
- takty 25-32: C | Em | F | G7 | C | Em | F | G7
- takty 33-40: C | G | Am | F | C | G | Am | Cmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `XYL` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'std' | -3 dB | 1 | 0 |
| 2 | akordy | `BOX` | akompaniament | voicing blisko, C3-G4 (nic poniżej C3) | arpeggio ósemkami | -6 dB | 1 | L 25 |
| 3 | bas | `PIZ` | bas pizzicato | korzenie od C2, przejścia do oktawy 3 (nie poniżej E1) | ćwierćnuty 1 i 3 | -6 dB | 1 | 0 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -18 dB | `X...............` |
| `SHK` | -20 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. KICK bardzo miękka tylko na 1; SHK cichutko na ósemkach.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, C major, 100 BPM, 4/4 time. Instruments: xylophone, music-box, pizzicato bass, soft kick, shaker. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (C4 D4 E4 G4). Toy-orchestra lullaby.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: zabawkowa orkiestra, (3) zakaz: werbel, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s3_kolysanka_a2`

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

- takty 1-8: C | G | Am | F | C | G | Am | F
- takty 9-16: C | Em | F | G7 | C | Em | F | G7
- takty 17-24: C | G | Am | F | C | G | Am | F
- takty 25-32: C | Em | F | G7 | C | Em | F | G7
- takty 33-40: C | G | Am | F | C | G | Am | Cmaj9

**Warstwy aktywne:** `XYL` (melodia, -3 dB), `BOX` (akordy, -6 dB), `PIZ` (bas, -6 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s3_kolysanka_b1`

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

**Akordy takt po takcie** (mostek: `F | G | Em | Am | Dm | G | C | G7`)

- takty 1-8: C | G | Am | F | C | G | Am | F
- takty 9-16: C | Em | F | G7 | C | Em | F | G7
- takty 17-24: C | G | Am | F | C | G | Am | F
- takty 25-32: F | G | Em | Am | Dm | G | C | G7
- takty 33-40: C | Em | F | G7 | C | Em | F | G7
- takty 41-48: C | G | Am | F | C | G | Am | Cmaj9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -16 dB | `X...............` |
| `SHK` | -18 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. KICK bardzo miękka tylko na 1; SHK cichutko na ósemkach.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s3_kolysanka_b2`

- Tempo **80 BPM** (A1 × 0,8), **32 taktów**, czas **96 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `C | G | Am | F`; powtarzana 8 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `BOX` | -3 dB | melodia, długie nuty |
| szum | `noise_room_tone` | -34 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-28: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki C D E G A, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 29-32: motyw Cuy w odwróceniu: G4 E4 D4 C4, jedna nuta na takt (całe takty); ostatni takt: tonika Cmaj9, ogon zostaje.
- Całość REV-L 25% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s3_kolysanka/` (nazwy `rec_s3_kolysanka_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-116.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
