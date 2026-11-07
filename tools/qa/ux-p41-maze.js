/**
 * ux-p41-maze.js
 * Verification for PK-P41b: Hay maze must not solve itself.
 * Clicks may only steer the player one valid step at a time (or be ignored).
 */
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const HayMazeLogic = require(path.join(__dirname, '../../web/home/minigames/hay-maze-logic.js'));

// Test BFS helper to compute valid single steps path
function findBfsPath(maze) {
  const queue = [{ x: maze.start.x, y: maze.start.y, path: [{ x: maze.start.x, y: maze.start.y }] }];
  const visited = Array.from({ length: maze.height }, () => Array(maze.width).fill(false));
  visited[maze.start.y][maze.start.x] = true;

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.x === maze.goal.x && curr.y === maze.goal.y) {
      return curr.path;
    }
    const cell = maze.cells[curr.y][curr.x];
    const dirs = [
      { name: 'n', dx: 0, dy: -1 },
      { name: 'e', dx: 1, dy: 0 },
      { name: 's', dx: 0, dy: 1 },
      { name: 'w', dx: -1, dy: 0 }
    ];
    for (const d of dirs) {
      if (cell[d.name]) {
        const nx = curr.x + d.dx;
        const ny = curr.y + d.dy;
        if (!visited[ny][nx]) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny, path: [...curr.path, { x: nx, y: ny }] });
        }
      }
    }
  }
  return [];
}

// Z1: click-goal-no-finish
// Player at start, click on the goal cell: player position changes by at most 1 cell and finished is false.
function testClickGoalNoFinish() {
  for (let seed = 1; seed <= 5; seed++) {
    const maze = HayMazeLogic.generate(9, 9, seed * 1000);
    const start = { x: maze.start.x, y: maze.start.y };
    const goal = { x: maze.goal.x, y: maze.goal.y };

    const next = HayMazeLogic.stepToward(maze, start, goal);
    const dist = Math.abs(next.x - start.x) + Math.abs(next.y - start.y);

    assert(dist <= 1, `Player moved ${dist} cells; must change by at most 1 cell`);
    assert.strictEqual(next.finished, false, 'finished must be false when clicking goal from start');
    assert(next.x !== goal.x || next.y !== goal.y, 'Player must never teleport directly to goal');
  }
  console.log('[ux-p41-maze] Z1 click-goal-no-finish: OK');
}

// Z2: click-wall-ignored
// Click toward a wall: position unchanged.
function testClickWallIgnored() {
  for (let seed = 1; seed <= 5; seed++) {
    const maze = HayMazeLogic.generate(9, 9, seed * 2000);
    const pos = { x: maze.start.x, y: maze.start.y };
    const cell = maze.cells[pos.y][pos.x];

    const dirs = [
      { name: 'n', dx: 0, dy: -1 },
      { name: 'e', dx: 1, dy: 0 },
      { name: 's', dx: 0, dy: 1 },
      { name: 'w', dx: -1, dy: 0 }
    ];

    let testedWall = false;
    for (const d of dirs) {
      if (!cell[d.name]) {
        testedWall = true;
        const target = { x: pos.x + d.dx, y: pos.y + d.dy };
        const res = HayMazeLogic.stepToward(maze, pos, target);
        assert.strictEqual(res.x, pos.x, `Clicking wall ${d.name} must leave x unchanged`);
        assert.strictEqual(res.y, pos.y, `Clicking wall ${d.name} must leave y unchanged`);
        assert.strictEqual(res.finished, false, 'finished must be false on wall click');
      }
    }
    assert(testedWall, 'At least one wall must have been tested');
  }
  console.log('[ux-p41-maze] Z2 click-wall-ignored: OK');
}

