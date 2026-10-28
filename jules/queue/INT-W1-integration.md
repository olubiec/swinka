Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "INT-W1: Integracja W1". Nie zadawaj pytań i nie zatrzymuj się. Jeśli coś jest niejasne, wybierz najprostsze rozwiązanie zgodne z plikiem zadania i AGENTS.md, a decyzję opisz w PR-ze w sekcji „Decisions”. Jeśli test nie przechodzi, znajdź przyczynę w kodzie i napraw ją w zakresie „Change”; nie zmieniaj asercji.

# INT-W1: Integracja W1 (sesja bez pliku zadania)
1. Pobierz main. Uruchom: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`, `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`, `node tools/qa/web-smoke.js`, `node tools/qa/layout.selftest.js`.
2. Sprawdź: `BondUnlocks.Current` i `HayConfig.Current` ładują pliki z `assets/data` (test na prawdziwych plikach); `CareData.Current` wczytuje `care.json` i ma 9 zadań; `features/index.json` zawiera dokładnie foldery `web/home/features`; nic nie odwołuje się do `PingFeature` ani `hello`.
3. Napraw błędy minimalnie. Nie zmieniaj asercji. Nie zmieniaj plików poza tym, co psuje test.
4. Zaktualizuj status Wave 1 w `docs/PLAN.md` (sekcja Status).
5. PR: lista sprawdzeń z wynikami i listą napraw.
