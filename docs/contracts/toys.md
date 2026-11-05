# Contract: toys (`toys`)

Feature id: `toys`. Toy cooldowns are kept in `pet.State.Stats.Counters` as `toy_last_<itemId>` (unix seconds).

## State key `toys`

```
toys: {
  ball:     { owned: bool, readyIn: number },   // readyIn in seconds, 0 when ready
  tunnel:   { owned: bool, readyIn: number },
  hay_ball: { owned: bool, readyIn: number },
  house:    { owned: bool, readyIn: number }
}
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `play_toy` | `{ item: string }` | item is `ball`, `tunnel`, `hay_ball` or `house`; ignored when empty or not owned or on cooldown |

## Replies

Toast when the pig needs a break, plus a state refresh (`NotifyStateChanged`).

## Toasts

- `<name> needs a break (<minutes> min)`
