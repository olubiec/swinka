# PK-18b Log
- W18-07: Implemented GameState.EnsureWorld() idempotent migration for legacy decor, salon setup, and memorial roster memory_corner grant.
- W18-03: Implemented Pet.Farm planting, watering with cans/sprinkler, harvesting (single and all), orchard planting/harvesting, and expansion purchases.
- W18-05: Implemented Pet.Walk garden/park walking with daily limit and comfort check, and OnFed varied vegetable diet mood bonus.
- Decisions: Stored daily walk date and counter in State.Stats.Counters (walk_date_ordinal, walks_today) to persist across reloads without modifying WorldState.
- Decisions: Kept in-memory fed vegetables tracking for the local day in Pet.Walk; carrots classified as treat per items.json while bell pepper/cucumber/parsley/kale count as vegetables.
- Differences: None. All names and signatures match planned interfaces.
- Left undone: None. All items (W18-03, W18-05, W18-07) fully implemented and verified (17 tests passing).
