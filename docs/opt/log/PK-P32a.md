# PK-P32a: Bridge: scene order and pig location messages to the page
- Decisions: SceneOrder in Cuy.Core.Pigs builds circular ring (salon -> pig rooms -> dorm if unlocked -> garden -> park -> farm -> market); SceneEntry has Id, Title, Locked, UnlockHint.
- Core API: SceneOrder.Build(rooms, unlocked), SceneOrder.Next(ring, scene), SceneOrder.Previous(ring, scene), SceneOrder.AreAdjacent(ring, a, b).
- PlacesFeature state: places.order [{id, title, locked, unlockHint}], places.pigLocations [{pigId, scene, pinned}].
- Commands handled: places.pigMove {pigId, to} (validated via PigRoamer.CanMove), places.pigPin {pigId, pinned} (PigRoamer.SetPinned).
- Roamer tick: PlacesFeature.Tick invokes PigRoamer.Tick on each tick and calls HomeWindow.NotifyStateChanged() when pigs move.
- Contract: documented in docs/contracts/places-pig-location.md.
- Differences from plan: None. All SceneOrder and PigLocation tests pass.
