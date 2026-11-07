/**
 * nyan-cuy.js — Nyan Cuy space endless runner minigame for Cuy's Home.
 * Fly through cosmic space leaving an undulating rainbow trail!
 * Flap with Spacebar or Click/Tap, collect veggies (parsley, carrot, strawberry),
 * dodge cosmic obstacles, and earn clovers!
 */
(function (root) {
  'use strict';
  if (!root.Minigry || !root.Phaser) return;

  const W = 360;
  const H = 290;
  const SCROLL_SPEED = 120;
  const GRAVITY = 420;
  const FLAP_FORCE = 190;

  // Frame indexes in assets/icons/icons_16.png
  const TREAT_TYPES = [
    { frame: 2, pts: 10, name: 'parsley', color: '#85e085' },
    { frame: 3, pts: 20, name: 'carrot', color: '#ffa64d' },
    { frame: 15, pts: 30, name: 'strawberry', color: '#ff4d6d' }
  ];
  const OBSTACLE_FRAMES = [16, 17]; // onion, chocolate

  const RAINBOW_COLORS = [
    0xff0044, // Red
    0xff7700, // Orange
    0xffff00, // Yellow
    0x33cc33, // Green
    0x0099ff, // Blue
    0x8844cc  // Purple
  ];

  function iconsUrl() {
    const isWebView = !!(root.chrome && root.chrome.webview);
    if (isWebView) return 'https://cuy.assets/icons/icons_16.png';
    const inMinigamesDir = typeof location !== 'undefined' && location.pathname.includes('/minigames');
    return inMinigamesDir ? '../../../assets/icons/icons_16.png' : '../../assets/icons/icons_16.png';
  }

  // --- Retro Sound & Audio Engine Integration ---
  if (!root.NyanAudio) {
    root.NyanAudio = {
      startMusic() {
        if (root.CuyMusic && typeof root.CuyMusic.play === 'function') {
          root.CuyMusic.play('games_1');
          const mg = root.MiniGames || root.Minigry;
          if (mg && typeof mg.track === 'function' && root.CuyMusic.currentAudio) {
            mg.track(root.CuyMusic.currentAudio);
          }
        }
      },

      stopMusic() {
        if (root.CuyMusic && typeof root.CuyMusic.pause === 'function') {
          root.CuyMusic.pause();
        }
      },

      playWheek() {
        if (root.Sound && typeof root.Sound.wheek === 'function') {
          root.Sound.wheek();
        }
      },

      playCrunch() {
        if (root.Sound && typeof root.Sound.crunch === 'function') {
          root.Sound.crunch();
        }
      }
    };
  }

  function start(config) {
    let score = 0;
    let ended = false;

    class NyanCuyScene extends root.Phaser.Scene {
      constructor() {
        super('NyanCuy');
      }

      preload() {
        const stage = config.stageKey || 'adult';
        root.MinigryPig.preload(this, stage);
        this.load.spritesheet('icons16', iconsUrl(), { frameWidth: 16, frameHeight: 16 });
      }

      create() {
        // 1. Cosmic dark blue background
        this.add.rectangle(W / 2, H / 2, W, H, 0x090d24);

        // 2. Scrolling twinkling stars (3 parallax layers)
        this.stars = [];
        const starCount = 42;
        for (let i = 0; i < starCount; i++) {
          const x = Math.random() * W;
          const y = 8 + Math.random() * (H - 16);
          const speed = 25 + Math.random() * 80;
          const size = speed > 65 ? (Math.random() < 0.25 ? 3 : 2) : 1;
          const color = Math.random() < 0.25 ? 0x99ccff : (Math.random() < 0.15 ? 0xffea9f : 0xffffff);
          const rect = this.add.rectangle(x, y, size, size, color);
          rect.setAlpha(0.3 + Math.random() * 0.7);
          this.stars.push({ rect, speed, phase: Math.random() * Math.PI * 2, size });
        }

        // 3. Rainbow trail graphics
        this.rainbowGfx = this.add.graphics().setDepth(2);
        this.trailHistory = [];

        // 4. Guinea pig character
        this.pig = root.MinigryPig.create(this, 80, H / 2);
        this.pig.setDepth(10);
        if (this.pig.body) {
          this.pig.body.setAllowGravity(false);
          this.pig.body.setSize(38, 22).setOffset(13, 36);
        }
        this.pig.play('pig_run');
        this.pigVy = 0;
        this.isStarted = false;

        // 5. Treats and obstacles
        this.treats = this.physics.add.group();
        this.obstacles = this.physics.add.group();

        this.physics.add.overlap(this.pig, this.treats, (pig, treat) => this.collectTreat(treat));
        this.physics.add.overlap(this.pig, this.obstacles, (pig, obs) => this.hitObstacle(obs));

        // 6. HUD display
        const hudStyle = {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#fffdf8',
          stroke: '#050819',
          strokeThickness: 3
        };
        this.add.image(18, 16, 'icons16', 89).setDepth(25); // sparkle (icons_16.png index 89)
        this.scoreText = this.add.text(30, 8, '0', hudStyle).setDepth(25);
        this.hintText = this.add.text(W / 2, H - 22, 'SPACE / CLICK to flap!', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#aaccff',
          stroke: '#050819',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(25);

        // 7. Controls
        this.input.on('pointerdown', () => this.flap());
        if (this.input.keyboard) {
          this.spaceKey = this.input.keyboard.addKey(root.Phaser.Input.Keyboard.KeyCodes.SPACE);
          this.upKey = this.input.keyboard.addKey(root.Phaser.Input.Keyboard.KeyCodes.UP);
          this.wKey = this.input.keyboard.addKey(root.Phaser.Input.Keyboard.KeyCodes.W);
        }

        // 8. Timers for spawning treats & obstacles
        this.scheduleTreatSpawn();
        this.scheduleObstacleSpawn();

        // 9. Audio lifecycle
        const mg = root.MiniGames || root.Minigry;
        if (mg && typeof mg.track === 'function') {
          if (this.sound && this.sound.context) mg.track(this.sound.context);
          if (config && config.audio) mg.track(config.audio);
        }

        if (root.NyanAudio && typeof root.NyanAudio.startMusic === 'function') {
          root.NyanAudio.startMusic();
        }

        this.events.on('pause', () => {
          if (root.NyanAudio && typeof root.NyanAudio.stopMusic === 'function') {
            root.NyanAudio.stopMusic();
          }
        });
        this.events.on('resume', () => {
          if (!ended && root.NyanAudio && typeof root.NyanAudio.startMusic === 'function') {
            root.NyanAudio.startMusic();
          }
        });
        this.events.on('shutdown', () => {
          if (root.NyanAudio && typeof root.NyanAudio.stopMusic === 'function') {
            root.NyanAudio.stopMusic();
          }
        });
        this.events.on('destroy', () => {
          if (root.NyanAudio && typeof root.NyanAudio.stopMusic === 'function') {
            root.NyanAudio.stopMusic();
          }
        });
      }

      flap() {
        if (ended) return;
        if (!this.isStarted) {
          this.isStarted = true;
          if (this.hintText && this.hintText.active) {
            this.tweens.add({ targets: this.hintText, alpha: 0, duration: 400 });
          }
        }
        this.pigVy = -FLAP_FORCE;
        if (root.NyanAudio && typeof root.NyanAudio.playWheek === 'function') {
          root.NyanAudio.playWheek();
        } else if (root.Sound && typeof root.Sound.wheek === 'function') {
          root.Sound.wheek();
        }
      }

      scheduleTreatSpawn() {
        if (ended) return;
        const delay = 1200 + Math.random() * 900;
        this.time.delayedCall(delay, () => {
          if (!ended) {
            if (this.isStarted) {
              this.spawnTreat();
            }
            this.scheduleTreatSpawn();
          }
        });
      }

      spawnTreat() {
        const r = Math.random();
        let treatDef = TREAT_TYPES[0]; // parsley
        if (r < 0.20) treatDef = TREAT_TYPES[2]; // strawberry (rare)
        else if (r < 0.65) treatDef = TREAT_TYPES[1]; // carrot

        const y = 28 + Math.random() * (H - 64);
        const treat = this.treats.create(W + 16, y, 'icons16', treatDef.frame);
        treat.setScale(2);
        treat.pts = treatDef.pts;
        treat.color = treatDef.color;
        treat.setDepth(8);
        treat.body.setAllowGravity(false);
        treat.body.setVelocityX(-SCROLL_SPEED);
        treat.body.setSize(12, 12);
        treat.baseY = y;
        treat.spawnTime = this.time.now;
      }

      scheduleObstacleSpawn() {
        if (ended) return;
        const delay = 2800 + Math.random() * 1500;
        this.time.delayedCall(delay, () => {
          if (!ended) {
            if (this.isStarted) {
              this.spawnObstacle();
            }
            this.scheduleObstacleSpawn();
          }
        });
      }

      spawnObstacle() {
        const frame = OBSTACLE_FRAMES[Math.floor(Math.random() * OBSTACLE_FRAMES.length)];
        const y = 30 + Math.random() * (H - 70);
        const obs = this.obstacles.create(W + 16, y, 'icons16', frame);
        obs.setScale(2);
        obs.setDepth(8);
        obs.body.setAllowGravity(false);
        obs.body.setVelocityX(-SCROLL_SPEED * 1.05);
        obs.body.setSize(12, 12);
      }

      collectTreat(treat) {
        if (ended || !treat.active) return;
        const x = treat.x;
        const y = treat.y;
        const pts = treat.pts || 10;
        const color = treat.color || '#ffd23f';
        treat.destroy();

        score += pts;
        if (config.updateScore) config.updateScore(score);
        this.scoreText.setText(`${score}`);

        if (root.NyanAudio && typeof root.NyanAudio.playCrunch === 'function') {
          root.NyanAudio.playCrunch();
        } else if (root.Sound && typeof root.Sound.crunch === 'function') {
          root.Sound.crunch();
        }

        this.floatText(x, y, `+${pts}`, color);
      }

      hitObstacle(obs) {
        if (ended || !obs.active || !this.isStarted) return;
        this.floatText(this.pig.x, this.pig.y, 'Ouch!', '#ff4d6d');
        this.gameOver();
      }

      floatText(x, y, text, color) {
        const t = this.add.text(x, y, text, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: color,
          stroke: '#050819',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);

        this.tweens.add({
          targets: t,
          y: y - 24,
          alpha: 0,
          duration: 650,
          onComplete: () => t.destroy()
        });
      }

      gameOver() {
        if (ended) return;
        ended = true;

        if (root.NyanAudio && typeof root.NyanAudio.stopMusic === 'function') {
          root.NyanAudio.stopMusic();
        }
        if (root.Sound && typeof root.Sound.click === 'function') {
          root.Sound.click();
        }

        this.cameras.main.shake(200, 0.015);
        this.pig.play('pig_popcorn');

        // Stop remaining elements
        this.treats.setVelocityX(0);
        this.obstacles.setVelocityX(0);

        const clovers = Math.min(40, Math.floor(score / 10));
        let record = score;
        if (root.bridge && typeof root.bridge.getMinigameRecord === 'function') {
          record = Math.max(score, root.bridge.getMinigameRecord('nyan_cuy'));
        } else {
          try {
            const saved = parseInt(localStorage.getItem('cuy_record_nyan_cuy') || '0', 10);
            record = Math.max(saved, score);
            localStorage.setItem('cuy_record_nyan_cuy', record.toString());
          } catch (e) {}
        }

        if (typeof config.endGame === 'function') {
          this.time.delayedCall(750, () => {
            config.endGame(score);
          });
        } else {
          if (root.bridge && typeof root.bridge.submitMinigameResult === 'function') {
            try {
              root.bridge.submitMinigameResult('nyan_cuy', score);
            } catch (e) {}
          }
          this.showInGameGameOverModal(score, record, clovers);
        }
      }

      showInGameGameOverModal(finalScore, highScore, clovers) {
        const overlay = this.add.rectangle(W / 2, H / 2, W - 40, H - 50, 0x050819, 0.92)
          .setStrokeStyle(2, 0xffd23f)
          .setDepth(40);

        const title = this.add.text(W / 2, H / 2 - 75, 'GAME OVER', {
          fontFamily: 'monospace', fontSize: '18px', color: '#ffd23f', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(41);

        const scoreMsg = this.add.text(W / 2, H / 2 - 40, `Final Score: ${finalScore}`, {
          fontFamily: 'monospace', fontSize: '14px', color: '#fffdf8'
        }).setOrigin(0.5).setDepth(41);

        const recordMsg = this.add.text(W / 2, H / 2 - 16, `High Score: ${highScore}`, {
          fontFamily: 'monospace', fontSize: '13px', color: '#aaccff'
        }).setOrigin(0.5).setDepth(41);

        const cloversMsg = this.add.text(W / 2, H / 2 + 10, `Clovers: +${clovers}`, {
          fontFamily: 'monospace', fontSize: '13px', color: '#44dd88'
        }).setOrigin(0.5).setDepth(41);

        // Play again button
        const btnReplay = this.add.rectangle(W / 2 - 60, H / 2 + 55, 95, 28, 0x448833)
          .setStrokeStyle(1, 0x88ee66)
          .setInteractive({ useHandCursor: true })
          .setDepth(41);
        const txtReplay = this.add.text(W / 2 - 60, H / 2 + 55, 'Play Again', {
          fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(42);

        btnReplay.on('pointerdown', () => {
          if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
          this.scene.restart();
        });

        // Exit button
        const btnExit = this.add.rectangle(W / 2 + 60, H / 2 + 55, 75, 28, 0x773333)
          .setStrokeStyle(1, 0xdd6666)
          .setInteractive({ useHandCursor: true })
          .setDepth(41);
        const txtExit = this.add.text(W / 2 + 60, H / 2 + 55, 'Exit', {
          fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(42);

        btnExit.on('pointerdown', () => {
          if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
          if (root.Minigry && typeof root.Minigry.renderSelectScreen === 'function') {
            root.Minigry.renderSelectScreen(config.container);
          }
        });
      }

      update(time, delta) {
        const dt = delta / 1000;

        // Check key controls
        if (!ended && this.input.keyboard) {
          if (root.Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
              root.Phaser.Input.Keyboard.JustDown(this.upKey) ||
              root.Phaser.Input.Keyboard.JustDown(this.wKey)) {
            this.flap();
          }
        }

        // 1. Update scrolling twinkling stars
        for (let i = 0; i < this.stars.length; i++) {
          const s = this.stars[i];
          s.rect.x -= s.speed * dt;
          if (s.rect.x < -6) {
            s.rect.x = W + 6;
            s.rect.y = 8 + Math.random() * (H - 16);
          }
          s.rect.setAlpha(0.35 + 0.55 * Math.sin((time * 0.005) + s.phase));
        }

        if (!ended) {
          if (!this.isStarted) {
            // Hover bobbing before player starts
            this.pig.y = (H / 2) + Math.sin(time * 0.005) * 8;
            this.pig.angle = Math.sin(time * 0.005) * 4;
          } else {
            // 2. Pig physics & flight dynamics
            this.pigVy += GRAVITY * dt;
            this.pig.y += this.pigVy * dt;

            // Bobbing tilt angle
            this.pig.angle = Math.max(-20, Math.min(25, this.pigVy * 0.08));

            // Ceiling clamp
            if (this.pig.y < 18) {
              this.pig.y = 18;
              this.pigVy = Math.max(0, this.pigVy);
            }

            // Abyss floor collision
            if (this.pig.y > H - 18) {
              this.pig.y = H - 18;
              this.gameOver();
            }
          }

          // 3. Gentle vertical bobbing for floating treats
          this.treats.getChildren().forEach((t) => {
            if (t.active && typeof t.baseY === 'number') {
              t.y = t.baseY + Math.sin((time - t.spawnTime) * 0.005) * 4;
            }
            if (t.x < -30) t.destroy();
          });

          // Cleanup offscreen obstacles
          this.obstacles.getChildren().forEach((o) => {
            if (o.x < -30) o.destroy();
          });

          // 4. Record position for rainbow trail
          this.trailHistory.unshift({
            x: this.pig.x - 14,
            y: this.pig.y + 4
          });
        }

        // 5. Shift & prune rainbow trail
        for (let i = 0; i < this.trailHistory.length; i++) {
          this.trailHistory[i].x -= SCROLL_SPEED * dt;
        }
        while (this.trailHistory.length > 0 && this.trailHistory[this.trailHistory.length - 1].x < -20) {
          this.trailHistory.pop();
        }

        // 6. Draw undulating retro rainbow trail
        this.rainbowGfx.clear();
        if (this.trailHistory.length > 1) {
          const pigX = this.pig.x - 14;
          const sliceW = 6;
          for (let x = -6; x <= pigX; x += sliceW) {
            // Find closest historical y
            let closestY = this.pig.y + 4;
            let minDiff = 9999;
            for (let i = 0; i < this.trailHistory.length; i++) {
              const diff = Math.abs(this.trailHistory[i].x - x);
              if (diff < minDiff) {
                minDiff = diff;
                closestY = this.trailHistory[i].y;
              }
            }

            // Retro wave undulation
            const wave = Math.sin((x * 0.045) - (time * 0.008)) * 3.5;
            const baseY = closestY + wave;

            // Draw the 6 rainbow bands
            for (let c = 0; c < 6; c++) {
              this.rainbowGfx.fillStyle(RAINBOW_COLORS[c], 1);
              this.rainbowGfx.fillRect(x, baseY - 9 + (c * 3), sliceW + 1, 3);
            }
          }
        }
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
      backgroundColor: '#090d24',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
      },
      scene: NyanCuyScene
    });
  }

  root.Minigry.register({
    id: 'nyan_cuy',
    name: 'Nyan Cuy',
    icon: 'game-nyan-cuy',
    desc: 'Fly through space leaving a rainbow trail! Wheek at the stars!',
    start: start
  });

})(typeof window !== 'undefined' ? window : this);
