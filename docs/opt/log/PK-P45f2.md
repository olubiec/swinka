# PK-P45f2: Pig shadow: one sprite, no ellipse
- Decisions: Replaced ctx.ellipse shadow with unconditional sprite shadow (shadow_pig_<stage>.png) at pig feet x, y - 2*scale, before pig.
- API/Fields: debug().shadowDraws (increments 1 per frame when shadow is drawn), debug().shadow ({ key, url, x, y, width, height, centerX, feetX, feetY, scale, draws }), debug().loadedImageUrls.
- Helpers: CanvasPig.setStage / PigCanvas.prototype.setStage / CanvasPig.stageKey for life stage transitions.
- Status: Completed.

