# Task F2-08: Music in games + a Settings panel in Home

Read `AGENTS.md` and `jules/contracts.md` (section **settings**) first and follow them exactly.
Requires F1-01 (plugins), F1-09 (music player `window.CuyMusic`), F1-12 (pet size) merged.

## Goal
Pixel music plays during minigames (and the calm track is already used by colouring); the player can turn music and
sounds on/off, set the music volume, the pet size and autostart from one Settings panel in Home.

## Files you may change / add
`web/home/minigames/minigames-api.js`, new `web/home/features/settings/feature.js`, new
`web/home/features/settings/feature.css`, new `src/Cuy/dotNet/Features/SettingsFeature.cs`.

## Specification
1. `minigames-api.js`: when a game starts, `CuyMusic.play('games_1')` (alternate `games_1`/`games_2` per game start;
   `games_boss` for the last 15 s if the game reports remaining time via an optional `config.onTimeLeft(s)` call – add
   that optional hook and call it from Veggie Rain only if it is trivial, otherwise skip the boss track); pause the music
   when the game pauses, resume on resume; on game over play `menu` quietly (volume x0.6) for the result screen; stop
   music when the games dialog closes (listen for the modal closing the same way the manager already pauses games).
   Everything guarded with `if (window.CuyMusic)`.
2. `SettingsFeature` (`Id = "settings"`): `AddState` → `{ petSize: "small"|"big" (from LocalData scale), sounds: bool
   (SoundManager/LocalData setting used by the tray "Sounds" item), autostart: AutoStart.IsEnabled() }`.
   Messages: `settings_pet_size { size }` → same code path as the tray Size menu from F1-12 (call the method F1-12
   added; if it is private in ContextMenus, move nothing – instead add a small public static helper in
   SettingsFeature that does the same: `Program.MyData.SetScale(...)` + the StartUp reload call), `settings_sounds { on }`,
   `settings_autostart { on }` (AutoStart.Enable/Disable). Keep the tray menu check marks in sync if the tray reads the
   settings when opening (it rebuilds on open – verify; if not, mention in the PR).
3. Settings panel (More → Settings, `order: 90`, icon `icon-music-note`): toggles Sounds, Music (CuyMusic.setEnabled),
   music volume slider (0-100 %, CuyMusic.setVolume, plays a short preview of `menu` while dragging), Pet size
   Small/Big, Start with Windows; a footer "Cuy 1.0 · music: Juhani Junkala (CC0) · emoji art: Twemoji (CC-BY 4.0)".
   Mock mode works with a demo `settings` object.

## Checks
`node --check` on changed JS; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; smoke test
with `"settings"` temporarily listed (revert). In the PR: how you verified music start/stop in a browser.

When done, open a pull request against `main` titled `F2-08: Game music and Settings panel`.
