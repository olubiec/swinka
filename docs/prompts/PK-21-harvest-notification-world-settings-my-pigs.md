# PK-21: Harvest notification, world settings, My Pigs links
Zmieniaj: src/Cuy/dotNet/BrainController.cs, web/home/features/settings/feature.js, web/home/features/index.json, web/home/features/pigs/feature.js
Wymagane: src/Cuy/dotNet/BrainController.cs, web/home/features/settings/feature.js, web/home/features/index.json, web/home/features/pigs/feature.js
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true && node --check web/home/features/settings/feature.js && node --check web/home/features/pigs/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W21-01, W21-02, W21-04
Goal: Harvest notification, world settings, My Pigs links.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W21-01: Desktop: 'harvest ready' notification once a day
Files of this item: src/Cuy/dotNet/BrainController.cs
Goal: The player gets one gentle notification when something on the farm is ripe.
Depends on: W20 merged.
Facts: Use the existing toast/tray notification path (`BrainController` shows tray balloon or Home toast: find the helper used by the care reminders). Condition: farm unlocked, at least one plot ripe or orchard stock > 0, setting `notifyHarvest` true (read from the settings feature state in the same way other settings are read; default true), at most once per local day, never while a fullscreen app hides the pet (use the same guard as the care reminders). Text: 'Something is ready on the farm!'.
Steps:
1. Add a check in the existing slow tick; remember the last notification date in memory and in `State.Stats.Counters` key `harvest_notice_day` (ordinal) so a restart the same day does not repeat it.

## Item W21-02: Settings: farm notifications and shortcut; register world features in index.json
Files of this item: web/home/features/settings/feature.js, web/home/features/index.json
Goal: The settings page has a switch for harvest notifications, and `web/home/features/index.json` registers the four world features (`rooms`, `garden`, `farm`, `market`) created in W20.
Depends on: W20 merged.
Facts: Settings are sent as `set_setting { key, value }` (read the file for the existing pattern and keys). Add the key `notifyHarvest` (bool) with the label 'Tell me when the farm is ready'. The C# side reading it is W21-01; the settings feature on the C# side (`SettingsFeature.cs`) is not in this wave: if it rejects unknown keys, record it in the PR for the next fix. Also register `"rooms"`, `"garden"`, `"farm"`, `"market"` in `web/home/features/index.json` so all four world features load in Home.
Steps:
1. Add the toggle with the same styling as the neighbours; default on.
2. Add `"rooms"`, `"garden"`, `"farm"`, `"market"` to `web/home/features/index.json`.

## Item W21-04: My Pigs: memory corner link and walk button
Files of this item: web/home/features/pigs/feature.js
Goal: My Pigs links to the garden's memory corner for pigs in memorial mode and offers a walk for the others.
Depends on: W20 merged.
Facts: For a pig with `memorial` true add a small link 'Visit the memory corner' that opens the garden feature (same navigation call the places bar uses, read `app.js`). For other pigs, when the garden is unlocked, a 'Go for a walk' button sending `walk { place: 'garden' }`. Text English, warm.
Steps:
1. Add both controls; hide them when the garden is locked.
