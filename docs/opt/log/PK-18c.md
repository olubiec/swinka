# PK-18c: Pet.Market
- Implemented Pet.Market: Sell, Buy, BuySpecial, FulfillOrder, GetMarketView, BuyBigStall behind Balance.MarketActive.
- Reused BuyResult enum defined in Pet.Rooms; introduced SellResult enum (Ok, NoItems, NotACrop, CapReached, Disabled, InvalidArgument).
- Buy delegates placeable item purchases directly to BuyItem(itemId) and handles crop seeds and general store items.
- Orders fulfilled via daily cap rules (OrdersCountTowardCap), counting units_sold and refreshing on day change.
- Added daily rollover MarketPricing.NewDay call to Pet.Economy CheckEconomyDay.
- Pre-existing AchievementTests conflict (achievements.json reward 25 vs 50) noted in test suite as described in instructions.
- All 9 PetMarketTests passed and desktop build succeeded with 0 warnings and 0 errors.
