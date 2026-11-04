# Places Contract

State key `places` (published by `PlacesFeature`):
```json
{
  "places": [
    {
      "id": "salon",
      "name": "Living room",
      "unlocked": true,
      "level": 1,
      "maxLevel": 3,
      "unlockCost": 0,
      "nextLevelCost": 150,
      "requires": [],
      "cols": 12,
      "rows": 7
    }
  ],
  "rooms": [
    {
      "id": "salon",
      "name": "Living room",
      "unlocked": true,
      "level": 1,
      "unlockCost": 0,
      "nextLevelCost": 150,
      "cols": 12,
      "rows": 7
    }
  ],
  "clovers": 250
}
```

### Fields
- `places`: List of world places (`id`, `name`, `unlocked`, `level`, `maxLevel`, `unlockCost`, `nextLevelCost`, `requires`, `cols`, `rows`).
- `rooms`: List of place rooms (`id`, `name`, `unlocked`, `level`, `unlockCost`, `nextLevelCost`, `cols`, `rows`).
- `clovers`: Current wallet balance.

### Messages
- `place_unlock { id }`: Unlocks a place by paying its `unlockCost` in clovers.
- `room_unlock { id }`: Unlocks a room by paying its `unlockCost` in clovers.
- `place_upgrade { id }`: Upgrades an unlocked place or room to its next grid expansion level.

### Toasts
- `place_unlock`: "Unlocked <Name>!", "Not enough clovers", "Not ready yet".
- `room_unlock`: "Unlocked <Name>!", "Not enough clovers", "Not ready yet".
- `place_upgrade`: "Upgraded!", "Not enough clovers", "Not ready yet", "Max level reached".
- Unknown ids are ignored silently.
