# PK-P4a: Core adoption gate and look source
- Decyzje: Dodano AdoptionGateConfig (assets/data/adoption_gate.json) z progiem "junior" i opóźnieniem 1-3 dni.
- Stan zapisu w GameState.Adoption.cs: AdoptionGateOpen, AdoptionOfferAvailableAtUtc, AdoptionOfferAccepted, SyncAdoptionGate().
- Core API dla P4b: AdoptionGate.IsOpen(state), AdoptionGate.IsOfferAvailable(state, nowUtc), AdoptionGate.GetOffer(state), AdoptionGate.AcceptOffer(state), AdoptionGate.CanRename(pig), AdoptionGate.TryRename(pig, name).
- Wygląd startowy: Cuy.Core.Pigs.PigLook i Cuy.Look.PigLook StarterLook zwraca domyślną skórkę, odmienną od Kuki.
- Roster: Kuki i Ned nie są dodawani przed otwarciem bramki; przyjęcie oferty dodaje obie świnki bez duplikatów ze stałymi imionami.
- Weryfikacja: dotnet build i dotnet test filter FullyQualifiedName~Adoption|FullyQualifiedName~PigLook zakończone sukcesem (21/21 zielone).
