# RF2: Classic Places Bar Restoration & 16:9 Stage Viewport Fit

Foundations specification for `PK-PF-BAR`, restoring the classic pre-F2 `.places-bar` with a readable `"Edit"` text button and making `#pigCanvas` fill the stage width at 16:9 without large brown borders or clipping `#btnMore`.

## 1. Why `#pigCanvas` has huge brown borders today (`style.css` & `places/feature.css`)

Both `web/home/style.css` (lines 375–401) and `web/home/features/places/feature.css` (lines 30–56, higher selector specificity `.stage-viewport #pigCanvas`) define the same layout bug:

1. **Intrinsic-size clamping instead of responsive width**: `#pigCanvas` uses `width: auto; height: auto; max-width: 100%; max-height: 100%; aspect-ratio: 16 / 9; object-fit: contain;`. Because `<canvas>` is a replaced element, `width: auto; height: auto` resolves to the canvas's intrinsic backing-store dimensions (`width="240" height="130"` in `web/home/index.html:87`, or `256×144` if resized by JS). `max-width: 100%; max-height: 100%` only shrinks oversized elements; it never scales the canvas up to fill the ~412–420 px stage width.
2. **Unbounded flex growth of `.stage-viewport`**: `.stage-viewport` uses `flex: 1 1 0; height: 0; min-height: 80px;` with `background: var(--ui-wood-0)` (`#47281c`). In a `420×640` window, `.stage-viewport` expands vertically to absorb all remaining height (~260 px) while `#pigCanvas` remains locked at ~240×130 (or 256×144) CSS px.
3. **Centering exposes the leftover area as brown borders**: Because `.stage-viewport` sets `display: flex; align-items: center; justify-content: center;`, the unscaled canvas floats in the middle of a ~412×260 px dark-brown (`var(--ui-wood-0)`) box, producing ~78–90 px of brown side borders and ~58–65 px of top/bottom brown borders.
4. **Vertical budget instability**: With `flex: 1 1 0`, `.stage-viewport` does not tie its height to the 16:9 stage width, and any sibling growth (such as opening panels) competes against fixed bottom controls like `#btnMore`.

## 2. Why `.places-bar` looks ugly after `PK-P47c` vs classic pre-F2 bar

| Aspect | Current `PK-P47c` (`feature.css:6-145`, `index.html:72-79`) | Classic pre-F2 target (`PK-PF-BAR`) |
| --- | --- | --- |
| Bar frame | `height: 26px; border-width: 8px; border-image: var(--ui-nav_bar_frame) 8 fill / 8px; box-sizing: border-box;` leaves only **10 px** inner height (`26 - 16`), so 18–20 px children collide with the thick 9-slice border | `min-height: 24px; padding: 0 4px; background-color: var(--ui-wood-2); border-top: 2px solid var(--ui-wood-1); border-bottom: 2px solid var(--ui-wood-0);` — clean flat wood strip without heavy frame overlap |
| Title plate | `.places-bar-plate` `height: 18px` with `5px` top/bottom `nav_title_plate.png` 9-slice border leaves only **8 px** inner height for `12px` text, clipping/crowding the title | Dark wooden plaque (`background-color: var(--ui-wood-1)` with `2px solid var(--ui-wood-0)` border, `height: 20px`, `padding: 0 8px`) inside `.places-bar-plate`, giving generous vertical clearance for 12 px text |
| Scene arrows | `20×20` px using `nav_btn_arrow_left*.png` / `nav_btn_arrow_right*.png` | `24×24` px using classic `arrow_left.png` / `arrow_right.png` (`width: 24px; height: 24px; background-size: 24px 24px`) |
| Edit control | `<button ... id="placesEditBtn"></button>` (`index.html:78`) has empty text; `feature.css:143+` overrides `edit-panel.css` with a `24×20` icon-only `nav_btn_edit.png` hammer | Readable `"Edit"` text inside `#placesEditBtn`, restoring `edit-panel.css:5-45` (`height: 20px; font-size: 11px; padding: 0 6px; margin-right: 4px; border-image: var(--ui-btn_normal) 6 fill / 6px;`) |

