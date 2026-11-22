# PK-CS3 log
- Registration: `Program.cs` calls `HomeFeatures.LoadAll()` (reflection); `RunFeature` and `PropsFeature` are already auto-loaded/ticked/routed, so `HomeWindow.cs` needed no edits.
- Overlay wiring (`Program.cs`): after `_uiInvoker` handle creation, subscribed `PropsFeature.PropsChanged` (marshaled via `RunOnUiThread` when `InvokeRequired`), lazily creates `DesktopPropsOverlay` only when `props.Count > 0`, maps `DesktopProp` -> `DesktopPropView` (`SpritePath = DesktopPropCatalog.Current.Find(p.ItemId)?.Sprite`), and calls `propsOverlay.Update(views)`.
- Initial sync: called `syncPropsOverlay(propsFeature.CurrentProps)` at startup; guards with `appExiting` flag.
- Cleanup: on `Application.ApplicationExit`, unsubscribes `PropsChanged`, calls `Hide()` and `Dispose()` on `DesktopPropsOverlay` (display settings unhooked inside `DesktopPropsOverlay.Dispose`).
- Verification: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passed (0 warnings, 0 errors).
- Manual checks on Windows: place/move/remove a desktop prop via `PropsFeature`, verify `DesktopPropsOverlay` appears/updates/hides, change display resolution/DPI, and exit app cleanly without WinForms handle errors.
