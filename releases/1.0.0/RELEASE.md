# Cuy 1.0.0 (gift build)

The first version handed out as a gift (`Cuy_v1.zip`, first build on 2026-10-15 at about 21:22 local time).

- Source commit: `9cb7466`. The desktop app, Home web files and `assets/` in the zip match this commit.
- Zip: `releases/1.0.0/Cuy_v1.zip`, SHA-256 `f3b9c7feb2d3277dec1d16fedd788777c614fdf1fc1ba975f95e82ad2516eb7e`.
- Contents: the Release build of `Cuy.exe` with its DLLs, `assets/`, `web/`, `README.txt` (from `tools/package/README.txt`), `THIRD_PARTY_NOTICES.md`.
- Build at that time: the old non-SDK `src/Cuy/Cuy.csproj` (before F0-01). The zip was made with the tools of that commit, so to rebuild it, check out `9cb7466` and run `tools/package.ps1` on Windows.

## Known gaps in 1.0.0 (fixed later on main, not in this zip)
- Work in progress from the Jules waves (F0 onwards) is on `main` only.
- Anything listed in `jules/PLAN.md` as wave 1 or later is not in this build.

## Updating a gift copy
Unzip the new version into the same folder and replace the files. The save is in `%AppData%\Cuy` and stays.
