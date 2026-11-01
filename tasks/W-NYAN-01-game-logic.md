# W-NYAN-01: Core logic and state for Nyan Cuy space endless runner
Goal: Implement pure game logic for the Nyan Cuy minigame (flying pig, rainbow trail, stars, food scoring).
Zmieniaj: web/home/minigames/nyan-cuy-logic.js, tests/nyan-cuy-test.js
Wymagane: web/home/minigames/nyan-cuy-logic.js, tests/nyan-cuy-test.js
Weryfikacja: node tests/nyan-cuy-test.js
Steps:
1. Create `web/home/minigames/nyan-cuy-logic.js` as pure functions:
   - `createNyanState()`: pig position (x, y, vy), score, distance, rainbow segments array, obstacles array, treats array.
   - `updateNyan(state, input, dt)`: apply gravity (vy += g * dt), flap thrust on space/click (vy = -jumpForce), spawn treats (parsley=10pts, carrot=20pts) and cosmic obstacles.
   - Collision detection (AABB) between pig bounding box and obstacles/treats.
2. Write unit tests in `tests/nyan-cuy-test.js` validating gravity, flap thrust, score accumulation and game over conditions.

