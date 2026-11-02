# W21-02: Settings: farm notifications and shortcut
Zmieniaj: web/home/features/settings/feature.js
Wymagane: web/home/features/settings/feature.js
Weryfikacja: node --check web/home/features/settings/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, src/Cuy/*
Goal: The settings page has a switch for harvest notifications.
Depends on: W20 merged.
Facts: Settings are sent as `set_setting { key, value }` (read the file for the existing pattern and keys). Add the key `notifyHarvest` (bool) with the label 'Tell me when the farm is ready'. The C# side reading it is W21-01; the settings feature on the C# side (`SettingsFeature.cs`) is not in this wave: if it rejects unknown keys, record it in the PR for the next fix. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the toggle with the same styling as the neighbours; default on.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
