# PK-T12: Performance, memory and listener leaks
Results: 7 PASS (P2, P3, P4, P5, P6, P7, P8), 1 DEFECT (P1), 0 SKIP.
Decisions: P1 compares synchronous render/update p95 and rAF p95 against the baseline salon scene; P5 tracks EventTarget.prototype.addEventListener/removeEventListener; P3 forces GC via HeapProfiler.collectGarbage + window.gc().
- DEFECT P1: Stress scene (3 pigs, 60 instances, rain weather, 4 lights at night) frame render time p95 is 5.40x baseline (44.80 ms vs 8.30 ms, threshold <= 2.5x).
  Repro: Open `garden` at night (`__cuyNow = '23:00'`) with 3 pigs, 60 placed items (4 lit outdoor lamps), and rain weather; measure 80 frames of `update` + `render`.
  Expected: Frame time p95 <= 2.5x baseline scene (`salon`, 1 pig, day) and `CuyLight.build('garden')` populates 4 active sources automatically on `applyScene`.
  Actual: Per-object offscreen `thingLitCanvas` compositing (3x `drawThing`/composite per standing object in front of the first pig when lit) plus `litFrame` per-pixel CPU lighting for 3 pigs pushes p95 to 5.40x baseline; also `app.js` `refreshPigLight()` overwrites `lightScene.sources` with `[]` unless `CuyLight.build` is re-applied.
