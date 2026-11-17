# PK-Q1: Stage gate: full build, all UX tests, strict defect count
Zmieniaj: docs/opt/log/PK-Q1.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && node tools/qa/plan-audit.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run the full Windows checks once after the whole parallel wave and record PASS/FAIL, new versus old errors and the list of DEFECT lines.

Depends on: wszystkie paczki kroków F2-1..F2-5 scalone.

Produces (names other packages rely on): `docs/opt/log/PK-Q1.md` z tabelą wyników.

## Steps
1. Nie edytuj żadnego pliku poza logiem. Uruchom linię Weryfikacja RAZ (każda komenda raz, bez ponawiania).
2. Dodatkowo raz: `set STRICT=1 && node tools/qa/ux-all.js` i zapisz liczbę DEFECT na paczkę testową (grep `DEFECT` w wyjściu) oraz liczbę testów C# ze `Skip = "DEFECT`.
3. Porównaj z `docs/opt/log/baseline-smoke.txt`; w logu (max 10 linii): PASS/FAIL na komendę, nowe błędy vs stare, nazwy padających `ux-p*` testów z paczką-winowajcą, liczba DEFECT na PK-T3..PK-T13.
4. Jeśli komenda pada przez tę falę: status BLOCKED i nazwa paczki (z pierwszych 5 linii błędu).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.

Log: write `docs/opt/log/PK-Q1.md`. Do not run git.
