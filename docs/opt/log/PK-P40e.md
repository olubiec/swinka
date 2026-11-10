# PK-P40e: Upgrade and unlock row in the edit drawer
- Drawer header row: displays scene title (`#editDrawerTitle`), level (`#editDrawerLevel`), upgrade button (`#editDrawerUpgradeBtn`), unlock button (`#editDrawerUnlockBtn`).
- Fields used: `state.places.places[*].level|nextLevelCost|unlockCost`, `state.places.order[*].locked|title`, fallback to `places.json` definitions.
- Wiring: `#editDrawerUpgradeBtn` calls `CuyPlaces.upgrade(id)` -> `{type:'place_upgrade',id}`; `#editDrawerUnlockBtn` calls `CuyPlaces.unlock(id)` -> `{type:'place_unlock',id}`.
- State checks: poor players get disabled button with missing clovers reason; max level hides upgrade button; locked scenes show unlock button with cost.
- Edit button on `#placesBar` allows opening the drawer in locked scenes to let players unlock them.
- Verification: node --check + Playwright scenarios U1-U5 all green.
