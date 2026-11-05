# MT-101 · s1_poranek · Poranek w sianie

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s1_poranek_a1`, `rec_s1_poranek_a2`, `rec_s1_poranek_b1`, `rec_s1_poranek_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 1 (Siano & lofi), rzadkość: **common**.

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
| Swing | 58% |
| Seed bazowy | 35171 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **poranny lo-fi hip-hop z ptakami; winyl ledwo słyszalny**.
Efekty serii: TAPE(0.2%) na całość, LP(9 kHz), REV-S 12%, VINYL(-46 dB) pod całością (cichutko).

### 1.1 Słownik akordów

- `Cmaj9` = C E G B D
- `Am9` = A C E G B
- `Dm9` = D F A C E
- `G13` = G B F A E
- `Fmaj9` = F A C E G
- `Em7` = E G B D
- `G13sus` = G C F A E
- `Cmaj9/E` = C E G B D (bas E)
- `Gm9` = G Bb D F A
- `C13` = C E Bb D A

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Cmaj9 | Am9 | Dm9 | G13 (x2) | Fmaj9 | Em7 | Dm9 | G13sus G13 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | C4·1 D4·1 E4·1 G4·1 |
| 2 | G4·3 r·1 |
| 3 | A4·1 G4·1 E4·1 D4·1 |
| 4 | E4·3 r·1 |
| 5 | D4·1 E4·1 F4·1 A4·1 |
| 6 | A4·3 r·1 |
| 7 | G4·1 E4·1 D4·1 E4·1 |
| 8 | C4·4 |

Zakres A: C4-A4.

Szkielet B `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·2 A4·2 |
| 2 | C5·3 r·1 |
| 3 | D5·2 C5·2 |
| 4 | A4·3 r·1 |
| 5 | G4·2 A4·2 |
| 6 | G4·3 r·1 |
| 7 | F4·2 E4·2 |
| 8 | D4·3 r·1 |

Zakres B: D4-D5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 D4·½ E4·½ G4·1`), takt N = tonika (Cmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s1_poranek_a1`

- Tempo **78 BPM**, 4/4, **32 taktów**, czas **98 s** (1:38).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A); takt 31 = podpis Cuy, takt 32 = tonika Cmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Cmaj9 | Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | G13
- takty 9-16: Fmaj9 | Em7 | Dm9 | G13sus G13 | Fmaj9 | Em7 | Dm9 | G13sus G13
- takty 17-24: Cmaj9 | Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | G13
- takty 25-32: Fmaj9 | Em7 | Dm9 | G13sus G13 | Fmaj9 | Em7 | Dm9 | Cmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | melodia, dłuższe nuty pentatoniczne C-D-E-G-A | C4-G5 (wg szkieletu) | wg szkieletu 'pas' | -3 dB | 1 | 0 |
| 2 | akordy | `EP` | akordy na „i” 2 i 4 (kroki 7 i 15 siatki 16) | voicing blisko, C3-G4 (nic poniżej C3) | krótkie, zanik 600 ms | -6 dB | 1 | L 25 |
| 3 | bas | `TRI` | wolny puls: korzeń na 1, kwinta na 3 | korzenie od C2, przejścia do oktawy 3 (nie poniżej E1) | półnuty | -4 dB | 1 | 0 |
| 4 | szum | `noise_birds` | ćwierkanie w tle | - | pętla przez cały utwór | -24 dB | 1 | szeroko ±50 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -12 dB | `X.....X.........` |
| `HAT` | -16 dB | `X.X.X.X.X.X.X.X.` |
| `SNR` | -14 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, C major, 78 BPM, 4/4 time, swing 58%. Instruments: narrow 12.5% pulse wave (plucky, nasal), electric piano, triangle wave (bass/pad), soft kick, hi-hat, noise snare. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (C4 D4 E4 G4). Morning lo-fi hip-hop with soft brushed beat and distant birds.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: poranny lo-fi hip-hop z ptakami; winyl ledwo słyszalny, (3) zakaz: głośny werbel; basowy puls szybszy niż półnuty, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s1_poranek_a2`

- Tempo **70 BPM**, **32 taktów**, czas **110 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″.

**Akordy takt po takcie**

- takty 1-8: Cmaj9 | Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | G13
- takty 9-16: Fmaj9 | Em7 | Dm9 | G13sus G13 | Fmaj9 | Em7 | Dm9 | G13sus G13
- takty 17-24: Cmaj9 | Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | G13
- takty 25-32: Fmaj9 | Em7 | Dm9 | G13sus G13 | Fmaj9 | Em7 | Dm9 | Cmaj9

**Warstwy aktywne:** `P12` (melodia, -3 dB), `EP` (akordy, -6 dB), `TRI` (bas, -4 dB), `noise_birds` (szum, -24 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s1_poranek_b1`

- Tempo **84 BPM**, **40 taktów** (A1 + mostek 8 taktów po takcie 24), czas **114 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B |
| 25-32 | Mostek | szkielet B (takty 1-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 33-40 | A″ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Fmaj9 | Em7 | Dm9 | Cmaj9/E | Fmaj9 | Gm9 | C13 | Fmaj9`)

- takty 1-8: Cmaj9 | Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | G13
- takty 9-16: Fmaj9 | Em7 | Dm9 | G13sus G13 | Fmaj9 | Em7 | Dm9 | G13sus G13
- takty 17-24: Cmaj9 | Am9 | Dm9 | G13 | Cmaj9 | Am9 | Dm9 | G13
- takty 25-32: Fmaj9 | Em7 | Dm9 | Cmaj9/E | Fmaj9 | Gm9 | C13 | Fmaj9
- takty 33-40: Fmaj9 | Em7 | Dm9 | G13sus G13 | Fmaj9 | Em7 | Dm9 | Cmaj9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `KICK` | -10 dB | `X.....X.........` |
| `HAT` | -14 dB | `X.X.X.X.X.X.X.X.` |
| `SNR` | -12 dB | `....X.......X...` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s1_poranek_b2`

- Tempo **62 BPM** (A1 × 0,8), **28 taktów**, czas **108 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Cmaj9 | Am9 | Dm9 | G13`; powtarzana 7 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `P12` | -3 dB | C5 E5 G5, jedna nuta na takt lub dwa |
| szum | `noise_birds` | -30 dB | zamiast winylu |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-24: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki C D E G A, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 25-28: motyw Cuy w odwróceniu: G4 E4 D4 C4, jedna nuta na takt (całe takty); ostatni takt: tonika Cmaj9, ogon zostaje.
- Całość TAPE(0.2%) na całość. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s1_poranek/` (nazwy `rec_s1_poranek_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-101.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
