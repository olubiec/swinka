/**
 * hay-maze.js — Hay Maze minigame in Phaser 3.
 * Pig navigates a hay-bale labyrinth to reach the bell pepper before time runs out.
 */
(function (root) {
  'use strict';
  if (!root.Minigry || !root.Phaser) return;

  const W = 360;
  const H = 290;

  function iconsUrl() {
    const isWebView = !!(root.chrome && root.chrome.webview);
    if (isWebView) return 'https://cuy.assets/icons/icons_16.png';
    const inMinigames = typeof location !== 'undefined' && location.pathname.includes('/minigames');
    return inMinigames ? '../../../assets/icons/icons_16.png' : '../../assets/icons/icons_16.png';
  }

  function start(config) {
    let level = 1;
    let score = 0;
    let timeLeft = 60;
    let ended = false;

    class HayMazeScene extends root.Phaser.Scene {
      constructor() {
        super('HayMaze');
      }

      preload() {
        root.MinigryPig.preload(this, config.stageKey || 'adult');
        this.load.spritesheet('icons16', iconsUrl(), { frameWidth: 16, frameHeight: 16 });
      }

      create() {
        // Floor background
        this.add.rectangle(W / 2, H / 2, W, H, 0x4a6b2f);

        // Top HUD
        this.hudBg = this.add.rectangle(W / 2, 14, W, 28, 0x2b1712, 0.85);
        this.hudText = this.add.text(12, 8, '', {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#ffffff',
          fontStyle: 'bold'
        });

        // Finish button
        const btnFinish = this.add.text(W - 65, 7, '[ Finish ]', {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#eedb7c',
          backgroundColor: '#3e2723',
          padding: { x: 4, y: 2 }
        }).setInteractive({ useHandCursor: true });

        btnFinish.on('pointerdown', () => {
          if (ended) return;
          ended = true;
          if (config.endGame) config.endGame(score);
        });

        // Setup input keys
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
          up: this.input.keyboard.addKey('W'),
          left: this.input.keyboard.addKey('A'),
          down: this.input.keyboard.addKey('S'),
          right: this.input.keyboard.addKey('D')
        };

        // Pointer click to walk
        this.input.on('pointerdown', (pointer) => {
          if (ended || this.isMoving || !this.maze) return;
          if (pointer.y < 28) return; // Skip HUD clicks

          const clickedCol = Math.floor((pointer.x - this.offsetX) / this.cellSize);
          const clickedRow = Math.floor((pointer.y - this.offsetY) / this.cellSize);

          if (clickedCol >= 0 && clickedCol < this.maze.width && clickedRow >= 0 && clickedRow < this.maze.height) {
            this.walkTo(clickedCol, clickedRow);
          }
        });

        // Timer event
        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (ended) return;
            timeLeft--;
            this.updateHud();
            if (timeLeft <= 0) {
              ended = true;
              if (config.endGame) config.endGame(score);
            }
          }
        });

        this.startLevel(level);
      }

      startLevel(lvl) {
        if (ended) return;

        // Clean previous level objects
        if (this.levelGroup) this.levelGroup.destroy(true);
        this.levelGroup = this.add.group();

        timeLeft = 60;
        this.isMoving = false;
        this.moveQueue = [];

        // Maze dimensions: 9x9 + 2 per level, max 21x21
        const side = Math.min(21, 9 + (lvl - 1) * 2);
        const seed = Math.floor(Math.random() * 1000000);
        this.maze = root.HayMazeLogic.generate(side, side, seed);

        // Geometry sizing
        this.cellSize = Math.min(Math.floor(340 / side), Math.floor(245 / side));
        this.offsetX = Math.floor((W - side * this.cellSize) / 2);
        this.offsetY = 32 + Math.floor((250 - side * this.cellSize) / 2);

        // Draw maze walls (hay bales)
        this.drawMaze();

        // Spawn Clovers in up to 3 dead ends
        this.spawnClovers();

        // Spawn Goal (bell pepper)
        const goalPixelX = this.offsetX + this.maze.goal.x * this.cellSize + this.cellSize / 2;
        const goalPixelY = this.offsetY + this.maze.goal.y * this.cellSize + this.cellSize / 2;
        this.goalSprite = this.add.sprite(goalPixelX, goalPixelY, 'icons16', 0);
        this.goalSprite.setScale(Math.max(0.6, (this.cellSize * 0.75) / 16));
        this.levelGroup.add(this.goalSprite);

        // Create Pig sprite
        this.pigCell = { x: this.maze.start.x, y: this.maze.start.y };
        this.createPig();

        this.updateHud();
      }

      drawMaze() {
        const g = this.add.graphics();
        this.levelGroup.add(g);

        const w = this.maze.width;
        const h = this.maze.height;
        const cs = this.cellSize;
        const ox = this.offsetX;
        const oy = this.offsetY;

        // Floor: two greens in a checker, like a mown meadow
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            g.fillStyle((x + y) % 2 === 0 ? 0x3e5927 : 0x466430, 1);
            g.fillRect(ox + x * cs, oy + y * cs, cs, cs);
          }
        }

        // Walls: hay bales drawn pixel-style (dark edge, straw body, light top edge, straw ticks)
        const T = 4;
        const bale = (rx, ry, rw, rh, horizontal) => {
          g.fillStyle(0x6f7a34, 1); g.fillRect(rx, ry, rw, rh);                 // outline / shadow
          g.fillStyle(0xcdb556, 1); g.fillRect(rx + 1, ry + 1, rw - 2, rh - 2); // body
          g.fillStyle(0xeedb7c, 1);                                             // light edge (top / left)
          if (horizontal) g.fillRect(rx + 1, ry + 1, rw - 2, 1); else g.fillRect(rx + 1, ry + 1, 1, rh - 2);
          g.fillStyle(0x99903d, 1);                                             // straw ticks
          if (horizontal) { for (let k = 3; k < rw - 2; k += 4) g.fillRect(rx + k, ry + 2, 1, 1); }
          else { for (let k = 3; k < rh - 2; k += 4) g.fillRect(rx + 2, ry + k, 1, 1); }
        };

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const cell = this.maze.cells[y][x];
            const px = ox + x * cs;
            const py = oy + y * cs;
            if (!cell.n) bale(px - 1, py - 2, cs + 2, T, true);
            if (!cell.w) bale(px - 2, py - 1, T, cs + 2, false);
            if (!cell.e && x === w - 1) bale(px + cs - 2, py - 1, T, cs + 2, false);
            if (!cell.s && y === h - 1) bale(px - 1, py + cs - 2, cs + 2, T, true);
          }
        }
      }

      spawnClovers() {
        this.clovers = [];
        const deadEnds = [];
        const w = this.maze.width;
        const h = this.maze.height;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (x === this.maze.start.x && y === this.maze.start.y) continue;
            if (x === this.maze.goal.x && y === this.maze.goal.y) continue;

            const c = this.maze.cells[y][x];
            const exits = (c.n ? 1 : 0) + (c.e ? 1 : 0) + (c.s ? 1 : 0) + (c.w ? 1 : 0);
            if (exits === 1) {
              deadEnds.push({ x, y });
            }
          }
        }

        // Shuffle dead ends and take up to 3
        deadEnds.sort(() => Math.random() - 0.5);
        const chosen = deadEnds.slice(0, 3);

        chosen.forEach(pt => {
          const cx = this.offsetX + pt.x * this.cellSize + this.cellSize / 2;
          const cy = this.offsetY + pt.y * this.cellSize + this.cellSize / 2;
          const spr = this.add.sprite(cx, cy, 'icons16', 13);
          spr.setScale(Math.max(0.6, (this.cellSize * 0.7) / 16));
          this.levelGroup.add(spr);
          this.clovers.push({ x: pt.x, y: pt.y, sprite: spr });
        });
      }

      createPig() {
        const px = this.offsetX + this.pigCell.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + this.pigCell.y * this.cellSize + this.cellSize / 2;

        // The real pig sheet (breed, stage and coat of the active pig), scaled so the body fits one maze cell
        const spr = root.MinigryPig.create(this, px, py);
        spr.setOrigin(0.5, 0.72);
        spr.setScale(Math.max(0.3, (this.cellSize * 1.3) / 64));
        this.levelGroup.add(spr);
        this.pig = spr;
      }

      update() {
        if (ended || this.isMoving || !this.maze) return;

        // Keyboard navigation
        let dx = 0;
        let dy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) dx = -1;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) dx = 1;
        else if (this.cursors.up.isDown || this.wasd.up.isDown) dy = -1;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) dy = 1;

        if (dx !== 0 || dy !== 0) {
          const currentCell = this.maze.cells[this.pigCell.y][this.pigCell.x];
          let canGo = false;
          if (dx === -1 && currentCell.w) canGo = true;
          if (dx === 1 && currentCell.e) canGo = true;
          if (dy === -1 && currentCell.n) canGo = true;
          if (dy === 1 && currentCell.s) canGo = true;

          if (canGo) {
            this.stepPig(this.pigCell.x + dx, this.pigCell.y + dy);
          }
        }
      }

      walkTo(targetX, targetY) {
        if (this.pigCell.x === targetX && this.pigCell.y === targetY) return;

        // BFS pathfinding from pig to target
        const w = this.maze.width;
        const h = this.maze.height;
        const visited = Array.from({ length: h }, () => Array(w).fill(false));
        const parent = Array.from({ length: h }, () => Array(w).fill(null));

        const queue = [{ x: this.pigCell.x, y: this.pigCell.y }];
        visited[this.pigCell.y][this.pigCell.x] = true;

        while (queue.length > 0) {
          const curr = queue.shift();
          if (curr.x === targetX && curr.y === targetY) break;

          const cell = this.maze.cells[curr.y][curr.x];
          const neighbors = [];
          if (cell.n) neighbors.push({ x: curr.x, y: curr.y - 1 });
          if (cell.e) neighbors.push({ x: curr.x + 1, y: curr.y });
          if (cell.s) neighbors.push({ x: curr.x, y: curr.y + 1 });
          if (cell.w) neighbors.push({ x: curr.x - 1, y: curr.y });

          for (const n of neighbors) {
            if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h && !visited[n.y][n.x]) {
              visited[n.y][n.x] = true;
              parent[n.y][n.x] = curr;
              queue.push(n);
            }
          }
        }

        if (!visited[targetY][targetX]) return; // Unreachable

        // Reconstruct path
        const path = [];
        let cur = { x: targetX, y: targetY };
        while (cur.x !== this.pigCell.x || cur.y !== this.pigCell.y) {
          path.unshift(cur);
          cur = parent[cur.y][cur.x];
        }

        this.moveQueue = path;
        this.processNextMove();
      }

      processNextMove() {
        if (this.moveQueue.length === 0) return;
        const next = this.moveQueue.shift();
        this.stepPig(next.x, next.y, () => {
          this.processNextMove();
        });
      }

      stepPig(tx, ty, onDone) {
        this.isMoving = true;
        const targetPixelX = this.offsetX + tx * this.cellSize + this.cellSize / 2;
        const targetPixelY = this.offsetY + ty * this.cellSize + this.cellSize / 2;

        // Facing direction
        if (tx < this.pigCell.x) {
          this.pig.setScale(-Math.abs(this.pig.scaleX), this.pig.scaleY);
        } else if (tx > this.pigCell.x) {
          this.pig.setScale(Math.abs(this.pig.scaleX), this.pig.scaleY);
        }

        if (this.pig.anims) this.pig.play('pig_run', true);
        this.tweens.add({
          targets: this.pig,
          x: targetPixelX,
          y: targetPixelY,
          duration: 90,
          onComplete: () => {
            this.pigCell = { x: tx, y: ty };
            this.checkCellEvents();
            this.isMoving = false;
            if (this.pig.anims && !this.moveQueue.length) this.pig.play('pig_idle', true);
            if (onDone) onDone();
          }
        });
      }

      checkCellEvents() {
        // Clover pickup
        for (let i = 0; i < this.clovers.length; i++) {
          const clv = this.clovers[i];
          if (clv.x === this.pigCell.x && clv.y === this.pigCell.y) {
            score += 10;
            clv.sprite.destroy();
            this.clovers.splice(i, 1);
            if (config.updateScore) config.updateScore(score);
            this.updateHud();
            break;
          }
        }

        // Goal reached (bell pepper)
        if (this.pigCell.x === this.maze.goal.x && this.pigCell.y === this.maze.goal.y) {
          const bonus = (level * 10) + Math.max(0, timeLeft);
          score += bonus;
          if (config.updateScore) config.updateScore(score);

          level++;
          this.startLevel(level);
        }
      }

      updateHud() {
        this.hudText.setText(`Lvl: ${level}   Time: ${Math.max(0, timeLeft)}s   Score: ${score}`);
      }
    }

    return new root.Phaser.Game({
      type: root.Phaser.AUTO,
      width: W,
      height: H,
      parent: config.container,
      // the 360x290 canvas is fitted into the narrower .minigames-canvas-wrapper; FIT keeps pointer input mapped
      scale: { mode: root.Phaser.Scale.FIT, autoCenter: root.Phaser.Scale.CENTER_BOTH },
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#4a6b2f',
      scene: HayMazeScene
    });
  }

  root.Minigry.register({
    id: 'hay_maze',
    name: 'Hay Maze',
    icon: 'game-hay-maze',
    desc: 'Guide your guinea pig through the hay maze to the bell pepper!',
    musicTrack: 'games_2',
    start: start
  });

})(typeof window !== 'undefined' ? window : this);
