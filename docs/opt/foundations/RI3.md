# RI3: Integration Analysis — Core, C# and Data (post F2-2)

## 1. Build i testy po F2-2 (liczby, awarie, winowajca)

- **Build (`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`):** PASS, 0 ostrzeżeń, 0 błędów.
- **Testy Core (`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`):** 1167 łącznie: **1162 przeszło**, **5 padło**, 0 pominięto (26 s).
- **Padające testy (5):**
  1. `Cuy.Core.Tests.WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50` (`tests/Cuy.Core.Tests/WorldItemCatalogTests.cs:41`): `Assert.Equal(75, ...)` dostało `80`. **Winowajca:** `PK-P46a` (`docs/opt/log/PK-P46a.md:17`) — dopisano 5 pozycji do `assets/data/world_items.json` (`willow_tunnel`, `barn_hay`, `stall_basic`, `stall_big`, `order_board`), a test był poza `Zmieniaj`.
  2. `Cuy.Core.Tests.PigPinMessagesTests.PlacesPigPin_UnknownField_IsInvalid` (`PigPinMessagesTests.cs:70`): `Assert.True(res.IsInvalid)` dostało `False`. **Winowajca:** `PK-P5b` (`docs/opt/log/PK-P5b.md:5-7`; `MessageValidator.cs` nie odrzuca nieznanych pól, leży poza `Zmieniaj`).
  3. `Cuy.Core.Tests.PigPinMessagesTests.PlacesPigPin_VeryLongPigId_IsInvalid` (`PigPinMessagesTests.cs:84`): `Assert.True(res.IsInvalid)` dostało `False`. **Winowajca:** `PK-P5b` (`FieldRule.Id` w `src/Cuy.Core/Input/IMessageRuleSet.cs:67-68` ma `maxLen: 128`, test używa długości 100).
  4. `Cuy.Core.Tests.PigPinMessagesTests.PigsDesktopPet_UnknownField_IsInvalid` (`PigPinMessagesTests.cs:174`): jak pkt 2 (**`PK-P5b`**).
  5. `Cuy.Core.Tests.PigPinMessagesTests.PigsDesktopPet_VeryLongPigId_IsInvalid` (`PigPinMessagesTests.cs:188`): jak pkt 3 (**`PK-P5b`**).
- **Porównanie z `docs/opt/log/baseline-smoke.txt`:** `baseline-smoke.txt` (09.11.2026) dotyczy wyłącznie testów JS Playwright (`ux-all.js`, 6 FAILów: `26_my_pigs`, `world_places_bar`, `world_pigs`, `roaming_house_plan_windows`, `roaming_window_switches_tab`, `roaming_home_switch`).
- **Status logów F2-2 (`docs/opt/log/PK-*.md`):** wszystkie 18 logów istnieje (brak brakujących); 2 `BLOCKED` (`PK-P5b` na 4 testach `PigPinMessagesTests`, `PK-P47r` na `ux-p34-pig-walk.js` W3/W8), `PK-P24c` = `NO-OP`, pozostałe 15 = `OK`.

## 2. Rzeczywisty kształt fixture_locked i stanu instancji; plan PK-P46c

