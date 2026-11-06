# PK-P1d: Speech bubble hides with the pig (package, wave P1)
Zmieniaj: src/Cuy/dotNet/FormPet.cs, src/Cuy/dotNet/StatusBubble.cs, docs/opt/log/PK-P1d.md
Wymagane: src/Cuy/dotNet/FormPet.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: When Home (the house window) opens, the pig leaves the desktop (`HomeWindow.OnVisibleChanged` calls `pet.EnterHome()`); the speech bubble (`StatusBubble`, a separate topmost form owned by `FormPet`) can stay on screen with nobody under it. Hide it whenever the pig is hidden, and never show it while the pig is in the house.
Depends on: nothing (C# only, WinForms cannot be run on Linux: the build is the check; a Windows scenario is in PK-P1q).

## Steps
1. Read `FormPet.EnterHome`, `LeaveHome`, `ShowStatusMessage` (~line 600-645), `ShowStatusBubble`/`HideStatusBubble` (~648-668) and `StatusBubble.ShowMessage/ShowBubble/HideBubble` and its timers. Find every path where the pig becomes invisible or goes into the house: `EnterHome`, EdgePeek (`pet.Visible = false` in `EdgePeekDirector.cs` is NOT in scope: only call the new method there if you can do it inside `FormPet`, e.g. by overriding `OnVisibleChanged`).
2. In `FormPet`: add a private field `_inHome` (set in `EnterHome`, cleared in `LeaveHome`). `EnterHome` calls `HideStatusBubble()` and also cancels the bubble's pending timers (add `StatusBubble.Cancel()` if `HideBubble` does not stop the auto-hide timer and queued messages). `ShowStatusMessage` and `ShowStatusBubble` return immediately (log `[Bubble] skipped, pig is in the house`) while `_inHome` or `!Visible`. Also override `OnVisibleChanged`: when the pig turns invisible, hide the bubble.
3. In `StatusBubble`: if it follows the pig with a timer, stop following and hide when the owner is invisible or disposed.
4. `LeaveHome` must not re-show an old bubble; a message queued while in the house is dropped, not replayed.
5. Build once (the line above). Log (max 10 lines): the paths you found, what you changed.
Prohibited: changing behaviour of the pig walking/AI, new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P1d.md` (max 10 lines). Do not run git.
