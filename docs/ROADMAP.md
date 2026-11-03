# Roadmap: what is left (2.11.2026)

**20 Jules waves (W11-W30), 143 tasks** (W14-09 and W22-07 were added by the orchestrator session; `waves.yaml` now holds 45 waves/sub-waves and 154 tasks including QA and cleanup): W11-W15 named pigs (28), W16-W22 world (48), W23-W30 pig rooms, roaming, run, desktop props and the home store (65). Art: v1 of everything exists; open: style wave S (owner gate) and the new P0-P3 (33 required files, `docs/DESIGNER_BRIEF.md`). No loop is enabled; W11 waits in `tasks/`, W12-W30 are ready in `docs/prompts/` (136 files, loop format, validated: no `Zmieniaj` overlap in any wave).
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

Order is strict: W11 → W15 → W16 → W22 → W23 → W30 (the world uses offers, memorial pigs and the flags pattern; pig rooms use the world). Inside a wave tasks are independent.

## Part 3: Pig rooms and the home (65 tasks, 8 waves). Design: `docs/PIG_ROOMS.md`
| Wave | Tasks | What it delivers |
|---|---|---|
| W23 | 8 | Core foundations: `PigRoomConfig`, world-state fields, per-pig comfort, room creation with themes, dynamic room levels, flags and achievements, `HomeEconomyConfig`, simulator variant |
| W24 | 6 | Pet integration: a room per adopted pig, per-pig comfort in mood decay, item colours (paid), room names, storage and transfer, memory room, save migration, diary |
| W25 | 7 | `RoomsFeature` extension, contracts, validation, room tabs with portraits, customize panel, My Pigs link, mock |
| W26 | 9 | shared bedroom (pure merge/split, Pet, comfort, feature, contracts, UI, mock), flags on, smoke and manual steps |
| W27 | 8 | roaming or tied to a room, wander schedule, house plan (flat cutaway), pigs walking in rooms |
| W28 | 9 | garden run (fence + gate check, rules, Pet, feature, UI, mock) and the desktop props audit |
| W29 | 9 | desktop props saved and attached to the house, drop into rooms and back, desktop overlay, tray UI |
| W30 | 9 | one home store, purchase facade, store UI, full economy simulator, data checks, smoke and manual steps, flags on |

3D / isometric view was dropped (3.11.2026); notes kept in `docs/PIG_ROOMS.md` section 11.

W23-W30 are executed as 25 sub-waves (`W23a`...`W30c`, `docs/prompts/subwaves.json`, already in `waves.yaml`) because many tasks use code of a sibling task.

## Part 4: Graphics. Status and what is left: `docs/GRAFIKA_KOLEJKA.md`; designer brief: `docs/DESIGNER_BRIEF.md`
v1 of all art exists. Open: style wave S (owner approval of 5 samples) and P0-P3 (13 icons, 5 signature items + 10 skin tiles, gate + 4 props, optional extras). No wave waits for art: the code draws fallback glyphs until files exist.

## Human steps
1. Rotate the Jules API key (it sits in the Project instructions) and enable the new loop when ready; until then copy waves with `tools/release-wave.sh W<n>`.
2. Windows test after W14 and W15 (two pigs of different ages, offer and adoption, memorial mode, poop rate, skittish James), after W22 (world) and after W26 and W30 (`TESTY_RECZNE.md`: pig rooms, shared bedroom, roaming, run, desktop props, store).
3. Approve the style samples (wave S gate) and the Kuki sample of P1; decide the open points in `docs/PIG_ROOMS.md` section 13.
4. Tune numbers in `assets/data/*.json`; check with `node tools/qa/data-check.js` and `node tools/qa/economy-sim.js --runs 12 --variant baseline --sweep --check`.

## Known blockers
Loop disabled on purpose; Jules API not reachable from this environment; .NET cannot be installed here, so C# builds and tests run only in the loop or on Windows.
