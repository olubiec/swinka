# PK-Q3: Stage gate (wave 3): full build, all UX tests, strict defect count
Zmieniaj: docs/opt/log/PK-Q3.md, docs/opt/log/F3-gate.txt
Weryfikacja: node tools/qa/plan-audit.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj" i zakresy linii znalezione przez grep. Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego i NIE czytasz testów, które napisali implementujący (lista w sekcji "Nie czytaj"). Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu (w C# test z `Skip = "DEFECT <id>"`); skrypt JS kończy się kodem 0, chyba że ustawiono zmienną STRICT=1 (wtedy kod 1 przy jakimkolwiek DEFECT). Test, którego API jeszcze nie istnieje, drukuje `SKIP <id>: <powód>` (nigdy nie przechodzi po cichu). Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run everything once at the end of wave 3 and report the truth: build, Core tests, `node tools/qa/ux-all.js`, then once more with `STRICT=1`, plus `node tools/qa/data-check.js` and `node tools/qa/home-behavior-check.js`.

Steps
1. `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` i `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
2. `node tools/qa/ux-all.js` zapisz wynik do `docs/opt/log/F3-gate.txt`.
3. `STRICT=1 node tools/qa/ux-all.js` zapisz liczbę DEFECT i SKIP; wypisz każdy DEFECT z id i jednozdaniowym opisem.
4. `node tools/qa/data-check.js` i `node tools/qa/home-behavior-check.js`.
5. W logu: tabela krok, wynik (PASS/FAIL), liczba DEFECT/SKIP; lista przypadków do poprawy (bez poprawiania).

Prohibited: editing code, data or tests, running git, fixing failures (only report).

Log: `docs/opt/log/PK-Q3.md` (max 30 linii).
