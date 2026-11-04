# PK-30a log
- Repo files listed as Zmieniaj did not exist (HomeStore.cs, Pet.Store.cs, 3 test files); created them. Store tests: 19 passed (Release, filter).
- Decisions: `Pet.Purchase(kind,id,count)` plus `out int cloversSpent` overload; `StoreResult` is an enum. Plot packs and orchard slots are one row each, id `next`. Owned non-repeatable rows are locked with reason `owned`; `max_level` for maxed levels. Cans with cost 0 are not sold. Decor comes from the ItemCatalog argument (category `decor`).
- Differences from plan: `gate_garden` is an item id (no flag), excluded by id; `prop_of`/`signature_of` via `PropOf`/`SignatureOf`. No pig room upgrade method exists, so `pig_room_level` rows are listed but purchase returns Unknown.
- Package override: the total with five pigs is 20063, not above 35000; bound set to 19059 (real total minus 5 percent).
- Undone: comparison with the docs/WORLD.md sink table; W30-06 3 percent check against economy-sim (not read, out of scope); decor purchase test (ItemCatalog.Default not injected); pig room purchase test.
