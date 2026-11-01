# W-NYAN-02: Chiptune melody and 8-bit wheek sound engine for Nyan Cuy
Goal: Synthesize the 8-bit Nyan Cuy loop with guinea pig wheek sound effects using Web Audio and ZzFX.
Zmieniaj: web/home/minigames/nyan-audio.js, web/home/sound.js
Wymagane: web/home/minigames/nyan-audio.js
Weryfikacja: node --check web/home/minigames/nyan-audio.js web/home/sound.js
Steps:
1. Create `web/home/minigames/nyan-audio.js`:
   - Procedural Web Audio chiptune synthesizer playing the cheerful melodic loop (melody notes sequence in C-major pentatonic).
   - Distinctive 8-bit synthesized guinea pig "Wheek-Wheek" sound triggered on flap and treat pickup.
   - Mute/volume toggle respecting global sound settings (`state.settings.sounds`).
2. Provide clean `startMusic()`, `stopMusic()`, `playWheek()`, and `playCrunch()` API functions.
