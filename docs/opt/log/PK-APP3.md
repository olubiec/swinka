Status: PASS (ux-p118-app-load.js A1-A5 passed using msedge fallback when Playwright Chromium executable was absent).
Decisions:
- index.html: added lib/world-sounds.js after sound.js; draw-budget, pig-behavior, rest-spots, pig-motion, pig-reactions after play-targets.js before canvas-pig.js; features/places/edit-history.js before edit-panel.js (for A1 EditHistory & RI5 §2).
- features/index.json: appended "run" after "places".
- app.js: added initBehaviorData() loading draw_limits.json (DrawBudget.loadLimits), actions.json, home_behavior.json -> canvasPig.setBehaviorData(actions, homeBehavior) guarded by typeof check.
- app.js: updateStateUI forwards CuyPlaces.getSceneContext() to canvasPig.setSceneContext when both exist; giveFood/btnClean/btnCall route via triggerPigReaction() -> canvasPig.applyReaction or PigReactions.react fallback.
- ux-p118-app-load.js: added channel:'msedge' fallback if default chromium.launch() fails; ignored optional features/*/mock.js 404s (app.js has onerror noop); guarded STUB PigCanvas.setBehaviorData/applyReaction in A4.
Gaps/Differences: none.
