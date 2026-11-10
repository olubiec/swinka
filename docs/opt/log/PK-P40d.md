# PK-P40d: Retire Rooms and Garden windows
- Entry points: openFeature('garden') in pigs; tiles in features/index.json & app.js; CuyPlaces.openPlace in places/feature.js, places/edit-panel.js, rooms/feature.js; roomPlanBtn in ux-p35; data-open none.
- Removed 'rooms' & 'garden' from features/index.json; listFeatures() and openMoreModal() filter them out.
- CuyHome.openFeature('rooms'|'garden') redirects to CuyPlaces.openPlace without opening any modal window.
- CuyPlaces.openPlace(id) wrapped in app.js to close any active modal when switching scene.
- Exposed CuyPlaces.upgrade(id) -> {type:'place_upgrade',id} and CuyPlaces.unlock(id) -> {type:'place_unlock',id}.
- TODO: Edit drawer header row Level N [Upgrade]/[Unlock] to be wired in edit-panel.js during PK-P40e.
- Verification: R1 no-more-tile, R2 openPlace-switches-scene, R3 no-modal, R4 upgrade/unlock API, R5 no-errors pass.
