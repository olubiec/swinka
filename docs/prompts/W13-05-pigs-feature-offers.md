# W13-05: PigsFeature: ages, offers, adoption and memorial messages
Zmieniaj: src/Cuy/dotNet/Features/PigsFeature.cs, assets/data/pigs.json
Wymagane: src/Cuy/dotNet/Features/PigsFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home state shows each pig's age and stage, the adoption offers with their status, and handles the new adoption messages.
Depends on: W13-03 merged is NOT required (same wave): use the methods by their planned names; if they are missing, list it in the PR.
Facts: `PigsFeature` today publishes the roster (breed, palette, traits) and handles `adopt_pig` (random pig, `adopt_cost` 80, `max_roster` from `assets/data/pigs.json`) and `toggle_pig_active`. Contract in docs/contracts.md is updated in W15-04. Names of the Core API (W13-03): `Pet.AdoptNamed(id, memorial, rng, nowUtc)`, `Pet.AdoptGroup(groupId, rng, nowUtc)`, `Pet.SetMemorial(pigId, on)`, `Pet.CheckOffers(nowUtc)`; W12: `OfferChecker.StatusFor`, `PigLife`. JS never computes prices or ages. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. pigs.json: `max_roster` stays 6 and counts only pigs that are neither in the `legend` stage nor memorial (same rule as `Pet.AdoptNamed`), new `max_adopted` 1 (random adoptions only). `adopt_pig` refuses with the toast 'You already adopted a friend' when one profile with no `NamedId` and not the first pig exists beyond the limit, and keeps working otherwise.
2. State per pig: add `namedId`, `ageYears` (one decimal), `stage` (baby, junior, adult, senior, legend), `memorial`, `blurb`, `modifiers` (only for named pigs, rounded). Add `offers`: array from `OfferChecker.StatusFor` with `id`, `name`, `unlocked`, `daysLeft`, `cost`, `group`, `adopted`, `look` (breed, paletteId), `blurb`, `traits` (ids only). Do not publish `legendAtYears`.
3. Messages: `adopt_named { id, memorial }`, `adopt_group { id }`, `set_memorial { pigId, on }`; map `AdoptResult` to toasts ('Not enough clovers', 'The family is full', 'Not ready yet'); post the new state after each. Unknown ids are ignored. Memorial toasts use warm text only ('Forever in the family').
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