### QA assertions in `tools/qa/ux-p47-bar.js` (lines 1–95) that must keep passing

- **T1 (`ux-p47-bar.js:10-49`)**: Checks that all 13 `nav_*` files exist under `assets/ui/` and checks via substring match (`css.includes(ref)`) that `web/home/features/places/feature.css` contains all 11 PNG filenames: `nav_bar_frame.png`, `nav_title_plate.png`, `nav_btn_edit.png`, `nav_btn_edit_hover.png`, `nav_btn_edit_active.png`, `nav_btn_arrow_left.png`, `nav_btn_arrow_left_hover.png`, `nav_btn_arrow_left_pressed.png`, `nav_btn_arrow_right.png`, `nav_btn_arrow_right_hover.png`, `nav_btn_arrow_right_pressed.png`. Keep those 11 filenames in an inactive comment or unused helper class in `feature.css`.
- **T2 & T3 (`ux-p47-bar.js:72-93`)**: Require `#placesEditBtn` to exist (`count === 1`), toggle `aria-pressed` (`"false"` ↔ `"true"`) and `#editDrawer.hidden`, **and assert that `getComputedStyle(editBtn).backgroundImage` is not `'none'` and differs across normal, `:hover`, and active (`aria-pressed="true"`) states**. Note that `border-image` alone sets `borderImageSource` while leaving `backgroundImage: 'none'`! Therefore `.places-edit-btn` must pair `border-image` with distinct zero-sized `background-image` declarations across the three states (`background-size: 0 0; background-repeat: no-repeat;`) so T2/T3 pass without modifying `ux-p47-bar.js` and without drawing over the `"Edit"` label.
- **T4+ (`ux-p47-bar.js:95+`)**: Preserves `#placesBar`, `#placesPrevBtn`, `.places-bar-plate`, `#placesBarTitle`, `#placesNextBtn`, `#placesEditBtn` in DOM. (Lines 96–194 were outside `PK-RF2` read scope; see `## 5.`).

## 3. Exact HTML & CSS specification for `PK-PF-BAR`

### `web/home/index.html` (lines 71–79)

Keep all IDs/classes intact and restore the `"Edit"` button text on line 78:

```html
    <!-- Places bar (PK-P36a, PK-PF-BAR) -->
    <div class="places-bar" id="placesBar" role="region" aria-label="Scene navigation">
      <button type="button" class="ui-arrow-left" id="placesPrevBtn" aria-label="Previous scene"></button>
      <div class="places-bar-plate">
        <div class="places-bar-title" id="placesBarTitle">Salon</div>
      </div>
      <button type="button" class="ui-arrow-right" id="placesNextBtn" aria-label="Next scene"></button>
      <button type="button" class="places-edit-btn" id="placesEditBtn" aria-label="Edit" aria-pressed="false">Edit</button>
    </div>
```

### `web/home/style.css` (lines 375–401)

```css
.stage-viewport {
  position: relative;
  width: 100%;
  background: var(--ui-wood-0);
  border-bottom: 3px solid var(--ui-wood-0);
  overflow: hidden;
  line-height: 0;
  flex: 0 0 auto;
  min-height: 80px;
  height: auto;
  max-height: calc(100vh - 340px);
  display: flex;
  align-items: center;
  justify-content: center;
  --scene-k: 1;
}

#pigCanvas {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

### `web/home/features/places/feature.css`

1. **Remove or synchronize `.stage-viewport` and `.stage-viewport #pigCanvas` (lines 30–56)** so `feature.css` no longer overrides `style.css` with `flex: 1 1 0; height: 0;` and `width: auto; height: auto;` (prefer removing the duplicate block so `style.css` is the single source of truth).
2. **Restore classic `.places-bar`, `24×24` arrows, and dark wood title plate (lines 6–145+)**:

