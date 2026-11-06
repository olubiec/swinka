# PK-P4a: adoption gate (Core) - status: UNVERIFIED (dotnet SDK missing, install blocked by proxy 403; nothing compiled or run)
- Decisions: `PigRoster.cs` does not exist and `PigLook.cs` lives in `src/Cuy/dotNet/Graphics/` (WinForms, outside Zmieniaj, not testable from Core). The single look source is Core: `AdoptionGate.LookOf(PigProfile)` (named pig = own coat, any other = default skin from json). P4b must make `PigLook` use it.
- Starter pig: `GameState.EnsureStarterPig(nowUtc)` (smooth/tricolor). `EnsureRosterInitialized` (not in Zmieniaj) still creates Kuki+Ned when given a catalog: P4b must call `EnsureStarterPig` in `GameSession.Open` first.
- `Pet.AdoptNamed("kuki")` is not gated (Pet.Adoption.cs not in Zmieniaj); UI must use `AdoptionGate.IsAdoptable/IsVisible/Accept`.
- Delay = real days in [min,max] (adoption_gate.json), rolled once when the starter first is seen at stage >= junior (`Evaluate`).
- Old save with Kuki/Ned: `Evaluate` sets AdoptionGateOpen+AdoptionAccepted, no offer. Missing fields default to closed.
- New Core API: AdoptionGateConfig.Current/Load/LoadDefault; AdoptionGate.Evaluate(state, now, pigDaysPerRealDay, rng, config, catalog), IsAdoptable, IsVisible, HasPig, Accept(pet, rng, now), TryRename, LookOf; PigLookSpec; GameState.AdoptionGateOpen/AdoptionStageReachedUtc/AdoptionOfferAtUtc/AdoptionAccepted, IsAdoptionOfferPending(), EnsureStarterPig().
- Nobody calls Evaluate yet (P4b: GameSession.Open and the periodic tick).
