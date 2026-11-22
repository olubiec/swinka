# Contract: optional companion (`companion`)

Feature: optional garden/park companion toggle (lives under `settings` UI; default off, price 0, no effect on needs, clovers, or poops).

## State keys

```
companion: {
  enabled: bool,    // default false
  id: string        // default "garden_friend"
}
```

Stored in `GameState.CompanionEnabled` and `GameState.CompanionId` (`src/Cuy.Core/GameState.Companion.cs`). Old saves without these fields deserialize with `enabled = false` and `id = "garden_friend"`.

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `companion.set` | `{ enabled: bool, id?: string }` | `CompanionMessages`: `enabled` required `bool`; `id` optional `Id` (`^[a-z0-9_:]+$`, max 128) and must match a known companion from `assets/data/companions.json` (default `"garden_friend"`). |

## Replies

State refresh through `HomeWindow.NotifyStateChanged()` (same pattern as `docs/contracts/settings.md`).
