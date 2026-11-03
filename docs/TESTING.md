# Cuy: Automated Testing Guide

This document describes all **automated tests** and automated verification checks in the Cuy repository.

> [!NOTE]
> For manual Windows desktop testing, hardware/OS integration tests (audio session monitoring, fullscreen detection, taskbar docking, Velopack installer, pre-gift checklist), see [docs/TESTY_RECZNE.md](TESTY_RECZNE.md).

---

## 1. Overview and Testing Philosophy

Cuy uses automated tests for fast, deterministic feedback in continuous integration (CI) and local development. Because the desktop client (`Cuy.exe`) is a Windows Forms application that requires the Windows Desktop runtime and interactive shell, the project separates concerns:

- **Automated Tests (This Document)**: Game logic, simulation determinism, economy invariants, save persistence/migration, web UI layout, static asset integrity, and build checks. These run headlessly on Linux / Ubuntu CI and developer machines.
- **Manual Windows Tests ([docs/TESTY_RECZNE.md](TESTY_RECZNE.md))**: Taskbar pet behavior, mouse tracking, audio capture sessions, fullscreen detection, multi-monitor behavior, and pre-release acceptance.

---

## 2. Test Suites

### 2.1 Core Unit & Integration Tests (`Cuy.Core.Tests`)
- **Path**: `tests/Cuy.Core.Tests/`
- **Target**: .NET 9 SDK (`net9.0`), testing the .NET Standard 2.0 `Cuy.Core` library.
- **Framework**: xUnit.
- **Execution Command**:
  ```bash
  dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
  ```
- **What it covers**:
  - **Pet & Needs Simulation**: `NeedsDecayTests`, `PoopAndCleanlinessTests`, `OfflineRulesTests`, `AwayTests`.
  - **Economy & Balance**: `EconomyTests`, `BondRewardTests`, `BondUnlockTests`, `MinigameRewardTests`.
  - **Care & Health**: `HealthSystemTests`, `HealthCalculationTests`, `CareScheduleTests`, `CareInputTests`, `CareDataTests`, `StageCareTests`.
  - **Brain / Utility AI**: `BrainTests`, `BrainForceActionTests`, `BrainPerfTests` (decision loop performance).
  - **Save & Migrations**: `SaveLoadTests`, `SaveCompatTests`, `SaveMigrationTests`, `SaveResetTests`, `CorruptSaveBackupTests`, `PigSaveTests`.
  - **Data Catalog & Contracts**: `NoPolishIdsTests` (ensures canonical English IDs), `DataValidationTests`, `ItemCatalogMultiFileTests`, `StageItemsDataTests`.
  - **Features**: `AchievementTests`, `BirthdayTests`, `ColoringTests`, `DiaryWriterTests`, `DiaryTemplatesTests`, `TricksTests`, `NoticesTests`.
- **Determinism Rules**:
  - Time is injected via `IClock` (`ManualClock` in tests).
  - Randomness is injected via `System.Random`.
  - Tables from `assets/data/*.json` are loaded via file helpers (`RepoFile`) and injected into `Pet` instances rather than mutating static globals.

### 2.2 Desktop App Compilation Check (Linux/CI)
- **Path**: `src/Cuy/Cuy.csproj`
- **Execution Command**:
  ```bash
  dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
  ```
- **What it covers**:
  - Validates that the C# WinForms application compiles cleanly without syntax or reference errors in cross-platform CI environments.

### 2.3 Web & Frontend Checks
- **Path**: `web/home/` and `tools/qa/`
- **Execution Commands**:
  - **JavaScript syntax check**:
    ```bash
    # Check specific file
    node --check <file.js>

    # Check all web JS files (excluding third-party libraries)
    find web -name '*.js' -not -path '*/lib/*' -print0 | xargs -0 -n1 node --check
    ```
  - **JSON syntax check**:
    ```bash
    find assets web -name '*.json' -print0 | xargs -0 -n1 node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))'
    ```
  - **Consistency scripts**:
    ```bash
    node tools/qa/check-css-vars.js    # Verifies CSS variables usage in web/home
    node tools/qa/check-icons.js       # Verifies icon IDs match assets/icons/icons.json
    node tools/qa/data-check.js        # Validates data tables consistency
    ```

### 2.4 Headless Smoke Tests (Playwright)
- **Path**: `tools/qa/`
- **Setup**:
  ```bash
  bash setup.sh
  # Or manually:
  npm --prefix tools/qa ci
  npx --prefix tools/qa playwright install --with-deps chromium
  ```
- **Execution Commands**:
  - **Layout Self-Test**:
    ```bash
    node tools/qa/lib/layout.selftest.js
    ```
  - **Home Web Smoke Test**:
    ```bash
    node tools/qa/web-smoke.js
    ```
- **What it covers**:
  - Runs headless Chromium to test the WebView2 Home application in mock mode.
  - Verifies DOM structure, bridge messaging, layout consistency across tabs and minigames, and ensures no uncaught console errors or broken styles.

### 2.5 In-App Desktop Self-Test
- **Target**: `src/Cuy/bin/Release/Cuy.exe` (runnable on Windows)
- **Execution Command**:
  ```cmd
  Cuy.exe --selftest
  ```
- **What it covers**:
  - Self-tests bundled sprite sheets, palettes, notices, and embedded configurations. Exits with return code 0 on all PASS.

---

## 3. Continuous Integration (CI) Workflow

The automated checks are configured in `.github/workflows/ci.yml` and run on every pull request and push to `main`:

| CI Job | Steps Executed | Environment |
| --- | --- | --- |
| `core-tests` | `dotnet test tests/Cuy.Core.Tests/...` <br> `dotnet build src/Cuy/Cuy.csproj -p:EnableWindowsTargeting=true` | `ubuntu-latest` (.NET 9 SDK) |
| `web` | `node --check` (JS syntax) <br> JSON parsing check <br> `layout.selftest.js` <br> `web-smoke.js` (Playwright headless) | `ubuntu-latest` (Node.js 22) |

---

## 4. Local Quick-Start

To run the complete automated test suite locally:

```bash
# 1. Run Core unit tests
dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release

# 2. Check desktop app build
dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true

# 3. Lint web scripts
find web -name '*.js' -not -path '*/lib/*' -print0 | xargs -0 -n1 node --check

# 4. Run web smoke tests
bash setup.sh
node tools/qa/lib/layout.selftest.js
node tools/qa/web-smoke.js
```

For all items requiring physical Windows desktop execution, refer to [docs/TESTY_RECZNE.md](TESTY_RECZNE.md).
