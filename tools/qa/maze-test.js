const assert = require('assert');
const HayMazeLogic = require('../../web/home/minigames/hay-maze-logic.js');

function testMaze() {
    const sizes = [
        { w: 6, h: 6 },
        { w: 10, h: 10 },
        { w: 20, h: 20 }
    ];

    for (const size of sizes) {
        for (let seed = 1; seed <= 50; seed++) {
            const maze = HayMazeLogic.generate(size.w, size.h, seed);

            assert.strictEqual(maze.width, size.w);
            assert.strictEqual(maze.height, size.h);
            assert.ok(maze.cells);
            assert.deepStrictEqual(maze.start, { x: 0, y: 0 });
            assert.ok(maze.goal);

            // Check symmetry
            for (let y = 0; y < size.h; y++) {
                for (let x = 0; x < size.w; x++) {
                    const cell = maze.cells[y][x];
                    if (cell.n) assert.strictEqual(maze.cells[y - 1][x].s, true);
                    if (cell.e) assert.strictEqual(maze.cells[y][x + 1].w, true);
                    if (cell.s) assert.strictEqual(maze.cells[y + 1][x].n, true);
                    if (cell.w) assert.strictEqual(maze.cells[y][x - 1].e, true);
                }
            }

            // Check determinism
            const maze2 = HayMazeLogic.generate(size.w, size.h, seed);
            assert.deepStrictEqual(maze, maze2);

            // Check reachability / solve path
            const path = HayMazeLogic.solve(maze);
            assert.ok(path.length > 0);
            assert.deepStrictEqual(path[0], maze.start);
            assert.deepStrictEqual(path[path.length - 1], maze.goal);

            // Check that all steps in path are open passages
            for (let i = 0; i < path.length - 1; i++) {
                const curr = path[i];
                const next = path[i + 1];
                const dx = next.x - curr.x;
                const dy = next.y - curr.y;
                const cell = maze.cells[curr.y][curr.x];

                if (dx === 0 && dy === -1) assert.strictEqual(cell.n, true);
                else if (dx === 1 && dy === 0) assert.strictEqual(cell.e, true);
                else if (dx === 0 && dy === 1) assert.strictEqual(cell.s, true);
                else if (dx === -1 && dy === 0) assert.strictEqual(cell.w, true);
                else assert.fail('Invalid step in path');
            }

            // Check every cell is reachable from start
            const visited = Array(size.h).fill(null).map(() => Array(size.w).fill(false));
            const queue = [{ x: maze.start.x, y: maze.start.y }];
            visited[maze.start.y][maze.start.x] = true;
            let visitedCount = 1;

            while(queue.length > 0) {
                const curr = queue.shift();
                const cell = maze.cells[curr.y][curr.x];
                const dirs = [
                    { name: 'n', dx: 0, dy: -1 },
                    { name: 'e', dx: 1, dy: 0 },
                    { name: 's', dx: 0, dy: 1 },
                    { name: 'w', dx: -1, dy: 0 }
                ];
                for(const dir of dirs) {
                    if (cell[dir.name]) {
                        const nx = curr.x + dir.dx;
                        const ny = curr.y + dir.dy;
                        if (!visited[ny][nx]) {
                            visited[ny][nx] = true;
                            visitedCount++;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }
            assert.strictEqual(visitedCount, size.w * size.h);
        }
    }

    console.log('MAZE TEST OK');
    process.exit(0);
}

try {
    testMaze();
} catch (e) {
    console.error(e);
    process.exit(1);
}
