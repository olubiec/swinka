# Contract: pig homes (`homes`)

Roaming and home mode. Each pig either roams the house or stays in one room. Behind `Balance.HomesActive`
(switched on later by the app; while it is off every pig shows its own room and `pig_home` is refused).
Nothing about the schedule is saved: `PigWander` computes it from the clock.

## State key `homes`

```
{
  pigs:  [ { pigId, name, mode, room, location, activity, memorial, portrait } ],
  rooms: [ { id, name } ]
}
```

- `pigs[].mode`: `free` (roams) or `room` (tied to `room`).
- `pigs[].room`: the tied room id when mode is `room`, otherwise null.
- `pigs[].location`: the room the pig is in now. `pigs[].activity`: `sleep`, `eat`, `play`, `rest` or `explore`.
- `pigs[].memorial`: memorial pigs stay in their memory room and never wander.
- `pigs[].portrait`: `sprites/portraits/<namedId>.png` for named pigs, otherwise null.
- `rooms`: the rooms a pig can be tied to (unlocked common rooms, plus the dorm when it is unlocked).

Published while the Home page is open, at most every 20 seconds (the schedule changes by slot).

## Messages (validated by `HomesMessages`)

| Type | Payload | Rule |
|------|---------|------|
| `pig_home` | `{ pigId: string, mode: "free" \| "room", room?: string }` | `pigId` 1 to 64 characters; `mode` is `free` or `room`; `room` at most 64 characters, required when mode is `room` |

Unknown pig ids are ignored. A refused `pig_home` (room not usable by the pig) gets a toast.

## Toasts

- `That room is not available`: `Pet.SetHome` refused the room or the mode.
