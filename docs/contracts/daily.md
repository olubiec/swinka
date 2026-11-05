# Contract: daily gift (`daily`)

Feature id: `daily`. Gift logic lives in `pet.GetDailyGift()` and `pet.ClaimDailyGift()`.

## State key `daily`

```
daily: {
  available: bool,   // gift can be claimed now
  streak: int,
  ...                // further fields from pet.GetDailyGift()
}
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `daily_claim` | `{}` | no fields; ignored unless the gift is available |

## Replies

- `daily_claimed` `{ amount: int, streak: int }`, posted after a successful claim. The feature also plays the `popcorn` animation and calls `HomeWindow.NotifyStateChanged()`.

## Toasts

None.
