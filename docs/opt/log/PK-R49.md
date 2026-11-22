# PK-R49 Log
Status: OK
Decisions:
- Used existing `src/Cuy.Core/Weather/WeatherInfo.cs` (`OpenMeteo.FromWmo/ForecastUrl/GeocodeUrl/ParseCurrent/ParseGeocode`) as base; `WeatherMapping.FromWmo` returns `"clear"` for unknown codes per PK-WX1/PK-T25.
- Used `FieldRule.Str` for `lat`/`lon`/`city` in `WeatherMessages` because `IMessageRuleSet.cs` only provides `Str`, `Int`, `Bool`, `Id`.
- Added `src/Cuy.Core/GameState.Weather.cs` to `PK-WX1` Prompt fixes so `WeatherSettings` persists in `GameState` with `Consent = false` default.
- Owner question resolved: city search uses `geocoding-api.open-meteo.com` only on explicit user action (no IP geolocation), with 1-decimal coordinate rounding before any forecast request.
Verification: `node tools/qa/foundation-check.js docs/opt/foundations/R49.md 7` -> PASS.
