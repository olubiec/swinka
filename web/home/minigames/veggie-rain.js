/**
 * veggie-rain.js — minigame "Veggie Rain".
 * Move the pig with the mouse (or arrow keys / A and D) and catch the falling vegetables.
 * Strawberries are rare and worth more. Onions and chocolate are bad for guinea pigs: each one costs a heart.
 * The game ends after 60 seconds or when all 3 hearts are gone. Points go to the shared reward screen
 * (clovers = min(40, points / 10), see minigames-api.js and Cuy.Core).
 */
(function (root) {
  'use strict';
  if (!root.Minigry || !root.Phaser) return;

  const W = 360;
  const H = 290;
  const GROUND_Y = 262;
  const GAME_SECONDS = 60;

  // Indexes in assets/icons/icons_16.png (assets/icons/icons.json)
  const GOOD = [0, 1, 2, 3, 14];   // bell pepper, cucumber, parsley, carrot, kale
  const BONUS = 15;                // strawberry
  const BAD = [16, 17];            // onion, chocolate

  function iconsUrl() {
    const isWebView = !!(root.chrome && root.chrome.webview);
    return isWebView ? 'https://cuy.assets/icons/icons_16.png' : '../../assets/icons/icons_16.png';
  }

  function start(config) {
    let score = 0;
    let hearts = 3;
    let timeLeft = GAME_SECONDS;
    let ended = false;

    class VeggieRainScene extends root.Phaser.Scene {
      constructor() { super('VeggieRain'); }

      preload() {
        root.MinigryPig.preload(this, config.stageKey === 'junior' ? 'baby' : config.stageKey);
        this.load.spritesheet('icons16', iconsUrl(), { frameWidth: 16, frameHeight: 16 });
      }

      create() {
        // Room: wooden wall and a straw floor
        this.add.rectangle(W / 2, H / 2, W, H, 0x9c6636);
        for (let x = 0; x < W; x += 30) this.add.rectangle(x, 120, 2, 240, 0x6e4424).setOrigin(0, 0.5);
        this.add.rectangle(W / 2, GROUND_Y + 14, W, 56, 0xeedb7c);
        this.add.rectangle(W / 2, GROUND_Y - 12, W, 3, 0xc99a2e);

        this.pig = root.MinigryPig.create(this, W / 2, GROUND_Y - 22);
        this.pig.body.setAllowGravity(false);
        this.pig.body.setSize(40, 22).setOffset(12, 36);
        this.targetX = W / 2;

        this.items = this.physics.add.group();
        this.physics.add.overlap(this.pig, this.items, (pig, item) => this.catchItem(item));

        // HUD
        const style = { fontFamily: 'monospace', fontSize: '14px', color: '#fffdf8', stroke: '#2b1712', strokeThickness: 3 };
        this.heartsText = this.add.text(8, 6, '', style).setDepth(10);
        this.timeText = this.add.text(W - 8, 6, '', style).setOrigin(1, 0).setDepth(10);
        this.updateHud();

        // Controls: mouse/touch follows, keys move
        this.input.on('pointermove', (p) => { this.targetX = p.x; });
        this.input.on('pointerdown', (p) => { this.targetX = p.x; });
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');

        this.spawnDelay = 900;
        this.fallSpeed = 90;
        this.scheduleSpawn();

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            timeLeft--;
            // A little faster every second
            this.fallSpeed = Math.min(230, this.fallSpeed + 2.5);
            this.spawnDelay = Math.max(380, this.spawnDelay - 9);
            this.updateHud();
            if (timeLeft <= 0) this.finish();
          }
        });
      }

      scheduleSpawn() {
        if (ended) return;
        this.time.delayedCall(this.spawnDelay, () => {
          this.spawnItem();
          this.scheduleSpawn();
        });
      }

      spawnItem() {
        const r = Math.random();
        let frame, kind;
        if (r < 0.07) { frame = BONUS; kind = 'bonus'; }
        else if (r < 0.30) { frame = BAD[Math.floor(Math.random() * BAD.length)]; kind = 'bad'; }
        else { frame = GOOD[Math.floor(Math.random() * GOOD.length)]; kind = 'good'; }

        const x = 20 + Math.random() * (W - 40);
        const item = this.items.create(x, -16, 'icons16', frame);
        item.setScale(2);
        item.kind = kind;
        item.body.setAllowGravity(false);
        item.body.setVelocityY(this.fallSpeed * (0.85 + Math.random() * 0.3));
        item.body.setSize(12, 12);
      }

      catchItem(item) {
        if (ended || !item.active) return;
        const x = item.x;
        const y = item.y;
        item.destroy();
        if (item.kind === 'bad') {
          hearts--;
          this.cameras.main.shake(150, 0.01);
          this.floatText(x, y, 'Yuck!', '#e8564c');
          if (root.Sound && root.Sound.click) root.Sound.click();
          this.updateHud();
          if (hearts <= 0) this.finish();
          return;
        }
        const pts = item.kind === 'bonus' ? 30 : 10;
        score += pts;
        config.updateScore(score);
        this.floatText(x, y, '+' + pts, item.kind === 'bonus' ? '#ffd23f' : '#fffdf8');
        if (root.Sound && root.Sound.crunch) root.Sound.crunch();
      }

      floatText(x, y, text, color) {
        const t = this.add.text(x, y, text, {
          fontFamily: 'monospace', fontSize: '13px', color: color, stroke: '#2b1712', strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);
        this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 650, onComplete: () => t.destroy() });
      }

      updateHud() {
        this.heartsText.setText('♥'.repeat(Math.max(0, hearts)) + '♡'.repeat(Math.max(0, 3 - hearts)));
        this.timeText.setText(timeLeft + ' s');
      }

      finish() {
        if (ended) return;
        ended = true;
        this.pig.play('pig_popcorn');
        this.time.delayedCall(900, () => config.endGame(score));
      }

      update(time, delta) {
        if (ended) return;
        // Keys move the target; the pig walks toward it
        const step = 0.32 * delta;
        if (this.cursors.left.isDown || this.keyA.isDown) this.targetX = this.pig.x - 40;
        if (this.cursors.right.isDown || this.keyD.isDown) this.targetX = this.pig.x + 40;
        this.targetX = Math.max(24, Math.min(W - 24, this.targetX));

        const dx = this.targetX - this.pig.x;
        if (Math.abs(dx) > 3) {
          this.pig.x += Math.sign(dx) * Math.min(Math.abs(dx), step);
          this.pig.setFlipX(dx < 0); // the sheet faces right
          if (this.pig.anims.currentAnim?.key !== 'pig_run') this.pig.play('pig_run');
        } else if (this.pig.anims.currentAnim?.key !== 'pig_idle') {
          this.pig.play('pig_idle');
        }

        // Items that reach the floor disappear
        this.items.getChildren().forEach((it) => {
          if (it.y > GROUND_Y + 10) it.destroy();
        });
      }
    }

    return new root.Phaser.Game({
      type: root.Phaser.AUTO,
      width: W,
      height: H,
      parent: config.container,
      pixelArt: true,
      backgroundColor: '#9c6636',
      physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
      scene: VeggieRainScene
    });
  }

  root.Minigry.register({
    id: 'veggie_rain',
    name: 'Veggie Rain',
    icon: '🥕',
    desc: 'Catch the veggies! Onions and chocolate are bad for guinea pigs.',
    start: start
  });
})(typeof window !== 'undefined' ? window : this);
