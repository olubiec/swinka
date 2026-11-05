# MT-104 · s1_kubek · Kubek z parą

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s1_kubek_a1`, `rec_s1_kubek_a2`, `rec_s1_kubek_b1`, `rec_s1_kubek_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 1 (Siano & lofi), rzadkość: **common**.

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
| Seed bazowy | 80912 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **bossa nova z parą nad kubkiem**.
Efekty serii: TAPE(0.2%) na całość, LP(9 kHz), REV-S 12%, VINYL(-46 dB) pod całością (cichutko).

### 1.1 Słownik akordów

- `Fmaj9` = F A C E G
- `Dm9` = D F A C E
- `Gm9` = G Bb D F A
- `C13` = C E Bb D A
- `Bbmaj9` = Bb D F A C
- `Am7` = A C E G
- `D7♭9` = D F# A C Eb

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 (x2) | Bbmaj9 | Am7 D7♭9 | Gm9 | C13 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ F4·½ G4·½ A4·½ C5·1½ r·½ |
| 2 | r·1½ A4·½ C5·½ D5·1 r·½ |
| 3 | C5·½ r·½ C5·½ A4·1 G4·½ r·1 |
| 4 | A4·1½ F4·½ G4·1 r·1 |
| 5 | r·½ G4·½ A4·½ Bb4·½ D5·1½ r·½ |
| 6 | r·1½ Bb4·½ D5·½ E5·1 r·½ |
| 7 | D5·½ r·½ C5·½ Bb4·1 A4·½ r·1 |
| 8 | G4·1½ A4·½ F4·2 |

Zakres A: F4-E5.

Szkielet B `syn`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | r·½ C5·½ D5·½ F5·1½ D5·½ r·½ |
| 2 | C5·½ r·½ D5·½ C5·1 A4·½ r·1 |
| 3 | r·½ D5·½ F5·½ G5·1½ F5·½ r·½ |
| 4 | D5·1 C5·1 A4·1 G4·1 |
| 5 | r·½ F5·½ E5·½ D5·1½ C5·½ r·½ |
| 6 | r·½ C5·½ D5·½ C5·1½ A4·½ r·½ |
| 7 | Bb4·1½ A4·½ G4·1 r·1 |
| 8 | G4·3 r·1 |

Zakres B: G4-G5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 G4·½ A4·½ C5·1`), takt N = tonika (Fmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s1_kubek_a1`

- Tempo **92 BPM**, 4/4, **40 taktów**, czas **104 s** (1:44).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A) |
| 33-40 | A‴ | temat wraca w pełnej aranżacji (szkielet A); takt 39 = podpis Cuy, takt 40 = tonika Fmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 9-16: Bbmaj9 | Am7 D7♭9 | Gm9 | C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13
- takty 17-24: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 25-32: Bbmaj9 | Am7 D7♭9 | Gm9 | C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13
- takty 33-40: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bas | `TRI` | bossanowy bas | korzenie od F2, przejścia do oktawy 3 (nie poniżej E1) | wzór (1, -, 5, 5) na 4 ćwierćnuty | -4 dB | 1 | 0 |
| 2 | akordy | `P25` | akordy w rytmie bossy | voicing blisko, C3-G4 (nic poniżej C3) | ósemki X..X..X. (kroki 1,4,7 co pół taktu) | -6 dB | 1 | L 25 |
| 3 | melodia | `P12` | melodia lekka | C4-G5 (wg szkieletu) | wg szkieletu 'syn' | -3 dB | 1 | 0 |
| 4 | szum | `para` | para z kubka: szum różowy HP(3 kHz), obwiednia narastająca i opadająca co 4 takty | - | generowany w locie | -30 dB | 1 | szeroko ±50 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -12 dB | `X..X..X...X..X..` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, F major, 92 BPM, 4/4 time. Instruments: triangle wave (bass/pad), 25% pulse wave (brass/piano-like), narrow 12.5% pulse wave (plucky, nasal), brush swishes. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (F4 G4 A4 C5). Light bossa nova with steam-like noise swells.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: bossa nova z parą nad kubkiem, (3) zakaz: werbel; zbyt głośne miotełki, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s1_kubek_a2`

- Tempo **83 BPM**, **40 taktów**, czas **116 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″; 33-40 A‴.

**Akordy takt po takcie**

- takty 1-8: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 9-16: Bbmaj9 | Am7 D7♭9 | Gm9 | C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13
- takty 17-24: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 25-32: Bbmaj9 | Am7 D7♭9 | Gm9 | C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13
- takty 33-40: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9

**Warstwy aktywne:** `TRI` (bas, -4 dB), `P25` (akordy, -6 dB), `P12` (melodia, -3 dB), `para` (szum, -30 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s1_kubek_b1`

- Tempo **99 BPM**, **48 taktów** (A1 + mostek 8 taktów po takcie 24), czas **116 s**.
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

**Akordy takt po takcie** (mostek: `Bbmaj9 | Am7 | Gm9 | C13 | Fmaj9 | Dm9 | Gm9 | C13`)

- takty 1-8: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 9-16: Bbmaj9 | Am7 D7♭9 | Gm9 | C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13
- takty 17-24: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9
- takty 25-32: Bbmaj9 | Am7 | Gm9 | C13 | Fmaj9 | Dm9 | Gm9 | C13
- takty 33-40: Bbmaj9 | Am7 D7♭9 | Gm9 | C13 | Bbmaj9 | Am7 D7♭9 | Gm9 | C13
- takty 41-48: Fmaj9 | Dm9 | Gm9 C13 | Fmaj9 | Fmaj9 | Dm9 | Gm9 C13 | Fmaj9

**Zmiany względem A1**

1. Kontrmelodia `CEL` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `BRSH` | -10 dB | `X..X..X...X..X..` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`.

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s1_kubek_b2`

- Tempo **74 BPM** (A1 × 0,8), **32 taktów**, czas **104 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Fmaj9 | Dm9 | Gm9 C13 | Fmaj9`; powtarzana 8 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `BELL` | -3 dB | A5 C6 E6 rzadkie |
| szum | `para` | -30 dB | para zamiast winylu |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-28: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki F G A C D, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 29-32: motyw Cuy w odwróceniu: C5 A4 G4 F4, jedna nuta na takt (całe takty); ostatni takt: tonika Fmaj9, ogon zostaje.
- Całość TAPE(0.2%) na całość. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s1_kubek/` (nazwy `rec_s1_kubek_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-104.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
