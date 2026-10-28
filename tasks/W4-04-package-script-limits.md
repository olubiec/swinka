# W4-04: Package script: size limit, forbidden paths, player README
Zmieniaj: tools/package.ps1, tools/package/README.txt
Wymagane: tools/package.ps1, tools/package/README.txt
Weryfikacja: tools/package.ps1 parses (pwsh Parser::ParseFile when pwsh is installed; otherwise say in the PR that it was reviewed by eye)
Nie ruszaj: src/*, THIRD_PARTY_NOTICES.md, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The package script refuses a bloated or unsafe ZIP, and the player README explains the finished features.
Depends on: nothing from earlier waves. `package.ps1` today copies the Release build, `assets`, `web`, `README.txt`, `THIRD_PARTY_NOTICES.md`, runs `--selftest`, zips to `dist/Cuy_v1.zip`, and has no size limit. The released ZIP (`releases/1.0.0`) is 4.8 MB; `assets` is 15 MB.
Steps:
1. After zipping print the size in MB and stop with `PACKAGE STOPPED: zip larger than 80 MB` (exit 1) when it is above 80 MB.
2. Before zipping stop with a clear message if `assets\LICENSES` or `THIRD_PARTY_NOTICES.md` is missing in the package folder, or if `Cuy.exe`, `Newtonsoft.Json.dll`, `NAudio.dll`, `assets` or `web` is missing.
3. After zipping list the ZIP entries (`System.IO.Compression.ZipFile`) and stop (exit 1) when any entry is a `.pdb`, `.cs`, `.csproj` or `.sln`, or lies under a top-level `jules/`, `tools/`, `tests/`, `tasks/`, `docs/` or `research/` folder. `.md` files are allowed (`THIRD_PARTY_NOTICES.md`, `assets/LICENSES/*`). Keep the ZIP name `Cuy_v1.zip`.
4. `tools/package/README.txt` (player text, English, short, keep existing sections): add one line each for care calendar reminders (Done / Later), the vet clinic, colouring, shop and decorations, the daily gift, and settings (music, pig size, sound). Add: Cuy needs the Microsoft Edge WebView2 runtime (Windows 11 has it, most Windows 10 PCs have it, otherwise https://developer.microsoft.com/microsoft-edge/webview2/ "Evergreen"), and the Smart App Control sentence copied from `README.md` with its hedged wording.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
