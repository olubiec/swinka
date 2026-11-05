# Contract: decor slots (`decor`)

Feature id: `decor`. Equipped decor is stored per slot in `pet.State`.

## State key `decor`

```
decor: {
  equipped: { [slot: string]: string }   // slot -> itemId
}
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `decor_equip` | `{ slot: string, itemId?: string }` | slot required; without `itemId` the slot is unequipped |

Equip is ignored (no change, no error) when:
- the item is not in the inventory with a count above 0,
- the item is not in the catalog with `category == "decor"`,
- the item id does not start with the slot name (for example a plant cannot go into the wallpaper slot).

## Replies

None. A successful change saves the game and calls `HomeWindow.NotifyStateChanged()`.

## Toasts

None.
