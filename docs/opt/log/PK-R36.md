PK-R36 PASS: node tools/qa/foundation-check.js docs/opt/foundations/R36.md 7 (7 sections, 15019 chars).
Decision: Chose Architecture A (pure JS web/home/lib/pig-behavior.js) over B because Brain.cs only tracks 1 desktop pig, HomeWindow.cs:656 sends no duration/spots, and mock/Playwright has no C# process.
API: PigBehavior.create({data,homeData,rng,now,stage,modifiers}) -> {tick(dtMs,ctx), interrupt(reason), resume(ctx), current(), debug()}.
Return of tick: null or {id, anim, durationMs, loop, needsSpot, bubble, sound}.
Schema home_behavior.json: {version:1, actions:{<id>:{allowedScenes,spot,weightMul,minMs,maxMs,homeAnim,loop,bubble,sound}}, motion:{hop,speeds,stageSpeedMul,particles,bubbles}}.
Owner question 1 (rumblestrut stage_min vs Brain.cs ignoring stage_min): chose honoring stage_min in JS to match actions.json:319.
Owner question 2 (does PigBehavior mutate ctx.needs directly?): chose NO — Home's bridge.js/C# owns state.needs.
Gaps/Notes: HomeWindow.cs:656 does send currentAction to Home (contradicting PK-CV3 prompt note); added Prompt fix; CuyScenePigs internals (scene-pigs.js) marked UNVERIFIED.
