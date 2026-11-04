# PK-17b: Farm engine and farm expansion

- **W17-03 (`FarmEngine`)**: Implemented pure farm engine (`Plant`, `Water`, `WaterMany`, `IsRipe`, `TimeLeft`, `Harvest`, `HarvestAll`, `PlantOrchard`, `Tick`, `HarvestOrchard`) using deterministic great harvest RNG seeded by `plot * 7919 + PlantedUtc.Ticks` and 20% water time cut.
- **W17-04 (`FarmExpansion`)**: Implemented pure upgrade pricing and state helpers (`NextPackCost`, `ApplyPack`, `NextOrchardCost`, `ApplyOrchardSlot`, `CanBuyCan`, `ApplyCan`, `ApplySprinkler`, `PlotsPerWaterUse`).
- **Missing W16 types**: `FarmConfig`, `CropDefinition`, `CropKind`, `FarmState`, `PlotState`, and `OrchardState` from W16 were absent from `src/Cuy.Core/World/` in this branch; included them inside `src/Cuy.Core/World/FarmEngine.cs` (namespace `Cuy.Core.World`) without touching `WorldState` or files outside `Zmieniaj`.
- **Undone**: None. All W17-03 and W17-04 tests pass.
