# W14-05: MouseFearBehavior: startle sensitivity
Zmieniaj: src/Cuy/dotNet/Behaviors/MouseFearBehavior.cs
Wymagane: src/Cuy/dotNet/Behaviors/MouseFearBehavior.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: Skittish pigs notice a shaken mouse sooner and calm ones later.
Depends on: W13 merged.
Facts: `MouseShakeMonitor` detects shaking (threshold inside the monitor or its constructor lambda, read the code). The behaviour reacts in `OnShaken` (second shake within 10 s makes a normal pig flee, cooldown 5 min). New: the detection threshold is divided by `Pet.ActiveModifiers.Startle` (neutral 1.0; James 1.5 is jumpier). If the threshold lives in a shared class you may not edit, scale the number of shakes needed instead and record the decision in the PR. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Apply the multiplier where the threshold is evaluated; clamp the effective threshold to at least 40 percent of the original.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
