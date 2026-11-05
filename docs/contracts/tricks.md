# Contract: tricks (`tricks`)

Feature id: `tricks`. The trick logic is in `pet.TryPerformTrick(id)`.

## State key `tricks`

```
tricks: [ { id: string, ... } ]    // one entry per trick from pet.GetTricks()
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `trick` | `{ id: string }` | id required; unknown or empty ids are ignored |

## Replies

On success the feature plays the trick animation (`RequestAnimation(id)`). Otherwise it shows a toast for the result.

## Toasts

- `Too tired for tricks`
- `Not unlocked yet`
- `Give me a moment` (cooldown)
- `Shh, sleeping`
