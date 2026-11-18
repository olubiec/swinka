Decyzje:
- Wszystkie 74 PNG w assets/world/{garden,park,farm,market,fx} zinwentaryzowano przez PIL; R47.md blednie podawal campfire_flame_small jako 96x32 (realnie 64x20, 4 klatki 16x20, 6 fps).
- PK-P46a: w world_items.json brakuje tylko 5 pozycji z R46 (willow_tunnel, barn_hay, stall_basic, stall_big, order_board); reszta juz istnieje.
- PK-P25c: pozostale dostarczone D2/D4 sprite'y (campfire, grass_tuft_1..4, tunnel_playground, stall_veg/fruit/seeds, fruit_tree, plot_*, poster_*, promo_*).
- PK-P47a: wszystkie 4 sceny moga miec bg_clean:true; crates_barrels w market to w generatorze poster_2/poster_3 (usunac blocker lub zamowic 24x16 px).
- PK-P6c: lights.js:100-106 nie ma jeszcze strazy toggle:false; dodac campfire (6 klatek 24x32, 8 fps) i campfire_small (4 klatki 16x20, 6 fps) w kolorach flame z style_palette.json.
- Roznice: bridge_wood ma w world_items.json 4x2, a w atlas.json [2,2] (32x32); WorldAssetsTests.cs:98 wymaga <= cells*16 dla obu osi (fruit_tree 40x64).
- Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R35.md 5 -> PASS (oczekiwany po poprawce limitu 16000 znakow).
