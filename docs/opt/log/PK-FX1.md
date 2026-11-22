# PK-FX1
- Replaced `"place_house"` with `"house"` in `StatusBubble.cs` (`_rcBtnHome`) and `ContextMenus.cs` (`homeMenuItem.Image`).
- Removed `<span class="pixel-icon icon-pig-head" aria-hidden="true"></span>` from `.game-header .header-left` in `web/home/index.html`.
- In `FormPet.ReplaceSprites`, removed `Dispose()` calls on `flippedSprites.Values` and `normalSprites.Values` (shared cached `Bitmap[]` instances from `Xml`).
- Cleared `pictureBox1.Image = null` before clearing sprite collections and immediately assigned `GetSprite(CurrentAnimation.Sequence.Frames[0])` (or `GetSprite(0)`) after `imageList1.Images.AddRange(arr)`.
- Verified: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passed (0 warnings, 0 errors).
- Manual Windows check: open desktop pet, verify upright house icon in status bubble and tray context menu, open Home and verify no pig-head icon in header, drag pig out of Home (`take_out`) without `ArgumentException`.
