# Fala 2: instrukcja ręcznego przebiegu (Antigravity, bez orkiestry)

Stan 18.11.2026. Orkiestra jest usunięta. Zostało **6 kroków** (F2-1 .. F2-6), **54 agentów**, w jednym kroku wszyscy naraz, każdy w innych plikach. Plan i uzasadnienie: `docs/PLAN_FAL_PRZEBUDOWA_17_11.md`. Lista paczek kroku z plikami i weryfikacją: `bash tools/release-wave.sh F2-2` (tak samo dla F2-1 .. F2-6).

## Zasady (dla Ciebie)
1. Kroki idą PO KOLEI. Następny startuje dopiero, gdy poprzedni nie ma paczki BLOCKED (BLOCKED = agent napisał to w `docs/opt/log/<paczka>.md`).
2. W kroku: jeden subagent na paczkę, wszystkie naraz. Subagent dostaje TYLKO ścieżkę swojego promptu (`docs/prompts/<paczka>-*.md`). Agenci nie używają gita.
3. Po kroku: Ty (albo główny agent) robisz jeden commit: `git status --short`, `git add <konkretne pliki>` (nie `-A`), `git commit -m "F2-<n>: <zdanie po angielsku>"`, `git push`. Zmiany mają mieścić się w polach `Zmieniaj` paczek kroku, w `docs/opt/log/`, `docs/opt/foundations/`, `docs/qa/`, `tools/qa/`.
4. Jeśli Antigravity nie uniesie 18 agentów naraz w F2-2, rób dwie partie po 9 (podział niżej), a commit dopiero po obu.

## Prompt startowy kroku (wklej, zmieniasz tylko KROK)
```
KROK = F2-1

Wykonaj krok KROK repo swinka (fala 2, plan: docs/FALA_2_START.md). Bez orkiestry.
Czytaj tylko AGENTS.md (raz) i wynik: bash tools/release-wave.sh $KROK (paczki: PROMPT, FILES, VERIFY).
Jedna paczka = jeden subagent, wszystkie paczki kroku naraz; subagentowi przekaż tylko ścieżkę jego promptu.
Subagent zmienia tylko pliki z FILES, nie używa gita, nie osłabia istniejących asercji.
Paczki R/RI (badawcze, F2-1 i F2-3): tylko odczyt, wynik w docs/opt/foundations/<id>.md;
sprawdź: node tools/qa/foundation-check.js <plik> <min sekcji z promptu>.
Paczki T/P46t (F2-5): tylko nowe testy; wady jako DEFECT, kodu produkcyjnego nie poprawiają.
Paczka BLOCKED: nie ponawiaj, reszta idzie dalej; kolejny krok wstrzymaj.
Na końcu: git status, jeden commit tylko konkretnych plików ("F2-n: ..."), git push. Raport po polsku, maks. 20 linii:
paczki (OK / OK-Z-UWAGĄ / BLOCKED), testy (nowe błędy, stare, DEFECT na paczkę), hash commita, 3-5 punktów do sprawdzenia w grze.
```

