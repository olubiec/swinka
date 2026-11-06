# PK-P3b: Unified Back arrow and Close X icons

- Created pixel-art `web/home/assets/ui/back.svg` (left arrow) and `close.svg` (cross) matching the retro game palette using `currentColor` and `#fbf0d9` (`--ui-linen-3`).
- Replaced header close button face and back button face with shared SVG background-image assets in `web/home/style.css`.
- Set 32x32 CSS px hit targets for both buttons with proper hover/active/focus-visible states.
- Removed raw text glyphs (✕, ←) in `web/home/app.js` and `web/home/style.css` while preserving aria-labels and text accessibility.
- Added comprehensive QA test `tools/qa/ux-p3-icons.js` verifying icons, hit targets, escape/back/close behavior, and absence of text glyphs.
