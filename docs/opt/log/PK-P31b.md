# PK-P31b: Core pig location and roaming
- Decisions: PigLocation is a class in Cuy.Core.Pigs; GameState.PigLocations is a Dictionary<string, PigLocation> with salon/free defaults.
- Roaming logic: PigRoamer.Tick moves free pigs to adjacent ring scenes after random interval (600-1800s); skips locked scenes; stays if pinned or both neighbours locked.
- Night behavior: During sleep_hours (22:00-07:00), free pigs move to unlocked own room ("pig:<id>") and stay until morning.
- Config: PigRoamingConfig.Current loads assets/data/pig_roaming.json (interval_min_s, interval_max_s, sleep_hours, pinned_default).
- GameState API: state.PigLocations, state.GetPigLocation(pigId), state.SetPigLocation(pigId, sceneId, pinned), state.SetPigPinned(pigId, pinned), state.EnsurePigLocations(clock, rng, config).
- PigLocation fields: PigId, SceneId (alias Scene), Pinned, NextMoveAt.
- PigRoamer API: PigRoamer.Tick(state, order, isUnlocked, clock, rng, config), PigRoamer.CanMove(state, pigId, toScene, order, isUnlocked), PigRoamer.TryMove(state, pigId, toScene, order, isUnlocked, clock, rng, config), PigRoamer.SetPinned(state, pigId, pinned), PigRoamer.AreAdjacent(sceneA, sceneB, order).
- Differences from plan: None. All 12 tests (L1-L10, config, roamer helpers) pass.
