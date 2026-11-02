# Visual log

Log of waves V0-V8 (`docs/VISUAL_WAVES.md`), newest at the bottom.

## V0 Baseline (2026-11-02)
- `python tools/art/export.py <scratch>` reproduces all 8 committed `spritesheet.png` files pixel-identically (0 differing pixels).
- `node tools/qa/web-smoke.js`: OK (first run had one flaky `20_more_menu` click timeout on a detached element; second run clean).
- Environment limits (decision): this session is Linux without .NET and without Windows. `dotnet`, `tools/build.ps1`, `Cuy.exe --selftest` and desktop walk-throughs cannot run here (dotnet download is blocked by the proxy, 403). C# changes are written carefully but are unverified until the human runs `tools/build.ps1` on Windows; each wave lists what is unverified. Web checks run with `CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- `english_assets.py` needs the old Polish export (icons .ico, sounds, data) that is not in the repo, so sprite sheets are written by a new `tools/art/export_sprites.py` that reproduces the same file layout.
