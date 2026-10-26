# Task F6-00: Upgrade NAudio to 2.2.1 (packages, packaging, notices)

Read `AGENTS.md` first and follow it. Requires waves 0-5 merged. This task must be merged BEFORE F6-01 (dance to music).
Reason: `src/Cuy/Cuy.csproj` has `<PackageReference Include="NAudio" Version="1.8.4" />`; the per-session audio meters of F6-01 need NAudio 2.x
(NAudio 3.x is for .NET 9+ only, so 2.2.1 is the version for .NET Framework 4.8; licence MIT).

## Files you may change
`src/Cuy/Cuy.csproj`, `src/Cuy/app.config` (binding redirects only if the build output needs them), `src/Cuy/dotNet/SoundManager.cs`,
`src/Cuy/dotNet/Animations.cs`, `src/Cuy/dotNet/SelfTest.cs`, `src/Cuy/dotNet/EmbeddedAssembly.cs` (only if it breaks), `tools/package.ps1`,
`THIRD_PARTY_NOTICES.md`. No behaviour change.

## Specification
1. Packages (R11.3). Replace the `NAudio` 1.8.4 reference by `NAudio.WinMM` 2.2.1 and `NAudio.Wasapi` 2.2.1 (`NAudio.Core` arrives by itself). Before that run
   `grep -rn "AudioFileReader" src tools tests`: only if there is a hit, use the umbrella package `NAudio` 2.2.1 instead (it adds Asio, Midi and WinForms DLLs
   that Cuy does not need; today the grep finds none). The classes used today: `WaveOutEvent`, `WaveFileReader` (`SoundManager.cs`, `SelfTest.cs`) and `WaveOut` +
   `Mp3FileReader` (`Animations.cs`). The upgrade is source-compatible for the six audio classes (same namespaces, same public API; R11.1). Known behaviour
   changes: `WaveOutEvent.Volume` now reads the real device volume; `AudioFileReader` decodes MP3 through Media Foundation. Where
   `Mp3FileReader` lives in 2.2.1 (Core or WinMM) was not verified: if the build fails on it, say so in the PR and fix by the package that provides it; do not
   rewrite the audio code.
2. `tools/package.ps1`: the package must contain `NAudio.Core.dll`, `NAudio.WinMM.dll`, `NAudio.Wasapi.dll`. Check with the `bin\Release` output of a real build
   (robocopy copies the folder already, so add a check that fails the packaging if one of the three is missing) and whether `Microsoft.Win32.Registry.dll` is
   needed there and whether binding redirects are needed on net48 for the netstandard2.0 DLLs (both UNVERIFIED in R11.3: decide from the build output and a
   `--selftest` run of the packed copy, record what you found in the PR). Print the real DLL sizes.
3. `SelfTest.cs`: the existing WAV check still passes; add a check that the three NAudio DLLs load (`typeof(NAudio.Wave.WaveOutEvent).Assembly`,
   `typeof(NAudio.CoreAudioApi.MMDeviceEnumerator)`).
4. `THIRD_PARTY_NOTICES.md`: NAudio (MIT, Mark Heath, https://github.com/naudio/NAudio, version 2.2.1) replaces any older NAudio line.
5. Verify the embedded-assembly resolver in `Program.cs`/`EmbeddedAssembly.cs` still works (it was written for an embedded `NAudio.dll`): do not embed the new DLLs.

## Checks
`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; Core tests pass; `rg "1\.8\.4" src tools` finds no NAudio line.

## Gotowe pliki
None: no ready-made code (package change only). Facts: `DECYZJE.md` row "Audio (pakiety)"; research R11.1, R11.3.

## Testy ręczne (ZWERYFIKUJ NA PC)
- `TESTY_RECZNE.md` AUD-13: on Windows, a Release build + `tools/package.ps1` + `Cuy.exe --selftest` from the packed folder: wheek, purr and crunch still play; is
  `Microsoft.Win32.Registry.dll` needed; are binding redirects needed; real DLL sizes. Does the legacy `Mp3FileReader` code in `Animations.cs` still play?

When done, open a pull request against `main` titled `F6-00: NAudio 2.2.1`.
