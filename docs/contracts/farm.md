# Farm Contract

State key `farm` (published by `FarmFeature`):
```json
{
  "unlocked": true,
  "plots": [
    {
      "index": 0,
      "cropId": "parsley",
      "state": "growing",
      "watered": true,
      "secondsLeft": 180,
      "yield": 2
    }
  ],
  "orchard": [
    {
      "slot": 0,
      "cropId": "apple",
      "stock": 3,
      "secondsToNext": 600
    }
  ],
  "crops": [
    {
      "id": "parsley",
      "name": "Parsley",
      "icon": "parsley",
      "kind": "annual",
      "unlocked": true,
      "seedItem": "seed_parsley",
      "seedOwned": 5,
      "growMinutes": 10,
      "yield": 2,
      "sellPrice": 4,
      "unlockHarvests": 0
    }
  ],
  "tools": {
    "canId": "can_1",
    "plotsPerWater": 1,
    "sprinkler": false
  },
  "upgrades": {
    "nextPackCost": 150,
    "nextOrchardCost": 200,
    "nextCanCost": 120,
    "sprinklerCost": 650
  },
  "harvests": 12
}
```

### Fields
- `unlocked`: Whether the farm is unlocked and active.
- `plots`: Status of each plot (`index`, `cropId`, `state`: empty|growing|ripe, `watered`, `secondsLeft`, `yield`).
- `orchard`: Status of each orchard slot (`slot`, `cropId`, `stock`, `secondsToNext`).
- `crops`: Definitions of all available farm crops and perennial trees, including seeds owned and grow times.
- `tools`: Active watering can (`canId`, `plotsPerWater`) and sprinkler status.
- `upgrades`: Costs for plot expansions, orchard slots, watering can upgrades, and automatic sprinkler.
- `harvests`: Total career harvests count.

### Messages
- `farm_plant { plot, cropId }`: Plants seeds of an annual crop into an empty plot.
- `farm_water { plot }`: Waters a growing crop on a plot (waters multiple plots if upgraded can is owned).
- `farm_harvest { plot }`: Harvests ripe vegetables from a plot.
- `farm_harvest_all {}`: Harvests all ripe plots in one operation.
- `orchard_plant { slot, cropId }`: Plants a perennial sapling in an orchard slot.
- `orchard_harvest { slot }`: Collects accumulated fruit from an orchard tree.
- `farm_buy { what, id? }`: Purchases farm expansion or tools (`what`: `pack` | `orchard` | `can` | `sprinkler`).

### Toasts
- `farm_plant`: "Planted!", "Something is in the way", "Not ready yet".
- `farm_water`: "Watered!", "Not ready yet".
- `farm_harvest`: "Harvested! +<count>", "Great harvest! +<count>", "Not ready yet".
- `farm_harvest_all`: "Harvested! +<count>", "Great harvest! +<count>", "Not ready yet".
- `orchard_plant`: "Planted!", "Not ready yet".
- `orchard_harvest`: "Harvested! +<count>", "Not ready yet".
- `farm_buy`: "Plots expanded!", "Orchard expanded!", "Watering can upgraded!", "Sprinkler installed!", "Not enough clovers".
- Unknown ids or indices are ignored silently.
