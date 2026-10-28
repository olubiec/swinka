# W4-05: WebView2: friendly missing-runtime message and Release settings
Zmieniaj: src/Cuy/dotNet/HomeWindow.cs
Wymagane: src/Cuy/dotNet/HomeWindow.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Nie ruszaj: src/Cuy/dotNet/Features/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: A PC without the WebView2 runtime gets a clear message and keeps a working desktop pig; the Release Home has no browser features a player could trip over.
Depends on: nothing from earlier waves. Today `SetupWebViewAsync` catches `WebView2RuntimeNotFoundException` only around `CoreWebView2Environment.CreateAsync`, sets `HomeWindow.WebView2Missing`, hides the form and shows `WebView2MissingMessage` (a `go.microsoft.com/fwlink` short link). `IsStatusBarEnabled=false`, `AreDefaultContextMenusEnabled=false` and `AreDevToolsEnabled` (true only in DEBUG) are already set.
Steps:
1. Replace the text of `WebView2MissingMessage` with a friendly English message that points to `https://developer.microsoft.com/microsoft-edge/webview2/` ("choose Evergreen"). No short link, no silent installer.
2. Put `await _webView.EnsureCoreWebView2Async(env)` inside the same `try` as `CreateAsync`, so the same catch handles a missing runtime wherever it throws. Log `[WebView2] runtime missing` in both paths. Nothing else in the method is restructured; the desktop pig keeps working.
3. Right after `EnsureCoreWebView2Async` and BEFORE the first navigation set to `false`: `AreBrowserAcceleratorKeysEnabled` (Release only; Debug may keep true), `IsZoomControlEnabled`, `IsPinchZoomEnabled`, `IsSwipeNavigationEnabled`, `IsGeneralAutofillEnabled`. Put each in its own try/catch (an older runtime may lack it) and log `[WebView2] setting <name> failed`. Keep `AreDefaultScriptDialogsEnabled` at its default.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": F12, Ctrl+scroll zoom, right click and Ctrl+P do nothing in the Release Home (TESTY_RECZNE.md WV-02, WV-03)..
