# PK-FX1: Hotfixes: house icon roof, remove old Home logo, and fix take_out crash/restart
Zmieniaj: src/Cuy/dotNet/StatusBubble.cs, src/Cuy/dotNet/ContextMenus.cs, web/home/index.html, src/Cuy/dotNet/FormPet.cs, docs/opt/log/PK-FX1.md
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Fix three owner-reported regressions before/alongside Wave 4: (1) upright house icon in StatusBubble and ContextMenus, (2) remove the old pig-head logo from Home header, and (3) fix the `ArgumentException` crash/restart when dragging a pig out of Home (`take_out`).

Depends on: none (runs in F4-1).

## Steps
1. **House icon (`StatusBubble.cs`, `ContextMenus.cs`)**: Replace `"place_house"` (which has an upside-down roof in `icons_16.png`) with `"house"` in `StatusBubble.cs` (`_rcBtnHome`) and `ContextMenus.cs` (`homeMenuItem.Image`).
2. **Remove old logo from Home (`web/home/index.html`)**: Remove `<span class="pixel-icon icon-pig-head" aria-hidden="true"></span>` from `.game-header .header-left` so only the `CUY'S HOME` title remains.
3. **Fix `take_out` crash/restart (`FormPet.cs`)**:
   - In `FormPet.ReplaceSprites`, do NOT `Dispose()` bitmaps in `flippedSprites`/`normalSprites` because `Xml.BuildStageSprites` and `Xml.BuildNamedPigSprites` return shared cached `Bitmap[]` instances.
   - Before replacing `normalSprites`/`flippedSprites`, ensure `pictureBox1.Image` is safely updated (or temporarily cleared and immediately set to a valid frame from the new `normalSprites`/`flippedSprites`) so `PictureBox.Animate` in `OnVisibleChanged` (triggered by `LeaveHome`) never touches a disposed `Bitmap`.
4. Run `Weryfikacja` and fix any compile errors until green.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-FX1.md` (max 10 lines: decisions, exact fixes, manual Windows check notes). Do not run git.
