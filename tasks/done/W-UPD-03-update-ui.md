# W-UPD-03: Update notification badge in Settings and tray menu
Goal: Player can check updates from Settings screen, sees notification badge when an update is ready.
Zmieniaj: src/Cuy/dotNet/Features/SettingsFeature.cs, web/home/features/settings/feature.js, web/home/features/settings/feature.css
Wymagane: web/home/features/settings/feature.js
Weryfikacja: node tools/qa/web-smoke.js; node --check web/home/features/settings/feature.js
Rules: Pixel-art styling consistent with style.css.
Steps:
1. In `SettingsFeature.cs`:
   - Expose `state.update = { available: bool, version: string, downloading: bool }`.
   - Handle bridge message `check_update` and `apply_update`.
2. In `settings/feature.js`:
   - Add "Game Updates" section with current version text and "Check for updates" button.
   - When update available: display green badge with "Update to vX.X.X (Restart)" button.
   - Show toast notification in Home when update is downloaded and ready to apply.

