# W29-07: Desktop: draw the props from the saved state
Zmieniaj: src/Cuy/dotNet/DesktopPropsOverlay.cs
Wymagane: src/Cuy/dotNet/DesktopPropsOverlay.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: Props stand on the desktop where the player left them, stay while Home is open and can be dragged.
Depends on: W28 merged (read `docs/DESKTOP_PROPS.md`). Sub-wave W29d: start only after W29-04 is merged (this task uses their code).
Facts: Follow the audit. If toys are already real windows or sprites on the desktop, reuse that mechanism and only read positions from `Pet.Props().Desktop` (fractions of the work area); if they are only pig animations, add a click-through overlay form per prop (transparent, topmost, no taskbar entry, ignores input except for drag of the small prop itself) drawn from `assets/world/<place>/<prop item>.png` (atlas `assets/world/atlas.json`) with a fallback glyph. The overlay is created and destroyed from the state (`props.desktop`), survives Home open/close (it must not be tied to the Home window), and a drag end calls `Pet.MoveOnDesktop`. Dragging a prop over the open Home window's room area is not handled here (the page does it, W29-08). Keep the existing toy actions working. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the class and one call from the place the audit names (list it in the PR); do not edit other files, so if a call site is needed elsewhere, expose a public `Sync(IList<...>)` method and describe the missing call in the PR.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
