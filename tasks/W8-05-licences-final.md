# W8-05: Licence notices final pass
Zmieniaj: THIRD_PARTY_NOTICES.md, assets/LICENSES/
Wymagane: THIRD_PARTY_NOTICES.md
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, tests/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Every third-party thing that ships has a notice and a licence file; nothing is claimed that does not ship.
Depends on: W4-03 (sections 14-17 and `NoticesTests`) merged.
Steps:
1. List what actually ships: `assets/music`, `assets/sounds`, `assets/coloring`, Twemoji icons, Pixelify Sans, Phaser (`web/home/minigames/lib`), ZzFX (`web/home/lib/zzfx.min.js`), NAudio, Newtonsoft.Json, WebView2 SDK, eSheep-derived code, Tracery-style grammar (own implementation). For each, check that `THIRD_PARTY_NOTICES.md` has a section with licence name and source URL, and that `assets/LICENSES/` holds the licence text or attribution file.
2. Add what is missing (copy licence text from the package or repository you already have locally, e.g. `tools/qa/node_modules`, the NuGet cache, or the vendored file headers; never invent a licence). Sections for things that do not ship today (weather, Velopack, companion code) stay marked "only if used" or are removed.
3. `NoticesTests` must still pass; if a new package id appears, the test already covers it.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
