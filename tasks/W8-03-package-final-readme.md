# W8-03: Package README for the player: all finished features
Zmieniaj: tools/package.ps1, tools/package/README.txt
Wymagane: tools/package/README.txt
Weryfikacja: tools/package.ps1 parses (pwsh Parser::ParseFile when pwsh is installed; otherwise say in the PR that it was reviewed by eye)
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The player's README matches the finished game, and the package log shows what went into the ZIP.
Depends on: W4-04 (size limit, forbidden paths) merged.
Steps:
1. `tools/package/README.txt` (English, short, keep existing sections and tone): one line each for the diary and the album, the birthday, bond and tricks, achievements, the minigames (Veggie Rain, Veggie Memory, Hay Maze), sound settings (volume, quiet hours, mute in full screen), choosing the monitor, starting a new pig (the old save is kept as a backup), and what the pig does when a game or film is fullscreen. No claims that are not true in the code.
2. `tools/package.ps1`: after the existing checks print a short summary of the package (top-level folders with sizes in MB, file count, zip size). Do not change the limits or the ZIP name.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
