# PK-R46 log: outdoor objects as movable instances research
Decisions: fixtures (stalls, barn, plots, burrow) movable:true, removable:false (error fixture_locked); defaults use UID fx:<scene>:<id>.
bg_clean flag per scene (default false) in place_scenes.json controls switching from static to instance blockers.
Instance blockers set behindLine: -9999 so canvas-pig.js drawBackgroundBlockersOverPig does not slice clean backgrounds.
Farm and market need grid levels [{cols:16, rows:9}] in assets/data/places.json to enable placement and sizing.
WorldAssetsTests.cs added to PK-P46a Zmieniaj to skip art: missing and accept heights <= cells*16 (e.g. 48x40 stalls).
Outdoor items in world_items.json need places or kind: outdoor to populate the Edit mode drawer.
API & fields: WorldState.OutdoorSeeded (HashSet<string>), OutdoorDefaults, OutdoorSeed.Seed, Balance.OutdoorInstancesActive.
Prompt fixes for PK-P46a/b/c/t1/t2 documented in docs/opt/foundations/R46.md section 6.
Verification passed: node tools/qa/foundation-check.js docs/opt/foundations/R46.md 6 (FOUNDATION OK).
