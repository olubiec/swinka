# Live Weather Contract

Opt-in live weather using Open-Meteo (`https://api.open-meteo.com/v1/forecast` and `https://geocoding-api.open-meteo.com/v1/search`).
Disabled by default (`consent: false`). No network requests are made without explicit owner consent.
Coordinates are rounded to 1 decimal place (~11 km) before saving or querying. Weather is visual only.

## State (`state.weather`)

```json
{
  "consent": false,
  "consentChangedUtc": null,
  "locationName": "",
  "lat": null,
  "lon": null,
  "status": "off",
  "condition": "clear",
  "wmoCode": 0,
  "temperatureC": null,
  "isDay": true,
  "updatedUtc": null,
  "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)"
}
```

- `status`: `"off" | "ok" | "offline" | "error" | "no_location"`
- `condition`: `"clear" | "cloudy" | "fog" | "rain" | "snow" | "storm"`

## Incoming Messages (JS -> C#)

- `weather.setConsent`: `{ "type": "weather.setConsent", "consent": true|false }`
- `weather.setLocation`: `{ "type": "weather.setLocation", "city": "...", "lat": "...", "lon": "..." }` (all fields optional in schema; either `lat`+`lon` in `[-90,90]`/`[-180,180]` or `city` max 80 chars required)
- `weather.deleteLocation`: `{ "type": "weather.deleteLocation" }`
- `weather.refresh`: `{ "type": "weather.refresh" }`
