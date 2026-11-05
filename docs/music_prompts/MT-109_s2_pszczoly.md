# MT-109 · s2_pszczoly · Pszczoły

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s2_pszczoly_a1`, `rec_s2_pszczoly_a2`, `rec_s2_pszczoly_b1`, `rec_s2_pszczoly_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 2 (Ogród), rzadkość: **rare**.

## 0. Styl wspólny (wkleić na początek każdego promptu)

> Muzyka do przytulnej gry o zwierzaku (świnka morska Cuy), pikselowa paleta chiptune grana łagodnie, z kolorytem jazzu i lo-fi. Ciepło, małe, schludne, zabawne. Wyłącznie głosy z palety: P12, P25, TRI, PAD, BELL, BOX, CEL, GLK, XYL, EP, BNJ, PIZ, HARP, szumy; P50 tylko seria 4. Bez piły, bez wokali, bez sampli prawdziwych instrumentów, bez agresji, bez epickości, bez mroku, bez głośnych szczytów. Akordy z septymami i nonami, melodia śpiewna i prosta, powtarzalna jak w grach na Game Boy. Bit-crush wyłącznie na perkusji. Całość autorska, nie przypomina żadnej istniejącej piosenki.

## 1. Parametry wspólne dla czterech utworów

| Parametr | Wartość |
| --- | --- |
| Tonacja | A dur |
| Gama | A B C# D E F# G# |
| Pentatonika (melodia) | A B C# E F# |
| Motyw Cuy (stopnie 1 2 3 5) | A4 B4 C#5 E5, rytm ♪ ♪ ♪ ♩. |
| Podpis Cuy (stopnie 2 3 5) | B4 C#5 E5, rytm ♪ ♪ ♩ |
| Akord toniczny | Amaj9 |
| Metrum | 4/4 |
| Swing | 50% |
| Seed bazowy | 43830 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **bzyczący bordun, wchodzi od taktu 9**.
Efekty serii: REV-M 14% na melodii, bez TAPE, bez VINYL; powietrzny, szeroki stereo.

### 1.1 Słownik akordów

