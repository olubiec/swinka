# Task F0-01: Convert src/Cuy/Cuy.csproj to an SDK-style project that also compiles on Linux

Read `AGENTS.md` first and follow it.

## Goal
Today only `src/Cuy.Core` and the tests build on Linux. The WinForms desktop app (`src/Cuy/Cuy.csproj`, old non-SDK
format with `packages.config`) builds only on Windows with Visual Studio MSBuild, so agents cannot check that their C#
changes compile. After this task:
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` succeeds on Linux with the .NET 9 SDK, and
- the human's Windows build `powershell -ExecutionPolicy Bypass -File tools/build.ps1` still produces a working
  `src/Cuy/bin/Debug/Cuy.exe` with `assets/` and `web/` copied next to it.
- New `.cs` files in `src/Cuy/` are compiled automatically (no `<Compile Include>` list to maintain).

## Files you may change
`src/Cuy/Cuy.csproj` (rewrite), `src/Cuy/packages.config` (delete), `src/Cuy/Properties/AssemblyInfo.cs` (only if needed),
`tools/build.ps1`, `tools/package.ps1`, `Cuy.sln` (only if the project GUID/type must change), `.gitignore`.

## Steps
1. Read the current `src/Cuy/Cuy.csproj` fully: note every `Compile`, `EmbeddedResource`, `Content`, `None`, `Reference`,
   `ProjectReference`, the custom target `CopyAssetsAndWeb`, `ApplicationIcon`, `ApplicationManifest`, `StartupObject`,
   `DefineConstants` (PORTABLE etc.), platform settings, and every package in `packages.config`.
2. Write a new SDK-style project:
   - `<Project Sdk="Microsoft.NET.Sdk">`, `TargetFramework` `net48`, `OutputType` `WinExe`, `UseWindowsForms` true,
     `RootNamespace` and `AssemblyName` `Cuy`, `LangVersion` latest, keep the same `DefineConstants` per configuration,
     `ApplicationIcon` `cuy.ico`, `ApplicationManifest` (keep the existing manifest path), `StartupObject` if set today.
   - `GenerateAssemblyInfo` false if `Properties/AssemblyInfo.cs` exists (avoid duplicate attributes).
   - `AppendTargetFrameworkToOutputPath` false so the output stays `src/Cuy/bin/<Config>/Cuy.exe` (tools and docs rely on it).
   - Package references (same versions as `packages.config`): Microsoft.Web.WebView2, NAudio, Newtonsoft.Json and the
     System.* packages that are really used. Add `Microsoft.NETFramework.ReferenceAssemblies` (1.0.3, PrivateAssets all)
     so net48 builds on Linux.
   - `ProjectReference` to `..\Cuy.Core\Cuy.Core.csproj`.
   - Keep `Resources\animations.xml` exactly as it is used today (it is read through `Properties.Resources.animations`
     from `Properties/Resources.resx`); keep `.resx` files as embedded resources with their `DependentUpon`.
   - Keep the `CopyAssetsAndWeb` after-build target (copies repo `assets/` and `web/` to the output folder).
   - Remove files that the old project excluded on purpose: if a `.cs` file exists on disk but was NOT in the old
     `<Compile>` list, add `<Compile Remove="..."/>` for it rather than deleting it, and list these files in the PR.
   - WebView2 for .NET Framework needs `WebView2Loader.dll`; make sure it still lands in the output on Windows
     (the package's targets do this; keep `WebView2LoaderPreference` default or set `Static` only if needed).
3. Delete `src/Cuy/packages.config`. Update `tools/build.ps1`: one `msbuild Cuy.sln /restore /p:Configuration=$Config`
   is enough for SDK-style projects (keep the vswhere lookup, keep running the Core tests afterwards). Make sure
   `tools/package.ps1` still finds `src/Cuy/bin/Release`.
4. Remove the `packages/` folder handling from `.gitignore` only if nothing uses it any more.

## Checks (must pass)
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` on Linux: 0 errors.
- `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`: all pass.
- The output folder contains `Cuy.exe`, `Cuy.Core.dll`, `Microsoft.Web.WebView2.*.dll`, `NAudio.dll`,
  `Newtonsoft.Json.dll`, `assets/` and `web/`.
- In the PR description: a short "Windows check for the human" list (run `tools/build.ps1`, start Cuy.exe, open Home).

When done, open a pull request against `main` titled `F0-01: SDK-style desktop project (builds on Linux)`.
