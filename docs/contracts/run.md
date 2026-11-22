# Garden Run Contract (`run`)

## State (`state.run`)

Sent from C# (`RunFeature.AddState`) to the Home web layer as `state.run`:

```json
{
  "available": true,
  "valid": true,
  "reason": "ok",
  "cells": [[4, 3], [5, 3]],
  "capacity": 2,
  "out": [
    { "pigId": "starter", "since": "2026-11-21T10:00:00Z", "hoursToday": 1.5 }
  ],
  "candidates": [
    { "pigId": "starter", "name": "Cuy", "portrait": null, "out": true, "memorial": false }
  ],
  "verdict": {
    "ok": true,
    "code": "Ok",
    "message": "Ready for the garden run"
  }
}
```

- `available`: `true` when the `garden` place is unlocked, `false` otherwise.
- `valid`: `true` when `RunCheck.Analyze` finds a fenced run with a gate and at least `min_cells`.
- `reason`: `"ok" | "no_fence" | "too_small" | "no_gate" | "open_edge"`.
- `cells`: array of `[x, y]` grid coordinates belonging to the run.
- `capacity`: maximum number of pigs that fit in the run.
- `out`: pigs currently assigned to the run.
- `candidates`: roster pigs eligible/listed for assignment (`memorial` pigs cannot be let out).
- `verdict`: weather and time-of-day check from `RunRules.CanBeOut`.

## Messages (JS -> C#)

- `run.out`: `{ "type": "run.out", "pigId": "<1..64 chars>" }` (alias `run_out` accepted by `RunFeature`)
- `run.in`: `{ "type": "run.in", "pigId": "<1..64 chars>" }` (alias `run_in` accepted by `RunFeature`)

## Toasts (C# -> JS)

- `"Garden is locked"`
- `"Needs a fence with a gate"`
- `"The run is full"`
- `RunRules.Message(verdict)` when `!verdict.ok`
