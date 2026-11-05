# Contract: pig roster and adoption (`pigs`)

Feature id: `pigs`. Config comes from the pig config file (`adopt_cost`, `max_roster`, `max_adopted`, `names`).

## State keys

```
roster: [ ... ]                // pig objects from gs.Roster
activePigIds: string[]
offers: [ ... ]                // adoptable offers (random and named)
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `adopt_pig` | `{}` | random pig; costs `adopt_cost`; limited by `max_roster` and `max_adopted` |
| `adopt_named` | `{ id \| pigId, memorial?: bool }` | id must be in the named pig catalog |
| `adopt_group` | `{ id \| groupId }` | group id must exist in the catalog |
| `set_memorial` | `{ pigId \| id, on?: bool }` | default `on = true`; ignored when nothing changes |
| `toggle_pig_active` | `{ pigId }` | at least one pig must stay active |

Unknown ids are ignored. Null state is handled by returning true without changes.

## Replies

Toasts only, and a state refresh through `HomeWindow.NotifyStateChanged()`.

## Toasts

- `You already adopted a friend`
- `The family is full`
- `Not enough clovers`
- `Not ready yet`
- `Welcome <name> to the family!`
- `Forever in the family` (memorial set)
