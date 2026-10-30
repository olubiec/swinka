# Cele produktu (czyta planista pętli przy planowaniu fal)

## Czym jest projekt
Cuy: pikselowa świnka morska na pulpicie Windowsa (okno Pulpit + okno Domek), prezent dla jednej osoby, która kocha świnki. Bez reklam, płatności, telemetrii i internetu w czasie działania. Szczegóły: `docs/CONCEPT.md`, plan fal: `docs/PLAN.md`.

## Cele (od najważniejszych)
1. Dokończyć fale W3–W8 z `tasks/` (pętla bierze je przed samodzielnym planowaniem).
2. Stabilność i brak regresji: aplikacja nigdy nie zabija świnki, zapis zawsze się wczytuje, brak błędów w logu i konsoli.
3. Każda funkcja ma test w CI albo wpis w `TESTY_RECZNE.md`.
4. Po W8: tylko poprawki błędów, testy, dokumentacja i polish; nowe funkcje wyłącznie z `docs/PLAN.md` (pogoda, taniec, drugi towarzysz są opcjonalne).

## Jakość
- Testy Core: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`
- Web: `node tools/qa/web-smoke.js` i `node tools/qa/lib/layout.selftest.js` (to robi CI)
- Zasady z `AGENTS.md`: logika oddzielona od renderingu, wartości do strojenia w configu/`assets/data`, teksty w grze po angielsku, pixel art skalowany najbliższym sąsiadem.

## Czego nie robić
- Nie dodawaj instalatora, płatności, kont online, telemetrii, portu na ESP32 ani trybu deweloperskiego w paczce dla gracza.
- Nie zmieniaj formatu `save.json` bez migracji.
- Nie dodawaj zależności spoza `docs/PLAN.md`; nie usuwaj ani nie zmieniaj istniejących asercji.
- Nie ruszaj `assets/` binarnych ani `Resources/animations.xml`.

## Inspiracje (opcjonalnie)
Inspiracje: desktop pet pixel art javascript
