# PK-17c: Market pricing and market stock
- Implemented W17-05 MarketPricing: demand meter, deterministic price wiggle, daily cap, SaleQuote, Quote, Sell, and NewDay.
- Implemented W17-06 MarketStock: deterministic Specials offers (20% discount, seeds floored at 50% price, 3 or 5 slots with big stall), Orders generation, and OrderReward.
- Decisions: used stable FNV-1a hashing for date-based seed generation to guarantee deterministic cross-platform behavior; provided ergonomic aliases on SaleQuote and SpecialOffer.
- Pre-existing conflict: AchievementTests.RealCatalog_LoadsWithAtLeast15EntriesAndUniqueIds fails on existing repo asset achievements.json (reward 25 vs test expectation); left untouched per rules.
- Nothing left undone for PK-17c.
