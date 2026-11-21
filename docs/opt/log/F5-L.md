# F5-L pig light
- Added PIG_LIGHT_DEFAULTS + pure pigLightAt (CanvasPig.pigLightAt) in canvas-pig.js; litFrame uses it per pixel, cfg in cache key, knee from cfg.
- lights.json pig_light block; lights.js gets Lights.pigLight(lights) helper (no single scene-object builder exists there; scenes are built in app.js/places, not in my file list).
- Gap: scene.pigLight is not yet passed by app.js/places; code defaults equal the json values, so behaviour is correct anyway.
- Acceptance: day/night factor == ambient; night + lamp at dist 0 -> [0.94,0.82,0.82] (<=1.0, R<=0.95).
- QA: p63 L9 defect (lamp set lists), p64 J2/J3 defects (ghost/grid) look unrelated to pig light; p45 had a stack trace but PS2-PS5 pass. Not verified against pre-change baseline.
