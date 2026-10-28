# W4-08: Desktop speech bubble with a short text
Zmieniaj: src/Cuy/dotNet/StatusBubble.cs, src/Cuy/dotNet/FormPet.cs
Wymagane: src/Cuy/dotNet/StatusBubble.cs, src/Cuy/dotNet/FormPet.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Nie ruszaj: src/Cuy/dotNet/BrainController.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Any desktop code can show a short message above the pig ("Happy birthday!", "Achievement: ...") without touching the needs bubble.
Depends on: nothing from earlier waves. `FormPet.ShowStatusBubble()` / `HideStatusBubble()` exist and use `StatusBubble.ShowBubble()` / `HideBubble()` (the needs bubble). W6-01 and W6-05 will call the new method.
Steps:
1. `StatusBubble.ShowMessage(string text, int durationMs)`: draws a small speech bubble with the text in the existing look and font, positioned above the pig like the needs bubble, hides itself after `durationMs`. If the needs bubble is open, the message replaces it and the needs bubble returns after the message. Messages that arrive while one is shown wait in a queue (at most 3, the oldest dropped).
2. `FormPet.ShowStatusMessage(string text, int durationMs = 3000)`: thread-safe like `ShowStatusBubble` (`BeginInvoke` when needed, try/catch with a `[WARN]` log), creates the bubble if needed and calls `ShowMessage`. Text is clipped to 60 characters.
3. Log each message as `[Bubble] <text>`. Nothing calls the new method yet.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": none yet (a later task calls it)..
