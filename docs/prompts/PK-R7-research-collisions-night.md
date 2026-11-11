# PK-R7: Research: collisions, night lamps, shadows, weather (P7) (wave F1)
Zmieniaj: docs/opt/foundations/R7.md, docs/opt/log/PK-R7.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R7.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: tylko do odczytu. Nie edytuj kodu, danych ani testów, nie buduj, nie uruchamiaj git. Piszesz wyłącznie dokument z Zmieniaj. Czytaj zakresy linii znalezione przez grep, nie całe pliki. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Say how much of P7 is covered by `blockers`, `CanPlace` and the walk grid from P39c, and what remains (night lamps and torches, shadows, play animations, weather).
Depends on: Nothing (read-only). Runs in wave F1 in parallel with the other F1 packages.
Produces: `docs/opt/foundations/R7.md` with numbered sections 1-5 (heading format `## 1. Title`), max 16000 characters, ending in a proposed package split and "Prompt fixes".

## Kontekst
- P39 dodała `blockers`, siatkę chodzenia i pathfinding (`docs/opt/foundations/P39.md`). Po P46 stałe obiekty plenerowe są instancjami z footprintem.
- Latarnie i pochodnie na noc wymagają grafiki D4 (ognisko, światło), więc ich paczka jest w fali 4, po D4.
Opisy punktów: `docs/PLAN_POPRAWEK_UX.md` (znajdź grepem wiersze P7-01..P7-04) i `docs/PLAN_FAL_PRZEBUDOWA_11_11.md` (wiersz fali P7). Nie czytaj docs/WORLD.md, PIG_ROOMS.md, NAMED_PIGS.md.

## Steps
1. Section 1 "Status per item": dla każdego punktu P7-01..P7-04 napisz Done / Partly / Open z dowodem (plik:linia). Sprawdź, co zrobiły fale P31-P45 (`docs/opt/log/`, `docs/opt/foundations/`).
2. Section 2 "What is left": zakres zmniejszony do tego, co faktycznie zostaje; nazwy istniejących funkcji, plików i wiadomości, których trzeba użyć.
3. Section 3 "Risks": Co z P7 da się zrobić bez D4 (fala 3), a co musi czekać na grafikę (fala 4); kolizje z P46 (footprinty) i P43.
4. Section 4 "Files and conflicts": tabela plików, które zmieni każda proponowana paczka, i kolizje z falami 1-3 (P44, P4, P46, P43, P47: `canvas-pig.js`, `places/feature.js`, `scenes.js`, `app.js`).
5. Section 5 "Proposed packages and decisions": podział na paczki a/b/c (1-4 punkty każda, pliki rozłączne w obrębie paczki), max 5 decyzji dla właściciela z domyślną odpowiedzią, lista "Prompt fixes".
6. Uruchom Weryfikacja. Nie edytuj żadnego innego pliku.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-R7.md` (max 10 lines: decisions, exact names others will use, BLOCKED reason if any).
