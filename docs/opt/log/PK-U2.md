# PK-U2 Log
- Created `assets/data/draw_limits.json`, `web/home/lib/draw-budget.js` (`window.DrawBudget`), `web/home/lib/world-sounds.js` (`window.WorldSounds`).
- `DrawBudget` API: `DEFAULT_LIMITS`, `loadLimits`, `setLimits`, `getLimits`, `isVisible`, `selectItems`, `capAnimated`, `capParticles`, `capLights`, `shouldDrawFrame`, `frameCost`.
- `WorldSounds` API: `EVENT_MAP` (17 events), `isSuppressed`, `setSuppressed`, `canPlay`, `play`, `resetThrottle`.
- Decision: `selectItems` treats `isGhost`, `isPig`/`kind==='pig'`, `interactive`/`isInteractive`, `isFixture`/`fixture`/`layer==='fixture'` as protected (never dropped); drops farthest `decor`/`ground` first by `layerPriority` and distance to `focusPt`.
- Decision: `capAnimated` filters to items with explicit animation/light fields when any item has them, or all valid items otherwise; `shouldDrawFrame` enforces `1000 / hiddenFps` only when `isHidden === true`.
- Decision: `WorldSounds.play` uses `opts.sound` or `root.Sound` (`Sound.play(cue)` fallback `Sound[cue]()`) and throttles per event by `EVENT_MAP[event].minIntervalMs` (e.g. `edit_error` 120ms, `walk_grass` 320ms).
- Differences: Prompt PK-U2 excludes `web/home/sound.js` and `web/home/index.html` (listed in R40 §6); `Sound.CUES`/`Sound.play` and `<script>` wiring remain for the wiring step.
- Stubs: `STUB Sound` in `tools/qa/ux-p115-budget-sounds.js` for W1-W5; verification: 11/11 passed.
