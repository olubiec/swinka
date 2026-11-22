# PK-H3 Log
Status: DONE
API: `window.PigMotion` / `module.exports` (`DEFAULT_CFG`, `offsetY(anim,tMs,cfg)`, `speed(anim,stage,cfg)`, `particles(anim,tMs,rng,cfg,currentCount)`, `bubble(anim,cfg)`).
Decyzje:
- `particles(anim,tMs,rng,cfg,currentCount)` emituje 1 cząstkę gdy `tMs >= interval` i `currentCount < maxActive` (brak ukrytego stanu wewnętrznego, w pełni deterministyczne).
- Bezpieczny odczyt `cfg` (per-klucz z fallbackiem do `DEFAULT_CFG` + `hasOwnProperty` dla `bubbles`/`stageSpeedMul`, ochrona przed `__proto__`/`constructor`).
Różnice od R37: brak; wartości w `DEFAULT_CFG` i pola cząstki (`type,dx,dy,vx,vy,life`) zgodne z R37 §4.
STUB w teście (`ux-p112-motion.js`): `STUB_MOTION_CFG` (kopia sekcji `motion` z R37 §4 dla `home_behavior.json` należącego do PK-H1).
Weryfikacja: `node --check web/home/lib/pig-motion.js && node --check tools/qa/ux-p112-motion.js && node tools/qa/ux-p112-motion.js` -> 10/10 PASS.
