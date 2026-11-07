# PK-P41b: Hay maze must not solve itself
- Removed auto-walk BFS pathfinding (`walkTo`, `processNextMove`, `moveQueue`) from `web/home/minigames/hay-maze.js`.
- Exported pure function `HayMazeLogic.stepToward(maze, pos, target)` in `web/home/minigames/hay-maze-logic.js`.
- Returns `{ x: number, y: number, finished: boolean }`; moves at most 1 valid cell towards target if corridor is open, else unchanged.
- Click/tap in `hay-maze.js` moves the player by at most one valid step via `stepToward`; goal clicks no longer auto-solve the maze.
- Added QA test suite in `tools/qa/ux-p41-maze.js` covering Z1 (no auto-finish), Z2 (wall click ignored), Z3 (step-by-step path finish), and Z4 (no timer walk).
