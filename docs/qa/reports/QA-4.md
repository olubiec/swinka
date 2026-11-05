# QA-4 – Graphics and UX

Date: 2026-11-05. Tool: new `tools/qa/visual-matrix.js` (Chrome headless, every feature in `features/index.json` + home, viewports 360x640, 420x640, 800x600, 1280x720 = 68 cells, screenshots in `tools/qa/out/visual/`, git-ignored; two key shots committed in `docs/qa/img/`). Other tools: `a11y-check` (OK), `lights-test` (OK), `palette-test` (OK, all breeds/coats recolour as expected), `check-assets`, `check-icons`.

## Results
| Check | Result |
|---|---|
| Layout at 420x640, 800x600, 1280x720 | no horizontal scroll, no overflowing elements, no clipped labels, no broken images, 0 JS errors |
| Layout at 360x640 | horizontal scroll on every screen (`#gameDevice`, header, identity card overflow). The window `MinimumSize` is 420x640 (`HomeWindow.cs:187`), so 360 cannot occur in the app: **not a defect**, noted only |
| Pixel-art rendering | every canvas/img >24 px uses `image-rendering: pixelated`; none blurry |
| Palette / breeds | `palette-test` OK for all 14 base coats, 10 tints per breed and senior variants |
| Lighting | `lights-test` OK; 3 light textures 404 so lights fall back (see F4-03) |
| Accessibility | `a11y-check` OK (names, tab order, focus). Touch targets: see F4-04 |
| Icons | `icon-pig` missing; 5 world floor tiles and ~15 world item icons absent from `tiles.json`/`icons.json` (from the failing Core tests) |

## Findings
| ID | Sev | Area | Description |
|---|---|---|---|
| F4-01 | **S2** | Store UI | The Store screen renders with a dark-blue/purple panel, default-styled buttons and tiny text (`docs/qa/img/QA-4_store_420x640.png`). Cause: `store/feature.css` uses undefined variables `--panel --accent --line --muted --focus --text`. Other screens (rooms, see `QA-4_rooms_420x640.png`) use the pixel-art theme correctly. Visible to every player who opens the store. Fix: map the six variables to the theme tokens defined in `style.css`. |
| F4-02 | S3 | Pigs UI | `icon-pig` has no icon entry/CSS; pigs screen shows an empty icon slot. |
| F4-03 | S3 | Lighting | `dust_motes.png`, `cone_shade.png`, `lamp_floor.png` missing: lamps/dust effects absent in world, dorm and roaming views. |
| F4-04 | S3 | UX | Buttons smaller than 24 px: modal close 22x22, `decor-item-btn` 19 px tall, `market-btn`/`market-tab` 19 px tall, `market-step` 12x19, `room-title` 18 px tall. Hard to hit with touch/high-DPI pointer; acceptable only if mouse-only is intended. |
| F4-05 | S3 | Art | Floor tiles `floor_wood`, `floor_straw`, `floor_fleece`, `floor_grass`, `floor_soil`, ... not in `tiles.json` and many world item icons missing in `icons.json` (same as the 2 failing `WorldAssetsTests`): rooms fall back to flat colour/glyph. |
| F4-06 | S3 | UX | Rooms screen shows the "Shared bedroom 1800 clovers" chip next to pig chips as if it were a room; it is a purchase and looks like a tab. Consider a distinct style/lock icon. |
| F4-07 | S4 | Coverage | Not covered by the matrix: day/night variants, 1/3/5-pig states, long Polish names, dorm/plan/customize sub-screens (their JS is not loaded from `index.html`, F3-06), reduced-motion and 150 % text scaling. Listed for a follow-up visual pass on Windows. |

## Verdict
Visually consistent and crisp except the Store screen (F4-01), which is clearly broken and should be fixed before release. Missing art (F4-03, F4-05, F4-02) degrades gracefully but is visible.
