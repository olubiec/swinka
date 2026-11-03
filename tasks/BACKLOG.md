# Backlog (pozostałe pomysły poza planem fal)
# Pozostałe pozycje są zbyt szerokie albo niesprawdzalne lokalnie, więc nie wchodzą do `waves.yaml`. Reszta backlogu została zamieniona na fale w-validation-tests, w-perf-tests, w-backlog-cleanup (testy, komentarze XML, ARCHITECTURE, TESTY_RECZNE) albo jest już w `main` (SaveCompat, a11y, check-css-vars, check-icons).

- Przejrzyj `src/Cuy.Core` pod kątem martwego kodu (metody publiczne bez użyć w `src` i `tests`) i usuń tylko ewidentnie nieużywane prywatne metody; listę publicznych podejrzanych wypisz w opisie PR bez usuwania. Weryfikacja: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` i `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
- Dodaj do CI cache NuGet i npm (`actions/setup-dotnet` z `cache: true`, `actions/setup-node` z `cache: npm`, `cache-dependency-path: tools/qa/package-lock.json`); w opisie PR podaj czas CI przed i po. Weryfikacja: CI zielone.
- Dodaj do `.github/workflows/ci.yml` krok sprawdzający, że `setup.sh` działa na czystym runnerze (job `setup-sh`: `bash setup.sh` i `dotnet test`). Weryfikacja: CI zielone.
- Przejrzyj komentarze `TODO` w `src` i `web` i zamień każdy bez konkretnego opisu na konkretny (co, gdzie, kiedy), bez zmiany logiki. Weryfikacja: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
