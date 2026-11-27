# Pixel-Art Brief for Upcoming Advanced Minigames (`cuy-hay-house` palette)

All sprites MUST strictly use the 44-color `cuy-hay-house` palette defined in `assets/data/style_palette.json` (`tools/art/handart.py`, indexed PNG x1, transparent index 0, outline `#3a1d17` / `#241824`).

## 1. *Cuy Quest: Three Piggies* (Optional Hand-Crafted Upgrade)
Current procedural tileset lives in `assets/minigames/cuy_quest/tiles.png` (16x16 strip, 16 frames).
If you want richer hand-drawn variants, keep the exact 16-frame layout (256x16):
- Frame 0: Grass + soil block (16x16)
- Frame 1: Wooden barn platform (16x16)
- Frame 2: Park brick wall (16x16)
- Frames 3-4: Lever OFF / ON (16x16)
- Frames 5-6: Heavy pressure plate UP / DOWN (16x16)
- Frame 7: Heavy apple crate (16x16)
- Frame 8: Bouncy mushroom (16x16)
- Frames 9-10: Barn fan OFF / ON (16x16)
- Frame 11: Wooden gate (16x16)
- Frame 12: Hollow log tunnel for Kuki (16x16)
- Frame 13: Chewable hay rope (16x16)
- Frame 14: Cozy goal house (16x16)
- Frame 15: Golden clover star (16x16)

## 2. *Tomb of the Cuy* (Next Wave — *Tomb of the Mask* style)
Target folder: `assets/minigames/tomb_cuy/tiles.png` (16x16 strip):
- Underground pantry/root-cellar wall tiles (auto-tileable dark plum/wood/dusk)
- Glowing amber firefly dots & big golden clover gems
- Timed floor spikes (retracted / warning / extended, 3 frames)
- Acorn dart shooter turret + projectile (16x16)
- One-way wooden flap gate + burrow teleport portal (2 swirl frames)
- Rising flood / twilight mist edge tile (16x16, 2 frames)

## 3. *Super Cuy World* (Future Wave — *Mario* style)
Target folder: `assets/minigames/super_cuy/tiles.png` (16x16 strip):
- `[?]` clover block (idle + hit empty, 2 frames) & breakable brick block
- Hollow tree-trunk pipe (top-left, top-right, body-left, body-right)
- Super Bell-Pepper power-up item & checkpoint flag (down / raised)
- Rolling chestnut enemy (2 frames) & hopping pond frog (2 frames)

## 4. *Veggie Merge Drop* (Future Wave — *Suika* style)
Target folder: `assets/minigames/veggie_merge/fruits.png`:
- 10 circular pixel-art veggies/fruits scaled progressively (16x16 up to 64x64):
  1. Blueberry (16px) -> 2. Strawberry (22px) -> 3. Radish (28px) -> 4. Brussels Sprout (34px) -> 5. Carrot Ball (40px) -> 6. Cucumber Slice (46px) -> 7. Apple (52px) -> 8. Bell Pepper (58px) -> 9. Lettuce Head (62px) -> 10. Golden Pumpkin (64px)
