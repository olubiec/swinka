# PK-P1d: Speech bubble hides with the pig
- Status: OK
- Paths found: EnterHome (Visible=false), EdgePeekDirector (Visible=false), handled centrally via FormPet.OnVisibleChanged.
- FormPet: OnVisibleChanged cancels/hides bubble; EnterHome & LeaveHome cancel pending bubble; ShowStatusMessage & ShowStatusBubble skip while _inHome or !Visible.
- StatusBubble: added Cancel() to stop timers, clear queue, and hide; OnUpdateTimerTick, ShowMessage, ShowBubble, OnMessageTimerTick stop and hide if owner is invisible or in home.
- Tests/Verification: dotnet build src/Cuy/Cuy.csproj (0 errors, 0 warnings); web-smoke.js (WEB SMOKE OK).
