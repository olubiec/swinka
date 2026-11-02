# W14-03: Desktop: offer toast, adopted pig appears with a peek
Zmieniaj: src/Cuy/dotNet/BrainController.cs
Wymagane: src/Cuy/dotNet/BrainController.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: On the desktop the player is told when a new offer unlocks, and an adopted pig appears (new pet window, peek from the edge).
Depends on: W13 merged (Pet.OfferUnlocked, Pet.PigAdopted, CheckOffers).
Facts: `BrainController` is the glue between Core and WinForms; it already shows toasts to the Home page (`HomeWindow.PostToPage(new { type = "toast", text = ... })`) and has edge-peek helpers (`EdgePeekDirector`). Call `Pet.CheckOffers(DateTime.UtcNow)` once at start and then on the existing slow tick (about once a minute is enough). The active pigs shown on the desktop are the first two of `ActivePigIds`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Subscribe to `OfferUnlocked`: toast 'A new friend is waiting for adoption: <name>'. Subscribe to `PigAdopted`: toast 'Welcome, <name>!' (memorial: 'Forever in the family'), and when the new pig becomes active, create its pet window and start the edge peek.
2. Unsubscribe on dispose. Do not show more than one offer toast per minute (queue the rest).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
