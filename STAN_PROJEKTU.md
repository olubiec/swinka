# Stan Projektu Cuy — Checkpoint (2026-11-04)

## Podsumowanie postępu
- **Aktualna fala:** `W19` zamknięta (PK-19); następna `PK-20a` (W20a), potem `PK-20b`, `PK-20c`.
- **Zamknięte paczki:** PK-00, PK-17a/b/c, PK-18a/b/c, PK-19 (commity `8cc232b`, `2208167`, `f29d4d1`, `c8f0801`).
- **Odłożone:** patrz `docs/opt/README.md` (W20-03, W21-03, W21-05, W27-07, W28, W29).

## Stan techniczny
- **Testy:** `dotnet test tests/Cuy.Core.Tests` 770/770 zielonych (na .NET 10 z `DOTNET_ROLL_FORWARD=Major`; Windows nadal do potwierdzenia).
- **Build:** `dotnet build src/Cuy/Cuy.csproj` (net48) bez błędów.
- **Git:** `main` = `origin/main` (`c8f0801`).
- **Znane ryzyko:** `W15/W16` były wykonane na innym urządzeniu; repo ma ich commity, ale nie była to ponowna weryfikacja.

## Jak wznowić na Windowsie
1. Podłącz zasilacz.
2. Sprawdź orkiestrę: `python -m orkiestra status`.
3. Odpal kolejną paczkę: `python -m orkiestra run` (od PK-20a).
4. Ręczne bramki Windows: po W22, W26, W30 (`TESTY_RECZNE.md`).
