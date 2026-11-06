# Contract: vet and health (`vet`)

Feature id: `vet`. Prices and course days come from the health config; prices are never read from JS.

## State keys

```
vet: {
  activeConditions: [ { id, name, known: bool, severity, since: "yyyy-MM-ddTHH:mm",
                        treated: bool, price: int, courseDays: int } ],
  ...                                 // see VetFeature.AddState (checkup price, symptoms)
}
healthDisplay: object                 // summary for the health panel
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `vet_checkup` | `{}` | pays the checkup price |
| `vet_treat` | `{ conditionId }` | condition must be active, known and not yet treated; pays its treatment price |
| `vet_dose` | `{ conditionId }` | gives a dose of the course; no payment |
| `vet_checkup_result` | `{ found, newlyKnown }` | posted to the page after check-up with counts of total conditions found and newly discovered |

## Replies

State refresh through `HomeWindow.NotifyStateChanged()` after a successful action.
`vet_checkup_result`: `{ type: "vet_checkup_result", found: int, newlyKnown: int }` dispatched after check-up completes.

## Toasts

- `Not enough clovers` (checkup or treatment too expensive)
