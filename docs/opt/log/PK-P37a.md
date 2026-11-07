# PK-P37a: Unify close, back and arrow controls

- Defined shared classes `.ui-close`, `.ui-back`, `.ui-arrow-left`, `.ui-arrow-right` in `web/home/style.css` (32x32px pixelated, `:focus-visible` with `--ui-hay-2`, pressed states).
- Mapped `.modal-close-btn`, `#btnClose`, `.food-drawer-close` to `close_btn.png` and `.modal-back` to `back_btn.png`.
- Deleted deprecated `web/home/assets/ui/back.svg` and `close.svg`.
- Updated `web/home/app.js` to ensure empty text nodes and standard aria-labels ("Close", "Back", "Previous place", "Next place").
- Updated `web/home/features/places/feature.css` arrow focus styles and palette compliant colors.
- Rewrote `tools/qa/ux-p3-icons.js` verifying I1 (8+ windows use same assets), I2 (size >= 32x32 & aria-labels), I3 (works), I4 (no glyphs/svg), I5 (screens).
- Screenshots logged to `docs/qa/shots/`: `p37-home-bar.png`, `p37-more.png`, `p37-garden.png`, `p37-album.png`, `p37-rooms.png`.
