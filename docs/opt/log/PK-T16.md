PK-T16: 3 PASS, 8 DEFECT, 0 SKIP (node --check && node tools/qa/ux-p122-reactions.js, msedge fallback).
DEFECT RE-feed-hay-treat-veg: scenePigs multi-pig loop overwrites currentAnim on next frame and Food drawer does not trigger popcorn for favoriteFood.
DEFECT RE-pet-and-chin: scenePigs overwrites purr_pet anim back to idle and Home UI/bridge has no chin gesture or care_interact handler.
DEFECT RE-trick-every-id: Tricks UI uses hurdle_jump instead of tricks.json id hurdle and clicking a trick does not trigger PigReactions on canvasPig.
DEFECT RE-sick-pig-reacts-slowly: Tricks modal still sends trick message to bridge when state.vet.isSick is true.
DEFECT RE-spam-click-throttled: 30 clicks in 1.77s sent 30/30 bridge pet messages because pet() sends when applyReaction() returns null on throttle.
DEFECT RE-bubble-and-sound-fire: Sound.CUES/Sound.play are missing in sound.js and applyReaction passes 'purr' to WorldSounds.play which returns unknown_event.
DEFECT RE-poop-cleanup: Clean button awards clovers and shows bubble, but scenePigs loop overwrites 'happy' animation back to 'walk'.
DEFECT RE-birthday-once-per-day: Setting state.isBirthday=true in Home does not trigger party animation or Happy birthday! bubble.
