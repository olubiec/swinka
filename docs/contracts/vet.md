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

## Replies

State refresh through `HomeWindow.NotifyStateChanged()` after a successful action.

## Toasts

- `Not enough clovers` (checkup or treatment too expensive)
