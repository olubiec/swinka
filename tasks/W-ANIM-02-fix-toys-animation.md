# W-ANIM-02: Fix ball and tunnel animation flow and double rendering in Home
Goal: The ball and tunnel animations play smoothly without leaving ghost icons or blocking future toy interactions.
Zmieniaj: web/home/canvas-pig.js
Wymagane: web/home/canvas-pig.js
Weryfikacja: node tools/qa/web-smoke.js; node --check web/home/canvas-pig.js
Rules: Do not break existing smoke tests. Ensure toyPlaying is reset to null after tunnel_phase2 ends.
Steps:
1. In `web/home/canvas-pig.js`, in `drawToys(ctx)`:
   - When `this.toyPlaying === 'ball'`, hide the static ball icon so only the animated ball from the sprite sheet is drawn.
   - When `this.toyPlaying` starts with `'tunnel'`, hide the static tunnel icon during the interaction.
2. In the `update(dt)` state machine for `this.toyPlaying`:
   - Add handling for when `this.toyPlaying === 'tunnel_phase2'` and `this.toyTimer <= 0`: reset `this.toyPlaying = null`, restore normal idle state, and re-enable toy clicking.
   - For `ball`, ensure that after the push animation ends, `this.toyPlaying = null` and `this.ballX` returns to its base resting position.
3. Verify with `node tools/qa/web-smoke.js` that opening features and clicking toys does not crash or throw unhandled exceptions.

