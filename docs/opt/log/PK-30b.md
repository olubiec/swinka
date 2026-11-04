# PK-30b log

- Most listed files did not exist: created StoreFeature.cs, StoreMessages.cs, StoreMessageTests.cs, docs/contracts/store.md, web/home/features/store/feature.js and feature.css. index.json got "store" appended.
- Kind list: the generic validator has no enum rule, so `store_buy.kind` is Str(16) and the list is checked by `StoreMessages.IsKnownKind`. Unknown kinds reach `Pet.Purchase`, which returns Unknown.
- Differences: StoreRow has no Icon, so `icon` = kind. Rows have no comfort, so the Comfort sort option appears only when rows carry a numeric comfort.
- Toasts: sent with HomeWindow.PostToPage {type:"toast"}, which the page already handles. Results: Ok "Bought!", NotEnoughClovers "Not enough clovers", other "Not available yet".
- `store` is published while the 5 minute store_open window is open and after each buy. The page re-sends store_open every 3 minutes.
- The 'Open the store' link on the rooms toolbar is left out: app.js has no listener for CustomEvent('open-feature').
- Stepper only for kind "item". Non-item buys send count 1.
- Verified: StoreMessageTests 22/22, Cuy build 0 errors, node --check OK, web-smoke OK (CHROMIUM_PATH=/usr/bin/google-chrome; 404 for missing mock.js is expected).
- Undone: nothing. Known failures not touched.
