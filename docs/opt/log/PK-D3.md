Status: DONE
Decisions: DesktopPropsOverlay (namespace Cuy) uses WS_EX_TOOLWINDOW | WS_EX_TOPMOST | WS_EX_NOACTIVATE | WS_EX_TRANSPARENT | WS_EX_LAYERED, TransparencyKey=Color.Magenta, ShowWithoutActivation=true, and renders in Screen.PrimaryScreen.WorkingArea.
Decisions: DPI scale uses Math.Max(1, (int)Math.Round(DeviceDpi / 96.0) * 2) with NearestNeighbor interpolation; missing PNGs fall back to #E6B073 16*scale rectangle; SystemEvents.DisplaySettingsChanged unsubscribed in Dispose.
API: DesktopPropView (Uid, ItemId, SpritePath, X, Y), DesktopPropsOverlay (Show, Hide, Update).
Docs: docs/qa/DESKTOP_PROPS_MANUAL.md (8 Windows manual QA steps).
Stubs: None.
Build: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true succeeded (0 warnings, 0 errors).
