# PK-P42c: Home window draws pigs from look descriptor
CuyLook API: window.CuyLook.spriteFor(pig) & window.CuyLook.resolve(pig, stage).
Descriptor format: { spriteKey, breed, coat, stage, named } matching Core PK-P42a.
Canvas: reads look descriptor in updateState and usableSheet; tags #pigCanvas with data-sprite-key.
My Pigs: renderPigPortrait and pig cards read CuyLook.spriteFor and tag data-sprite-key.
More tile & room tabs: unified to resolve active/room pig looks via CuyLook.spriteFor.
Mock: updated features/pigs/mock.js registering mock state with looks for starter, Kuki, Ned, James.
Fallback: old state without look falls back to smooth/named defaults without breaking.
Tests: tools/qa/ux-p42-web-look.js verified L1 (same-key-everywhere), L2 (starter!=kuki), L3 (fallback), L4 (no-404).
