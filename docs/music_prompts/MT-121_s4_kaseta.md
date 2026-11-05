# MT-121 · s4_kaseta · Kaseta mixtape

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s4_kaseta_a1`, `rec_s4_kaseta_a2`, `rec_s4_kaseta_b1`, `rec_s4_kaseta_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 4 (Retro 70-90), rzadkość: **rare**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | D moll (naturalny) |
| Gama | D E F G A Bb C |
| Pentatonika (melodia) | D F G A C |
| Motyw Cuy (stopnie 1 2 ♭3 5) | D4 E4 F4 A4, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | E4 F4 A4, rytm ♪ ♪ ♩ |
| Akord toniczny | Dm9 |
| Metrum | 4/4 |
| Swing | 52% |
| Seed bazowy | 7142 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **falowanie taśmy wypieczone w dźwięk**.
Efekty serii: CRUSH tylko na perkusji, REV-S 8%, bez TAPE (poza s4_kaseta); wolno P50 i ostrzejszy kit. WYPIEKANE w dźwięk: TAPE(0,6%), wow 0,5 Hz + flutter 6 Hz ±0,15%, szum taśmy -38 dB, LP(10 kHz), miękka saturacja; nie wyłączać falowania.

### 1.1 Słownik akordów

- `Dm7` = D F A C
- `G13` = G B F A E
- `Bbmaj7` = Bb D F A
- `A7` = A C# E G
- `Gm7` = G Bb D F
- `C13` = C E Bb D A
- `Fmaj7` = F A C E
- `E7♭9` = E G# B D F
- `A7sus` = A D E G
- `Dm9` = D F A C E

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Dm7 | G13 | Dm7 | G13 (x2) | Bbmaj7 | A7 | Dm7 | G13 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `stc`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | D4·½ E4·½ F4·½ A4·1½ r·1 |
| 2 | A4·½ F4·½ E4·½ F4·½ A4·½ F4·½ E4·½ r·½ |
| 3 | F4·½ G4·½ A4·½ Bb4·½ A4·½ G4·½ F4·½ r·½ |
| 4 | E4·½ F4·½ E4·½ D4·½ E4·2 |
| 5 | E4·½ F4·½ G4·½ Bb4·1½ r·1 |
| 6 | Bb4·½ A4·½ G4·½ A4·½ Bb4·½ A4·½ G4·½ r·½ |
| 7 | F4·½ A4·½ C5·½ A4·½ Bb4·½ G4·½ E4·½ r·½ |
| 8 | A4·1 F4·1 D4·2 |

Zakres A: D4-C5.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ A4·½ Bb4·½ D5·1½ Bb4·½ r·½ |
| 2 | A4·½ r·½ Bb4·½ A4·1 F4·½ r·1 |
| 3 | r·½ Bb4·½ D5·½ E5·1½ D5·½ r·½ |
| 4 | Bb4·1 A4·1 F4·1 E4·1 |
| 5 | r·½ D5·½ C5·½ Bb4·1½ A4·½ r·½ |
| 6 | r·½ A4·½ Bb4·½ A4·1½ F4·½ r·½ |
| 7 | G4·1½ F4·½ E4·1 r·1 |
| 8 | E4·3 r·1 |

Zakres B: E4-E5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 E4·½ F4·½ A4·1`), takt N = tonika (Dm9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s4_kaseta_a1`

- Tempo **100 BPM**, 4/4, **44 taktów**, czas **106 s** (1:45).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | B′ | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 41-44 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 43 = podpis Cuy, takt 44 = tonika Dm9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 9-16: Bbmaj7 | A7 | Dm7 | G13 | Bbmaj7 | A7 | Dm7 | G13
- takty 17-24: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 25-32: Bbmaj7 | A7 | Dm7 | G13 | Bbmaj7 | A7 | Dm7 | G13
- takty 33-40: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 41-44: Bbmaj7 | A7 | Dm7 | Dm9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bas | `TRI` | bas staccato, 16-ki | korzenie od D2, przejścia do oktawy 3 (nie poniżej E1) | wzór X.XX.X.X | -3 dB | 1 | 0 |
| 2 | akordy | `P25` | stabsy wah | voicing blisko, C3-G4 (nic poniżej C3) | na „i” 2 i 4 | -5 dB | 1 | L 25 |
| 3 | melodia | `P12` | melodia | C4-G5 (wg szkieletu) | wg szkieletu 'stc' | -4 dB | 1 | 0 |
| 4 | dodatkowy głos | `BELL` | dodatkowy głos płyty rzadkiej: hook | oktawa 5-6 | co 8 taktów, 2 takty | -10 dB | 9 | losowo ±40 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -3 dB | `X.....X..X......` |
| `SNR` | -3 dB | `....X.......X...` |
| `HAT` | -12 dB | `XXXXXXXXXXXXXXXX` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, D natural minor, 100 BPM, 4/4 time, swing 52%. Instruments: triangle wave (bass/pad), 25% pulse wave (brass/piano-like), narrow 12.5% pulse wave (plucky, nasal), soft bell, soft kick, noise snare, hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (D4 E4 F4 A4). Funk mixtape with baked-in tape wobble.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: falowanie taśmy wypieczone w dźwięk, (3) zakaz: wyłączanie falowania, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s4_kaseta_a2`

- Tempo **90 BPM**, **44 taktów**, czas **117 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 B′; 41-44 A‴.

**Akordy takt po takcie**

- takty 1-8: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 9-16: Bbmaj7 | A7 | Dm7 | G13 | Bbmaj7 | A7 | Dm7 | G13
- takty 17-24: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 25-32: Bbmaj7 | A7 | Dm7 | G13 | Bbmaj7 | A7 | Dm7 | G13
- takty 33-40: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 41-44: Bbmaj7 | A7 | Dm7 | Dm9

**Warstwy aktywne:** `TRI` (bas, -3 dB), `P25` (akordy, -5 dB), `P12` (melodia, -4 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s4_kaseta_b1`

- Tempo **108 BPM**, **52 taktów** (A1 + mostek 8 taktów po takcie 24), czas **116 s**.
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
| 49-52 | A‴ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Bbmaj7 | A7 | Gm7 | C13 | Fmaj7 | E7♭9 | A7sus | A7`)

- takty 1-8: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 9-16: Bbmaj7 | A7 | Dm7 | G13 | Bbmaj7 | A7 | Dm7 | G13
- takty 17-24: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 25-32: Bbmaj7 | A7 | Gm7 | C13 | Fmaj7 | E7♭9 | A7sus | A7
- takty 33-40: Bbmaj7 | A7 | Dm7 | G13 | Bbmaj7 | A7 | Dm7 | G13
- takty 41-48: Dm7 | G13 | Dm7 | G13 | Dm7 | G13 | Dm7 | G13
- takty 49-52: Bbmaj7 | A7 | Dm7 | Dm9

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

## 5. Utwór B2 (nastrojowy): `rec_s4_kaseta_b2`

- Tempo **80 BPM** (A1 × 0,8), **32 taktów**, czas **96 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Dm7 | G13 | Dm7 | G13`; powtarzana 8 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `P12` | -3 dB | melodia, długie nuty |
| szum | `eter` | -38 dB | szum taśmy zamiast eteru |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-28: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki D F G A C, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 29-32: motyw Cuy w odwróceniu: A4 F4 E4 D4, jedna nuta na takt (całe takty); ostatni takt: tonika Dm9, ogon zostaje.
- Całość CRUSH tylko na perkusji. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s4_kaseta/` (nazwy `rec_s4_kaseta_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-121.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
