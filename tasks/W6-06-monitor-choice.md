# W6-06: Choose the monitor for the pig
Zmieniaj: src/Cuy/dotNet/StartUp.cs, src/Cuy/dotNet/LocalData.cs, src/Cuy/dotNet/Features/SettingsFeature.cs, src/Cuy/dotNet/FormPet.cs
Wymagane: src/Cuy/dotNet/LocalData.cs, src/Cuy/dotNet/Features/SettingsFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Nie ruszaj: web/home/*, src/Cuy.Core/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The player can pick which screen the pig lives on; the choice survives restarts and a missing monitor falls back to the primary one.
Depends on: W2-09 / W3-07 (`SettingsFeature` with volume, quiet hours and mute messages) merged. The dropdown UI is built in W7-03 against the contract below.
Facts: `LocalData` stores settings by name (`SettingName` constants). `FormPet` picks the primary screen at start and on `LeaveHome` (`Screen.PrimaryScreen`, `Screen.FromPoint`). Contract (same as the W5-08 mock): `settings.monitors: [ { index, name, width, height, primary } ]`, `settings.monitor: <index>`, message `settings_monitor { index }`.
Steps:
1. `LocalData`: new setting `Monitor` (int index into `Screen.AllScreens`; default = index of the primary screen) with `GetMonitor()` / `SetMonitor(int)` in the same style as `GetScale()`.
2. `SettingsFeature`: write `monitors` and `monitor` into the settings state; handle `settings_monitor` (validate the index, save it, move the pig now). A monitor that no longer exists falls back to the primary one without changing the stored value.
3. `StartUp.cs` / `FormPet.cs`: start the pig on the chosen screen and move it there on change (walk-line along that screen's working-area bottom). Out of scope, say so in the PR: the taskbar of each non-primary monitor. Log `[Monitor] pig on <name>`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": needs two monitors (TESTY_RECZNE.md); with one monitor nothing changes..
