# Task F1-01: C# side of Home features (plugin interface) + several item files

Read `AGENTS.md` first and follow it. Requires F0-01 (SDK-style project) to be merged: new .cs files compile without
editing the csproj.

## Goal
New features (calendar, vet, coloring, shop, decor, toys, daily gift) each need: their own Home messages, their own data
in the Home state, and a periodic tick. Today all of that lives in `src/Cuy/dotNet/HomeWindow.cs` (one big switch and
one anonymous state object), so parallel work would conflict. Add a plugin interface so each feature is one new file.

## Files you may change / add
`src/Cuy/dotNet/HomeWindow.cs`, `src/Cuy/dotNet/BrainController.cs` (only the Update tick call),
`src/Cuy/dotNet/Program.cs` (only the init call), `src/Cuy.Core/ItemCatalog.cs`, `src/Cuy/dotNet/ItemCatalogLoader.cs`,
new: `src/Cuy/dotNet/Features/IHomeFeature.cs`, `src/Cuy/dotNet/Features/HomeFeatures.cs`,
`src/Cuy/dotNet/Features/PingFeature.cs`, `src/Cuy/dotNet/Features/README.md`, tests in `tests/Cuy.Core.Tests/ItemCatalogMultiFileTests.cs`.

## Specification
1. `src/Cuy/dotNet/Features/IHomeFeature.cs`, namespace `Cuy.Features`:
   ```csharp
   public interface IHomeFeature
   {
       string Id { get; }   // same as the web folder web/home/features/<Id> when there is a web part
       void Initialize(BrainController brain);                                   // once, after the game loaded
       bool HandleMessage(string type, JObject message, BrainController brain);  // true = handled
       void AddState(IDictionary<string, object> state, BrainController brain);  // add keys to the Home state
       void Tick(TimeSpan gameElapsed, BrainController brain);                   // every BrainController.Update
   }
   public abstract class HomeFeatureBase : IHomeFeature { /* virtual no-op implementations, abstract Id */ }
   ```
2. `HomeFeatures.cs` (static): `LoadAll()` finds every non-abstract class implementing `IHomeFeature` in the Cuy
   assembly by reflection (public parameterless constructor), sorted by `Id`; `All`; `InitializeAll(brain)`;
   `Dispatch(type, message, brain)` (first feature returning true wins; exceptions are caught and logged with
   `BrainController.Log("[Feature <id>] ...")`); `AddAllState(dict, brain)`; `TickAll(elapsed, brain)` (each feature in
   try/catch). Log the loaded feature ids once.
3. `Program.cs`: after `BrainController.Initialize(...)`: `HomeFeatures.LoadAll(); HomeFeatures.InitializeAll(BrainController.Instance);`
4. `BrainController.Update()`: after the managers' updates call `HomeFeatures.TickAll(gameElapsed, this)`.
5. `HomeWindow.cs`:
   - Build the state as `Dictionary<string, object>` (convert the current anonymous object 1:1, same keys and values),
     then `HomeFeatures.AddAllState(dict, brain)`, add `features` = names of folders in `<exe>/web/home/features` that
     contain `feature.js` (sorted), then serialize with `JsonConvert` as today.
   - In the message switch, `default:` → `HomeFeatures.Dispatch(type, obj, BrainController.Instance)`; if it returns
     true, refresh the state as for the other messages.
   - Add `public static void PostToPage(object payload)`: serializes and posts a non-state message to the page if the
     WebView is ready (used e.g. for `{ type: 'coloring_progress', ... }`). Safe to call from any thread (marshal to UI).
6. `PingFeature.cs` (Id `hello`): handles `hello_ping` by logging `[Feature hello] ping` and posting
   `{ type: 'hello_pong' }` with `PostToPage`. It pairs with the example web feature from F0-02; a later task removes both.
7. Several item files: `ItemCatalog.LoadDefault()` (Core) and `ItemCatalogLoader` (desktop) load `assets/data/items.json`
   AND every `assets/data/items_*.json` (alphabetical), merging the `items` arrays; a later file may not redefine an id
   that already exists (log an error and keep the first). Add `ItemCatalog.LoadJsonFiles(IEnumerable<string> jsonTexts)`
   (or similar) so tests can merge without disk access.
8. `src/Cuy/dotNet/Features/README.md`: how to add a feature (one class, message naming `<id>_<verb>`, state key = Id,
   never trust prices from JS, use `BrainController.Instance.Pet` and `Session.AutoSaver.SaveNow()` after important
   changes, `HomeWindow.NotifyStateChanged()` after state changes outside a message).

## Checks (must pass)
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` (Linux) and
  `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` (new tests: two JSON texts merge; duplicate id keeps the first).
- The Home state JSON keeps every existing key (compare the key list before/after in the PR description).

When done, open a pull request against `main` titled `F1-01: Home feature plugins (C#) and items_*.json`.
