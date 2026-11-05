# MT-107 · s2_rosa · Rosa

> Wygenerowane przez `tools/music/gen_prompts.py` z `tools/music/catalog_records.py`. Nie edytuj ręcznie.
> Pliki wynikowe: `rec_s2_rosa_a1`, `rec_s2_rosa_a2`, `rec_s2_rosa_b1`, `rec_s2_rosa_b2` (OGG, -16 LUFS, szczyt ≤ -1 dBTP, bez pętli, ogon pogłosu zostaje).
> Seria 2 (Ogród), rzadkość: **common**.

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
| Swing | 50% |
| Seed bazowy | 46821 (A1 +0, A2 +1, B1 +2, B2 +3) |

Charakter płyty: **krople rosy (dzwonki)**.
Efekty serii: REV-M 14% na melodii, bez TAPE, bez VINYL; powietrzny, szeroki stereo.

### 1.1 Słownik akordów

- `Gmaj7` = G B D F#
- `Cmaj7` = C E G B
- `Am7` = A C E G
- `D7sus` = D G A C
- `Em7` = E G B D
- `Bm7` = B D F# A
- `D7` = D F# A C
- `Gmaj9` = G B D F# A

### 1.2 Progresja (cykl)

Cykl 16 taktów, powtarzany; takt n gra akord (n−1 mod 16)+1. Zapis: `Gmaj7 | Cmaj7 | Am7 | D7sus (x2) | Em7 | Bm7 | Cmaj7 | D7 (x2)`

### 1.3 Melodia: szkielet A (temat) i B (kontrast)

