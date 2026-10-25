# Home Features

To add a new Home feature (like calendar, vet, coloring, shop, decor, toys, or daily gift):

1. Create one C# class in this folder implementing `Cuy.Features.IHomeFeature` (you can inherit from `HomeFeatureBase`).
2. The `Id` property must be identical to the JS feature folder name (`web/home/features/<Id>`).
3. For JS to C# messages, use the naming convention `<id>_<verb>`. Handle them in `HandleMessage`. Return `true` if handled.
4. For state, add your feature's data to the dictionary in `AddState` using the `Id` as the key.
5. **Never trust prices from JS.** If the user buys something, look up the price from `assets/data/items.json` via `ItemCatalogLoader`.
6. Use `BrainController.Instance.Pet` to modify the pet's state or inventory.
7. Call `BrainController.Instance.Session.AutoSaver.SaveNow()` after important changes (purchases, rewards).
8. If a state changes outside of a message (e.g. from `Tick`), call `HomeWindow.NotifyStateChanged()` to update the UI.