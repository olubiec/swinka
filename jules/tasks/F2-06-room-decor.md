# Task F2-06: Decorate the Home room – decor items, equip panel, rendering

Read `AGENTS.md` and `jules/contracts.md` (section **decor**) first and follow them exactly.
Requires F1-01 (items_*.json, plugins), F1-04 (`window.CuyRoom` layers), F1-13 (icons) merged.

## Goal
A big, long-term clover sink: wallpapers, floors, rugs, plants, pictures and lamps for the pig's room in Home. Bought
in the shop (category `decor`, shown automatically by the reworked shop), equipped here.

## Files you may add
`assets/data/items_decor.json`, `src/Cuy/dotNet/Features/DecorFeature.cs`, `src/Cuy.Core/Decor/DecorState.cs`,
`src/Cuy.Core/GameState.Decor.cs`, `tests/Cuy.Core.Tests/DecorStateTests.cs`, `web/home/features/decor/feature.js`,
`web/home/features/decor/feature.css`. Do not edit other files.

## Items (items_decor.json; all `"category": "decor"`, `"one_time": true`, icon by slot: wallpaper→`wallpaper`,
floor→`floor`, rug→`rug`, plant→`plant`, picture→`picture_frame`, lamp→`lamp`)
- wallpapers (slot `wallpaper`), price 150 each: `wallpaper_mint` (stripes #bfe3c9/#a7d4b5), `wallpaper_peach`
  (dots #f6c9a8 on #f9dcc4), `wallpaper_sky` (clouds #cfe6f7), `wallpaper_lilac` (diamonds #d9c8ef/#c9b3e6),
  `wallpaper_night` (stars on #2e3557), price 250.
- floors (slot `floor`), 120 each: `floor_wood_light`, `floor_tiles_checker`, `floor_grass`, `floor_carpet_red`.
- rugs (slot `rug`), 80 each: `rug_round_pink`, `rug_stripes`, `rug_heart`.
- plants (slot `plant`), 60 each: `plant_fern`, `plant_cactus`, `plant_flowers`.
- pictures (slot `picture`), 100 each: `picture_pig` (a framed pixel pig), `picture_sunset`, `picture_carrot`.
- lamps (slot `lamp`), 140 each: `lamp_mushroom` (warm glow), `lamp_star`.
Each item: `name`, `description` (one short sentence), `price`, and `look` (colours/pattern keys your renderer uses).

## Core
`DecorState { Dictionary<string, string> Equipped }` (lazy property `Decor` in `GameState.Decor.cs`), methods in the
same file or a static helper: `Equip(state, slot, itemId)` (validates slot names), `Unequip`. Tests: equip/unequip,
unknown slot rejected, JSON round-trip, old save without Decor loads.

## C# `DecorFeature` (`Id = "decor"`)
`AddState` per contract; `HandleMessage("decor_equip")`: only items with `category` decor, matching slot, owned (inventory
> 0); null = remove; save; refresh state.

## Web `features/decor`
1. Rendering (always active, also when the panel is closed): register `CuyRoom` layers on load:
   `wallpaper` (z -20, sets `scene.skipDefaultWall` when equipped; draws the pattern over the wall area 0..96 px),
   `floor` (z -10, `skipDefaultFloor`, floor area 96..130), `rug` (z -5, ellipse/shape on the floor under the pig area),
   `picture` (z -15, on the wall top-centre, 22x16 frame with a tiny pixel image), `plant` (z 5, bottom-right corner,
   pixel pot + leaves, gentle 2-frame sway), `lamp` (z 6, top-left corner, with a soft radial glow that is stronger in
   the evening 18:00-07:00 local time). Draw procedurally with `ctx.fillRect` pixel art (no images), crisp pixels.
   Read the equipped ids from `state.decor.equipped` (via `onState`) and the `look` data from the catalog in
   `state.shop.items` if present, else from your own fallback table in feature.js.
2. Panel (More → Decorate, `order: 30`, icon `icon-wallpaper`): one row per slot with the owned items as small preview
   swatches + "None"; tap = `decor_equip`; a live mini preview of the room (draw the layers into a small canvas). If
   nothing is owned: "Buy decorations in the Shop → Home tab".
3. Mock mode: demo state with two owned items.

## Checks
Core tests; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; `node --check`; smoke test with
`"decor"` temporarily listed (revert). Screenshots of 3 different room looks in the PR.

When done, open a pull request against `main` titled `F2-06: Room decorations`.
