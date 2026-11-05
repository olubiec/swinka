# Contract: shop (`shop`)

Feature id: `shop`. Item prices and limits come from the item catalog; prices are never read from JS.

## State key `shop`

```
shop: object   // item list built in ShopFeature.AddState
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `buy` | `{ itemId: string }` | itemId required; item must exist and be for sale |

Checks run in order: unknown item, not for sale (no price, or unlimited), already owned (one-time items), daily limit reached (counter `bought_<id>_<yyyymmdd>`), then clovers.

## Replies

Toasts only, plus a state refresh through the autosave path.

## Toasts

- `Unknown item`
- `Item not for sale`
- `Already owned`
- `Daily limit reached`
- `Bought <name>!`
- `Not enough clovers`