- **Błąd `fixture_locked` w Core:** `RoomLayoutOps.Remove(RoomLayout room, string uid, out string error)` (`src/Cuy.Core/World/RoomLayoutOps.cs:257-278`) sprawdza `if (!placed.Removable || OutdoorDefaults.Current.IsLockedFixture(placed.Uid))` (`:271`), ustawia `error = "fixture_locked"` (`:273`) i zwraca `false`. Przeciążenie `Remove(RoomLayout room, string uid)` (`:252-255`) odrzuca `error` (`out _`).
- **Luka w przekazywaniu do `RoomsFeature.cs`:** `Pet.RemoveItem(string place, string uid)` (`src/Cuy.Core/Pet.Rooms.cs:237-246`) wywołuje `RoomLayoutOps.Remove(room, uid)` (`:245`) i zwraca sam `bool`. `RoomsFeature.cs:459-470` (`room_remove`) wywołuje `bool ok = pet.RemoveItem(place, uid);` (`:465`) i wysyła toast tylko przy `ok == true` (`:466-469`), więc błąd `fixture_locked` ginie. Ponieważ `Pet.Rooms.cs` jest poza `Zmieniaj` paczki `PK-P46c`, `RoomsFeature.cs` w ścieżce `room_remove` przy `!ok` może sprawdzić `world.Rooms.TryGetValue(place, out var room)` i wywołać `RoomLayoutOps.Remove(room, uid, out string error)` (lub sprawdzić `!placed.Removable || OutdoorDefaults.Current.IsLockedFixture(uid)`): gdy `error == "fixture_locked"`, wysłać `HomeWindow.PostToPage(new { type = "toast", text = RoomsMessages.ToastFor("fixture_locked") })`.
- **Stan instancji wysyłany do JS (`RoomsFeature.cs:105-113`):** dziś serializuje wyłącznie `{ uid, itemId, x, y, flip, variant }` — **brak** pól `movable` i `removable` z `PlacedItem.Movable` / `PlacedItem.Removable` (`src/Cuy.Core/World/WorldState.cs:157-158`). `PK-P46c` powinien dopisać `movable = it.Movable, removable = it.Removable` w `RoomsFeature.cs:105-113`.
- **Flagi `Balance` i kolejność `GameSession.Open`:** `Balance.OutdoorInstancesActive` (`src/Cuy.Core/Balance.cs:117`, domyślnie `false`) jest włączane w `GameSession.Open` (`src/Cuy.Core/GameSession.cs:45`). Kolejność w `GameSession.Open`: `EnsureRosterInitialized` (`:50`) -> `EnsureWorld` (`:51`) -> `if (balance.OutdoorInstancesActive)` pętla po `OutdoorSeed.DefaultPlaces` wywołująca `OutdoorSeed.Seed(state.World, placeId, balance: balance)` (`:52-58`) -> `EnsureMusic` (`:59`) -> `EnsurePigRooms` (`:60`).
- **Plan `PK-P46c` (`RoomsMessages.cs` + `RoomsFeature.cs`):**
  - `FieldRule.Id` (`src/Cuy.Core/Input/IMessageRuleSet.cs:37,67-68`) ma wzorzec `^[a-z0-9_:]+$` i `maxLen: 128`, więc `place` (`garden`, `park`, `farm`, `market`, `pig:<id>`) oraz `uid` (`fx:<scene>:<id>`) przechodzą, a `..`, puste, `null`, `>128` znaków i znaki nowej linii są odrzucane.
  - **Poprawka w `src/Cuy.Core/Input/Validation/RoomsMessages.cs:14-15,21-22`:** `room_place` i `room_move` mają dziś `FieldRule.Int("x", -1, 200)` oraz `FieldRule.Int("y", -1, 200)`. Sceny zewnętrzne mają szerokość `256` px (`PK-P47a.md`), więc współrzędne pikselowe `x` w `[201..256]` zostałyby odrzucone. Należy podnieść górny limit `x` do `256` (np. `FieldRule.Int("x", -1, 256)`).
  - **Nowa metoda `RoomsMessages.ToastFor(string errorCode)`:** czysta, statyczna w Core; dla `"fixture_locked"` zwraca `"You can move this fixture, not stash it."` (40 znaków <= 60, bez znaków sterujących); dla dowolnego innego kodu lub `null` zwraca `"Action not available."` bez rzucania wyjątku.

## 3. Plan PK-P25c: fizyka lamp wg R25 na rzeczywistym kodzie

