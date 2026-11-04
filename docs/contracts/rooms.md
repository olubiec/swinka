> Note: superseded by rooms once WorldDecorActive is on

# Rooms Contract

State key `rooms` (published by `RoomsFeature`):
```json
{
  "layouts": {
    "salon": {
      "cols": 12,
      "rows": 7,
      "wallRows": 2,
      "wallpaper": "wallpaper_mint",
      "floor": "floor_wood_light",
      "items": [
        { "uid": "a1b2c3d4", "itemId": "wooden_shelf", "x": 1, "y": 0, "flip": false }
      ]
    }
  },
  "catalog": [
    {
      "id": "wooden_shelf",
      "name": "Wooden shelf",
      "places": ["salon"],
      "w": 2,
      "h": 2,
      "price": 80,
      "comfort": 10,
      "layer": "wall",
      "icon": "shelf",
      "owned": 1,
      "placed": 1,
      "repeatable": true,
      "free": false
    }
  ],
  "comfort": {
    "score": 25,
    "cap": 100,
    "moodFactor": 0.9625
  },
  "skins": {
    "wallpapers": [
      { "id": "wallpaper_mint", "name": "Mint wallpaper", "icon": "wallpaper", "price": 150, "owned": true }
    ],
    "floors": [
      { "id": "floor_wood_light", "name": "Light wood floor", "icon": "floor", "price": 120, "owned": true }
    ]
  }
}
```

### Fields
- `layouts`: Map of place or room ID to its layout object (`cols`, `rows`, `wallRows`, `wallpaper`, `floor`, and placed `items`).
- `catalog`: Complete catalog of world placeable items with ownership, placement count, dimensions, layer, and comfort score.
- `comfort`: Global comfort summary (`score`, `cap`, and `moodFactor` decay multiplier).
- `skins`: Wallpapers and flooring options available, with prices and ownership status.

### Messages
- `room_buy { itemId }`: Purchases a placeable decor item using clovers.
- `room_place { place, itemId, x, y, flip }`: Places an owned item into a room/place grid.
- `room_move { place, uid, x, y }`: Repositions a placed item within a room.
- `room_flip { place, uid, flip? }`: Toggles or sets the horizontal orientation of a placed item.
- `room_remove { place, uid }`: Removes a placed item back to storage.
- `room_skin { room, slot, itemId }`: Applies or unequips a wallpaper or floor skin in the specified room.

### Toasts
- `room_buy`: "Bought <Name>!", "Not enough clovers", "Not ready yet".
- `room_place`: "Placed!", "Something is in the way", "Too close to the wall", "Not ready yet".
- `room_move`: "Moved!", "Something is in the way", "Too close to the wall", "Not ready yet".
- `room_flip`: "Flipped!".
- `room_remove`: "Removed!".
- `room_skin`: "Skin applied!", "Removed!", "Not ready yet".
- Unknown ids or indices are ignored silently.
