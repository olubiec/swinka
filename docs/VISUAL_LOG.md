# Visual log

Log of waves V0-V8 (`docs/VISUAL_WAVES.md`), newest at the bottom.

## V0 Baseline (2026-11-02)
- `python tools/art/export.py <scratch>` reproduces all 8 committed `spritesheet.png` files pixel-identically (0 differing pixels).
- `node tools/qa/web-smoke.js`: OK (first run had one flaky `20_more_menu` click timeout on a detached element; second run clean).
- Environment limits (decision): this session is Linux without .NET and without Windows. `dotnet`, `tools/build.ps1`, `Cuy.exe --selftest` and desktop walk-throughs cannot run here (dotnet download is blocked by the proxy, 403). C# changes are written carefully but are unverified until the human runs `tools/build.ps1` on Windows; each wave lists what is unverified. Web checks run with `CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- `english_assets.py` needs the old Polish export (icons .ico, sounds, data) that is not in the repo, so sprite sheets are written by a new `tools/art/export_sprites.py` that reproduces the same file layout.

## V1 Coats (2026-11-02)
- New coats in `tools/art/pig.py`: `tricolor` (ginger body, near-black rust patches/ears), `dutch` (dark chestnut), `albino` (cream-white, pale-pink patches, red eyes via `eyec()`), `cinnamon` (warm red-brown). Kept `agouti`, `czarno-biala` (palette id `black_white`), `kremowa` (`cream`); the last two exist so the companion sheets can be verified.
- `tools/art/palettes.py` writes `assets/sprites/palettes.json` (exact [from,to] pairs, orange+rust ramps and albino eye). Default palette `tricolor`; unknown ids fall back to it.
- Decision: dutch is a uniform chestnut body with the white band kept (a real dutch pattern would need a patch mask; out of scope per VISUAL_WAVES).
- `tools/art/verify_palettes.py`: 5 stages x 7 palettes, remap of ginger vs rendered: 0 differing pixels; remapped agouti/black_white/cream equal the committed companion sheets.
- JS `web/home/lib/palette.js` (`CuyPalette.apply`, cached) + Playwright `tools/qa/palette-test.js`: OK. C# `Palettes.cs`, `PaletteRemap.cs`, xUnit `PaletteTests.cs` written but NOT compiled here (no .NET in this session): to be confirmed by `tools/build.ps1` on Windows.

## V2 Senior and legend (2026-11-02)
- `pig.py` senior branch: lower sagging back (body height x0.93, head 1px lower), frosted back (cream checker strip along the top plus sparse speckles, faded rump patch), solid grey brows, larger grey cheek/muzzle area (side and front views), opaque white whiskers. Legend = senior plus the existing gold outline (still distinct).
- Metric (idle frame 0): adult vs senior differ in 39.7% of opaque pixels (target >= 4%); senior vs legend 12.7%. Reviewed contact sheets of idle, walk, popcorn, eat, sleep, sit, sleep_house at x3-x6.
- New `tools/art/export_sprites.py` (writes sheet, x2, json; baby re-export is byte-identical to the committed files) and `tools/art/check_sprites.py` (sizes, x2 equality, tables, empty frames, border clipping; `tools/qa/sprite-check.js` from W9-09 is not merged yet). All 8 variants pass; only prop animations (ball_push, house_*, tunnel_*, peek, sleep_house) clip by design, same as before.
- `verify_palettes.py` re-run on the new senior/legend: 0 differences.
