Status: PASS (home-behavior-check PASS: 28 actions, 54 ANIM_DEFS, 3 bad samples; ux-p110-behavior PASS: 11/11 B1..B11).
API: window.PigBehavior / module.exports { create({data,homeData,rng,now,stage,modifiers}), getBudgetGroup }; instance { tick(dtMs,ctx), interrupt(reason), resume(ctx), current(), debug() }.
Decisions: mirrored Brain.cs availability, stage_min, consecutiveCount<=2, cooldowns, daily_limit, day budget feedback, and sick blocking; dragging interrupts active sleep/nap/sleeping_together and blocks new actions; ctx.needs is never mutated.
home_behavior.json: 28 actions + R37 sec 4 motion section; added optional weightBonus (0 default) on signal/cold/heat/social/drink/sleeping_together entries so zero-effect and companion actions win when conditions hold.
Differences from R36: R36 sec 5 motion lacked popcornDurationMs & extended bubbles; used R37 sec 4 full motion section per PK-H1 step 3.
Validator: home-behavior-check.js exports validate(data, actions, animSet), parses ANIM_DEFS from canvas-pig.js via regex, checks all 28 actions, minMs<=maxMs, allowedScenes, motion completeness, plus 3 bad samples.
Stubs: none (pure Node tests with deterministic seeded PRNG).