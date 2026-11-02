# Roadmap: what is left (2.11.2026)

**12 Jules waves (W11-W22), 76 tasks**, plus **7 art waves** (R, S0-S5) done by Claude Code. No loop is enabled; W11 waits in `tasks/`, W12-W22 are ready in `docs/prompts/` (71 files, loop format, validated: no `Zmieniaj` overlap in any wave).
The loop adds its own test (`T<n>`) and integration (`I<n>`) tasks after each wave, so real sessions will be somewhat higher than 76.

## Part 1: Named pigs (28 tasks, 5 waves). Design: `docs/NAMED_PIGS.md`
| Wave | Tasks | What it delivers | Where |
|---|---|---|---|
| W11 | 5 | catalog loader, `PigModifiers`, `PigProfile` fields, flags (off), achievements | `tasks/` (ready) |
| W12 | 5 | `OfferChecker`, active modifiers, per-pig age, `LegendRoll`, offer state fields | `docs/prompts/` |
| W13 | 5 | Brain and hay modifiers, adoption from offers, new game and migration, `PigsFeature` | `docs/prompts/` |
| W14 | 8 | bond/minigame modifiers, per-pig look, desktop offers, poop rate, startle, My Pigs screen, mock, sprite resolver | `docs/prompts/` |
| W15 | 5 | flags on, collection economy sim, smoke, contracts and manual tests, self-test | `docs/prompts/` |

## Part 2: World (48 tasks, 7 waves). Design and economy: `docs/WORLD.md`
| Wave | Tasks | What it delivers |
|---|---|---|
| W16 | 8 | loaders (farm, market, places, items), farm items in the catalog, `GameState.World`, flags (off), 8 achievements |
| W17 | 8 | pure logic: room layout, comfort, farm engine, expansion, market pricing, stock and orders, place unlock, legacy decor migration |
| W18 | 7 | Pet integration: places, rooms, farm, market, walk and varied diet, diary lines, save migration |
| W19 | 6 | C# features (places, rooms, farm, market), contracts, message validation |
| W20 | 8 | Home UI: places bar, room editor (+ extras), garden and park, farm, market (+ orders), mock |
| W21 | 5 | harvest notification, settings, sounds, My Pigs links, canvas limits |
| W22 | 6 | flags on, economy sim in C# with invariants, smoke for world screens, manual tests, self-test, save size |

Order is strict: W11 → W15 → W16 → W22 (the world uses offers, memorial pigs and the flags pattern). Inside a wave tasks are independent.

## Part 3: Graphics (7 art waves). List with sizes and counts: `docs/GRAFIKA_KOLEJKA.md`
R (finish pig looks: rex whiskers, per-breed heads, 5 portraits, pattern icons, album, 4 icons) · S0 (24 UI icons) · S1 (farm: 56 plant frames + tools + 22 item icons) · S2 house (14 items + tiles) · S3 garden (15 + backgrounds) · S4 park (12 + backgrounds) · S5 farm and market (4 items + stalls). No wave waits for art: the code draws fallback glyphs until files exist.

## Human steps
1. Rotate the Jules API key (it sits in the Project instructions) and enable the new loop when ready; until then copy waves with `tools/release-wave.sh W<n>`.
2. Windows test after W14 and W15 (two pigs of different ages, offer and adoption, memorial mode, poop rate, skittish James) and after W22 (`TESTY_RECZNE.md`, world section).
3. Approve the look of the five pigs after wave R.
4. Tune numbers in `assets/data/*.json`; check with `node tools/qa/data-check.js` and `node tools/qa/economy-sim.js --runs 12 --variant baseline --sweep --check`.

## Known blockers
Loop disabled on purpose; Jules API not reachable from this environment; .NET cannot be installed here, so C# builds and tests run only in the loop or on Windows.
