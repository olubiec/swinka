# Contract: progress (`progress`)

Feature id: `progress`. Read-only state for the diary, album and bond views.

## State keys

```
diary: object[]          // diary entries (diaryList)
albumDates: string[]     // dates with album entries
bondNext: object         // next bond milestone info
hayRack: { value: int, max: int }   // hay rack fill; fixed { value: 60, max: 100 } when the rack is not in use
```

## Messages

None. `HandleMessage` always returns false.

## Replies

None.

## Toasts

None.
