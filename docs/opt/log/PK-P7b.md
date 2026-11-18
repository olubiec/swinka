# PK-P7b: Reachable play targets module
- Status: OK
- API (`window.CuyPlayTargets` / `web/home/lib/play-targets.js`): `kindOf(thing)`, `interactionSpots(thing, def)`, `pickReachable(things, pigPos, isFree, findPath, rng, defs)` returning `{ thingUid, itemId, kind, spot: { x, y, facing, side }, path }`.
- Decyzje: `defs` obsługuje zarówno funkcję `defs(itemId)` (jak w `R31.md` sekcja 3), jak i mapę obiektową `defs[itemId]`; `kindOf` sprawdza `itemId` przed `id`, aby `uid` z sufiksem nie nadpisywał typu.
- Różnice od pliku badawczego: brak (kontrakt `R31.md` sekcja 2 + `Prompt fixes` dla `prop_tunnel`, `willow_tunnel`, `tunnel_playground`, `prop_ball`, `prop_hay_ball` wdrożony dosłownie).
- Atrapy STUB w `tools/qa/ux-p7-play-targets.js`: `STUB grid-16` (`makeGrid16` — 16 px siatka 256x144 z `isFree` i BFS `findPath`).
- Weryfikacja: `node --check web/home/lib/play-targets.js`, `node --check tools/qa/ux-p7-play-targets.js`, `node tools/qa/ux-p7-play-targets.js` — 10/10 PASS (`T1..T10`).
