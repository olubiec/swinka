# W-UPD-01: GitHub Releases version checker and SemVer comparator
Goal: Background service that queries GitHub Releases latest API and compares versions without external dependencies.
Zmieniaj: src/Cuy.Core/Platform/UpdateChecker.cs, tests/Cuy.Core.Tests/UpdateCheckerTests.cs
Wymagane: src/Cuy.Core/Platform/UpdateChecker.cs, tests/Cuy.Core.Tests/UpdateCheckerTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release; dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Rules: No new NuGet packages. Use HttpClient and Newtonsoft.Json already in project.
Steps:
1. Create `UpdateInfo`: `string Version`, `string DownloadUrl`, `string ReleaseNotes`, `bool IsNewer`.
2. Implement `UpdateChecker`:
   - `CheckForUpdateAsync(string currentVersion, string repo = "olubiec/swinka")`:
     - Queries `https://api.github.com/repos/olubiec/swinka/releases/latest` with User-Agent `Cuy-Pet`.
     - Compares semver `tag_name` (e.g. `v1.2.0` vs current `1.0.0`).
     - Finds the zip release asset URL.
   - `IsNewerVersion(string currentVersion, string latestVersion)`: pure static semver comparison function.
3. Cache check results for 4 hours to avoid hitting GitHub API rate limits.
4. Write unit tests in `UpdateCheckerTests.cs` verifying version comparison (v1.2.0 > 1.1.9, v1.0.0 == 1.0.0, ignores 'v' prefix, prerelease handling).
