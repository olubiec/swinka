# W7-04: Audit: no developer options in the gift build
Zmieniaj: src/Cuy/dotNet/ContextMenus.cs, src/Cuy/dotNet/Program.cs, src/Cuy/dotNet/FormPet.cs, src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/DebugOverlay.cs, src/Cuy/dotNet/FormDebug.cs, src/Cuy/dotNet/Diagnostics.cs
Wymagane: src/Cuy/dotNet/ContextMenus.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true; dotnet build src/Cuy/Cuy.csproj -c Debug -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/dotNet/HomeWindow.cs, src/Cuy/dotNet/SelfTest.cs, web/home/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The Release build contains no F9 overlay, no time multiplier, no diagnostics window and no debug menu items; both Debug and Release still compile.
Depends on: W4-05 (WebView2 settings) merged. Most guards exist already (`#if DEBUG` in `BrainController`, `FormPet`, `ContextMenus`, `Program`, `Diagnostics`).
Facts: Search terms: `F9`, `DebugOverlay`, `FormDebug`, `Diagnostics`, `Clock`, `ScaledClock`, `--clock`, `--home`, `--selftest`, `--peek-test`, `btnDevTest`, `OpenDevToolsWindow`. The Home page already hides `#btnDevTest` inside WebView2 (`app.js`); W8-02 asserts it in the smoke test and W8-01 checks the Release tray menu in the self-test, so do not touch those here.
Steps:
1. For each hit decide: release-safe or not. Everything developer-only is wrapped in `#if DEBUG`; `--clock` must be Debug-only; `--selftest` stays (it is documented for the tester); `--home` and `--peek-test` may stay in Release only if no menu item or UI reaches them (list them in the PR; `EdgePeekDirector.cs` and `README.md` are out of scope here).
2. Fix only what is not guarded (smallest change). If a hit lives in a file outside "Zmieniaj", list it in the PR instead of editing it.
3. Antivirus hygiene: list in the PR every `SetWindowsHookEx` or other global hook and injection-like call you find; do not remove features, only report.
4. PR description: a table of every developer feature found, its file, and how it is guarded (or why it is release-safe).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
