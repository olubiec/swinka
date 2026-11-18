Decyzje:
- Warstwa pogody bez edycji canvas-pig.js: użyć istniejącego `window.CuyRoom.addLayer('weather', 15, fn)` (`canvas-pig.js:392-397`), bo `CanvasPig.addLayer` nie istnieje.
- Zabawki w atlas.json mają id `prop_tunnel`, `willow_tunnel`, `tunnel_playground`, `prop_ball`, `prop_hay_ball`; `play-targets.js` akceptuje oba zestawy (z `tunnel`/`ball`).
- Ognisko D4 (`campfire_flame.png` 144x32) ma 6 klatek po 24x32 przy 8 fps (`campfire_flame.json`), a `campfire_base.json` daje `flame_anchor: [16, 17]`.
- `Lights.activeSources` (`lights.js:99-106`) musi blokować `manual`/`placed.on` gdy `src.toggle === false`; `autoOn` już obsługuje `outdoor` od `evening`, ale nie jest eksportowane.
- Pytanie do właściciela: czy `prop_tunnel`/`prop_ball` mają dostać osobne wpisy w `world_items.json` do sklepu, czy na razie zostają jako prop/atlas? Wybrano: nie zakładać zmian w `world_items.json`, obsłużyć oba nazewnictwa w `play-targets.js`.
- Nazwy API: `CuyPlayTargets.{interactionSpots,pickReachable,kindOf}`, `CuyWeather.{stateFor,draw}`, `Lights.{activeSources,autoOn}`, `thing.suppressDraw`.
- Weryfikacja: `node tools/qa/foundation-check.js docs/opt/foundations/R31.md 8`.
