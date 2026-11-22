# Cuy

<!-- HANDOFF_BANNER_START -->
> [!IMPORTANT]
> ### 🔄 Status projektu (od `v1.0.0` do `2026-11-22`)
> **Zaktualizowano:** 2026-11-22 (czas lokalny)
> 
> - **Wykonano od `v1.0.0` (`0add9b6`, 477 commitów na `main` + drzewo robocze):**
>   - **W11–W33, P1–P47, F1, F2, F2-FIX (`F2F-1`..`F2F-6`, `F2-FIX2`..`F2-FIX5`):** wdrożone i zmergowane na `main` (tagi do `v2.6.166`, poza odłożonymi punktami i `PK-23b`).
>   - **Fala 3 i Fala 4 + poprawki `PK-FX1` / `F5-*`:** zaimplementowane w drzewie roboczym (niezacommitowane).
> - **Aktualna weryfikacja (2026-11-22):**
>   - **Release build + `--selftest`:** **PASS** (0 błędów, 0 ostrzeżeń).
>   - **Testy `Cuy.Core.Tests`:** **1410 PASS / 21 FAIL / 6 SKIP** (łącznie 1437).
>   - **QA / Playwright:** `data-check`, `economy-sim --check`, `plan-audit`, `home-behavior-check`, `hotspots-check`, `check-icons`, `maze-test` **PASS**; `check-assets` **FAIL** (duplikat `cosy_nook.png`), `check-css-vars` (18 błędów), `web-smoke.js` i `ux-p76`/`p77` **FAIL**.
> - **Gotowość do wydania:** **NO-GO** — do naprawy 21 testów Core, stabilizacja `web/home` w Playwright, commit zmian i ręczne bramki Windows.
<!-- HANDOFF_BANNER_END -->

<!-- STATUS_DASHBOARD_START -->
> [!NOTE]
> ### 📱 STATUS NA ŻYWO
> **Ostatni przegląd:** 2026-11-22
>
> | Wskaźnik | Wartość | Status |
> | :--- | :--- | :---: |
> | 🌊 **Fale na `main`** | **W11–W33, P1–P47, F1, F2, F2-FIX** | ✅ Zmergowane (477 commitów od `v1.0.0`) |
> | 🛠️ **Drzewo robocze** | **Fala 3 + Fala 4 + `PK-FX1` / `F5-*`** | 🟡 Niezacommitowane |
> | 🏗️ **Build Release + `--selftest`** | **0 błędów, 0 ostrzeżeń** | ✅ PASS |
> | 🧪 **Testy `Cuy.Core.Tests`** | **1410 PASS / 21 FAIL / 6 SKIP** (1437) | 🔴 Wymaga napraw |
> | 🌐 **Playwright & Zasoby** | `web-smoke` FAIL, `check-assets` FAIL, `data-check` PASS | 🔴 Wymaga napraw |
>
> 📄 [Szczegółowy raport stanu](docs/PROJECT_STATE.md) • 📋 [Lista pozostałych zadań](TODO.md) • 🧾 [Checkpoint](STAN_PROJEKTU.md)
<!-- STATUS_DASHBOARD_END -->

A pixel art guinea pig for the Windows desktop. It walks on the taskbar and on windows, has needs like a Pou-style pet, and grows up at the pace of a real guinea pig. A gift project, built with AI agents.

---

## 🚀 Pobierz & Instalacja / Download & Auto-Update

