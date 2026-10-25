# Task F6-04: Weather from Open-Meteo changes how the pig behaves

Read `AGENTS.md` first and follow it. Requires F2-08 (settings) merged. THIS TASK IS THE ONLY ALLOWED NETWORK USE: it calls
the free Open-Meteo API (no key) and nothing else. Add one line to `AGENTS.md` hard rule 5 saying "exception: `WeatherService`".

## Specification
1. Core (pure, tested in `tests/Cuy.Core.Tests/WeatherTests.cs`): `WeatherInfo { double TemperatureC; Condition Condition }`
   (`Clear, Cloudy, Rain, Snow, Storm`), mapping from Open-Meteo `weather_code` (WMO), and `Brain` weight modifiers read from
   new `assets/data/weather.json`: Rain/Storm -> `sleep_in_house` x2.0 and walking x0.7; temperature < 5 -> `cold` action
   enabled (animation `shiver`); temperature > 28 -> `heat` action enabled (animation `heat_flop`), `drink` x1.5. Add
   `Pet.Weather` (nullable, not saved) that `Brain` multiplies into scores. Without weather everything works as before.
2. Desktop `WeatherService`: city text from the setting `WeatherCity` (default empty = off). Geocode with
   `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1`, then every hour
   `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,weather_code`. `HttpClient`,
   10 s timeout, all errors swallowed and logged once; cache the coordinates in `LocalData`; background thread only.
3. Settings panel: text field "City (for the weather)" + "Off" button; message `settings_city { city }`. Show the
   resolved place name and a line "Weather data by Open-Meteo.com (CC BY 4.0)". Add the attribution to
   `THIRD_PARTY_NOTICES.md`.
4. Diary: provide the `{weather}` data to F4-03 templates (`when.weather`) through `DayStats` if F4-03 is merged
   (minimal hook; skip silently if the class is absent and say so in the PR).
5. No telemetry: the only request data is the city name and coordinates.

## Checks
`dotnet test ... -c Release`; build passes; `node --check`; smoke test. PR "Windows check": enter a city, look at the log.

When done, open a pull request against `main` titled `F6-04: Weather`.
