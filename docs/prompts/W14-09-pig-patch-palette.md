# W14-09: Patch2 color from NamedPigCatalog in PigPalette and PixelArtGenerator
Zmieniaj: src/Cuy/dotNet/Sprite/PigPalette.cs, src/Cuy/dotNet/Sprite/PixelArtGenerator.cs
Wymagane: src/Cuy/dotNet/Sprite/PigPalette.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: Support secondary patch color (Patch2) from NamedPigCatalog in PigPalette and PixelArtGenerator for named pigs with patched or tricolor patterns.
Depends on: W11 merged (NamedPigCatalog, NamedPigDefinition in Cuy.Core).
Facts: G2 from docs/PLAN.md requires desktop sprite generation for named pigs with secondary patch regions. In `PigPalette`, add optional `Color? Patch2` (or secondary patch color from `NamedPigDef.Palette.Patch2` when the pig has pattern `"patched"` or `"tricolor"` / non-empty `Patch2`). In `PixelArtGenerator`, use `Patch2` (when present, else falling back to `Patch` or base coat) for the second patch region when generating desktop sprites for named pigs.
Steps:
1. In `src/Cuy/dotNet/Sprite/PigPalette.cs`: add optional `public Color? Patch2 { get; set; }` (or secondary patch color property), loaded/mapped from `NamedPigDef.Palette.Patch2` or `NamedPigCatalog`.
2. In `src/Cuy/dotNet/Sprite/PixelArtGenerator.cs`: use `Patch2` for the second patch region when generating desktop sprites for named pigs with pattern `"patched"` or `"tricolor"` / non-empty `Patch2`.
3. Verify compilation: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