```css
.places-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  height: 28px; /* 24px inner lane + 2px top + 2px bottom borders with border-box */
  min-height: 24px;
  flex: 0 0 auto;
  box-sizing: border-box;
  width: 100%;
  padding: 0 4px;
  background-color: var(--ui-wood-2, #9c6636);
  border: 0;
  border-top: 2px solid var(--ui-wood-1);
  border-bottom: 2px solid var(--ui-wood-0);
  font-family: var(--ui-font, 'Pixelify Sans', monospace);
  color: var(--ui-text-on-wood);
  image-rendering: pixelated;
  user-select: none;
  position: relative;
  z-index: 5;
}

.places-bar .ui-arrow-left,
.places-bar .ui-arrow-right {
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  border: 0;
  padding: 0;
  background-color: transparent;
  background-position: center;
  background-size: 24px 24px;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  cursor: pointer;
  flex-shrink: 0;
  color: transparent;
  font-size: 0;
  line-height: 0;
  outline: none;
}

.places-bar .ui-arrow-left {
  background-image: var(--ui-arrow_left, url('../../../../assets/ui/arrow_left.png'));
}

.places-bar .ui-arrow-right {
  background-image: var(--ui-arrow_right, url('../../../../assets/ui/arrow_right.png'));
}

.places-bar .ui-arrow-left:hover,
.places-bar .ui-arrow-right:hover {
  filter: brightness(1.12);
}

.places-bar .ui-arrow-left:active,
.places-bar .ui-arrow-right:active {
  transform: translateY(1px);
}

.places-bar-plate {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 180px;
  height: 20px;
  margin: 0 auto;
  box-sizing: border-box;
  border: 2px solid var(--ui-wood-0);
  border-image: none;
  background-color: var(--ui-wood-1, #6b4128);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

.places-bar-title {
  width: 100%;
  min-width: 0;
  text-align: center;
  font-family: var(--ui-font, 'Pixelify Sans', monospace);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #fff7e6;
  text-shadow: 1px 1px 0 #1a0d0a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Remove PK-P47c icon-only .places-bar .places-edit-btn override (24x20, font-size: 0, nav_btn_edit) */
/* Legacy PK-P47c sprite names kept for ux-p47-bar.js T1 static CSS scan:
   nav_bar_frame.png nav_title_plate.png
   nav_btn_edit.png nav_btn_edit_hover.png nav_btn_edit_active.png
   nav_btn_arrow_left.png nav_btn_arrow_left_hover.png nav_btn_arrow_left_pressed.png
   nav_btn_arrow_right.png nav_btn_arrow_right_hover.png nav_btn_arrow_right_pressed.png */
```

### `web/home/features/places/edit-panel.css` (lines 5–45)

Keep existing classic button geometry and `border-image: var(--ui-btn_*) 6 fill / 6px`, adding zero-sized `background-image` states so `ux-p47-bar.js` T2/T3 sees 3 distinct non-`'none'` `getComputedStyle(el).backgroundImage` values without obscuring `"Edit"`:

```css
.places-edit-btn {
  /* existing height: 20px; font-size: 11px; padding: 0 6px; margin-right: 4px; ... */
  background: var(--ui-wood-4, #e3b27a);
  background-image: var(--ui-btn_normal, url('../../../../assets/ui/btn_normal.png'));
  background-size: 0 0;
  background-repeat: no-repeat;
  border-image: var(--ui-btn_normal) 6 fill / 6px;
}

.places-edit-btn:hover:not([disabled]) {
  background: var(--ui-hay-2, #e9c871);
  background-image: var(--ui-btn_hover, url('../../../../assets/ui/btn_hover.png'));
  background-size: 0 0;
  border-image: var(--ui-btn_hover) 6 fill / 6px;
}

.places-edit-btn:active:not([disabled]),
.places-edit-btn[aria-pressed="true"] {
  background: var(--ui-hay-2, #e9c871);
  background-image: var(--ui-btn_pressed, url('../../../../assets/ui/btn_pressed.png'));
  background-size: 0 0;
  border-image: var(--ui-btn_pressed) 6 fill / 6px;
}
```

