# PK-31b log (W31-02: new app icon and favicon)
- Step 1: src/Cuy/cuy.ico replaced by a shell cp of assets/app-icon/cuy.ico (byte-identical, 17278 bytes).
- Step 2: ProcessIcon.cs tray icon now comes from LoadAppIcon() = Icon.ExtractAssociatedIcon(Application.ExecutablePath), i.e. the exe icon from ApplicationIcon=cuy.ico; falls back to PetIcons.GetTrayIcon(). Menu logic untouched. Reason: PetIcons.cs is outside Zmieniaj, so GetTrayIcon was not changed.
- Cuy.csproj already had ApplicationIcon cuy.ico; no change needed.
- Step 3: web/home/index.html got two link rel="icon" tags (32x32 and 16x16) pointing to ../../assets/app-icon/.
- Step 4: build Release succeeded, 0 warnings, 0 errors.
- Core tests: 998 passed, 4 failed, all known (GameSessionWorldTests.Open_OldSave..., WorldAssetsTests x2, PigRoomsMigrationTests). No new failures.
- Undone: nothing. Not verified visually (no Windows run). Files CRLF/BOM: none present in the edited files (ASCII/UTF-8 text, no CRLF).
