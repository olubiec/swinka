# PK-T25: Live weather and privacy tests
- JS (`tools/qa/ux-p143-weather-privacy.js`): 6 PASS, 0 DEFECT, 0 SKIP (`WX-no-request-before-consent`, `WX-consent-text-matches-data-sent`, `WX-consent-off-stops-requests`, `WX-delete-location-clears-state`, `WX-offline-ui`, `WX-console-clean`).
- C# (`tests/Cuy.Core.Tests/WeatherAdversarialTests.cs`): 5 PASS (`WX-payload-only-rounded-lat-lon`, `WX-malformed-json-no-throw`, `WX-all-wmo-codes`, `WX-message-fuzz-300`, `WX-gamestate-default-off`), 0 DEFECT, 4 SKIP (`WX-handler-never-called-without-consent`, `WX-min-interval-30-min`, `WX-timeout-5s`, `WX-http-500-no-throw`).
- Decisions: `ux.js:openHome` checks `listFeatures().length > 10` (currently 10 registered), so `ux-p143-weather-privacy.js` waits for `weather` feature registration directly; `#wxRefreshBtn` is disabled when consent is off, so `WX-consent-off-stops-requests` asserts `isDisabled` and tests `{ force: true }` click.
- Gaps/SKIP: `WeatherService` lives in `src/Cuy/dotNet/WeatherService.cs` (`net48`), which is not referenced by `Cuy.Core.Tests` (`net9.0`), so the 4 `WeatherService` HTTP/timer cases are marked `Skip`.
- DEFECT: none.
