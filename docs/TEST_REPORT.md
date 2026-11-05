# Raport testów (fale 0–4)

Data: 2026-11-05. Środowisko: Linux, Chromium 1243 przez `/opt/pw-browsers/chromium` (Playwright w `tools/qa` oczekuje 1194, nic nie instalowano). Testy C# (`tests/Cuy.Core.Tests`) i `Cuy.Simulator` pominięte: brak `dotnet`, WinForms wymaga Windowsa. Do uruchomienia na Windowsie: `tools/build.ps1`.

## Wyniki wg fali

| Fala | Zakres | Wynik |
|---|---|---|
| 0 | baza: plan-audit, data-check, assets, css-vars, icons, paths, palette | PASS (paths/palette: naprawione przez executablePath) |
| 1A | web-smoke, screen-matrix --quick | 47 PASS, 1 SKIP; pełna macierz nie dokończona (crash otwierania kart) |
| 1B | minigry: fit-check, maze, smoke 4 gier | PASS |
| 1C | muzyka i dźwięk (9 skryptów) | 9/9 PASS |
| 1D | animacje, światła, layout, known-missing-assets | PASS |
| 2E | układ 360/420/480/640 px, visual-matrix | 420+ OK; 360 px: ucięty tytuł odtwarzacza |
| 2F | a11y-check, nawigacja klawiaturą | a11y-check PASS; 3× P1 (focus) |
| 2G | ścieżka gracza E2E | 6/7 PASS; 1× P1 (setName w mocku) |
| 2H | motywy, kontrast, reduced-motion | palette PASS; 4× P1 (brak dzień/noc, kontrast, reduced-motion) |
| 3I | uszkodzony zapis (localStorage) | 4/7 PASS; 3× P1 |
| 3J | awarie zasobów i sieci | PASS; 1× P1 (brak komunikatu offline) |
| 3K | szybkie wejście, wycieki | PASS (0 P0/P1) |
| 3L | statyczny przegląd błędów | brak P0/P1; P2 (puste catch) |
| 4M | ekonomia: econ-sim, economy-sim, econ-gate | PASS |
| 4N | wydajność i soak | perf-soak FAIL (P2), pamięć P1 do potwierdzenia |

## Problemy do naprawy (P1)

1. **Zapis: zły stan UI i trwałe błędne wartości** — `{}` bez `pigDays` daje 588 dni; `fullness: "abc"` daje `NaN%` i zapisuje `null`; stary format `needs` jako tablica zeruje potrzeby (agent 3I).
2. **Mock przeglądarki bez `setName`** — imię z onboardingu się nie zapisuje (`web/home/bridge.js`). Do sprawdzenia, czy `HomeWindow.HandleSetName` w C# działa.
3. **Brak komunikatu offline** — gdy `bridge.js` nie działa, akcje są martwe bez informacji (agent 3J).
4. **Focus w modalach** — brak pułapki focusu, brak przeniesienia focusu do dialogu, brak zwrotu focusu po Escape (`web/home/app.js:845-859`).
5. **Brak focus ringu** — `outline: none` w `shop/feature.css:43`, `decor/feature.css:60`, `settings/feature.css:45,90,214`.
6. **Kontrast** — `h1`/`.app-title` 4,42:1 (wymagane 4,5); `#btnSound` 2,6:1 (wymagane 3:1).
7. **`prefers-reduced-motion`** — brak obsługi; `daily-bounce` animuje w nieskończoność.
8. **Brak trybu dzień/noc w web/home** — do potwierdzenia, czy jest wymagany.
9. **Pamięć w soak** — +110% (soak.js) i +30% (perf-soak.js). Możliwy szum GC; wymaga dłuższego biegu z wymuszonym GC.
10. **Ikona `icons_16.png`** — 404 bez mapowania `/assets` (P1 warunkowy, zależy od hosta WebView).
11. **Ucięty tytuł odtwarzacza muzyki przy 360 px** — `web/home/features/music/player.css:42` (zgłaszane też jako P2).

## Problemy P2

- Przyciski `mp_btn` 20×20 px (poniżej 24) — `player.css:98-101`.
- `Escape` w planie Rooms zamyka cały modal — `app.js:599-604`, `rooms/feature.js:436-437`.
- Brak etykiet `#settingsQuietHoursFrom/To` — `settings/feature.js:22-24`.
- Puste `catch` w web (~27) — m.in. `bridge.js:730,824,980,1033`, `coloring/feature.js:21,28,114,121,131`, `sound.js:49,62`.
- Puste `catch (Exception)` w C# — `Program.cs:102,120,129`, `SelfTest.cs:121,131`, `FoodManager.cs:206`, `FoodItemForm.cs:107`.
- Brak globalnego `window.onerror` / `unhandledrejection`.
- Nieatomowe ścieżki zapisu `save.json` przy uszkodzonym pliku — `SaveSystem.cs:210-212, 221-224`.
- `coloring/feature.js:21,28` — cichy fallback przy uszkodzonym JSON, kolejny zapis nadpisuje dane.
- `dblclick` na `btnShop` zostawia modal zamknięty, na `btnMore` otwarty (obserwacja, nie zbadana).
- Ostrzeżenia balansu: profile „exploit" i „smart" nie osiągają pokoju L3 w 365 dni.

## Testy niewykonane

- Wszystkie testy C# (`tests/Cuy.Core.Tests`) i `Cuy.Simulator` — wymagają Windowsa.
- Pełna macierz `screen-matrix.js` (360/420/480 × light/dark × 1x/2x) — crash otwierania kart w harnessie; częściowo zastąpiona przez 2E.
- `soak.js` nie drukuje PASS/FAIL; ocena tylko z liczb.
- Klucze zapisu `cuy_coloring_v1`, `cuy_record_nyan_cuy`, `cuy_muted` i klucze muzyki nie były testowane w fali 3I.

## Następne kroki

Naprawy nie zostały wykonane (zakres był tylko testowy). Proponowany podział na pakiety: (a) walidacja zapisu, (b) focus i modale, (c) kontrast i reduced-motion, (d) komunikat offline i mock `setName`. Każdy pakiet to osobny commit po akceptacji.
