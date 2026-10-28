(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.HayMazeLogic = factory();
    }
}(typeof window !== 'undefined' ? window : this, function() {

    // Mulberry32 PRNG
    function mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    function generate(width, height, seed) {
        const prng = mulberry32(seed);

        const cells = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push({ n: false, e: false, s: false, w: false, visited: false });
            }
            cells.push(row);
        }

        const start = { x: 0, y: 0 };
        const stack = [start];
        cells[start.y][start.x].visited = true;

        const dirs = [
            { name: 'n', dx: 0, dy: -1, opp: 's' },
            { name: 'e', dx: 1, dy: 0, opp: 'w' },
            { name: 's', dx: 0, dy: 1, opp: 'n' },
            { name: 'w', dx: -1, dy: 0, opp: 'e' }
        ];

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const unvisitedNeighbors = [];

            for (const dir of dirs) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && !cells[ny][nx].visited) {
                    unvisitedNeighbors.push({ dir, nx, ny });
                }
            }

            if (unvisitedNeighbors.length > 0) {
                const next = unvisitedNeighbors[Math.floor(prng() * unvisitedNeighbors.length)];
                cells[current.y][current.x][next.dir.name] = true;
                cells[next.ny][next.nx][next.dir.opp] = true;
                cells[next.ny][next.nx].visited = true;
                stack.push({ x: next.nx, y: next.ny });
            } else {
                stack.pop();
            }
        }

        // BFS to find furthest cell
        let maxDist = -1;
        let goal = { x: 0, y: 0 };
        const dists = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(-1);
            }
            dists.push(row);
        }
        const queue = [{ x: start.x, y: start.y }];
        dists[start.y][start.x] = 0;

        while (queue.length > 0) {
            const curr = queue.shift();
            const d = dists[curr.y][curr.x];
            if (d > maxDist) {
                maxDist = d;
                goal = { x: curr.x, y: curr.y };
            }
            // Check neighbors
            const cell = cells[curr.y][curr.x];
            const possibleDirs = [
                { name: 'n', dx: 0, dy: -1 },
                { name: 'e', dx: 1, dy: 0 },
                { name: 's', dx: 0, dy: 1 },
                { name: 'w', dx: -1, dy: 0 }
            ];
            for(const dir of possibleDirs) {
                if (cell[dir.name]) {
                    const nx = curr.x + dir.dx;
                    const ny = curr.y + dir.dy;
                    if (dists[ny][nx] === -1) {
                        dists[ny][nx] = d + 1;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        // Cleanup visited flag
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                delete cells[y][x].visited;
            }
        }

        return { width, height, cells, start, goal };
    }

    function solve(maze) {
        const { width, height, cells, start, goal } = maze;
        const queue = [{ x: start.x, y: start.y, path: [{x: start.x, y: start.y}] }];
        const visited = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(false);
            }
            visited.push(row);
        }
        visited[start.y][start.x] = true;

        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr.x === goal.x && curr.y === goal.y) {
                return curr.path;
            }

            const cell = cells[curr.y][curr.x];
            const possibleDirs = [
                { name: 'n', dx: 0, dy: -1 },
                { name: 'e', dx: 1, dy: 0 },
                { name: 's', dx: 0, dy: 1 },
                { name: 'w', dx: -1, dy: 0 }
            ];

            for(const dir of possibleDirs) {
                if (cell[dir.name]) {
                    const nx = curr.x + dir.dx;
                    const ny = curr.y + dir.dy;
                    if (!visited[ny][nx]) {
                        visited[ny][nx] = true;
                        queue.push({
                            x: nx,
                            y: ny,
                            path: [...curr.path, {x: nx, y: ny}]
                        });
                    }
                }
            }
        }
        return [];
    }

    return {
        generate,
        solve
    };
}));