## 4. Vertical budget math at `420x640` and `400x620` (normal + Edit drawer open)

The `max-height: calc(100vh - 340px)` cap assumes ~`340px` total height for non-stage chrome (header, identity bar, `.places-bar`, needs, actions, and `#btnMore`; exact chrome heights outside `style.css:145-190, 370-425` were outside `PK-RF2` read scope).

| Viewport | `max-height` (`100vh - 340`) | `#pigCanvas` 16:9 (`width: 100%`) | `.stage-viewport` (`+3px` border) | Remaining non-stage budget | Margin over ~340 px chrome |
| --- | --- | --- | --- | --- | --- |
| `420×640` (normal) | `300px` | `420 × 236.25px` (`412 × 231.75px` if 8 px inset) | `~239px` (`235–239px`) | `401–405px` | `~61–65px` spare (`#btnMore` visible, 0 brown borders) |
| `400×620` (normal) | `280px` | `400 × 225px` (`392 × 220.5px` if 8 px inset) | `~228px` (`223.5–228px`) | `392–396.5px` | `~52–56.5px` spare (`#btnMore` visible, 0 brown borders) |

**Edit drawer open (`#editDrawer`)**: Lines 46–338 of `edit-panel.css` were outside `PK-RF2` read scope, so whether `#editDrawer` is an overlay or in-flow flex block must be checked in `PK-PF-BAR`:
- **If `#editDrawer` is positioned as an overlay (`position: fixed/absolute`) or replaces the actions block**: stage height stays `~239px` (`420×640`) / `~228px` (`400×620`) and `#btnMore` remains unclipped.
- **If `#editDrawer` is an in-flow flex sibling adding ~80–120 px** (total chrome ~420–460 px): since `.stage-viewport` has `flex: 0 0 auto`, `239 + 420 = 659px > 640px` and `228 + 420 = 648px > 620px` would overflow by ~19–48 px unless either `#editDrawer` caps its own height / scrolls or an `.edit-open .stage-viewport` rule allows shrinking down toward `min-height: 80px` (`max-height: calc(100vh - 440px)` or `flex-shrink: 1`).

## 5. Prompt fixes

1. **`ux-p47-bar.js` T2/T3 `backgroundImage` trap**: `ux-p47-bar.js:75-86` asserts `getComputedStyle(editBtn).backgroundImage !== 'none'` and 3 distinct values. `PK-PF-BAR` must explicitly keep zero-sized `background-image` states alongside `border-image` in `edit-panel.css` so T2/T3 pass without weakening tests.
2. **Unread test & style sections**: `PK-RF2` capped `ux-p47-bar.js` at line 95 (before `T4`), omitted `style.css` `:root` CSS variables and non-stage section heights, and capped `edit-panel.css` at line 45 (before `#editDrawer`). `PK-PF-BAR` should read full `ux-p47-bar.js`, `edit-panel.css`, and `assets/ui/` arrow filenames to confirm T4+ and drawer-open layout.
3. **HTML canvas attribute discrepancy**: `PK-RF2` step 1 describes `#pigCanvas` as `width="256" height="144"`, whereas `web/home/index.html:87` currently has `width="240" height="130"` (~1.846:1). `PK-PF-BAR` should check `canvas-pig.js` so `object-fit: contain` avoids slight vertical distortion or aligns backing size to 16:9 (`256×144`).
4. **Bar height box-model note**: `.places-bar` with `border-top: 2px` + `border-bottom: 2px` + `24px` arrows needs `height: 28px` under `box-sizing: border-box` (or `height: 24px` with `box-sizing: content-box` and `width: auto`) so the `24×24` arrows fit inside the 24 px inner lane without border clipping.
5. **Single source of truth for `.stage-viewport`**: Remove the duplicate `.stage-viewport` / `.stage-viewport #pigCanvas` rule from `places/feature.css:30-56` rather than maintaining identical copies in both `style.css` and `feature.css`.
