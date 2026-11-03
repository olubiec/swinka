# W28-03: RunRules: when a pig may be outside and how much mood it earns
Zmieniaj: src/Cuy.Core/World/RunRules.cs, tests/Cuy.Core.Tests/RunRulesTests.cs
Wymagane: src/Cuy.Core/World/RunRules.cs, tests/Cuy.Core.Tests/RunRulesTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pure helper decides if the weather and the hour allow the run and how much mood the hours out are worth.
Depends on: W27 merged. Sub-wave W28a: no dependency on other tasks of the wave.
Facts: Data: `HomeEconomyConfig.Run`: `day_from_hour` 8, `day_to_hour` 19, `min_temp_c` 10, `max_temp_c` 28, `allowed_conditions` Clear/Cloudy, `max_hours_per_day` 6, `mood_per_hour` 1.0, `mood_cap_per_day` 6. Weather comes from `Cuy.Core.Weather.WeatherInfo` (`TemperatureC`, `Condition`, `IsDay`; may be null when offline or not configured: then only the hour rule applies). Pigs are safe pets: the rule exists for their comfort (rain, cold, heat), and the messages are gentle ('It is a bit wet outside today'). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `public static class RunRules`: `RunVerdict CanBeOut(DateTime localNow, WeatherInfo weatherOrNull, HomeEconomyConfig cfg)` (`Ok`, `TooEarly`, `TooLate`, `TooWet`, `TooCold`, `TooHot`, `Dark`), `string Message(RunVerdict)`, `double MoodFor(double hoursOut, double alreadyCreditedToday, HomeEconomyConfig cfg)` (never above the daily cap), `double CreditableHours(DateTime outSince, DateTime until, DateTime localDayStart..., cfg)` limited to the allowed hours and the daily maximum.
2. Tests: each verdict; null weather only checks the hour; 3 hours give 3 mood; 8 hours give 6; the cap holds across two calls the same day; hours outside 8-19 are not credited; `Message` is non-empty for every verdict and contains no Polish letters.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
