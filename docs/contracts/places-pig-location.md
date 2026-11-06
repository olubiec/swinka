# Places Pig Location & Scene Ring Contract

State key `places` (`state.places`):
```json
{
  "order": [
    { "id": "salon", "title": "Living room", "locked": false, "unlockHint": null },
    { "id": "pig:kuki", "title": "Kuki's Room", "locked": false, "unlockHint": null },
    { "id": "dorm", "title": "Shared Bedroom", "locked": false, "unlockHint": null },
    { "id": "garden", "title": "Garden", "locked": true, "unlockHint": "Requires clovers" },
    { "id": "park", "title": "Park", "locked": true, "unlockHint": "Requires Garden" },
    { "id": "farm", "title": "Farm", "locked": true, "unlockHint": "Requires Garden" },
    { "id": "market", "title": "Market", "locked": false, "unlockHint": null }
  ],
  "pigLocations": [
    { "pigId": "kuki", "scene": "salon", "pinned": false }
  ]
}
```

### Bridge Messages

1. Move pig to adjacent unlocked scene:
```json
{ "type": "places.pigMove", "pigId": "kuki", "to": "garden" }
```
Validated via Core: `to` must be an unlocked neighbour in `places.order`.
On success, updates state and saves. If locked or not adjacent, toasts error without state change.

2. Pin / unpin pig at current scene:
```json
{ "type": "places.pigPin", "pigId": "kuki", "pinned": true }
```
Pinned pigs do not roam automatically during roamer ticks.