- **Rzeczywisty stan `RoomLayoutOps.CanPlace` (`src/Cuy.Core/World/RoomLayoutOps.cs:32-131`):**
  - `:56-57`: `int w = item.W > 0 ? item.W : (item.Width > 0 ? item.Width : 1);` i analogicznie `h`.
  - `:65-88`: gdy `wallRows > 0`, `layer == "wall"` wymaga `y >= 0 && y + h <= wallRows` (`:69`), pozostałe warstwy wymagają `y >= wallRows` (`:76`).
  - `:115-125`: dla kolizji `Overlap` liczy `otherW` / `otherH` z `otherDef.W` / `otherDef.H` (`:115-116`) i prostokąt `[x, x+w) x [y, y+h)` w obrębie `sameLayer`.
- **Rzeczywisty stan `WorldItemCatalog.cs` (`src/Cuy.Core/World/WorldItemCatalog.cs:10-73,296-345`):**
  - `WorldItemDefinition` nie ma jeszcze `FootW`, `FootH`, `SpriteH` ani właściwości `EffectiveFootW`, `EffectiveFootH`, `EffectiveSpriteH`. `WorldItemCatalog.Load` (`:296-345`) czyta wyłącznie `w` i `h`.
  - **Uwaga do `Zmieniaj`:** `PK-P25c` musi dodać te pola do `WorldItemCatalog.cs` oraz użyć `EffectiveFootW`/`EffectiveFootH` w `RoomLayoutOps.CanPlace` (`:56-57,115-116`) i `RoomsFeature.ResolveGridCoordinates` (`src/Cuy/dotNet/Features/RoomsFeature.cs:608-609`, patrz sekcja 6).
- **Zmiany danych (`R25.md` sekcja 3):**
  - `assets/data/world_items.json`: dla `lamp_mushroom` i `lamp_floor` dopisać `"foot_h": 1, "sprite_h": 2`; dla `lamp_arc` dopisać `"foot_h": 1, "sprite_h": 3`. Pozostałe przedmioty bez zmian (domyślne `FootW => W`, `FootH => H`, `SpriteH => H`).
  - `assets/world/atlas.json`: dla `lamp_arc` zmienić `"anchor": [16, 48]` na `"anchor": [16, 16]`.
- **Wpływ na `tests/Cuy.Core.Tests/RoomLayoutOpsTests.cs` (`:1-186`):** wszystkie 9 testów tworzy definicje przez `CreateItem(...)` bez `FootW`/`FootH`/`SpriteH`, więc `EffectiveFootW == W` i `EffectiveFootH == H`. **0 kolizji** z istniejącymi asercjami.
- **Wpływ na stare zapisy:** `lamp_mushroom` i `lamp_floor` mogły stać wcześniej wyłącznie w `y = 2..5`; przy `foot_h = 1` wszystkie te pozycje nadal spełniają `y >= 2 && y + 1 <= 7`.

## 4. Luki katalogu i atlasu (lista id)

- **Już dopisane przez `PK-P46a` (`outdoor_defaults.json`):** wszystkie 18 unikalnych `itemId` z `assets/data/outdoor_defaults.json` są już obecne zarówno w `assets/data/world_items.json`, jak i w `assets/world/atlas.json` (`missing in wi: []`, `missing in at: []`; `PK-P46a` dodał `willow_tunnel`, `barn_hay`, `stall_basic`, `stall_big`, `order_board`).
- **Brakujące id z `assets/world/**` do dopisania w `PK-P25c` (wg `R35.md` sekcja 2B, zweryfikowane z repo):**
  - Do `world_items.json` **oraz** `atlas.json`:
    - `campfire` (`2x2`, `floor`, `garden/campfire_base.png`)
    - `grass_tuft_1`, `grass_tuft_2`, `grass_tuft_3`, `grass_tuft_4` (`1x1`, `ground`, `garden/grass_tuft_1..4.png`)
    - `stall_veg`, `stall_fruit`, `stall_seeds` (`3x3`, `floor`, `market/stall_{veg,fruit,seeds}.png`)
    - `plot_empty`, `plot_watered`, `plot_sprout`, `plot_ripe` (`2x2`, `ground`, `farm/plot_{empty,watered,sprout,ripe}.png`)
    - `poster_1`, `poster_2`, `poster_3` (`1x2`, `wall`, `market/poster_1..3.png`)
    - `promo_1`, `promo_2`, `promo_3` (`2x1`, `wall`, `market/promo_1..3.png`)
  - Tylko do `world_items.json` (wpisy w `atlas.json` już istnieją):
    - `tunnel_playground` (`3x2`, `floor`, `park/tunnel_playground.png`)
    - `plot_lawn` (`1x1`, `ground`, `farm/plot_lawn.png`)
    - `plot_orchard` (`1x1`, `ground`, `farm/plot_orchard.png`)
  - **Wyjątek (`fruit_tree`, `farm/fruit_tree.png`, `40x64`):** `tests/Cuy.Core.Tests/WorldAssetsTests.cs:108` wymaga `size[0] == cells[0] * 16` (`40 != 48`). Ponieważ `WorldAssetsTests.cs` jest poza `Zmieniaj`, `PK-P25c` **pomija** `fruit_tree` (lub oznacza `"art": "missing"`), aby nie zepsuć `WorldAssetsTests`.

