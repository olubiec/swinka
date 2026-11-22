# PK-WX1 Log
- Implemented `GameState.Weather.cs` (`WeatherSettings` + `GameState.Weather` non-null property), `WeatherMapping` (`FromWmo`, `RoundCoord`, `TryParseCoords`), `WeatherMessages` (`IMessageRuleSet` + `ValidateLocationPayload`), `WeatherService` (lazy `HttpClient`, 5s timeout, 30-min interval, disk cache, never throws), and `docs/contracts/weather.md`.
- Decision: `GameState.Weather` setter coalesces `null` to `new WeatherSettings()` so old/null saves stay safe without editing `GameState.cs` (outside allowed files).
- Decision: `WeatherMapping.FromWmo` delegates known WMO codes `0..99` to `OpenMeteo.FromWmo` and returns `"clear"` for unknown/out-of-range codes.
- `WeatherService` is build-verified via `Cuy.csproj`; unit tests for `WeatherService` (HTTP handler/timeout/30-min interval) belong to `PK-T25` (`Cuy.Core.Tests` does not reference `Cuy.csproj`).
- Verification: `dotnet test ... --filter "FullyQualifiedName~Weather"` -> 60 passed, 0 failed; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` -> 0 warnings, 0 errors.
