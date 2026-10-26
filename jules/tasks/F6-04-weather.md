# Task F6-04: Weather from Open-Meteo changes how the pig behaves

Read `AGENTS.md` first and follow it. Requires F2-08 (settings) merged. THIS TASK IS THE ONLY ALLOWED NETWORK USE: it calls
the free Open-Meteo API (no key) and nothing else. Add one line to `AGENTS.md` hard rule 5 saying "exception: `WeatherService`".
The free API is for non-commercial use only (Cuy is a gift): keep it that way and keep the request rate far below the limits.

## Library decision (R15)
No NuGet client: the available Open-Meteo NuGet package needs .NET Standard 2.1 and does not work on .NET Framework 4.8. Use the own small client and
mapping that already exist.

## Specification
1. Core (exists, tested): `Cuy.Core.Weather.WeatherInfo { TemperatureC, Condition, WmoCode, IsDay, FetchedUtc, IsWet }`,
   `WeatherCondition { Clear, Cloudy, Fog, Rain, Snow, Storm }`, `GeoPlace { Name, Country, Admin1, Latitude, Longitude, DisplayName }`,
   `OpenMeteo.FromWmo`, `GeocodeUrl`, `ForecastUrl`, `ParseGeocode`, `ParseCurrent`, `OpenMeteo.Attribution`. Extend `GeoPlace` with `Admin2` and make
   `DisplayName` = name + admin1 + admin2 (skip missing and empty ones, no stray commas) and add `ParseGeocodeList(string json)` returning up to 10
   places (fields may be absent or empty; keep `ParseGeocode`); add tests. Then the Brain modifiers from new `assets/data/weather.json`: Rain/Storm -> `sleep_in_house` x2.0
   and walking x0.7; temperature < 5 -> `cold` action (animation `shiver`); temperature > 28 -> `heat` action (animation `heat_flop`),
   `drink` x1.5; at most one weather action per 20 minutes. Add `Pet.Weather` (nullable, not saved) multiplied into scores. Without weather
   everything works as before. Tests in `tests/Cuy.Core.Tests/WeatherTests.cs`.
2. Desktop `WeatherService` (pattern: `research/gotowce/src/Cuy/dotNet/Platform/WeatherService.cs`): `HttpClient` with TLS 1.2 set explicitly, 10 s timeout,
   background thread only, all errors swallowed and logged once. Geocoding: `language=pl`, `countryCode=PL`, `count=10`; the player picks from a list
   (name + admin1 + admin2) in Settings, the chosen coordinates are cached in `LocalData` (no per-request geocoding). Forecast:
   `current=temperature_2m,weather_code,is_day`, `timezone=auto`; do not rely on `current_units` (units are Celsius, WMO code, is_day 1/0).
   Refresh every hour; keep the last good value.
3. Settings panel: text field "City", a result list (name, region, sub-region), "Off" button; messages `settings_city { city }` and `settings_city_pick { index }`.
   Next to the weather show: a link "Weather data by Open-Meteo.com" to https://open-meteo.com/, a link to the licence CC BY 4.0
   (https://creativecommons.org/licenses/by/4.0/) and the words "city search by GeoNames" (https://www.geonames.org/). Say in the UI if values
   are modified. Add the attribution to `THIRD_PARTY_NOTICES.md` and a "Weather data" section to `README.md` (non-commercial use only).
4. Diary: provide the weather data to F4-03 templates (`when.weather`) through `DayStats` if F4-03 is merged (minimal hook; skip silently if absent and say so).
5. No telemetry: the only request data is the city name and coordinates.

## Checks
`dotnet test ... -c Release`; build passes; `node --check`; smoke test.

## Gotowe pliki
- `research/gotowce/src/Cuy.Core/Weather/WeatherInfo.cs` → `src/Cuy.Core/Weather/WeatherInfo.cs` (ALREADY copied; tested).
- `research/gotowce/src/Cuy/dotNet/Platform/WeatherService.cs` → `src/Cuy/dotNet/Platform/WeatherService.cs` (copy, then compile; its `RefreshInterval` is 1 h).
- Files under `research/gotowce/src/Cuy/` were never compiled (they need Windows + .NET Framework 4.8): use them as the starting point and fix compile errors in this task. Files already copied into `src/Cuy.Core/` and `tests/Cuy.Core.Tests/` by the rebuild session compile and are tested.

## Testy ręczne (ZWERYFIKUJ NA PC)
UNVERIFIED (R15.1, R15.2); the human checks (`TESTY_RECZNE.md` WX-01..WX-05):
- `language=pl` for "Warszawa" and "Kraków" gives the Polish names; the order for an ambiguous name ("Nowa Wieś"); are `admin3`/`admin4` filled for villages?
- `current_units` and the time zone of `current.time` in a real response; the exact current wording of the Open-Meteo licence page.

When done, open a pull request against `main` titled `F6-04: Weather`.
