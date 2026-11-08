# PK-P4b1: C#: adoption state, adopt_group validation and desktop notification
Zmieniaj: src/Cuy.Core/Input/Validation/PigsMessages.cs, src/Cuy/dotNet/Features/PigsFeature.cs, tests/Cuy.Core.Tests/PigsMessagesTests.cs, docs/contracts/pigs.md, docs/opt/log/PK-P4b1.md
Wymagane: tests/Cuy.Core.Tests/PigsMessagesTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigsMessages|FullyQualifiedName~MessageValidator" && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
## Kontekst (fakty zweryfikowane 8.11.2026, nie szukaj drugi raz)
- Plan: `docs/PLAN_POPRAWEK_UX.md` zadania P4-01..P4-04 (tabela od linii ~202). Stan repo: wygląd świnki jest już ujednolicony przez P42 (`PigLookResolver` w `src/Cuy.Core/Pigs/PigRoster.cs`, `look` w stanie, web `CuyLook`), a świnka startowa to nazwana `cuy` z własną planszą `assets/sprites/pigs/cuy/<stage>/spritesheet.png` (`GameState.Pigs.cs:62` `NamedId = "cuy"`, migracja v3 w `SaveSystem.cs:347`). Zostaje: bramka adopcji Kuki i Neda.
- Kuki i Ned: `assets/data/pigs_named.json` grupa `starter` (linia 8), oba wpisy `"offer": {"group":"starter","after_days":0,"cost":0}`; `OfferChecker.StatusFor` odblokowuje je od razu.
- `src/Cuy.Core/Input/Validation/*.cs`: zestawy reguł `IMessageRuleSet` (wzór `DormMessages.cs`: `new MessageRule("type", FieldRule.Str("field", maxLen))`; `FieldRule.Str(name, maxLen, required: true)` w `src/Cuy.Core/Input/IMessageRuleSet.cs:58`), wykrywane refleksją przez `MessageValidator.DiscoverRules`, bez rejestracji. Wzór testów: `tests/Cuy.Core.Tests/DormMessageTests.cs` (`MessageValidator.Validate(type, JObject.Parse(json))`, `result.IsOk` / `IsInvalid`). Nic w `src/Cuy` nie wywołuje dziś `MessageValidator.Validate` (poza `HomesMessages.ValidatePigHome` w HomesFeature.cs:74); `PigsFeature` ma sam sprawdzić `adopt_group`.
- Kontrakt wiadomości web: `adopt_group` ma pole `id` (kontrakt `docs/contracts/pigs.md:19` `{ id | groupId }`; web wysyła `id`, `features/pigs/feature.js:880`). Obie nazwy muszą pozostać przyjmowane.
- `src/Cuy/dotNet/Features/PigsFeature.cs`: budowa stanu ok. linii 95-165 (`state["roster"]`, `state["offers"]` linia 165, `OfferChecker.StatusFor` linia 137), obsługa wiadomości: filtr typów linia 170, `adopt_group` linie 272-300 (czyta `id`/`groupId`, `pet.AdoptGroup(groupId, rng, nowUtc)` linia ~286, odpowiedzi `toast`). `pet.MaxRoster` ustawiane w handlerze (wzór ustawiania `pet.Gate`).
- `HomeWindow.PostToPage(object)` (HomeWindow.cs:547), `HomeWindow.NotifyStateChanged()` (165). Dymek na pulpicie: `FormPet.ShowStatusMessage`-podobna metoda wywołująca `_statusBubble.ShowMessage(text, durationMs)` (FormPet.cs:~655-660, `FormPet.AllPets` linia 50); zacznij od `grep -n "ShowMessage" src/Cuy/dotNet/FormPet.cs`, użyj istniejącej metody publicznej, nie dodawaj nowego mechanizmu powiadomień.
- API Core z PK-P4a (log `docs/opt/log/PK-P4a.md`): `AdoptionGate.Evaluate(state, balance, cfg, nowUtc, rng)`, `AdoptionStatus {Closed,Waiting,Open,Done}`, `Pet.Gate`.
Goal: Strona dostaje `state.adoption` i jednorazowe zdarzenie `adoption_available`; `adopt_group` jest walidowane i przekazywane do Core; pulpit pokazuje dymek. Zadania P4-03 i P4-04 (C#).
Depends on: PK-P4a merged.

## Pliki i elementy
- `src/Cuy.Core/Input/Validation/PigsMessages.cs` (NOWY): `MessageRule("adopt_group", FieldRule.Str("id", 32, required: false), FieldRule.Str("groupId", 32, required: false))`.
- `PigsFeature.cs`: (a) na początku obsługi i przy budowie stanu `pet.Gate = AdoptionGateConfig.Current` (patrz log P4a); (b) stan: `state["adoption"] = { status: "closed"|"waiting"|"open"|"done", groupId: "starter", pigIds: ["kuki","ned"], opensAtUtc: ISO|null, remainingMs: int|null }` z `AdoptionGate.Evaluate`; (c) lista `offers`: dopóki status != open usuń wpisy grupy `starter`; (d) w handlerze `adopt_group`: `MessageValidator.Validate("adopt_group", message)`, przy `IsInvalid` zwróć `true` bez zmian; (e) gdy status zmienił się na `open` i `State.AdoptionNotified` jest false: `HomeWindow.PostToPage(new { type = "adoption_available", groupId = "starter" })`, dymek "Two pigs are waiting for adoption" i zapamiętanie flagi, żeby nie powtarzać po restarcie. Flaga: `State.AdoptionNotified` (dodana przez PK-P4a w `GameState.Adoption.cs`).
- `docs/contracts/pigs.md`: sekcje `state.adoption` i zdarzenie `adoption_available`; wiersz `adopt_group` bez zmian nazw pól.

## Steps
1. Testy najpierw `tests/Cuy.Core.Tests/PigsMessagesTests.cs`: M1 `adopt_group` z `id` przechodzi, M2 z `groupId` przechodzi, M3 `id` za długie (33 znaki) odrzucone, M4 `id: 5` (zły typ) odrzucone.
2. Zaimplementuj zestaw reguł, potem zmiany w `PigsFeature.cs` i kontrakt.
3. Uruchom Weryfikacja (testy + build Windows-targeting). Log: dokładne nazwy pól `state.adoption` i zdarzenia (PK-P4b2a/b mockują dokładnie to).

Prohibited: zmiana lub usuwanie istniejących asercji, nowe zależności, pliki spoza „Zmieniaj", dodatkowe refaktory, kroki innych paczek, nowy mechanizm powiadomień.
Log: write `docs/opt/log/PK-P4b1.md` (max 10 linii: decyzje, dokładne nazwy pól, różnice względem planu, BLOCKED jeśli dotyczy). Do not run git.
