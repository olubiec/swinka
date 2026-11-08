# PK-P4q: Windows checks after wave P4 (package, wave P4, runs last)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P4q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: node --check web/home/features/pigs/feature.js && node --check web/home/features/pigs/adoption-popup.js && node tools/qa/ux-p4-adoption.js && node tools/qa/ux-p4-pigs-list.js && node tools/qa/ux-p42-web-look.js && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~AdoptionGate|FullyQualifiedName~PigLook|FullyQualifiedName~PigsMessages" && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/)
Goal: Same as PK-P2q for wave P4, plus a regression run of earlier waves (`ux-all.js` without an argument). This package does NOT fix product code: a failing check is written in the log and makes the verification line fail.
Depends on: PK-P4a, PK-P4a2, PK-P4b1, PK-P4b2a, PK-P4b2b merged.

## Steps
1. Append a section "Wave P4" to `docs/qa/UX_WAVE_CHECKS.md` in the same table format: `ux-p4-adoption`, `ux-p4-pigs-list`, Core tests `AdoptionGate`, `PigLook`, `PigsMessages`, check-assets, check-icons, and the manual bullets of "Do sprawdzenia po P4" from `docs/PLAN_POPRAWEK_UX.md`.
2. Run the Weryfikacja line. Put the result of each part in the log (PASS/FAIL and the first failing lines). Add a line "Regression P1-P4: PASS/FAIL".
3. Extra, informational: `node tools/qa/a11y-check.js`.

Prohibited: changing product code or existing test assertions, new dependencies.
Log: write `docs/opt/log/PK-P4q.md` (max 10 lines). Do not run git.
