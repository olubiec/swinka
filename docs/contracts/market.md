# Market Contract

State key `market` (published by `MarketFeature`):
```json
{
  "capLeft": 30,
  "cap": 30,
  "sellable": [
    {
      "itemId": "parsley",
      "name": "Parsley",
      "owned": 10,
      "unitNow": 4,
      "demand": 1.0
    }
  ],
  "buyable": [
    {
      "itemId": "seed_parsley",
      "name": "Parsley seed",
      "category": "seed",
      "price": 2
    }
  ],
  "specials": [
    {
      "index": 0,
      "itemId": "wooden_shelf",
      "name": "Wooden shelf",
      "price": 64,
      "was": 80
    }
  ],
  "orders": [
    {
      "index": 0,
      "cropId": "parsley",
      "count": 5,
      "reward": 25,
      "done": false
    }
  ],
  "stall": {
    "level": 0,
    "nextCost": 500
  },
  "clovers": 150
}
```

### Fields
- `capLeft`: Remaining daily earning limit from selling crops.
- `cap`: Total daily sales earning cap in clovers.
- `sellable`: Crops that can be sold, current owned quantity, current unit payout, and demand multiplier.
- `buyable`: Seeds and items available for standard purchase at the market stall.
- `specials`: Daily rotating discounted special offers.
- `orders`: Daily bulk harvest orders with bonus clover payouts.
- `stall`: Current market stall upgrade level and cost for the next upgrade.
- `clovers`: Current player clover balance.

### Messages
- `market_sell { itemId, count }`: Sells a specified quantity of crops.
- `market_buy { itemId, count }`: Purchases seeds, saplings, or market items.
- `market_special { index }`: Purchases a discounted daily special offer.
- `market_order { index }`: Fulfills a daily market harvest order.
- `market_stall {}`: Upgrades market stall to unlock additional daily special offer slots.
- `market_quote { itemId, count? }`: Requests quote total for a quantity of items; responds with `market_quote_result` page event `{ itemId, count, total, unitPrice }`.

### Toasts
- `market_sell`: "Sold!", "Not ready yet".
- `market_buy`: "Item bought!", "Not enough clovers", "Not ready yet".
- `market_special`: "Special deal bought!", "Not enough clovers", "Not ready yet".
- `market_order`: "Order fulfilled!", "Not ready yet".
- `market_stall`: "Stall expanded!", "Not enough clovers".
- Unknown ids or indices are ignored silently.
