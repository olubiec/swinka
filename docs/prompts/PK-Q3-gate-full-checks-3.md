# PK-Q3: Stage gate (wave 3): full build, all UX tests, strict defect count
Zmieniaj: docs/opt/log/PK-Q3.md, docs/opt/log/F3-gate.txt
Weryfikacja: node tools/qa/plan-audit.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 55 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj" i zakresy linii znalezione przez grep. Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego i NIE czytasz testów, które napisali implementujący (lista w sekcji "Nie czytaj"). Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu (w C# test z `Skip = "DEFECT <id>"`); skrypt JS kończy się kodem 0, chyba że ustawiono zmienną STRICT=1 (wtedy kod 1 przy jakimkolwiek DEFECT). Test, którego API jeszcze nie istnieje, drukuje `SKIP <id>: <powód>` (nigdy nie przechodzi po cichu). Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run everything once at the end of wave 3 and report the truth: build, Core tests, `node tools/qa/ux-all.js`, then once more with `STRICT=1`, plus `node tools/qa/data-check.js` and `node tools/qa/home-behavior-check.js`.

Steps
1. `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` i `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
2. `node tools/qa/ux-all.js` zapisz wynik do `docs/opt/log/F3-gate.txt`.
3. `STRICT=1 node tools/qa/ux-all.js` zapisz liczbę DEFECT i SKIP; wypisz każdy DEFECT z id i jednozdaniowym opisem.
4. `node tools/qa/data-check.js` i `node tools/qa/home-behavior-check.js`.
5. W logu: tabela krok, wynik (PASS/FAIL), liczba DEFECT/SKIP; lista przypadków do poprawy (bez poprawiania).

Dodatkowo (lekcje z Q1/Q2, `docs/opt/log/PK-Q1.md`):
6. Uruchom też to, co robiło Q1: `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release`, `node tools/qa/check-assets.js`, `node tools/qa/check-icons.js`, `node tools/qa/plan-audit.js`, `powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25`, `Cuy.exe --selftest`. Wyjątek od zakazu: `node tools/qa/web-smoke.js` uruchom RAZ i porównaj z `docs/opt/log/baseline-smoke.txt` (Q1: sypał się na `features folder mismatch`).
7. Porównaj z Q1: w logu tabela "Q1 (F2-6) -> Q3": Core (było 1235 PASS / 6 FAIL), `ux-all` (było 56/84 PASS), STRICT DEFECT (było 24 w T3..T13 + P46t2), `web-smoke`, selftest. Każdy test z `docs/opt/log/baseline-ux-f3.txt` oznacz: naprawiony przez PK-B1/B2 albo nadal czerwony.
8. Zwróć uwagę, że `ux-all` nadpisuje zrzuty w `docs/qa/shots` i `assets/world/bg`: po biegu wypisz `git status`-owe różnice jako "hałas zrzutów" (bez commitowania; nie uruchamiaj git, poproś właściciela o `git status`).
9. Wyniki nowych testów fali 3 (`ux-p110`..`ux-p12x`, `home-behavior-check.js`, testy C# rekwizytów i wybiegu) wypisz osobno: PASS/FAIL/SKIP na test, żeby było widać, co dowiozły paczki H, U, G, D, T14-T21.

Prohibited: editing code, data or tests, running git, fixing failures (only report).

Log: `docs/opt/log/PK-Q3.md` (max 30 linii).
