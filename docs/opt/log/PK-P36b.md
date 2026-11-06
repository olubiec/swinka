# PK-P36b: Rooms window scrolling and tabs
- Window body (.modal-body.feature-rooms) set as single scroll container: overflow-y: auto, min-height: 0, flex: 1 1 auto; modal-card overflow-y disabled.
- Room tab strip (.room-tabs) kept in one horizontal line: flex-wrap: nowrap, overflow-x: auto with thin brown scrollbar styling.
- Active tab scrolled into view with scrollIntoView({ inline: 'center' }) on open and room switch.
- Max-width: 100% and min-width: 0 applied across panel, canvas, dorm, customize to avoid horizontal overflow.
- Verified with Playwright in tools/qa/ux-p36-rooms-scroll.js covering R1-R5 across 420x720 and 360x640 viewports.
