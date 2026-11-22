# Desktop Props Contract (`props`)

## State (`state.props`)

```json
{
  "max": 6,
  "desktop": [
    {
      "uid": "dp_1",
      "itemId": "toy_basket",
      "name": "Toy basket",
      "icon": "toy_basket",
      "sprite": "props/ball.png",
      "x": 0.5,
      "y": 0.8
    }
  ],
  "inRooms": [
    {
      "roomId": "salon",
      "uid": "it_1",
      "itemId": "toy_basket",
      "name": "Toy basket"
    }
  ],
  "free": [
    {
      "itemId": "hay_basket",
      "name": "Hay basket",
      "icon": "hay_basket",
      "count": 1
    }
  ]
}
```

## Messages (JS -> C#)

Canonical message types (`prop_*` aliases also accepted by `PropsFeature`):

- `props.place`: `{ "itemId": string (1..64), "x": number [0,1], "y": number [0,1] }`
- `props.move`: `{ "uid": string (1..64), "x": number [0,1], "y": number [0,1] }`
- `props.remove`: `{ "uid": string (1..64) }`
- `props.toRoom`: `{ "uid": string (1..64), "room": string (1..64), "x": int [-1,200], "y": int [-1,200] }`
- `props.fromRoom`: `{ "room": string (1..64), "uid": string (1..64), "x": number [0,1], "y": number [0,1] }`

## Toasts (C# -> JS)

- `"The desktop is full"`
- `"Something is in the way"`
- `"Put back on your desktop"`
- `"Item is not owned"`
