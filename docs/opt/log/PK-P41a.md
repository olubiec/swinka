# PK-P41a: Stray window after Bond in More
- Root cause: tricks/feature.js close() did not null currentContainer/currentApi, so bridge state broadcasts kept triggering tricks.onState() into the shared modalBody across all later views.
- Fixed tricks/feature.js: close() clears currentContainer and currentApi; onState checks container.isConnected.
- Fixed app.js root broadcast: updateStateUI only dispatches onState to active feature (or alwaysOnState/background).
- Fixed app.js dialog openers: openMoreModal, openAlbumModal, openMinigamesModal, openDevTestModal ensure closeFeature({ keepBackdrop: true }) is called first.
- Added tools/qa/ux-p41-bond.js verifying B1 (single window), B2 (back), B3 (no carry over across 6 tiles), B4 (close X/Esc), B5 (all More tiles).
- Weryfikacja passed cleanly.
