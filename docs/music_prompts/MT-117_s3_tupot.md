# MT-117 · s3_tupot · Cichy tupot

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s3_tupot_a1`, `rec_s3_tupot_a2`, `rec_s3_tupot_b1`, `rec_s3_tupot_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 3 (Nocne zabawy), rzadkość: **common**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | G dorycki |
| Gama | G A Bb C D E F |
| Pentatonika (melodia) | G Bb C D F |
| Motyw Cuy (stopnie 1 2 ♭3 5) | G4 A4 Bb4 D5, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | A4 Bb4 D5, rytm ♪ ♪ ♩ |
| Akord toniczny | Gm9 |
| Metrum | 4/4 |
| Swing | 50% |
| Seed bazowy | 80651 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **krótkie przerwy glitch (stutter)**.
Efekty serii: REV-L 25% na melodii, TAPE(0.3%), LP(8 kHz); miękkie ataki. GLITCH: co 4 takty 1-2 przerwy 80-200 ms z powtórzeniem poprzednich 30 ms (stutter); CRUSH tylko na HAT.
**Uwaga:** Brak warstwy akordowej: harmonię niosą bas i melodia.

### 1.1 Słownik akordów

- `Gm7` = G Bb D F
- `C13` = C E Bb D A
- `Dm7` = D F A C
- `Cm7` = C Eb G Bb
- `F13` = F A Eb G D
- `G13` = G B F A E
- `Bbmaj7` = Bb D F A
- `Am7♭5` = A C Eb G
- `D7♭9` = D F# A C Eb
- `Gm9` = G Bb D F A

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Gm7 | C13 | Gm7 | C13 (x2) | Dm7 | Gm7 | Cm7 | F13 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `stc`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·½ A4·½ Bb4·½ D5·1½ r·1 |
| 2 | D5·½ Bb4·½ A4·½ Bb4·½ D5·½ Bb4·½ A4·½ r·½ |
| 3 | Bb4·½ C5·½ D5·½ E5·½ D5·½ C5·½ Bb4·½ r·½ |
| 4 | A4·½ Bb4·½ A4·½ G4·½ A4·2 |
| 5 | A4·½ Bb4·½ C5·½ E5·1½ r·1 |
| 6 | E5·½ D5·½ C5·½ D5·½ E5·½ D5·½ C5·½ r·½ |
| 7 | Bb4·½ D5·½ F5·½ D5·½ E5·½ C5·½ A4·½ r·½ |
| 8 | D5·1 Bb4·1 G4·2 |

Zakres A: G4-F5.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ D5·½ E5·½ G5·1½ E5·½ r·½ |
| 2 | D5·½ r·½ E5·½ D5·1 Bb4·½ r·1 |
| 3 | r·½ E5·½ G5·½ A5·1½ G5·½ r·½ |
| 4 | E5·1 D5·1 Bb4·1 A4·1 |
| 5 | r·½ G5·½ F5·½ E5·1½ D5·½ r·½ |
| 6 | r·½ D5·½ E5·½ D5·1½ Bb4·½ r·½ |
| 7 | C5·1½ Bb4·½ A4·1 r·1 |
| 8 | A4·3 r·1 |

Zakres B: A4-A5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 A4·½ Bb4·½ D5·1`), takt N = tonika (Gm9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s3_tupot_a1`

- Tempo **110 BPM**, 4/4, **44 taktów**, czas **96 s** (1:36).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | B′ | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 41-44 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 43 = podpis Cuy, takt 44 = tonika Gm9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 9-16: Dm7 | Gm7 | Cm7 | F13 | Dm7 | Gm7 | Cm7 | F13
- takty 17-24: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 25-32: Dm7 | Gm7 | Cm7 | F13 | Dm7 | Gm7 | Cm7 | F13
- takty 33-40: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 41-44: Dm7 | Gm7 | Cm7 | Gm9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | szarpnięcia „na paluszkach”, staccato | C4-G5 (wg szkieletu) | ósemki co drugi krok | -4 dB | 1 | 0 |
| 2 | bas | `TRI` | bas | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1 i „i” 3 | -5 dB | 1 | 0 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `HAT` | -14 dB | `X.XX.X.XX.X.XX.X` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G dorian, 110 BPM, 4/4 time. Instruments: narrow 12.5% pulse wave (plucky, nasal), triangle wave (bass/pad), hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (G4 A4 Bb4 D5). Tiptoe staccato with small glitch stutters.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: krótkie przerwy glitch (stutter), (3) zakaz: długie zawieszenia > 200 ms, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s3_tupot_a2`

- Tempo **99 BPM**, **44 taktów**, czas **107 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 B′; 41-44 A‴.

**Akordy takt po takcie**

- takty 1-8: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 9-16: Dm7 | Gm7 | Cm7 | F13 | Dm7 | Gm7 | Cm7 | F13
- takty 17-24: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 25-32: Dm7 | Gm7 | Cm7 | F13 | Dm7 | Gm7 | Cm7 | F13
- takty 33-40: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 41-44: Dm7 | Gm7 | Cm7 | Gm9

**Warstwy aktywne:** `P12` (melodia, -4 dB), `TRI` (bas, -5 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s3_tupot_b1`

- Tempo **119 BPM**, **52 taktów** (A1 + mostek 8 taktów po takcie 24), czas **105 s**.
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

**Akordy takt po takcie** (mostek: `Dm7 | G13 | Cm7 | F13 | Bbmaj7 | Am7♭5 | D7♭9 | Gm7`)

- takty 1-8: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 9-16: Dm7 | Gm7 | Cm7 | F13 | Dm7 | Gm7 | Cm7 | F13
- takty 17-24: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 25-32: Dm7 | G13 | Cm7 | F13 | Bbmaj7 | Am7♭5 | D7♭9 | Gm7
- takty 33-40: Dm7 | Gm7 | Cm7 | F13 | Dm7 | Gm7 | Cm7 | F13
- takty 41-48: Gm7 | C13 | Gm7 | C13 | Gm7 | C13 | Gm7 | C13
- takty 49-52: Dm7 | Gm7 | Cm7 | Gm9

**Zmiany względem A1**

1. Kontrmelodia `XYL` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `HAT` | -12 dB | `X.XX.X.XX.X.XX.X` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s3_tupot_b2`

- Tempo **88 BPM** (A1 × 0,8), **36 taktów**, czas **98 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Gm7 | C13 | Gm7 | C13`; powtarzana 9 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `P12` | -3 dB | pojedyncze szarpnięcia, ok. 1 na 2 takty |
| szum | `noise_room_tone` | -34 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-32: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki G Bb C D F, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 33-36: motyw Cuy w odwróceniu: D5 Bb4 A4 G4, jedna nuta na takt (całe takty); ostatni takt: tonika Gm9, ogon zostaje.
- Całość REV-L 25% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s3_tupot/` (nazwy `rec_s3_tupot_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-117.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
