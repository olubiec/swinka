# Store contract (home store)

Owner: `StoreFeature` (src/Cuy/dotNet/Features/StoreFeature.cs). Logic: `HomeStore` and `Pet.Purchase` in Cuy.Core.
Validation: `StoreMessages` (src/Cuy.Core/Input/Validation/StoreMessages.cs).

## State key `store`

Published only while the store page is open (see `store_open`; window of 5 minutes) and after each purchase.

```
store: {
  clovers: int,
  rows: [ { kind, id, name, category, place, price, owned, placed, locked, lockedReason, icon } ],
  categories: [ { id, name, count } ]
}
```

- `rows` come from `HomeStore.Rows` (about 150 rows).
- `kind` is one of the store kinds below. `icon` currently equals `kind`.
- `lockedReason` is null when the row is not locked.

## Messages

### `store_open`

Payload: `{}`. Opens the 5 minute publish window for `store`.

### `store_buy`

Payload: `{ kind, id, count }`.

- `kind`: one of `room | place | item | variant | decor | farm | stall | dorm`.
- `id`: string, at most 64 characters.
- `count`: integer 1-99.

Calls `Pet.Purchase(kind, id, count)`. The page gets a `toast` message:

- `Ok` -> "Bought!"
- `NotEnoughClovers` -> "Not enough clovers"
- anything else -> "Not available yet"

## Validation

- `store_open`: no fields.
- `store_buy`: `kind` is a string of at most 16 characters, `id` at most 64, `count` an integer 1-99.
- The kind list is checked with `StoreMessages.IsKnownKind`. The generic validator has no enum rule, so an unknown kind passes the message validator and `Pet.Purchase` returns `Unknown`.
