# RI5: Integration Analysis — EditHistory, Run, Props & C# Wiring

## 1. Rozbieżności: kontrakty `run` / `props` vs kod C# i JS

### Garden Run (`docs/contracts/run.md` vs `RunFeature.cs`, `RunMessages.cs`, `features/run/*`)

| Obszar | Kontrakt (`docs/contracts/run.md`) / R38 | Kod w repo (`plik:linia`) | Wpływ / akcja |
|---|---|---|---|
| Stan `state.run` | `available, valid, reason, cells, capacity, out, candidates, verdict` (`run.md:8-25`) | Zgodne w `RunFeature.cs:91-106`; `since` UTC ISO-8601 (`:68`), `hoursToday` zaokrąglone (`:69`) | Brak rozbieżności |
| `RunMessages.Rules` | Kanoniczne `run.out`, `run.in`; aliasy `run_out`/`run_in` (`run.md:39-40`) | `RunMessages.cs:15-16` ma tylko `run.out`, `run.in`; `RunFeature.cs:111-114` i `mock.js:55-58` akceptują też `run_out`/`run_in` | Wysyłać wyłącznie `run.out`/`run.in` (jak `feature.js:127,133`); `MessageValidator` (`UNVERIFIED`) może odrzucać aliasy |
| Walidacja `pigId` | `1..64` zn. (`run.md:39-40`) | `RunMessages.cs:34` sprawdza długość przed `.Trim()` (`RunFeature.cs:126`); błąd w `RunFeature.cs:121-124` wraca bez toasta/logu | Spójne dla czystych ID; ewentualny log jak `PropsFeature.cs:102` |
| Nieznany / `memorial` `pigId` | `memorial` nie może wyjść (`run.md:34`) | `RunFeature.cs:167-171` odrzuca cicho (`return true`) | Zgodne z listą toastów w `run.md:44-47` |
| Zapis wybiegu | Docelowo `WorldState.Run` (`R38:116-125`) | `RunFeature.cs:22-25` trzyma `_outSinceUtc`, `_hoursToday`, `_moodCreditedToday`, `_dayLocalDate` tylko w pamięci | Restart gry resetuje wybieg (ryzyko w §4) |
| `features/index.json` | `R38:165` (`PK-APP3`) dopisuje `"run"` | `web/home/features/index.json` (17 pozycji) nie zawiera `"run"` | `PK-APP3` dopisuje `"run"` |
| `features/run/feature.js` i `mock.js` | `CELL_PX=16`, `run_overlay`, toasty | `feature.js:4,143-160` rysuje pola `16x16` i kwadraty `#ff9f45` (bez ruchu sprite'a); `mock.js:29-45` nie emituje toastów przy błędzie | Działa dla lvl 1 (`16x9`); lvl 2 (`20x10`, `R38:21`) wymaga weryfikacji skali |

### Desktop Props (`docs/contracts/props.md` vs `PropsFeature.cs`, `PropsMessages.cs`, `DesktopPropsOverlay.cs`)

| Obszar | Kontrakt (`docs/contracts/props.md`) / R39 | Kod w repo (`plik:linia`) | Wpływ / akcja |
|---|---|---|---|
| Stan `state.props` | `max, desktop, inRooms, free` (`props.md:5-36`) | Zgodne w `PropsFeature.cs:82-88` | Brak rozbieżności |
| `PropsMessages.Rules` | `props.{place,move,remove,toRoom,fromRoom}` (`props.md:40-46`) | `PropsMessages.cs:17-24` bez `FieldRule` dla `double` `x, y` (`R39:135`) i bez aliasów `prop_*`; `PropsMessages.Validate` (`:30-70`) waliduje wszystko; `toRoom` ma `[-1,200]` (`:57-58`) vs `RoomsMessages.cs:14-15` `[-1,512]`/`[-1,256]` | W JS używać `props.*`; `PropsFeature.cs:99` woła `PropsMessages.Validate` |
| Brakujący toast `Stored` | `props.md:52`: `"Put back on your desktop"` | `PropsFeature.cs:189-193` dla `Stored` wysyła `"The desktop is full"` (`"Put back on your desktop"` nie występuje); `UnknownItem`/`Disabled`/`NotFound` (`:178-206`) milczą | Do ew. korekty w `PropsFeature.cs` (poza `PK-CS3`) |
| `PropsChanged` vs `DesktopPropsOverlay` | `DesktopPropsOverlay.Update(IReadOnlyList<DesktopPropView>)` (`R39:144`) | `PropsFeature.PropsChanged` emituje `IReadOnlyList<DesktopProp>` (`PropsFeature.cs:16`), nakładka bierze `DesktopPropView` z `SpritePath` (`DesktopPropsOverlay.cs:11-18,85`) | `PK-CS3` mapuje `DesktopProp` -> `DesktopPropView` przez `DesktopPropCatalog.Current.Find(p.ItemId)?.Sprite` |
| Zapis i UI Home | `WorldState.DesktopProps` odroczone (`R39:111`), brak UI (`R39:16`) | `PropsFeature.cs:14` trzyma `_desktop` w sesji; brak `web/home/features/props/` | Zapis i UI poza F3 |

---

## 2. Kotwice dla `PK-PE3` (`edit-panel.js`, `index.html`, `canvas-pig.js`)

Moduły pomocnicze gotowe w repo: `web/home/features/places/edit-history.js:375-380` (`window.EditHistory`), `web/home/lib/draw-budget.js` (`window.DrawBudget`), `web/home/lib/world-sounds.js:14-32,54-90` (`window.WorldSounds`).
**Brak w `web/home/index.html:291-322`**: dodać `<script src="lib/draw-budget.js"></script>` i `<script src="lib/world-sounds.js"></script>` po `sound.js` (`index.html:291`, przed `canvas-pig.js` `:299`) oraz `<script src="features/places/edit-history.js"></script>` przed `edit-panel.js` (`index.html:320`).

### Kotwice w `web/home/features/places/edit-panel.js`
1. **Instancja historii**: przy `_subpanelMode` (`edit-panel.js:16`) utworzyć `_history = window.EditHistory ? window.EditHistory.create() : null;` + helper aktualizujący przyciski Undo/Redo.
2. **Każde `room_*` -> `_history.push(...)`**:
   - `room_place`: `edit-panel.js:706-712` (`onPointerUp`, po `if (valid)` i `localPt`) -> `{ kind: 'place', place: curScene, itemId: _dragState.itemId, x: localPt.x, y: localPt.y }`.
   - `room_remove` (przeciągnięcie do szuflady): `edit-panel.js:762-766` (`onPointerUp`) -> przeliczyć `_itemDragState.origX/origY` przez `toRoomLocalCoords` przed `push({ kind: 'remove', place: curScene, uid, itemId, x: origLocal.x, y: origLocal.y, flip: Boolean(_itemDragState.thing && _itemDragState.thing.flip) })`.
   - `room_move`: `edit-panel.js:772-778` (`onPointerUp`) -> `prevX/prevY` z `toRoomLocalCoords(..., origX, origY)`, `x/y` z `localPt` -> `push({ kind: 'move', place: curScene, uid, prevX, prevY, x: localPt.x, y: localPt.y })`.
   - `room_flip`: `edit-panel.js:1793-1799` (`#editItemFlipBtn` click — uwaga: używa `window.bridge.send`, zamienić na `sendBridge`) -> `push({ kind: 'flip', place: curScene, uid: _selectedUid })`.
   - `room_remove` (`#editItemRemoveBtn` click): `edit-panel.js:1825-1829` -> odczytać `thing = findPlacedThing(uid)` i `toRoomLocalCoords` przed `setSelection(null)` / `sendBridge`.
   - `room_remove` (`Delete`/`Backspace` w `keydown`): `edit-panel.js:2057-2061` -> jak wyżej, zapisać współrzędne przed `sendBridge`.
3. **Resolve UID, rollback, czyszczenie**:
   - `render(state)` (`edit-panel.js:1938-1953`): przy zmianie `_currentSceneId !== curScene` wywołać `_history.clear()`; porównać sygnaturę `state.rooms`, wywołać `_history.acknowledge()` + `_history.resolvePlacedUid(...)` (wysłać zwrócone `room_flip`); przy błędzie/braku zmiany wywołać `_history.rollbackPending()`.
   - Zmiana sceny: `CuyPlaces.openPlace` (`edit-panel.js:2076-2085`) i `#placesPrevBtn`/`#placesNextBtn` (`:2089-2097`) -> `_history.clear()`.
4. **Skróty `Ctrl+Z` / `Ctrl+Y`**: w `keydown` (`edit-panel.js:2026-2064`), przed `Escape`, dodać gałąź `(e.ctrlKey || e.metaKey)` (poza `INPUT`/`TEXTAREA`/`isContentEditable`) dla `z` (`undo`, z `shiftKey` -> `redo`) i `y` (`redo`), wysyłającą wiadomości przez `sendBridge`.
5. **Pasek Edit, komfort, `Residents`, `room_buy`**:
   - Przyciski `#editUndoBtn`, `#editRedoBtn`, `#editResidentsBtn` (`aria-pressed`): w `actionsHtml` (`edit-panel.js:1673-1685`), gałęzi aktualizacji istniejącego `#editDrawer` (`:1693-1724`) i `bindHeaderActions` (`:1533-1600`); wyeksportować `getShowResidents`/`setShowResidents` w `CuyEdit` (`:2108-2120`).
   - Miernik komfortu `#editComfortMeter`: w `.edit-drawer-header-left` (`:1697-1700, 1740-1743`), aktualizowany w `renderHeader` (`:1361-1445`) przez `EditHistory.computeComfortDisplay(state && state.rooms, curScene)`.
   - Zakup kart `owned === 0`: w `renderStripItems` (`:1854-1869`) i `onPointerDown` (`:370-380`) dodać przycisk `Buy` wysyłający `{ type: 'room_buy', itemId }` (zablokowany przy `clovers < price`).

### Kotwice w `web/home/canvas-pig.js`
- `loop(now)` (`canvas-pig.js:2917-2926`): throttling ukrytej karty przez `DrawBudget.shouldDrawFrame(now, this._lastDrawMs || 0, document.hidden)` (`hiddenFps = 30`).
- `render()` (`canvas-pig.js:3227-3401`): `flats` (`:3275`) i `standing` (`:3281`) przez `DrawBudget.selectItems` + `DrawBudget.capAnimated` (w `drawThing` `:1875`); światła (`:3306,3370,3382,3809`, `drawThing` `:1880`) przez `DrawBudget.capLights`; cząsteczki w `drawParticles` (`:3392,4075`) przez `DrawBudget.capParticles`.
- Rezydenci: `getPigEntries()` (`:1298-1341`) przy `isEditMode()` respektuje `CuyEdit.getShowResidents()` (`[]` gdy ukryte) i limit `6`; `update()` (`:3036-3069`) pomija `scenePigs.step` dla `prefers-reduced-motion: reduce`; `handleCanvasClick` (`:2792-2793`) w `isEditMode()` emituje `document.dispatchEvent(new CustomEvent('room-pig', { detail: { pigId } }))` bez `this.pet()`.

---

## 3. Kotwice dla `PK-CS3` (`HomeWindow.cs`, `Program.cs`) i `PK-PF3` (`places/feature.js`)

### `PK-CS3` — rejestracja i `DesktopPropsOverlay`
- **Rejestracja**: `Program.cs:232` wywołuje `HomeFeatures.LoadAll()` (`src/Cuy/dotNet/Features/HomeFeatures.cs:15-47`), które automatycznie ładuje refleksją wszystkie `IHomeFeature` (`RunFeature`, `PropsFeature`); `BrainController.cs:635` wywołuje `HomeFeatures.TickAll`; `HomeWindow.cs:661,756` obsługuje stan i wiadomości. Nie dodawać ręcznej rejestracji.
- **Kotwica `DesktopPropsOverlay`**: w `Program.cs:252-254` (po `_uiInvoker = new Control(); IntPtr invokerHandle = _uiInvoker.Handle;`) odszukać `var propsFeature = HomeFeatures.All.OfType<Cuy.Features.PropsFeature>().FirstOrDefault();` (`HomeFeatures.cs:13`). Na `propsFeature.PropsChanged` (przez `_uiInvoker.BeginInvoke`, jeśli `InvokeRequired`) leniwie tworzyć `DesktopPropsOverlay`, mapować `DesktopProp` -> `DesktopPropView` (`SpritePath = DesktopPropCatalog.Current.Find(p.ItemId)?.Sprite`) i wołać `overlay.Update(views)` (`DesktopPropsOverlay.cs:85-100` sam chowa okno dla 0 elementów i pokazuje dla `>0`).
- **Nie podpinać pod `HomeWindow.OnFormClosing`** (`HomeWindow.cs:1062-1069`), bo `UserClosing` tylko ukrywa Home (`e.Cancel = true; this.Hide();`).
- **Wyjście z aplikacji**: `Program.cs:236` (`Application.ApplicationExit += (s, e) => { ... BrainController.Instance?.Close(); };`) — odpiąć `PropsChanged`, wywołać `overlay.Hide()` i `overlay.Dispose()` (`DesktopPropsOverlay.cs:143-160`).

### `PK-PF3` — `RoomsFeature.cs` i dźwięki świata w `places/feature.js`
- **`RoomsFeature.cs` / `RoomsMessages.cs`**: `room_buy` (`RoomsFeature.cs:346-369`, `RoomsMessages.cs:9`) oraz `rooms.comfort` (`RoomsFeature.cs:178-188,320`, `comfortByPig` `:192,243-250`) już istnieją. Brak w `web/home/features/places/mock.js` (0 trafień na `comfort` / `room_buy`) — uzupełnić w mocku, jeśli potrzebne w testach.
- **`web/home/features/places/feature.js`**: w `handleEdgeHold` (`places/feature.js:974`, zablokowana sąsiednia scena) wywołać `WorldSounds.play('edit_error')`; w `applyScene` (`:1089`, przy scenie z fontanną w `park`/`garden`) -> `WorldSounds.play('fountain_ambience')` (`minIntervalMs: 1400`).
- **`edit-panel.js` i `canvas-pig.js`**: `WorldSounds.play(...)` przy `room_place` (`:706`), `room_remove` (`:762,1825,2057`), `room_move` (`:772`), `room_flip` (`:1794`), `edit_error` (`:759,1817,2049`), `edit_undo`/`edit_redo`, `room_buy`, oraz `walk_grass` w `canvas-pig.js:3039` dla `sceneKind === 'outdoor'`.

---

## 4. Kolejność wdrożenia i ryzyka

### Kolejność
1. **`PK-CS3`** (`Program.cs`): podpięcie `PropsFeature.PropsChanged` -> `DesktopPropsOverlay` i `Dispose()` w `ApplicationExit`.
2. **`PK-PF3`**: potwierdzenie `RoomsFeature.cs`/`RoomsMessages.cs`, podpięcie `WorldSounds` w `places/feature.js` (oraz `comfort`/`room_buy` w `places/mock.js`, jeśli testowane na mocku).
3. **`PK-PE3`**: skrypty w `web/home/index.html`, integracja `EditHistory` + `room_buy` + komfort + `Residents` w `edit-panel.js`, oraz `DrawBudget` + rezydenci + `walk_grass` w `canvas-pig.js`.
4. **`PK-APP3`**: dopisanie `"run"` do `web/home/features/index.json`.
5. **`PK-T17` / `PK-T18` / `PK-T19`**: testy końcowe po scaleniu powyższych paczek.

### Ryzyka
1. **Zapis**: `RunFeature.cs:22-25` i `PropsFeature.cs:14` przechowują stan wyłącznie w pamięci sesji (`WorldState.Run` i `WorldState.DesktopProps` odroczone wg `R38:116`, `R39:111`) — restart aplikacji czyści wybieg i rekwizyty.
2. **Wyjście i wątek UI**: `DesktopPropsOverlay` podpina `SystemEvents.DisplaySettingsChanged` (`DesktopPropsOverlay.cs:50`); brak `Dispose()` w `Program.cs:236` lub utworzenie z wątku tła powoduje wyciek uchwytów/wyjątek WinForms.
3. **Wielomonitorowość**: `DesktopPropsOverlay.cs:184-190` obejmuje wyłącznie `Screen.PrimaryScreen.WorkingArea` (rekwizyty nie przejdą na drugi monitor wraz ze świnką), a `WS_EX_TRANSPARENT` (`:61`) blokuje przeciąganie na pulpicie.
4. **Walidator (`MessageValidator`)**: `RunMessages.Rules` (`RunMessages.cs:15-16`) i `PropsMessages.Rules` (`PropsMessages.cs:17-24`) pomijają aliasy `run_*`/`prop_*` (`MessageValidator.cs` `UNVERIFIED`); JS musi używać kanonicznych `run.out`, `run.in`, `props.*`.
5. **Kolejność ładowania**: brak `<script>` dla `edit-history.js`, `draw-budget.js`, `world-sounds.js` w `web/home/index.html` oraz brak `"run"` w `web/home/features/index.json` zablokują funkcje do czasu `PK-PE3` i `PK-APP3`.
