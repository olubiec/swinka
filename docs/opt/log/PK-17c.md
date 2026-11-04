# PK-17c Log
- Missing W16 files: defined `MarketConfig` and `StallUpgradeDef` in `src/Cuy.Core/World/MarketPricing.cs` (loading `assets/data/market.json` with clamping and fallback defaults) while reusing `MarketState`, `OrderState`, `WorldItemCatalog` from `WorldState.cs` and `FarmConfig`, `CropDefinition` from `FarmEngine.cs`.
- W17-05 (`MarketPricing`): implemented `NewDay`, deterministic `Wiggle` (FNV-1a/Murmur3 mix in `[-wiggle, +wiggle]`), `CapLeft`, `Quote`, and `Sell` with demand drop/floor and single-floor total rounding.
- W17-06 (`MarketStock`): implemented `Specials` (3 slots + 2 with big stall, 20% discount, price floors for seeds/crops, no duplicates), `Orders` (2 unlocked annual crops of 2 units at >=30 harvests), and `OrderReward` (`round(sell * count * 1.15)`).
- Added unit tests in `MarketPricingTests.cs` and `MarketStockTests.cs`.
