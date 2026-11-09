# PK-P45a2: Overlay tool: window crop and pig silhouette
- Added `crop` and `pig` layers to `LAYERS` and `DEFAULT_LAYERS` in `tools/qa/scene-overlay.js`.
- Crop visible rect: `k = Math.max(1, Math.floor(370 / sw))`, visible width `Math.min(sw, Math.floor(370 / k))` centered in scene.
- For scenes that fit whole (`sw <= 370`), crop is a no-op; for park (`sw=384`), draws plum[0]/plum[1] dither outside and flame[1] outline.
- Pig silhouette: 46x29 scene px rectangle scaled by `depthScale[0]` (top walk edge) and `depthScale[1]` (bottom walk edge).
- Scale rounded to 1/16 (`Math.round(s * 16) / 16`), feet on band edge, center x aligned with walk band center, outline in rose[1].
- Pig label: text-free label drawn as two 4px ticks in rose[1] at top of each pig rectangle.
- Maintained room canvas compatibility (240x130) for overlay IHDR checks while layout grid migration in P45d/e is ongoing.
- Created `tools/qa/ux-p45-overlay-pig.js` verifying OP1 (crop diff/ident), OP2 (heights match round(29*s)*4), OP3 (byte-identical).
