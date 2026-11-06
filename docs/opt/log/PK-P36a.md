# PK-P36a: Main window places bar
- Markup: `<div class="places-bar" id="placesBar">` with `.ui-arrow-left` (#placesPrevBtn), `.places-bar-title` (#placesBarTitle), `.ui-arrow-right` (#placesNextBtn); plus `#placesLockedHint` with `.icon-padlock` and `#placesHintText`.
- Style: Bar height 32px matching #btnClose height; wood panel background (`assets/ui/header_banner.png`), 32x32px arrows (`arrow_left.png`, `arrow_right.png` with pressed variants on :active), font `--ui-font` ('Pixelify Sans'), text `--ui-text-on-wood`.
- Behaviour: Left/right arrow clicks and ArrowLeft/ArrowRight keys cycle scenes using `CuyScenes.order` / `CuyScenes.neighbor`, calling `CanvasPig.setScene` and `CanvasPig.setThings`.
- Lock & Visibility: Locked scenes dim background via `p36_locked_overlay` (night ambient) and show `#placesLockedHint`; `CanvasPig.setPigVisible` shows the pig only in its scene (`CuyScenes.pigScene`) and hides it in locked/other scenes.
- APIs: `window.CuyPlaces` (`getCurrentPlace`, `setCurrentPlace`, `getCurrentHouseRoom`, `setCurrentHouseRoom`, `openPlace`, `next`, `prev`, `applyScene`, `updateStageNav`).
- Differences from plan: None. All 7 tests in `ux-p36-bar.js` (M1-M7) green.
