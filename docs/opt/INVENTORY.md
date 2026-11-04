# Inwentarz i mapa paczek v2 (4.11.2026)

Źródło: `waves.yaml` na `main` (GitHub). Dane maszynowe: `docs/opt/packages.draft.json` (zawiera też pominięte paczki). Decyzje właściciela z 4.11: **W15 i W16 zostają poza tym planem** (robisz je sam), cięcia zakresu zostawione do mojej oceny.

## Decyzje
| Co | Decyzja | Powód |
|---|---|---|
| W15, W16 | poza planem optymalizacji | w toku lokalnie |
| W28 wybieg + audyt, W29 rekwizyty z pulpitu (18 zadań) | **odłożone** do osobnego etapu po teście na Windowsie | nie są rdzeniem; W30 przycięte o wybieg i rekwizyty |
| W20-03 undo/redo i przyciąganie, W21-03 dźwięki, W21-05 limity canvasu, W27-07 chodzenie w edytorze | **odłożone** | miło mieć; limity canvasu dopiero przy problemach z wydajnością |
| W22-02 | **zmniejszone**: zostają niezmienniki z danych (`WorldInvariantsTests`), bez portu symulatora do C# | kontrola ekonomii jest w `economy-sim.js --check`, ale test niezmienników pilnuje danych świata |
| Sesje | jedna paczka = jedna sesja, zadania po kolei, commit po każdym zadaniu | mniej startów sesji |

## Paczki do wykonania (33 paczek, 96 zadań z 118 pozostałych po W15-W16)
Kolejność jest kolejnością etapów. Paczki tego samego etapu nie mają wspólnych plików, więc można je puścić równolegle (zależności semantyczne sprawdzę w sesji 7). Modele: `flash-medium` to loadery i testy, `flash-high` kod z kilkoma plikami.

| Paczka | Zadania | Model | Uwagi |
|---|---|---|---|
| PK-00 | (nowa) wzorzec plików per funkcja | flash-high | prompt: `docs/prompts/PK-00-per-feature-files.md`, wpis: `docs/opt/waves-PK00.yaml` |
| PK-17a | W17-01, W17-02, W17-07, W17-08 | flash-high |  |
| PK-17b | W17-03, W17-04 | flash-high |  |
| PK-17c | W17-05, W17-06 | flash-high |  (pełny test na końcu etapu) |
| PK-18a | W18-01, W18-06, W18-02 | flash-high |  |
| PK-18b | W18-03, W18-05, W18-07 | flash-high |  |
| PK-18c | W18-04 | flash-high |  (pełny test na końcu etapu) |
| PK-19 | W19-01, W19-02, W19-03, W19-04, W19-05, W19-06 | flash-high |  (pełny test na końcu etapu) |
| PK-20a | W20-01, W20-02 | flash-high (UI: sonnet-low po 2 porażkach) | bez W20-03 |
| PK-20b | W20-04, W20-05 | flash-high (UI: sonnet-low po 2 porażkach) |  |
| PK-20c | W20-06, W20-07, W20-08 | flash-high (UI: sonnet-low po 2 porażkach) |  (pełny test na końcu etapu) |
| PK-21 | W21-01, W21-02, W21-04 | flash-medium | bez W21-03, W21-05 (pełny test na końcu etapu) |
| PK-22a | W22-01, W22-05, W22-06, W22-07 | flash-high |  |
| PK-22b | W22-02 | flash-high | tylko niezmienniki z danych, bez portu symulatora |
| PK-22c | W22-03, W22-04 | flash-medium |  (pełny test na końcu etapu) |
| PK-23a | W23-01, W23-02, W23-06, W23-07, W23-08 | flash-medium |  |
| PK-23b | W23-03, W23-04, W23-05 | flash-high |  (pełny test na końcu etapu) |
| PK-24a | W24-01, W24-02, W24-03, W24-04 | flash-high |  |
| PK-24b | W24-05, W24-06 | flash-medium |  (pełny test na końcu etapu) |
| PK-25a | W25-01, W25-03, W25-02 | flash-high |  |
| PK-25b | W25-04, W25-05, W25-06, W25-07 | flash-high (UI: sonnet-low po 2 porażkach) |  (pełny test na końcu etapu) |
| PK-26a | W26-01, W26-03, W26-02 | flash-high |  |
| PK-26b | W26-04, W26-05, W26-08 | flash-high |  |
| PK-26c | W26-06, W26-07, W26-09 | flash-high (UI: sonnet-low po 2 porażkach) |  (pełny test na końcu etapu) |
| PK-27a | W27-01, W27-02, W27-03, W27-04, W27-05 | flash-high |  |
| PK-27b | W27-06, W27-08 | flash-high (UI: sonnet-low po 2 porażkach) | bez W27-07 (pełny test na końcu etapu) |
| PK-30a | W30-01, W30-02, W30-06 | flash-high | przyciąć o wybieg i rekwizyty |
| PK-30b | W30-03, W30-04, W30-05 | flash-high (UI: sonnet-low po 2 porażkach) | przyciąć o wybieg i rekwizyty |
| PK-30c | W30-07, W30-08, W30-09 | flash-high | przyciąć o wybieg i rekwizyty (pełny test na końcu etapu) |
| PK-31a | W31-01, W31-04, W31-03 | flash-medium |  |
| PK-31b | W31-02 | flash-medium |  (pełny test na końcu etapu) |
| PK-32a | W32-01, W32-02, W32-03, W32-04 | flash-high |  |
| PK-32b | W32-05, W32-06 | flash-high |  (pełny test na końcu etapu) |
| PK-33 | W33-01, W33-02 | flash-medium |  (pełny test na końcu etapu) |

## Co dodaje PK-00 i dlaczego
`MessageValidator.cs` jeszcze nie istnieje (tworzy go dopiero W19-06), a mock w `bridge.js` to jeden `switch`. Zamiast rozcinać istniejące pliki, PK-00 tworzy wzorzec: reguły walidacji per funkcja (`IMessageRuleSet`, wykrywane przez refleksję), mock per funkcja (`features/<id>/mock.js`) i kontrakty per funkcja (`docs/contracts/<feature>.md`). Dzięki temu zadania „kontrakt / walidacja / mock” (W19-05/06, W25-02/03/07, W26-05, W27-05, W30-04) wchodzą do paczki funkcji, a nie do osobnych sesji. Sesje 3-6 przepiszą ich prompty na ten wzorzec.

## Liczby
| | Zadań | Sesji |
|---|---|---|
| Od W17 w górę, dziś | 118 | 118 (+ druga próba przy porażce) |
| Po zmianach | 96 | 33 paczki + PK-00 |

To ok. 3,5x mniej startów sesji. Zużycie tokenów spadnie mniej (paczki są większe od zadań): zgaduję 1,5-2x, do zmierzenia na pierwszej paczce. Dodatkowo: filtr testów do klas paczki i pełny test tylko na końcu etapu (dziś 81 zadań odpala pełne `dotnet test`); `timeout_minutes: 40` dla paczek zamiast 20.

## Ryzyka
- Porażka kosztuje całą paczkę (`max_attempts = 2`): paczki mają 1-6 zadań, commit po każdym.
- Polecenia `verify` w `packages.draft.json` są szkicem (brak np. `--check` przy `economy-sim`, smoke w paczkach docelowo z `verify.ps1`); dopracuję w sesjach 3-6.
- W30 (sklep, włączenie flag) ma w promptach wybieg i rekwizyty: przyciąć w sesji 6.
