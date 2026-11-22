Status: PASS (ux-p100-places-wiring.js F1-F6 passed using msedge fallback and atlas-backed 'sofa_cosy' item in F2).
Decisions:
- places/feature.js: added CuyPlaces.getSceneContext() -> { sceneId, sceneKind: 'room'|'outdoor', things }, lastSceneContext cache, CanvasPig.setSceneContext forwarding, and rest spot invalidation (inst.invalidateRestSpots() / inst.pendingSpot = null) inside existing lastThingsSig/isPigBeingDragged guard.
- places/feature.js: handleEdgeHold (locked neighbor) calls WorldSounds.play('edit_error'); applyScene (unlocked park or garden with fountain) calls WorldSounds.play('fountain_ambience', { minIntervalMs: 1400 }); sceneChanged syncs CuyRun.onState(st).
- ux-p100-places-wiring.js: waits for CuyScenes.getAtlas(), uses 'sofa_cosy' in F2 (scenes.js filters items missing atlas art), uses channel:'msedge' fallback if Playwright Chromium is absent, and checks STUB CanvasPig.setSceneContext.
Differences vs prompt: F3 tests edit_error/fountain_ambience per RI5 §3 (place/harvest/buy belong to edit-panel/garden/farm outside Zmieniaj).
Gaps: none.
