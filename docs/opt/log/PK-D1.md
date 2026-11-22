Status: DONE
Decisions: Implemented DesktopPropCatalog (HomeEconomyConfig pattern), DesktopProp, DesktopPropResult, and DesktopPropOps in Cuy.Core.World without modifying WorldState.cs or Balance.cs per R39 Prompt fixes.
Decisions: DesktopPropOps.PutOnDesktop checks FreeCount <= 0 (NotOwned) before MaxOnDesktop (Full); ToRoom restores prop to desktop if RoomLayoutOps.Place refuses; FromRoom returns Stored when desktop is full.
API: DesktopPropCatalog (Current, MaxOnDesktop, PropIds, All, CreateDefault, Load, LoadDefault, FromWorldCatalog, IsProp, Find, RoomItemFor, InventoryFor).
API: DesktopPropOps (OwnedCount, PlacedInRoomsCount, OnDesktopCount, FreeCount, PutOnDesktop, MoveOnDesktop, RemoveFromDesktop, ToRoom, FromRoom).
Data: assets/data/desktop_props.json (version 1, max_on_desktop 6, 8 props).
Stubs: None (WorldState, GameState, RoomLayoutOps, WorldItemCatalog already exist).
Tests: DesktopPropCatalogTests (3) and DesktopPropOpsTests (9) — 12/12 passed.
