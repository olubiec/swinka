# Pliki _x2 świata do usunięcia (G14)

Gra nie czyta już plików `_x2` świata: sprite'y 1x są skalowane najbliższym sąsiadem.
Sprawdzenie `node tools/qa/check-assets.js --x2` nie znajduje odwołań w `web/` ani `src/` (`X2 OK`).
Klucze `file_x2` w danych (`atlas.json`, `props.json`) zostają.

**Liczba plików do usunięcia: 102** (`assets/world/**/*_x2.png`, stan z dysku, 2026-11-04).

Ten dokument NIE usuwa nic. Usunięcie wymaga potwierdzenia człowieka.

Uwaga przed usunięciem: `tools/qa/check-assets.js` (`checkWorldAtlas`, linia 70) nadal sprawdza, czy pliki `file_x2` z `atlas.json` istnieją.
Po usunięciu ten test zgłosi brakujące pliki. Trzeba najpierw usunąć (lub wyłączyć) to sprawdzenie w osobnej zmianie.

Polecenie usunięcia po potwierdzeniu (z korzenia repozytorium):

Windows (PowerShell):
```
Get-ChildItem assets/world -Recurse -Filter *_x2.png | Remove-Item
```

Linux/macOS:
```
find assets/world -name '*_x2.png' -delete
```

Pełna lista (posortowana, z dysku):

```
assets/world/bg/farm_x2.png
assets/world/bg/garden_day_x2.png
assets/world/bg/garden_evening_x2.png
assets/world/bg/garden_morning_x2.png
assets/world/bg/garden_night_x2.png
assets/world/bg/market_x2.png
assets/world/bg/park_day_x2.png
assets/world/bg/park_evening_x2.png
assets/world/bg/park_morning_x2.png
assets/world/bg/park_night_x2.png
assets/world/farm/farm_x2.png
assets/world/farm/fence_farm_x2.png
assets/world/farm/scarecrow_x2.png
assets/world/farm/signpost_x2.png
assets/world/farm/wheelbarrow_x2.png
assets/world/garden/arch_rose_x2.png
assets/world/garden/bench_wood_x2.png
assets/world/garden/bird_bath_x2.png
assets/world/garden/bush_berry_x2.png
assets/world/garden/fence_wood_x2.png
assets/world/garden/flowerbed_daisy_x2.png
assets/world/garden/flowerbed_tulip_x2.png
assets/world/garden/hedge_x2.png
assets/world/garden/lantern_garden_x2.png
assets/world/garden/memory_corner_x2.png
assets/world/garden/path_stone_x2.png
assets/world/garden/pigloo_garden_x2.png
assets/world/garden/pond_small_x2.png
assets/world/garden/sandbox_pig_x2.png
assets/world/garden/tree_small_x2.png
assets/world/house/armchair_x2.png
assets/world/house/bookshelf_x2.png
assets/world/house/cosy_nook_x2.png
assets/world/house/curtains_dots_x2.png
assets/world/house/cushion_big_x2.png
assets/world/house/fairy_lights_x2.png
assets/world/house/hanging_planter_x2.png
assets/world/house/hay_bar_wood_x2.png
assets/world/house/shelf_small_x2.png
assets/world/house/side_table_x2.png
assets/world/house/sofa_cosy_x2.png
assets/world/house/toy_basket_x2.png
assets/world/house/wall_clock_x2.png
assets/world/house/window_sun_x2.png
assets/world/market/order_board_x2.png
assets/world/market/promo_1_x2.png
assets/world/market/promo_2_x2.png
assets/world/market/promo_3_x2.png
assets/world/market/stall_basic_x2.png
assets/world/market/stall_big_x2.png
assets/world/park/bench_park_x2.png
assets/world/park/bridge_wood_x2.png
assets/world/park/flower_arch_x2.png
assets/world/park/fountain_x2.png
assets/world/park/gazebo_x2.png
assets/world/park/lamp_post_x2.png
assets/world/park/path_cobble_x2.png
assets/world/park/picnic_blanket_x2.png
assets/world/park/pond_big_x2.png
assets/world/park/statue_pig_x2.png
assets/world/park/tree_big_x2.png
assets/world/park/tunnel_playground_x2.png
assets/world/tiles/fence_00_x2.png
assets/world/tiles/fence_01_x2.png
assets/world/tiles/fence_02_x2.png
assets/world/tiles/fence_03_x2.png
assets/world/tiles/fence_04_x2.png
assets/world/tiles/fence_05_x2.png
assets/world/tiles/fence_06_x2.png
assets/world/tiles/fence_07_x2.png
assets/world/tiles/fence_08_x2.png
assets/world/tiles/fence_09_x2.png
assets/world/tiles/fence_10_x2.png
assets/world/tiles/fence_11_x2.png
assets/world/tiles/fence_12_x2.png
assets/world/tiles/fence_13_x2.png
assets/world/tiles/fence_14_x2.png
assets/world/tiles/fence_15_x2.png
assets/world/tiles/floor_bedroom_1_x2.png
assets/world/tiles/floor_bedroom_2_x2.png
assets/world/tiles/floor_bedroom_3_x2.png
assets/world/tiles/floor_bedroom_4_x2.png
assets/world/tiles/floor_playroom_1_x2.png
assets/world/tiles/floor_playroom_2_x2.png
assets/world/tiles/floor_playroom_3_x2.png
assets/world/tiles/floor_playroom_4_x2.png
assets/world/tiles/grass_1_x2.png
assets/world/tiles/grass_2_x2.png
assets/world/tiles/grass_park_x2.png
assets/world/tiles/memory_stone_x2.png
assets/world/tiles/wall_bedroom_1_x2.png
assets/world/tiles/wall_bedroom_2_x2.png
assets/world/tiles/wall_bedroom_3_x2.png
assets/world/tiles/wall_bedroom_4_x2.png
assets/world/tiles/wall_playroom_1_x2.png
assets/world/tiles/wall_playroom_2_x2.png
assets/world/tiles/wall_playroom_3_x2.png
assets/world/tiles/wall_playroom_4_x2.png
assets/world/tiles/water_0_x2.png
assets/world/tiles/water_1_x2.png
assets/world/tiles/water_2_x2.png
assets/world/tiles/water_3_x2.png
```
