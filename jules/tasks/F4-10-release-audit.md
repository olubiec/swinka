# Task F4-10: No developer options in the gift build (audit + guards)

Read `AGENTS.md` first and follow it. Requires waves 0-3 merged.

## Goal
The package for the player must contain no developer tools: no F9 brain overlay, no 60x clock, no diagnostics window,
no test panel in Home, no DevTools, no debug menu items. Some are already `#if DEBUG`; prove all of them are.

## Files you may change
`src/Cuy/dotNet/ContextMenus.cs`, `src/Cuy/dotNet/DebugOverlay.cs`, `src/Cuy/dotNet/FormDebug.cs`,
`src/Cuy/dotNet/Diagnostics.cs`, `src/Cuy/dotNet/HomeWindow.cs`, `src/Cuy/dotNet/Program.cs`, `src/Cuy/dotNet/SelfTest.cs`,
`web/home/app.js`, `web/home/index.html`, `tools/package.ps1`, `tools/qa/web-smoke.js`.

## Specification
1. Search the code for: `F9`, `DebugOverlay`, `FormDebug`, `Diagnostics`, `Clock`, `ScaledClock`, `--clock`, `--home`,
   `--selftest`, `OpenDevToolsWindow`, `AreDevToolsEnabled`, `btnDevTest`, `dev`. For each hit decide: release-safe or not.
2. Everything developer-only is wrapped in `#if DEBUG` (C#) or only exists when the page is opened in a normal browser
   (`!window.chrome?.webview`) for the mock mode. In WebView2 apply these settings right after `EnsureCoreWebView2Async` and BEFORE the first navigation (R7.1, Microsoft Learn):
   set to `false`: `AreDevToolsEnabled` (Release only; Debug may keep it true), `AreBrowserAcceleratorKeysEnabled`,
   `AreDefaultContextMenusEnabled`, `IsZoomControlEnabled`, `IsPinchZoomEnabled`, `IsSwipeNavigationEnabled`, `IsStatusBarEnabled`,
   `IsGeneralAutofillEnabled`. Put the settings introduced in newer SDK builds (pinch zoom, swipe navigation, general autofill,
   browser accelerator keys) each in its own try/catch (an older runtime may lack them) and log `[WebView2] setting X failed`.
   Password autosave is already off by default. Keep `AreDefaultScriptDialogsEnabled` at its default. Command-line flags `--clock`, `--peek-test`, `--economy` may stay
   in Release only if they cannot be reached from the UI and are listed in the README; `--clock` must be Debug-only.
3. `SelfTest.cs`: a Release-only check that scans the tray menu item texts and fails if any contains "Clock", "Debug",
   "Diagnostics", "Test".
4. `tools/package.ps1`: after packaging, list the ZIP entries and fail if any `*.pdb`, `*.md` (except `README.txt`),
   `jules/`, `tools/` or `tests/` path is inside. Keep the ZIP name `Cuy_v1.zip`.
5. Web smoke test: load Home with `window.chrome.webview` mocked and assert `#btnDevTest` is not visible.
6. PR description: a table of every developer feature found and how it is guarded.
7. Antivirus false positives (R4.4): the package must contain no packer or obfuscator; list in the PR every global hook
   (`SetWindowsHookEx`) and other injection-like call you find (best-evidenced triggers); do not remove features, report them.

## Checks
Release and Debug builds compile; smoke test passes.

## Gotowe pliki
None: no ready-made code exists for this task (settings list is in `DECYZJE.md`, row WebView2).

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` WV-02, WV-03): F12, Ctrl+scroll zoom, right click and Ctrl+P do nothing in the Release Home; on an
  old runtime the newer settings fail softly (logged, no crash).

When done, open a pull request against `main` titled `F4-10: Release has no developer options`.
