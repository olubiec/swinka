# Fala 3: Home jak pulpit + odłożone punkty (instrukcja ręczna)

Start dopiero po F2-6 (fala 2) oraz F2F-6 (`docs/FALA_2_FIX_START.md`). Zasady, szablon promptu startowego i sposób commitowania są takie same jak w `docs/FALA_2_START.md` (zmień tylko `KROK = F3-n`). Lista paczek kroku: `bash tools/release-wave.sh F3-2` (tak samo F3-1 .. F3-6). **6 kroków, 35 agentów.**

## Po co ta fala
Sprawdzenie 18.11.2026 pokazało, że świnka w Home ma wszystkie sprite'y (54 wiersze animacji), ale prawie żadnego zachowania z pulpitu. Pulpitem steruje `Brain` (28 akcji z `assets/data/actions.json`), a Home dostaje tylko kliknięcia i losowe sniff/popcorn/spacer. Świnka w Home nie śpi, nie drzemie, nie pije, nie drapie się, nie biega, nie tańczy, nie ziewa i nie śpi razem z drugą. Fala 3 to naprawia i przy okazji domyka punkty odłożone (undo/redo, dźwięki, limity rysowania, wybieg, rekwizyty pulpitu).

## Kroki
| Krok | Agentów | Co daje |
|---|---|---|
| **F3-1** | 6 (R36..R41, odczyt) | R36 inwentarz 28 zachowań i architektura (JS czytający `actions.json`); R37 miejsca do spania, skok, prędkości; R38 wybieg (W28) na zjednoczonym świecie; R39 rekwizyty pulpitu (W29); R40 undo/redo, limity rysowania, dźwięki świata (W20-03, W21-05, W21-03, W27-07, stare ścieżki są nieaktualne); R41 interakcje i dźwięki pulpit vs Home |
| **F3-2** | 12 | H1 mózg świnki w Home (`pig-behavior.js` + `home_behavior.json`); H2 miejsca do spania (`rest-spots.js`); H3 skok, prędkości, zzz (`pig-motion.js`); H4 reakcje na karmienie, głaskanie, sztuczki, chorobę (`pig-reactions.js`); U1 undo/redo i przyciąganie (`edit-history.js`); U2 limity rysowania i dźwięki świata; G1-G3 wybieg (Core, C#, web); D1-D3 rekwizyty pulpitu (Core, C#, okno nakładki) |
| **F3-3** | 2 (RI4, RI5, odczyt) | zgodność kodu z kontraktami i kotwice dla sklejania |
| **F3-4** | 5 | CV3 `canvas-pig.js` (zachowania, miejsca, ruch, reakcje, budżet); APP3 ładowanie modułów i funkcji `run`; PE3 edytor (Ctrl+Z/Y, przyciąganie, komfort); PF3 kontekst sceny i dźwięki; CS3 rejestracja C# (RunFeature, PropsFeature, nakładka) |
| **F3-5** | 8 (T14..T21) | niezależne testy: 28 zachowań w dobie, miejsca i ruch, reakcje, edytor, wybieg, rekwizyty, doba z dwiema świnkami, wydajność i wycieki (ok. 90 przypadków) |
| **F3-6** | 2 (Q3, Q4) | bramka (build, `ux-all`, `STRICT=1`) i arkusz właściciela `docs/qa/F3_OWNER_SHEET.md` |

## Uwagi
- F3-2: jeśli 12 naraz to za dużo, partia A: H1, H2, H3, H4, U1, U2; partia B: G1, G2, G3, D1, D2, D3. Pliki są rozłączne (`node tools/qa/plan-audit.js`).
- Prompty implementacji mówią "gdy plik badawczy przeczy promptowi, wygrywa plik badawczy". Po F3-1 przejrzyj sekcję "Prompt fixes" w R36..R41, szczególnie decyzję A/B w R36 (rekomendacja A: JS w Home).
- D3, CS3 i część G2 to C# weryfikowany tylko buildem; działanie na Windowsie sprawdzasz arkuszem z F3-6 i `docs/qa/DESKTOP_PROPS_MANUAL.md`.
- Po F3-6: gra na Windowsie wg `docs/qa/F3_OWNER_SHEET.md`, potem fala 4 (`docs/FALA_4_START.md`).