## 5. Wyniki check-assets i data-check

- `node tools/qa/check-assets.js` -> **`ASSETS OK`** (kod wyjścia 0).
- `node tools/qa/data-check.js` -> **`placeable price sum: 8850`**, **`data-check: ok (5 pigs, 15 crops, 80 placeables, 5 pig room themes)`** (kod wyjścia 0).
- **Co `PK-P25c` ma zapewnić:** po dopisaniu 21 brakujących pozycji z sekcji 4 do `world_items.json` i `atlas.json` oraz pól `foot_h`/`sprite_h` dla lamp, `node tools/qa/check-assets.js` i `node tools/qa/data-check.js` oraz `WorldAssetsTests` muszą nadal przechodzić (uwaga: `WorldItemCatalogTests.cs:41` już teraz pada `80 != 75` po `PK-P46a` i nie wolno go zmieniać w `PK-P25c`).

## 6. Prompt fixes

- **`PK-P46c`:**
  1. `RoomsMessages.cs`: podnieś górny limit `x` w `room_place` i `room_move` z `200` na `256` (`FieldRule.Int("x", -1, 256)`), aby sceny plenerowe `256x144` przechodziły walidację; dodaj `public static string ToastFor(string errorCode)` zwracające `"You can move this fixture, not stash it."` dla `"fixture_locked"` i `"Action not available."` w przeciwnym razie.
  2. `RoomsFeature.cs`: w `AddState` (`:105-113`) dopisz `movable = it.Movable, removable = it.Removable`; w `room_remove` (`:465-469`), gdy `pet.RemoveItem(place, uid)` zwróci `false`, sprawdź `RoomLayoutOps.Remove(room, uid, out string error)` (lub `!placed.Removable || OutdoorDefaults.Current.IsLockedFixture(uid)`) i przy `"fixture_locked"` wyślij `HomeWindow.PostToPage(new { type = "toast", text = RoomsMessages.ToastFor("fixture_locked") })`.
- **`PK-P25c`:**
  1. `Zmieniaj`: rozszerz o `src/Cuy.Core/World/WorldItemCatalog.cs` i `src/Cuy/dotNet/Features/RoomsFeature.cs` (zgodnie z `R25.md` sekcja 7: potrzebne na `FootW`/`FootH`/`SpriteH`, `EffectiveFootW`/`EffectiveFootH`/`EffectiveSpriteH` oraz `ResolveGridCoordinates` w `RoomsFeature.cs:608-609`).
  2. Sekcja 4: **pomiń** `fruit_tree` (`40x64`) w `world_items.json`/`atlas.json` (albo oznacz `"art": "missing"`), bo `WorldAssetsTests.cs:108` nadal wymusza `size[0] == cells[0] * 16`.
  3. Weryfikacja: `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50` (`WorldItemCatalogTests.cs:41`) padał już przed `PK-P25c` (`80 != 75` po `PK-P46a`); nie edytuj `WorldItemCatalogTests.cs`, odnotuj to w logu `PK-P25c.md`.
