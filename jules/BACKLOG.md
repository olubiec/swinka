# Backlog na wolne sesje (wieczór, przed snem)

Każde zadanie: jedna sesja, jeden PR, komenda akceptacji, zakaz zmiany istniejących asercji. Odpalaj po kolei, od góry; nie dotykają plików fal.

## Jakość (10 zadań)
| # | Zadanie | Akceptacja |
| --- | --- | --- |
| Q1 | Testy zgodności zapisów: wczytaj stare fixtures `save.json` (każda wersja z `SaveSystem`) i sprawdź domyślne wartości nowych pól | `dotnet test tests/Cuy.Core.Tests -c Release` |
| Q2 | Test regresji ekonomii: symulator 30 dni w CI, asercje na przedziały dochodu i cen | `dotnet test` + wpis w `ci.yml` |
| Q3 | Skrypt `tools/qa/check-js.sh`: `node --check` dla wszystkich plików JS w `web/`, dopięty do CI | `bash tools/qa/check-js.sh` |
| Q4 | Walidacja danych: każdy `assets/data/*.json` się parsuje, id zgodne z kanonicznymi, każda rzecz ma ikonę | `dotnet test` (nowy `DataValidationTests`) |
| Q5 | Test „bez polskich ids poza migracją zapisu” (grep w teście) | `dotnet test` |
| Q6 | Smoke test dostępności Domku: kolejność Tab, widoczny fokus, kontrast głównych przycisków (Playwright, bez nowych zależności) | `node tools/qa/web-smoke.js` |
| Q7 | Test wydajności `Brain`: 10 000 ticków w limicie czasu i bez alokacji w pętli (asercja na czasie z zapasem) | `dotnet test` |
| Q8 | Odświeżenie `ARCHITECTURE.md` na podstawie kodu (tylko dokumentacja, bez zmian kodu) | `git diff --stat` tylko `ARCHITECTURE.md` |
| Q9 | Pętla uczenia: przejrzyj komentarze z ostatnich 10 PR-ów i dopisz do `AGENTS.md` po jednej linii na powtarzający się błąd | `git diff` tylko `AGENTS.md`, max 10 linii |
| Q10 | CI: cache NuGet i npm, żeby build był szybszy | czas CI w opisie PR przed/po, CI zielone |

## Odłożone funkcje (pełne prompty w `jules/backlog/`)
Hay Hop (F5-01, `[WARIANTY]`), pogoda (F6-04), towarzysz (F6-06..08), taniec do muzyki z NAudio 2.2.1 (F6-00, F6-01, F6-09), etapy w Domku (F8-02).
Przed użyciem skopiuj plik do `jules/queue/` i zaktualizuj zależności w pierwszych liniach.
