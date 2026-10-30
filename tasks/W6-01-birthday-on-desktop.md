# W6-01: Birthday party on the desktop
Zmieniaj: src/Cuy/dotNet/BrainController.cs
Wymagane: src/Cuy/dotNet/BrainController.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, assets/data/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: When the pig has a birthday it plays `party`, pops, and says "Happy birthday!" in a bubble.
Depends on: W5-01 (`Pet.Birthday` reward/cake/diary in Core), W4-08 (`FormPet.ShowStatusMessage`) merged.
Facts: `Pet.Birthday` (`BirthdayEventArgs.Years`) already fires; Core pays the reward. Animation `party` exists; `SoundManager.PlayPopcorn()` exists. After a long offline gap the event fires once per missed birthday.
Steps:
1. In `BrainController` subscribe once to `Pet.Birthday`. When the pig is on the desktop (Home not visible): `RequestAnimation("party")`, `SoundManager.Instance?.PlayPopcorn()`, `FormPet.ShowStatusMessage("Happy birthday!", 4000)`. When Home is open only the state refresh happens (it already does).
2. Several events in a row (missed birthdays) produce one party: ignore events arriving within 5 s of the last handled one. Never during `FirstRunIntro` or while the pig is held. Log `[Birthday] year <N>`; no numbers are read or written here (Core owns the reward).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": Debug build with the time multiplier, wait for a birthday; the party plays once..
