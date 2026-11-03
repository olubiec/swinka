# W25-01: RoomsFeature: pig rooms, storage, variants, names, transfer
Zmieniaj: src/Cuy/dotNet/Features/RoomsFeature.cs
Wymagane: src/Cuy/dotNet/Features/RoomsFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can read the pig rooms and run the new room actions.
Depends on: W24 merged.
Facts: W19-02 created `RoomsFeature` (state key `rooms`). Extend it (pattern unchanged, JS never computes prices or comfort). Add to the state: `pigRooms: [ { pigId, name, roomId, displayName, level, maxLevel, nextLevelCost, cols, rows, memorial, portrait } ]` (`portrait` = `sprites/portraits/<id>.png` for named pigs, null otherwise), `storage: [ { itemId, free } ]`, `variantNames: [..]`, `variantPrices: { <itemId>: [0, p1, p2, p3] }`, `variantsUnlocked: [ '<itemId>:<variant>' ]`, `comfortByPig: { <pigId>: { score, cap, moodFactor } }`; `layouts` also contains `pig:<id>` keys with `name` and per item `variant`. New messages: `room_variant { place, uid, variant }`, `room_variant_unlock { itemId, variant }`, `room_rename { place, name }`, `room_transfer { from, to, uid, x, y }`, and `room_upgrade { place }` goes through the existing `place_upgrade` path (document which). Results map to short English toasts. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the state and the three messages using `Pet.SetVariant`, `RenameRoom`, `TransferItem`, `StorageList`, `RoomDisplayName` and `PlaceUnlock.Upgrade` (planned names).
2. Unknown ids are ignored; return true only for handled messages.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
