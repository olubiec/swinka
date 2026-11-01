# W4-02: Spritesheet loader for stage looks
Zmieniaj: src/Cuy/dotNet/Graphics/SpriteSheetLoader.cs, src/Cuy/dotNet/SelfTest.cs
Wymagane: src/Cuy/dotNet/Graphics/SpriteSheetLoader.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/dotNet/FormPet.cs, src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/Xml.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The desktop app can cut single frames out of a stage spritesheet PNG and reports clearly when the sheet is missing. W5-03 uses this loader for the hot-swap.
Depends on: nothing from this wave. W3-02 added a check to `SelfTest.cs` (keep it).
Facts: Sheets live at `assets/sprites/<baby|junior|adult|senior|legend>/spritesheet.png`, 16 columns, frame index = row * 16 + col, frame size read from `assets/sprites/<stage>/frames.json` when it exists, else 64x64. `Xml.UseExternalSheet` already swaps the embedded sheet once at start; do not touch it here.
Steps:
1. `SpriteSheetLoader`: `static Bitmap[] Load(string stage)` returns the frames (cached per stage, thread-safe), or null and logs `[Stage] sheet missing: <stage>` once per stage when the file is absent or unreadable. `static Bitmap GetFrame(string stage, int index)` returns null for a missing sheet or an out-of-range index and never throws. `static Size FrameSize(string stage)`. Frames are cloned out of the sheet and the sheet file is not left locked (load through a `MemoryStream`). Create the `Graphics` folder if it does not exist; if a similar folder exists use it and say so.
2. `SelfTest.cs`: add the check `spritesheet` right after the existing checks of sprite sheets: loading a stage with no sheet returns null and does not throw; for each of the five stages that has a sheet in `assets/sprites`, `Load` returns frames and frame 0 is not null.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": `Cuy.exe --selftest` shows the `spritesheet` check as PASS..
