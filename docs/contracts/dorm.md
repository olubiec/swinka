# Contract: shared bedroom (`dorm`)

Feature id: `dorm`. Active when `Balance.DormActive` and `Balance.PigRoomsActive` are on (both are on in `GameSession.Open`).

## State key `dorm`

```
dorm: {
  unlocked: bool,
  unlockCost: int,
  requiresPigs: int,
  level: int,            // 1-based, 1 after unlock
  maxLevel: int,
  nextLevelCost: int,    // 0 at max level
  cols: int, rows: int,  // grid of the current level
  maxResidents: int,
  residents: string[],   // pig ids living in the shared room
  candidates: [ { pigId: string, name: string, portrait: string, memorial: bool, resident: bool } ],
  bondBonus: number      // bond gain bonus for the best resident pair, 0 without a non-memorial roommate
}
```

`candidates` lists every pig on the roster. `pigId` is the named id when the pig has one, otherwise its own id.

## Messages (validated by `DormMessages`)

| Type | Payload | Rule |
|------|---------|------|
| `dorm_unlock` | `{}` | no fields |
| `dorm_upgrade` | `{}` | no fields |
| `dorm_move_in` | `{ pigIds: string[] }` | 1 to 6 ids, each 1 to 64 characters, no duplicates |
| `dorm_move_out` | `{ pigId: string }` | required, max 64 characters |

`dorm_move_in` array checks are done by `DormMessages.ValidatePigIds`, because the rule set has no array field kind.

## Toasts

- `Not enough clovers`
- `You need two pigs first`
- `Welcome home` (after a successful move in)