## Co zostało i co daje każdy krok
| Krok | Agentów | Rola | Co daje | Rozmiar |
|---|---|---|---|---|
| **F2-1** | 12 | badania (odczyt) PK-R24..R35 | pomiary i kontrakty modułów (DOSŁOWNIE), kotwice w kodzie, przypadki testowe, "Prompt fixes" w `docs/opt/foundations/R24..R35.md`; od nich zależy cała reszta | 12 plików, ok. 80 sekcji |
| **F2-2** | 18 | implementacja (pliki rozłączne) | Core: obiekty plenerowe jako instancje (P46a); sceny z instancji (P46b); czyste tła 256x144 + park (P47a); pasek miejsc i układ dołu okna, uwaga 24 (P47c, P24c); canvas przejście 1: kadr, skala świnki 28, efekt nocy 26, cień (P47r); światła i nocne źródła (P6c); hotspoty: dane i silnik (P43ab); wiele świnek (P5a), pogoda (P7a), cele zabawy (P7b); filtry, szablony, skórki 27 (P6a, P6b, P6s); przypięcie i druga świnka (P5b, P5c); targ i farma w scenie (P43c, P43d) | ok. 70 zadań, ok. 90 przypadków testowych (testy najpierw) |
| **F2-3** | 3 | analiza sklejenia (odczyt) PK-RI1..RI3 | porównanie kontraktu z rzeczywistym kodem po F2-2, build i testy Core, prawdziwe kotwice dla F2-4 | 3 raporty |
| **F2-4** | 6 | sklejanie gorących plików | canvas przejście 2 (CV2: wiele świnek, zabawa, hotspoty); `places/feature.js` (PF2: lampy, pogoda); `edit-panel.js` (PE2: zakładka Outdoor, filtry, szablony, skórki 27, lampy 25); ładowanie modułów (APP2); C# reguły dla dworu (P46c); fizyka lamp 25 w Core (P25c) | 20 zadań |
| **F2-5** | 13 | niezależne testy (P46t1, P46t2, T3..T13) | ok. 150 przypadków próbujących zepsuć funkcje; wady jako `DEFECT` | 13 plików testów |
| **F2-6** | 2 | bramki PK-Q1, PK-Q2 | pełny build, `ux-all`, `web-smoke`, `check-assets`, `check-icons`, `run-exe-smoke` (każda raz) + przebieg `STRICT=1` z liczbą DEFECT; arkusz właściciela i zrzuty | 8 kroków |

Razem: 54 agentów, ok. 6 przebiegów (każdy to jedna sesja Antigravity z N subagentami), po F2-6 Ty grasz na Windowsie wg `docs/qa/UX_WAVE_CHECKS.md` (sekcje fali 2).

## Podział F2-2 na 2 partie (gdyby 18 naraz było za dużo)
- **Partia A (9):** PK-P46a, PK-P46b, PK-P47a, PK-P47c, PK-P47r, PK-P6c, PK-P24c, PK-P43c, PK-P43d
- **Partia B (9):** PK-P43ab, PK-P5a, PK-P7a, PK-P7b, PK-P6a, PK-P6b, PK-P6s, PK-P5b, PK-P5c
Pliki wszystkich 18 paczek są rozłączne (pilnuje tego `node tools/qa/plan-audit.js`), więc kolejność partii nie ma znaczenia.

## Punkty kontrolne
- Po F2-1 (opcjonalnie, 5 min): przejrzyj "Prompt fixes" i "pytania do właściciela" w `R24..R35.md`; przerwij tylko, jeśli nie zgadzasz się z przyczyną uwagi 24 (R24) lub 25 (R25).
- Po F2-3: jeśli któraś RI zgłasza rozjazd kontraktu, napraw prompt paczki F2-4 przed jej startem (kotwice RI mają pierwszeństwo przed R).
- PK-P5c może skończyć się BLOCKED (R29); to nie zatrzymuje reszty fali.

## Co dalej
- **Fala 2 — F2-FIX** (naprawa 9 błędów z testów na żywo w `Cuy.exe`: zacinanie 1 Hz, klasyczny pasek miejsc, przeciąganie świnki na żywo, dopasowanie sceny 16:9 bez brązowych ramek, bogatsze tła plenerowe i 10 obiektów Parku, kolizje stóp mebli w pikselach, klikanie lamp, zamykanie menu grządki/straganu przez `×` i klik w tło, szyldy na straganach i stan `In bag: X` przy sadzeniu): `docs/FALA_2_FIX_START.md`, 6 kroków (`F2F-1`..`F2F-6`), 24 agentów.
- **Fala 3** (Home jak pulpit: spanie, drzemka, skok, taniec; odłożone punkty): `docs/FALA_3_START.md`, 6 kroków, 35 agentów.
- **Fala 4** (Hay Hop, towarzysz, taniec do muzyki, pogoda za zgodą, etapy w Domku, bramka końcowa): `docs/FALA_4_START.md`, 6 kroków, 25 agentów.
- Wcześniejsze paczki PK-23b (BLOCKED, brak kodu) i PK-21 (częściowo) czekają na osobną decyzję; fale 2-4 ich nie wymagają.
- Ręczne bramki Windows po W22, W26, W30: `TESTY_RECZNE.md`.
