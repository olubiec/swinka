# Fala 3: Home jak pulpit + odłożone punkty (instrukcja ręczna)

Start dopiero po F2-6 (fala 2). Zasady, szablon promptu startowego i sposób commitowania są takie same jak w `docs/FALA_2_START.md` (zmień tylko `KROK = F3-n`). Lista paczek kroku: `bash tools/release-wave.sh F3-2` (tak samo F3-1 .. F3-6). **7 kroków (F3-0..F3-6), 37 agentów.**

## Po co ta fala
Sprawdzenie 18.11.2026 pokazało, że świnka w Home ma wszystkie sprite'y (54 wiersze animacji), ale prawie żadnego zachowania z pulpitu. Pulpitem steruje `Brain` (28 akcji z `assets/data/actions.json`), a Home dostaje tylko kliknięcia i losowe sniff/popcorn/spacer. Świnka w Home nie śpi, nie drzemie, nie pije, nie drapie się, nie biega, nie tańczy, nie ziewa i nie śpi razem z drugą. Fala 3 to naprawia i przy okazji domyka punkty odłożone (undo/redo, dźwięki, limity rysowania, wybieg, rekwizyty pulpitu).

## Kroki
| Krok | Agentów | Co daje |
|---|---|---|
| **F3-0** | 2 (B1, B2) | naprawa bazy po Q1/Q2, zanim ruszy fala: B1 stare testy web (29 czerwonych z 85, lista `docs/opt/log/baseline-ux-f3.txt`, sceny teraz 256x144), B2 Core (6 testów) i `--selftest` z `PK-Q1.md`. Uruchamiaj B1 i B2 razem, B2 na Windowsie (potrzebuje `dotnet`) |
| **F3-1** | 6 (R36..R41, odczyt) | R36 inwentarz 28 zachowań i architektura (JS czytający `actions.json`); R37 miejsca do spania, skok, prędkości; R38 wybieg (W28) na zjednoczonym świecie; R39 rekwizyty pulpitu (W29); R40 undo/redo, limity rysowania, dźwięki świata (W20-03, W21-05, W21-03, W27-07, stare ścieżki są nieaktualne); R41 interakcje i dźwięki pulpit vs Home |
| **F3-2** | 12 | H1 mózg świnki w Home (`pig-behavior.js` + `home_behavior.json`); H2 miejsca do spania (`rest-spots.js`); H3 skok, prędkości, zzz (`pig-motion.js`); H4 reakcje na karmienie, głaskanie, sztuczki, chorobę (`pig-reactions.js`); U1 undo/redo i przyciąganie (`edit-history.js`); U2 limity rysowania i dźwięki świata; G1-G3 wybieg (Core, C#, web); D1-D3 rekwizyty pulpitu (Core, C#, okno nakładki) |
| **F3-3** | 2 (RI4, RI5, odczyt) | zgodność kodu z kontraktami i kotwice dla sklejania |
| **F3-4** | 5 | CV3 `canvas-pig.js` (zachowania, miejsca, ruch, reakcje, budżet); APP3 ładowanie modułów i funkcji `run`; PE3 edytor (Ctrl+Z/Y, przyciąganie, komfort); PF3 kontekst sceny i dźwięki; CS3 rejestracja C# (RunFeature, PropsFeature, nakładka) |
| **F3-5** | 8 (T14..T21) | niezależne testy: 28 zachowań w dobie, miejsca i ruch, reakcje, edytor, wybieg, rekwizyty, doba z dwiema świnkami, wydajność i wycieki (ok. 90 przypadków) |
| **F3-6** | 2 (Q3, Q4) | bramka (build, `ux-all`, `STRICT=1`) i arkusz właściciela `docs/qa/F3_OWNER_SHEET.md` |

## Prompt startowy CAŁEJ fali 3 (jedna sesja, wklej raz)
```
FALA = 3

Wykonaj całą falę 3 repo swinka w TEJ JEDNEJ sesji: kroki F3-0, F3-1, F3-2, F3-3, F3-4, F3-5, F3-6 po kolei (plan: docs/FALA_3_START.md). Bez orkiestry. Nie otwieraj nowych sesji ani okien: każdy subagent działa wewnątrz tej sesji, a po skończeniu pracy zamyka się i zwraca wynik.
Czytaj tylko AGENTS.md (raz), docs/FALA_3_START.md i dla kroku: bash tools/release-wave.sh F3-n (PROMPT, FILES, VERIFY). Nie czytaj promptów paczek samemu: robią to subagenci.

Pętla dla każdego kroku F3-n:
1. Uruchom bash tools/release-wave.sh F3-n.
2. Na każdą paczkę kroku jeden subagent (wszystkie paczki kroku naraz w jednej sesji; jeśli równoległość jest ograniczona, partiami po 6, F3-2: partia A = H1,H2,H3,H4,U1,U2, partia B = G1,G2,G3,D1,D2,D3). Subagentowi przekaż TYLKO ścieżkę jego promptu. Subagent zmienia tylko pliki z FILES, nie używa gita, nie osłabia istniejących asercji.
3. Po zakończeniu paczek sprawdź logi docs/opt/log/<paczka>.md (status) i uruchom VERIFY każdej paczki raz.
4. Commit kroku: git status --short, git add <konkretne pliki z FILES, docs/opt/log/, docs/opt/foundations/, docs/qa/, tools/qa/> (nigdy -A ani .; ux-all nadpisuje docs/qa/shots i assets/world/bg, tych nie dodawaj, chyba że są w FILES), git commit -m "F3-n: <zdanie po angielsku>", git push.
5. Dopiero potem następny krok.

Reguły:
- F3-0: B1 (testy web, lista docs/opt/log/baseline-ux-f3.txt) i B2 (Core, selftest) razem. B2 wymaga dotnet; jeśli go nie ma, oznacz B2 "ENV (brak dotnet)", NIE blokuj fali i wpisz to do raportu jako rzecz do zrobienia na Windowsie przed Q3.
- Paczki R/RI (F3-1, F3-3): tylko odczyt, wynik docs/opt/foundations/<id>.md; sprawdź node tools/qa/foundation-check.js <plik> <min sekcji z promptu>. Po F3-1 przejrzyj "Prompt fixes" w R36..R41 (decyzja A/B w R36: domyślnie A) i jeśli trzeba, zaktualizuj prompty F3-2 przed jego startem (kotwice RI mają pierwszeństwo przed R).
- Paczki T (F3-5): tylko nowe testy; wady jako DEFECT, kodu produkcyjnego nie poprawiają.
- Paczki Q (F3-6): tylko gdy nic nie jest BLOCKED; nie naprawiają kodu, każda komenda raz.
- Paczka BLOCKED: nie ponawiaj i nie ruszaj; reszta kroku idzie dalej, następny krok wstrzymaj i zapytaj mnie.
- Test z docs/opt/log/baseline-ux-f3.txt, który pada poza plikami paczki, nie jest powodem BLOCKED.

RAPORT po każdym kroku (maks. 6 linii) i końcowy po F3-6 (maks. 20 linii, po polsku): paczki (OK / OK-Z-UWAGĄ / BLOCKED / ENV), testy (nowe błędy, stare z baseline, DEFECT na paczkę), hashe commitów, 3-5 punktów do sprawdzenia w grze z docs/qa/F3_OWNER_SHEET.md.
```

## Uwagi
- Start fali 3 po F3-0. Paczki F3-1..F3-5 mają w sekcji "Kontekst" wiersz BASELINE: czerwony test z listy baseline nie jest powodem BLOCKED. Bez F3-0 bramka Q3 będzie czerwona od startu.
- `ux-all` nadpisuje `docs/qa/shots` i `assets/world/bg`: przed commitem paczki sprawdź `git status` i commituj tylko pliki z "Zmieniaj".
- F3-2: jeśli 12 naraz to za dużo, partia A: H1, H2, H3, H4, U1, U2; partia B: G1, G2, G3, D1, D2, D3. Pliki są rozłączne (`node tools/qa/plan-audit.js`).
- Prompty implementacji mówią "gdy plik badawczy przeczy promptowi, wygrywa plik badawczy". Po F3-1 przejrzyj sekcję "Prompt fixes" w R36..R41, szczególnie decyzję A/B w R36 (rekomendacja A: JS w Home).
- D3, CS3 i część G2 to C# weryfikowany tylko buildem; działanie na Windowsie sprawdzasz arkuszem z F3-6 i `docs/qa/DESKTOP_PROPS_MANUAL.md`.
- Po F3-6: gra na Windowsie wg `docs/qa/F3_OWNER_SHEET.md`, potem fala 4 (`docs/FALA_4_START.md`).