Szkielet A `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | G4·1 A4·1 B4·1 D5·1 |
| 2 | D5·3 r·1 |
| 3 | E5·1 D5·1 B4·1 A4·1 |
| 4 | B4·3 r·1 |
| 5 | A4·1 B4·1 C5·1 E5·1 |
| 6 | E5·3 r·1 |
| 7 | D5·1 B4·1 A4·1 B4·1 |
| 8 | G4·4 |

Zakres A: G4-E5.

Szkielet B `pas`:

| Takt | Nuty (nazwa·czas w ćwierćnutach; r = pauza) |
| --- | --- |
| 1 | D5·2 E5·2 |
| 2 | G5·3 r·1 |
| 3 | A5·2 G5·2 |
| 4 | E5·3 r·1 |
| 5 | D5·2 E5·2 |
| 6 | D5·3 r·1 |
| 7 | C5·2 B4·2 |
| 8 | A4·3 r·1 |

Zakres B: A4-A5.

Reguły wariacji: **Aʹ** jak A, ale takty 3-4 o oktawę wyżej, ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu); **A″ i dalsze** jak A, w sekcji końcowej takt N−1 = podpis (`r·2 A4·½ B4·½ D5·1`), takt N = tonika (Gmaj9) trzymana, ogon pogłosu zostaje; **B′** jak B oktawę niżej. Sekcje 4-taktowe: Aʹ bierze takty 1-4 szkieletu, A″ takty 5-8, B takty 5-8.

---

## 2. Utwór A1 (podpisowy): `rec_s2_rosa_a1`

- Tempo **72 BPM**, 4/4, **32 taktów**, czas **107 s** (1:46).
- Pierwsze 2 takty cytują motyw Cuy; ostatnie 2 takty: podpis i tonika.

**Forma i aranżacja**

| Takty | Sekcja | Melodia / aranżacja |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B; rytm bez synkop; perkusja bez stopy (KICK wyciszona), ostatni takt sekcji: fill (SNR/SHK trzy uderzenia na 4. ćwierćnucie) |
| 25-32 | A″ | temat wraca w pełnej aranżacji (szkielet A); takt 31 = podpis Cuy, takt 32 = tonika Gmaj9 trzymana, ogon pogłosu |

**Akordy takt po takcie**

- takty 1-8: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 9-16: Em7 | Bm7 | Cmaj7 | D7 | Em7 | Bm7 | Cmaj7 | D7
- takty 17-24: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 25-32: Em7 | Bm7 | Cmaj7 | D7 | Em7 | Bm7 | Cmaj7 | Gmaj9

**Warstwy**

| # | Rola | Głos | Partia | Rejestr | Wzór | Poziom | Wejście (takt) | Pan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | melodia | `P12` | melodia pastoralna | C4-G5 (wg szkieletu) | wg szkieletu 'pas' | -3 dB | 1 | 0 |
| 2 | ozdoba | `BELL` | krople rosy: pojedyncze nuty losowo (G6, D6) | oktawa 5-6 | losowo z seed, 1 nuta na 1-3 takty | -10 dB | 3 | R 30 |
| 3 | pad | `PAD` | pad | C3-C5, szeroko | długie akordy | -9 dB | 1 | szeroko ±35 |
| 4 | bas | `TRI` | bas co 2 takty (korzeń) | korzenie od G2, przejścia do oktawy 3 (nie poniżej E1) | takty nieparzyste | -8 dB | 1 | 0 |

**Perkusja** (wejście od taktu 3; w sekcji B bez `KICK`; fill co 8 taktów na 4. ćwierćnucie)

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `SHK` | -22 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. SHK ósemki rzadko (co drugi takt, tylko 4 uderzenia).

**Miks:** panoramy w tabeli warstw; dB względem najgłośniejszej warstwy (0 dB); master -16 LUFS, limiter -1 dBTP; wszystkie wejścia w takt, ataki zgodnie z `docs/music_prompts/README.md` (tabela głosów).

**Prompt do zewnętrznego generatora (angielski):** Cozy chiptune-lofi game music for a guinea-pig pet game, G major, 72 BPM, 4/4 time. Instruments: narrow 12.5% pulse wave (plucky, nasal), soft bell, detuned triangle pad, triangle wave (bass/pad), shaker. No vocals, no sawtooth, no harsh sounds, warm and small, looping-friendly. Opening two bars state a four-note motif (G4 A4 B4 D5). Pastoral morning dew with high bell droplets.

**Odbiór A1:** (1) motyw słyszalny w taktach 1-2, (2) wyróżnik: krople rosy (dzwonki), (3) zakaz: perkusja inna niż rzadki SHK, (4) szczyt ≤ -1 dBTP, -16 LUFS ±0,5.

---

## 3. Utwór A2 (spokojny): `rec_s2_rosa_a2`

- Tempo **65 BPM**, **32 taktów**, czas **118 s**.
- Ta sama progresja i szkielety melodii co A1.

**Zmiany względem A1 (obowiązkowe)**

1. Perkusja usunięta w całości (żadnych `KICK/SNR/HAT/BRSH/SHK`).
2. Bas: tylko korzeń akordu na 1. ćwierćnucie każdego taktu, cała wartość taktu, bez synkop i przejść.
3. Melodia: ozdobniki, nuty przygodne i wariacje oktawowe usunięte (Aʹ nie skacze oktawę wyżej); nuty wartości jak w szkielecie.
4. Dodatkowy głos płyty (jeśli rzadka/unikatowa) usunięty; ozdoby `orn` zostają co 16 taktów.
5. `REV-M` +6 punktów procentowych; szumy tła bez zmian (rain/wind w A2 mogą być +4 dB, jeśli płyta tak wskazuje).

**Forma:** 1-8 A; 9-16 Aʹ; 17-24 B; 25-32 A″.

**Akordy takt po takcie**

- takty 1-8: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 9-16: Em7 | Bm7 | Cmaj7 | D7 | Em7 | Bm7 | Cmaj7 | D7
- takty 17-24: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 25-32: Em7 | Bm7 | Cmaj7 | D7 | Em7 | Bm7 | Cmaj7 | Gmaj9

**Warstwy aktywne:** `P12` (melodia, -3 dB), `BELL` (ozdoba, -10 dB), `PAD` (pad, -9 dB), `TRI` (bas, -8 dB).

**Odbiór A2:** rozpoznawalnie ta sama płyta co A1; brak jakiejkolwiek perkusji; wolniejszy o 10%.

---

## 4. Utwór B1 (energiczny): `rec_s2_rosa_b1`

- Tempo **78 BPM**, **36 taktów** (A1 + mostek 4 taktów po takcie 24 — skrócony z 8, by zmieścić się w 120 s), czas **111 s**.
- Aranżacja A1 plus: kontrmelodia, mocniejsza sekcja rytmiczna, mostek.

**Forma**

| Takty | Sekcja | Opis |
| --- | --- | --- |
| 1-8 | A | temat: szkielet A, takty 1-2 = motyw Cuy |
| 9-16 | Aʹ | temat jak w A; takty 3-4 o oktawę wyżej; ostatni takt sekcji kończy na 3. stopniu (cała wartość taktu) |
| 17-24 | B | kontrast: szkielet B |
| 25-28 | Mostek | szkielet B (takty 5-8) oktawę niżej (nowy rejestr), akordy mostka, kontrmelodia przejmuje wysokie długie nuty; perkusja: bez stopy, HAT/SHK ciągłe; ostatni takt mostka: fill |
| 29-36 | A″ | temat wraca w pełnej aranżacji (szkielet A) |

**Akordy takt po takcie** (mostek: `Em7 | Am7 | D7sus | Gmaj7`)

- takty 1-8: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 9-16: Em7 | Bm7 | Cmaj7 | D7 | Em7 | Bm7 | Cmaj7 | D7
- takty 17-24: Gmaj7 | Cmaj7 | Am7 | D7sus | Gmaj7 | Cmaj7 | Am7 | D7sus
- takty 25-32: Em7 | Am7 | D7sus | Gmaj7 | Em7 | Bm7 | Cmaj7 | D7
- takty 33-36: Em7 | Bm7 | Cmaj7 | Gmaj9

**Zmiany względem A1**

1. Kontrmelodia `GLK` (-9 dB), od taktu 9: długie nuty z akordu (3., 5. lub 9. stopień), ruch kontrarny do melodii, w mostku prowadzi.
2. Perkusja jak w A1, wszystkie poziomy +2 dB, fill co 8 taktów (SNR lub SHK, 3 uderzenia na ostatniej ćwierćnucie taktu):

| Instrument | Poziom | Siatka (kroki: 16 na takt (1 e & a)) |
| --- | --- | --- |
| `SHK` | -20 dB | `X.X.X.X.X.X.X.X.` |

`X` = uderzenie, `O` = otwarty hi-hat, `.` = cisza. Humanizacja ±8 ms / ±3 dB z `seed`. SHK ósemki rzadko (co drugi takt, tylko 4 uderzenia).

**Odbiór B1:** wyraźnie żwawszy od A1; mostek słyszalny jako zmiana rejestru; motyw wraca po mostku.

---

## 5. Utwór B2 (nastrojowy): `rec_s2_rosa_b2`

- Tempo **58 BPM** (A1 × 0,8), **24 taktów**, czas **99 s**, bez perkusji.
- Pętla 4 akordów z pierwszych taktów A1: `Gmaj7 | Cmaj7 | Am7 | D7sus`; powtarzana 6 razy.

**Warstwy**

| Warstwa | Głos | Poziom | Opis |
| --- | --- | --- | --- |
| pad | `PAD` | -6 dB | jeden akord na takt, długie przetrzymanie, filtr 2 kHz |
| solo | `BELL` | -3 dB | krople G6/D6, jedna nuta na 1-2 takty |
| szum | `noise_birds` | -30 dB | szum serii |

**Przebieg**

- Takty 1-2: motyw Cuy rozciągnięty ×2 (szkielet `pas` takty 1-2) w głosie solo.
- Takty 3-20: solo gra 1 nutę na takt (półnuta ligowana), z pentatoniki G A B D E, ruch ≤ 1 stopień, wybór z `seed`; nuta zawsze zgodna z akordem taktu.
- Takty 21-24: motyw Cuy w odwróceniu: D5 B4 A4 G4, jedna nuta na takt (całe takty); ostatni takt: tonika Gmaj9, ogon zostaje.
- Całość REV-M 14% na melodii. Bez perkusji, bez basu rytmicznego.

**Odbiór B2:** nastrój spokojniejszy od A2; niczego nie przypomina głośnością; szum serii słyszalny, ale cichy.

---

## 6. Odbiór płyty (wszystkie cztery)

1. Cztery pliki OGG w `assets/music/records/s2_rosa/` (nazwy `rec_s2_rosa_{a1,a2,b1,b2}.ogg`).
2. `node tools/qa/music-audit.js` zielony.
3. Wiersz w `docs/music_review/MT-107.md` (3 odsłuchy: słuchawki, głośnik laptopa, mono; ocena 1-5).
4. A1 i A2 rozpoznawalnie „ta sama płyta”; B1 żwawszy; B2 cichy.
5. Licencja: „własna, wygenerowana kodem” (wiersz generuje `build_manifest.py`).
