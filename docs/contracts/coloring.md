# Contract: coloring (`coloring`)

Feature id: `coloring`. Picture index is read from `assets/coloring/index.json`.

## State key `coloring`

```
coloring: {
  completed: ...,             // completed pictures
  unlockedPacks: ...,         // unlocked pack ids
  rewardedToday: int,
  maxRewardedPerDay: int,
  lastReward: { pictureId: string, ... } | null
}
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `coloring_load` | `{ pictureId }` | reply with `coloring_progress` |
| `coloring_save` | `{ pictureId, painted }` | `painted` is a string of `0`/`1` cells; saved and autosaved |
| `coloring_done` | `{ pictureId, cells: int, painted? }` | clovers are awarded by `CompleteColoring`; falls back to `painted` when no saved progress exists |
| `coloring_unlock` | `{ packId }` | packId must be a known pack in `_packPrices` |

## Replies

- `coloring_progress` `{ pictureId, painted }`, posted only for `coloring_load`.

## Toasts

- `+<clovers> clovers!` (after `coloring_done` with a reward)
- `Unknown pack`
- `Not enough clovers`
