# MT-115 · s3_sowa · Sowa

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s3_sowa_a1`, `rec_s3_sowa_a2`, `rec_s3_sowa_b1`, `rec_s3_sowa_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 3 (Nocne zabawy), rzadkość: **common**.

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
| Swing | 50% |
| Seed bazowy | 64033 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **straszkowa, ale łagodna: „hu-hu” sowy**.
Efekty serii: REV-L 25% na melodii, TAPE(0.3%), LP(8 kHz); miękkie ataki.

### 1.1 Słownik akordów

- `Dm` = D F A
- `Bb` = Bb D F
- `Gm` = G Bb D
- `A7` = A C# E G
- `A7sus` = A D E G
- `Dm9` = D F A C E

### 1.2 Progresja (cykl)

Cykl 24 taktów, powtarzany; takt n gra akord (n−1 mod 24)+1. Zapis: `Dm | Bb | Gm | A7 (x6)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | D4·1 E4·1 F4·1 A4·1 |
| 2 | A4·3 r·1 |
| 3 | Bb4·1 A4·1 F4·1 E4·1 |
| 4 | F4·3 r·1 |
| 5 | E4·1 F4·1 G4·1 Bb4·1 |
| 6 | Bb4·3 r·1 |
| 7 | A4·1 F4·1 E4·1 F4·1 |
| 8 | D4·4 |

Zakres A: D4-Bb4.

Szkielet B `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A4·2 Bb4·2 |
| 2 | D5·3 r·1 |
| 3 | E5·2 D5·2 |
| 4 | Bb4·3 r·1 |
| 5 | A4·2 Bb4·2 |
| 6 | A4·3 r·1 |
| 7 | G4·2 F4·2 |
| 8 | E4·3 r·1 |

Zakres B: E4-E5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 E4·½ F4·½ A4·1`), takt N = tonika (Dm9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s3_sowa_a1`

- Tempo **60 BPM**, 4/4, **24 taktów**, czas **96 s** (1:36).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-20 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 21-24 | A″ | temat wraca w pełnej aranżacji (szkielet A); takt 23 = podpis Cuy, takt 24 = tonika Dm9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Dm | Bb | Gm | A7 | Dm | Bb | Gm | A7
- takty 9-16: Dm | Bb | Gm | A7 | Dm | Bb | Gm | A7
- takty 17-24: Dm | Bb | Gm | A7 | Dm | Bb | Gm | Dm9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BOX` | melodia kołysanki | C4-G5 (wg szkieletu) | wg szkieletu 'pas' | -3 dB | 1 | 0 |
| 2 | pad | `PAD` | pad niski na D2-A2 | D2-A3 | długie akordy w niskim rejestrze | -8 dB | 1 | szeroko ±35 |
| 3 | bas | `TRI` | bas bardzo wolny | korzenie od D2, przejścia do oktawy 3 (nie poniżej E1) | korzeń co 2 takty | -10 dB | 1 | 0 |
| 4 | ozdoba | `BELL` | „hu-hu”: dwie nuty D5 A4 | oktawa 5-6 | co 8 taktów, 2. połowa taktu | -10 dB | 5 | R 30 |

**Perkusja:** brak.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, D natural minor, 60 BPM, 4/4 time. Instruments: music-box, detuned triangle pad, triangle wave (bass/pad), soft bell. No drums. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (D4 E4 F4 A4). Gentle lullaby, soft owl hoots.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: straszkowa, ale łagodna: „hu-hu” sowy, (3) zakaz: skoki powyżej oktawy; głośny BELL, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s3_sowa_a2`

- Tempo **54 BPM**, **24 taktów**, czas **107 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-20 B; 21-24 A″.

**Akordy takt po takcie**

- takty 1-8: Dm | Bb | Gm | A7 | Dm | Bb | Gm | A7
- takty 9-16: Dm | Bb | Gm | A7 | Dm | Bb | Gm | A7
- takty 17-24: Dm | Bb | Gm | A7 | Dm | Bb | Gm | Dm9

**Warstwy aktywne:** `BOX` (melodia, -3 dB), `PAD` (pad, -8 dB), `TRI` (bas, -10 dB), `BELL` (ozdoba, -10 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s3_sowa_b1`

- Tempo **65 BPM**, **32 taktów** (A1 + mostek 8 taktów po takcie 20), czas **118 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-20 | B | kontrast: szkielet B |
| 21-28 | Mostek | szkielet B (takty 1-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 29-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Gm | Dm | Bb | A7 | Gm | Bb | A7sus A7 | Dm`)

- takty 1-8: Dm | Bb | Gm | A7 | Dm | Bb | Gm | A7
- takty 9-16: Dm | Bb | Gm | A7 | Dm | Bb | Gm | A7
- takty 17-24: Dm | Bb | Gm | A7 | Gm | Dm | Bb | A7
- takty 25-32: Gm | Bb | A7sus A7 | Dm | Dm | Bb | Gm | Dm9

**Zmiany względem A1**

1. Kontrmelodia `CEL` (-10 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Płyta bez perkusji w A1: w B1 dochodzi cichy `SHK` (-22 dB, ósemki) i `BRSH` na 2 i 4 (-20 dB).

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s3_sowa_b2`

- Tempo **48 BPM** (A1 × 0,8), **20 taktów**, czas **100 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Dm | Bb | Gm | A7`; powtarzana 5 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `BOX` | -3 dB | melodia, długie nuty |
| szum | `noise_room_tone` | -34 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-16: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki D F G A C, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 17-20: motyw Cuy w odwróceniu: A4 F4 E4 D4, jedna nuta na takt (całe takty); ostatni takt: tonika Dm9, ogon zostaje.
- Całość REV-L 25% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s3_sowa/` (nazwy `rec_s3_sowa_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-115.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
