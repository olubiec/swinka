# Contract: care calendar (`calendar`)

Feature id: `calendar`. Care tasks come from `CareData`; schedule overrides are stored in `pet.State.Care.Settings`.

## State key `calendar`

```
calendar: {
  pigs: string[],          // pig names used in weight entries
  tasks: [ { id, enabled, time, weekday, everyDays, streak, ... } ],
  history: object,         // completed task log
  weights: object,         // weight log per pig
  alerts: object[],        // weight alerts from pet.WeightAlerts()
  snoozeMinutes: int[]     // default [15, 60, 180]
}
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `calendar_done` | `{ taskId }` | taskId must be a known care task |
| `calendar_snooze` | `{ taskId, minutes? }` | taskId known; minutes default 15, must be valid |
| `calendar_settings` | `{ pigs?: string[], tasks?: [ { id, enabled?, time?, weekday?, everyDays? } ] }` | each task id known; time, weekday and everyDays range-checked |
| `calendar_weight` | `{ pig, grams: int, date }` | pig known; grams valid; date valid |
| `calendar_weight_delete` | `{ pig, date }` | pig known; date valid |

Invalid messages are logged and ignored. No reply is posted to the page; the feature calls `HomeWindow.NotifyStateChanged()` after a change, so the page re-reads `calendar`.
