# W21-01: Desktop: 'harvest ready' notification once a day
Zmieniaj: src/Cuy/dotNet/BrainController.cs
Wymagane: src/Cuy/dotNet/BrainController.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The player gets one gentle notification when something on the farm is ripe.
Depends on: W20 merged.
Facts: Use the existing toast/tray notification path (`BrainController` shows tray balloon or Home toast: find the helper used by the care reminders). Condition: farm unlocked, at least one plot ripe or orchard stock > 0, setting `notifyHarvest` true (read from the settings feature state in the same way other settings are read; default true), at most once per local day, never while a fullscreen app hides the pet (use the same guard as the care reminders). Text: 'Something is ready on the farm!'. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add a check in the existing slow tick; remember the last notification date in memory and in `State.Stats.Counters` key `harvest_notice_day` (ordinal) so a restart the same day does not repeat it.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