- `A` = A C# E
- `D` = D F# A
- `E7` = E G# B D
- `F#m` = F# A C#
- `A/C#` = A C# E (bas C#)
- `Amaj9` = A C# E G# B

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `A | D | A | E7 (x2) | A | F#m | D | E7 A (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `stc`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A4·½ B4·½ C#5·½ E5·1½ r·1 |
| 2 | E5·½ C#5·½ B4·½ C#5·½ E5·½ C#5·½ B4·½ r·½ |
| 3 | C#5·½ D5·½ E5·½ F#5·½ E5·½ D5·½ C#5·½ r·½ |
| 4 | B4·½ C#5·½ B4·½ A4·½ B4·2 |
| 5 | B4·½ C#5·½ D5·½ F#5·1½ r·1 |
| 6 | F#5·½ E5·½ D5·½ E5·½ F#5·½ E5·½ D5·½ r·½ |
| 7 | C#5·½ E5·½ G#5·½ E5·½ F#5·½ D5·½ B4·½ r·½ |
| 8 | E5·1 C#5·1 A4·2 |

Zakres A: A4-G#5.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ E5·½ F#5·½ A5·1½ F#5·½ r·½ |
| 2 | E5·½ r·½ F#5·½ E5·1 C#5·½ r·1 |
| 3 | r·½ F#5·½ A5·½ B5·1½ A5·½ r·½ |
| 4 | F#5·1 E5·1 C#5·1 B4·1 |
| 5 | r·½ A5·½ G#5·½ F#5·1½ E5·½ r·½ |
| 6 | r·½ E5·½ F#5·½ E5·1½ C#5·½ r·½ |
| 7 | D5·1½ C#5·½ B4·1 r·1 |
| 8 | B4·3 r·1 |

Zakres B: B4-B5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 B4·½ C#5·½ E5·1`), takt N = tonika (Amaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s2_pszczoly_a1`

- Tempo **112 BPM**, 4/4, **52 taktów**, czas **111 s** (1:51).
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
| 49-52 | A‵ | temat wraca w pełnej aranżacji (szkielet A); takt 51 = podpis Cuy, takt 52 = tonika Amaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: A | D | A | E7 | A | D | A | E7
- takty 9-16: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 17-24: A | D | A | E7 | A | D | A | E7
- takty 25-32: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 33-40: A | D | A | E7 | A | D | A | E7
- takty 41-48: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 49-52: A | D | A | Amaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `BNJ` | melodia szybka, ósemki | C4-G5 (wg szkieletu) | wg szkieletu 'stc' | -2 dB | 1 | 0 |
| 2 | akordy | `BNJ` | akord rozłożony | voicing blisko, C3-G4 (nic poniżej C3) | ósemki | -8 dB | 1 | L 25 |
| 3 | bas | `TRI` | bas root-fifth | korzenie od A2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1, kwinta na 3 | -5 dB | 1 | 0 |
| 4 | dodatkowy głos | `BUZZ` | dodatkowy głos płyty rzadkiej: bordun na A3 (sinus 220 Hz + FM 40 Hz), LFO panoramy 0,15 Hz | oktawa 5-6 | ciągły | -14 dB | 9 | losowo ±40 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -14 dB | `....X.......X...` |
| `HAT` | -14 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, A major, 112 BPM, 4/4 time. Instruments: banjo-like pluck, triangle wave (bass/pad), bee-like drone, brush swishes, hi-hat. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (A4 B4 C#5 E5). Fast bluegrass-like pluck with a buzzing drone.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: bzyczący bordun, wchodzi od taktu 9, (3) zakaz: głośne BUZZ (nie przekracza -14 dB), (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s2_pszczoly_a2`

- Tempo **101 BPM**, **48 taktów** (A1 minus 4: blok powtórki wycięty, by zmieścić się w 120 s), czas **114 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 B′; 41-48 A‴.

**Akordy takt po takcie**

- takty 1-8: A | D | A | E7 | A | D | A | E7
- takty 9-16: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 17-24: A | D | A | E7 | A | D | A | E7
- takty 25-32: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 33-40: A | D | A | E7 | A | D | A | E7
- takty 41-48: A | F#m | D | E7 A | A | F#m | D | Amaj9

**Warstwy aktywne:** `BNJ` (melodia, -2 dB), `BNJ` (akordy, -8 dB), `TRI` (bas, -5 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s2_pszczoly_b1`

- Tempo **121 BPM**, **60 taktów** (A1 + mostek 8 taktów po takcie 24), czas **119 s**.
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
| 57-60 | A‵ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `D | E7 | A | F#m | D | A/C# E7 | D | E7`)

- takty 1-8: A | D | A | E7 | A | D | A | E7
- takty 9-16: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 17-24: A | D | A | E7 | A | D | A | E7
- takty 25-32: D | E7 | A | F#m | D | A/C# E7 | D | E7
- takty 33-40: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 41-48: A | D | A | E7 | A | D | A | E7
- takty 49-56: A | F#m | D | E7 A | A | F#m | D | E7 A
- takty 57-60: A | D | A | Amaj9

**Zmiany względem A1**

1. Kontrmelodia `XYL` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -12 dB | `....X.......X...` |
| `HAT` | -12 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s2_pszczoly_b2`

- Tempo **90 BPM** (A1 × 0,8), **36 taktów**, czas **96 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `A | D | A | E7`; powtarzana 9 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `BUZZ` | -3 dB | bordun A3 pływający w stereo |
| szum | `noise_birds` | -30 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-32: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki A B C# E F#, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 33-36: motyw Cuy w odwróceniu: E5 C#5 B4 A4, jedna nuta na takt (całe takty); ostatni takt: tonika Amaj9, ogon zostaje.
- Całość REV-M 14% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s2_pszczoly/` (nazwy `rec_s2_pszczoly_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-109.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