// Z3: valid-steps-finish
// A scripted sequence of valid single steps (computed by BFS inside the TEST, not the game) reaches the goal
// and only the last step sets finished.
function testValidStepsFinish() {
  for (let seed = 1; seed <= 3; seed++) {
    const maze = HayMazeLogic.generate(9, 9, seed * 3000);
    const path = findBfsPath(maze);
    assert(path.length > 2, 'BFS path should have multiple steps');

    let current = path[0];
    for (let i = 1; i < path.length; i++) {
      const target = path[i];
      const next = HayMazeLogic.stepToward(maze, current, target);
      assert.strictEqual(next.x, target.x, `Step ${i}: expected x ${target.x}, got ${next.x}`);
      assert.strictEqual(next.y, target.y, `Step ${i}: expected y ${target.y}, got ${next.y}`);

      if (i < path.length - 1) {
        assert.strictEqual(next.finished, false, `Step ${i} is not the goal, finished must be false`);
      } else {
        assert.strictEqual(next.finished, true, 'Final step reaching goal must set finished to true');
      }
      current = { x: next.x, y: next.y };
    }
  }
  console.log('[ux-p41-maze] Z3 valid-steps-finish: OK');
}

// Z4: no-timer-walk
// After a click no setInterval/setTimeout chain moves the player on its own
// (fake timers: advance 10 s, position unchanged after the one step).
function testNoTimerWalk() {
  const timers = [];
  const origSetTimeout = global.setTimeout;
  const origSetInterval = global.setInterval;
  const origClearTimeout = global.clearTimeout;
  const origClearInterval = global.clearInterval;

  let timerId = 1;
  global.setTimeout = (cb, ms, ...args) => {
    const id = timerId++;
    timers.push({ id, cb, ms: ms || 0, args, isInterval: false });
    return id;
  };
  global.setInterval = (cb, ms, ...args) => {
    const id = timerId++;
    timers.push({ id, cb, ms: ms || 0, args, isInterval: true });
    return id;
  };
  global.clearTimeout = (id) => {
    const idx = timers.findIndex(t => t.id === id);
    if (idx !== -1) timers.splice(idx, 1);
  };
  global.clearInterval = (id) => {
    const idx = timers.findIndex(t => t.id === id);
    if (idx !== -1) timers.splice(idx, 1);
  };

  try {
    const maze = HayMazeLogic.generate(9, 9, 42);
    let player = { x: maze.start.x, y: maze.start.y };

    // Simulate click on goal
    const next = HayMazeLogic.stepToward(maze, player, maze.goal);
    player = { x: next.x, y: next.y };
    const posAfterStep = { ...player };

    // Advance fake timers by 10 seconds
    let virtualElapsed = 0;
    while (timers.length > 0 && virtualElapsed <= 10000) {
      const t = timers.shift();
      virtualElapsed += t.ms;
      if (typeof t.cb === 'function') {
        t.cb(...t.args);
      }
      if (t.isInterval) {
        timers.push(t);
      }
    }

    // Position must be unchanged after 10 seconds
    assert.strictEqual(player.x, posAfterStep.x, 'Position x must not change from timer chain');
    assert.strictEqual(player.y, posAfterStep.y, 'Position y must not change from timer chain');

    // Also assert that hay-maze.js has eliminated the multi-step walkTo loop
    const hayMazeSrc = fs.readFileSync(path.join(__dirname, '../../web/home/minigames/hay-maze.js'), 'utf8');
    assert(!hayMazeSrc.includes('walkTo('), 'hay-maze.js must not contain walkTo');
    assert(!hayMazeSrc.includes('processNextMove('), 'hay-maze.js must not contain processNextMove');
    assert(!hayMazeSrc.includes('moveQueue'), 'hay-maze.js must not use moveQueue');
  } finally {
    global.setTimeout = origSetTimeout;
    global.setInterval = origSetInterval;
    global.clearTimeout = origClearTimeout;
    global.clearInterval = origClearInterval;
  }
  console.log('[ux-p41-maze] Z4 no-timer-walk: OK');
}

// Run all test suites
testClickGoalNoFinish();
testClickWallIgnored();
testValidStepsFinish();
testNoTimerWalk();

console.log('[ux-p41-maze] All tests passed.');
