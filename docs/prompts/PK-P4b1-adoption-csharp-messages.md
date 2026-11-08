# PK-P4b1: C#: adoption state, accept message and desktop notification
Zmieniaj: src/Cuy.Core/Input/Validation/PigsMessages.cs, src/Cuy/dotNet/Features/PigsFeature.cs, tests/Cuy.Core.Tests/PigsMessagesTests.cs, docs/contracts/pigs.md, docs/opt/log/PK-P4b1.md
Wymagane: tests/Cuy.Core.Tests/PigsMessagesTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigsMessages|FullyQualifiedName~MessageValidator" && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The page gets `state.adoption` and a one-shot event `adoption_available`; `adopt_group {groupId}` is validated and forwarded to Core; the desktop shows a notification. Tasks P4-03 (C#) and P4-04 (C#).
Depends on: PK-P4a merged (Core API names in docs/opt/log/PK-P4a.md).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `src/Cuy.Core/Input/Validation/PigsMessages.cs (NEW)`: `IMessageRuleSet` like `DormMessages.cs` (rules found by reflection in `MessageValidator.DiscoverRules`, nothing to register). Rules: `adopt_group` with `FieldRule.Str("groupId", 32)`. Note: the old prompt named `PigsMessages.cs` under `src/Cuy/dotNet/Features/`; the correct folder is `src/Cuy.Core/Input/Validation/`.
- `src/Cuy/dotNet/Features/PigsFeature.cs`: handles `adopt_pig`, `adopt_named`, `adopt_group` (line 170 filter, 227-345). `adopt_group` calls `pet.AdoptGroup(groupId, rng, nowUtc)` (line ~286). State publishing near line 125-160 (`OfferChecker.StatusFor`). Add `state.adoption = { status: "closed"|"waiting"|"open", groupId: "starter", pigIds: ["kuki","ned"], opensAtUtc: ISO|null, remainingMs: int|null }` from `AdoptionGate.Evaluate`; hide Kuki/Ned from the offers list while status != open.
- `src/Cuy/dotNet/HomeWindow.cs`: `HomeWindow.PostToPage(object)` (line 547) and `HomeWindow.NotifyStateChanged()`. Post `{ type: "adoption_available", groupId: "starter" }` once when the gate flips to open (persist a flag so it is not repeated at restart).
- `desktop notification`: grep how `BrainController`/`StatusBubble` show a text bubble and reuse it with text "Two pigs are waiting for adoption". Do not add a new notification mechanism.
- `docs/contracts/pigs.md`: add the `state.adoption` shape and the event; this is the contract PK-P4b2 mocks.

## Steps
1. Tests first (`PigsMessagesTests.cs`): M1 `adopt_group` with valid groupId passes; M2 missing/empty/too long groupId rejected; M3 unknown extra fields rejected as for other rule sets (mirror `DormMessagesTests`).
2. Implement the rule set, then in `PigsFeature.cs`: publish `state.adoption`, filter offers, post `adoption_available` once, show the desktop bubble.
3. Build + Weryfikacja. Log: final field names of `state.adoption` and the event (PK-P4b2 mock must match).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P4b1.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
