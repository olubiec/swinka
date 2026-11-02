# W19-05: docs/contracts.md: places, rooms, farm, market
Zmieniaj: docs/contracts.md
Wymagane: docs/contracts.md
Weryfikacja: git diff --stat
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, tasks/*
Goal: The contract document describes the state and messages of the four new features exactly as they are published.
Depends on: W19-01..04 merged (read the four feature files).
Facts: Follow the existing format of the `shop`, `decor`, `pigs` sections (state key, field table, messages with payload shapes, toasts). Read the four new `*Feature.cs` files for the real field names, and `docs/WORLD.md` for the meaning. The `decor` section stays but gets a note that it is superseded by `rooms` once `WorldDecorActive` is on. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add four sections (`places`, `rooms`, `farm`, `market`), including the quote messages and every toast text; do not edit other sections except the one-line note in `decor`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
