# W4-03: Licence notices for music, Twemoji, packages and tools, with a gate test
Zmieniaj: THIRD_PARTY_NOTICES.md, tests/Cuy.Core.Tests/NoticesTests.cs
Wymagane: THIRD_PARTY_NOTICES.md, tests/Cuy.Core.Tests/NoticesTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Nie ruszaj: assets/LICENSES/*, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: `THIRD_PARTY_NOTICES.md` names every shipped third-party thing, and a test fails when a NuGet package is missing from it.
Depends on: W3-07 (ZzFX notice) merged; sections 1-13 already exist.
Facts: Sections 1-13 exist (eSheep, Phaser, Newtonsoft.Json, WebView2, Pixelify Sans, sound effects, NAudio, Open-Meteo, Tracery, ZzFX, Chromium, Velopack, conditional items). There is no section for the music or Twemoji. `assets/LICENSES/music.md` and `assets/LICENSES/twemoji.md` hold the exact titles, authors, licences and URLs. This task adds NO package; validation is hand-written.
Steps:
1. Keep sections 1-13 unchanged. Append `## 14. Music`: copy every title, author, licence and URL from `assets/LICENSES/music.md` exactly.
2. Append `## 15. Twemoji`: the attribution line and version from `assets/LICENSES/twemoji.md` (CC-BY 4.0, link https://creativecommons.org/licenses/by/4.0/).
3. Append `## 16. Microsoft .NET compatibility packages`: one table with EVERY `PackageReference` in `src/Cuy/Cuy.csproj` and `src/Cuy.Core/Cuy.Core.csproj` that is not already named in sections 1-13 (columns: package id, version, licence, project URL). Get the licence from the local NuGet cache after `dotnet restore`: `~/.nuget/packages/<lowercase id>/<version>/<id>.nuspec` (`<license type="expression">` or `<licenseUrl>`). Copy what the nuspec says. If a nuspec is missing, write `see https://www.nuget.org/packages/<id>/<version>` and list the package in the PR. `Microsoft.NETFramework.ReferenceAssemblies` is build-time only: say so.
4. Append `## 17. Development tools (not shipped)`: Playwright (`tools/qa`; licence from `tools/qa/node_modules/playwright/LICENSE` after `npm --prefix tools/qa ci`) and the xUnit, coverlet and Test SDK packages of `tests/Cuy.Core.Tests` (licences from their nuspec files).
5. `NoticesTests.cs` (xUnit, net9.0): find the repo root by walking up from `AppContext.BaseDirectory` to the folder with `Cuy.sln` (the `RepoFile` helper if it exists), read all `<PackageReference Include="...">` ids from the two csproj files with a regex, assert each id appears in `THIRD_PARTY_NOTICES.md` (ordinal, case-insensitive). On failure list the missing ids in the message.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
