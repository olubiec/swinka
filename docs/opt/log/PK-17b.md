# PK-17b: Farm engine and farm expansion log
- Implemented FarmEngine (W17-03): plant (with unlock & annual checks), water (20% cut, once per cycle), ripeness, seeded great harvest calculation, orchard tick/stock capped at MaxStock, HarvestAll.
- Implemented FarmExpansion (W17-04): NextPackCost/ApplyPack (5 packs up to 24 plots, then -1), NextOrchardCost/ApplyOrchardSlot (4 slots, then -1), CanBuyCan/ApplyCan (can_1 default, can_2 progression), ApplySprinkler (single application), PlotsPerWaterUse (1, 4 after can_2).
- Added overloads accepting DateTime nowUtc in different positions for seamless caller ergonomics.
- Created tests in FarmEngineTests.cs and FarmExpansionTests.cs covering all requirements.
- Differences from planned names: none.
- Left undone: none.