### 📥 Szybka instalacja (Windows):
1. **Pobierz najnowszą wersję**: Przejdź do sekcji [GitHub Releases](https://github.com/olubiec/swinka/releases) i pobierz `Cuy_v1.zip` lub skorzystaj z instalatora w folderze [`installer/`](installer/).
2. **Uruchomienie**:
   - Możesz uruchomić plik [`installer/Cuy-Installer.cmd`](installer/Cuy-Installer.cmd), który automatycznie zainstaluje grę w `%LocalAppData%\Programs\Cuy` i utworzy skrót na Pulpicie.
   - Lub po prostu wypakuj `Cuy_v1.zip` i uruchom `Cuy.exe` bezpośrednio (wersja portable).

### 🔄 Automatyczne aktualizacje przez internet (Auto-Updater):
- **Automatyczne wykrywanie:** Po połączeniu z internetem Cuy automatycznie sprawdza nowe wersje w repozytorium GitHub (`olubiec/swinka`) co 4 godziny oraz na żądanie w zakładce **Settings**.
- **Instalacja 1-kliknięciem:** Gdy pojawi się nowa wersja, w panelu **Settings -> Game Updates** wyświetli się plakietka **`NEW`**. Kliknięcie **Update & Restart** pobiera aktualizację w tle, podmienia pliki i ponownie uruchamia grę.
- **Bezpieczeństwo zapisu:** Wszystkie stany gry, imię świnki, postępy, zdjęcia w albumie oraz zebrane koniczynki są bezpiecznie przechowywane w `%AppData%\Cuy\` i **nigdy nie są kasowane** przy aktualizacjach.

---

| What | Where |
| --- | --- |
| Concept, waves and status | `docs/CONCEPT.md`, `docs/PLAN.md` |
| Rules for AI agents (Antigravity, Jules) | `AGENTS.md`, `docs/JULES_LOOP.md` |
| Tasks: active and completed tasks | `tasks/`, `tasks/done/` |
| Home message and state contracts | `docs/contracts.md` |
| Architecture and system design | `ARCHITECTURE.md` |
| Art (sprites for all 5 stages, icons), sounds, music and data | `assets/` |
| Desktop app (C#, .NET Framework 4.8, based on eSheep, MIT) | `src/Cuy/` |
| Game logic (.NET Standard 2.0) and tests (.NET 9) | `src/Cuy.Core/`, `tests/Cuy.Core.Tests/` |
| Home window, feature modules and minigames (HTML/JS) | `web/home/` |
| Installer & Auto-Update tools | `installer/` |
| Build, packaging and QA automation tools | `tools/` |
| Licences | `THIRD_PARTY_NOTICES.md`, `assets/LICENSES/` |

Build and test: `powershell -ExecutionPolicy Bypass -File tools/build.ps1`. Manual release checklist: `TESTING.md`.

## Windows warns me when I start Cuy (SmartScreen, Smart App Control)

Cuy is a free gift project and the program is not signed with a code-signing certificate (a certificate for a private person in Poland is not available
through Azure Artifact Signing (formerly Trusted Signing), which accepts individuals only in the US and Canada). Because of that Windows may show a warning:

- **SmartScreen:** "Windows protected your PC". Click "More info" and then "Run anyway".
- **Smart App Control (Windows 11) switched on:** the file may be blocked completely, without a "Run anyway" button. Unblocking the file does not help. Either
  turn Smart App Control off in Windows Security, or wait until Microsoft recognises the file. The exact menu path and whether it can be switched back
  depend on your Windows build (not verified).
- **Antivirus false positives:** if an antivirus blocks Cuy, report the file as a false positive at https://www.microsoft.com/en-us/wdsi/filesubmission.
  Cuy uses no packer or obfuscator.

## WebView2 runtime

The Home window and the minigames run in Microsoft Edge WebView2. Windows 11 includes the runtime and most Windows 10 PCs have it. If it is missing, Cuy tells you and the
download page is https://developer.microsoft.com/microsoft-edge/webview2/ (choose "Evergreen").

## Weather data (Dane pogodowe)

The optional weather reactions use the free Open-Meteo API and its geocoding (GeoNames). Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the link is shown next to the weather in Settings. The free API may be used for non-commercial purposes
only: Cuy is a free gift and must not be sold or monetised while it uses it. Only the city name and its coordinates are sent. See `THIRD_PARTY_NOTICES.md`.
