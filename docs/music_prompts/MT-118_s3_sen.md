# MT-118 · s3_sen · Sen o sianiu

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s3_sen_a1`, `rec_s3_sen_a2`, `rec_s3_sen_b1`, `rec_s3_sen_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 3 (Nocne zabawy), rzadkość: **common**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | F dur |
| Gama | F G A Bb C D E |
| Pentatonika (melodia) | F G A C D |
| Motyw Cuy (stopnie 1 2 3 5) | F4 G4 A4 C5, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | G4 A4 C5, rytm ♪ ♪ ♩ |
| Akord toniczny | Fmaj9 |
| Metrum | 4/4 |
| Swing | 50% |
| Seed bazowy | 32314 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **falowanie taśmy (wow)**.
Efekty serii: REV-L 25% na melodii, TAPE(0.3%), LP(8 kHz); miękkie ataki.

### 1.1 Słownik akordów

- `Fmaj7` = F A C E
- `Am7` = A C E G
- `Dm9` = D F A C E
- `Bbmaj7` = Bb D F A
- `Gm9` = G Bb D F A
- `C13` = C E Bb D A
- `C13sus` = C F Bb D A
- `Fmaj9` = F A C E G

### 1.2 Progresja (cykl)

Cykl 24 taktów, powtarzany; takt n gra akord (n−1 mod 24)+1. Zapis: `Fmaj7 | Am7 | Dm9 | Bbmaj7 (x6)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | F4·1 G4·1 A4·1 C5·1 |
| 2 | C5·3 r·1 |
| 3 | D5·1 C5·1 A4·1 G4·1 |
| 4 | A4·3 r·1 |
| 5 | G4·1 A4·1 Bb4·1 D5·1 |
| 6 | D5·3 r·1 |
| 7 | C5·1 A4·1 G4·1 A4·1 |
| 8 | F4·4 |

Zakres A: F4-D5.

Szkielet B `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | C5·2 D5·2 |
| 2 | F5·3 r·1 |
| 3 | G5·2 F5·2 |
| 4 | D5·3 r·1 |
| 5 | C5·2 D5·2 |
| 6 | C5·3 r·1 |
| 7 | Bb4·2 A4·2 |
| 8 | G4·3 r·1 |

Zakres B: G4-G5.

**Tryb rzadki tej płyty:** po motywie w taktach 1-2 melodia gra jedną nutę na takt (półnuta ligowana do końca taktu), nuta z pentatoniki, ruch ≤ 1 stopień pentatoniki od poprzedniej, wybór z `seed`; podpis w ostatnich 2 taktach. Szkielet A pełni rolę tylko dla taktów 1-2.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 G4·½ A4·½ C5·1`), takt N = tonika (Fmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s3_sen_a1`

- Tempo **55 BPM**, 4/4, **24 taktów**, czas **105 s** (1:44).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-20 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 21-24 | A″ | temat wraca w pełnej aranżacji (szkielet A); takt 23 = podpis Cuy, takt 24 = tonika Fmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Bbmaj7
- takty 9-16: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Bbmaj7
- takty 17-24: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Fmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pad | `PAD` | pad z falowaniem taśmy TAPE(0,5%), LFO 0,4 Hz | C3-C5, szeroko | długie akordy | -2 dB | 1 | szeroko ±35 |
| 2 | melodia | `BELL` | rzadkie nuty | C4-G5 (wg szkieletu) | po motywie w taktach 1-2 | -10 dB | 1 | 0 |
| 3 | szum | `taśma` | szum taśmy (biały LP 8 kHz) | - | ciągły | -40 dB | 1 | szeroko ±50 |

**Perkusja:** brak.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, F major, 55 BPM, 4/4 time. Instruments: detuned triangle pad, soft bell. No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (F4 G4 A4 C5). Tape-warped ambient pad.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: falowanie taśmy (wow), (3) zakaz: perkusja; nuty ostre, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s3_sen_a2`

- Tempo **50 BPM**, **24 taktów**, czas **115 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-20 B; 21-24 A″.

**Akordy takt po takcie**

- takty 1-8: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Bbmaj7
- takty 9-16: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Bbmaj7
- takty 17-24: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Fmaj9

**Warstwy aktywne:** `PAD` (pad, -2 dB), `BELL` (melodia, -10 dB), `taśma` (szum, -40 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s3_sen_b1`

- Tempo **59 BPM**, **28 taktów** (A1 + mostek 4 taktów po takcie 20 — skrócony z 8, by zmieścić się w 120 s), czas **114 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-20 | B | kontrast: szkielet B |
| 21-24 | Mostek | szkielet B (takty 5-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 25-28 | A″ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Bbmaj7 | Am7 | Gm9 | C13`)

- takty 1-8: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Bbmaj7
- takty 9-16: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Fmaj7 | Am7 | Dm9 | Bbmaj7
- takty 17-24: Fmaj7 | Am7 | Dm9 | Bbmaj7 | Bbmaj7 | Am7 | Gm9 | C13
- takty 25-28: Fmaj7 | Am7 | Dm9 | Fmaj9

**Zmiany względem A1**

1. Kontrmelodia `CEL` (-10 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Płyta bez perkusji w A1: w B1 dochodzi cichy `SHK` (-22 dB, ósemki) i `BRSH` na 2 i 4 (-20 dB).

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s3_sen_b2`

- Tempo **44 BPM** (A1 × 0,8), **20 taktów**, czas **109 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Fmaj7 | Am7 | Dm9 | Bbmaj7`; powtarzana 5 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| szum | `taśma` | -40 dB | tylko PAD + falowanie |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo (grany przez najwyższy głos padu).
- Takty 3-16: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki F G A C D, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 17-20: motyw Cuy w odwróceniu: C5 A4 G4 F4, jedna nuta na takt (całe takty); ostatni takt: tonika Fmaj9, ogon zostaje.
- Całość REV-L 25% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s3_sen/` (nazwy `rec_s3_sen_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-118.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
