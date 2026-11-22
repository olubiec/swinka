# PK-T22 Log
Summary: 11 PASS, 1 DEFECT, 0 SKIP (7 JS + 5 C# cases).
C# HayHop tests: 27/27 passed (5 new in HayHopAdversarialTests.cs).
DEFECT HOP-console-clean: 50 consecutive MiniGames.start('hay_hop') restarts trigger 34 WebGL pageerrors.
- Steps: Open web/home/minigames/hayhop/index.html in Playwright and call MiniGames.start('hay_hop', { container }) 50 times.
- Expected: 0 console.error and 0 pageerror during load, play, and 50 restarts.
- Actual: 34 pageerrors ("Failed to execute 'getProgramParameter' on 'WebGLRenderingContext': parameter 1 is not of type 'WebGLProgram'").
Decisions: Used channel:'msedge' fallback in Playwright; loaded hayhop.json and economy.json via RepoFile without mutating statics.
