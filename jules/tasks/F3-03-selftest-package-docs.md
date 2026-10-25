# Task F3-03: Self-test, package and docs for the new content

Read `AGENTS.md` first. All F1/F2 tasks are merged.

## Files you may change
`src/Cuy/dotNet/SelfTest.cs`, `tools/package.ps1`, `tools/package/README.txt`, `THIRD_PARTY_NOTICES.md`, `README.md`,
`ARCHITECTURE.md`, `TESTING.md`.

## Steps
1. `SelfTest.cs` (`Cuy.exe --selftest`): add checks – every `assets/data/*.json` parses; `items*.json` ids unique;
   `care.json`, `health.json`, `economy.json` load through the Core loaders; every `assets/music` file listed in
   `tracks.json` exists and is > 10 KB; `assets/coloring/index.json` packs exist and every picture has
   `len(cells) == w*h`; every `web/home/features/*/feature.js` exists for the ids in `features/index.json`; icons.json
   indexes < icon sheet width / 16. Same PASS/FAIL output format as the existing checks.
2. `package.ps1`: make sure `assets/LICENSES` is in the package; the package size is printed; fail if > 80 MB.
3. `tools/package/README.txt` (for the player, short, English): add 6 lines about the new things: care calendar
   reminders (Done / Later), vet clinic, colouring, shop & decorations, daily gift, settings (music, size).
4. `THIRD_PARTY_NOTICES.md`: add the music (Juhani Junkala, CC0, URL) and Twemoji (CC-BY 4.0, attribution text, URL)
   sections, pointing to `assets/LICENSES/`.
5. `ARCHITECTURE.md`: a section "Home features" (web modules + C# IHomeFeature + contracts in `jules/contracts.md`),
   the new Core systems (Economy, Care, Health, Coloring, Decor) and data files. `README.md`: update the table.
6. `TESTING.md`: a manual Windows checklist for the new features (one line each: what to do, what should happen):
   first run, edge peek (`--peek-test`), poops while sleeping, shadow while dragging, Home toys, Play menu, shop buy
   limits, decor equip, colouring save/restart/reward, care reminder Done/Later, weight alert, illness + vet cure (60x
   clock), daily gift, settings (music, size, autostart), package + self-test.

## Checks
`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; Core tests.

When done, open a pull request against `main` titled `F3-03: Self-test, package and docs`.
