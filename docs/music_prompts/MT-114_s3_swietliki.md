# MT-114 · s3_swietliki · Świetliki

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s3_swietliki_a1`, `rec_s3_swietliki_a2`, `rec_s3_swietliki_b1`, `rec_s3_swietliki_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 3 (Nocne zabawy), rzadkość: **rare**.

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
| Seed bazowy | 66782 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **migot dzwonków (świetliki)**.
Efekty serii: REV-L 25% na melodii, TAPE(0.3%), LP(8 kHz); miękkie ataki.

### 1.1 Słownik akordów

- `Amaj7` = A C# E G#
- `F#m9` = F# A C# E G#
- `Dmaj9` = D F# A C# E
- `E6/9` = E G# B C# F#
- `Bm9` = B D F# A C#
- `E13` = E G# D F# C#
- `D6/9` = D F# A B E
- `E` = E G# B
- `C#m7` = C# E G# B
- `Amaj9` = A C# E G# B

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Amaj7 | F#m9 | Dmaj9 | E6/9 (x2) | Bm9 | E13 | Amaj7 | D6/9 E (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `bal`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | A4·½ B4·½ C#5·½ E5·2½ |
| 2 | r·2 C#5·1 B4·1 |
| 3 | A4·1½ B4·½ C#5·2 |
| 4 | r·1 E5·1 C#5·1 B4·1 |
| 5 | B4·½ C#5·½ D5·½ F#5·2½ |
| 6 | r·2 E5·1 D5·1 |
| 7 | C#5·1½ D5·½ E5·2 |
| 8 | r·1 C#5·1 B4·1 A4·1 |

Zakres A: A4-F#5.

Szkielet B `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | E5·2 F#5·2 |
| 2 | A5·3 r·1 |
| 3 | B5·2 A5·2 |
| 4 | F#5·3 r·1 |
| 5 | E5·2 F#5·2 |
| 6 | E5·3 r·1 |
| 7 | D5·2 C#5·2 |
| 8 | B4·3 r·1 |

Zakres B: B4-B5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 B4·½ C#5·½ E5·1`), takt N = tonika (Amaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s3_swietliki_a1`

- Tempo **90 BPM**, 4/4, **40 taktów**, czas **107 s** (1:46).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 39 = podpis Cuy, takt 40 = tonika Amaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | E6/9
- takty 9-16: Bm9 | E13 | Amaj7 | D6/9 E | Bm9 | E13 | Amaj7 | D6/9 E
- takty 17-24: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | E6/9
- takty 25-32: Bm9 | E13 | Amaj7 | D6/9 E | Bm9 | E13 | Amaj7 | D6/9 E
- takty 33-40: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | Amaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pad | `PAD` | pad szeroki | C3-C5, szeroko | długie akordy | -4 dB | 1 | szeroko ±35 |
| 2 | melodia | `P12` | melodia długimi nutami | C4-G5 (wg szkieletu) | wg szkieletu 'bal' | -4 dB | 1 | 0 |
| 3 | bas | `TRI` | bas | korzenie od A2, przejścia do oktawy 3 (nie poniżej E1) | korzeń na 1 | -7 dB | 1 | 0 |
| 4 | dodatkowy głos | `BELL` | dodatkowy głos płyty rzadkiej: migoczące nuty, skala A, wysoko, 2-6 nut na takt, losowy pan każdej nuty | oktawa 5-6 | poziom losowy -14…-20 dB | -17 dB | 9 | losowo ±40 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -14 dB | `X.......X.......` |
| `BRSH` | -14 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, A major, 90 BPM, 4/4 time. Instruments: detuned triangle pad, narrow 12.5% pulse wave (plucky, nasal), triangle wave (bass/pad), soft bell, soft kick, brush swishes. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (A4 B4 C#5 E5). Dream pop with twinkling fireflies.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: migot dzwonków (świetliki), (3) zakaz: ostre ataki; więcej niż 6 nut migotu na takt, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s3_swietliki_a2`

- Tempo **81 BPM**, **40 taktów**, czas **119 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 A‴.

**Akordy takt po takcie**

- takty 1-8: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | E6/9
- takty 9-16: Bm9 | E13 | Amaj7 | D6/9 E | Bm9 | E13 | Amaj7 | D6/9 E
- takty 17-24: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | E6/9
- takty 25-32: Bm9 | E13 | Amaj7 | D6/9 E | Bm9 | E13 | Amaj7 | D6/9 E
- takty 33-40: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | Amaj9

**Warstwy aktywne:** `PAD` (pad, -4 dB), `P12` (melodia, -4 dB), `TRI` (bas, -7 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s3_swietliki_b1`

- Tempo **97 BPM**, **48 taktów** (A1 + mostek 8 taktów po takcie 24), czas **119 s**.
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

**Akordy takt po takcie** (mostek: `Bm9 | E13 | Amaj7 | F#m9 | Dmaj9 | C#m7 | Bm9 | E6/9`)

- takty 1-8: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | E6/9
- takty 9-16: Bm9 | E13 | Amaj7 | D6/9 E | Bm9 | E13 | Amaj7 | D6/9 E
- takty 17-24: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | E6/9
- takty 25-32: Bm9 | E13 | Amaj7 | F#m9 | Dmaj9 | C#m7 | Bm9 | E6/9
- takty 33-40: Bm9 | E13 | Amaj7 | D6/9 E | Bm9 | E13 | Amaj7 | D6/9 E
- takty 41-48: Amaj7 | F#m9 | Dmaj9 | E6/9 | Amaj7 | F#m9 | Dmaj9 | Amaj9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-10 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -12 dB | `X.......X.......` |
| `BRSH` | -12 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s3_swietliki_b2`

- Tempo **72 BPM** (A1 × 0,8), **32 taktów**, czas **107 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Amaj7 | F#m9 | Dmaj9 | E6/9`; powtarzana 8 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `BELL` | -3 dB | migoczące nuty, 1-3 na takt |
| szum | `noise_room_tone` | -34 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-28: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki A B C# E F#, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 29-32: motyw Cuy w odwróceniu: E5 C#5 B4 A4, jedna nuta na takt (całe takty); ostatni takt: tonika Amaj9, ogon zostaje.
- Całość REV-L 25% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s3_swietliki/` (nazwy `rec_s3_swietliki_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-114.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
