PK-R37 PASS: node tools/qa/foundation-check.js docs/opt/foundations/R37.md 6 (6 sections, 12068 chars).
API RestSpots: RestSpots.pick({kind,scene,things,pigPos,taken,rng}) -> null | {gx,gy,anim,faceLeft,spotType,thingId,pair}.
API PigMotion: PigMotion.offsetY(anim,tMs,cfg), speed(anim,stage,cfg), particles(anim,tMs,rng,cfg,currentCount), bubble(anim,cfg).
Data schema motion in home_behavior.json: hop{popcornHeightPx:10,popcornDurationMs:857,popcornPeakFrac:0.5}, speeds{walk:70,run:135,follow:85}, stageSpeedMul{baby:1.1,junior:1.15,adult:1.0,senior:0.72,legend:0.72}, particles{maxActive:24,zzzIntervalMs:900,heartIntervalMs:700,sweatIntervalMs:1100}, bubbles.
Owner question 1 (are gx,gy grid cells or scene pixels?): chose scene pixels inside scene.walk so RestSpots plugs directly into setTarget/isFree without grid-size ambiguity.
Owner question 2 (is offsetY positive lift or negative delta?): chose positive lift >=0 (subtracted from pigY in drawPig at canvas-pig.js:3727, matching M2 hop-never-negative).
Owner question 3 (how fast is zoomies vs desktop?): FormPet.cs eSheep velocity UNVERIFIED (outside allowed read list); set Home run=135 px/s, baby=1.1x, senior=0.72x in JSON.
