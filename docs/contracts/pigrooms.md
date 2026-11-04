# Contract: pig rooms (rooms section)

Source of truth: `src/Cuy/dotNet/Features/RoomsFeature.cs` (feature id `rooms`, state key `rooms`).
Validation: `src/Cuy.Core/Input/Validation/PigRoomsMessages.cs`.

## State: `rooms`

| Field | Type | Notes |
|---|---|---|
| `layouts` | object keyed by room id | Each entry: `name` (string, empty if unnamed), `cols`, `rows`, `wallRows`, `wallpaper`, `floor`, `items`. Pig rooms appear as `pig:<id>` keys. |
| `layouts[room].items[]` | array | `uid`, `itemId`, `x`, `y`, `flip`, `variant` (int, 0 = original colour). |
| `catalog` | array | Unchanged. |
| `comfort` | object | Unchanged: `score`, `cap`, `moodFactor`. |
| `skins` | object | Unchanged: `wallpapers`, `floors`. |
| `pigRooms` | array | One entry per roster pig. See "Pig rooms" below. |
| `storage` | array | `[ { itemId, free } ]` from `Pet.StorageList()`. Empty while pig rooms are off. |
| `variantNames` | string array | Index = variant id. Index 0 is `Original`, the others are `Colour N` (placeholder names, see "Variants"). |
| `variantPrices` | object | `{ <itemId>: [0, p1, ..., pN] }` for recolourable items only. Index = variant id. |
| `variantsUnlocked` | string array | Entries `<itemId>:<variant>`. |
| `comfortByPig` | object | `{ <pigId>: { score, cap, moodFactor } }`. |

Pig rooms, storage, variants and `comfortByPig` are only filled while `Balance.PigRoomsActive` is on; otherwise they are empty.

### `pigRooms[]` fields

| Field | Type | Notes |
|---|---|---|
| `pigId` | string | Roster pig id. |
| `name` | string | Pig name. |
| `roomId` | string | `pig:<id>` (see below). |
| `displayName` | string | From `Pet.RoomDisplayName`: the room name if set, else the name template. |
| `level` | int | From `PlaceUnlock.GetLevel`. |
| `maxLevel` | int | Number of grid levels in the pig room config. |
| `nextLevelCost` | int | From `PlaceUnlock.NextLevelCost`. |
| `cols`, `rows` | int | Grid size of the room. |
| `memorial` | bool | |
| `portrait` | string or null | `sprites/portraits/<namedId>.png` for named pigs, null otherwise. |

## Messages (client to server)

| Type | Fields | Result |
|---|---|---|
| `room_variant` | `place` (string), `uid` (string <= 64), `variant` (int 0-7) | Sets the colour of a placed item. Toast `Colour changed!` on success. Unknown ids are ignored. |
| `room_variant_unlock` | `itemId` (string <= 64), `variant` (int 1-7) | Unlocks a colour variant, spending clovers when the price is above 0. Toast `Colour unlocked!` or `Not enough clovers`. |
| `room_rename` | `place` (string), `name` (string <= 24) | Renames a room. Server trims the name, truncates it to the configured max length and rejects control characters. Toast `Room renamed!` on success. |
| `room_transfer` | `from`, `to` (strings), `uid` (string <= 64), `x`, `y` (int -1..200) | Moves an item from one room to another. Toasts: `Moved to another room!`, `Something is in the way`, `Too close to the wall`, `Not ready yet`. |
| `room_upgrade` | `place` | Not handled by `rooms`. It goes through the existing `place_upgrade` path. |

Existing messages (`room_buy`, `room_place`, `room_move`, `room_flip`, `room_remove`, `room_skin`) are unchanged.

## Toasts

`Colour changed!`, `Colour unlocked!`, `Not enough clovers`, `Room renamed!`, `Moved to another room!`, `Something is in the way`, `Too close to the wall`, `Not ready yet`.

## Pig rooms

- Room id format: `pig:<id>`, where `<id>` is the pig key. Built by `Pet.RoomIdOf(pigId)` through `PigRoomConfig.RoomId`. The id is parsed back with `PigRoomConfig.TryParseRoomId`.
- Pig rooms are only in `layouts` and `pigRooms` while `Balance.PigRoomsActive` is on.

## Variants

- Variant 0 is the original colour. Variants 1..N-1 must be unlocked (`room_variant_unlock`) before `room_variant` can use them.
- The number of variants comes from `variants.count` in the pig room config.
- `variantNames` are placeholders in code. Real names are not in the config yet.
